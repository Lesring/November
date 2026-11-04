const { URL } = require('url')
const media = require('./media')
const store = require('./store')
const { scheduleReply } = require('./bot')

function sendJson(res, status, body) {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  })
  res.end(payload)
}

function readBody(req, limit = 2 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > limit) {
        reject(Object.assign(new Error('payload too large'), { status: 413 }))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

async function readJson(req) {
  const raw = await readBody(req, 1024 * 1024)
  if (!raw.length) return {}
  try {
    return JSON.parse(raw.toString('utf8'))
  } catch (_) {
    const error = new Error('JSON 无效')
    error.status = 400
    throw error
  }
}

function cors(req, res) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Chat-Token')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Expose-Headers', 'X-Chat-Unread')
}

function bearer(req, url) {
  const header = req.headers.authorization || ''
  if (header.startsWith('Bearer ')) return header.slice(7).trim()
  const headerToken = String(req.headers['x-chat-token'] || '').trim()
  if (headerToken) return headerToken
  if (url) return String(url.searchParams.get('token') || '').trim()
  return ''
}

async function requireSession(req, res, url) {
  const token = bearer(req, url)
  const session = await store.resolveSession(token)
  if (!session) {
    sendJson(res, 401, { error: '请重新进入消息页' })
    return null
  }
  return { ...session, token }
}

async function handle(req, res) {
  cors(req, res)
  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return true
  }

  const url = new URL(req.url || '', 'http://127.0.0.1')
  const path = url.pathname

  if (!path.startsWith('/v1/chat')) return false

  try {
    if (req.method === 'POST' && path === '/v1/chat/session') {
      const session = await store.createSession()
      sendJson(res, 200, session)
      return true
    }

    if (req.method === 'GET' && path === '/v1/chat/session') {
      const session = await requireSession(req, res, url)
      if (!session) return true
      sendJson(res, 200, {
        identityId: session.identityId,
        displayName: session.displayName,
        unread: await store.unreadTotal(session.identityId)
      })
      return true
    }

    if (req.method === 'GET' && path === '/v1/chat/conversations') {
      const session = await requireSession(req, res, url)
      if (!session) return true
      const conversations = await store.listConversations(session.identityId)
      const unread = await store.unreadTotal(session.identityId)
      res.setHeader('X-Chat-Unread', String(unread))
      sendJson(res, 200, { conversations, unread })
      return true
    }

    const conversationMatch = path.match(/^\/v1\/chat\/conversations\/([^/]+)$/)
    if (req.method === 'GET' && conversationMatch) {
      const session = await requireSession(req, res, url)
      if (!session) return true
      const conversation = await store.getConversation(session.identityId, conversationMatch[1], {
        after: url.searchParams.get('after') || undefined
      })
      if (!conversation) {
        sendJson(res, 404, { error: '会话不存在' })
        return true
      }
      sendJson(res, 200, { conversation })
      return true
    }

    const readMatch = path.match(/^\/v1\/chat\/conversations\/([^/]+)\/read$/)
    if (req.method === 'POST' && readMatch) {
      const session = await requireSession(req, res, url)
      if (!session) return true
      const result = await store.markRead(session.identityId, readMatch[1])
      if (!result) {
        sendJson(res, 404, { error: '会话不存在' })
        return true
      }
      sendJson(res, 200, { ok: true, unread: await store.unreadTotal(session.identityId) })
      return true
    }

    if (req.method === 'POST' && path === '/v1/chat/messages') {
      const session = await requireSession(req, res, url)
      if (!session) return true
      const body = await readJson(req)
      const result = await store.sendMessage(session.identityId, body)
      if (!result.ok) {
        sendJson(res, result.status || 400, { error: result.error })
        return true
      }
      if (!result.duplicate) {
        scheduleReply(session.identityId, body.conversationId, result.message.kind)
      }
      sendJson(res, 200, {
        message: result.message,
        unread: await store.unreadTotal(session.identityId)
      })
      return true
    }

    if (req.method === 'POST' && path === '/v1/chat/attachments') {
      const session = await requireSession(req, res, url)
      if (!session) return true
      const body = await readJson(req)
      const result = await store.createAttachmentIntent(session.identityId, body)
      if (!result.ok) {
        sendJson(res, result.status || 400, { error: result.error })
        return true
      }
      sendJson(res, 200, result.attachment)
      return true
    }

    const completeMatch = path.match(/^\/v1\/chat\/attachments\/([^/]+)\/complete$/)
    if (req.method === 'POST' && completeMatch) {
      const session = await requireSession(req, res, url)
      if (!session) return true
      const result = await store.completeAttachment(session.identityId, completeMatch[1])
      if (!result.ok) {
        sendJson(res, result.status || 400, { error: result.error })
        return true
      }
      sendJson(res, 200, { ok: true, attachmentId: result.attachmentId })
      return true
    }

    if (req.method === 'POST' && path === '/v1/chat/attachments/upload-local') {
      const session = await requireSession(req, res, url)
      if (!session) return true
      const attachmentId = url.searchParams.get('id')
      if (!attachmentId) {
        sendJson(res, 400, { error: '缺少附件 id' })
        return true
      }
      const buffer = await readBody(req, 21 * 1024 * 1024)
      const result = await store.saveLocalUpload(session.identityId, attachmentId, buffer)
      if (!result.ok) {
        sendJson(res, result.status || 400, { error: result.error })
        return true
      }
      sendJson(res, 200, { ok: true, attachmentId: result.attachmentId })
      return true
    }

    const urlMatch = path.match(/^\/v1\/chat\/attachments\/([^/]+)\/url$/)
    if (req.method === 'GET' && urlMatch) {
      const session = await requireSession(req, res, url)
      if (!session) return true
      const row = await store.getAttachmentForIdentity(session.identityId, urlMatch[1])
      if (!row) {
        sendJson(res, 404, { error: '附件不存在' })
        return true
      }
      const signed = await media.signedDownload(row.object_key, row.file_name, row.content_type)
      sendJson(res, 200, { url: signed.url, expiresIn: 300 })
      return true
    }

    if (req.method === 'GET' && path.startsWith('/v1/chat/attachments/raw/')) {
      const session = await requireSession(req, res, url)
      if (!session) return true
      const objectKey = decodeURIComponent(path.slice('/v1/chat/attachments/raw/'.length))
      if (objectKey.includes('..') || !objectKey.startsWith('chat/' + session.identityId + '/')) {
        sendJson(res, 403, { error: '无权访问' })
        return true
      }
      const buffer = media.readLocal(objectKey)
      if (!buffer) {
        sendJson(res, 404, { error: '文件不存在' })
        return true
      }
      res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Cache-Control': 'private, max-age=60'
      })
      res.end(buffer)
      return true
    }

    sendJson(res, 404, { error: 'not found' })
    return true
  } catch (error) {
    console.error(error)
    sendJson(res, error.status || 500, { error: error.message || 'server error' })
    return true
  }
}

module.exports = { handle, bearer }
