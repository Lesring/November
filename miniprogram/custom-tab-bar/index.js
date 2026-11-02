Component({
  data: {
    selected: 0,
    list: [
      { pagePath: '/pages/home/home', text: '首页' },
      { pagePath: '/pages/explore/explore', text: '发现' },
      { pagePath: '/pages/membership/membership', text: '会员' },
      { pagePath: '/pages/me/me', text: '我的' }
    ]
  },
  methods: {
    onTap(event) {
      var index = Number(event.currentTarget.dataset.index)
      var url = this.data.list[index].pagePath
      wx.switchTab({ url: url })
    }
  }
})
