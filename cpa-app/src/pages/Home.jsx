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
            <div style={{ fontSize:
