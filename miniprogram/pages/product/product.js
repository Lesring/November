const { catalog, findById, certMeta, formatPrice } = require('../../utils/query')

Page({
  data: {
    missing: false,
    product: null,
    creator: null,
    certs: [],
    priceText: '',
    wished: false,
    consultOpen: false,
    note: '',
    rights: catalog.rights
  },
  onLoad(query) {
    var product = findById(catalog.products, query.id)
    if (!product) {
      this.setData({ missing: true })
      return
    }
    var creator = findById(catalog.creators, product.creatorId)
    var meta = certMeta(product)
    var certs = meta.items.map(function (cert) {
      return {
        id: cert.id,
        label: cert.label,
        summary: cert.summary,
        detail: product.verification[cert.id] || cert.summary
      }
    })
    wx.setNavigationBarTitle({ title: product.title })
    this.setData({
      product: product,
      creator: creator,
      certs: certs,
      priceText: formatPrice(product.price)
    })
  },
  onShow() {
    if (!this.data.product) return
    var wished = (getApp().globalData.wishlist || []).indexOf(this.data.product.id) >= 0
    this.setData({ wished: wished })
  },
  onHeart() {
    var added = getApp().toggleWish(this.data.product.id)
    this.setData({ wished: added })
    wx.showToast({ title: added ? '已收藏' : '已取消', icon: 'none' })
  },
  onCart() {
    getApp().addToCart(this.data.product)
    wx.showToast({ title: '已放入购物袋', icon: 'none' })
  },
  openConsult() {
    this.setData({ consultOpen: true })
  },
  closeConsult() {
    this.setData({ consultOpen: false })
  },
  onNote(event) {
    this.setData({ note: event.detail.value })
  },
  noop() {},
  sendConsult() {
    if (!(this.data.note || '').trim()) {
      wx.showToast({ title: '请先填写', icon: 'none' })
      return
    }
    this.setData({ consultOpen: false, note: '' })
    wx.showToast({ title: '咨询已记下', icon: 'none' })
  },
  onCreator() {
    wx.navigateTo({ url: '/pages/creator/creator?id=' + this.data.creator.id })
  }
})
