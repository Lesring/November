const { Client } = require('pg')
const { loadEnv, pgConfig } = require('./env')

const DATASET = 'demo'

function group(rows, key) {
  const map = new Map()
  rows.forEach((row) => {
    const id = row[key]
    if (!map.has(id)) map.set(id, [])
    map.get(id).push(row)
  })
  return map
}

function fileUrl(env, file) {
  if (!file) return ''
  return env.S3_ENDPOINT.replace(/\/$/, '') + '/' + file.bucket + '/' + file.object_key
}

async function loadCatalog() {
  const env = loadEnv()
  const client = new Client(pgConfig(env))
  await client.connect()
  try {
    const files = await client.query('SELECT * FROM media_files WHERE dataset = $1', [DATASET])
    const byFile = new Map(files.rows.map((row) => [row.id, row]))
    const url = (id) => fileUrl(env, byFile.get(id))

    const copy = await client.query('SELECT * FROM site_copy WHERE dataset = $1', [DATASET])
    if (!copy.rows.length) throw new Error('数据库里还没有演示数据，请先运行 npm run seed')
    const site = copy.rows[0]

    const categories = await client.query(
      'SELECT id, name FROM categories WHERE dataset = $1 ORDER BY sort_order',
      [DATASET]
    )
    const certifications = await client.query(
      'SELECT id, label, summary FROM certification_types WHERE dataset = $1 ORDER BY sort_order',
      [DATASET]
    )
    const makers = await client.query('SELECT * FROM makers WHERE dataset = $1 ORDER BY id', [DATASET])
    const channels = await client.query('SELECT * FROM maker_channels WHERE dataset = $1', [DATASET])
    const paragraphs = await client.query(
      'SELECT * FROM maker_paragraphs WHERE dataset = $1 ORDER BY sort_order',
      [DATASET]
    )
    const steps = await client.query(
      'SELECT * FROM maker_steps WHERE dataset = $1 ORDER BY sort_order',
      [DATASET]
    )
    const works = await client.query('SELECT * FROM works WHERE dataset = $1 ORDER BY sort_order', [DATASET])
    const workImages = await client.query(
      'SELECT * FROM work_images WHERE dataset = $1 ORDER BY sort_order',
      [DATASET]
    )
    const specs = await client.query(
      'SELECT * FROM work_specs WHERE dataset = $1 ORDER BY sort_order',
      [DATASET]
    )
    const marks = await client.query(
      `SELECT m.* FROM work_marks m
       JOIN certification_types t ON t.dataset = m.dataset AND t.id = m.certification_id
       WHERE m.dataset = $1
       ORDER BY t.sort_order`,
      [DATASET]
    )
    const collections = await client.query(
      'SELECT * FROM collections WHERE dataset = $1 ORDER BY sort_order',
      [DATASET]
    )
    const posts = await client.query('SELECT * FROM posts WHERE dataset = $1 ORDER BY sort_order', [DATASET])
    const postImages = await client.query(
      'SELECT * FROM post_images WHERE dataset = $1 ORDER BY sort_order',
      [DATASET]
    )
    const inquiries = await client.query(
      'SELECT * FROM inquiries WHERE dataset = $1 ORDER BY sort_order',
      [DATASET]
    )
    const lines = await client.query(
      'SELECT * FROM inquiry_lines WHERE dataset = $1 ORDER BY sort_order',
      [DATASET]
    )
    const standards = await client.query(
      'SELECT body FROM program_standards WHERE dataset = $1 ORDER BY sort_order',
      [DATASET]
    )
    const tiers = await client.query(
      'SELECT * FROM membership_tiers WHERE dataset = $1 ORDER BY sort_order',
      [DATASET]
    )
    const perks = await client.query(
      'SELECT * FROM membership_perks WHERE dataset = $1 ORDER BY sort_order',
      [DATASET]
    )

    const channelByMaker = new Map(channels.rows.map((row) => [row.maker_id, row]))
    const storyByMaker = group(paragraphs.rows, 'maker_id')
    const stepsByMaker = group(steps.rows, 'maker_id')
    const imagesByWork = group(workImages.rows, 'work_id')
    const specsByWork = group(specs.rows, 'work_id')
    const marksByWork = group(marks.rows, 'work_id')
    const imagesByPost = group(postImages.rows, 'post_id')
    const linesByInquiry = group(lines.rows, 'inquiry_id')
    const perksByTier = group(perks.rows, 'tier_id')

    const products = works.rows.map((work) => {
      const certRows = marksByWork.get(work.id) || []
      const verification = {}
      certRows.forEach((mark) => {
        verification[mark.certification_id] = mark.detail
      })
      return {
        id: work.id,
        title: work.title,
        price: work.price_yuan,
        categoryId: work.category_id,
        creatorId: work.maker_id,
        images: (imagesByWork.get(work.id) || []).map((row) => url(row.media_id)),
        certifications: certRows.map((mark) => mark.certification_id),
        summary: work.summary,
        description: work.description,
        leadTime: work.lead_time,
        edition: work.edition,
        specs: (specsByWork.get(work.id) || []).map((row) => ({ label: row.label, value: row.value })),
        verification
      }
    })

    return {
      dataset: DATASET,
      brand: {
        name: site.brand_name,
        nameZh: site.brand_name_zh,
        tagline: site.tagline,
        promise: site.promise,
        lede: site.lede
      },
      categories: categories.rows,
      certifications: certifications.rows,
      rights: {
        title: site.rights_title,
        returnPolicy: site.return_policy,
        body: site.rights_body,
        protection: site.protection,
        protectionNote: site.protection_note
      },
      collections: collections.rows.map((item) => ({
        id: item.id,
        kicker: item.kicker,
        title: item.title,
        subtitle: item.subtitle,
        image: url(item.media_id),
        categoryId: item.category_id
      })),
      creators: makers.rows.map((maker) => {
        const channel = channelByMaker.get(maker.id)
        return {
          id: maker.id,
          name: maker.name,
          city: maker.city,
          craft: maker.craft,
          years: maker.years,
          avatar: url(maker.avatar_id),
          cover: url(maker.cover_id),
          headline: maker.headline,
          story: (storyByMaker.get(maker.id) || []).map((row) => row.body),
          process: (stepsByMaker.get(maker.id) || []).map((row) => ({
            image: url(row.media_id),
            caption: row.caption
          })),
          channel: channel ? { name: channel.name, label: channel.label } : null
        }
      }),
      products,
      customIds: works.rows.filter((work) => work.accepts_custom).map((work) => work.id),
      program: {
        kicker: site.program_kicker,
        headline: site.program_headline,
        intro: site.program_intro,
        standards: standards.rows.map((row) => row.body),
        badge: site.badge_name,
        badgeNote: site.badge_note,
        applyLabel: site.apply_label,
        applyNote: site.apply_note
      },
      posts: posts.rows.map((post) => {
        const images = (imagesByPost.get(post.id) || []).map((row) => url(row.media_id))
        return {
          id: post.id,
          type: post.type,
          creatorId: post.maker_id,
          productId: post.work_id,
          title: post.title,
          body: post.body,
          poster: post.poster_id ? url(post.poster_id) : undefined,
          duration: post.duration || undefined,
          images: images.length ? images : undefined,
          likes: post.likes,
          ratio: post.ratio || undefined
        }
      }),
      messages: inquiries.rows.map((item) => ({
        id: item.id,
        name: item.name,
        avatar: item.avatar_id ? url(item.avatar_id) : '',
        preview: item.preview,
        time: item.time_label,
        unread: item.unread,
        lines: (linesByInquiry.get(item.id) || []).map((line) => ({
          from: line.sender,
          text: line.body
        }))
      })),
      membership: {
        headline: site.membership_headline,
        intro: site.membership_intro,
        note: site.membership_note,
        tiers: tiers.rows.map((tier) => ({
          id: tier.id,
          name: tier.name,
          priceLabel: tier.price_label,
          blurb: tier.blurb,
          recommended: tier.recommended,
          perks: (perksByTier.get(tier.id) || []).map((perk) => perk.body)
        }))
      }
    }
  } finally {
    await client.end()
  }
}

module.exports = { loadCatalog, DATASET }
