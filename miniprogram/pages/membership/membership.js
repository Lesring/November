const { catalog } = require('../../utils/query')

Page({
  data: {
    membership: catalog.membership
  },
  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 })
    }
  },
  onJoin() {
    wx.showToast({ title: '即将开放', icon: 'none' })
  }
})
