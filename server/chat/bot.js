const { publish } = require('./realtime')
const { appendPeerMessage } = require('./store')

const timers = new Map()

function replyText(kind) {
  if (kind === 'image') {
    return '图片收到了。我这边会按图确认尺寸和细节，有改动再跟你说。'
  }
  if (kind === 'file') {
    return '文件已收到。我先打开看看，核对完再回复你。'
  }
  const options = [
    '好的，我记下了。购买仍走原来的渠道，定制细节可以继续在这里聊。',
    '收到。工期和改动我确认一下，有进展马上回你。',
    '可以。你把关键尺寸或参考再发我，文字、图片或文件都行。'
  ]
  return options[Math.floor(Math.random() * options.length)]
}

function scheduleReply(identityId, conversationId, kind) {
  const key = identityId + ':' + conversationId
  const previous = timers.get(key)
  if (previous) clearTimeout(previous)

  publish(identityId, { type: 'typing', conversationId, active: true })

  const delay = 900 + Math.floor(Math.random() * 1400)
  const timer = setTimeout(async () => {
    timers.delete(key)
    try {
      await appendPeerMessage(identityId, conversationId, {
        kind: 'text',
        body: replyText(kind)
      })
    } catch (error) {
      publish(identityId, { type: 'typing', conversationId, active: false })
      console.error('chat bot reply failed', error.message)
    }
  }, delay)
  timers.set(key, timer)
}

module.exports = { scheduleReply }
