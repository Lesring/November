const { loadCatalog } = require('../catalog')
const { withClient, ensureSchema } = require('./db')
const {
  hashToken,
  newToken,
  randomId,
  relativeTime,
  sanitizeFileName,
  classifyAttachment,
  validateText,
  rateLimit
} = require('./security')
const media = require('./media')
const { publish } = require('./realtime')

const SESSION_DAYS = 30

function previewOf(message) {
  if (!message) return ''
  if (message.kind === 'image') return '[图片]'
  if (message.kind === 'file') return '[文件] ' + (message.fileName || message.body || '')
  return message.body || ''
}

async function bootstrap() {
  await ensureSchema()
}

async function createSession() {
  const token = newToken()
  const identityId = randomId('id')
  const tokenHash = hashToken(token)
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000)
  await withClient(async (client) => {
    await client.query('BEGIN')
    await client.query(
      'INSERT INTO chat_identities (id, display_name) VALUES ($1, $2)',
      [identityId, '访客']
    )
    await client.query(
      `INSERT INTO chat_sessions (token_hash, identity_id, expires_at)
       VALUES ($1, $2, $3)`,
      [tokenHash, identityId, expires.toISOString()]
    )
    await client.query('COMMIT')
  })
  await ensureInbox(identityId)
  return { token, identityId, displayName: '访客', expiresAt: expires.toISOString() }
}

async function resolveSession(token) {
  if (!token) return null
  const tokenHash = hashToken(token)
  const row = await withClient(async (client) => {
    const result = await client.query(
      `SELECT s.identity_id, s.expires_at, i.display_name
       FROM chat_sessions s
       JOIN chat_identities i ON i.id = s.identity_id
       WHERE s.token_hash = $1`,
      [tokenHash]
    )
    return result.rows[0] || null
  })
  if (!row) return null
  if (new Date(row.expires_at).getTime() < Date.now()) return null
  await withClient((client) =>
    client.query('UPDATE chat_sessions SET last_seen_at = now() WHERE token_hash = $1', [tokenHash])
  )
  return {
    identityId: row.identity_id,
    displayName: row.display_name,
    tokenHash
  }
}

async function ensureInbox(identityId) {
  const existing = await withClient(async (client) => {
    const result = await client.query(
      'SELECT count(*)::int AS n FROM chat_conversations WHERE owner_id = $1',
      [identityId]
    )
    return result.rows[0].n
  })
  if (existing > 0) return

  let seeds = []
  try {
    const catalog = await loadCatalog()
    seeds = catalog.messages || []
  } catch (_) {
    seeds = []
  }
  if (!seeds.length) {
    seeds = [
      {
        id: 'welcome',
        name: 'November',
        avatar: '',
        unread: false,
        lines: [{ from: 'them', text: '你好。有定制或认证问题，可以直接发文字、图片或文件。' }]
      }
    ]
  }

  await withClient(async (client) => {
    await client.query('BEGIN')
    try {
      for (const seed of seeds) {
        const conversationId = randomId('cv')
        const unread = seed.unread ? 1 : 0
        const lines = seed.lines || []
        const last = lines[lines.length - 1]
        const preview = last ? (last.text || '') : seed.preview || ''
        await client.query(
          `INSERT INTO chat_conversations
            (id, owner_id, seed_key, peer_name, peer_avatar, peer_kind, preview, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7, now() - ($8 || ' hours')::interval)`,
          [
            conversationId,
            identityId,
            seed.id,
            seed.name,
            seed.avatar || '',
            seed.id.includes('cert') ? 'system' : 'maker',
            preview,
            String(Math.floor(Math.random() * 48))
          ]
        )
        await client.query(
          `INSERT INTO chat_memberships (conversation_id, identity_id, unread_count, last_read_at)
           VALUES ($1,$2,$3, CASE WHEN $3 = 0 THEN now() ELSE NULL END)`,
          [conversationId, identityId, unread]
        )
        let order = 0
        for (const line of lines) {
          order += 1
          const created = new Date(Date.now() - (lines.length - order + 1) * 3600_000)
          await client.query(
            `INSERT INTO chat_messages
              (id, conversation_id, sender_role, sender_id, client_msg_id, kind, body, created_at)
             VALUES ($1,$2,$3,$4,$5,'text',$6,$7)`,
            [
              randomId('msg'),
              conversationId,
              line.from === 'me' ? 'me' : 'them',
              line.from === 'me' ? identityId : null,
              'seed_' + seed.id + '_' + order,
              line.text || '',
              created.toISOString()
            ]
          )
        }
      }
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    }
  })
}

