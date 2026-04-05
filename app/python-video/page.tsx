'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const COURSE_NAME = 'Python Programming';
const VIDEO_PATH = '/assets/media/videos/Python.mp4';

interface QuizQuestion { question: string; answer: string; }
interface User { email: string; }

export default function PythonVideoPage() {
  const [user, setUser] = useState<User | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [enrollStatus, setEnrollStatus] = useState<'idle' | 'loading' | 'enrolled'>('idle');
  const [enrollMsg, setEnrollMsg] = useState('');
  const [enrollMsgType, setEnrollMsgType] = useState<'success' | 'error'>('success');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDone, setAiDone] = useState(false);
  const [summaryHtml, setSummaryHtml] = useState('');
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [openQuizIdx, setOpenQuizIdx] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/me', { credentials: 'same-origin' })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then((u: User) => {
        setUser(u);
        if (new URLSearchParams(window.location.search).get('enrolled') === '1') {
          setEnrollStatus('enrolled');
        }
      })
      .catch(() => {});
    const handleClick = () => setDropdownOpen(false);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const handleEnroll = async () => {
    const authRes = await fetch('/api/me', { credentials: 'same-origin' });
    if (!authRes.ok) { window.location.href = '/login'; return; }
    setEnrollStatus('loading');
    try {
      const res = await fetch('/api/enroll', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ courseName: COURSE_NAME }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setEnrollStatus('enrolled');
      setEnrollMsg(data.alreadyEnrolled ? 'You were already enrolled in this course.' : '🎉 Successfully enrolled! Keep learning.');
      setEnrollMsgType('success');
    } catch (e: unknown) {
      setEnrollStatus('idle');
      setEnrollMsg(e instanceof Error ? e.message : 'Enrollment failed');
      setEnrollMsgType('error');
    }
  };

  const handleLoadAI = async () => {
    if (aiLoading) return;
    setAiLoading(true);
    try {
      const res = await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ videoUrl: VIDEO_PATH, maxQuestions: 5 }) });
      const data = await res.json();
      setSummaryHtml(data.summary_html || `<p>${data.summary || 'No summary available.'}</p>`);
      setQuizQuestions(Array.isArray(data.questions) ? data.questions : []);
      setAiDone(true);
    } catch {
      setSummaryHtml('<p>Failed to generate content. Make sure the server is running.</p>');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <>
      <header className="navbar">
        <Link href="/home" className="logo">
          <span className="logo-icon">📖</span>
          <span className="logo-text">Learnix</span>
        </Link>
        <nav>
          <ul className="nav-links">
            <li><Link href="/home">Home</Link></li>
            <li><Link href="/courses">Courses</Link></li>
            <li><Link href="/dashboard">Dashboard</Link></li>
          </ul>
        </nav>
        <div className="nav-actions" id="navActions">
          {user ? (
            <div className="profile-menu">
              <button className="profile-trigger" type="button" onClick={(e) => { e.stopPropagation(); setDropdownOpen(o => !o); }}>{user.email || 'My Account'}</button>
              <div className={`profile-dropdown${dropdownOpen ? ' open' : ''}`}>
                <div className="profile-email">{user.email || ''}</div>
                <Link href="/dashboard" className="profile-item">📊 Dashboard</Link>
                <Link href="/profile" className="profile-item">👤 My Profile</Link>
                <a href="/logout" className="profile-item" style={{ color: '#dc2626' }}>Sign Out</a>
              </div>
            </div>
          ) : (
            <>
              <Link href="/login" className="sign-in">Log In</Link>
              <Link href="/signup" className="sign-up">Sign Up</Link>
            </>
          )}
        </div>
      </header>

      <main>
        <div className="video-page">
          <Link href="/courses" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600, marginBottom: '20px', textDecoration: 'none' }}>
            ← Back to Courses
          </Link>
          <div className="video-wrapper">
            <video controls preload="metadata">
              <source src={VIDEO_PATH} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
          <div className="video-info">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
              <span className="badge">Beginner</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>⏱ 10 Weeks</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>👨‍🏫 Live Sessions</span>
            </div>
            <h1>Python Programming</h1>
            <p>Learn Python from the ground up. Cover variables, functions, data structures, OOP, and build real programs step by step.</p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                className="get-started-free"
                type="button"
                onClick={handleEnroll}
                disabled={enrollStatus !== 'idle'}
                style={enrollStatus === 'enrolled' ? { background: 'var(--green)' } : {}}
              >
                {enrollStatus === 'loading' ? 'Enrolling...' : enrollStatus === 'enrolled' ? '✅ Enrolled' : 'Enroll in Course'}
              </button>
              <Link href="/courses" className="schedule-demo">View All Courses</Link>
            </div>
            {enrollMsg && <div className={`status-msg ${enrollMsgType}`}>{enrollMsg}</div>}
          </div>
          <div className="ai-section">
            <h2>🤖 AI Learning Tools</h2>
            <button
              className="get-started-free"
              type="button"
              onClick={handleLoadAI}
              disabled={aiLoading || aiDone}
              style={{ marginBottom: '20px', ...(aiDone ? { background: 'var(--green)' } : {}) }}
            >
              {aiLoading ? 'Generating...' : aiDone ? '✅ Done! Scroll down to see' : 'Generate Summary & Quiz'}
            </button>
            {summaryHtml && (
              <div className="summary-box">
                <strong style={{ display: 'block', marginBottom: '10px', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-light)' }}>Video Summary</strong>
                <div dangerouslySetInnerHTML={{ __html: summaryHtml }} />
              </div>
            )}
            {quizQuestions.length > 0 && (
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '24px 0 12px' }}>📝 Quick Quiz — click a question to reveal the answer</h3>
                <div className="quiz-list">
                  {quizQuestions.map((q, i) => (
                    <div key={i} className={`quiz-item${openQuizIdx === i ? ' open' : ''}`} onClick={() => setOpenQuizIdx(openQuizIdx === i ? null : i)}>
                      <div className="q">Q{i + 1}. {q.question}</div>
                      <div className="a">💡 {q.answer}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <footer><p>&copy; 2025 Learnix. All rights reserved.</p></footer>
    </>
  );
}
