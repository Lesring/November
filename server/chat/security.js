const crypto = require('crypto')

const ALLOWED_IMAGE = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const ALLOWED_FILE = new Set([
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'application/x-zip-compressed'
])

const MAX_IMAGE_BYTES = 8 * 1024 * 1024
const MAX_FILE_BYTES = 20 * 1024 * 1024
const MAX_TEXT_CHARS = 2000
const RATE_WINDOW_MS = 60_000
const RATE_LIMIT = 40

const buckets = new Map()

function sanitizeFileName(name) {
  const base = String(name || 'file')
    .replace(/[/\\?%*:|"<>]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120)
  return base || 'file'
}

function guessTypeFromName(fileName) {
  const lower = String(fileName || '').toLowerCase()
  if (/\.(jpe?g)$/.test(lower)) return 'image/jpeg'
  if (/\.png$/.test(lower)) return 'image/png'
  if (/\.webp$/.test(lower)) return 'image/webp'
  if (/\.gif$/.test(lower)) return 'image/gif'
  if (/\.pdf$/.test(lower)) return 'application/pdf'
  if (/\.txt$/.test(lower)) return 'text/plain'
  if (/\.docx$/.test(lower)) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  }
  if (/\.doc$/.test(lower)) return 'application/msword'
  if (/\.xlsx$/.test(lower)) {
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  }
  if (/\.xls$/.test(lower)) return 'application/vnd.ms-excel'
  if (/\.zip$/.test(lower)) return 'application/zip'
  return ''
}

function classifyAttachment(contentType, byteSize, fileName) {
  let type = String(contentType || '').toLowerCase().split(';')[0].trim()
  if (type === 'image') type = 'image/jpeg'
  if (!type || type === 'application/octet-stream') {
    type = guessTypeFromName(fileName) || type
  }
  if (ALLOWED_IMAGE.has(type)) {
    if (byteSize > MAX_IMAGE_BYTES) {
      return { ok: false, error: '图片不能超过 8MB' }
    }
    return { ok: true, kind: 'image', contentType: type }
  }
  if (ALLOWED_FILE.has(type)) {
    if (byteSize > MAX_FILE_BYTES) {
      return { ok: false, error: '文件不能超过 20MB' }
    }
    return { ok: true, kind: 'file', contentType: type }
  }
  return { ok: false, error: '不支持的文件类型' }
}

function validateText(body) {
  const text = String(body || '').trim()
  if (!text) return { ok: false, error: '先写一点再发送' }
  if (text.length > MAX_TEXT_CHARS) return { ok: false, error: '文字太长了' }
  return { ok: true, text }
}

function rateLimit(key) {
  const now = Date.now()
  let bucket = buckets.get(key)
  if (!bucket || now - bucket.start > RATE_WINDOW_MS) {
    bucket = { start: now, count: 0 }
    buckets.set(key, bucket)
  }
  bucket.count += 1
  if (bucket.count > RATE_LIMIT) {
    return { ok: false, error: '发送太频繁，稍后再试' }
  }
  return { ok: true }
}

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex')
}

function randomId(prefix) {
  return prefix + '_' + crypto.randomBytes(12).toString('hex')
}

function newToken() {
  return crypto.randomBytes(32).toString('base64url')
}

function relativeTime(date, now = new Date()) {
  const t = date instanceof Date ? date : new Date(date)
  const diff = Math.max(0, now.getTime() - t.getTime())
  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour
  if (diff < minute) return '刚刚'
  if (diff < hour) return Math.floor(diff / minute) + ' 分钟前'
  if (diff < day) return Math.floor(diff / hour) + ' 小时前'
  if (diff < 2 * day) return '昨天'
  if (diff < 7 * day) return Math.floor(diff / day) + ' 天前'
  return t.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
}

module.exports = {
  ALLOWED_IMAGE,
  ALLOWED_FILE,
  MAX_IMAGE_BYTES,
  MAX_FILE_BYTES,
  MAX_TEXT_CHARS,
  sanitizeFileName,
  classifyAttachment,
  validateText,
  rateLimit,
  hashToken,
  randomId,
  newToken,
  relativeTime
}
