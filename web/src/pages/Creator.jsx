import { Link, useParams } from 'react-router-dom'
import ProductCard from '../components/ProductCard'
import { catalog } from '../lib/catalog'

export default function Creator() {
  const { id } = useParams()
  const creator = catalog.creators.find((item) => item.id === id)

  if (!creator) {
    return (
      <div className="empty">
        <h1>没有找到这位创作者</h1>
        <Link to="/" className="btn primary">
          回到首页
        </Link>
      </div>
    )
  }

  const works = catalog.products.filter((product) => product.creatorId === creator.id)

  return (
    <article className="creator">
      <div className="cover">
        <img src={creator.cover} alt="" />
      </div>
      <div className="creator-head">
        <img className="avatar" src={creator.avatar} alt="" />
        <div>
          <h1>{creator.name}</h1>
          <p className="muted">
            {creator.city} · {creator.craft} · {creator.years} 年
          </p>
        </div>
      </div>
      <p className="headline">{creator.headline}</p>
      {creator.story.map((paragraph) => (
        <p key={paragraph} className="story">
          {paragraph}
        </p>
      ))}

      <section className="section">
        <h2>制作过程</h2>
        <div className="process">
          {creator.process.map((step) => (
            <figure key={step.caption}>
              <img src={step.image} alt="" />
              <figcaption>{step.caption}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>在售作品</h2>
          <span className="muted">{works.length} 件</span>
        </div>
        <div className="product-grid">
          {works.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </article>
  )
}
