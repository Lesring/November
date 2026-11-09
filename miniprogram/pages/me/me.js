const { catalog, formatPrice } = require('../../utils/query')

Page({
  data: {
    rights: catalog.rights,
    cart: [],
    saved: [],
    count: 0
  },
  onShow() {
    var app = getApp()
    var wishlist = app.globalData.wishlist || []
    var cart = (app.globalData.cart || []).map(function (item) {
      return Object.assign({}, item, { priceText: formatPrice(item.price) })
    })
    var saved = catalog.products.filter(function (product) {
      return wishlist.indexOf(product.id) >= 0
    }).map(function (product) {
      return {
        id: product.id,
        title: product.title,
        image: product.images[0],
        priceText: formatPrice(product.price)
      }
    })
    var count = cart.reduce(function (sum, item) { return sum + item.qty }, 0)
    this.setData({ cart: cart, saved: saved, count: count })
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 })
    }
  },
  goMember() {
    wx.showToast({ title: '会员还没有开放', icon: 'none' })
  },
  goProduct(event) {
    wx.navigateTo({ url: '/pages/product/product?id=' + event.currentTarget.dataset.id })
  },
  onRemove(event) {
    getApp().removeFromCart(event.currentTarget.dataset.id)
    this.onShow()
  }
})
