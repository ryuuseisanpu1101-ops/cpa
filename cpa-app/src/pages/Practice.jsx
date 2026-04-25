import { useState, useCallback } from 'react'
import { SUBJECTS, SUB, PRACTICE_MODES, ANSWER, todayStr, uid } from '../constants'
import { getQuestionsForMode, getDueReviews, recordAttempt, getAttempts, lastAttempt } from '../store/data'
import { Card, SubjectBadge, ResultBadge, AnswerButtons, ProgressBar, FilterPill, RateBadge, SectionTitle, Btn, EmptyState, C } from '../components/ui'

export default function Practice({ data, update }) {
  const [screen, setScreen] = useState('menu') // menu | session | result
  const [mode,   setMode]   = useState(null)
  const [filters, setFilters] = useState({ subject: '', importance: '' })
  const [queue,   setQueue]  = useState([])
  const [cursor,  setCursor] = useState(0)
  const [sessionLog, setSessionLog] = useState([]) // [{questionId, result}]
  const [showBody, setShowBody] = useState(false)
  const [memo, setMemo]   = useState('')
  const [rationale, setRationale] = useState('')

  const startSession = (m) => {
    const qs = getQuestionsForMode(data, m, {
      subject:    filters.subject    || undefined,
      importance: filters.importance || undefined,
    })
    if (qs.length === 0) { alert('該当する問題がありません'); return }
    setMode(m)
    setQueue(qs)
    setCursor(0)
    setSessionLog([])
    setShowBody(false)
    setMemo('')
    setRationale('')
    setScreen('session')
  }

  const handleAnswer = useCallback((result) => {
    const q = queue[cursor]
    const newData = recordAttempt(data, q.id, result, memo, rationale)
    update(() => newData)
    setSessionLog(prev => [...prev, { questionId: q.id, result }])
    setMemo('')
    setRationale('')
    setShowBody(false)
    if (cursor + 1 >= queue.length) {
      setScreen('result')
    } else {
      setCursor(c => c + 1)
    }
  }, [queue, cursor, data, memo, rationale, update])

  if (screen === 'result') {
    return <ResultScreen log={sessionLog} queue={queue} onRetry={() => { setCursor(0); setSessionLog([]); setShowBody(false); setScreen('session') }} onBack={() => setScreen('menu')} />
  }

  if (screen === 'session' && queue.length > 0) {
    const q   = queue[cursor]
    const att = getAttempts(data, q.id)
    const last = att.length ? att[att.length - 1] : null
    const c   = SUB[q.subject]
    const pct = (cursor + 1) / queue.length * 100

    return (
      <div style={{ padding: '0 16px' }}>
        {/* Progress */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <button onClick={() => setScreen('menu')} style={{ background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 20, padding: 0 }}>‹</button>
          <div style={{ flex: 1 }}>
            <ProgressBar value={cursor + 1} max={queue.length} color={c.accent} />
            <div style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>{cursor + 1} / {queue.length}問</div>
          </div>
          <div style={{ fontSize: 11, color: C.muted }}>{PRACTICE_MODES.find(m => m.key === mode)?.label}</div>
        </div>

        {/* Question card */}
        <Card style={{ background: `linear-gradient(135deg, ${c.dim}, #111827)`, border: `1px solid ${c.accent}25`, marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
            <SubjectBadge subject={q.subject} />
            <span style={{ fontSize: 10, color: c.accent, fontWeight: 700 }}>{q.topicName}</span>
            {q.importance && (
              <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 20, background: 'rgba(255,255,255,0.08)', color: C.muted }}>重要度{q.importance}</span>
            )}
            {q.chapter && (
              <span style={{ fontSize: 10, color: C.muted }}>{q.chapter}</span>
            )}
          </div>

          <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', marginBottom: 8 }}>
            問{q.number}{q.limbIndex ? `-${q.limbIndex}` : ''}
          </div>

          {/* Body toggle */}
          <button onClick={() => setShowBody(v => !v)} style={{
            width: '100%', padding: '9px', borderRadius: 10,
            border: `1px solid ${c.accent}25`, background: `${c.accent}0a`,
            color: c.accent, fontFamily: 'inherit', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            marginBottom: showBody ? 10 : 0,
          }}>{showBody ? '▲ 問題文を閉じる' : '▼ 問題文を見る'}</button>

          {showBody && q.body && (
            <div style={{
              background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 12,
              fontSize: 13, lineHeight: 1.85, color: '#e2e8f0',
              maxHeight: 240, overflowY: 'auto', whiteSpace: 'pre-wrap',
            }}>{q.body}</div>
          )}
        </Card>

        {/* Past record */}
        {att.length > 0 && (
          <Card style={{ marginBottom: 12, padding: '10px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 10, color: C.muted }}>過去{att.length}回</div>
              <RateBadge rate={Math.round(att.filter(a => a.result === 'correct').length / att.length * 100)} />
              <div style={{ display: 'flex', gap: 3 }}>
                {att.slice(-8).map((a, i) => {
                  const col = a.result === 'correct' ? '#4ade80' : a.result === 'partial' ? '#fbbf24' : '#f87171'
                  return <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: col }} />
                })}
              </div>
              {last?.rationale && (
                <div style={{ fontSize: 10, color: C.muted, flex: 1, textAlign: 'right', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{last.rationale}</div>
              )}
            </div>
          </Card>
        )}

        {/* Memo / Rationale */}
        <div style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <input value={rationale} onChange={e => setRationale(e.target.value)}
            placeholder="正誤の根拠（任意）"
            style={{ padding: '9px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', fontSize: 12, outline: 'none' }}
          />
          <input value={memo} onChange={e => setMemo(e.target.value)}
            placeholder="メモ（任意）"
            style={{ padding: '9px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', fontSize: 12, outline: 'none' }}
          />
        </div>

        {/* Answer buttons */}
        <AnswerButtons onAnswer={handleAnswer} />

        <button onClick={() => { setCursor(c => Math.min(c + 1, queue.length - 1)) }} style={{ width: '100%', marginTop: 10, padding: '9px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)', background: 'transparent', color: C.muted, fontFamily: 'inherit', fontSize: 12, cursor: 'pointer' }}>
          スキップ →
        </button>
      </div>
    )
  }

  // ── Mode menu ──
  const dueCount = getDueReviews(data).length
  const allCount = data.questions.length

  return (
    <div style={{ padding: '0 16px' }}>
      <SectionTitle sub={`問題数: ${allCount}問`}>演習</SectionTitle>

      {/* Filters */}
      <Card style={{ marginBottom: 14, padding: '12px 14px' }}>
        <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, marginBottom: 8 }}>フィルター</div>
        <div style={{ display: 'flex', gap: 5, overflowX: 'auto', scrollbarWidth: 'none', marginBottom: 6 }}>
          {['', ...SUBJECTS].map((s, i) => (
            <FilterPill key={i} label={s || '全科目'} active={filters.subject === s}
              color={s ? SUB[s]?.accent : '#38bdf8'}
              onClick={() => setFilters(f => ({ ...f, subject: s }))} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 5 }}>
          {['', 'A', 'B', 'C'].map(imp => (
            <FilterPill key={imp} label={imp || '全重要度'} active={filters.importance === imp}
              onClick={() => setFilters(f => ({ ...f, importance: imp }))} />
          ))}
        </div>
      </Card>

      {/* Mode cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {PRACTICE_MODES.map(m => {
          const count = getQuestionsForMode(data, m.key, {
            subject:    filters.subject    || undefined,
            importance: filters.importance || undefined,
          }).length
          const isReview = m.key === 'curve'
          return (
            <div key={m.key} onClick={() => startSession(m.key)} style={{
              background: C.card, border: `1px solid ${C.border}`,
              borderRadius: 14, padding: '14px 16px',
              display: 'flex', alignItems: 'center', gap: 14,
              cursor: count > 0 ? 'pointer' : 'not-allowed',
              opacity: count > 0 ? 1 : 0.4,
              transition: 'all 0.15s',
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: isReview ? '#c084fc18' : '#38bdf818',
                color: isReview ? '#c084fc' : '#38bdf8',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, flexShrink: 0,
              }}>{m.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 2 }}>{m.label}</div>
                <div style={{ fontSize: 11, color: C.muted }}>{m.desc}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: isReview && count > 0 ? '#c084fc' : '#e2e8f0' }}>{count}</div>
                <div style={{ fontSize: 9, color: C.muted }}>問</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Result screen ─────────────────────────────────────────────────────────
function ResultScreen({ log, queue, onRetry, onBack }) {
  const correct = log.filter(l => l.result === 'correct').length
  const partial = log.filter(l => l.result === 'partial').length
  const wrong   = log.filter(l => l.result === 'wrong').length
  const rate    = Math.round(correct / log.length * 100)

  return (
    <div style={{ padding: '0 16px' }}>
      <SectionTitle>セッション完了</SectionTitle>
      <Card style={{ marginBottom: 14, textAlign: 'center', padding: '28px 20px' }}>
        <div style={{ fontSize: 52, fontWeight: 900, color: rate >= 80 ? '#4ade80' : rate >= 60 ? '#fbbf24' : '#f87171', lineHeight: 1 }}>{rate}%</div>
        <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>{log.length}問中 {correct}問正解</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 16 }}>
          {[['○', correct, '#4ade80'], ['△', partial, '#fbbf24'], ['✕', wrong, '#f87171']].map(([l, n, col]) => (
            <div key={l} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: col }}>{l}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{n}</div>
            </div>
          ))}
        </div>
      </Card>
      <div style={{ display: 'flex', gap: 10 }}>
        <Btn onClick={onRetry} full color='#38bdf8'>✕問題だけもう一度</Btn>
        <Btn onClick={onBack}  full color='#6b7280'>一覧へ</Btn>
      </div>
    </div>
  )
}
