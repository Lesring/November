const { catalog, findById, decorateProducts } = require('../../utils/query')

Page({
  data: {
    missing: false,
    creator: null,
    works: []
  },
  onLoad(query) {
    var creator = findById(catalog.creators, query.id)
    if (!creator) {
      this.setData({ missing: true })
      return
    }
    wx.setNavigationBarTitle({ title: creator.name })
    var works = catalog.products.filter(function (product) {
      return product.creatorId === creator.id
    })
    this.creatorId = creator.id
    this.setData({ creator: creator, works: decorateProducts(works) })
  },
  onShow() {
    if (!this.creatorId) return
    var works = catalog.products.filter((product) => product.creatorId === this.creatorId)
    this.setData({ works: decorateProducts(works) })
  },
  onOpen(event) {
    wx.navigateTo({ url: '/pages/product/product?id=' + event.detail.id })
  },
  onHeart(event) {
    var added = getApp().toggleWish(event.detail.id)
    wx.showToast({ title: added ? '已收藏' : '已取消', icon: 'none' })
    var works = catalog.products.filter((product) => product.creatorId === this.creatorId)
    this.setData({ works: decorateProducts(works) })
  }
})
