const { WebSocketServer } = require('ws')
const { hashToken } = require('./security')

/** @type {Map<string, Set<import('ws').WebSocket>>} */
const socketsByIdentity = new Map()

function attach(server, { resolveSession }) {
  const wss = new WebSocketServer({ noServer: true })

  server.on('upgrade', async (req, socket, head) => {
    try {
      const url = new URL(req.url || '', 'http://127.0.0.1')
      if (url.pathname !== '/v1/chat/ws') {
        socket.destroy()
        return
      }
      const token = url.searchParams.get('token') || ''
      const session = await resolveSession(token)
      if (!session) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
        socket.destroy()
        return
      }
      wss.handleUpgrade(req, socket, head, (ws) => {
        ws.identityId = session.identityId
        ws.tokenHash = hashToken(token)
        let set = socketsByIdentity.get(session.identityId)
        if (!set) {
          set = new Set()
          socketsByIdentity.set(session.identityId, set)
        }
        set.add(ws)
        ws.send(JSON.stringify({ type: 'hello', identityId: session.identityId }))
        ws.on('close', () => {
          set.delete(ws)
          if (!set.size) socketsByIdentity.delete(session.identityId)
        })
        ws.on('message', (raw) => {
          try {
            const data = JSON.parse(String(raw))
            if (data && data.type === 'ping') {
              ws.send(JSON.stringify({ type: 'pong', t: Date.now() }))
            }
          } catch (_) {
            /* ignore */
          }
        })
      })
    } catch (_) {
      socket.destroy()
    }
  })

  return wss
}

function publish(identityId, event) {
  const set = socketsByIdentity.get(identityId)
  if (!set || !set.size) return
  const payload = JSON.stringify(event)
  for (const ws of set) {
    if (ws.readyState === 1) ws.send(payload)
  }
}

module.exports = { attach, publish }
