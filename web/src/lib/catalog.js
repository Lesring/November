import catalog from '../../../shared/catalog.json'

export { catalog }

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

export function filterProducts({ q = '', categoryId = 'all', certs = [], sort = 'featured' } = {}) {
  const query = q.trim()
  let list = catalog.products
    .map((product, index) => ({ product, index }))
    .filter(({ product }) => {
      if (categoryId && categoryId !== 'all' && product.categoryId !== categoryId) return false
      if (certs.length && !certs.some((id) => product.certifications.includes(id))) return false
      if (query && !productText(product).includes(query)) return false
      return true
    })
  if (sort === 'priceAsc') list.sort((a, b) => a.product.price - b.product.price)
  else if (sort === 'priceDesc') list.sort((a, b) => b.product.price - a.product.price)
  else list.sort((a, b) => a.index - b.index)
  return list.map((item) => item.product)
}
