const fs = require('fs')
const path = require('path')

function readEnv(file) {
  const env = {}
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue
    const i = line.indexOf('=')
    if (i < 0) continue
    env[line.slice(0, i).trim()] = line.slice(i + 1).trim()
  }
  return env
}

function loadEnv() {
  return readEnv(path.join(__dirname, '..', '.env'))
}

function pgConfig(env) {
  return {
    host: env.PGHOST,
    port: Number(env.PGPORT),
    user: env.PGUSER,
    password: env.PGPASSWORD,
    database: env.PGDATABASE,
    ssl: env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false }
  }
}

function publicBase(env) {
  return env.S3_ENDPOINT.replace(/\/$/, '') + '/' + env.S3_BUCKET_PUBLIC
}

module.exports = { loadEnv, pgConfig, publicBase }