async function assertMember(client, conversationId, identityId) {
  const result = await client.query(
    `SELECT c.*, m.unread_count, m.last_read_at
     FROM chat_conversations c
     JOIN chat_memberships m ON m.conversation_id = c.id AND m.identity_id = $2
     WHERE c.id = $1 AND c.owner_id = $2`,
    [conversationId, identityId]
  )
  return result.rows[0] || null
}

async function listConversations(identityId) {
  return withClient(async (client) => {
    const result = await client.query(
      `SELECT c.id, c.peer_name, c.peer_avatar, c.peer_kind, c.preview, c.updated_at,
              m.unread_count
       FROM chat_conversations c
       JOIN chat_memberships m ON m.conversation_id = c.id AND m.identity_id = $1
       WHERE c.owner_id = $1
       ORDER BY c.updated_at DESC`,
      [identityId]
    )
    return result.rows.map((row) => ({
      id: row.id,
      name: row.peer_name,
      avatar: row.peer_avatar,
      peerKind: row.peer_kind,
      preview: row.preview,
      time: relativeTime(row.updated_at),
      updatedAt: row.updated_at,
      unread: Number(row.unread_count) > 0,
      unreadCount: Number(row.unread_count)
    }))
  })
}

async function decorateAttachment(client, attachmentId, identityId) {
  if (!attachmentId) return null
  const result = await client.query(
    `SELECT a.* FROM chat_attachments a
     JOIN chat_memberships m ON m.conversation_id = a.conversation_id AND m.identity_id = $2
     WHERE a.id = $1 AND a.status = 'ready'`,
    [attachmentId, identityId]
  )
  const row = result.rows[0]
  if (!row) return null
  const signed = await media.signedDownload(row.object_key, row.file_name, row.content_type)
  return {
    id: row.id,
    kind: row.kind,
    fileName: row.file_name,
    contentType: row.content_type,
    byteSize: row.byte_size,
    url: signed.url
  }
}

async function getConversation(identityId, conversationId, { after } = {}) {
  return withClient(async (client) => {
    const conversation = await assertMember(client, conversationId, identityId)
    if (!conversation) return null
    const params = [conversationId]
    let sql =
      `SELECT id, sender_role, sender_id, client_msg_id, kind, body, attachment_id, created_at
       FROM chat_messages WHERE conversation_id = $1`
    if (after) {
      params.push(after)
      sql += ' AND created_at > $2'
    }
    sql += ' ORDER BY created_at ASC LIMIT 200'
    const messages = await client.query(sql, params)
    const items = []
    for (const row of messages.rows) {
      const attachment = await decorateAttachment(client, row.attachment_id, identityId)
      items.push({
        id: row.id,
        from: row.sender_role,
        clientMsgId: row.client_msg_id,
        kind: row.kind,
        text: row.body,
        body: row.body,
        attachment,
        createdAt: row.created_at,
        time: relativeTime(row.created_at)
      })
    }
    return {
      id: conversation.id,
      name: conversation.peer_name,
      avatar: conversation.peer_avatar,
      peerKind: conversation.peer_kind,
      preview: conversation.preview,
      unreadCount: Number(conversation.unread_count),
      messages: items
    }
  })
}

async function markRead(identityId, conversationId) {
  return withClient(async (client) => {
    const conversation = await assertMember(client, conversationId, identityId)
    if (!conversation) return null
    await client.query(
      `UPDATE chat_memberships
       SET unread_count = 0, last_read_at = now()
       WHERE conversation_id = $1 AND identity_id = $2`,
      [conversationId, identityId]
    )
    return { ok: true }
  })
}

