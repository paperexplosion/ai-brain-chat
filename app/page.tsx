'use client'
import { useState, useRef, useEffect } from 'react'

type Model = 'claude' | 'chatgpt' | 'gemini' | 'grok' | 'deepseek'
type Message = { role: 'user' | 'assistant'; content: string; model: Model }

const MODELS: { id: Model; label: string; color: string }[] = [
  { id: 'claude',    label: 'Claude',    color: '#d97706' },
  { id: 'chatgpt',  label: 'ChatGPT',   color: '#10a37f' },
  { id: 'gemini',   label: 'Gemini',    color: '#4285f4' },
  { id: 'grok',     label: 'Grok',      color: '#e11d48' },
  { id: 'deepseek', label: 'DeepSeek',  color: '#7c3aed' },
]

const N8N_WEBHOOK = 'https://suzu-storytelling-team.app.n8n.cloud/webhook/ai-brain-log'

async function autoSave(model: Model, messages: Message[]) {
  const userMessages = messages.filter(m => m.role === 'user')
  if (userMessages.length === 0) return
  const title = userMessages[0].content.slice(0, 40)
  const summary = messages.slice(-6).map(m => `${m.role}: ${m.content.slice(0, 100)}`).join('\n')
  await fetch(N8N_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source: model, title, summary, decisions: [], timestamp: new Date().toISOString() }),
  }).catch(() => {})
}

export default function Home() {
  const [model, setModel] = useState<Model>('claude')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  useEffect(() => {
    if (messages.length > 0 && messages.length % 5 === 0) {
      autoSave(model, messages).then(() => {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      })
    }
  }, [messages, model])

  const send = async () => {
    if (!input.trim() || loading) return
    const userMsg: Message = { role: 'user', content: input, model }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages: newMessages.map(m => ({ role: m.role, content: m.content })) }),
      })
      const data = await res.json()
      const aiMsg: Message = { role: 'assistant', content: data.content ?? data.error ?? 'エラー', model }
      setMessages([...newMessages, aiMsg])
    } catch {
      setMessages([...newMessages, { role: 'assistant', content: 'エラーが発生しました', model }])
    }
    setLoading(false)
  }

  const currentModel = MODELS.find(m => m.id === model)!

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: '#0f0f0f', color: '#f0f0f0', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* ヘッダー */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #222', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 700, fontSize: 16 }}>🧠 AI Brain</span>
        {saved && <span style={{ fontSize: 12, color: '#10a37f', background: '#0d2d20', padding: '2px 10px', borderRadius: 20 }}>✓ 保存済み</span>}
      </div>

      {/* モデル選択 */}
      <div style={{ display: 'flex', gap: 8, padding: '10px 12px', borderBottom: '1px solid #222', overflowX: 'auto' }}>
        {MODELS.map(m => (
          <button key={m.id} onClick={() => setModel(m.id)} style={{
            padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
            background: model === m.id ? m.color : '#1a1a1a',
            color: model === m.id ? '#fff' : '#888',
            transition: 'all 0.15s',
          }}>{m.label}</button>
        ))}
      </div>

      {/* メッセージエリア */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.length === 0 && (
          <div style={{ margin: 'auto', textAlign: 'center', color: '#444' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🧠</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#666' }}>{currentModel.label} と話す</div>
            <div style={{ fontSize: 13, color: '#444', marginTop: 6 }}>5メッセージごとに自動保存されます</div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '80%', padding: '10px 14px', borderRadius: 16, fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap',
              background: msg.role === 'user' ? currentModel.color : '#1e1e1e',
              color: '#f0f0f0',
              borderBottomRightRadius: msg.role === 'user' ? 4 : 16,
              borderBottomLeftRadius: msg.role === 'assistant' ? 4 : 16,
            }}>{msg.content}</div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ background: '#1e1e1e', padding: '10px 14px', borderRadius: 16, borderBottomLeftRadius: 4, color: '#666', fontSize: 14 }}>
              ▌
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* 入力エリア */}
      <div style={{ padding: '12px', borderTop: '1px solid #222', display: 'flex', gap: 8 }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder={`${currentModel.label} に話しかける...`}
          rows={2}
          style={{
            flex: 1, background: '#1a1a1a', border: '1px solid #333', borderRadius: 12, padding: '10px 14px',
            color: '#f0f0f0', fontSize: 14, resize: 'none', outline: 'none', fontFamily: 'inherit',
          }}
        />
        <button onClick={send} disabled={loading || !input.trim()} style={{
          background: currentModel.color, border: 'none', borderRadius: 12, padding: '0 18px',
          color: '#fff', fontWeight: 700, fontSize: 16, cursor: 'pointer', opacity: loading || !input.trim() ? 0.4 : 1,
        }}>↑</button>
      </div>
    </div>
  )
}
