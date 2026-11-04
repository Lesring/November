const catalogQuery = require('../../utils/query')
const chat = require('../../utils/chat')

function mapMessage(message, index) {
  var attachment = message.attachment || null
  return {
    id: message.id || 'm_' + index,
    from: message.from,
    kind: message.kind || 'text',
    text: message.text || message.body || '',
    time: message.time || '',
    fileName: attachment ? attachment.fileName : '',
    byteSize: attachment ? attachment.byteSize : 0,
    url: attachment ? chat.withToken(attachment.url) : '',
    index: index
  }
}

Page({
  data: {
    missing: false,
    loading: true,
    offline: false,
    conversationId: '',
    name: '',
    avatar: '',
    hasAvatar: false,
    initial: '',
    lines: [],
    draft: '',
    typing: false,
    busy: false
  },
  onLoad(query) {
    this.conversationId = query.id || ''
    this.setData({ conversationId: this.conversationId })
    this.load()
  },
  onShow() {
    this.startPoll()
  },
  onHide() {
    this.stopPoll()
  },
  onUnload() {
    this.stopPoll()
  },
  startPoll() {
    var page = this
    this.stopPoll()
    this._timer = setInterval(function () {
      if (!page.data.offline) page.pullMessages()
    }, 2500)
  },
  stopPoll() {
    if (this._timer) {
      clearInterval(this._timer)
      this._timer = null
    }
  },
  load() {
    var page = this
    chat
      .getConversation(this.conversationId)
      .then(function (data) {
        var conversation = data.conversation || data
        wx.setNavigationBarTitle({ title: conversation.name })
        page.setData({
          loading: false,
          offline: false,
          missing: false,
          name: conversation.name,
          avatar: conversation.avatar || '',
          hasAvatar: !!conversation.avatar,
          initial: conversation.name ? conversation.name.slice(0, 1) : '',
          lines: (conversation.messages || []).map(mapMessage),
          typing: false
        })
        return chat.markRead(page.conversationId)
      })
      .catch(function () {
        page.loadFallback()
      })
  },
  pullMessages() {
    var page = this
    chat
      .getConversation(this.conversationId)
      .then(function (data) {
        var conversation = data.conversation || data
        var lines = (conversation.messages || []).map(mapMessage)
        var grew = lines.length > page.data.lines.length
        page.setData({ lines: lines, offline: false })
        if (grew) chat.markRead(page.conversationId)
      })
      .catch(function () {
        /* keep current */
      })
  },
  loadFallback() {
    var list = (catalogQuery.catalog && catalogQuery.catalog.messages) || []
    var thread = null
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === this.conversationId) thread = list[i]
    }
    if (!thread) {
      this.setData({ missing: true, loading: false, offline: true })
      return
    }
    wx.setNavigationBarTitle({ title: thread.name })
    this.setData({
      loading: false,
      offline: true,
      name: thread.name,
      avatar: thread.avatar || '',
      hasAvatar: !!thread.avatar,
      initial: thread.name ? thread.name.slice(0, 1) : '',
      lines: (thread.lines || []).map(function (line, index) {
        return {
          id: 'local_' + index,
          from: line.from,
          kind: 'text',
          text: line.text,
          time: '',
          fileName: '',
          byteSize: 0,
          url: '',
          index: index
        }
      })
    })
  },
  onDraft(event) {
    this.setData({ draft: event.detail.value })
  },
  onSend() {
    var page = this
    var text = (this.data.draft || '').trim()
    if (!text || this.data.busy) return
    if (this.data.offline) {
      var lines = this.data.lines.concat([
        {
          id: 'local_' + Date.now(),
          from: 'me',
          kind: 'text',
          text: text,
          time: '本地',
          index: this.data.lines.length
        }
      ])
      this.setData({ lines: lines, draft: '' })
      wx.showToast({ title: '未连上服务，仅本机可见', icon: 'none' })
      return
    }
    this.setData({ busy: true, draft: '' })
    chat
      .sendText(this.conversationId, text)
      .then(function (data) {
        var message = mapMessage(data.message || data, page.data.lines.length)
        page.setData({
          busy: false,
          typing: true,
          lines: page.data.lines.concat([message])
        })
        setTimeout(function () {
          page.pullMessages()
          page.setData({ typing: false })
        }, 1600)
      })
      .catch(function (error) {
        page.setData({ busy: false, draft: text })
        wx.showToast({ title: (error && error.message) || '发送失败', icon: 'none' })
      })
  },
  onPickImage() {
    var page = this
    if (this.data.offline || this.data.busy) {
      wx.showToast({ title: this.data.offline ? '需连接消息服务' : '请稍候', icon: 'none' })
      return
    }
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      success: function (res) {
        var file = res.tempFiles[0]
        page.setData({ busy: true })
        chat
          .uploadFile(page.conversationId, file.tempFilePath, 'image.jpg', file.fileType || 'image/jpeg')
          .then(function (data) {
            var message = mapMessage(data.message || data, page.data.lines.length)
            page.setData({
              busy: false,
              typing: true,
              lines: page.data.lines.concat([message])
            })
            setTimeout(function () {
              page.pullMessages()
              page.setData({ typing: false })
            }, 1600)
          })
          .catch(function (error) {
            page.setData({ busy: false })
            wx.showToast({ title: (error && error.message) || '上传失败', icon: 'none' })
          })
      }
    })
  },
  onPickFile() {
    var page = this
    if (this.data.offline || this.data.busy) {
      wx.showToast({ title: this.data.offline ? '需连接消息服务' : '请稍候', icon: 'none' })
      return
    }
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      success: function (res) {
        var file = res.tempFiles[0]
        page.setData({ busy: true })
        chat
          .uploadFile(
            page.conversationId,
            file.path,
            file.name || 'file',
            'application/octet-stream'
          )
          .then(function (data) {
            var message = mapMessage(data.message || data, page.data.lines.length)
            page.setData({
              busy: false,
              typing: true,
              lines: page.data.lines.concat([message])
            })
            setTimeout(function () {
              page.pullMessages()
              page.setData({ typing: false })
            }, 1600)
          })
          .catch(function (error) {
            page.setData({ busy: false })
            wx.showToast({ title: (error && error.message) || '上传失败', icon: 'none' })
          })
      }
    })
  },
  onPreview(event) {
    var url = event.currentTarget.dataset.url
    if (!url) return
    wx.previewImage({ urls: [url], current: url })
  },
  onBack() {
    wx.navigateBack()
  }
})
