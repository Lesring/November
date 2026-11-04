const TOKEN_KEY = 'november-chat-token'
const listeners = new Set()

let token = ''
let identityId = ''
let unread = 0
let socket = null
let socketTimer = null
let reconnectMs = 1000
let readyPromise = null

function emit(event) {
  listeners.forEach((listener) => {
    try {
      listener(event)
    } catch (_) {
      /* ignore */
    }
  })
}

function getToken() {
  if (token) return token
  try {
    token = localStorage.getItem(TOKEN_KEY) || ''
  } catch (_) {
    token = ''
  }
  return token
}

function setToken(value) {
  token = value || ''
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch (_) {
    /* ignore */
  }
}

function authHeaders(extra = {}) {
  const headers = { ...extra }
  const value = getToken()
  if (value) {
    headers.Authorization = 'Bearer ' + value
    headers['X-Chat-Token'] = value
  }
  return headers
}

async function request(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: authHeaders({
      ...(options.body && !(options.body instanceof Blob) && !(options.body instanceof ArrayBuffer)
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...options.headers
    })
  })
  const text = await response.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch (_) {
    data = { error: text || '请求失败' }
  }
  if (!response.ok) {
    const error = new Error((data && data.error) || '请求失败')
    error.status = response.status
    error.data = data
    throw error
  }
  return data
}

function withToken(url) {
  if (!url) return url
  if (/^https?:\/\//i.test(url) && !url.includes('/v1/chat/')) return url
  const value = getToken()
  if (!value) return url
  const join = url.includes('?') ? '&' : '?'
  return url + join + 'token=' + encodeURIComponent(value)
}

function clientMsgId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'c_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10)
}

function connectSocket() {
  if (!getToken() || typeof window === 'undefined') return
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const url = protocol + '//' + window.location.host + '/v1/chat/ws?token=' + encodeURIComponent(getToken())
  socket = new WebSocket(url)
  socket.onopen = () => {
    reconnectMs = 1000
    emit({ type: 'connection', status: 'online' })
  }
  socket.onclose = () => {
    emit({ type: 'connection', status: 'offline' })
    window.clearTimeout(socketTimer)
    socketTimer = window.setTimeout(connectSocket, reconnectMs)
    reconnectMs = Math.min(reconnectMs * 1.6, 12000)
  }
  socket.onerror = () => {
    try {
      socket.close()
    } catch (_) {
      /* ignore */
    }
  }
  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      if (data.type === 'message' || data.type === 'conversation' || data.type === 'typing' || data.type === 'hello') {
        if (data.type === 'conversation' && data.conversation) {
          /* unread refreshed via list events */
        }
        emit(data)
      }
    } catch (_) {
      /* ignore */
    }
  }
}

async function ensureSession() {
  if (readyPromise) return readyPromise
  readyPromise = (async () => {
    const existing = getToken()
    if (existing) {
      try {
        const me = await request('/v1/chat/session')
        identityId = me.identityId
        unread = me.unread || 0
        connectSocket()
        emit({ type: 'unread', unread })
        return me
      } catch (_) {
        setToken('')
      }
    }
    const created = await request('/v1/chat/session', { method: 'POST', body: '{}' })
    setToken(created.token)
    identityId = created.identityId
    unread = 0
    connectSocket()
    emit({ type: 'unread', unread })
    return created
  })()
  try {
    return await readyPromise
  } catch (error) {
    readyPromise = null
    throw error
  }
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

async function listConversations() {
  await ensureSession()
  const data = await request('/v1/chat/conversations')
  unread = data.unread || 0
  emit({ type: 'unread', unread })
  return data.conversations || []
}

async function getConversation(id) {
  await ensureSession()
  const data = await request('/v1/chat/conversations/' + encodeURIComponent(id))
  return data.conversation
}

async function markRead(id) {
  await ensureSession()
  const data = await request('/v1/chat/conversations/' + encodeURIComponent(id) + '/read', {
    method: 'POST',
    body: '{}'
  })
  unread = data.unread || 0
  emit({ type: 'unread', unread })
  return data
}

async function sendText(conversationId, text, id = clientMsgId()) {
  await ensureSession()
  const data = await request('/v1/chat/messages', {
    method: 'POST',
    body: JSON.stringify({
      conversationId,
      clientMsgId: id,
      kind: 'text',
      body: text
    })
  })
  unread = data.unread || 0
  emit({ type: 'unread', unread })
  return data.message
}

async function uploadAndSend(conversationId, file) {
  await ensureSession()
  const intent = await request('/v1/chat/attachments', {
    method: 'POST',
    body: JSON.stringify({
      conversationId,
      fileName: file.name,
      contentType: file.type || 'application/octet-stream',
      byteSize: file.size
    })
  })

  async function uploadLocal() {
    const response = await fetch(
      '/v1/chat/attachments/upload-local?id=' + encodeURIComponent(intent.id),
      {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': intent.contentType }),
        body: file
      }
    )
    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.error || '上传失败')
    }
  }

  if (intent.uploadMode === 'local') {
    await uploadLocal()
  } else {
    try {
      const put = await fetch(intent.uploadUrl, {
        method: 'PUT',
        headers: intent.uploadHeaders || { 'Content-Type': intent.contentType },
        body: file
      })
      if (!put.ok) throw new Error('上传失败')
      await request('/v1/chat/attachments/' + encodeURIComponent(intent.id) + '/complete', {
        method: 'POST',
        body: '{}'
      })
    } catch (_) {
      await uploadLocal()
    }
  }

  const data = await request('/v1/chat/messages', {
    method: 'POST',
    body: JSON.stringify({
      conversationId,
      clientMsgId: clientMsgId(),
      kind: intent.kind,
      attachmentId: intent.id
    })
  })
  unread = data.unread || 0
  emit({ type: 'unread', unread })
  return data.message
}

function getUnread() {
  return unread
}

function mediaUrl(attachment) {
  if (!attachment || !attachment.url) return ''
  return withToken(attachment.url)
}

export const chat = {
  ensureSession,
  subscribe,
  listConversations,
  getConversation,
  markRead,
  sendText,
  uploadAndSend,
  getUnread,
  mediaUrl,
  clientMsgId,
  connectSocket
}
