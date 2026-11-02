import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ProductCard from '../components/ProductCard'
import { catalog, filterProducts } from '../lib/catalog'

const SORTS = [
  { id: 'featured', label: '推荐' },
  { id: 'priceAsc', label: '价格从低到高' },
  { id: 'priceDesc', label: '价格从高到低' }
]

export default function Explore() {
  const [searchParams, setSearchParams] = useSearchParams()
  const categoryId = searchParams.get('cat') || 'all'
  const certs = (searchParams.get('cert') || '').split(',').filter(Boolean)
  const sort = searchParams.get('sort') || 'featured'
  const [q, setQ] = useState(searchParams.get('q') || '')

  useEffect(() => {
    setQ(searchParams.get('q') || '')
  }, [searchParams])

  function writeParams(partial) {
    const next = {
      q,
      cat: categoryId,
      cert: certs.join(','),
      sort,
      ...partial
    }
    const params = new URLSearchParams()
    if (next.q) params.set('q', next.q)
    if (next.cat && next.cat !== 'all') params.set('cat', next.cat)
    if (next.cert) params.set('cert', next.cert)
    if (next.sort && next.sort !== 'featured') params.set('sort', next.sort)
    setSearchParams(params, { replace: true })
  }

  const products = useMemo(
    () => filterProducts({ q, categoryId, certs, sort }),
    [q, categoryId, certs, sort]
  )

  function toggleCert(id) {
    const next = certs.includes(id) ? certs.filter((item) => item !== id) : [...certs, id]
    writeParams({ cert: next.join(',') })
  }

  function clearAll() {
    setQ('')
    setSearchParams(new URLSearchParams(), { replace: true })
  }

  return (
    <div className="explore">
      <h1>发现</h1>
      <form
        className="search"
        role="search"
        onSubmit={(event) => {
          event.preventDefault()
          writeParams({ q: q.trim() })
        }}
      >
        <label className="sr-only" htmlFor="explore-search">
          搜索
        </label>
        <input
          id="explore-search"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="搜索器物、材质或创作者"
          enterKeyHint="search"
        />
        <button className="search-orb" type="submit" aria-label="搜索">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <circle cx="11" cy="11" r="6.25" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M16 16.5 20.5 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </form>

      <div className="chips" aria-label="品类">
        <button
          type="button"
          className={categoryId === 'all' ? 'chip on' : 'chip'}
          onClick={() => writeParams({ cat: 'all' })}
        >
          全部
        </button>
        {catalog.categories.map((category) => (
          <button
            key={category.id}
            type="button"
            className={categoryId === category.id ? 'chip on' : 'chip'}
            onClick={() => writeParams({ cat: category.id })}
          >
            {category.name}
          </button>
        ))}
      </div>

      <div className="chips certs" aria-label="认证">
        {catalog.certifications.map((cert) => (
          <button
            key={cert.id}
            type="button"
            className={certs.includes(cert.id) ? 'chip on' : 'chip'}
            onClick={() => toggleCert(cert.id)}
          >
            {cert.label}
          </button>
        ))}
      </div>

      <div className="sort-row" role="radiogroup" aria-label="排序">
        {SORTS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={sort === item.id}
            className={sort === item.id ? 'sort on' : 'sort'}
            onClick={() => writeParams({ sort: item.id })}
          >
            {item.label}
          </button>
        ))}
      </div>

      <p className="result-count">共 {products.length} 件</p>

      {products.length === 0 ? (
        <div className="empty">
          <h2>没有找到相符的器物</h2>
          <p>换个词，或清掉筛选。</p>
          <button type="button" className="btn secondary" onClick={clearAll}>
            清空筛选
          </button>
        </div>
      ) : (
        <div className="product-grid">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  )
}