async function createAttachmentIntent(identityId, { conversationId, fileName, contentType, byteSize }) {
  const limited = rateLimit('att:' + identityId)
  if (!limited.ok) return limited
  const safeName = sanitizeFileName(fileName)
  const classified = classifyAttachment(contentType, Number(byteSize), safeName)
  if (!classified.ok) return classified
  return withClient(async (client) => {
    const conversation = await assertMember(client, conversationId, identityId)
    if (!conversation) return { ok: false, error: '无权访问该会话', status: 403 }
    const id = randomId('att')
    const objectKey = `chat/${identityId}/${conversationId}/${id}/${safeName}`
    await client.query(
      `INSERT INTO chat_attachments
        (id, conversation_id, uploader_id, object_key, content_type, file_name, byte_size, kind, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending')`,
      [id, conversationId, identityId, objectKey, classified.contentType, safeName, Number(byteSize), classified.kind]
    )
    const upload = await media.createUpload({
      objectKey,
      contentType: classified.contentType,
      byteSize: Number(byteSize)
    })
    return {
      ok: true,
      attachment: {
        id,
        kind: classified.kind,
        fileName: safeName,
        contentType: classified.contentType,
        byteSize: Number(byteSize),
        uploadUrl: upload.uploadUrl,
        uploadHeaders: upload.headers,
        uploadMode: upload.mode
      }
    }
  })
}

async function completeAttachment(identityId, attachmentId) {
  return withClient(async (client) => {
    const result = await client.query(
      `SELECT a.* FROM chat_attachments a
       JOIN chat_memberships m ON m.conversation_id = a.conversation_id AND m.identity_id = $2
       WHERE a.id = $1 AND a.uploader_id = $2`,
      [attachmentId, identityId]
    )
    const row = result.rows[0]
    if (!row) return { ok: false, error: '附件不存在', status: 404 }
    if (row.status === 'ready') return { ok: true, attachmentId }
    const verified = await media.verifyReady(row.object_key, row.byte_size)
    if (!verified.ok) return verified
    await client.query(`UPDATE chat_attachments SET status = 'ready' WHERE id = $1`, [attachmentId])
    return { ok: true, attachmentId }
  })
}

async function saveLocalUpload(identityId, attachmentId, buffer) {
  return withClient(async (client) => {
    const result = await client.query(
      `SELECT a.* FROM chat_attachments a
       WHERE a.id = $1 AND a.uploader_id = $2 AND a.status = 'pending'`,
      [attachmentId, identityId]
    )
    const row = result.rows[0]
    if (!row) return { ok: false, error: '附件不存在', status: 404 }
    if (buffer.length > row.byte_size + 1024) return { ok: false, error: '文件过大' }
    await media.saveLocal(row.object_key, buffer, row.content_type)
    await client.query(`UPDATE chat_attachments SET status = 'ready', byte_size = $2 WHERE id = $1`, [
      attachmentId,
      buffer.length
    ])
    return { ok: true, attachmentId }
  })
}

async function sendMessage(identityId, payload) {
  const limited = rateLimit('msg:' + identityId)
  if (!limited.ok) return limited

  const conversationId = payload.conversationId
  const clientMsgId = String(payload.clientMsgId || '').slice(0, 80)
  if (!conversationId || !clientMsgId) {
    return { ok: false, error: '参数不完整' }
  }

  let kind = payload.kind || 'text'
  let body = ''
  let attachmentId = payload.attachmentId || null

  if (kind === 'text') {
    const validated = validateText(payload.body ?? payload.text)
    if (!validated.ok) return validated
    body = validated.text
  } else if (kind === 'image' || kind === 'file') {
    if (!attachmentId) return { ok: false, error: '缺少附件' }
  } else {
    return { ok: false, error: '不支持的消息类型' }
  }

  const result = await withClient(async (client) => {
    await client.query('BEGIN')
    try {
      const conversation = await assertMember(client, conversationId, identityId)
      if (!conversation) {
        await client.query('ROLLBACK')
        return { ok: false, error: '无权访问该会话', status: 403 }
      }

      if (attachmentId) {
        const att = await client.query(
          `SELECT * FROM chat_attachments
           WHERE id = $1 AND conversation_id = $2 AND uploader_id = $3 AND status = 'ready'`,
          [attachmentId, conversationId, identityId]
        )
        if (!att.rows[0]) {
          await client.query('ROLLBACK')
          return { ok: false, error: '附件不可用' }
        }
        kind = att.rows[0].kind
        body = att.rows[0].file_name
      }

      const existing = await client.query(
        `SELECT id FROM chat_messages WHERE conversation_id = $1 AND client_msg_id = $2`,
        [conversationId, clientMsgId]
      )
      if (existing.rows[0]) {
        await client.query('ROLLBACK')
        const full = await getConversation(identityId, conversationId)
        const message = full.messages.find((item) => item.clientMsgId === clientMsgId)
        return { ok: true, duplicate: true, message }
      }

      const id = randomId('msg')
      const inserted = await client.query(
        `INSERT INTO chat_messages
          (id, conversation_id, sender_role, sender_id, client_msg_id, kind, body, attachment_id)
         VALUES ($1,$2,'me',$3,$4,$5,$6,$7)
         RETURNING *`,
        [id, conversationId, identityId, clientMsgId, kind, body, attachmentId]
      )
      const preview = previewOf({
        kind,
        body,
        fileName: body
      })
      await client.query(
        `UPDATE chat_conversations SET preview = $2, updated_at = now() WHERE id = $1`,
        [conversationId, preview]
      )
      await client.query(
        `UPDATE chat_memberships SET unread_count = 0, last_read_at = now()
         WHERE conversation_id = $1 AND identity_id = $2`,
        [conversationId, identityId]
      )
      await client.query('COMMIT')

      const attachment = await decorateAttachment(client, attachmentId, identityId)
      const row = inserted.rows[0]
      return {
        ok: true,
        message: {
          id: row.id,
          from: 'me',
          clientMsgId: row.client_msg_id,
          kind: row.kind,
          text: row.body,
          body: row.body,
          attachment,
          createdAt: row.created_at,
          time: relativeTime(row.created_at)
        },
        conversationId
      }
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    }
  })

  if (result.ok && result.message && !result.duplicate) {
    publish(identityId, {
      type: 'message',
      conversationId,
      message: result.message
    })
    publish(identityId, {
      type: 'conversation',
      conversation: (await listConversations(identityId)).find((item) => item.id === conversationId)
    })
  }
  return result
}

