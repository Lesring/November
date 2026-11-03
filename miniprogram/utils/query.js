const catalog = require('../data/catalog.js')

function formatPrice(n) {
  return '¥' + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function findById(list, id) {
  for (var i = 0; i < list.length; i++) {
    if (list[i].id === id) return list[i]
  }
  return null
}

function certMeta(product) {
  var items = catalog.certifications.filter(function (cert) {
    return product.certifications.indexOf(cert.id) >= 0
  })
  var float = null
  items.forEach(function (cert) {
    if (!float && cert.id === 'handmade') float = cert
  })
  if (!float && items.length) float = items[0]
  var rest = items.filter(function (cert) {
    return cert !== float
  })
  return { items: items, float: float, rest: rest }
}

function productText(product) {
  var creator = findById(catalog.creators, product.creatorId)
  var category = findById(catalog.categories, product.categoryId)
  return [
    product.title,
    product.summary,
    product.description,
    creator ? creator.name : '',
    creator ? creator.city : '',
    creator ? creator.craft : '',
    category ? category.name : ''
  ].join(' ')
}

function filterProducts(options) {
  var opts = options || {}
  var q = (opts.q || '').trim()
  var categoryId = opts.categoryId || 'all'
  var certs = opts.certs || []
  var sort = opts.sort || 'featured'
  var list = []
  catalog.products.forEach(function (product, index) {
    if (categoryId !== 'all' && product.categoryId !== categoryId) return
    if (certs.length) {
      var hit = false
      certs.forEach(function (id) {
        if (product.certifications.indexOf(id) >= 0) hit = true
      })
      if (!hit) return
    }
    if (q && productText(product).indexOf(q) < 0) return
    list.push({ product: product, index: index })
  })
  if (sort === 'priceAsc') {
    list.sort(function (a, b) { return a.product.price - b.product.price })
  } else if (sort === 'priceDesc') {
    list.sort(function (a, b) { return b.product.price - a.product.price })
  } else {
    list.sort(function (a, b) { return a.index - b.index })
  }
  return list.map(function (item) { return item.product })
}

function decorateProducts(products) {
  var wishlist = getApp().globalData.wishlist || []
  return products.map(function (product) {
    var creator = findById(catalog.creators, product.creatorId)
    var meta = certMeta(product)
    return {
      id: product.id,
      title: product.title,
      image: product.images[0],
      priceText: formatPrice(product.price),
      meta: creator ? creator.city + ' · ' + creator.name : '',
      floatLabel: meta.float ? meta.float.label : '',
      certLine: meta.rest.map(function (cert) { return cert.label }).join(' · '),
      wished: wishlist.indexOf(product.id) >= 0
    }
  })
}

module.exports = {
  catalog: catalog,
  formatPrice: formatPrice,
  findById: findById,
  certMeta: certMeta,
  filterProducts: filterProducts,
  decorateProducts: decorateProducts
}
