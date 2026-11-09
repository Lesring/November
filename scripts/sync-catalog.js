/**
 * 把 shared/catalog.json 写入小程序可 require 的模块，
 * 并把 shared/images 复制到网页和小程序各自能读到的目录。
 * 改完数据或图片后运行：node scripts/sync-catalog.js
 */
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const jsonPath = path.join(root, 'shared/catalog.json')
const json = fs.readFileSync(jsonPath, 'utf8')
JSON.parse(json)

const banner = '/* 由 scripts/sync-catalog.js 从 shared/catalog.json 生成。请改 JSON 后重新运行，不要手改本文件。 */\n'
fs.mkdirSync(path.join(root, 'miniprogram/data'), { recursive: true })
fs.writeFileSync(
  path.join(root, 'miniprogram/data/catalog.js'),
  banner + 'module.exports = ' + json.trim() + '\n'
)

fs.mkdirSync(path.join(root, 'web/src/data'), { recursive: true })
fs.writeFileSync(path.join(root, 'web/src/data/demo-catalog.json'), json)

const srcDir = path.join(root, 'shared/images')
const dests = [
  path.join(root, 'web/public/images'),
  path.join(root, 'miniprogram/images')
]
for (const dest of dests) {
  fs.mkdirSync(dest, { recursive: true })
  for (const name of fs.readdirSync(srcDir)) {
    if (!/\.(jpg|jpeg|png|webp)$/i.test(name)) continue
    fs.copyFileSync(path.join(srcDir, name), path.join(dest, name))
  }
}

console.log('已同步 catalog 与图片到 web/src/data、web/public/images、miniprogram')
