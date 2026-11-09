import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SearchIcon } from './Icons'

export default function SearchBar({ initial = '', compact = false, onSubmit, onChange }) {
  const [value, setValue] = useState(initial)
  const [open, setOpen] = useState(Boolean(initial))
  const inputRef = useRef(null)
  const formRef = useRef(null)
  const valueRef = useRef(initial)
  const navigate = useNavigate()
  const fieldId = compact ? 'nav-search' : 'home-search'
  valueRef.current = value

  useEffect(() => {
    setValue(initial)
    if (initial) setOpen(true)
  }, [initial])

  function submit(event) {
    event.preventDefault()
    const q = value.trim()
    if (onSubmit) {
      onSubmit(q)
      return
    }
    navigate(q ? `/explore?q=${encodeURIComponent(q)}` : '/explore')
  }

  function onOrbClick(event) {
    event.preventDefault()
    event.stopPropagation()
    if (!open) {
      setOpen(true)
      inputRef.current?.focus()
      return
    }
    event.currentTarget.form?.requestSubmit()
  }

  function collapseIfEmpty() {
    window.setTimeout(() => {
      const form = formRef.current
      if (form && form.contains(document.activeElement)) return
      if (!valueRef.current.trim()) setOpen(false)
    }, 0)
  }

  return (
    <form
      ref={formRef}
      className={(compact ? 'search compact' : 'search') + (open ? ' open' : ' collapsed')}
      onSubmit={submit}
      onBlur={collapseIfEmpty}
      role="search"
    >
      <label className="sr-only" htmlFor={fieldId}>
        搜索
      </label>
      <input
        ref={inputRef}
        id={fieldId}
        value={value}
        onChange={(event) => {
          setValue(event.target.value)
          if (onChange) onChange(event.target.value)
        }}
        placeholder="搜索器物、材质或创作者"
        enterKeyHint="search"
        inputMode="search"
        autoComplete="off"
      />
      <button className="search-orb" type="button" aria-label="搜索" onClick={onOrbClick}>
        <SearchIcon />
      </button>
    </form>
  )
}
