/**
 * 不启动微信开发者工具，检查小程序工程能不能被解析：
 * JSON 合法、页面文件齐全、JS 语法能过 node --check。
 */
const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const root = path.join(__dirname, '..', 'miniprogram')
const errors = []

function readJson(rel) {
  const full = path.join(root, rel)
  try {
    return JSON.parse(fs.readFileSync(full, 'utf8'))
  } catch (error) {
    errors.push(rel + ' JSON 无法解析: ' + error.message)
    return null
  }
}

const app = readJson('app.json')
const project = readJson('project.config.json')
readJson('sitemap.json')

if (project && project.appid !== 'touristappid') {
  errors.push('project.config.json 的 appid 应为 touristappid')
}
if (project && project.setting && project.setting.urlCheck !== false) {
  errors.push('project.config.json 应关闭 urlCheck，方便演示图片')
}

if (app) {
  const pages = app.pages || []
  pages.forEach((page) => {
    ;['js', 'json', 'wxml', 'wxss'].forEach((ext) => {
      const rel = page + '.' + ext
      if (!fs.existsSync(path.join(root, rel))) errors.push('缺少 ' + rel)
    })
    const pageJson = readJson(page + '.json')
    if (pageJson && pageJson.usingComponents) {
      Object.keys(pageJson.usingComponents).forEach((name) => {
        const comp = pageJson.usingComponents[name].replace(/^\//, '')
        ;['js', 'json', 'wxml', 'wxss'].forEach((ext) => {
          const rel = comp + '.' + ext
          if (!fs.existsSync(path.join(root, rel))) errors.push('组件缺失 ' + rel + '（' + name + '）')
        })
      })
    }
  })
  ;(app.tabBar.list || []).forEach((item) => {
    if (!pages.includes(item.pagePath)) errors.push('tabBar 页面不在 pages 里: ' + item.pagePath)
  })
  if (!fs.existsSync(path.join(root, 'custom-tab-bar/index.js'))) {
    errors.push('缺少 custom-tab-bar')
  }
}

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name)
    if (fs.statSync(full).isDirectory()) walk(full)
    else if (name.endsWith('.js')) {
      const result = spawnSync(process.execPath, ['--check', full], { encoding: 'utf8' })
      if (result.status !== 0) errors.push(path.relative(root, full) + ' 语法错误\n' + result.stderr)
    }
  }
}
walk(root)

const catalog = require(path.join(root, 'data/catalog.js'))
catalog.products.forEach((product) => {
  product.images.forEach((image) => {
    const file = path.join(root, image.replace(/^\//, ''))
    if (!fs.existsSync(file)) errors.push('图片不存在 ' + image)
  })
  if (!catalog.creators.some((creator) => creator.id === product.creatorId)) {
    errors.push('创作者缺失 ' + product.creatorId)
  }
})

if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}
console.log('小程序工程检查通过：' + (app ? app.pages.length : 0) + ' 个页面')
