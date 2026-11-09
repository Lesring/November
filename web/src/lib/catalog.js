export const catalog = {
  dataset: '',
  brand: {},
  categories: [],
  certifications: [],
  rights: {},
  collections: [],
  creators: [],
  products: [],
  customIds: [],
  program: {},
  posts: [],
  messages: [],
  membership: { tiers: [] }
}

const listeners = new Set()
const CACHE_KEY = 'november-catalog-v1'
let loadError = false
let inflight = null

export function catalogPhase() {
  if (catalog.brand && catalog.brand.promise) {
    return 'ready:' + (catalog.products ? catalog.products.length : 0)
  }
  return loadError ? 'error' : 'pending'
}

export function hydrate(data) {
  Object.keys(data).forEach((key) => {
    catalog[key] = data[key]
  })
  listeners.forEach((listener) => listener())
}

export function subscribeCatalog(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function catalogReady() {
  return Boolean(catalog.brand && catalog.brand.promise)
}

export function isDemoCatalog() {
  if (catalog.dataset === 'demo') return true
  const tagline = catalog.brand && catalog.brand.tagline
  return typeof tagline === 'string' && tagline.includes('演示')
}

export function readCatalogCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    if (!raw) return false
    hydrate(JSON.parse(raw))
    return true
  } catch (_) {
    return false
  }
}

async function fetchCatalogPayload() {
  const response = await fetch('/v1/catalog')
  if (!response.ok) throw new Error('catalog')
  const type = response.headers.get('content-type') || ''
  if (!type.includes('application/json')) throw new Error('catalog')
  return response.json()
}

export function loadCatalog() {
  if (inflight) return inflight
  loadError = false
  inflight = fetchCatalogPayload()
    .catch(async () => {
      // 静态托管没有 API 时，用打包进网页的演示目录
      const module = await import('../data/demo-catalog.json')
      return module.default || module
    })
    .then((data) => {
      hydrate(data)
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(data))
      } catch (_) {
        /* ignore quota */
      }
      return data
    })
    .catch((error) => {
      loadError = true
      listeners.forEach((listener) => listener())
      throw error
    })
    .finally(() => {
      inflight = null
    })
  return inflight
}

export function formatPrice(n) {
  return '¥' + Number(n).toLocaleString('zh-CN')
}

export function findById(list, id) {
  return list.find((item) => item.id === id) || null
}

export function creatorById(id) {
  return findById(catalog.creators, id)
}

export function categoryById(id) {
  return findById(catalog.categories, id)
}

export function certMeta(product) {
  const items = catalog.certifications.filter((cert) =>
    product.certifications.includes(cert.id)
  )
  const float = items.find((cert) => cert.id === 'handmade') || items[0] || null
  const rest = items.filter((cert) => cert !== float)
  return { items, float, rest }
}

export function productText(product) {
  const creator = creatorById(product.creatorId)
  const category = categoryById(product.categoryId)
  return [
    product.title,
    product.summary,
    product.description,
    creator && creator.name,
    creator && creator.city,
    creator && creator.craft,
    category && category.name
  ]
    .filter(Boolean)
    .join(' ')
}

export function filterProducts({ q = '', categoryId = 'all', certs = [], sort = 'featured', customOnly = false } = {}) {
  const query = q.trim()
  const customIds = catalog.customIds || []
  let list = catalog.products
    .map((product, index) => ({ product, index }))
    .filter(({ product }) => {
      if (categoryId && categoryId !== 'all' && product.categoryId !== categoryId) return false
      if (customOnly && !customIds.includes(product.id)) return false
      if (certs.length && !certs.some((id) => product.certifications.includes(id))) return false
      if (query && !productText(product).includes(query)) return false
      return true
    })
  if (sort === 'priceAsc') list.sort((a, b) => a.product.price - b.product.price)
  else if (sort === 'priceDesc') list.sort((a, b) => b.product.price - a.product.price)
  else list.sort((a, b) => a.index - b.index)
  return list.map((item) => item.product)
}
