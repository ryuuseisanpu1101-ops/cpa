export const SUBJECTS = ['財務諸表論（理論）', '財務諸表論（計算）', '管理会計論', '監査論', '企業法']

export const SUB = {
  '財務諸表論（理論）': { accent: '#38bdf8', dim: '#071828', short: '財理' },
  '財務諸表論（計算）': { accent: '#0ea5e9', dim: '#071520', short: '財計' },
  '管理会計論':         { accent: '#34d399', dim: '#071a12', short: '管理' },
  '監査論':             { accent: '#fb923c', dim: '#1a0e05', short: '監査' },
  '企業法':             { accent: '#c084fc', dim: '#120720', short: '企業' },
}

export const REVIEW_INTERVALS = [1, 3, 7, 14, 30, 60, 90]

export const IMPORTANCE = ['A', 'B', 'C']

export const ANSWER = {
  correct: { label: '○', color: '#4ade80', bg: '#14532d22' },
  wrong:   { label: '✕', color: '#f87171', bg: '#7f1d1d22' },
}

export const PRACTICE_MODES = [
  { key: 'all',    label: '通常演習',  icon: '▶', desc: 'フィルタして順番に解く' },
  { key: 'random', label: 'ランダム',  icon: '⟳', desc: '科目・重要度を指定してシャッフル' },
  { key: 'weak',   label: '苦手集中',  icon: '✕', desc: '✕が1回でもある問題' },
  { key: 'curve',  label: '忘却曲線',  icon: '↻', desc: '復習タイミングが来た問題' },
  { key: 'drill',  label: '弱点ドリル',icon: '⚡', desc: '直近で間違えた問題を集約' },
  { key: 'exam',   label: '答練復習',  icon: '📝', desc: '答練・模試で間違えた問題' },
  { key: 'diff',   label: '差別化問題',icon: '🎯', desc: '全体正答率高いのに自分が✕' },
]

export const fmt2 = n => String(n).padStart(2, '0')
export const uid  = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
export const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${fmt2(d.getMonth()+1)}-${fmt2(d.getDate())}`
}
export const addDays = (ds, n) => {
  const d = new Date(ds); d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${fmt2(d.getMonth()+1)}-${fmt2(d.getDate())}`
}
export const diffDays = (a, b) => Math.floor((new Date(b) - new Date(a)) / 86400000)
export const minsToHM = mins => ({ h: Math.floor(mins / 60), m: mins % 60 })
export const hmToMins = (h, m) => (parseInt(h) || 0) * 60 + (parseInt(m) || 0)
