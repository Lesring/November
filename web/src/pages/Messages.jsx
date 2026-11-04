import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { chat } from '../lib/chat'
import { useStore } from '../store'

export default function Messages() {
  const { notify, setUnread } = useStore()
  const [threads, setThreads] = useState([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [online, setOnline] = useState(false)

  useEffect(() => {
    let alive = true
    async function load() {
      try {
        await chat.ensureSession()
        const list = await chat.listConversations()
        if (!alive) return
        setThreads(list)
        setUnread(chat.getUnread())
      } catch (error) {
        if (alive) notify(error.message || '消息服务暂不可用')
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    const unsubscribe = chat.subscribe((event) => {
      if (event.type === 'connection') setOnline(event.status === 'online')
      if (event.type === 'conversation' && event.conversation) {
        setThreads((current) => {
          const next = current.filter((item) => item.id !== event.conversation.id)
          return [event.conversation, ...next]
        })
      }
      if (event.type === 'unread') setUnread(event.unread || 0)
      if (event.type === 'message' && event.message && event.conversationId) {
        setThreads((current) => {
          const found = current.find((item) => item.id === event.conversationId)
          if (!found) return current
          const preview =
            event.message.kind === 'image'
              ? '[图片]'
              : event.message.kind === 'file'
                ? '[文件] ' + (event.message.body || '')
                : event.message.body || event.message.text || ''
          const updated = {
            ...found,
            preview,
            time: '刚刚',
            unread: event.message.from === 'them',
            unreadCount:
              event.message.from === 'them' ? Math.max(1, Number(found.unreadCount || 0) + 1) : 0
          }
          return [updated, ...current.filter((item) => item.id !== event.conversationId)]
        })
      }
    })
    return () => {
      alive = false
      unsubscribe()
    }
  }, [notify, setUnread])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return threads
    return threads.filter(
      (thread) =>
        thread.name.toLowerCase().includes(q) ||
        String(thread.preview || '')
          .toLowerCase()
          .includes(q)
    )
  }, [threads, query])

  return (
    <div className="messages inbox">
      <div className="inbox-head">
        <div>
          <h1>消息</h1>
          <p className="lede">
            和创作者、认证核对的往来。会话按设备隔离，附件走私有通道。
          </p>
        </div>
        <span className={'live-pill ' + (online ? 'on' : '')} aria-live="polite">
          {online ? '实时已连接' : '重连中'}
        </span>
      </div>

      <label className="inbox-search">
        <span className="sr-only">搜索会话</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索创作者或内容"
        />
      </label>

      {loading ? <p className="muted">正在同步会话…</p> : null}

      {!loading && !filtered.length ? (
        <div className="empty-inline">
          <p>没有匹配的会话</p>
        </div>
      ) : null}

      <ul className="threads">
        {filtered.map((thread) => (
          <li key={thread.id}>
            <Link to={`/messages/${thread.id}`} className="thread">
              {thread.avatar ? (
                <img src={thread.avatar} alt="" />
              ) : (
                <span className="avatar-fallback small">{thread.name.slice(0, 1)}</span>
              )}
              <span>
                <strong>{thread.name}</strong>
                <em>{thread.preview}</em>
              </span>
              <span className="thread-side">
                <time>{thread.time}</time>
                {thread.unreadCount > 0 ? (
                  <i className="unread-badge" aria-label={'未读 ' + thread.unreadCount}>
                    {thread.unreadCount > 99 ? '99+' : thread.unreadCount}
                  </i>
                ) : thread.unread ? (
                  <i className="unread-dot" aria-label="未读" />
                ) : null}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
