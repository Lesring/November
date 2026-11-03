const { catalog, filterProducts, decorateProducts } = require('../../utils/query')

function selectTab(page, index) {
  if (typeof page.getTabBar === 'function' && page.getTabBar()) {
    page.getTabBar().setData({ selected: index })
  }
}

Page({
  data: {
    brand: catalog.brand,
    categories: catalog.categories,
    collections: catalog.collections,
    creators: catalog.creators,
    categoryId: 'all',
    keyword: '',
    products: []
  },
  onShow() {
    this.paint()
    selectTab(this, 0)
  },
  paint() {
    var list = filterProducts({ categoryId: this.data.categoryId })
    this.setData({ products: decorateProducts(list) })
  },
  onChip(event) {
    this.setData({ categoryId: event.currentTarget.dataset.id }, () => this.paint())
  },
  onKeyword(event) {
    this.setData({ keyword: event.detail.value })
  },
  onSearch(event) {
    var q = this.data.keyword || ''
    if (event && event.detail && typeof event.detail.value === 'string') q = event.detail.value
    getApp().globalData.exploreQuery = {
      q: String(q).trim(),
      categoryId: 'all',
      certs: [],
      sort: 'featured'
    }
    wx.switchTab({ url: '/pages/explore/explore' })
  },
  onCollection(event) {
    getApp().globalData.exploreQuery = {
      q: '',
      categoryId: event.currentTarget.dataset.cat,
      certs: [],
      sort: 'featured'
    }
    wx.switchTab({ url: '/pages/explore/explore' })
  },
  onMore() {
    getApp().globalData.exploreQuery = {
      q: '',
      categoryId: this.data.categoryId,
      certs: [],
      sort: 'featured'
    }
    wx.switchTab({ url: '/pages/explore/explore' })
  },
  onOpen(event) {
    wx.navigateTo({ url: '/pages/product/product?id=' + event.detail.id })
  },
  onHeart(event) {
    var added = getApp().toggleWish(event.detail.id)
    wx.showToast({ title: added ? '已收藏' : '已取消', icon: 'none' })
    this.paint()
  },
  onCreator(event) {
    wx.navigateTo({ url: '/pages/creator/creator?id=' + event.currentTarget.dataset.id })
  }
})
