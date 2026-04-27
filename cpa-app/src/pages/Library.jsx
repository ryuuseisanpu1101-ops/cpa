import { useState, useRef } from 'react'
import { SUBJECTS, SUB, uid, todayStr } from '../constants'
import { Card, SubjectBadge, ResultBadge, SectionTitle, Btn, FilterPill, EmptyState, C, SubjectSelector } from '../components/ui'
import { lastAttempt, getAttempts, deleteQuestion, updateQuestion, deleteFlashcard, updateFlashcard, deleteArticle, updateArticle } from '../store/data'

export default function Library({ data, update }) {
  const [tab, setTab] = useState('list')

  return (
    <div style={{ padding: '0 16px' }}>
      <SectionTitle sub={`登録問題: ${data.questions.length}問`}>問題庫</SectionTitle>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {[
          { key: 'list',   label: '一覧' },
          { key: 'add',    label: '追加' },
          { key: 'flash',  label: '数値カード' },
          { key: 'law',    label: '条文' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            flexShrink: 0, padding: '7px 16px', borderRadius: 10,
            border: `1px solid ${tab === t.key ? '#38bdf8' : C.border}`,
            background: tab === t.key ? '#38bdf818' : 'rgba(255,255,255,0.03)',
            color: tab === t.key ? '#38bdf8' : C.muted,
            fontFamily: 'inherit', fontSize: 11, fontWeight: tab === t.key ? 700 : 400, cursor: 'pointer',
          }}>{t.label}</button>
        ))}
      </div>
      {tab === 'list'  && <QuestionList data={data} update={update} />}
      {tab === 'add'   && <QuestionAdd  data={data} update={update} />}
      {tab === 'flash' && <Flashcards   data={data} update={update} />}
      {tab === 'law'   && <LawTracker   data={data} update={update} />}
    </div>
  )
}

