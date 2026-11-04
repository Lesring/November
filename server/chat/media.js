const fs = require('fs')
const path = require('path')
const { S3Client, PutObjectCommand, HeadObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3')
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner')
const { loadEnv } = require('../env')

const localRoot = path.join(__dirname, '..', 'uploads')

function s3() {
  const env = loadEnv()
  return {
    env,
    client: new S3Client({
      region: env.S3_REGION || 'us-east-1',
      endpoint: env.S3_ENDPOINT,
      forcePathStyle: true,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY,
        secretAccessKey: env.S3_SECRET_KEY
      }
    }),
    bucket: env.S3_BUCKET_PRIVATE
  }
}

async function createUpload({ objectKey, contentType, byteSize }) {
  const { env, client, bucket } = s3()
  try {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      ContentType: contentType
    })
    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 600 })
    return {
      mode: 's3',
      uploadUrl,
      headers: { 'Content-Type': contentType },
      byteSize
    }
  } catch (error) {
    return {
      mode: 'local',
      uploadUrl: '/v1/chat/attachments/upload-local',
      headers: { 'Content-Type': contentType },
      note: String(error.message || error)
    }
  }
}

async function saveLocal(objectKey, buffer, contentType) {
  const full = path.join(localRoot, objectKey)
  fs.mkdirSync(path.dirname(full), { recursive: true })
  fs.writeFileSync(full, buffer)
  return { mode: 'local', contentType }
}

async function verifyReady(objectKey, expectedSize) {
  const localPath = path.join(localRoot, objectKey)
  if (fs.existsSync(localPath)) {
    const stat = fs.statSync(localPath)
    if (expectedSize && Math.abs(stat.size - expectedSize) > 64) {
      return { ok: false, error: '上传大小不符' }
    }
    return { ok: true, mode: 'local' }
  }
  const { client, bucket } = s3()
  try {
    const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: objectKey }))
    const size = Number(head.ContentLength || 0)
    if (expectedSize && size && Math.abs(size - expectedSize) > 64) {
      return { ok: false, error: '上传大小不符' }
    }
    return { ok: true, mode: 's3' }
  } catch (error) {
    return { ok: false, error: '附件尚未上传完成' }
  }
}

async function signedDownload(objectKey, fileName, contentType) {
  const localPath = path.join(localRoot, objectKey)
  if (fs.existsSync(localPath)) {
    return {
      mode: 'local',
      url: '/v1/chat/attachments/raw/' + encodeURIComponent(objectKey).replace(/%2F/g, '/')
    }
  }
  const { client, bucket } = s3()
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: objectKey,
    ResponseContentType: contentType,
    ResponseContentDisposition: 'inline; filename="' + String(fileName).replace(/"/g, '') + '"'
  })
  const url = await getSignedUrl(client, command, { expiresIn: 300 })
  return { mode: 's3', url }
}

function readLocal(objectKey) {
  const full = path.join(localRoot, objectKey)
  if (!full.startsWith(localRoot) || !fs.existsSync(full)) return null
  return fs.readFileSync(full)
}

module.exports = {
  createUpload,
  saveLocal,
  verifyReady,
  signedDownload,
  readLocal,
  localRoot
}
