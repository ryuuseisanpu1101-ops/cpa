import { useState, useRef, useEffect } from 'react'
import { SUBJECTS, SUB, todayStr, uid } from '../constants'
import { subjectStats, getDueReviews } from '../store/data'
import { Card, SectionTitle, Btn, FilterPill, C } from '../components/ui'

export default function AI({ data, update }) {
  const [tab, setTab] = useState('chat')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 88px)' }}>
      <div style={{ padding: '0 16px', flexShrink: 0 }}>
        <SectionTitle>AI機能</SectionTitle>
        <div style={{ display: 'flex', gap: 5, marginBottom: 12 }}>
          {[
            { key: 'chat',   label: '✦ AI講師' },
            { key: 'exam',   label: '📝 答練読み取り' },
            { key: 'plan',   label: '📅 計画立案' },
            { key: 'settings', label: '⚙ 設定' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              flex: 1, padding: '7px 2px', borderRadius: 10, fontFamily: 'inherit', fontSize: 10, cursor: 'pointer',
              fontWeight: tab === t.key ? 700 : 400,
              border: `1px solid ${tab === t.key ? '#38bdf8' : C.border}`,
              background: tab === t.key ? '#38bdf818' : 'rgba(255,255,255,0.03)',
              color: tab === t.key ? '#38bdf8' : C.muted,
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      {tab === 'chat'     && <Chat     data={data} />}
      {tab === 'exam'     && <ExamScan data={data} update={update} />}
      {tab === 'plan'     && <Plan     data={data} update={update} />}
      {tab === 'settings' && <Settings data={data} update={update} />}
    </div>
  )
}

// ── AI Chat ───────────────────────────────────────────────────────────────
function Chat({ data }) {
  const [messages,  setMessages]  = useState([{
    role: 'assistant',
    content: 'こんにちは！公認会計士試験のAI講師です ✦\n\n財務会計論・管理会計論・監査論・企業法について何でも聞いてください。学習データを把握した上でアドバイスします。',
  }])
  const [input,   setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const [subject, setSubject] = useState('')
  const bottomRef = useRef()

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  const buildSystem = () => {
    const today    = todayStr()
    const totalMins = data.sessions.reduce((a, s) => a + s.minutes, 0)
    const stats     = SUBJECTS.map(sub => subjectStats(data, sub))
    const dueN      = getDueReviews(data).length
    const qCount    = data.questions.length

    const wrongTopics = (() => {
      const map = {}
      data.attempts.filter(a => a.result === 'wrong').forEach(a => {
        const q = data.questions.find(q => q.id === a.questionId)
        if (q) { const k = `${q.subject}:${q.topicName}`; map[k] = (map[k]||0)+1 }
      })
      return Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([k])=>k)
    })()

    return `あなたは公認会計士（CPA）試験専門のAI講師です。
ユーザーの学習データを把握した上で、的確・丁寧・簡潔に回答してください。

【学習状況】
累計: ${Math.floor(totalMins/60)}h / 問題数: ${qCount}問 / 復習待ち: ${dueN}件
${stats.map(s => `${s.subject}: ${Math.floor(s.minutes/60)}h, 正答率${s.correctRate ?? '未記録'}%`).join(' / ')}
苦手論点: ${wrongTopics.join(', ') || 'なし'}
短答合格: ${data.shortAnswerPassed ? '済み（論文モード）' : '未（短答モード）'}
${subject ? `\n今回のフォーカス科目: ${subject}` : ''}

【応答ルール】
- モバイル画面に合わせ1段落3〜4行以内
- 仕訳・数式は改行して見やすく
- 曖昧な点は「テキストで確認を」と添える
- ユーザーの苦手論点に関連する質問は重点解説
- 答えは正直に、分からない場合は分からないと言う`
  }

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    const userMsg = { role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: buildSystem(),
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
        }),
      })
      const d     = await res.json()
      const reply = d.content?.map(b => b.text || '').join('') || 'エラーが発生しました'
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '接続エラーが発生しました' }])
    } finally { setLoading(false) }
  }

  const QUICK = ['今日の弱点を教えて', '財務会計の問題を出して', '監査リスクを解説', '企業法の頻出条文は？', '管理会計の差異分析を解説']

  return (
    <>
      {/* Quick subject filter + quick prompts */}
      <div style={{ padding: '0 16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 5, overflowX: 'auto', scrollbarWidth: 'none', marginBottom: 6 }}>
          {['', ...SUBJECTS].map((s, i) => (
            <FilterPill key={i} label={s || '全科目'} active={subject === s}
              color={s ? SUB[s]?.accent : '#38bdf8'} onClick={() => setSubject(s)} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 5, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 8 }}>
          {QUICK.map(q => (
            <button key={q} onClick={() => setInput(q)} style={{
              flexShrink: 0, padding: '5px 10px', borderRadius: 20,
              border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.05)',
              color: C.muted, fontFamily: 'inherit', fontSize: 10, cursor: 'pointer', whiteSpace: 'nowrap',
            }}>{q}</button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 16px', display: 'flex', flexDirection: 'column', gap: 10, scrollbarWidth: 'none' }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: m.role === 'user' ? 'row-reverse' : 'row', gap: 8, alignItems: 'flex-end' }}>
            {m.role === 'assistant' && (
              <div style={{ width: 28, height: 28, borderRadius: 9, background: 'linear-gradient(135deg, #38bdf8, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>✦</div>
            )}
            <div style={{
              maxWidth: '80%', padding: '10px 13px',
              borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              background: m.role === 'user' ? 'linear-gradient(135deg, #1d4ed8, #2563eb)' : '#161d2e',
              border: m.role === 'user' ? 'none' : `1px solid ${C.border}`,
              fontSize: 13, lineHeight: 1.7, color: '#e2e8f0', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}>{m.content}</div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div style={{ width: 28, height: 28, borderRadius: 9, background: 'linear-gradient(135deg, #38bdf8, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>✦</div>
            <div style={{ padding: '10px 14px', borderRadius: '16px 16px 16px 4px', background: '#161d2e', border: `1px solid ${C.border}`, display: 'flex', gap: 4, alignItems: 'center' }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: '#38bdf8', opacity: 0.6, animation: 'pulse 1.2s ease-in-out infinite', animationDelay: `${i*0.2}s` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '6px 16px 10px', borderTop: `1px solid ${C.border}`, flexShrink: 0, display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <textarea value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder="質問を入力…" rows={1}
          style={{ flex: 1, padding: '9px 13px', borderRadius: 20, border: `1px solid rgba(255,255,255,0.1)`, background: '#161d2e', color: '#e2e8f0', fontFamily: 'inherit', fontSize: 13, outline: 'none', resize: 'none', lineHeight: 1.5, maxHeight: 90, overflowY: 'auto' }}
        />
        <button onClick={send} disabled={!input.trim() || loading} style={{
          width: 38, height: 38, borderRadius: 19,
          border: `1px solid rgba(255,255,255,0.1)`,
          background: input.trim() && !loading ? 'linear-gradient(135deg, #1d4ed8, #38bdf8)' : '#161d2e',
          color: '#fff', cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
          fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>↑</button>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:0.3;transform:scale(0.8);}50%{opacity:1;transform:scale(1.1);}}`}</style>
    </>
  )
}

// ── Exam result scanner ───────────────────────────────────────────────────
function ExamScan({ data, update }) {
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState(null)
  const [error,   setError]   = useState('')
  const [examName, setExamName] = useState('')
  const [examDate, setExamDate] = useState(todayStr())
  const [examType, setExamType] = useState('exam')
  const fileRef = useRef()

  const scan = async (file) => {
    setLoading(true); setError(''); setPreview(null)
    try {
      const base64 = await new Promise((res, rej) => {
        const r = new FileReader()
        r.onload = () => res(r.result.split(',')[1])
        r.onerror = () => rej()
        r.readAsDataURL(file)
      })
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          system: `公認会計士試験の答練・模試成績表を読み取るアシスタントです。
以下のJSONのみを返してください。コードブロック不要。

{
  "score": 75,
  "avg": 65,
  "rank": 150,
  "totalRank": 1200,
  "subject": "監査論",
  "questions": [
    {
      "number": "1",
      "subject": "監査論",
      "topicName": "論点名（読み取れれば）",
      "myResult": "correct|wrong|partial",
      "groupCorrectRate": 80,
      "body": "問題文（あれば）"
    }
  ]
}

- 読み取れない項目はnullにする
- myResult: ○→correct、✕→wrong、△→partial
- groupCorrectRateは0〜100の数値
- JSONのみ出力`,
          messages: [{
            role: 'user',
            content: [
              { type: file.type === 'application/pdf' ? 'document' : 'image', source: { type: 'base64', media_type: file.type, data: base64 } },
              { type: 'text', text: '成績表を読み取ってください' },
            ],
          }],
        }),
      })
      const d     = await res.json()
      const text  = d.content?.map(b => b.text || '').join('') || '{}'
      const clean = text.replace(/```json|```/g, '').trim()
      setPreview(JSON.parse(clean))
    } catch (e) {
      setError('読み取りエラー: ' + e.message)
    } finally { setLoading(false) }
  }

  const importExam = () => {
    if (!examName.trim()) { alert('答練名を入力してください'); return }
    const examId = uid()
    const newExam = {
      id: examId, name: examName, date: examDate, type: examType,
      subject: preview.subject, score: preview.score,
      avg: preview.avg, rank: preview.rank, totalRank: preview.totalRank,
    }
    const newEQs = (preview.questions || []).map(q => ({
      id: uid(), examId, ...q,
      questionId: data.questions.find(dq =>
        dq.subject === q.subject && dq.topicName === q.topicName && dq.number === q.number
      )?.id || null,
    }))
    update(prev => ({
      ...prev,
      exams:         [...(prev.exams || []),         newExam],
      examQuestions: [...(prev.examQuestions || []), ...newEQs],
    }))
    setPreview(null); setExamName('')
    alert('インポートしました！')
  }

  const iStyle = { padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', fontFamily: 'inherit', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' }

  return (
    <div style={{ padding: '0 16px', overflowY: 'auto', flex: 1 }}>
      <Card style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: C.muted, marginBottom: 10, lineHeight: 1.7 }}>
          答練・模試の成績表（PDF or スクショ）をアップロードすると、Claudeが自動で読み取ります。
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>答練名</div>
            <input value={examName} onChange={e => setExamName(e.target.value)} placeholder="例: 第3回答練" style={iStyle} />
          </div>
          <div>
            <div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>日付</div>
            <input type="date" value={examDate} onChange={e => setExamDate(e.target.value)} style={iStyle} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {[{ key: 'exam', label: '答練' }, { key: 'mock', label: '模試' }].map(t => (
            <FilterPill key={t.key} label={t.label} active={examType === t.key} onClick={() => setExamType(t.key)} />
          ))}
        </div>

        <input type="file" accept=".pdf,image/*" ref={fileRef} onChange={e => e.target.files[0] && scan(e.target.files[0])} style={{ display: 'none' }} />
        <div onClick={() => fileRef.current.click()} style={{
          border: '2px dashed rgba(255,255,255,0.1)', borderRadius: 12, padding: '24px',
          textAlign: 'center', cursor: 'pointer',
        }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>📄</div>
          <div style={{ fontSize: 12, color: C.muted }}>成績表のPDFまたはスクショを選択</div>
        </div>
        {loading && <div style={{ fontSize: 11, color: C.muted, textAlign: 'center', marginTop: 10 }}>⏳ 読み取り中…</div>}
        {error && <div style={{ color: '#f87171', fontSize: 12, marginTop: 10 }}>{error}</div>}
      </Card>

      {preview && (
        <Card>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#4ade80', marginBottom: 12 }}>✓ 読み取り完了</div>
          <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
            {preview.score !== null && <div><div style={{ fontSize: 28, fontWeight: 900, color: '#38bdf8' }}>{preview.score}<span style={{ fontSize: 11, color: C.muted }}>点</span></div><div style={{ fontSize: 9, color: C.muted }}>得点</div></div>}
            {preview.avg   !== null && <div><div style={{ fontSize: 28, fontWeight: 900, color: '#fbbf24' }}>{preview.avg}<span style={{ fontSize: 11, color: C.muted }}>点</span></div><div style={{ fontSize: 9, color: C.muted }}>平均</div></div>}
            {preview.rank  !== null && <div><div style={{ fontSize: 28, fontWeight: 900, color: '#e2e8f0' }}>{preview.rank}<span style={{ fontSize: 11, color: C.muted }}>位</span></div><div style={{ fontSize: 9, color: C.muted }}>順位</div></div>}
          </div>
          {(preview.questions || []).slice(0, 5).map((q, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, padding: '6px 0', borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>問{q.number}</span>
              <span style={{ fontSize: 11, color: q.myResult === 'correct' ? '#4ade80' : q.myResult === 'partial' ? '#fbbf24' : '#f87171', fontWeight: 700 }}>
                {q.myResult === 'correct' ? '○' : q.myResult === 'partial' ? '△' : '✕'}
              </span>
              {q.groupCorrectRate !== null && <span style={{ fontSize: 10, color: C.muted }}>全体{q.groupCorrectRate}%</span>}
              {q.topicName && <span style={{ fontSize: 10, color: C.muted }}>{q.topicName}</span>}
            </div>
          ))}
          {(preview.questions || []).length > 5 && <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>…他{(preview.questions||[]).length - 5}問</div>}
          <Btn onClick={importExam} full color="#4ade80" style={{ marginTop: 12 }}>インポート</Btn>
        </Card>
      )}
    </div>
  )
}

// ── Plan builder ──────────────────────────────────────────────────────────
function Plan({ data, update }) {
  const [loading, setLoading] = useState(false)
  const [plan,    setPlan]    = useState(null)
  const [situation, setSituation] = useState('')

  const buildPlan = async () => {
    setLoading(true); setPlan(null)
    try {
      const today    = todayStr()
      const daysLeft = data.examDate ? Math.max(0, Math.floor((new Date(data.examDate) - new Date(today)) / 86400000)) : null
      const stats    = SUBJECTS.map(s => subjectStats(data, s))
      const due      = getDueReviews(data).length

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1200,
          system: `公認会計士試験の学習計画を立案するアシスタントです。
以下のJSONのみを返してください。コードブロック不要。

{
  "summary": "一言コメント（2〜3行）",
  "dailyGoal": 25,
  "weeklyGoalMins": 900,
  "prioritySubjects": ["監査論", "企業法"],
  "advice": [
    "具体的なアドバイス1（2行以内）",
    "具体的なアドバイス2",
    "具体的なアドバイス3"
  ],
  "weekPlan": [
    { "day": "月", "focus": "科目名", "tasks": "やること（1行）" },
    { "day": "火", "focus": "科目名", "tasks": "やること" },
    { "day": "水", "focus": "科目名", "tasks": "やること" },
    { "day": "木", "focus": "科目名", "tasks": "やること" },
    { "day": "金", "focus": "科目名", "tasks": "やること" },
    { "day": "土", "focus": "科目名", "tasks": "やること" },
    { "day": "日", "focus": "科目名", "tasks": "やること" }
  ]
}`,
          messages: [{
            role: 'user',
            content: `現在の状況:
試験まで: ${daysLeft !== null ? daysLeft + '日' : '未設定'}
復習待ち: ${due}件
${stats.map(s => `${s.subject}: ${Math.floor(s.minutes/60)}h, 正答率${s.correctRate ?? '未記録'}%`).join('\n')}
短答合格: ${data.shortAnswerPassed ? '済み' : '未'}
${situation ? `\nユーザーからの補足: ${situation}` : ''}

最適な学習計画を立ててください。`,
          }],
        }),
      })
      const d     = await res.json()
      const text  = d.content?.map(b => b.text || '').join('') || '{}'
      const clean = text.replace(/```json|```/g, '').trim()
      setPlan(JSON.parse(clean))
    } catch (e) {
      alert('計画立案エラー: ' + e.message)
    } finally { setLoading(false) }
  }

  const applyPlan = () => {
    if (!plan) return
    update(prev => ({
      ...prev,
      plan: {
        dailyGoal:        plan.dailyGoal || prev.plan?.dailyGoal || 20,
        weeklyGoalMins:   plan.weeklyGoalMins || prev.plan?.weeklyGoalMins || 840,
        prioritySubjects: plan.prioritySubjects || [],
      },
    }))
    alert('計画を適用しました！ホームに反映されます。')
  }

  return (
    <div style={{ padding: '0 16px', overflowY: 'auto', flex: 1 }}>
      <Card style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>現在の状況を補足（任意）</div>
        <textarea value={situation} onChange={e => setSituation(e.target.value)} rows={3}
          placeholder="例: 先週の答練で監査論が苦手とわかった。試験まで2ヶ月。"
          style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', fontFamily: 'inherit', fontSize: 13, outline: 'none', resize: 'none', lineHeight: 1.6, marginBottom: 10, boxSizing: 'border-box' }}
        />
        <button onClick={buildPlan} disabled={loading} style={{
          width: '100%', padding: '13px', borderRadius: 12, border: 'none',
          background: loading ? '#1f2937' : 'linear-gradient(135deg, #1d4ed8, #38bdf8)',
          color: loading ? C.muted : '#fff',
          fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
          cursor: loading ? 'not-allowed' : 'pointer',
        }}>
          {loading ? '⏳ AI計画立案中…' : '✦ AIで学習計画を立案'}
        </button>
      </Card>

      {plan && (
        <div>
          <Card style={{ marginBottom: 10, background: 'linear-gradient(135deg, #0d1117, #111827)' }}>
            <div style={{ fontSize: 12, color: '#38bdf8', fontWeight: 700, marginBottom: 8 }}>✦ AI提案</div>
            <div style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 1.7, marginBottom: 12 }}>{plan.summary}</div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <div><div style={{ fontSize: 22, fontWeight: 900, color: '#38bdf8' }}>{plan.dailyGoal}<span style={{ fontSize: 11, color: C.muted }}>問/日</span></div><div style={{ fontSize: 9, color: C.muted }}>1日目標</div></div>
              <div><div style={{ fontSize: 22, fontWeight: 900, color: '#34d399' }}>{Math.round(plan.weeklyGoalMins/60)}<span style={{ fontSize: 11, color: C.muted }}>h/週</span></div><div style={{ fontSize: 9, color: C.muted }}>週間目標</div></div>
            </div>
            {plan.prioritySubjects?.length > 0 && (
              <div style={{ display: 'flex', gap: 5, marginBottom: 12 }}>
                <span style={{ fontSize: 10, color: C.muted, marginRight: 4 }}>優先:</span>
                {plan.prioritySubjects.map(s => (
                  <span key={s} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: `${SUB[s]?.accent || '#38bdf8'}20`, color: SUB[s]?.accent || '#38bdf8', fontWeight: 700 }}>{s}</span>
                ))}
              </div>
            )}
            {(plan.advice || []).map((a, i) => (
              <div key={i} style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, marginBottom: 5, fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 }}>
                {i + 1}. {a}
              </div>
            ))}
          </Card>

          {plan.weekPlan?.length > 0 && (
            <Card style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, marginBottom: 10 }}>今週のプラン</div>
              {plan.weekPlan.map(w => {
                const c = SUB[w.focus]
                return (
                  <div key={w.day} style={{ display: 'flex', gap: 10, padding: '7px 0', borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ width: 24, fontSize: 11, fontWeight: 700, color: '#e2e8f0', flexShrink: 0 }}>{w.day}</div>
                    <div style={{ width: 3, background: c?.accent || '#38bdf8', borderRadius: 2, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: c?.accent || '#38bdf8' }}>{w.focus}</div>
                      <div style={{ fontSize: 10, color: C.muted }}>{w.tasks}</div>
                    </div>
                  </div>
                )
              })}
            </Card>
          )}

          <button onClick={applyPlan} style={{
            width: '100%', padding: '14px', borderRadius: 12, border: 'none',
            background: 'linear-gradient(135deg, #16a34a, #22c55e)',
            color: '#fff', fontFamily: 'inherit', fontSize: 14, fontWeight: 800, cursor: 'pointer',
          }}>✓ この計画で進める（ワンタップ適用）</button>
        </div>
      )}
    </div>
  )
}

// ── Settings ──────────────────────────────────────────────────────────────
function Settings({ data, update }) {
  const [examDate, setExamDate] = useState(data.examDate || '')
  const [dailyGoal, setDailyGoal] = useState(data.plan?.dailyGoal || 20)
  const fileRef = useRef()

  const save = () => {
    update(prev => ({
      ...prev,
      examDate: examDate || null,
      plan: { ...prev.plan, dailyGoal: parseInt(dailyGoal) || 20 },
    }))
    alert('保存しました！')
  }

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url; a.download = `cpa_backup_${todayStr()}.json`; a.click()
    URL.revokeObjectURL(url)
  }

  const importData = (file) => {
    const r = new FileReader()
    r.onload = e => {
      try {
        const d = JSON.parse(e.target.result)
        if (confirm('データを上書きインポートしますか？')) update(() => d)
      } catch { alert('JSONの読み込みに失敗しました') }
    }
    r.readAsText(file)
  }

  const iStyle = { padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', fontFamily: 'inherit', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' }

  return (
    <div style={{ padding: '0 16px', overflowY: 'auto', flex: 1 }}>
      <Card style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0', marginBottom: 12 }}>基本設定</div>
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>短答式試験日</div>
          <input type="date" value={examDate} onChange={e => setExamDate(e.target.value)} style={iStyle} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>1日の目標問題数</div>
          <input type="number" value={dailyGoal} onChange={e => setDailyGoal(e.target.value)} style={iStyle} />
        </div>

        {/* Short answer passed toggle */}
        <div onClick={() => update(prev => ({ ...prev, shortAnswerPassed: !prev.shortAnswerPassed }))} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 12px', background: data.shortAnswerPassed ? '#16a34a18' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${data.shortAnswerPassed ? '#22c55e40' : C.border}`,
          borderRadius: 10, cursor: 'pointer', marginBottom: 14,
        }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, background: data.shortAnswerPassed ? '#22c55e' : 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#fff' }}>
            {data.shortAnswerPassed ? '✓' : ''}
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: data.shortAnswerPassed ? '#4ade80' : C.muted }}>短答式合格済み</div>
            <div style={{ fontSize: 10, color: C.muted }}>ONにすると論文機能が解放されます</div>
          </div>
        </div>

        <Btn onClick={save} full color="#38bdf8">保存</Btn>
      </Card>

      <Card>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0', marginBottom: 12 }}>データ同期（iCloud）</div>
        <div style={{ fontSize: 11, color: C.muted, marginBottom: 12, lineHeight: 1.7 }}>
          JSONファイルをiCloud Driveに保存することでiPhone↔iPadのデータを同期できます。
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn onClick={exportData} full color="#38bdf8">⬇ エクスポート</Btn>
          <div style={{ flex: 1 }}>
            <input type="file" accept=".json" ref={fileRef} onChange={e => e.target.files[0] && importData(e.target.files[0])} style={{ display: 'none' }} />
            <Btn onClick={() => fileRef.current.click()} full color="#34d399">⬆ インポート</Btn>
          </div>
        </div>
        <div style={{ fontSize: 10, color: C.muted, marginTop: 10 }}>
          ヒント: エクスポート後、ファイルアプリ→iCloud Driveに保存してください
        </div>
      </Card>
    </div>
  )
}
