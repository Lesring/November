Component({
  data: {
    selected: 0,
    list: [
      { pagePath: '/pages/home/home', text: '首页', icon: '/icons/home.png', iconOn: '/icons/home-on.png' },
      { pagePath: '/pages/explore/explore', text: '发现', icon: '/icons/compass.png', iconOn: '/icons/compass-on.png' },
      { pagePath: '/pages/messages/messages', text: '消息', icon: '/icons/message.png', iconOn: '/icons/message-on.png' },
      { pagePath: '/pages/me/me', text: '我的', icon: '/icons/user.png', iconOn: '/icons/user-on.png' }
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
