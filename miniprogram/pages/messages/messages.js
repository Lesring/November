const catalogQuery = require('../../utils/query')
const chat = require('../../utils/chat')

function decorate(thread) {
  return {
    id: thread.id,
    name: thread.name,
    avatar: thread.avatar || '',
    hasAvatar: !!thread.avatar,
    initial: thread.name ? thread.name.slice(0, 1) : '',
    preview: thread.preview,
    time: thread.time,
    unread: !!thread.unread,
    unreadCount: thread.unreadCount || 0
  }
}

Page({
  data: {
    threads: [],
    online: false,
    query: '',
    loading: true
  },
  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 })
    }
    this.refresh()
    this.startPoll()
  },
  onHide() {
    this.stopPoll()
  },
  onUnload() {
    this.stopPoll()
  },
  onPullDownRefresh() {
    var page = this
    this.refresh().finally(function () {
      wx.stopPullDownRefresh()
      page.startPoll()
    })
  },
  onQuery(event) {
    this.setData({ query: event.detail.value || '' })
    this.applyFilter()
  },
  applyFilter() {
    var q = (this.data.query || '').trim().toLowerCase()
    var source = this._all || []
    var filtered = !q
      ? source
      : source.filter(function (item) {
          return (
            String(item.name).toLowerCase().indexOf(q) >= 0 ||
            String(item.preview || '')
              .toLowerCase()
              .indexOf(q) >= 0
          )
        })
    this.setData({ threads: filtered })
  },
  refresh() {
    var page = this
    return chat
      .listConversations()
      .then(function (data) {
        page._all = (data.conversations || []).map(decorate)
        page.setData({ loading: false, online: true })
        page.applyFilter()
      })
      .catch(function () {
        var fallback = ((catalogQuery.catalog && catalogQuery.catalog.messages) || []).map(decorate)
        page._all = fallback
        page.setData({ loading: false, online: false })
        page.applyFilter()
      })
  },
  startPoll() {
    var page = this
    this.stopPoll()
    this._timer = setInterval(function () {
      page.refresh()
    }, 4000)
  },
  stopPoll() {
    if (this._timer) {
      clearInterval(this._timer)
      this._timer = null
    }
  },
  onOpen(event) {
    wx.navigateTo({ url: '/pages/thread/thread?id=' + event.currentTarget.dataset.id })
  }
})
