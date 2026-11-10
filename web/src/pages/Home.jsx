import { useEffect, useSyncExternalStore } from 'react'
import { Link } from 'react-router-dom'
import ProductCard from '../components/ProductCard'
import SearchBar from '../components/SearchBar'
import { catalog, catalogPhase, isDemoCatalog, loadCatalog, subscribeCatalog } from '../lib/catalog'

export default function Home() {
  const phase = useSyncExternalStore(subscribeCatalog, catalogPhase, catalogPhase)
  useEffect(() => {
    if (phase === 'pending') loadCatalog().catch(() => {})
  }, [phase])
  if (!phase.startsWith('ready')) {
    return (
      <div className="skeleton-page" aria-busy="true">
        <span className="skeleton sk-kicker" />
        <span className="skeleton sk-title" />
        <span className="skeleton sk-lede" />
        <span className="skeleton sk-hero" />
        <span className="sr-only">正在读取目录</span>
      </div>
    )
  }

  const featured = catalog.creators[0]
  const works = catalog.products.slice(0, 6)

  return (
    <div className="home">
      {isDemoCatalog() ? (
        <p className="demo-flag">演示数据。下面的认证文字还没有经过独立核验。</p>
      ) : null}

      <div className="opening">
        <section className="hero">
          <p className="kicker">{catalog.brand.tagline}</p>
          <h1>{catalog.brand.promise}</h1>
          <p className="lede">{catalog.brand.lede}</p>
          <SearchBar />
        </section>
        {featured ? (
          <Link to={`/creator/${featured.id}`} className="feature-photo">
            <img src={featured.cover} alt="" fetchPriority="high" decoding="async" />
          </Link>
        ) : null}
      </div>

      {featured ? (
        <section className="feature-copy">
          <p className="kicker">创作者</p>
          <h2>{featured.name}</h2>
          <p className="muted">
            {featured.city} · {featured.craft} · {featured.years} 年
          </p>
          <p className="feature-headline">{featured.headline}</p>
          <p>{featured.story[0]}</p>
          <Link to={`/creator/${featured.id}`} className="text-link">
            读这位创作者的故事
          </Link>
        </section>
      ) : null}

      <section className="section">
        <div className="section-head">
          <h2>策展</h2>
          <Link to="/explore">全部器物</Link>
        </div>
        <div className="scroller editorial">
          {catalog.collections.map((item, index) => (
            <Link key={item.id} to={`/explore?cat=${item.categoryId}`} className="editorial-card">
              <div className="editorial-photo">
                <img
                  src={item.image}
                  alt=""
                  loading={index === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                />
              </div>
              <p className="kicker">{item.kicker}</p>
              <h3>{item.title}</h3>
              <p className="muted">{item.subtitle}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="cert-band">
        <div>
          <h2>写在器物旁边的三种说明</h2>
          <p className="lede">
            November 现在先把材料、工序和原创登记说清楚。演示编号只说明格式，不是已经完成的审计。
          </p>
        </div>
        <ul>
          {catalog.certifications.map((cert) => (
            <li key={cert.id}>
              <h3>{cert.label}</h3>
              <p>{cert.summary}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>创作者</h2>
        </div>
        <div className="creator-grid">
          {catalog.creators.map((creator) => (
            <Link key={creator.id} to={`/creator/${creator.id}`} className="creator-portrait">
              <img src={creator.cover || creator.avatar} alt="" loading="lazy" decoding="async" />
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
          <h2>正在展出</h2>
          <Link to="/explore">在发现里筛选</Link>
        </div>
        <div className="product-grid">
          {works.map((product, index) => (
            <ProductCard key={product.id} product={product} priority={index < 2} />
          ))}
        </div>
      </section>
    </div>
  )
}