// ── 問題一覧 ──────────────────────────────────────────────────────────────
function QuestionList({ data, update }) {
  const [filterSub, setFilterSub] = useState('')
  const [editId,    setEditId]    = useState(null)
  const [editFields, setEditFields] = useState({})

  const filtered = data.questions.filter(q => !filterSub || q.subject === filterSub)
  const grouped  = filtered.reduce((acc, q) => {
    const key = `${q.subject}__${q.topicName}`
    ;(acc[key] = acc[key] || []).push(q)
    return acc
  }, {})

  const startEdit = (q) => {
    setEditId(q.id)
    setEditFields({
      subject:     q.subject,
      chapter:     q.chapter || '',
      topicName:   q.topicName,
      body:        q.body || '',
      answer:      q.answer || 'correct',
      explanation: q.explanation || '',
      importance:  q.importance || 'B',
    })
  }

  const saveEdit = () => {
    update(prev => updateQuestion(prev, editId, editFields))
    setEditId(null)
  }

  const del = (id) => {
    if (!confirm('削除しますか？')) return
    update(prev => deleteQuestion(prev, id))
  }

  const iStyle = { padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', fontFamily: 'inherit', fontSize: 12, outline: 'none', width: '100%', boxSizing: 'border-box' }

  return (
    <div>
      <div style={{ display: 'flex', gap: 5, overflowX: 'auto', scrollbarWidth: 'none', marginBottom: 12 }}>
        {['', ...SUBJECTS].map((s, i) => (
          <FilterPill key={i} label={s ? SUB[s].short : '全科目'} active={filterSub === s}
            color={s ? SUB[s]?.accent : '#38bdf8'} onClick={() => setFilterSub(s)} />
        ))}
      </div>

      {Object.keys(grouped).length === 0
        ? <EmptyState icon="📭" text="問題がありません" sub="追加タブから問題を追加してください" />
        : Object.entries(grouped).map(([key, qs]) => {
          const [sub, topic] = key.split('__')
          const c = SUB[sub]
          return (
            <div key={key} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                <div style={{ width: 3, height: 16, borderRadius: 2, background: c.accent }} />
                <span style={{ fontSize: 12, fontWeight: 800, color: '#e2e8f0' }}>{topic}</span>
                <span style={{ fontSize: 9, color: C.muted }}>{sub} · {qs.length}問</span>
              </div>
              {qs.map(q => {
                const last = lastAttempt(data, q.id)
                const atts = getAttempts(data, q.id)
                const rate = atts.length ? Math.round(atts.filter(a => a.result === 'correct').length / atts.length * 100) : null
                const isEditing = editId === q.id

                return (
                  <Card key={q.id} style={{ marginBottom: 6, padding: '10px 12px' }}>
                    {isEditing ? (
                      /* 編集フォーム */
                      <div>
                        <div style={{ fontSize: 11, color: '#38bdf8', fontWeight: 700, marginBottom: 10 }}>編集中</div>
                        <SubjectSelector value={editFields.subject} onChange={v => setEditFields(f => ({ ...f, subject: v }))} />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 8 }}>
                          <div>
                            <div style={{ fontSize: 10, color: C.muted, marginBottom: 3 }}>章</div>
                            <input value={editFields.chapter} onChange={e => setEditFields(f => ({ ...f, chapter: e.target.value }))} style={iStyle} />
                          </div>
                          <div>
                            <div style={{ fontSize: 10, color: C.muted, marginBottom: 3 }}>重要度</div>
                            <select value={editFields.importance} onChange={e => setEditFields(f => ({ ...f, importance: e.target.value }))} style={iStyle}>
                              {['A','B','C'].map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                          </div>
                        </div>
                        <div style={{ marginTop: 6 }}>
                          <div style={{ fontSize: 10, color: C.muted, marginBottom: 3 }}>論点名</div>
                          <input value={editFields.topicName} onChange={e => setEditFields(f => ({ ...f, topicName: e.target.value }))} style={iStyle} />
                        </div>
                        <div style={{ marginTop: 6 }}>
                          <div style={{ fontSize: 10, color: C.muted, marginBottom: 3 }}>問題文</div>
                          <textarea value={editFields.body} onChange={e => setEditFields(f => ({ ...f, body: e.target.value }))} rows={4} style={{ ...iStyle, resize: 'vertical', lineHeight: 1.6 }} />
                        </div>
                        <div style={{ marginTop: 6 }}>
                          <div style={{ fontSize: 10, color: C.muted, marginBottom: 3 }}>正解</div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            {[{ v: 'correct', l: '○ 正しい' }, { v: 'wrong', l: '✕ 誤り' }].map(({ v, l }) => (
                              <button key={v} onClick={() => setEditFields(f => ({ ...f, answer: v }))} style={{
                                flex: 1, padding: '8px', borderRadius: 8, fontFamily: 'inherit', fontSize: 12, cursor: 'pointer',
                                border: `1px solid ${editFields.answer === v ? (v === 'correct' ? '#4ade80' : '#f87171') : C.border}`,
                                background: editFields.answer === v ? (v === 'correct' ? '#4ade8018' : '#f8717118') : 'transparent',
                                color: editFields.answer === v ? (v === 'correct' ? '#4ade80' : '#f87171') : C.muted,
                                fontWeight: editFields.answer === v ? 700 : 400,
                              }}>{l}</button>
                            ))}
                          </div>
                        </div>
                        <div style={{ marginTop: 6 }}>
                          <div style={{ fontSize: 10, color: C.muted, marginBottom: 3 }}>解説</div>
                          <textarea value={editFields.explanation} onChange={e => setEditFields(f => ({ ...f, explanation: e.target.value }))} rows={3} style={{ ...iStyle, resize: 'vertical', lineHeight: 1.6 }} />
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                          <Btn onClick={saveEdit} full color="#4ade80" sm>保存</Btn>
                          <Btn onClick={() => setEditId(null)} full color="#6b7280" sm>キャンセル</Btn>
                        </div>
                      </div>
                    ) : (
                      /* 通常表示 */
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: q.answer === 'correct' ? '#4ade80' : '#f87171' }}>
                            {q.answer === 'correct' ? '○' : '✕'}
                          </span>
                          {q.importance && <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 20, background: 'rgba(255,255,255,0.08)', color: C.muted }}>重要度{q.importance}</span>}
                          {rate !== null && <RateBadge rate={rate} />}
                          <span style={{ fontSize: 9, color: C.muted, marginLeft: 'auto' }}>{atts.length}回解答</span>
                        </div>
                        {q.body && (
                          <div style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.6, marginBottom: 6 }}>
                            {q.body.slice(0, 100)}{q.body.length > 100 ? '…' : ''}
                          </div>
                        )}
                        {q.explanation && (
                          <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.5, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 6 }}>
                            {q.explanation.slice(0, 60)}{q.explanation.length > 60 ? '…' : ''}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                          <button onClick={() => startEdit(q)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: C.muted, fontFamily: 'inherit', fontSize: 11, cursor: 'pointer' }}>✎ 編集</button>
                          <button onClick={() => del(q.id)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #ef444430', background: 'transparent', color: '#f87171', fontFamily: 'inherit', fontSize: 11, cursor: 'pointer' }}>🗑 削除</button>
                        </div>
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          )
        })
      }
    </div>
  )
}

