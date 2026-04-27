import { useState } from 'react'
import { SUBJECTS, SUB, todayStr, fmt2, diffDays, hmToMins, minsToHM } from '../constants'
import { subjectStats, getDueReviews, getQuestionsForMode } from '../store/data'
import { Card, ProgressBar, RateBadge, SectionTitle, C } from '../components/ui'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts'

export default function Home({ data, update, setTab }) {
  const today  = todayStr()
  const due    = getDueReviews(data)
  const stats  = SUBJECTS.map(s => subjectStats(data, s))

  const todayMins = data.sessions.filter(s => s.date === today).reduce((a, s) => a + s.minutes, 0)
  const todayAtts = data.attempts.filter(a => a.date === today).length
  const daysLeft  = data.examDate ? Math.max(0, diffDays(today, data.examDate)) : null

  const weakQs = getQuestionsForMode(data, 'weak')
  const todayMission = {
    reviews:  due.length,
    practice: Math.min(weakQs.length, Math.max(0, (data.plan?.dailyGoal || 20) - due.length)),
    total:    data.plan?.dailyGoal || 20,
    done:     todayAtts,
  }
  const missionPct = Math.min(100, todayMission.done / todayMission.total * 100)

  const days14 = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (13 - i))
    return `${d.getFullYear()}-${fmt2(d.getMonth()+1)}-${fmt2(d.getDate())}`
  })
  const bars   = days14.map(d => data.sessions.filter(s => s.date === d).reduce((a, s) => a + s.minutes, 0))
  const maxBar = Math.max(...bars, 30)

  // 苦手スコア（正答率の逆数で重み付け）
  const weaknessData = SUBJECTS.map(s => {
    const st = stats.find(x => x.subject === s)
    const weakScore = st.correctRate !== null ? Math.max(0, 100 - st.correctRate) : 50
    return {
      subject: SUB[s].short,
      苦手度: weakScore,
      学習量: Math.min(100, Math.round(st.minutes / (200 * 60) * 100)),
    }
  })

  // 学習が少ない科目（苦手なのに時間が少ない）
  const needsAttention = SUBJECTS.filter(s => {
    const st = stats.find(x => x.subject === s)
    const isWeak = st.correctRate !== null && st.correctRate < 60
    const isLow  = st.minutes < (data.sessions.reduce((a, s) => a + s.minutes, 0) / SUBJECTS.length) * 0.5
    return isWeak || isLow
  })

  return (
    <div style={{ padding: '0 16px 8px' }}>
      {/* Header */}
      <div style={{ marginBottom: 20, paddingTop: 4 }}>
        <div style={{ fontSize: 24, fontWeight: 900, color: '#fff', letterSpacing: '-0.5px' }}>
          CPA<span style={{ color: '#38bdf8' }}>.</span>
        </div>
        <div style={{ fontSize: 11, color: C.muted }}>
          {today}
          {daysLeft !== null && (
            <span> · 試験まで<span style={{ color: daysLeft <= 30 ? '#f87171' : '#fbbf24', fontWeight: 700 }}> {daysLeft}日</span></span>
          )}
        </div>
      </div>

      {/* 注意が必要な科目 */}
      {needsAttention.length > 0 && (
        <div style={{ background: '#78350f22', border: '1px solid #f59e0b40', borderRadius: 12, padding: '10px 14px', marginBottom: 14, display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 16 }}>⚠️</span>
          <div style={{ fontSize: 12, color: '#fbbf24' }}>
            <strong>{needsAttention.map(s => SUB[s].short).join('・')}</strong> に注力が必要です
          </div>
        </div>
      )}

      {/* Today's mission */}
      <Card style={{ marginBottom: 14, background: 'linear-gradient(135deg, #0d1117, #111827)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 12, color: C.muted, fontWeight: 700, letterSpacing: 1 }}>TODAY'S MISSION</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginTop: 2 }}>
              {todayMission.done}<span style={{ fontSize: 13, color: C.muted, fontWeight: 400 }}>/{todayMission.total}問</span>
            </div>
          </div>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: `conic-gradient(#38bdf8 ${missionPct * 3.6}deg, rgba(255,255,255,0.06) 0deg)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#38bdf8' }}>
              {Math.round(missionPct)}%
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {due.length > 0 && (
            <div onClick={() => setTab('review')} style={{ flex: 1, padding: '8px 10px', borderRadius: 10, background: '#c084fc18', border: '1px solid #c084fc30', cursor: 'pointer' }}>
              <div style={{ fontSize: 10, color: '#c084fc' }}>復習</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>{due.length}<span style={{ fontSize: 10, color: C.muted }}>件</span></div>
            </div>
          )}
          <div onClick={() => setTab('practice')} style={{ flex: 1, padding: '8px 10px', borderRadius: 10, background: '#38bdf818', border: '1px solid #38bdf830', cursor: 'pointer' }}>
            <div style={{ fontSize: 10, color: '#38bdf8' }}>演習</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>{todayMission.practice}<span style={{ fontSize: 10, color: C.muted }}>問</span></div>
          </div>
          <div style={{ flex: 1, padding: '8px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ fontSize: 10, color: C.muted }}>今日</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>
              {minsToHM(todayMins).h > 0 ? `${minsToHM(todayMins).h}h` : ''}{minsToHM(todayMins).m}m
            </div>
          </div>
        </div>
      </Card>

      {/* 14日チャート */}
      <Card style={{ marginBottom: 14, padding: '14px 14px 10px' }}>
        <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: 1, marginBottom: 10 }}>PAST 14 DAYS</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 52 }}>
          {days14.map((d, i) => (
            <div key={d} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <div style={{ width: '100%', height: Math.max(2, bars[i] / maxBar * 44), background: d === today ? '#38bdf8' : bars[i] > 0 ? '#38bdf830' : 'rgba(255,255,255,0.05)', borderRadius: '2px 2px 0 0', transition: 'height 0.3s' }} />
              {(i % 4 === 0 || d === today) && <div style={{ fontSize: 8, color: d === today ? '#38bdf8' : '#1f2937' }}>{d.slice(8)}</div>}
            </div>
          ))}
        </div>
      </Card>

      {/* 苦手度レーダー */}
      <Card style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: C.muted, fontWeight: 700, marginBottom: 2 }}>苦手度マップ</div>
        <div style={{ fontSize: 10, color: '#374151', marginBottom: 8 }}>大きいほど要注意・重点的に学習を</div>
        <ResponsiveContainer width="100%" height={180}>
          <RadarChart data={weaknessData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
            <PolarGrid stroke="rgba(255,255,255,0.08)" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: '#6b7280', fontSize: 10 }} />
            <Radar name="苦手度" dataKey="苦手度" stroke="#f87171" fill="#f87171" fillOpacity={0.2} strokeWidth={2} />
            <Radar name="学習量" dataKey="学習量" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.1} strokeWidth={1.5} strokeDasharray="4 2" />
          </RadarChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center' }}>
          {[{ color: '#f87171', label: '苦手度（大=要注意）' }, { color: '#38bdf8', label: '学習量' }].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: C.muted }}>
              <div style={{ width: 12, height: 2, background: l.color, borderRadius: 1 }} />
              {l.label}
            </div>
          ))}
        </div>
      </Card>

      {/* 科目カード */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
        {SUBJECTS.map(sub => {
          const st = stats.find(x => x.subject === sub)
          const c  = SUB[sub]
          const hm = minsToHM(st.minutes)
          const isWeak = st.correctRate !== null && st.correctRate < 60
          return (
            <div key={sub} style={{
              background: `linear-gradient(135deg, ${c.dim}, #111827)`,
              border: `1px solid ${isWeak ? '#f8717140' : c.accent + '20'}`,
              borderRadius: 14, padding: '12px 14px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#e2e8f0' }}>{c.short}</div>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  {isWeak && <span style={{ fontSize: 9, color: '#f87171' }}>要注意</span>}
                  <RateBadge rate={st.correctRate} />
                </div>
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: isWeak ? '#f87171' : c.accent, lineHeight: 1, marginBottom: 6 }}>
                {hm.h > 0 ? `${hm.h}h` : ''}<span style={{ fontSize: hm.h > 0 ? 14 : 22 }}>{hm.m}m</span>
              </div>
              <ProgressBar value={st.minutes} max={200 * 60} color={isWeak ? '#f87171' : c.accent} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#374151', marginTop: 4 }}>
                <span>{st.qCount}問</span>
                <span>目標200h</span>
              </div>
              {st.dueCount > 0 && <div style={{ marginTop: 4, fontSize: 10, color: '#c084fc' }}>↻ {st.dueCount}件</div>}
            </div>
          )
        })}
      </div>

      {/* 学習時間記録 */}
      <Card>
        <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, marginBottom: 10 }}>学習時間を記録</div>
        <QuickLog data={data} update={update} />
      </Card>
    </div>
  )
}

