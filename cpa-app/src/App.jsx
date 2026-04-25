import { useState, useCallback } from 'react'
import { load, save } from './store/data'
import { getDueReviews } from './store/data'
import Home     from './pages/Home'
import Practice from './pages/Practice'
import Library  from './pages/Library'
import Analysis from './pages/Analysis'
import Review   from './pages/Review'
import AI       from './pages/AI'

export default function App() {
  const [data, setData] = useState(load)
  const [tab,  setTab]  = useState('home')

  const update = useCallback(fn => setData(prev => {
    const next = typeof fn === 'function' ? fn(prev) : fn
    save(next)
    return next
  }), [])

  const dueCount = getDueReviews(data).length

  const TABS = [
    { key: 'home',     icon: '⌂',  label: 'ホーム' },
    { key: 'practice', icon: '✎',  label: '演習' },
    { key: 'library',  icon: '⊞',  label: '問題庫' },
    { key: 'review',   icon: '↻',  label: '復習', badge: dueCount },
    { key: 'analysis', icon: '◎',  label: '分析' },
    { key: 'ai',       icon: '✦',  label: 'AI' },
  ]

  return (
    <div style={{
      width: '100%',
      maxWidth: 430,
      minHeight: '100vh',
      margin: '0 auto',
      background: '#070a10',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
    }}>
      {/* iOS safe area top */}
      <div style={{ height: 44, flexShrink: 0 }} />

      {/* Page content */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 82 }}>
        {tab === 'home'     && <Home     data={data} update={update} setTab={setTab} />}
        {tab === 'practice' && <Practice data={data} update={update} />}
        {tab === 'library'  && <Library  data={data} update={update} />}
        {tab === 'review'   && <Review   data={data} update={update} />}
        {tab === 'analysis' && <Analysis data={data} />}
        {tab === 'ai'       && <AI       data={data} update={update} />}
      </div>

      {/* Bottom tab bar */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: 430,
        background: 'rgba(7,10,16,0.95)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        display: 'flex',
        paddingBottom: 'env(safe-area-inset-bottom, 16px)',
        zIndex: 500,
      }}>
        {TABS.map(t => {
          const active = tab === t.key
          const isAI   = t.key === 'ai'
          return (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '10px 2px 4px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              position: 'relative',
            }}>
              {/* Active indicator */}
              {active && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 20,
                  height: 2,
                  borderRadius: '0 0 2px 2px',
                  background: isAI ? '#38bdf8' : '#fff',
                }} />
              )}

              <div style={{
                fontSize: 20,
                lineHeight: 1,
                marginBottom: 3,
                color: active
                  ? (isAI ? '#38bdf8' : '#fff')
                  : 'rgba(255,255,255,0.2)',
                transition: 'color 0.2s',
              }}>{t.icon}</div>

              <div style={{
                fontSize: 9,
                fontWeight: active ? 700 : 400,
                color: active
                  ? (isAI ? '#38bdf8' : 'rgba(255,255,255,0.7)')
                  : 'rgba(255,255,255,0.2)',
                transition: 'color 0.2s',
              }}>{t.label}</div>

              {/* Badge */}
              {t.badge > 0 && (
                <div style={{
                  position: 'absolute',
                  top: 6,
                  right: 'calc(50% - 16px)',
                  background: '#ef4444',
                  color: '#fff',
                  borderRadius: 10,
                  minWidth: 14,
                  height: 14,
                  fontSize: 8,
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 3px',
                }}>{t.badge}</div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
