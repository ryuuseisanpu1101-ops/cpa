import { useState } from 'react'
import { SUBJECTS, SUB, todayStr, diffDays } from '../constants'
import { getDueReviews, markReviewDone } from '../store/data'
import { Card, SubjectBadge, SectionTitle, Btn, FilterPill, C } from '../components/ui'

export default function Review({ data, update }) {
  const today = todayStr()
  const due   = getDueReviews(data)
  const [sel, setSel] = useState(null)

  const done = (reviewId) => {
    update(prev => markReviewDone(prev, reviewId))
    setSel(null)
  }

  const upcoming = data.reviews
    .filter(r => r.nextReview && r.nextReview > today && diffDays(today, r.nextReview) <= 7)
    .sort((a, b) => a.nextReview.localeCompare(b.nextReview))

  const INTERVALS = [1, 3, 7, 14, 30, 60, 90]

  return (
    <div style={{ padding: '0 16px' }}>
      <SectionTitle sub="エビングハウス忘却曲線">復習</SectionTitle>

      {/* Interval display */}
      <div style={{ display: 'flex', gap: 4, overflowX: 'auto', scrollbarWidth: 'none', marginBottom: 14 }}>
        {INTERVALS.map((n, i) => (
          <div key={n} style={{
            flexShrink: 0, padding: '3px 8px', borderRadius: 20, fontSize: 9,
            background: i === 0 ? '#c084fc20' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${i === 0 ? '#c084fc50' : 'rgba(255,255,255,0.07)'}`,
            color: i === 0 ? '#c084fc' : C.muted,
          }}>{n}日後</div>
        ))}
      </div>

      {due.length === 0 ? (
        <div style={{ background: '#14532d18', border: '1px solid #22c55e30', borderRadius: 16, padding: '28px 20px', textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 32, marginBottom: 6 }}>🎉</div>
          <div style={{ fontWeight: 700, color: '#4ade80', fontSize: 14 }}>今日の復習は完了！</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>よく頑張りました</div>
        </div>
      ) : (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, marginBottom: 10 }}>今日の復習 ({due.length}件)</div>
          {due.map(r => {
            const c        = SUB[r.subject]
            const doneN    = r.reviews.filter(rv => rv.done).length
            const isSel    = sel === r.id
            const relQs    = data.questions.filter(q => q.subject === r.subject && q.topicName === r.topicName)
            const dueRev   = r.reviews.find(rv => rv.date <= today && !rv.done)
            const overdue  = dueRev && diffDays(dueRev.date, today) > 0

            return (
              <div key={r.id} onClick={() => setSel(isSel ? null : r.id)} style={{
                background: isSel ? `${c.dim}` : 'rgba(255,255,255,0.04)',
                border: `1px solid ${isSel ? c.accent + '55' : 'rgba(255,255,255,0.07)'}`,
                borderRadius: 14, padding: '12px 14px', marginBottom: 8, cursor: 'pointer', transition: 'all 0.2s',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 10,
                    background: `${c.accent}20`, color: c.accent,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 800, flexShrink: 0,
                  }}>{doneN + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>{r.topicName}</div>
                    <div style={{ fontSize: 10, color: C.muted }}>
                      {r.subject} · 第{doneN+1}回 · {relQs.length}問登録
                      {overdue && <span style={{ color: '#f87171', marginLeft: 6 }}>遅延</span>}
                    </div>
                  </div>
                  <div style={{ fontSize: 16, color: c.accent, transition: 'transform 0.2s', transform: isSel ? 'rotate(180deg)' : 'none' }}>∨</div>
                </div>

                {isSel && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    {/* Stage pills */}
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
                      {r.reviews.map((rv, i) => (
                        <div key={i} style={{
                          padding: '2px 7px', borderRadius: 20, fontSize: 9, fontWeight: 700,
                          background: rv.done ? '#16a34a25' : rv.date === dueRev?.date ? '#c084fc25' : 'rgba(255,255,255,0.06)',
                          color: rv.done ? '#4ade80' : rv.date === dueRev?.date ? '#c084fc' : C.muted,
                          border: rv.date === dueRev?.date ? '1px solid #c084fc50' : '1px solid transparent',
                        }}>{rv.date.slice(5)}</div>
                      ))}
                    </div>
                    {/* Related questions */}
                    {relQs.length > 0 && (
                      <div style={{ fontSize: 10, color: C.muted, marginBottom: 10 }}>
                        関連問題: {relQs.slice(0, 5).map(q => `問${q.number}`).join(' / ')}
                        {relQs.length > 5 && ` 他${relQs.length - 5}問`}
                      </div>
                    )}
                    <button onClick={e => { e.stopPropagation(); done(r.id) }} style={{
                      width: '100%', padding: '11px', borderRadius: 10, border: 'none', cursor: 'pointer',
                      fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
                      background: `linear-gradient(135deg, ${c.accent}, ${c.accent}bb)`, color: '#000',
                    }}>✓ 復習完了</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, marginBottom: 8 }}>今後7日間の予定</div>
          {upcoming.map(r => (
            <div key={r.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px', background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, marginBottom: 5,
            }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: SUB[r.subject]?.accent, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#cbd5e1' }}>{r.topicName}</div>
                <div style={{ fontSize: 10, color: C.muted }}>{r.subject}</div>
              </div>
              <div style={{
                fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
                background: diffDays(today, r.nextReview) <= 2 ? '#ef444420' : 'rgba(255,255,255,0.06)',
                color: diffDays(today, r.nextReview) <= 2 ? '#f87171' : C.muted,
              }}>{r.nextReview.slice(5)} ({diffDays(today, r.nextReview)}日後)</div>
            </div>
          ))}
        </div>
      )}

      {data.reviews.length === 0 && (
        <div style={{ color: C.muted, fontSize: 12, textAlign: 'center', padding: '40px 0' }}>
          問題を解くと自動で復習スケジュールが生成されます
        </div>
      )}
    </div>
  )
}