// ── 問題追加 ──────────────────────────────────────────────────────────────
function QuestionAdd({ data, update }) {
  const [sub,         setSub]         = useState(SUBJECTS[0])
  const [chapter,     setChapter]     = useState('')
  const [topic,       setTopic]       = useState('')
  const [imp,         setImp]         = useState('B')
  const [body,        setBody]        = useState('')
  const [answer,      setAnswer]      = useState('correct')
  const [explanation, setExplanation] = useState('')
  const [jsonText,    setJsonText]    = useState('')
  const [jsonMode,    setJsonMode]    = useState(false)
  const [msg,         setMsg]         = useState('')

  const existTopics = [...new Set(data.questions.filter(q => q.subject === sub).map(q => q.topicName))]

  const iStyle = { padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', fontFamily: 'inherit', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' }

  const add = (cont = false) => {
    if (!topic.trim() || !body.trim()) { setMsg('論点名と問題文は必須です'); return }
    update(prev => ({
      ...prev,
      questions: [...prev.questions, {
        id: uid(), subject: sub, chapter: chapter.trim(),
        topicName: topic.trim(), body: body.trim(),
        answer, explanation: explanation.trim(),
        importance: imp, source: 'manual', createdAt: todayStr(),
      }],
    }))
    setMsg(`追加しました！`)
    if (cont) { setBody(''); setExplanation('') }
    else { setBody(''); setExplanation(''); setTopic('') }
    setTimeout(() => setMsg(''), 2000)
  }

  const importJson = () => {
    try {
      const arr = JSON.parse(jsonText.replace(/```json|```/g, '').trim())
      if (!Array.isArray(arr)) throw new Error()
      const newQs = arr.map(p => ({
        id: uid(), subject: p.subject || sub,
        chapter: p.chapter || chapter.trim(),
        topicName: p.topicName || topic,
        body: p.body || '', answer: p.answer || 'correct',
        explanation: p.explanation || '',
        importance: p.importance || 'B',
        source: 'import', createdAt: todayStr(),
      }))
      update(prev => ({ ...prev, questions: [...prev.questions, ...newQs] }))
      setMsg(`${newQs.length}問をインポートしました！`)
      setJsonText('')
      setTimeout(() => setMsg(''), 3000)
    } catch {
      setMsg('JSONの形式が正しくありません')
      setTimeout(() => setMsg(''), 3000)
    }
  }

  return (
    <div>
      {/* モード切替 */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {[{ key: false, label: '手動入力' }, { key: true, label: 'JSONインポート' }].map(m => (
          <button key={String(m.key)} onClick={() => setJsonMode(m.key)} style={{
            flex: 1, padding: '8px', borderRadius: 10, fontFamily: 'inherit', fontSize: 12, cursor: 'pointer',
            border: `1px solid ${jsonMode === m.key ? '#38bdf8' : C.border}`,
            background: jsonMode === m.key ? '#38bdf818' : 'rgba(255,255,255,0.03)',
            color: jsonMode === m.key ? '#38bdf8' : C.muted,
            fontWeight: jsonMode === m.key ? 700 : 400,
          }}>{m.label}</button>
        ))}
      </div>

      {msg && (
        <div style={{ padding: '8px 12px', borderRadius: 8, background: '#14532d22', border: '1px solid #22c55e30', color: '#4ade80', fontSize: 12, marginBottom: 10 }}>{msg}</div>
      )}

      {jsonMode ? (
        /* JSONインポート */
        <Card>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 8, lineHeight: 1.7 }}>
            Claudeが出力したJSONを貼り付けてください。
            <br />形式: [{`{"subject":"監査論","chapter":"第1章","topicName":"論点名","body":"問題文","answer":"correct|wrong","explanation":"解説","importance":"A|B|C"}`}]
          </div>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>デフォルト科目（JSONにsubjectがない場合）</div>
            <SubjectSelector value={sub} onChange={setSub} />
          </div>
          <textarea value={jsonText} onChange={e => setJsonText(e.target.value)} rows={8}
            placeholder="JSONを貼り付け"
            style={{ ...iStyle, resize: 'vertical', lineHeight: 1.5, marginTop: 8, marginBottom: 10 }} />
          <Btn onClick={importJson} full color="#38bdf8" disabled={!jsonText.trim()}>インポート</Btn>
        </Card>
      ) : (
        /* 手動入力 */
        <Card>
          <SubjectSelector value={sub} onChange={setSub} />
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>論点名 <span style={{ color: '#f87171' }}>*</span></div>
            <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="例: 財務諸表監査の必要性" style={iStyle} />
            {existTopics.length > 0 && (
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 5 }}>
                {existTopics.map(t => (
                  <button key={t} onClick={() => setTopic(t)} style={{ padding: '2px 8px', borderRadius: 20, fontSize: 9, border: '1px solid rgba(255,255,255,0.08)', background: topic === t ? '#c084fc18' : 'rgba(255,255,255,0.04)', color: topic === t ? '#c084fc' : C.muted, fontFamily: 'inherit', cursor: 'pointer' }}>{t}</button>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
            <div>
              <div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>章（任意）</div>
              <input value={chapter} onChange={e => setChapter(e.target.value)} placeholder="例: 第1章" style={iStyle} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>重要度</div>
              <select value={imp} onChange={e => setImp(e.target.value)} style={iStyle}>
                {['A','B','C'].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>問題文 <span style={{ color: '#f87171' }}>*</span></div>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={5}
              placeholder="肢の文章を入力"
              style={{ ...iStyle, resize: 'vertical', lineHeight: 1.7 }} />
          </div>
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 10, color: C.muted, marginBottom: 6 }}>正解 <span style={{ color: '#f87171' }}>*</span></div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[{ v: 'correct', l: '○ 正しい', col: '#4ade80' }, { v: 'wrong', l: '✕ 誤り', col: '#f87171' }].map(({ v, l, col }) => (
                <button key={v} onClick={() => setAnswer(v)} style={{
                  flex: 1, padding: '10px', borderRadius: 10, fontFamily: 'inherit', fontSize: 13, cursor: 'pointer',
                  border: `1px solid ${answer === v ? col : C.border}`,
                  background: answer === v ? `${col}18` : 'rgba(255,255,255,0.03)',
                  color: answer === v ? col : C.muted,
                  fontWeight: answer === v ? 800 : 400,
                }}>{l}</button>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 10, marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>解説（任意）</div>
            <textarea value={explanation} onChange={e => setExplanation(e.target.value)} rows={4}
              placeholder="解説・根拠を入力"
              style={{ ...iStyle, resize: 'vertical', lineHeight: 1.7 }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn onClick={() => add(false)} full color="#38bdf8">追加</Btn>
            <Btn onClick={() => add(true)}  full color="#34d399">追加して続ける</Btn>
          </div>
        </Card>
      )}
    </div>
  )
}

// ── フラッシュカード ──────────────────────────────────────────────────────
function Flashcards({ data, update }) {
  const [sub,     setSub]     = useState(SUBJECTS[0])
  const [front,   setFront]   = useState('')
  const [back,    setBack]    = useState('')
  const [cat,     setCat]     = useState('')
  const [flip,    setFlip]    = useState({})
  const [editId,  setEditId]  = useState(null)
  const [editF,   setEditF]   = useState({})

  const cards    = (data.flashcards || []).filter(c => !sub || c.subject === sub)
  const iStyle   = { padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', fontFamily: 'inherit', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' }

  const add = () => {
    if (!front.trim() || !back.trim()) return
    update(prev => ({ ...prev, flashcards: [...(prev.flashcards || []), { id: uid(), subject: sub, front: front.trim(), back: back.trim(), category: cat.trim() }] }))
    setFront(''); setBack(''); setCat('')
  }

  const del = (id) => {
    if (!confirm('削除しますか？')) return
    update(prev => deleteFlashcard(prev, id))
  }

  const startEdit = (c) => { setEditId(c.id); setEditF({ front: c.front, back: c.back, category: c.category || '' }) }
  const saveEdit  = ()  => { update(prev => updateFlashcard(prev, editId, editF)); setEditId(null) }

  return (
    <div>
      <Card style={{ marginBottom: 12 }}>
        <SubjectSelector value={sub} onChange={setSub} />
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input value={front} onChange={e => setFront(e.target.value)} placeholder="表（例: 監査報酬の開示基準額）" style={iStyle} />
          <input value={back}  onChange={e => setBack(e.target.value)}  placeholder="裏（答え・数値）" style={iStyle} />
          <input value={cat}   onChange={e => setCat(e.target.value)}   placeholder="カテゴリ（任意）" style={iStyle} />
          <Btn onClick={add} full color="#38bdf8">追加</Btn>
        </div>
      </Card>

      <div style={{ display: 'flex', gap: 5, overflowX: 'auto', scrollbarWidth: 'none', marginBottom: 10 }}>
        {SUBJECTS.map(s => (
          <FilterPill key={s} label={SUB[s].short} active={sub === s} color={SUB[s].accent} onClick={() => setSub(s)} />
        ))}
      </div>

      {cards.length === 0 && <EmptyState icon="🔢" text="数値カードがありません" />}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {cards.map(card => {
          const isFlipped = flip[card.id]
          const c = SUB[card.subject]
          const isEditing = editId === card.id
          return (
            <div key={card.id} style={{ background: isFlipped ? c.dim : C.card, border: `1px solid ${isFlipped ? c.accent + '40' : C.border}`, borderRadius: 14, padding: '12px', transition: 'all 0.2s' }}>
              {isEditing ? (
                <div>
                  <input value={editF.front} onChange={e => setEditF(f => ({ ...f, front: e.target.value }))} style={{ ...iStyle, marginBottom: 6, fontSize: 11, padding: '6px 8px' }} />
                  <input value={editF.back}  onChange={e => setEditF(f => ({ ...f, back:  e.target.value }))} style={{ ...iStyle, marginBottom: 6, fontSize: 11, padding: '6px 8px' }} />
                  <input value={editF.category} onChange={e => setEditF(f => ({ ...f, category: e.target.value }))} placeholder="カテゴリ" style={{ ...iStyle, marginBottom: 8, fontSize: 11, padding: '6px 8px' }} />
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={saveEdit} style={{ flex: 1, padding: '5px', borderRadius: 6, border: 'none', background: '#38bdf8', color: '#000', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>保存</button>
                    <button onClick={() => setEditId(null)} style={{ flex: 1, padding: '5px', borderRadius: 6, border: 'none', background: 'rgba(255,255,255,0.08)', color: C.muted, fontSize: 10, cursor: 'pointer' }}>×</button>
                  </div>
                </div>
              ) : (
                <div>
                  <div onClick={() => setFlip(f => ({ ...f, [card.id]: !f[card.id] }))} style={{ cursor: 'pointer', minHeight: 60 }}>
                    {card.category && <div style={{ fontSize: 9, color: C.muted, marginBottom: 4 }}>{card.category}</div>}
                    <div style={{ fontSize: 12, fontWeight: 700, color: isFlipped ? c.accent : '#e2e8f0', lineHeight: 1.5 }}>{isFlipped ? card.back : card.front}</div>
                    <div style={{ fontSize: 9, color: C.muted, marginTop: 4 }}>{isFlipped ? 'タップで戻る' : 'タップで答え'}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                    <button onClick={() => startEdit(card)} style={{ flex: 1, padding: '4px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: C.muted, fontSize: 10, cursor: 'pointer' }}>✎</button>
                    <button onClick={() => del(card.id)} style={{ flex: 1, padding: '4px', borderRadius: 6, border: '1px solid #ef444430', background: 'transparent', color: '#f87171', fontSize: 10, cursor: 'pointer' }}>🗑</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── 条文トラッカー ────────────────────────────────────────────────────────
function LawTracker({ data, update }) {
  const [num,    setNum]    = useState('')
  const [title,  setTitle]  = useState('')
  const [memo,   setMemo]   = useState('')
  const [filter, setFilter] = useState('all')
  const [editId, setEditId] = useState(null)
  const [editF,  setEditF]  = useState({})

  const articles = data.articles || []
  const filtered = articles.filter(a =>
    filter === 'all' ? true : filter === 'mastered' ? a.mastered : !a.mastered
  )

  const iStyle = { padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', fontFamily: 'inherit', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' }

  const add = () => {
    if (!num.trim()) return
    update(prev => ({ ...prev, articles: [...(prev.articles || []), { id: uid(), subject: '企業法', number: num.trim(), title: title.trim(), memo: memo.trim(), mastered: false }] }))
    setNum(''); setTitle(''); setMemo('')
  }

  const toggle  = (id) => update(prev => ({ ...prev, articles: (prev.articles || []).map(a => a.id === id ? { ...a, mastered: !a.mastered } : a) }))
  const del     = (id) => { if (!confirm('削除しますか？')) return; update(prev => deleteArticle(prev, id)) }
  const startEdit = (a) => { setEditId(a.id); setEditF({ number: a.number, title: a.title, memo: a.memo || '' }) }
  const saveEdit  = ()  => { update(prev => updateArticle(prev, editId, editF)); setEditId(null) }

  return (
    <div>
      <Card style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontSize: 12, color: C.muted }}>条文 {articles.length}件</div>
          <div style={{ fontSize: 12, color: '#4ade80', fontWeight: 700 }}>{articles.filter(a => a.mastered).length}/{articles.length} 習熟</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 8, marginBottom: 8 }}>
          <input value={num}   onChange={e => setNum(e.target.value)}   placeholder="条文番号" style={iStyle} />
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

      {filtered.length === 0 && <EmptyState icon="📜" text="条文が登録されていません" />}

      {filtered.map(a => {
        const isEditing = editId === a.id
        return (
          <Card key={a.id} style={{ marginBottom: 6, padding: '10px 14px', background: a.mastered ? '#14532d22' : C.card, border: `1px solid ${a.mastered ? '#22c55e30' : C.border}` }}>
            {isEditing ? (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 6, marginBottom: 6 }}>
                  <input value={editF.number} onChange={e => setEditF(f => ({ ...f, number: e.target.value }))} style={{ ...iStyle, fontSize: 12, padding: '6px 8px' }} />
                  <input value={editF.title}  onChange={e => setEditF(f => ({ ...f, title:  e.target.value }))} style={{ ...iStyle, fontSize: 12, padding: '6px 8px' }} />
                </div>
                <input value={editF.memo} onChange={e => setEditF(f => ({ ...f, memo: e.target.value }))} placeholder="メモ" style={{ ...iStyle, fontSize: 12, padding: '6px 8px', marginBottom: 8 }} />
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={saveEdit} style={{ flex: 1, padding: '6px', borderRadius: 6, border: 'none', background: '#38bdf8', color: '#000', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>保存</button>
                  <button onClick={() => setEditId(null)} style={{ flex: 1, padding: '6px', borderRadius: 6, border: 'none', background: 'rgba(255,255,255,0.08)', color: C.muted, fontSize: 11, cursor: 'pointer' }}>×</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div onClick={() => toggle(a.id)} style={{ width: 22, height: 22, borderRadius: 6, background: a.mastered ? '#22c55e' : 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#fff', cursor: 'pointer', flexShrink: 0 }}>
                  {a.mastered ? '✓' : ''}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>第{a.number}条 {a.title}</div>
                  {a.memo && <div style={{ fontSize: 10, color: C.muted }}>{a.memo}</div>}
                </div>
                <button onClick={() => startEdit(a)} style={{ background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 13, padding: 2 }}>✎</button>
                <button onClick={() => del(a.id)}    style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 13, padding: 2 }}>🗑</button>
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}
