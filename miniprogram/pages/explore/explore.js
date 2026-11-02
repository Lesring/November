const { catalog, filterProducts, decorateProducts } = require('../../utils/query')

Page({
  data: {
    categories: catalog.categories,
    certifications: catalog.certifications,
    sorts: [
      { id: 'featured', label: '推荐' },
      { id: 'priceAsc', label: '价格从低到高' },
      { id: 'priceDesc', label: '价格从高到低' }
    ],
    q: '',
    categoryId: 'all',
    certs: [],
    sort: 'featured',
    products: []
  },
  onShow() {
    var query = getApp().globalData.exploreQuery
    if (query) {
      getApp().globalData.exploreQuery = null
      this.setData({
        q: query.q || '',
        categoryId: query.categoryId || 'all',
        certs: query.certs || [],
        sort: query.sort || 'featured'
      }, () => this.paint())
    } else {
      this.paint()
    }
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 })
    }
  },
  paint() {
    var list = filterProducts({
      q: this.data.q,
      categoryId: this.data.categoryId,
      certs: this.data.certs,
      sort: this.data.sort
    })
    var selected = this.data.certs
    var certifications = catalog.certifications.map(function (cert) {
      return {
        id: cert.id,
        label: cert.label,
        on: selected.indexOf(cert.id) >= 0
      }
    })
    this.setData({ products: decorateProducts(list), certifications: certifications })
  },
  onInput(event) {
    this.setData({ q: event.detail.value }, () => this.paint())
  },
  onChip(event) {
    this.setData({ categoryId: event.currentTarget.dataset.id }, () => this.paint())
  },
  onCert(event) {
    var id = event.currentTarget.dataset.id
    var certs = this.data.certs.slice()
    var index = certs.indexOf(id)
    if (index >= 0) certs.splice(index, 1)
    else certs.push(id)
    this.setData({ certs: certs }, () => this.paint())
  },
  onSort(event) {
    this.setData({ sort: event.currentTarget.dataset.id }, () => this.paint())
  },
  onClear() {
    this.setData({ q: '', categoryId: 'all', certs: [], sort: 'featured' }, () => this.paint())
  },
  onOpen(event) {
    wx.navigateTo({ url: '/pages/product/product?id=' + event.detail.id })
  },
  onHeart(event) {
    var added = getApp().toggleWish(event.detail.id)
    wx.showToast({ title: added ? '已收藏' : '已取消', icon: 'none' })
    this.paint()
  }
})
