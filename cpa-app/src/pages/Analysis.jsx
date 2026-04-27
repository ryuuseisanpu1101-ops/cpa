import { useState } from 'react'
import { SUBJECTS, SUB, todayStr, fmt2, minsToHM } from '../constants'
import { subjectStats, topicStats, getAttempts, deleteSession, updateSession } from '../store/data'
import { Card, RateBadge, ProgressBar, SectionTitle, FilterPill, C } from '../components/ui'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from 'recharts'

export default function Analysis({ data, update }) {
  const [tab, setTab] = useState('overview')

  return (
    <div style={{ padding: '0 16px' }}>
      <SectionTitle>分析</SectionTitle>
      <div style={{ display: 'flex', gap: 5, overflowX: 'auto', scrollbarWidth: 'none', marginBottom: 14 }}>
        {[
          { key: 'overview', label: '概要' },
          { key: 'topics',   label: '論点' },
          { key: 'exams',    label: '答練・模試' },
          { key: 'sessions', label: '学習記録' },
          { key: 'mistakes', label: 'ミスパターン' },
        ].map(t => (
          <FilterPill key={t.key} label={t.label} active={tab === t.key} onClick={() => setTab(t.key)} />
        ))}
      </div>
      {tab === 'overview'  && <Overview  data={data} />}
      {tab === 'topics'    && <Topics    data={data} />}
      {tab === 'exams'     && <Exams     data={data} update={update} />}
      {tab === 'sessions'  && <Sessions  data={data} update={update} />}
      {tab === 'mistakes'  && <Mistakes  data={data} />}
    </div>
  )
}

function Overview({ data }) {
  const stats = SUBJECTS.map(s => subjectStats(data, s))
  const total = {
    qCount:   stats.reduce((a, s) => a + s.qCount, 0),
    attCount: stats.reduce((a, s) => a + s.attCount, 0),
    minutes:  stats.reduce((a, s) => a + s.minutes, 0),
  }

  const monthMap = {}
  data.sessions.forEach(s => {
    const m = s.date.slice(0, 7)
    monthMap[m] = (monthMap[m] || 0) + s.minutes
  })
  const months = Object.keys(monthMap).sort().slice(-6)
  const monthData = months.map(m => ({
    month: m.slice(5) + '月',
    時間: Math.round(monthMap[m] / 60 * 10) / 10,
  }))

  const totalHM = minsToHM(total.minutes)

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 14 }}>
        {[
          { label: '総問題数', val: `${total.qCount}問` },
          { label: '総解答数', val: `${total.attCount}回` },
          { label: '累計時間', val: `${totalHM.h}h${totalHM.m}m` },
        ].map(({ label, val }) => (
          <Card key={label} style={{ textAlign: 'center', padding: '12px 8px' }}>
            <div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#fff' }}>{val}</div>
          </Card>
        ))}
      </div>

      {monthData.length > 0 && (
        <Card style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, marginBottom: 12 }}>月別学習時間（時間）</div>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={monthData}>
              <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip contentStyle={{ background: '#1f2937', border: 'none', borderRadius: 8, fontSize: 11 }} />
              <Bar dataKey="時間" fill="#38bdf8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {stats.map(st => {
        const c  = SUB[st.subject]
        const hm = minsToHM(st.minutes)
        const isWeak = st.correctRate !== null && st.correctRate < 60
        return (
          <Card key={st.subject} style={{
            background: `linear-gradient(135deg, ${c.dim}, #111827)`,
            border: `1px solid ${isWeak ? '#f8717130' : c.accent + '20'}`,
            marginBottom: 8,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>{st.subject}</div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {isWeak && <span style={{ fontSize: 10, color: '#f87171', fontWeight: 700 }}>要注意</span>}
                <RateBadge rate={st.correctRate} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 900, color: isWeak ? '#f87171' : c.accent }}>
                  {hm.h}h<span style={{ fontSize: 11 }}>{hm.m}m</span>
                </div>
                <div style={{ fontSize: 9, color: C.muted }}>学習時間</div>
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#e2e8f0' }}>{st.qCount}</div>
                <div style={{ fontSize: 9, color: C.muted }}>問題数</div>
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#e2e8f0' }}>{st.attCount}</div>
                <div style={{ fontSize: 9, color: C.muted }}>解答数</div>
              </div>
              {st.dueCount > 0 && (
                <div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: '#c084fc' }}>{st.dueCount}</div>
                  <div style={{ fontSize: 9, color: C.muted }}>復習待ち</div>
                </div>
              )}
            </div>
            <ProgressBar value={st.minutes} max={200*60} color={isWeak ? '#f87171' : c.accent} />
            <div style={{ fontSize: 9, color: '#374151', marginTop: 4 }}>目標200h まで {Math.max(0, 200 - Math.floor(st.minutes/60))}h</div>
          </Card>
        )
      })}
    </div>
  )
}

