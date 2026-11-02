import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'

const StoreContext = createContext(null)
const WISH_KEY = 'november-wishlist'
const CART_KEY = 'november-cart'

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch (error) {
    return fallback
  }
}

export function StoreProvider({ children }) {
  const [wishlist, setWishlist] = useState(() => read(WISH_KEY, []))
  const [cart, setCart] = useState(() => read(CART_KEY, []))
  const [toast, setToast] = useState(null)
  const timer = useRef(null)

  useEffect(() => {
    localStorage.setItem(WISH_KEY, JSON.stringify(wishlist))
  }, [wishlist])

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(cart))
  }, [cart])

  const api = useMemo(() => {
    function notify(message) {
      setToast(message)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setToast(null), 2200)
    }

    function toggleWish(product) {
      const has = wishlist.includes(product.id)
      setWishlist((prev) =>
        has ? prev.filter((id) => id !== product.id) : [...prev, product.id]
      )
      notify(has ? '已取消收藏' : '已收藏')
    }

    function addToCart(product) {
      setCart((prev) => {
        const found = prev.find((item) => item.id === product.id)
        if (found) {
          return prev.map((item) =>
            item.id === product.id ? { ...item, qty: item.qty + 1 } : item
          )
        }
        return [
          ...prev,
          {
            id: product.id,
            title: product.title,
            price: product.price,
            image: product.images[0],
            qty: 1
          }
        ]
      })
      notify('已加入购物袋（演示，不会扣款）')
    }

    function removeFromCart(id) {
      setCart((prev) => prev.filter((item) => item.id !== id))
    }

    return { wishlist, cart, toast, notify, toggleWish, addToCart, removeFromCart }
  }, [wishlist, cart, toast])

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>
}

export function useStore() {
  const value = useContext(StoreContext)
  if (!value) throw new Error('useStore 必须在 StoreProvider 内使用')
  return value
}
