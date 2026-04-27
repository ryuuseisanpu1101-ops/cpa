import { uid, todayStr, addDays, REVIEW_INTERVALS } from '../constants'

const KEY = 'cpa_v5'

export const EMPTY = {
  examDate: null,
  shortAnswerPassed: false,
  createdAt: todayStr(),
  questions: [],
  attempts: [],
  reviews: [],
  sessions: [],
  exams: [],
  examQuestions: [],
  flashcards: [],
  articles: [],
  plan: { dailyGoal: 20, weeklyGoalMins: 840, prioritySubjects: [] },
}

export function load() {
  try {
    const r = localStorage.getItem(KEY)
    if (r) return { ...EMPTY, ...JSON.parse(r) }
  } catch {}
  return { ...EMPTY }
}

export function save(data) {
  try { localStorage.setItem(KEY, JSON.stringify(data)) } catch {}
}

export function getAttempts(data, questionId) {
  return data.attempts.filter(a => a.questionId === questionId)
}

export function lastAttempt(data, questionId) {
  const arr = getAttempts(data, questionId)
  return arr.length ? arr[arr.length - 1] : null
}

export function recordAttempt(data, questionId, result, memo = '', rationale = '') {
  const today  = todayStr()
  const newAtt = { id: uid(), questionId, date: today, result, memo, rationale }
  const q      = data.questions.find(q => q.id === questionId)
  let reviews  = [...data.reviews]

  if (q) {
    const existing = reviews.find(r => r.subject === q.subject && r.topicName === q.topicName)
    if (!existing) {
      const schedule = REVIEW_INTERVALS.map(n => ({ date: addDays(today, n), done: false }))
      reviews.push({
        id: uid(), subject: q.subject, topicName: q.topicName,
        firstStudied: today, reviews: schedule,
        nextReview: schedule[0].date, stage: 0,
      })
    }
  }
  return { ...data, attempts: [...data.attempts, newAtt], reviews }
}

export function markReviewDone(data, reviewId) {
  const today = todayStr()
  return {
    ...data,
    reviews: data.reviews.map(r => {
      if (r.id !== reviewId) return r
      const dueR   = r.reviews.find(rv => rv.date <= today && !rv.done)
      if (!dueR) return r
      const updated = r.reviews.map(rv => rv.date === dueR.date ? { ...rv, done: true } : rv)
      const next    = updated.find(rv => !rv.done)
      const stage   = updated.filter(rv => rv.done).length
      return { ...r, reviews: updated, nextReview: next?.date || null, stage }
    }),
  }
}

export function getDueReviews(data) {
  const today = todayStr()
  return data.reviews.filter(r =>
    r.nextReview && r.nextReview <= today &&
    !r.reviews.find(rv => rv.date === today && rv.done)
  )
}

export function getQuestionsForMode(data, mode, filters = {}) {
  let qs = [...data.questions]
  if (filters.subject)    qs = qs.filter(q => q.subject    === filters.subject)
  if (filters.importance) qs = qs.filter(q => q.importance === filters.importance)

  switch (mode) {
    case 'random': return shuffle(qs)
    case 'weak':   return qs.filter(q => getAttempts(data, q.id).some(a => a.result === 'wrong' || a.result === 'partial'))
    case 'curve': {
      const due = getDueReviews(data)
      const dueTopics = new Set(due.map(r => `${r.subject}__${r.topicName}`))
      return qs.filter(q => dueTopics.has(`${q.subject}__${q.topicName}`))
    }
    case 'drill':  return qs.filter(q => getAttempts(data, q.id).slice(-3).some(a => a.result === 'wrong'))
    case 'exam': {
      const wrongIds = new Set((data.examQuestions || []).filter(eq => eq.myResult === 'wrong' || eq.myResult === 'partial').map(eq => eq.questionId).filter(Boolean))
      return qs.filter(q => wrongIds.has(q.id))
    }
    case 'diff': {
      const wrongIds = new Set((data.examQuestions || []).filter(eq => eq.myResult === 'wrong' && eq.groupCorrectRate >= 60).map(eq => eq.questionId).filter(Boolean))
      return qs.filter(q => wrongIds.has(q.id))
    }
    default: return qs
  }
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function subjectStats(data, subject) {
  const qs   = data.questions.filter(q => q.subject === subject)
  const atts = data.attempts.filter(a => {
    const q = data.questions.find(q => q.id === a.questionId)
    return q?.subject === subject
  })
  const correct = atts.filter(a => a.result === 'correct').length
  const rate    = atts.length ? Math.round(correct / atts.length * 100) : null
  const mins    = data.sessions.filter(s => s.subject === subject).reduce((a, s) => a + s.minutes, 0)
  const dueN    = getDueReviews(data).filter(r => r.subject === subject).length
  return { subject, qCount: qs.length, attCount: atts.length, correctRate: rate, minutes: mins, dueCount: dueN }
}

export function topicStats(data, subject) {
  const topics = [...new Set(data.questions.filter(q => q.subject === subject).map(q => q.topicName))]
  return topics.map(topicName => {
    const qs      = data.questions.filter(q => q.subject === subject && q.topicName === topicName)
    const atts    = qs.flatMap(q => getAttempts(data, q.id))
    const correct = atts.filter(a => a.result === 'correct').length
    const rate    = atts.length ? Math.round(correct / atts.length * 100) : null
    const wrongN  = atts.filter(a => a.result === 'wrong').length
    const rev     = data.reviews.find(r => r.subject === subject && r.topicName === topicName)
    return { topicName, qCount: qs.length, attCount: atts.length, correctRate: rate, wrongCount: wrongN, reviewStage: rev?.stage ?? 0 }
  })
}

// ── 編集系ヘルパー ────────────────────────────────────────────────────────

export function updateQuestion(data, id, fields) {
  return { ...data, questions: data.questions.map(q => q.id === id ? { ...q, ...fields } : q) }
}

export function deleteQuestion(data, id) {
  return {
    ...data,
    questions: data.questions.filter(q => q.id !== id),
    attempts:  data.attempts.filter(a => a.questionId !== id),
  }
}

export function updateSession(data, id, fields) {
  return { ...data, sessions: data.sessions.map(s => s.id === id ? { ...s, ...fields } : s) }
}

export function deleteSession(data, id) {
  return { ...data, sessions: data.sessions.filter(s => s.id !== id) }
}

export function updateExam(data, id, fields) {
  return { ...data, exams: (data.exams || []).map(e => e.id === id ? { ...e, ...fields } : e) }
}

export function deleteExam(data, id) {
  return {
    ...data,
    exams:         (data.exams || []).filter(e => e.id !== id),
    examQuestions: (data.examQuestions || []).filter(eq => eq.examId !== id),
  }
}
