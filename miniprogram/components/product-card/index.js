Component({
  properties: {
    product: {
      type: Object,
      value: {}
    }
  },
  methods: {
    onOpen() {
      this.triggerEvent('open', { id: this.data.product.id })
    },
    onHeart() {
      this.triggerEvent('heart', { id: this.data.product.id })
    }
  }
})
