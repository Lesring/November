import { Link } from 'react-router-dom'
import { catalog, formatPrice } from '../lib/catalog'
import { useStore } from '../store'

export default function Me() {
  const { wishlist, cart, removeFromCart } = useStore()
  const saved = catalog.products.filter((product) => wishlist.includes(product.id))
  const count = cart.reduce((sum, item) => sum + item.qty, 0)

  return (
    <div className="me">
      <div className="profile">
        <div className="avatar-fallback" aria-hidden="true">
          N
        </div>
        <div>
          <h1>访客</h1>
          <p className="muted">演示账号 · 未登录</p>
        </div>
      </div>

      <Link to="/membership" className="member-banner">
        <div>
          <strong>会员尚未加入</strong>
          <p>手作会员 ¥199 / 年 · 新品提前可见</p>
        </div>
        <span>去看看</span>
      </Link>

      <section className="panel">
        <div className="section-head">
          <h2>购物袋</h2>
          <span className="muted">{count} 件</span>
        </div>
        {cart.length === 0 ? (
          <p className="muted">还是空的。在器物页可以加入，这里只做演示，不会结算。</p>
        ) : (
          <ul className="line-list">
            {cart.map((item) => (
              <li key={item.id}>
                <img src={item.image} alt="" />
                <div>
                  <strong>{item.title}</strong>
                  <p>
                    {formatPrice(item.price)} · × {item.qty}
                  </p>
                </div>
                <button type="button" onClick={() => removeFromCart(item.id)}>
                  移除
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel">
        <div className="section-head">
          <h2>收藏</h2>
          <span className="muted">{saved.length} 件</span>
        </div>
        {saved.length === 0 ? (
          <p className="muted">点器物照片上的心形，就会出现在这里。</p>
        ) : (
          <ul className="line-list">
            {saved.map((product) => (
              <li key={product.id}>
                <img src={product.images[0]} alt="" />
                <div>
                  <Link to={`/product/${product.id}`}>
                    <strong>{product.title}</strong>
                  </Link>
                  <p>{formatPrice(product.price)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rights">
        <strong>{catalog.rights.title}</strong>
        <p>{catalog.rights.returnPolicy}</p>
        <p>{catalog.rights.body}</p>
        <p className="protect">{catalog.rights.protection}</p>
      </section>

      <section className="about">
        <h2>关于 November</h2>
        <p>
          November 想成为中国手作的甄选市集。主流平台上，仿货和铺货常常把真手作的价格打下去。我们用材料认证、手作认证和原创登记，把谁做的、用什么做的、造型有没有被登记，写在器物旁边。
        </p>
      </section>
    </div>
  )
}
