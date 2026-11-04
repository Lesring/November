import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PaperclipIcon, SendIcon, ImageIcon, FileIcon } from '../components/Icons'
import { chat } from '../lib/chat'
import { useStore } from '../store'

function formatBytes(size) {
  if (!size) return ''
  if (size < 1024) return size + ' B'
  if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB'
  return (size / (1024 * 1024)).toFixed(1) + ' MB'
}

function MessageBubble({ message, onPreview }) {
  const mine = message.from === 'me'
  const attachment = message.attachment
  const url = chat.mediaUrl(attachment)

  return (
    <div className={'bubble-row ' + (mine ? 'me' : 'them')}>
      <div
        className={
          'bubble ' +
          (mine ? 'me ' : '') +
          (message.kind === 'image' ? 'media ' : '') +
          (message.status === 'failed' ? 'failed ' : '') +
          (message.status === 'sending' ? 'sending ' : '')
        }
      >
        {message.kind === 'image' && url ? (
          <button type="button" className="bubble-image" onClick={() => onPreview(url)}>
            <img src={url} alt={attachment?.fileName || '图片'} />
          </button>
        ) : null}

        {message.kind === 'file' && attachment ? (
          <a className="bubble-file" href={url} target="_blank" rel="noreferrer">
            <FileIcon />
            <span>
              <strong>{attachment.fileName}</strong>
              <em>{formatBytes(attachment.byteSize)}</em>
            </span>
          </a>
        ) : null}

        {message.kind === 'text' ? <p>{message.text || message.body}</p> : null}

        <time>{message.time || (message.status === 'sending' ? '发送中' : '')}</time>
      </div>
    </div>
  )
}

