import { useState, useRef } from 'react'
import { SUBJECTS, SUB, uid, todayStr } from '../constants'
import { Card, SubjectBadge, ResultBadge, SectionTitle, Btn, FilterPill, EmptyState, C, SubjectSelector, Input } from '../components/ui'
import { lastAttempt, getAttempts } from '../store/data'

export default function Library({ data, update }) {
  const [tab, setTab] = useState('list')

  return (
    <div style={{ padding: '0 16px' }}>
      <SectionTitle sub={`登録問題: ${data.questions.length}問`}>問題庫</SectionTitle>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {[
          { key: 'list',   label: `一覧` },
          { key: 'pdf',    label: '📄 PDF抽出' },
          { key: 'manual', label: '手動追加' },
          { key: 'flash',  label: '数値カード' },
          { key: 'law',    label: '条文' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            flex: 1, padding: '7px 4px', borderRadius: 10,
            border: `1px solid ${tab === t.key ? '#38bdf8' : C.border}`,
            background: tab === t.key ? '#38bdf818' : 'rgba(255,255,255,0.03)',
            color: tab === t.key ? '#38bdf8' : C.muted,
            fontFamily: 'inherit', fontSize: 10, fontWeight: tab === t.key ? 700 : 400, cursor: 'pointer',
          }}>{t.label}</button>
        ))}
      </div>
      {tab === 'list'   && <QuestionList data={data} update={update} />}
      {tab === 'pdf'    && <PdfExtract   data={data} update={update} />}
      {tab === 'manual' && <ManualAdd    data={data} update={update} />}
      {tab === 'flash'  && <Flashcards   data={data} update={update} />}
      {tab === 'law'    && <LawTracker   data={data} update={update} />}
    </div>
  )
}

