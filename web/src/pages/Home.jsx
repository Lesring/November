import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import ProductCard from '../components/ProductCard'
import SearchBar from '../components/SearchBar'
import { catalog, filterProducts } from '../lib/catalog'

export default function Home() {
  const [categoryId, setCategoryId] = useState('all')
  const products = useMemo(
    () => filterProducts({ categoryId }),
    [categoryId]
  )

  return (
    <div className="home">
      <section className="hero">
        <p className="kicker">{catalog.brand.tagline}</p>
        <h1>{catalog.brand.promise}</h1>
        <p className="lede">{catalog.brand.lede}</p>
        <SearchBar />
      </section>

      <div className="chips" role="tablist" aria-label="品类">
        <button
          type="button"
          className={categoryId === 'all' ? 'chip on' : 'chip'}
          onClick={() => setCategoryId('all')}
        >
          全部
        </button>
        {catalog.categories.map((category) => (
          <button
            key={category.id}
            type="button"
            className={categoryId === category.id ? 'chip on' : 'chip'}
            onClick={() => setCategoryId(category.id)}
          >
            {category.name}
          </button>
        ))}
      </div>

      <section className="section">
        <div className="section-head">
          <h2>策展专题</h2>
          <Link to="/explore">查看全部</Link>
        </div>
        <div className="scroller editorial">
          {catalog.collections.map((item) => (
            <Link key={item.id} to={`/explore?cat=${item.categoryId}`} className="editorial-card">
              <div className="editorial-photo">
                <img src={item.image} alt="" />
              </div>
              <p className="kicker">{item.kicker}</p>
              <h3>{item.title}</h3>
              <p className="muted">{item.subtitle}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>本季创作者</h2>
        </div>
        <div className="scroller creators">
          {catalog.creators.map((creator) => (
            <Link key={creator.id} to={`/creator/${creator.id}`} className="creator-tile">
              <img src={creator.avatar} alt="" />
              <strong>{creator.name}</strong>
              <span>
                {creator.craft} · {creator.city}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>甄选手作</h2>
          <Link to={categoryId === 'all' ? '/explore' : `/explore?cat=${categoryId}`}>在发现中筛选</Link>
        </div>
        <div className="product-grid">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </div>
  )
}
