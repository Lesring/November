import { Link } from 'react-router-dom'
import { certMeta, creatorById, formatPrice } from '../lib/catalog'
import { useStore } from '../store'
import { HeartIcon } from './Icons'

export default function ProductCard({ product }) {
  const { wishlist, toggleWish } = useStore()
  const creator = creatorById(product.creatorId)
  const { float, rest } = certMeta(product)
  const wished = wishlist.includes(product.id)

  return (
    <article className="pcard">
      <div className="photo">
        <Link to={`/product/${product.id}`}>
          <img src={product.images[0]} alt={product.title} />
        </Link>
        {float ? <span className="float-badge">{float.label}</span> : null}
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
        <p className="price">{formatPrice(product.price)}</p>
        {rest.length > 0 ? <p className="cert-line">{rest.map((item) => item.label).join(' · ')}</p> : null}
      </Link>
    </article>
  )
}