function QuestionList({ data, update }) {
  const [filterSub, setFilterSub] = useState('')
  const filtered = data.questions.filter(q => !filterSub || q.subject === filterSub)
  const grouped = filtered.reduce((acc, q) => {
    const key = `${q.subject}__${q.chapter || ''}__${q.topicName}`
    ;(acc[key] = acc[key] || []).push(q)
    return acc
  }, {})
  const del = id => {
    if (!confirm('削除しますか？')) return
    update(prev => ({ ...prev, questions: prev.questions.filter(q => q.id !== id) }))
  }
  return (
    <div>
      <div style={{ display: 'flex', gap: 5, overflowX: 'auto', scrollbarWidth: 'none', marginBottom: 12 }}>
        {['', ...SUBJECTS].map((s, i) => (
          <FilterPill key={i} label={s || '全科目'} active={filterSub === s}
            color={s ? SUB[s]?.accent : '#38bdf8'} onClick={() => setFilterSub(s)} />
        ))}
      </div>
      {Object.keys(grouped).length === 0
        ? <EmptyState icon="📭" text="問題がありません" sub="PDFから抽出するか手動で追加してください" />
        : Object.entries(grouped).map(([key, qs]) => {
          const [sub, chapter, topic] = key.split('__')
          const c = SUB[sub]
          return (
            <div key={key} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                <div style={{ width: 3, height: 16, borderRadius: 2, background: c.accent }} />
                <span style={{ fontSize: 12, fontWeight: 800, color: '#e2e8f0' }}>{topic}</span>
                <span style={{ fontSize: 9, color: C.muted }}>{sub}{chapter ? ` · ${chapter}` : ''} · {qs.length}問</span>
              </div>
              {qs.map(q => {
                const last = lastAttempt(data, q.id)
                const atts = getAttempts(data, q.id)
                const rate = atts.length ? Math.round(atts.filter(a => a.result === 'correct').length / atts.length * 100) : null
                return (
                  <div key={q.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, borderRadius: 10, padding: '9px 12px', marginBottom: 4 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>
                        問{q.number}{q.limbIndex ? `-${q.limbIndex}` : ''}
                        {q.importance && <span style={{ marginLeft: 6, fontSize: 9, color: C.muted }}>重要度{q.importance}</span>}
                      </div>
                      {q.body && <div style={{ fontSize: 10, color: C.muted, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{q.body.slice(0, 50)}…</div>}
                    </div>
                    <ResultBadge result={last?.result} />
                    <button onClick={() => del(q.id)} style={{ background: 'transparent', border: 'none', color: '#1f2937', cursor: 'pointer', fontSize: 13, padding: 2 }}>🗑</button>
                  </div>
                )
              })}
            </div>
          )
        })
      }
    </div>
  )
}

function PdfExtract({ data, update }) {
  const [sub, setSub] = useState(SUBJECTS[0])
  const [chapter, setChapter] = useState('')
  const [topic, setTopic] = useState('')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState('')
  const [mode, setMode] = useState('pdf')
  const [rawText, setRawText] = useState('')
  const [isGoodnotes, setIsGoodnotes] = useState(false)
  const fileRef = useRef()

  const getSystemPrompt = () => isGoodnotes
    ? `あなたは公認会計士試験問題集の読み取りアシスタントです。GoodNotesで手書き書き込みされたPDFから、問題の情報と書き込まれた正誤記号を読み取ってください。必ず以下のJSON配列のみを返してください。他の文字は一切出力しないでください。[{"number":"1","limbIndex":null,"topicName":"論点名","importance":"B","body":"問題文","pastResult":"correct|partial|wrong|null"}] - pastResult: ○→correct、△→partial、✕→wrong、書き込みなし→null - JSONのみ出力`
    : `あなたは公認会計士試験問題集の読み取りアシスタントです。PDFから問題を抽出し、必ず以下のJSON配列のみを返してください。[{"number":"1","limbIndex":null,"topicName":"${topic || '指定された論点'}","importance":"B","body":"問題文"}] - JSONのみ出力、コードブロック不要`

  const extractFromFile = async (file) => {
    setLoading(true); setError(''); setPreview(null); setProgress(10)
    try {
      const base64 = await new Promise((res, rej) => {
        const r = new FileReader()
        r.onload = () => res(r.result.split(',')[1])
        r.onerror = () => rej(new Error('読み込み失敗'))
        r.readAsDataURL(file)
      })
      setProgress(30)
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
          system: getSystemPrompt(),
          messages: [{ role: 'user', content: [
            { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
            { type: 'text', text: `科目: ${sub}${chapter ? `、章: ${chapter}` : ''}${topic ? `、論点: ${topic}` : ''}。問題を全て抽出してください。` },
          ]}],
        }),
      })
      setProgress(80)
      const d = await res.json()
      const text = d.content?.map(b => b.text || '').join('') || '[]'
      const clean = text.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean)
      if (!Array.isArray(parsed) || parsed.length === 0) {
        setError('問題が見つかりませんでした')
      } else {
        setPreview(parsed)
      }
      setProgress(100)
    } catch (e) {
      setError('抽出エラー: ' + e.message)
    } finally { setLoading(false) }
  }

  const extractFromText = async () => {
    if (!rawText.trim()) return
    setLoading(true); setError(''); setPreview(null)
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
          system: getSystemPrompt(),
          messages: [{ role: 'user', content: `科目: ${sub}${chapter ? `、章: ${chapter}` : ''}${topic ? `、論点: ${topic}` : ''}\n\n${rawText}` }],
        }),
      })
      const d = await res.json()
      const text = d.content?.map(b => b.text || '').join('') || '[]'
      const clean = text.replace(/```json|```/g, '').trim()
      setPreview(JSON.parse(clean))
    } catch (e) {
      setError('抽出エラー: ' + e.message)
    } finally { setLoading(false) }
  }

  const importAll = () => {
    const today = todayStr()
    const newQs = preview.map(p => ({
      id: uid(), subject: sub, chapter: chapter.trim(),
      topicName: p.topicName || topic,
      number: p.number, limbIndex: p.limbIndex || null,
      body: p.body, importance: p.importance || 'B',
      source: 'pdf', createdAt: today,
    }))
    let newAttempts = [...data.attempts]
    if (isGoodnotes) {
      preview.forEach((p, i) => {
        if (p.pastResult && p.pastResult !== 'null') {
          newAttempts.push({ id: uid(), questionId: newQs[i].id, date: today, result: p.pastResult, memo: 'GoodNotes読み取り', rationale: '' })
        }
      })
    }
    update(prev => ({ ...prev, questions: [...prev.questions, ...newQs], attempts: newAttempts }))
    setPreview(null); setTopic(''); setRawText('')
    alert(`${newQs.length}問をインポートしました！`)
  }

  const iStyle = { padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', fontFamily: 'inherit', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' }

  return (
    <div>
      <Card style={{ marginBottom: 12 }}>
        <SubjectSelector value={sub} onChange={setSub} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10, marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>章（任意）</div>
            <input value={chapter} onChange={e => setChapter(e.target.value)} placeholder="例: 第1章" style={iStyle} />
          </div>
          <div>
            <div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>論点名（任意）</div>
            <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="例: のれん" style={iStyle} />
          </div>
        </div>
        <div onClick={() => setIsGoodnotes(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: isGoodnotes ? '#c084fc18' : 'rgba(255,255,255,0.04)', border: `1px solid ${isGoodnotes ? '#c084fc40' : C.border}`, borderRadius: 10, cursor: 'pointer', marginBottom: 10 }}>
          <div style={{ width: 20, height: 20, borderRadius: 6, background: isGoodnotes ? '#c084fc' : 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#fff' }}>{isGoodnotes ? '✓' : ''}</div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: isGoodnotes ? '#c084fc' : C.muted }}>GoodNotes書き込み済みPDF</div>
            <div style={{ fontSize: 10, color: C.muted }}>○△✕の手書き書き込みを読み取って過去記録に反映</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {[{ key: 'pdf', label: '📄 PDF' }, { key: 'text', label: '📝 テキスト' }].map(m => (
            <button key={m.key} onClick={() => setMode(m.key)} style={{ flex: 1, padding: '8px', borderRadius: 8, fontFamily: 'inherit', fontSize: 12, cursor: 'pointer', fontWeight: mode === m.key ? 700 : 400, border: `1px solid ${mode === m.key ? '#38bdf8' : C.border}`, background: mode === m.key ? '#38bdf818' : 'rgba(255,255,255,0.03)', color: mode === m.key ? '#38bdf8' : C.muted }}>{m.label}</button>
          ))}
        </div>
        {mode === 'pdf' ? (
          <div>
            <input type="file" accept=".pdf" ref={fileRef} onChange={e => e.target.files[0] && extractFromFile(e.target.files[0])} style={{ display: 'none' }} />
            <div onClick={() => fileRef.current.click()} style={{ border: '2px dashed rgba(255,255,255,0.1)', borderRadius: 12, padding: '24px', textAlign: 'center', cursor: 'pointer' }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>⊕</div>
              <div style={{ fontSize: 12, color: C.muted }}>PDFをタップして選択</div>
            </div>
          </div>
        ) : (
          <div>
            <textarea value={rawText} onChange={e => setRawText(e.target.value)} rows={6} placeholder="テキストを貼り付けてください" style={{ ...iStyle, resize: 'vertical', lineHeight: 1.6 }} />
            <Btn onClick={extractFromText} full color="#38bdf8" style={{ marginTop: 8 }} disabled={loading || !rawText.trim()}>✦ Claudeで抽出</Btn>
          </div>
        )}
        {loading && (
          <div style={{ marginTop: 12 }}>
            <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: '#38bdf8', borderRadius: 4, transition: 'width 0.5s' }} />
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 6, textAlign: 'center' }}>⏳ Claudeが処理中…</div>
          </div>
        )}
        {error && <div style={{ color: '#f87171', fontSize: 12, marginTop: 10, padding: '8px 12px', background: '#7f1d1d22', borderRadius: 8 }}>{error}</div>}
      </Card>
      <button onClick={() => fileRef.current && fileRef.current.click()} disabled={loading} style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', background: loading ? '#1f2937' : 'linear-gradient(135deg, #2563eb, #38bdf8)', color: loading ? C.muted : '#fff', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', marginBottom: 16 }}>
        {loading ? '⏳ Claudeが抽出中…' : '✦ Claudeで問題を抽出'}
      </button>
      {preview && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#4ade80' }}>✓ {preview.length}問を抽出</div>
            <div style={{ flex: 1 }} />
            <Btn onClick={importAll} color="#4ade80" sm>全てインポート</Btn>
          </div>
          {preview.slice(0, 5).map((p, i) => (
            <Card key={i} style={{ marginBottom: 6, padding: '10px 12px' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#e2e8f0' }}>問{p.number}</span>
                {p.importance && <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 20, background: 'rgba(255,255,255,0.08)', color: C.muted }}>重要度{p.importance}</span>}
                {isGoodnotes && p.pastResult && p.pastResult !== 'null' && (
                  <span style={{ fontSize: 12, color: p.pastResult === 'correct' ? '#4ade80' : p.pastResult === 'partial' ? '#fbbf24' : '#f87171' }}>
                    {p.pastResult === 'correct' ? '○' : p.pastResult === 'partial' ? '△' : '✕'}
                  </span>
                )}
              </div>
              {p.body && <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.6 }}>{p.body.slice(0, 80)}…</div>}
            </Card>
          ))}
          {preview.length > 5 && <div style={{ fontSize: 11, color: C.muted, textAlign: 'center' }}>…他{preview.length - 5}問</div>}
        </div>
      )}
    </div>
  )
}