function Topics({ data }) {
  const [sub, setSub] = useState(SUBJECTS[0])
  const stats = topicStats(data, sub).sort((a, b) => (a.correctRate ?? 0) - (b.correctRate ?? 0))

  return (
    <div>
      <div style={{ display: 'flex', gap: 5, overflowX: 'auto', scrollbarWidth: 'none', marginBottom: 12 }}>
        {SUBJECTS.map(s => (
          <FilterPill key={s} label={SUB[s].short} active={sub === s} color={SUB[s].accent} onClick={() => setSub(s)} />
        ))}
      </div>
      {stats.length === 0
        ? <div style={{ color: C.muted, fontSize: 12, textAlign: 'center', padding: 32 }}>データがありません</div>
        : stats.map(st => (
          <div key={st.topicName} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 14px', background: C.card,
            border: `1px solid ${C.border}`, borderRadius: 12, marginBottom: 6,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0', marginBottom: 4 }}>{st.topicName}</div>
              <ProgressBar value={st.correctRate ?? 0} max={100} color={
                (st.correctRate ?? 0) >= 80 ? '#4ade80' : (st.correctRate ?? 0) >= 60 ? '#fbbf24' : '#f87171'
              } />
              <div style={{ display: 'flex', gap: 10, marginTop: 3, fontSize: 9, color: C.muted }}>
                <span>{st.qCount}問</span>
                <span>{st.attCount}回解答</span>
                <span>復習Lv.{st.reviewStage}</span>
                {st.wrongCount > 0 && <span style={{ color: '#f87171' }}>✕{st.wrongCount}回</span>}
              </div>
            </div>
            <RateBadge rate={st.correctRate} />
          </div>
        ))
      }
    </div>
  )
}

