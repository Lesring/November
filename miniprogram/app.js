function readList(key) {
  try {
    var value = wx.getStorageSync(key)
    return Array.isArray(value) ? value : []
  } catch (error) {
    return []
  }
}

App({
  globalData: {
    wishlist: [],
    cart: [],
    exploreQuery: null
  },
  onLaunch() {
    this.globalData.wishlist = readList('november-wishlist')
    this.globalData.cart = readList('november-cart')
  },
  toggleWish(id) {
    var list = this.globalData.wishlist.slice()
    var index = list.indexOf(id)
    var added = index < 0
    if (added) list.push(id)
    else list.splice(index, 1)
    this.globalData.wishlist = list
    wx.setStorageSync('november-wishlist', list)
    return added
  },
  addToCart(product) {
    var cart = this.globalData.cart.map(function (item) {
      return Object.assign({}, item)
    })
    var found = false
    cart.forEach(function (item) {
      if (item.id === product.id) {
        item.qty += 1
        found = true
      }
    })
    if (!found) {
      cart.push({
        id: product.id,
        title: product.title,
        price: product.price,
        image: product.images[0],
        qty: 1
      })
    }
    this.globalData.cart = cart
    wx.setStorageSync('november-cart', cart)
  },
  removeFromCart(id) {
    this.globalData.cart = this.globalData.cart.filter(function (item) {
      return item.id !== id
    })
    wx.setStorageSync('november-cart', this.globalData.cart)
  }
})