function ManualAdd({ data, update }) {
  const [sub, setSub] = useState(SUBJECTS[0])
  const [chapter, setChapter] = useState('')
  const [topic, setTopic] = useState('')
  const [num, setNum] = useState('')
  const [limb, setLimb] = useState('')
  const [imp, setImp] = useState('B')
  const [body, setBody] = useState('')
  const existTopics = [...new Set(data.questions.filter(q => q.subject === sub).map(q => q.topicName))]
  const iStyle = { padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', fontFamily: 'inherit', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' }
  const add = (cont = false) => {
    if (!topic.trim() || !num.trim()) return alert('論点名と問題番号は必須です')
    update(prev => ({ ...prev, questions: [...prev.questions, { id: uid(), subject: sub, chapter: chapter.trim(), topicName: topic.trim(), number: num.trim(), limbIndex: limb.trim() || null, body: body.trim(), importance: imp, source: 'manual', createdAt: todayStr() }] }))
    if (cont) { setNum(''); setBody(''); setLimb('') } else { setNum(''); setBody(''); setLimb(''); setTopic('') }
  }
  return (
    <Card>
      <SubjectSelector value={sub} onChange={setSub} />
      <div style={{ marginTop: 10 }}>
        <div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>論点名 <span style={{ color: '#f87171' }}>*</span></div>
        <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="例: のれんの会計処理" style={iStyle} />
        {existTopics.length > 0 && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 5 }}>
            {existTopics.map(t => (
              <button key={t} onClick={() => setTopic(t)} style={{ padding: '2px 8px', borderRadius: 20, fontSize: 9, border: '1px solid rgba(255,255,255,0.08)', background: topic === t ? '#c084fc18' : 'rgba(255,255,255,0.04)', color: topic === t ? '#c084fc' : C.muted, fontFamily: 'inherit', cursor: 'pointer' }}>{t}</button>
            ))}
          </div>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 10 }}>
        <div><div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>問題番号 *</div><input value={num} onChange={e => setNum(e.target.value)} placeholder="1" style={iStyle} /></div>
        <div><div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>肢番号</div><input value={limb} onChange={e => setLimb(e.target.value)} placeholder="1" style={iStyle} /></div>
        <div><div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>重要度</div><select value={imp} onChange={e => setImp(e.target.value)} style={iStyle}>{['A','B','C'].map(v => <option key={v} value={v}>{v}</option>)}</select></div>
      </div>
      <div style={{ marginTop: 10, marginBottom: 12 }}>
        <div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>問題文（任意）</div>
        <textarea value={body} onChange={e => setBody(e.target.value)} rows={4} placeholder="問題文を貼り付け（空でもOK）" style={{ ...iStyle, resize: 'vertical', lineHeight: 1.6 }} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <Btn onClick={() => add(false)} full color="#38bdf8">追加</Btn>
        <Btn onClick={() => add(true)} full color="#34d399">追加して続ける</Btn>
      </div>
    </Card>
  )
}