export default function Thread() {
  const { id } = useParams()
  const { notify, setUnread } = useStore()
  const [thread, setThread] = useState(null)
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [typing, setTyping] = useState(false)
  const [missing, setMissing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const scroller = useRef(null)
  const fileRef = useRef(null)
  const imageRef = useRef(null)

  function scrollToBottom() {
    requestAnimationFrame(() => {
      const node = scroller.current
      if (node) node.scrollTop = node.scrollHeight
    })
  }

  useEffect(() => {
    let alive = true
    async function load() {
      try {
        await chat.ensureSession()
        const conversation = await chat.getConversation(id)
        if (!alive) return
        if (!conversation) {
          setMissing(true)
          return
        }
        setThread(conversation)
        setMessages(conversation.messages || [])
        await chat.markRead(id)
        setUnread(chat.getUnread())
        scrollToBottom()
      } catch (error) {
        if (alive) {
          setMissing(true)
          notify(error.message || '打不开会话')
        }
      }
    }
    load()
    const unsubscribe = chat.subscribe((event) => {
      if (event.type === 'typing' && event.conversationId === id) {
        setTyping(Boolean(event.active))
        if (event.active) scrollToBottom()
      }
      if (event.type === 'message' && event.conversationId === id && event.message) {
        setMessages((current) => {
          if (current.some((item) => item.id === event.message.id)) return current
          if (
            event.message.clientMsgId &&
            current.some((item) => item.clientMsgId === event.message.clientMsgId)
          ) {
            return current.map((item) =>
              item.clientMsgId === event.message.clientMsgId ? event.message : item
            )
          }
          return [...current, event.message]
        })
        if (event.message.from === 'them') {
          chat.markRead(id).then(() => setUnread(chat.getUnread()))
        }
        scrollToBottom()
      }
      if (event.type === 'unread') setUnread(event.unread || 0)
    })
    return () => {
      alive = false
      unsubscribe()
    }
  }, [id, notify, setUnread])

  async function sendText(event) {
    event.preventDefault()
    const text = draft.trim()
    if (!text || busy) return
    const pendingId = chat.clientMsgId()
    const optimistic = {
      id: 'local_' + pendingId,
      clientMsgId: pendingId,
      from: 'me',
      kind: 'text',
      text,
      body: text,
      time: '发送中',
      status: 'sending'
    }
    setDraft('')
    setMessages((current) => [...current, optimistic])
    scrollToBottom()
    setBusy(true)
    try {
      const saved = await chat.sendText(id, text, pendingId)
      setMessages((current) =>
        current.map((item) => (item.clientMsgId === pendingId ? saved : item))
      )
      setUnread(chat.getUnread())
    } catch (error) {
      setDraft(text)
      setMessages((current) => current.filter((item) => item.clientMsgId !== pendingId))
      notify(error.message || '发送失败')
    } finally {
      setBusy(false)
    }
  }

  async function sendFile(file) {
    if (!file || busy) return
    setMenuOpen(false)
    const kind = file.type.startsWith('image/') ? 'image' : 'file'
    const localUrl = kind === 'image' ? URL.createObjectURL(file) : ''
    const optimistic = {
      id: 'local_' + Date.now(),
      from: 'me',
      kind,
      text: file.name,
      body: file.name,
      time: '上传中',
      status: 'sending',
      attachment:
        kind === 'image'
          ? { fileName: file.name, byteSize: file.size, url: localUrl }
          : { fileName: file.name, byteSize: file.size, url: '' }
    }
    setMessages((current) => [...current, optimistic])
    scrollToBottom()
    setBusy(true)
    try {
      const saved = await chat.uploadAndSend(id, file)
      setMessages((current) =>
        current.map((item) => (item.id === optimistic.id ? saved : item))
      )
      setUnread(chat.getUnread())
    } catch (error) {
      setMessages((current) =>
        current.map((item) =>
          item.id === optimistic.id ? { ...item, status: 'failed', time: '失败' } : item
        )
      )
      notify(error.message || '上传失败')
    } finally {
      if (localUrl) URL.revokeObjectURL(localUrl)
      setBusy(false)
    }
  }

  if (missing) {
    return (
      <div className="empty">
        <h1>没有这封消息</h1>
        <Link to="/messages" className="btn primary">
          回到消息
        </Link>
      </div>
    )
  }

  if (!thread) {
    return (
      <div className="messages thread-view">
        <p className="muted">正在打开会话…</p>
      </div>
    )
  }

  return (
    <div className="messages thread-view">
      <div className="chat-who sticky-who">
        {thread.avatar ? (
          <img src={thread.avatar} alt="" />
        ) : (
          <span className="avatar-fallback small">{thread.name.slice(0, 1)}</span>
        )}
        <div>
          <h1>{thread.name}</h1>
          <p className="muted">{typing ? '对方正在输入…' : '内容加密传输通道 · 仅本会话成员可见'}</p>
        </div>
      </div>

      <div className="chat-scroll" ref={scroller}>
        <div className="chat">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} onPreview={setPreview} />
          ))}
          {typing ? (
            <div className="bubble-row them">
              <div className="bubble typing">
                <span />
                <span />
                <span />
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <form className="chat-composer" onSubmit={sendText}>
        <div className="composer-tools">
          <button
            type="button"
            className="icon-btn ghost"
            aria-label="添加附件"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <PaperclipIcon />
          </button>
          {menuOpen ? (
            <div className="attach-menu" role="menu">
              <button type="button" onClick={() => imageRef.current?.click()}>
                <ImageIcon /> 图片
              </button>
              <button type="button" onClick={() => fileRef.current?.click()}>
                <FileIcon /> 文件
              </button>
            </div>
          ) : null}
        </div>
        <input
          ref={imageRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (file) sendFile(file)
          }}
        />
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.txt,.doc,.docx,.xls,.xlsx,.zip,application/pdf,text/plain"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (file) sendFile(file)
          }}
        />
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="输入消息"
          aria-label="输入消息"
          maxLength={2000}
          disabled={busy}
        />
        <button type="submit" className="btn primary icon-btn" aria-label="发送" disabled={busy}>
          <SendIcon />
        </button>
      </form>

      {preview ? (
        <button type="button" className="image-lightbox" onClick={() => setPreview('')} aria-label="关闭预览">
          <img src={preview} alt="" />
        </button>
      ) : null}
    </div>
  )
}
