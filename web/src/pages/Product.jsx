import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { catalog, certMeta, creatorById, formatPrice, isDemoCatalog } from '../lib/catalog'
import { useStore } from '../store'

export default function Product() {
  const { id } = useParams()
  const navigate = useNavigate()
  const product = catalog.products.find((item) => item.id === id)
  const [index, setIndex] = useState(0)
  const [consultOpen, setConsultOpen] = useState(false)
  const [note, setNote] = useState('')
  const [touchX, setTouchX] = useState(null)
  const { wishlist, toggleWish, addToCart, notify } = useStore()

  useEffect(() => {
    setIndex(0)
    setConsultOpen(false)
    setNote('')
  }, [id])

  if (!product) {
    return (
      <div className="empty">
        <h1>没有找到这件器物</h1>
        <Link to="/" className="btn primary">
          回到首页
        </Link>
      </div>
    )
  }

  const creator = creatorById(product.creatorId)
  const { items } = certMeta(product)
  const wished = wishlist.includes(product.id)
  const image = product.images[index] || product.images[0]

  function prev() {
    setIndex((current) => (current - 1 + product.images.length) % product.images.length)
  }
  function next() {
    setIndex((current) => (current + 1) % product.images.length)
  }

  function sendConsult() {
    const text = note.trim()
    if (!text) {
      notify('先写一点你想问的')
      return
    }
    try {
      sessionStorage.setItem(
        'november-consult-draft',
        JSON.stringify({
          productId: product.id,
          title: product.title,
          creator: creator ? creator.name : '创作者',
          note: text
        })
      )
    } catch (_) {
      /* ignore */
    }
    setConsultOpen(false)
    setNote('')
    navigate('/messages')
  }

  return (
    <article className="detail">
      <div className="detail-layout">
        <div>
          <div
            className="gallery"
            onTouchStart={(event) => setTouchX(event.changedTouches[0].clientX)}
            onTouchEnd={(event) => {
              if (touchX == null || product.images.length < 2) return
              const dx = event.changedTouches[0].clientX - touchX
              if (dx > 40) prev()
              if (dx < -40) next()
            }}
          >
            <img key={image} className="gallery-shot" src={image} alt={`${product.title} 图片 ${index + 1}`} decoding="async" />
            {product.images.length > 1 ? (
              <>
                <button type="button" className="gal-btn prev" onClick={prev} aria-label="上一张">
                  ‹
                </button>
                <button type="button" className="gal-btn next" onClick={next} aria-label="下一张">
                  ›
                </button>
              </>
            ) : null}
          </div>
          {product.images.length > 1 ? (
            <div className="thumbs">
              {product.images.map((src, imageIndex) => (
                <button
                  key={src}
                  type="button"
                  className={imageIndex === index ? 'on' : ''}
                  onClick={() => setIndex(imageIndex)}
                  aria-label={`查看第 ${imageIndex + 1} 张`}
                >
                  <img src={src} alt="" />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="detail-side">
          <p className="kicker">{creator ? `${creator.city} · ${creator.craft}` : ''}</p>
          <h1>{product.title}</h1>
          <p className="detail-price">{formatPrice(product.price)}</p>
          <p className="lede">{product.summary}</p>
          <p className="meta-line">
            {product.edition} · {product.leadTime}
          </p>

          <section className="block">
            <h2>认证说明</h2>
            {isDemoCatalog() ? (
              <p className="muted small">这些句子来自演示数据，不是已完成的独立核验。</p>
            ) : null}
            <ul className="cert-list">
              {items.map((cert) => (
                <li key={cert.id}>
                  <span>{cert.label}</span>
                  <div>
                    <p>{product.verification[cert.id]}</p>
                    <p className="muted small">{cert.summary}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="block">
            <h2>关于这件</h2>
            <p>{product.description}</p>
            <dl className="specs">
              {product.specs.map((spec) => (
                <div key={spec.label}>
                  <dt>{spec.label}</dt>
                  <dd>{spec.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          {creator ? (
            <Link to={`/creator/${creator.id}`} className="creator-card">
              <img src={creator.avatar} alt="" />
              <div>
                <strong>{creator.name}</strong>
                <p>
                  {creator.city} · {creator.craft} · {creator.years} 年
                </p>
                <p className="muted">{creator.headline}</p>
              </div>
            </Link>
          ) : null}

          <section className="rights">
            <strong>{catalog.rights.returnPolicy}</strong>
            <p>{catalog.rights.body}</p>
            <p className="protect">{catalog.rights.protection}</p>
            <p className="muted small">{catalog.rights.protectionNote}</p>
          </section>

          <div className="buybar">
            <button type="button" className="btn secondary" onClick={() => setConsultOpen(true)}>
              咨询创作者
            </button>
            <button type="button" className="btn primary" onClick={() => addToCart(product)}>
              加入购物袋
            </button>
            <button
              type="button"
              className={wished ? 'btn text on' : 'btn text'}
              onClick={() => toggleWish(product)}
            >
              {wished ? '已收藏' : '收藏'}
            </button>
          </div>
        </div>
      </div>

      {consultOpen ? (
        <div className="sheet-mask" onClick={() => setConsultOpen(false)}>
          <div
            className="sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="consult-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="consult-title">咨询{creator ? creator.name : '创作者'}</h2>
            <p className="muted">这句话不会送给创作者。它只留在这台设备的消息页，方便对照演示会话。</p>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="想问尺寸、釉色、工期，或定制的可能…"
            />
            <button type="button" className="btn primary" onClick={sendConsult}>
              留在消息页
            </button>
          </div>
        </div>
      ) : null}
    </article>
  )
}