function QuickLog({ data, update }) {
  const [sub,  setSub]  = useState('監査論')
  const [hours, setHours] = useState('')
  const [mins,  setMins]  = useState('')
  const today = todayStr()

  const add = () => {
    const total = hmToMins(hours, mins)
    if (!total) return
    update(prev => ({
      ...prev,
      sessions: [...prev.sessions, {
        id: Date.now().toString(36),
        subject: sub, date: today, minutes: total, note: '',
      }],
    }))
    setHours(''); setMins('')
  }

  const iStyle = {
    padding: '9px 10px', borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.05)',
    color: '#e2e8f0', fontSize: 13, outline: 'none',
    textAlign: 'center',
  }

  return (
    <div>
      {/* 科目選択 */}
      <div style={{ display: 'flex', gap: 5, overflowX: 'auto', marginBottom: 10, scrollbarWidth: 'none' }}>
        {SUBJECTS.map(s => {
          const c = SUB[s]; const active = sub === s
          return (
            <button key={s} onClick={() => setSub(s)} style={{
              flexShrink: 0, padding: '5px 10px', borderRadius: 20, fontSize: 10,
              border: `1px solid ${active ? c.accent : 'rgba(255,255,255,0.07)'}`,
              background: active ? `${c.accent}18` : 'transparent',
              color: active ? c.accent : C.muted,
              fontFamily: 'inherit', cursor: 'pointer', fontWeight: active ? 700 : 400,
            }}>{c.short}</button>
          )
        })}
      </div>
      {/* 時間入力 */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', flex: 1 }}>
          <input type="number" value={hours} onChange={e => setHours(e.target.value)}
            placeholder="0" min="0" max="23"
            style={{ ...iStyle, width: 56 }} />
          <span style={{ color: C.muted, fontSize: 13 }}>時間</span>
          <input type="number" value={mins} onChange={e => setMins(e.target.value)}
            placeholder="0" min="0" max="59"
            style={{ ...iStyle, width: 56 }} />
          <span style={{ color: C.muted, fontSize: 13 }}>分</span>
        </div>
        <button onClick={add} style={{
          padding: '9px 16px', borderRadius: 10,
          border: '1px solid #38bdf840', background: '#38bdf818',
          color: '#38bdf8', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, cursor: 'pointer',
        }}>記録</button>
      </div>
    </div>
  )
}
