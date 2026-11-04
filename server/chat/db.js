const fs = require('fs')
const path = require('path')
const { Pool } = require('pg')
const { loadEnv, pgConfig } = require('../env')

let pool

function getPool() {
  if (!pool) {
    const env = loadEnv()
    pool = new Pool(pgConfig(env))
  }
  return pool
}

async function ensureSchema() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8')
  await getPool().query(sql)
}

async function withClient(fn) {
  const client = await getPool().connect()
  try {
    return await fn(client)
  } finally {
    client.release()
  }
}

module.exports = { getPool, ensureSchema, withClient }