function Flashcards({ data, update }) {
  const [sub, setSub] = useState(SUBJECTS[0])
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [cat, setCat] = useState('')
  const [flip, setFlip] = useState({})
  const cards = data.flashcards || []
  const filtered = cards.filter(c => !sub || c.subject === sub)
  const iStyle = { padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', fontFamily: 'inherit', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' }
  const add = () => {
    if (!front.trim() || !back.trim()) return
    update(prev => ({ ...prev, flashcards: [...(prev.flashcards || []), { id: uid(), subject: sub, front: front.trim(), back: back.trim(), category: cat.trim() }] }))
    setFront(''); setBack(''); setCat('')
  }
  return (
    <div>
      <Card style={{ marginBottom: 12 }}>
        <SubjectSelector value={sub} onChange={setSub} />
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input value={front} onChange={e => setFront(e.target.value)} placeholder="表（例: 監査報酬の開示基準額）" style={iStyle} />
          <input value={back} onChange={e => setBack(e.target.value)} placeholder="裏（答え・数値）" style={iStyle} />
          <input value={cat} onChange={e => setCat(e.target.value)} placeholder="カテゴリ（任意）" style={iStyle} />
          <Btn onClick={add} full color="#38bdf8">追加</Btn>
        </div>
      </Card>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {filtered.map(card => {
          const isFlipped = flip[card.id]
          const c = SUB[card.subject]
          return (
            <div key={card.id} onClick={() => setFlip(f => ({ ...f, [card.id]: !f[card.id] }))} style={{ background: isFlipped ? c.dim : C.card, border: `1px solid ${isFlipped ? c.accent + '40' : C.border}`, borderRadius: 14, padding: '16px 12px', cursor: 'pointer', minHeight: 80, display: 'flex', flexDirection: 'column', justifyContent: 'center', transition: 'all 0.2s' }}>
              {card.category && <div style={{ fontSize: 9, color: C.muted, marginBottom: 4 }}>{card.category}</div>}
              <div style={{ fontSize: 12, fontWeight: 700, color: isFlipped ? c.accent : '#e2e8f0', lineHeight: 1.5 }}>{isFlipped ? card.back : card.front}</div>
              <div style={{ fontSize: 9, color: C.muted, marginTop: 4 }}>{isFlipped ? 'タップで戻る' : 'タップで答え'}</div>
            </div>
          )
        })}
      </div>
      {filtered.length === 0 && <EmptyState icon="🔢" text="数値カードがありません" />}
    </div>
  )
}

