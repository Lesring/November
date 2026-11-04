const { apiBase } = require('./config')

const TOKEN_KEY = 'november-chat-token'

function getToken() {
  try {
    return wx.getStorageSync(TOKEN_KEY) || ''
  } catch (error) {
    return ''
  }
}

function setToken(token) {
  try {
    if (token) wx.setStorageSync(TOKEN_KEY, token)
    else wx.removeStorageSync(TOKEN_KEY)
  } catch (error) {
    /* ignore */
  }
}

function url(path) {
  if (!apiBase) return path
  return apiBase.replace(/\/$/, '') + path
}

function request(path, options) {
  options = options || {}
  return new Promise(function (resolve, reject) {
    var headers = Object.assign(
      {
        'Content-Type': 'application/json'
      },
      options.header || {}
    )
    var token = getToken()
    if (token) {
      headers.Authorization = 'Bearer ' + token
      headers['X-Chat-Token'] = token
    }
    wx.request({
      url: url(path),
      method: options.method || 'GET',
      data: options.data,
      header: headers,
      success: function (res) {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(res.data)
        else reject(new Error((res.data && res.data.error) || '请求失败'))
      },
      fail: function (err) {
        reject(new Error((err && err.errMsg) || '网络错误'))
      }
    })
  })
}

function ensureSession() {
  var existing = getToken()
  if (existing) {
    return request('/v1/chat/session').catch(function () {
      setToken('')
      return request('/v1/chat/session', { method: 'POST', data: {} }).then(function (data) {
        setToken(data.token)
        return data
      })
    })
  }
  return request('/v1/chat/session', { method: 'POST', data: {} }).then(function (data) {
    setToken(data.token)
    return data
  })
}

function listConversations() {
  return ensureSession().then(function () {
    return request('/v1/chat/conversations')
  })
}

function getConversation(id) {
  return ensureSession().then(function () {
    return request('/v1/chat/conversations/' + encodeURIComponent(id))
  })
}

function markRead(id) {
  return ensureSession().then(function () {
    return request('/v1/chat/conversations/' + encodeURIComponent(id) + '/read', {
      method: 'POST',
      data: {}
    })
  })
}

function sendText(conversationId, text) {
  return ensureSession().then(function () {
    return request('/v1/chat/messages', {
      method: 'POST',
      data: {
        conversationId: conversationId,
        clientMsgId: 'mp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
        kind: 'text',
        body: text
      }
    })
  })
}

function withToken(mediaUrl) {
  if (!mediaUrl) return mediaUrl
  if (/^https?:\/\//i.test(mediaUrl) && mediaUrl.indexOf('/v1/chat/') < 0) return mediaUrl
  var token = getToken()
  if (!token) return url(mediaUrl)
  var full = mediaUrl.indexOf('http') === 0 ? mediaUrl : url(mediaUrl)
  return full + (full.indexOf('?') >= 0 ? '&' : '?') + 'token=' + encodeURIComponent(token)
}

function uploadFile(conversationId, filePath, fileName, contentType) {
  return ensureSession().then(function () {
    return new Promise(function (resolve, reject) {
      wx.getFileInfo({
        filePath: filePath,
        success: function (info) {
          request('/v1/chat/attachments', {
            method: 'POST',
            data: {
              conversationId: conversationId,
              fileName: fileName || 'upload',
              contentType: contentType || 'application/octet-stream',
              byteSize: info.size
            }
          })
            .then(function (intent) {
              wx.getFileSystemManager().readFile({
                filePath: filePath,
                success: function (file) {
                  var uploadUrl =
                    intent.uploadMode === 'local'
                      ? url('/v1/chat/attachments/upload-local?id=' + encodeURIComponent(intent.id))
                      : intent.uploadUrl
                  var header =
                    intent.uploadMode === 'local'
                      ? {
                          Authorization: 'Bearer ' + getToken(),
                          'X-Chat-Token': getToken(),
                          'Content-Type': intent.contentType
                        }
                      : intent.uploadHeaders || { 'Content-Type': intent.contentType }
                  wx.request({
                    url: uploadUrl,
                    method: intent.uploadMode === 'local' ? 'POST' : 'PUT',
                    header: header,
                    data: file.data,
                    success: function (res) {
                      if (!(res.statusCode >= 200 && res.statusCode < 300)) {
                        reject(new Error('上传失败'))
                        return
                      }
                      var next =
                        intent.uploadMode === 'local'
                          ? Promise.resolve()
                          : request(
                              '/v1/chat/attachments/' + encodeURIComponent(intent.id) + '/complete',
                              { method: 'POST', data: {} }
                            )
                      next
                        .then(function () {
                          return request('/v1/chat/messages', {
                            method: 'POST',
                            data: {
                              conversationId: conversationId,
                              clientMsgId: 'mpf_' + Date.now(),
                              kind: intent.kind,
                              attachmentId: intent.id
                            }
                          })
                        })
                        .then(resolve, reject)
                    },
                    fail: reject
                  })
                },
                fail: reject
              })
            })
            .catch(reject)
        },
        fail: reject
      })
    })
  })
}

module.exports = {
  ensureSession: ensureSession,
  listConversations: listConversations,
  getConversation: getConversation,
  markRead: markRead,
  sendText: sendText,
  uploadFile: uploadFile,
  withToken: withToken,
  getToken: getToken
}
