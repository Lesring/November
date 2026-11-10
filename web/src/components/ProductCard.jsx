import { Link } from 'react-router-dom'
import { certMeta, creatorById, formatPrice } from '../lib/catalog'
import { useStore } from '../store'
import { HeartIcon } from './Icons'

export default function ProductCard({ product, priority = false }) {
  const { wishlist, toggleWish } = useStore()
  const creator = creatorById(product.creatorId)
  const { items } = certMeta(product)
  const wished = wishlist.includes(product.id)

  return (
    <article className="pcard">
      <div className="photo">
        <Link to={`/product/${product.id}`}>
          <img
            src={product.images[0]}
            alt={product.title}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            fetchPriority={priority ? 'high' : 'auto'}
          />
        </Link>
        <button
          type="button"
          className={wished ? 'heart on' : 'heart'}
          aria-pressed={wished}
          aria-label={wished ? '取消收藏' : '收藏'}
          onClick={() => toggleWish(product)}
        >
          <HeartIcon filled={wished} />
        </button>
      </div>
      <Link to={`/product/${product.id}`} className="pcard-meta">
        <h3>{product.title}</h3>
        {creator ? (
          <p className="muted">
            {creator.city} · {creator.name}
          </p>
        ) : null}
        {items.length > 0 ? <p className="cert-line">{items.map((item) => item.label).join(' · ')}</p> : null}
        <p className="price">{formatPrice(product.price)}</p>
      </Link>
    </article>
  )
}
