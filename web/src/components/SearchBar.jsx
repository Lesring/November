import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SearchIcon } from './Icons'

export default function SearchBar({ initial = '', compact = false, onSubmit }) {
  const [value, setValue] = useState(initial)
  const navigate = useNavigate()

  function submit(event) {
    event.preventDefault()
    const q = value.trim()
    if (onSubmit) {
      onSubmit(q)
      return
    }
    navigate(q ? `/explore?q=${encodeURIComponent(q)}` : '/explore')
  }

  return (
    <form className={compact ? 'search compact' : 'search'} onSubmit={submit} role="search">
      <label className="sr-only" htmlFor={compact ? 'nav-search' : 'home-search'}>
        搜索
      </label>
      <input
        id={compact ? 'nav-search' : 'home-search'}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="搜索器物、材质或创作者"
        enterKeyHint="search"
      />
      <button className="search-orb" type="submit" aria-label="搜索">
        <SearchIcon />
      </button>
    </form>
  )
}
