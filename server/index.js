const http = require('http')
const { loadCatalog } = require('./catalog')
const chatStore = require('./chat/store')
const chatHttp = require('./chat/http')
const chatRealtime = require('./chat/realtime')

const port = Number(process.env.PORT || 8787)

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(body))
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*')
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Chat-Token')
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    res.writeHead(204)
    res.end()
    return
  }

  try {
    const handled = await chatHttp.handle(req, res)
    if (handled) return
  } catch (error) {
    sendJson(res, 500, { error: error.message })
    return
  }

  if (req.method === 'GET' && (req.url === '/v1/catalog' || req.url === '/health')) {
    try {
      if (req.url === '/health') {
        sendJson(res, 200, { ok: true })
        return
      }
      const catalog = await loadCatalog()
      sendJson(res, 200, catalog)
    } catch (error) {
      sendJson(res, 500, { error: error.message })
    }
    return
  }

  res.writeHead(404)
  res.end()
})

chatRealtime.attach(server, {
  resolveSession: (token) => chatStore.resolveSession(token)
})

chatStore
  .bootstrap()
  .then(() => {
    server.listen(port, '0.0.0.0', () => {
      console.log('目录与消息服务 http://127.0.0.1:' + port)
    })
  })
  .catch((error) => {
    console.error('消息服务初始化失败', error)
    process.exit(1)
  })