function Exams({ data, update }) {
  const exams = [...(data.exams || [])].sort((a, b) => a.date.localeCompare(b.date))
  const chartData = exams.map(e => ({ name: e.name.slice(0, 4), 自分: e.score, 平均: e.avg }))

  const diffProblems = (data.examQuestions || [])
    .filter(eq => eq.myResult === 'wrong' && eq.groupCorrectRate >= 60)
    .sort((a, b) => b.groupCorrectRate - a.groupCorrectRate)

  const delExam = (id) => {
    if (!confirm('削除しますか？')) return
    update(prev => ({
      ...prev,
      exams: (prev.exams || []).filter(e => e.id !== id),
      examQuestions: (prev.examQuestions || []).filter(eq => eq.examId !== id),
    }))
  }

  return (
    <div>
      {exams.length > 1 && (
        <Card style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, marginBottom: 12 }}>成績推移</div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chartData}>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 9 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#1f2937', border: 'none', borderRadius: 8, fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Line type="monotone" dataKey="自分" stroke="#38bdf8" strokeWidth={2} dot={{ fill: '#38bdf8', r: 3 }} />
              <Line type="monotone" dataKey="平均" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {exams.length === 0 && (
        <div style={{ color: C.muted, fontSize: 12, textAlign: 'center', padding: '32px 0', marginBottom: 14 }}>
          答練・模試データがありません<br />
          <span style={{ fontSize: 10 }}>AIタブから成績表を読み込めます</span>
        </div>
      )}

      {exams.map(e => (
        <Card key={e.id} style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>{e.name}</div>
              <div style={{ fontSize: 10, color: C.muted }}>{e.date} · {e.type === 'mock' ? '模試' : '答練'}</div>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#38bdf8' }}>{e.score}<span style={{ fontSize: 11, color: C.muted }}>点</span></div>
                {e.avg && <div style={{ fontSize: 10, color: C.muted }}>平均 {e.avg}点</div>}
              </div>
              <button onClick={() => delExam(e.id)} style={{ background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 16, padding: 4 }}>🗑</button>
            </div>
          </div>
          {e.rank && <div style={{ fontSize: 10, color: '#fbbf24', marginTop: 4 }}>順位 {e.rank} / {e.totalRank}</div>}
        </Card>
      ))}

      {diffProblems.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 10 }}>🎯 差別化問題</div>
          {diffProblems.slice(0, 10).map((eq, i) => (
            <Card key={i} style={{ marginBottom: 6, padding: '10px 14px' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: '#ef444420', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>{i+1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>{eq.topicName} 問{eq.number}</div>
                  <div style={{ fontSize: 10, color: C.muted }}>{eq.subject}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: '#4ade80', fontWeight: 700 }}>全体 {eq.groupCorrectRate}%</div>
                  <div style={{ fontSize: 11, color: '#f87171' }}>自分 ✕</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function Sessions({ data, update }) {
  const [editId, setEditId] = useState(null)
  const [editH,  setEditH]  = useState('')
  const [editM,  setEditM]  = useState('')

  const sessions = [...data.sessions].sort((a, b) => b.date.localeCompare(a.date))

  const startEdit = (s) => {
    const hm = minsToHM(s.minutes)
    setEditId(s.id); setEditH(String(hm.h)); setEditM(String(hm.m))
  }

  const saveEdit = (id) => {
    const total = (parseInt(editH)||0)*60 + (parseInt(editM)||0)
    if (!total) return
    update(prev => ({ ...prev, sessions: prev.sessions.map(s => s.id === id ? { ...s, minutes: total } : s) }))
    setEditId(null)
  }

  const del = (id) => {
    if (!confirm('削除しますか？')) return
    update(prev => ({ ...prev, sessions: prev.sessions.filter(s => s.id !== id) }))
  }

  const iStyle = { padding: '5px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', fontSize: 12, outline: 'none', width: 48, textAlign: 'center' }

  if (sessions.length === 0) return <div style={{ color: C.muted, fontSize: 12, textAlign: 'center', padding: 32 }}>記録がありません</div>

  return (
    <div>
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 10 }}>{sessions.length}件の記録</div>
      {sessions.map(s => {
        const c  = SUB[s.subject]
        const hm = minsToHM(s.minutes)
        const isEdit = editId === s.id
        return (
          <div key={s.id} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 14px', background: C.card,
            border: `1px solid ${C.border}`, borderRadius: 12, marginBottom: 6,
          }}>
            <div style={{ width: 3, height: 32, borderRadius: 2, background: c?.accent || '#38bdf8', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>{s.subject}</div>
              <div style={{ fontSize: 10, color: C.muted }}>{s.date}</div>
            </div>
            {isEdit ? (
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <input value={editH} onChange={e => setEditH(e.target.value)} type="number" style={iStyle} />
                <span style={{ fontSize: 11, color: C.muted }}>h</span>
                <input value={editM} onChange={e => setEditM(e.target.value)} type="number" style={iStyle} />
                <span style={{ fontSize: 11, color: C.muted }}>m</span>
                <button onClick={() => saveEdit(s.id)} style={{ padding: '4px 8px', borderRadius: 6, border: 'none', background: '#38bdf8', color: '#000', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>保存</button>
                <button onClick={() => setEditId(null)} style={{ padding: '4px 8px', borderRadius: 6, border: 'none', background: 'rgba(255,255,255,0.08)', color: C.muted, fontSize: 11, cursor: 'pointer' }}>×</button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: c?.accent || '#38bdf8' }}>
                  {hm.h > 0 ? `${hm.h}h` : ''}{hm.m}m
                </div>
                <button onClick={() => startEdit(s)} style={{ background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 13, padding: 2 }}>✎</button>
                <button onClick={() => del(s.id)} style={{ background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 13, padding: 2 }}>🗑</button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function Mistakes({ data }) {
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis,  setAnalysis]  = useState(null)

  const topWrong = (() => {
    const map = {}
    data.attempts.filter(a => a.result === 'wrong').forEach(a => {
      const q = data.questions.find(q => q.id === a.questionId)
      if (!q) return
      const key = `${q.subject}__${q.topicName}`
      map[key] = (map[key] || 0) + 1
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8)
  })()

  const analyzeWithAI = async () => {
    setAnalyzing(true)
    try {
      const wrongData = topWrong.map(([key, n]) => {
        const [sub, topic] = key.split('__')
        return { subject: sub, topic, wrongCount: n }
      })
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 800,
          system: `公認会計士試験の学習データを分析するアシスタントです。ミスパターンを3点に整理して具体的な対策を。モバイルで読みやすく1項目2行以内で。`,
          messages: [{ role: 'user', content: `ミスデータ:\n${wrongData.map(d => `${d.subject} ${d.topic}: ${d.wrongCount}回`).join('\n')}\n\nミスパターンと対策を教えてください。` }],
        }),
      })
      const d = await res.json()
      setAnalysis(d.content?.map(b => b.text || '').join('') || '')
    } catch (e) {
      setAnalysis('分析中にエラーが発生しました')
    } finally { setAnalyzing(false) }
  }

  return (
    <div>
      <Card style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, marginBottom: 10 }}>よく間違える論点 TOP</div>
        {topWrong.length === 0
          ? <div style={{ color: C.muted, fontSize: 12 }}>まだデータがありません</div>
          : topWrong.map(([key, n], i) => {
            const [sub, topic] = key.split('__')
            const c = SUB[sub]
            return (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: i < 3 ? '#ef444420' : 'rgba(255,255,255,0.06)', color: i < 3 ? '#f87171' : C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800 }}>{i+1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}>{topic}</div>
                  <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 20, background: `${c?.accent || '#38bdf8'}18`, color: c?.accent || '#38bdf8', fontWeight: 700 }}>{sub}</span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#f87171' }}>✕{n}回</div>
              </div>
            )
          })
        }
      </Card>

      <button onClick={analyzeWithAI} disabled={analyzing || topWrong.length === 0} style={{
        width: '100%', padding: '13px', borderRadius: 12, border: 'none',
        background: analyzing ? '#1f2937' : 'linear-gradient(135deg, #1d4ed8, #38bdf8)',
        color: analyzing ? C.muted : '#fff',
        fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
        cursor: analyzing || topWrong.length === 0 ? 'not-allowed' : 'pointer',
        marginBottom: 14,
      }}>
        {analyzing ? '⏳ AI分析中…' : '✦ AIでミスパターンを分析'}
      </button>

      {analysis && (
        <Card>
          <div style={{ fontSize: 11, color: '#38bdf8', fontWeight: 700, marginBottom: 10 }}>✦ AI分析結果</div>
          <div style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{analysis}</div>
        </Card>
      )}
    </div>
  )
}
