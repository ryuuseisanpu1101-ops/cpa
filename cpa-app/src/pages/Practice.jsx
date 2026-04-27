import { useState, useCallback } from 'react'
import { SUBJECTS, SUB, PRACTICE_MODES, todayStr } from '../constants'
import { getQuestionsForMode, getDueReviews, recordAttempt, getAttempts } from '../store/data'
import { Card, SubjectBadge, ProgressBar, FilterPill, RateBadge, SectionTitle, Btn, EmptyState, C } from '../components/ui'

export default function Practice({ data, update }) {
  const [screen,  setScreen]  = useState('menu')
  const [mode,    setMode]    = useState(null)
  const [filters, setFilters] = useState({ subject: '', importance: '' })
  const [queue,   setQueue]   = useState([])
  const [cursor,  setCursor]  = useState(0)
  const [phase,   setPhase]   = useState('question') // question | answer
  const [sessionLog, setSessionLog] = useState([])
  const [memo,    setMemo]    = useState('')

  const startSession = (m) => {
    const qs = getQuestionsForMode(data, m, {
      subject:    filters.subject    || undefined,
      importance: filters.importance || undefined,
    })
    if (qs.length === 0) { alert('該当する問題がありません'); return }
    setMode(m); setQueue(qs); setCursor(0)
    setPhase('question'); setSessionLog([]); setMemo('')
    setScreen('session')
  }

  const handleAnswer = useCallback((userAnswer) => {
    // userAnswer: 'correct' or 'wrong' (ユーザーが○✕を選択)
    const q = queue[cursor]
    // 正解と一致するか
    const isRight = userAnswer === q.answer
    // 記録はユーザーの回答が正解かどうか
    const result = isRight ? 'correct' : 'wrong'
    const newData = recordAttempt(data, q.id, result, memo)
    update(() => newData)
    setSessionLog(prev => [...prev, { questionId: q.id, result, userAnswer, correctAnswer: q.answer }])
    setPhase('answer')
    setMemo('')
  }, [queue, cursor, data, memo, update])

  const next = () => {
    if (cursor + 1 >= queue.length) {
      setScreen('result')
    } else {
      setCursor(c => c + 1)
      setPhase('question')
    }
  }

  if (screen === 'result') {
    return <ResultScreen log={sessionLog} queue={queue}
      onRetry={() => { setCursor(0); setSessionLog([]); setPhase('question'); setScreen('session') }}
      onBack={() => setScreen('menu')} />
  }

  if (screen === 'session' && queue.length > 0) {
    const q    = queue[cursor]
    const atts = getAttempts(data, q.id)
    const last = atts.length ? atts[atts.length - 1] : null
    const c    = SUB[q.subject]
    const pct  = (cursor + 1) / queue.length * 100
    const isCorrect = phase === 'answer' && sessionLog[sessionLog.length - 1]?.result === 'correct'

    return (
      <div style={{ padding: '0 16px' }}>
        {/* ヘッダー */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <button onClick={() => setScreen('menu')} style={{ background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 20, padding: 0 }}>‹</button>
          <div style={{ flex: 1 }}>
            <ProgressBar value={cursor + 1} max={queue.length} color={c.accent} />
            <div style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>{cursor + 1} / {queue.length}問</div>
          </div>
          <div style={{ fontSize: 11, color: C.muted }}>{PRACTICE_MODES.find(m => m.key === mode)?.label}</div>
        </div>

        {/* 問題カード */}
        <Card style={{
          background: `linear-gradient(135deg, ${c.dim}, #111827)`,
          border: `1px solid ${c.accent}25`,
          marginBottom: 12,
        }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
            <SubjectBadge subject={q.subject} />
            <span style={{ fontSize: 10, color: c.accent, fontWeight: 700 }}>{q.topicName}</span>
            {q.importance && (
              <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 20, background: 'rgba(255,255,255,0.08)', color: C.muted }}>重要度{q.importance}</span>
            )}
          </div>

          {/* 問題文 */}
          <div style={{
            fontSize: 14, lineHeight: 1.9, color: '#e2e8f0',
            whiteSpace: 'pre-wrap', marginBottom: 10,
          }}>{q.body || '（問題文なし）'}</div>

          {/* 過去記録 */}
          {atts.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: 10, color: C.muted }}>過去{atts.length}回</div>
              <RateBadge rate={Math.round(atts.filter(a => a.result === 'correct').length / atts.length * 100)} />
              <div style={{ display: 'flex', gap: 3 }}>
                {atts.slice(-8).map((a, i) => (
                  <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: a.result === 'correct' ? '#4ade80' : '#f87171' }} />
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* 回答フェーズ */}
        {phase === 'question' ? (
          <div>
            {/* メモ */}
            <input value={memo} onChange={e => setMemo(e.target.value)}
              placeholder="メモ（任意）"
              style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', fontSize: 12, outline: 'none', marginBottom: 12, boxSizing: 'border-box' }}
            />

            {/* ○✕ボタン */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <button onClick={() => handleAnswer('correct')} style={{
                padding: '24px 0', borderRadius: 16,
                border: '2px solid #22c55e40',
                background: '#4ade8012',
                color: '#4ade80', fontSize: 36, fontWeight: 900,
                cursor: 'pointer', transition: 'all 0.15s',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              }}>
                ○
                <span style={{ fontSize: 12, fontWeight: 600 }}>正しい</span>
              </button>
              <button onClick={() => handleAnswer('wrong')} style={{
                padding: '24px 0', borderRadius: 16,
                border: '2px solid #ef444440',
                background: '#f8717112',
                color: '#f87171', fontSize: 36, fontWeight: 900,
                cursor: 'pointer', transition: 'all 0.15s',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              }}>
                ✕
                <span style={{ fontSize: 12, fontWeight: 600 }}>誤り</span>
              </button>
            </div>

            <button onClick={next} style={{ width: '100%', marginTop: 10, padding: '9px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)', background: 'transparent', color: C.muted, fontFamily: 'inherit', fontSize: 12, cursor: 'pointer' }}>
              スキップ →
            </button>
          </div>
        ) : (
          /* 解答フェーズ */
          <div>
            {/* 正誤表示 */}
            <div style={{
              padding: '16px',
              borderRadius: 14,
              background: isCorrect ? '#14532d22' : '#7f1d1d22',
              border: `1px solid ${isCorrect ? '#22c55e40' : '#ef444440'}`,
              marginBottom: 12,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 32, fontWeight: 900, color: isCorrect ? '#4ade80' : '#f87171', marginBottom: 4 }}>
                {isCorrect ? '正解！' : '不正解'}
              </div>
              <div style={{ fontSize: 13, color: C.muted }}>
                正解は <span style={{ fontWeight: 800, color: q.answer === 'correct' ? '#4ade80' : '#f87171', fontSize: 16 }}>
                  {q.answer === 'correct' ? '○（正しい）' : '✕（誤り）'}
                </span>
              </div>
            </div>

            {/* 解説 */}
            {q.explanation && (
              <Card style={{ marginBottom: 12, background: 'rgba(255,255,255,0.03)' }}>
                <div style={{ fontSize: 11, color: '#38bdf8', fontWeight: 700, marginBottom: 8 }}>解説</div>
                <div style={{ fontSize: 13, lineHeight: 1.8, color: '#e2e8f0', whiteSpace: 'pre-wrap' }}>{q.explanation}</div>
              </Card>
            )}

            {/* 次へ */}
            <button onClick={next} style={{
              width: '100%', padding: '14px', borderRadius: 12, border: 'none',
              background: 'linear-gradient(135deg, #1d4ed8, #38bdf8)',
              color: '#fff', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}>
              {cursor + 1 >= queue.length ? '結果を見る' : '次の問題 →'}
            </button>
          </div>
        )}
      </div>
    )
  }

  // ── モードメニュー ──
  const dueCount = getDueReviews(data).length
  const allCount = data.questions.length

  return (
    <div style={{ padding: '0 16px' }}>
      <SectionTitle sub={`問題数: ${allCount}問`}>演習</SectionTitle>

      {/* フィルター */}
      <Card style={{ marginBottom: 14, padding: '12px 14px' }}>
        <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, marginBottom: 8 }}>フィルター</div>
        <div style={{ display: 'flex', gap: 5, overflowX: 'auto', scrollbarWidth: 'none', marginBottom: 6 }}>
          {['', ...SUBJECTS].map((s, i) => (
            <FilterPill key={i} label={s ? SUB[s].short : '全科目'} active={filters.subject === s}
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

      {/* モード一覧 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {PRACTICE_MODES.map(m => {
          const count = getQuestionsForMode(data, m.key, {
            subject:    filters.subject    || undefined,
            importance: filters.importance || undefined,
          }).length
          const isReview = m.key === 'curve'
          return (
            <div key={m.key} onClick={() => count > 0 && startSession(m.key)} style={{
              background: '#111827', border: `1px solid rgba(255,255,255,0.06)`,
              borderRadius: 14, padding: '14px 16px',
              display: 'flex', alignItems: 'center', gap: 14,
              cursor: count > 0 ? 'pointer' : 'not-allowed',
              opacity: count > 0 ? 1 : 0.4,
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

function ResultScreen({ log, queue, onRetry, onBack }) {
  const correct = log.filter(l => l.result === 'correct').length
  const wrong   = log.filter(l => l.result === 'wrong').length
  const rate    = log.length ? Math.round(correct / log.length * 100) : 0

  return (
    <div style={{ padding: '0 16px' }}>
      <SectionTitle>セッション完了</SectionTitle>
      <Card style={{ marginBottom: 14, textAlign: 'center', padding: '28px 20px' }}>
        <div style={{ fontSize: 52, fontWeight: 900, color: rate >= 80 ? '#4ade80' : rate >= 60 ? '#fbbf24' : '#f87171', lineHeight: 1 }}>{rate}%</div>
        <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>{log.length}問中 {correct}問正解</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 16 }}>
          {[['○', correct, '#4ade80'], ['✕', wrong, '#f87171']].map(([l, n, col]) => (
            <div key={l} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: col }}>{l}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{n}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* 間違えた問題一覧 */}
      {log.filter(l => l.result === 'wrong').length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0', marginBottom: 8 }}>間違えた問題</div>
          {log.filter(l => l.result === 'wrong').map((l, i) => {
            const q = queue.find(q => q.id === l.questionId)
            if (!q) return null
            return (
              <Card key={i} style={{ marginBottom: 6, padding: '10px 14px' }}>
                <div style={{ fontSize: 11, color: SUB[q.subject]?.accent, fontWeight: 700, marginBottom: 4 }}>{q.topicName}</div>
                <div style={{ fontSize: 12, color: '#e2e8f0', lineHeight: 1.7, marginBottom: 6 }}>{q.body?.slice(0, 80)}…</div>
                {q.explanation && (
                  <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.6, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 6 }}>
                    {q.explanation.slice(0, 100)}…
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <Btn onClick={onRetry} full color='#38bdf8'>✕問題だけもう一度</Btn>
        <Btn onClick={onBack}  full color='#6b7280'>一覧へ</Btn>
      </div>
    </div>
  )
}