function LawTracker({ data, update }) {
  const [num, setNum] = useState('')
  const [title, setTitle] = useState('')
  const [memo, setMemo] = useState('')
  const [filter, setFilter] = useState('all')
  const articles = data.articles || []
  const filtered = articles.filter(a => filter === 'all' ? true : filter === 'mastered' ? a.mastered : !a.mastered)
  const iStyle = { padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', fontFamily: 'inherit', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' }
  const add = () => {
    if (!num.trim()) return
    update(prev => ({ ...prev, articles: [...(prev.articles || []), { id: uid(), subject: '企業法', number: num.trim(), title: title.trim(), memo: memo.trim(), mastered: false }] }))
    setNum(''); setTitle(''); setMemo('')
  }
  const toggle = id => update(prev => ({ ...prev, articles: (prev.articles || []).map(a => a.id === id ? { ...a, mastered: !a.mastered } : a) }))
  return (
    <div>
      <Card style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontSize: 12, color: C.muted }}>条文 {articles.length}件</div>
          <div style={{ fontSize: 12, color: '#4ade80', fontWeight: 700 }}>{articles.filter(a => a.mastered).length}/{articles.length} 習熟</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 8, marginBottom: 8 }}>
          <input value={num} onChange={e => setNum(e.target.value)} placeholder="条文番号" style={iStyle} />
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="条文タイトル" style={iStyle} />
        </div>
        <input value={memo} onChange={e => setMemo(e.target.value)} placeholder="メモ（任意）" style={{ ...iStyle, marginBottom: 10 }} />
        <Btn onClick={add} full color="#c084fc">追加</Btn>
      </Card>
      <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
        {[{ key: 'all', label: '全て' }, { key: 'unmastered', label: '未習熟' }, { key: 'mastered', label: '習熟済み' }].map(f => (
          <FilterPill key={f.key} label={f.label} active={filter === f.key} onClick={() => setFilter(f.key)} />
        ))}
      </div>
      {filtered.map(a => (
        <div key={a.id} onClick={() => toggle(a.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: a.mastered ? '#14532d22' : C.card, border: `1px solid ${a.mastered ? '#22c55e30' : C.border}`, borderRadius: 12, marginBottom: 6, cursor: 'pointer' }}>
          <div style={{ width: 20, height: 20, borderRadius: 6, background: a.mastered ? '#22c55e' : 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff' }}>{a.mastered ? '✓' : ''}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>第{a.number}条 {a.title}</div>
            {a.memo && <div style={{ fontSize: 10, color: C.muted }}>{a.memo}</div>}
          </div>
        </div>
      ))}
      {filtered.length === 0 && <EmptyState icon="📜" text="条文が登録されていません" />}
    </div>
  )
}
