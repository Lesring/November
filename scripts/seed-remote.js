/**
 * 把 shared/catalog.json 变成演示数据集：
 * id 与标题加统一前缀，图片上传到公开桶，记录写入 PostgreSQL，
 * 并导出小程序用的 catalog.js（图片地址指向对象存储）。
 */
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3')
const { loadEnv, pgConfig, publicBase } = require('../server/env')

const DATASET = 'demo'
const root = path.join(__dirname, '..')

function demoId(id) {
  if (!id) return id
  return String(id).startsWith('demo-') ? String(id) : 'demo-' + id
}

function label(text) {
  if (!text || String(text).startsWith('演示·')) return text
  return '演示·' + text
}

function rewriteUrl(value, base) {
  if (!value || typeof value !== 'string') return value
  const match = value.match(/\/images\/([^/?#]+)$/)
  if (!match) return value
  return base + '/demo/images/' + match[1]
}

function buildCatalog(base) {
  const catalog = JSON.parse(fs.readFileSync(path.join(root, 'shared/catalog.json'), 'utf8'))
  catalog.dataset = DATASET
  catalog.brand = Object.assign({}, catalog.brand, { tagline: '演示数据 · 中国手作甄选' })
  catalog.creators.forEach((creator) => {
    creator.id = demoId(creator.id)
    creator.name = label(creator.name)
    creator.avatar = rewriteUrl(creator.avatar, base)
    creator.cover = rewriteUrl(creator.cover, base)
    creator.process.forEach((step) => {
      step.image = rewriteUrl(step.image, base)
    })
  })
  catalog.products.forEach((product) => {
    product.id = demoId(product.id)
    product.creatorId = demoId(product.creatorId)
    product.title = label(product.title)
    product.images = product.images.map((image) => rewriteUrl(image, base))
  })
  catalog.customIds = (catalog.customIds || []).map(demoId)
  catalog.collections.forEach((item) => {
    item.id = demoId(item.id)
    item.title = label(item.title)
    item.image = rewriteUrl(item.image, base)
  })
  catalog.posts.forEach((post) => {
    post.id = demoId(post.id)
    post.creatorId = demoId(post.creatorId)
    post.productId = demoId(post.productId)
    post.title = label(post.title)
    if (post.poster) post.poster = rewriteUrl(post.poster, base)
    if (post.images) post.images = post.images.map((image) => rewriteUrl(image, base))
  })
  catalog.messages.forEach((message) => {
    message.id = demoId(message.id)
    message.name = label(message.name)
    if (message.avatar) message.avatar = rewriteUrl(message.avatar, base)
  })

  const extra = extraRecords(base)
  catalog.products.push(...extra.products)
  catalog.posts.push(...extra.posts)
  catalog.messages.push(...extra.messages)
  extra.customIds.forEach((id) => catalog.customIds.push(id))
  return catalog
}

function extraRecords(base) {
  const img = (name) => base + '/demo/images/' + name
  return {
    customIds: ['demo-wood-box', 'demo-weave-runner'],
    products: [
      {
        id: 'demo-ceramic-set',
        title: '演示·一窑三件',
        price: 1680,
        categoryId: 'ceramic',
        creatorId: 'demo-lin-wanci',
        images: [img('vases.jpg'), img('cups.jpg'), img('plates.jpg')],
        certifications: ['material', 'handmade', 'original'],
        summary: '花器、杯子和盘子，同一窑留下的三件。',
        description: '这组用来演示多图滑动。三件都出自己登记过的窑次，釉色不会完全一样。',
        leadTime: '现货，5 日内发出',
        edition: '本季 2 组',
        specs: [
          { label: '件数', value: '3' },
          { label: '材质', value: '瓷 · 月白与雾蓝' }
        ],
        verification: {
          material: '泥与釉的记录挂在这一组上，演示数据。',
          handmade: '拉坯、施釉、装窑由创作者完成。',
          original: '组合方式已做演示登记，编号 DEMO-LC-001。'
        }
      },
      {
        id: 'demo-wood-box',
        title: '演示·胡桃木茶则盒',
        price: 460,
        categoryId: 'wood',
        creatorId: 'demo-chen-musheng',
        images: [img('woodroom.jpg')],
        certifications: ['material', 'handmade'],
        summary: '盖子留着木纹，里面衬一层本色布。',
        description: '用来演示木作分类和可沟通定制。尺寸可以按茶则改，购买仍回微信。',
        leadTime: '约 2 周，支持尺寸沟通',
        edition: '少量',
        specs: [
          { label: '材质', value: '胡桃木 · 木蜡' },
          { label: '内衬', value: '本色布' }
        ],
        verification: {
          material: '木材来源写在演示说明里。',
          handmade: '开料、打磨、上蜡由创作者完成。'
        }
      },
      {
        id: 'demo-weave-runner',
        title: '演示·本色桌旗',
        price: 390,
        categoryId: 'weave',
        creatorId: 'demo-a-zhi',
        images: [img('linen.jpg'), img('weave.jpg')],
        certifications: ['material', 'handmade', 'original'],
        summary: '未染色的一段，适合铺在茶席边上。',
        description: '两张图用来演示图文。长度可以沟通，不接纯转售。',
        leadTime: '约 3 周，支持长度沟通',
        edition: '按段',
        specs: [
          { label: '材质', value: '亚麻' },
          { label: '工艺', value: '手织' }
        ],
        verification: {
          material: '纱线为植物纤维，演示记录。',
          handmade: '整经到下机由创作者完成。',
          original: '这段密度已登记，编号 DEMO-AZ-014。'
        }
      },
      {
        id: 'demo-silver-pair',
        title: '演示·涡纹一对',
        price: 980,
        categoryId: 'silver',
        creatorId: 'demo-su-yin',
        images: [img('silver-spiral.jpg'), img('silver-spiral-b.jpg')],
        certifications: ['material', 'handmade', 'original'],
        summary: '同一纹样的两面，可以当耳饰或小挂件。',
        description: '用来演示银饰双图。纹样已登记，购买回淘宝。',
        leadTime: '约 2 周',
        edition: '一对',
        specs: [
          { label: '材质', value: '银' },
          { label: '数量', value: '2' }
        ],
        verification: {
          material: '成色随件说明，演示数据。',
          handmade: '锤打与錾刻为手工。',
          original: '涡纹疏密已登记，编号 DEMO-SY-009。'
        }
      }
    ],
    posts: [
      {
        id: 'demo-wood-shavings',
        type: 'note',
        creatorId: 'demo-chen-musheng',
        productId: 'demo-wood-box',
        title: '演示·盒子合上之前',
        body: '木纹对着看一遍，盖子不紧再修。这是图文，不是商品页。',
        images: [img('woodroom.jpg'), img('spoons.jpg')],
        likes: 42,
        ratio: '4 / 5'
      },
      {
        id: 'demo-linen-video',
        type: 'video',
        creatorId: 'demo-a-zhi',
        productId: 'demo-weave-runner',
        title: '演示·桌旗的最后一梭',
        body: '过程视频留在私有桶的设想里。这里用封面代替播放文件。',
        poster: img('linen.jpg'),
        duration: '00:16',
        likes: 73,
        ratio: '3 / 4'
      }
    ],
    messages: [
      {
        id: 'demo-badge-ready',
        name: '演示·认证',
        avatar: '',
        preview: '徽章已经可以放到你的小红书主页。',
        time: '今天',
        unread: true,
        lines: [
          { from: 'them', text: '材料、手作和原创都核对过了。这是演示消息，徽章链接以后会发在这里。' }
        ]
      },
      {
        id: 'demo-weave-ask',
        name: '演示·阿织',
        avatar: img('weave.jpg'),
        preview: '桌旗可以改短，染料不再加。',
        time: '周三',
        unread: false,
        lines: [
          { from: 'me', text: '桌旗能不能短一点？' },
          { from: 'them', text: '可以。短一截工期差不多，颜色保持本色。购买还是走我的小红书。' }
        ]
      }
    ]
  }
}

async function uploadImages(env) {
  const client = new S3Client({
    region: env.S3_REGION || 'us-east-1',
    endpoint: env.S3_ENDPOINT,
    forcePathStyle: true,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY,
      secretAccessKey: env.S3_SECRET_KEY
    }
  })
  const dir = path.join(root, 'shared/images')
  const names = fs.readdirSync(dir).filter((name) => /\.jpe?g$/i.test(name))
  for (const name of names) {
    await client.send(new PutObjectCommand({
      Bucket: env.S3_BUCKET_PUBLIC,
      Key: 'demo/images/' + name,
      Body: fs.readFileSync(path.join(dir, name)),
      ContentType: 'image/jpeg'
    }))
    console.log('已上传 ' + name)
  }
  client.destroy()
}

async function insert(client, catalog, env) {
  const bucket = env.S3_BUCKET_PUBLIC
  const files = new Map()

  function mediaId(url) {
    if (!url) return null
    const name = String(url).split('/').pop().replace(/\.[^.]+$/, '')
    const id = 'demo-file-' + name
    if (!files.has(id)) {
      const key = String(url).split('/' + bucket + '/')[1]
      files.set(id, {
        id,
        bucket,
        objectKey: key,
        visibility: 'public',
        contentType: 'image/jpeg'
      })
    }
    return id
  }

  catalog.creators.forEach((creator) => {
    mediaId(creator.avatar)
    mediaId(creator.cover)
    creator.process.forEach((step) => mediaId(step.image))
  })
  catalog.products.forEach((product) => product.images.forEach(mediaId))
  catalog.collections.forEach((item) => mediaId(item.image))
  catalog.posts.forEach((post) => {
    mediaId(post.poster)
    ;(post.images || []).forEach(mediaId)
  })
  catalog.messages.forEach((message) => mediaId(message.avatar))

  await client.query('INSERT INTO datasets (id, label) VALUES ($1, $2)', [DATASET, '演示数据'])
  for (const file of files.values()) {
    await client.query(
      `INSERT INTO media_files (dataset, id, bucket, object_key, visibility, content_type)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [DATASET, file.id, file.bucket, file.objectKey, file.visibility, file.contentType]
    )
  }
  for (let i = 0; i < catalog.categories.length; i++) {
    const item = catalog.categories[i]
    await client.query(
      'INSERT INTO categories (dataset, id, name, sort_order) VALUES ($1,$2,$3,$4)',
      [DATASET, item.id, item.name, i]
    )
  }
  for (let i = 0; i < catalog.certifications.length; i++) {
    const item = catalog.certifications[i]
    await client.query(
      'INSERT INTO certification_types (dataset, id, label, summary, sort_order) VALUES ($1,$2,$3,$4,$5)',
      [DATASET, item.id, item.label, item.summary, i]
    )
  }
  for (const item of catalog.creators) {
    await client.query(
      `INSERT INTO makers (dataset, id, name, city, craft, years, avatar_id, cover_id, headline)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [DATASET, item.id, item.name, item.city, item.craft, item.years, mediaId(item.avatar), mediaId(item.cover), item.headline]
    )
    await client.query(
      'INSERT INTO maker_channels (dataset, maker_id, name, label) VALUES ($1,$2,$3,$4)',
      [DATASET, item.id, item.channel.name, item.channel.label]
    )
    for (let i = 0; i < item.story.length; i++) {
      await client.query(
        'INSERT INTO maker_paragraphs (dataset, maker_id, sort_order, body) VALUES ($1,$2,$3,$4)',
        [DATASET, item.id, i, item.story[i]]
      )
    }
    for (let i = 0; i < item.process.length; i++) {
      const step = item.process[i]
      await client.query(
        'INSERT INTO maker_steps (dataset, maker_id, sort_order, media_id, caption) VALUES ($1,$2,$3,$4,$5)',
        [DATASET, item.id, i, mediaId(step.image), step.caption]
      )
    }
    const applicationId = 'demo-app-' + item.id.replace(/^demo-/, '')
    await client.query(
      'INSERT INTO applications (dataset, id, maker_id, status, note) VALUES ($1,$2,$3,$4,$5)',
      [DATASET, applicationId, item.id, 'approved', '演示审核已通过。过程照片挂在证据表上。']
    )
    for (let i = 0; i < item.process.length; i++) {
      await client.query(
        `INSERT INTO evidence (dataset, id, application_id, media_id, kind, caption, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [DATASET, applicationId + '-' + i, applicationId, mediaId(item.process[i].image), 'photo', item.process[i].caption, i]
      )
    }
    await client.query(
      'INSERT INTO badges (dataset, id, maker_id, application_id, public_slug) VALUES ($1,$2,$3,$4,$5)',
      [DATASET, 'demo-badge-' + item.id.replace(/^demo-/, ''), item.id, applicationId, item.id]
    )
  }

  const custom = new Set(catalog.customIds || [])
  for (let i = 0; i < catalog.products.length; i++) {
    const item = catalog.products[i]
    await client.query(
      `INSERT INTO works
        (dataset, id, maker_id, category_id, title, price_yuan, summary, description, lead_time, edition, accepts_custom, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [DATASET, item.id, item.creatorId, item.categoryId, item.title, item.price, item.summary, item.description, item.leadTime, item.edition, custom.has(item.id), i]
    )
    for (let index = 0; index < item.images.length; index++) {
      await client.query(
        'INSERT INTO work_images (dataset, work_id, sort_order, media_id) VALUES ($1,$2,$3,$4)',
        [DATASET, item.id, index, mediaId(item.images[index])]
      )
    }
    for (let index = 0; index < item.specs.length; index++) {
      await client.query(
        'INSERT INTO work_specs (dataset, work_id, sort_order, label, value) VALUES ($1,$2,$3,$4,$5)',
        [DATASET, item.id, index, item.specs[index].label, item.specs[index].value]
      )
    }
    for (const certId of item.certifications) {
      await client.query(
        'INSERT INTO work_marks (dataset, work_id, certification_id, detail) VALUES ($1,$2,$3,$4)',
        [DATASET, item.id, certId, item.verification[certId] || '']
      )
    }
  }

  for (let i = 0; i < catalog.collections.length; i++) {
    const item = catalog.collections[i]
    await client.query(
      `INSERT INTO collections (dataset, id, category_id, media_id, kicker, title, subtitle, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [DATASET, item.id, item.categoryId, mediaId(item.image), item.kicker, item.title, item.subtitle, i]
    )
  }
  for (let i = 0; i < catalog.posts.length; i++) {
    const item = catalog.posts[i]
    await client.query(
      `INSERT INTO posts
        (dataset, id, maker_id, work_id, type, title, body, poster_id, duration, likes, ratio, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [DATASET, item.id, item.creatorId, item.productId || null, item.type, item.title, item.body, mediaId(item.poster), item.duration || null, item.likes || 0, item.ratio || null, i]
    )
    const images = item.images || []
    for (let index = 0; index < images.length; index++) {
      await client.query(
        'INSERT INTO post_images (dataset, post_id, sort_order, media_id) VALUES ($1,$2,$3,$4)',
        [DATASET, item.id, index, mediaId(images[index])]
      )
    }
  }
  for (let i = 0; i < catalog.messages.length; i++) {
    const item = catalog.messages[i]
    await client.query(
      `INSERT INTO inquiries (dataset, id, name, avatar_id, preview, time_label, unread, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [DATASET, item.id, item.name, mediaId(item.avatar), item.preview, item.time, !!item.unread, i]
    )
    for (let index = 0; index < item.lines.length; index++) {
      await client.query(
        'INSERT INTO inquiry_lines (dataset, inquiry_id, sort_order, sender, body) VALUES ($1,$2,$3,$4,$5)',
        [DATASET, item.id, index, item.lines[index].from, item.lines[index].text]
      )
    }
  }

  const brand = catalog.brand
  const rights = catalog.rights
  const program = catalog.program
  const membership = catalog.membership
  await client.query(
    `INSERT INTO site_copy (
      dataset, brand_name, brand_name_zh, tagline, promise, lede,
      rights_title, return_policy, rights_body, protection, protection_note,
      program_kicker, program_headline, program_intro, badge_name, badge_note, apply_label, apply_note,
      membership_headline, membership_intro, membership_note
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)`,
    [
      DATASET, brand.name, brand.nameZh, brand.tagline, brand.promise, brand.lede,
      rights.title, rights.returnPolicy, rights.body, rights.protection, rights.protectionNote,
      program.kicker, program.headline, program.intro, program.badge, program.badgeNote, program.applyLabel, program.applyNote,
      membership.headline, membership.intro, membership.note
    ]
  )
  for (let i = 0; i < program.standards.length; i++) {
    await client.query(
      'INSERT INTO program_standards (dataset, sort_order, body) VALUES ($1,$2,$3)',
      [DATASET, i, program.standards[i]]
    )
  }
  for (let i = 0; i < membership.tiers.length; i++) {
    const tier = membership.tiers[i]
    await client.query(
      `INSERT INTO membership_tiers (dataset, id, name, price_label, blurb, recommended, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [DATASET, tier.id, tier.name, tier.priceLabel, tier.blurb, !!tier.recommended, i]
    )
    for (let p = 0; p < tier.perks.length; p++) {
      await client.query(
        'INSERT INTO membership_perks (dataset, tier_id, sort_order, body) VALUES ($1,$2,$3,$4)',
        [DATASET, tier.id, p, tier.perks[p]]
      )
    }
  }
}

function writeMiniProgram(catalog) {
  const banner = '/* 由 scripts/seed-remote.js 从数据库导出。演示图片在对象存储，不要手改。 */\n'
  fs.writeFileSync(
    path.join(root, 'miniprogram/data/catalog.js'),
    banner + 'module.exports = ' + JSON.stringify(catalog, null, 2) + '\n'
  )
}

async function main() {
  const env = loadEnv()
  console.log('上传演示图片…')
  await uploadImages(env)
  const catalog = buildCatalog(publicBase(env))
  const client = new Client(pgConfig(env))
  await client.connect()
  try {
    const schema = fs.readFileSync(path.join(root, 'server/schema.sql'), 'utf8')
    await client.query(schema)
    await client.query('BEGIN')
    await insert(client, catalog, env)
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    await client.end()
  }
  writeMiniProgram(catalog)
  console.log('演示数据已写入数据库，并导出小程序 catalog.js')
  console.log('器物 ' + catalog.products.length + '，帖子 ' + catalog.posts.length + '，消息 ' + catalog.messages.length)
}

main().catch((error) => {
  console.error('导入失败: ' + error.message)
  process.exit(1)
})