async function appendPeerMessage(identityId, conversationId, { kind = 'text', body, attachmentId = null }) {
  const result = await withClient(async (client) => {
    await client.query('BEGIN')
    try {
      const conversation = await assertMember(client, conversationId, identityId)
      if (!conversation) {
        await client.query('ROLLBACK')
        return null
      }
      const id = randomId('msg')
      const inserted = await client.query(
        `INSERT INTO chat_messages
          (id, conversation_id, sender_role, sender_id, client_msg_id, kind, body, attachment_id)
         VALUES ($1,$2,'them',NULL,$3,$4,$5,$6)
         RETURNING *`,
        [id, conversationId, randomId('peer'), kind, body || '', attachmentId]
      )
      const preview = previewOf({ kind, body })
      await client.query(
        `UPDATE chat_conversations SET preview = $2, updated_at = now() WHERE id = $1`,
        [conversationId, preview]
      )
      await client.query(
        `UPDATE chat_memberships
         SET unread_count = unread_count + 1
         WHERE conversation_id = $1 AND identity_id = $2`,
        [conversationId, identityId]
      )
      await client.query('COMMIT')
      const row = inserted.rows[0]
      const attachment = await decorateAttachment(client, attachmentId, identityId)
      return {
        message: {
          id: row.id,
          from: 'them',
          clientMsgId: row.client_msg_id,
          kind: row.kind,
          text: row.body,
          body: row.body,
          attachment,
          createdAt: row.created_at,
          time: relativeTime(row.created_at)
        }
      }
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    }
  })
  if (!result) return null
  publish(identityId, {
    type: 'message',
    conversationId,
    message: result.message
  })
  const list = await listConversations(identityId)
  publish(identityId, {
    type: 'conversation',
    conversation: list.find((item) => item.id === conversationId)
  })
  publish(identityId, { type: 'typing', conversationId, active: false })
  return result
}

async function unreadTotal(identityId) {
  return withClient(async (client) => {
    const result = await client.query(
      `SELECT coalesce(sum(unread_count),0)::int AS n
       FROM chat_memberships WHERE identity_id = $1`,
      [identityId]
    )
    return result.rows[0].n
  })
}

async function getAttachmentForIdentity(identityId, attachmentId) {
  return withClient(async (client) => {
    const result = await client.query(
      `SELECT a.* FROM chat_attachments a
       JOIN chat_memberships m ON m.conversation_id = a.conversation_id AND m.identity_id = $2
       WHERE a.id = $1 AND a.status = 'ready'`,
      [attachmentId, identityId]
    )
    return result.rows[0] || null
  })
}

module.exports = {
  bootstrap,
  createSession,
  resolveSession,
  listConversations,
  getConversation,
  markRead,
  createAttachmentIntent,
  completeAttachment,
  saveLocalUpload,
  sendMessage,
  appendPeerMessage,
  unreadTotal,
  getAttachmentForIdentity
}
