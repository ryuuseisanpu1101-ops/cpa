import { SUB, ANSWER } from '../constants'

export const C = {
  bg:      '#070a10',
  surface: '#0d1117',
  card:    '#111827',
  border:  'rgba(255,255,255,0.06)',
  text:    '#e2e8f0',
  muted:   '#4b5563',
  dim:     '#1f2937',
}

// ── Card ──────────────────────────────────────────────────────────────────
export function Card({ children, style, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: C.card,
      border: `1px solid ${C.border}`,
      borderRadius: 16,
      padding: 16,
      ...style,
    }}>{children}</div>
  )
}

// ── SubjectBadge ──────────────────────────────────────────────────────────
export function SubjectBadge({ subject, size = 'sm' }) {
  const c = SUB[subject]
  const pad = size === 'sm' ? '2px 7px' : '4px 12px'
  const fs  = size === 'sm' ? 10 : 12
  return (
    <span style={{
      padding: pad, borderRadius: 20, fontSize: fs, fontWeight: 700,
      background: `${c.accent}20`, color: c.accent,
      whiteSpace: 'nowrap',
    }}>{size === 'xs' ? c.short : subject}</span>
  )
}

// ── ResultBadge ───────────────────────────────────────────────────────────
export function ResultBadge({ result }) {
  if (!result) return <span style={{ fontSize: 11, color: C.muted }}>未</span>
  const r = ANSWER[result]
  return <span style={{ fontSize: 14, color: r.color, fontWeight: 800 }}>{r.label}</span>
}

// ── AnswerButtons ─────────────────────────────────────────────────────────
export function AnswerButtons({ onAnswer, disabled }) {
  const btns = [
    { result: 'wrong',   label: '✕',  color: '#f87171', border: '#ef444440' },
    { result: 'partial', label: '△',  color: '#fbbf24', border: '#f59e0b40' },
    { result: 'correct', label: '○',  color: '#4ade80', border: '#22c55e40' },
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
      {btns.map(b => (
        <button key={b.result} onClick={() => !disabled && onAnswer(b.result)} style={{
          padding: '16px 0', borderRadius: 14,
          border: `2px solid ${b.border}`,
          background: `${b.color}12`,
          color: b.color,
          fontSize: 24, fontWeight: 900,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.4 : 1,
          transition: 'all 0.15s',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
        }}>
          {b.label}
          <span style={{ fontSize: 10, fontWeight: 600 }}>
            {b.result === 'correct' ? '正解' : b.result === 'partial' ? '△' : '不正解'}
          </span>
        </button>
      ))}
    </div>
  )
}

// ── ProgressBar ───────────────────────────────────────────────────────────
export function ProgressBar({ value, max, color = '#38bdf8', height = 4, style }) {
  const pct = max ? Math.min(100, value / max * 100) : 0
  return (
    <div style={{ height, background: 'rgba(255,255,255,0.06)', borderRadius: height, overflow: 'hidden', ...style }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: height, transition: 'width 0.5s' }} />
    </div>
  )
}

// ── RateBadge ─────────────────────────────────────────────────────────────
export function RateBadge({ rate }) {
  if (rate === null || rate === undefined) return null
  const color = rate >= 80 ? '#4ade80' : rate >= 60 ? '#fbbf24' : '#f87171'
  return (
    <span style={{
      fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 20,
      background: `${color}18`, color,
    }}>{rate}%</span>
  )
}

// ── SectionTitle ──────────────────────────────────────────────────────────
export function SectionTitle({ children, sub }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: '-0.3px' }}>{children}</div>
      {sub && <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

// ── FilterPill ────────────────────────────────────────────────────────────
export function FilterPill({ label, active, color = '#38bdf8', onClick }) {
  return (
    <button onClick={onClick} style={{
      flexShrink: 0, padding: '5px 12px', borderRadius: 20, fontSize: 11,
      border: `1px solid ${active ? color : 'rgba(255,255,255,0.08)'}`,
      background: active ? `${color}18` : 'rgba(255,255,255,0.04)',
      color: active ? color : C.muted,
      fontFamily: 'inherit', cursor: 'pointer', fontWeight: active ? 700 : 400,
      whiteSpace: 'nowrap', transition: 'all 0.15s',
    }}>{label}</button>
  )
}

// ── Input ─────────────────────────────────────────────────────────────────
export function Input({ value, onChange, placeholder, type = 'text', style }) {
  return (
    <input type={type} value={value} onChange={onChange} placeholder={placeholder} style={{
      width: '100%', padding: '10px 13px', borderRadius: 10,
      border: '1px solid rgba(255,255,255,0.1)',
      background: 'rgba(255,255,255,0.05)',
      color: '#e2e8f0', fontSize: 13, outline: 'none',
      boxSizing: 'border-box',
      ...style,
    }} />
  )
}

// ── Btn ───────────────────────────────────────────────────────────────────
export function Btn({ children, onClick, color = '#38bdf8', disabled, full, sm, style }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: full ? '100%' : undefined,
      padding: sm ? '7px 14px' : '11px 20px',
      borderRadius: sm ? 8 : 12,
      border: `1px solid ${color}40`,
      background: disabled ? 'rgba(255,255,255,0.04)' : `${color}18`,
      color: disabled ? C.muted : color,
      fontFamily: 'inherit', fontSize: sm ? 12 : 13, fontWeight: 700,
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'all 0.15s', whiteSpace: 'nowrap',
      ...style,
    }}>{children}</button>
  )
}

// ── Textarea ──────────────────────────────────────────────────────────────
export function Textarea({ value, onChange, placeholder, rows = 3 }) {
  return (
    <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows} style={{
      width: '100%', padding: '10px 13px', borderRadius: 10,
      border: '1px solid rgba(255,255,255,0.1)',
      background: 'rgba(255,255,255,0.05)',
      color: '#e2e8f0', fontSize: 13, outline: 'none',
      resize: 'none', lineHeight: 1.6, boxSizing: 'border-box',
    }} />
  )
}

// ── EmptyState ────────────────────────────────────────────────────────────
export function EmptyState({ icon = '📭', text, sub }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 20px', color: C.muted }}>
      <div style={{ fontSize: 36, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#6b7280' }}>{text}</div>
      {sub && <div style={{ fontSize: 12, marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

// ── SubjectSelector ───────────────────────────────────────────────────────
import { SUBJECTS } from '../constants'
export function SubjectSelector({ value, onChange }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
      {SUBJECTS.map(s => {
        const c = SUB[s]
        const active = value === s
        return (
          <button key={s} onClick={() => onChange(s)} style={{
            padding: '8px 6px', borderRadius: 10, fontSize: 11, fontWeight: active ? 700 : 400,
            border: `1.5px solid ${active ? c.accent : 'rgba(255,255,255,0.07)'}`,
            background: active ? `${c.accent}18` : 'rgba(255,255,255,0.03)',
            color: active ? '#fff' : C.muted,
            fontFamily: 'inherit', cursor: 'pointer', transition: 'all 0.15s',
          }}>{s}</button>
        )
      })}
    </div>
  )
}
