'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface SubjectLibraryEntry {
  name: string;
  year: string;
  chapterVideos: string[];
}

const SUBJECT_LIBRARY: Record<string, SubjectLibraryEntry> = {
  'dbms': { name: 'DBMS', year: 'First Year', chapterVideos: Array.from({ length: 10 }, (_, i) => `/assets/media/dbms/ch${i + 1}.mp4`) },
  'operating-systems': { name: 'Operating Systems', year: 'First Year', chapterVideos: Array.from({ length: 10 }, (_, i) => `/assets/media/operating-systems/ch${i + 1}.mp4`) },
  'ct': { name: 'CT', year: 'First Year', chapterVideos: Array.from({ length: 10 }, (_, i) => `/assets/media/ct/ch${i + 1}.mp4`) },
  'telecommunication': { name: 'Telecommunication', year: 'First Year', chapterVideos: Array.from({ length: 10 }, (_, i) => `/assets/media/telecommunication/ch${i + 1}.mp4`) },
  'fintech': { name: 'FinTech', year: 'First Year', chapterVideos: Array.from({ length: 10 }, (_, i) => `/assets/media/fintech/ch${i + 1}.mp4`) },
  'data-structures': { name: 'Data Structures', year: 'Second Year', chapterVideos: Array.from({ length: 10 }, (_, i) => `/assets/media/data-structures/ch${i + 1}.mp4`) },
  'computer-networks': { name: 'Computer Networks', year: 'Second Year', chapterVideos: Array.from({ length: 10 }, (_, i) => `/assets/media/computer-networks/ch${i + 1}.mp4`) },
  'java-programming': { name: 'Java Programming', year: 'Second Year', chapterVideos: Array.from({ length: 10 }, (_, i) => `/assets/media/java-programming/ch${i + 1}.mp4`) },
  'software-engineering': { name: 'Software Engineering', year: 'Second Year', chapterVideos: Array.from({ length: 10 }, (_, i) => `/assets/media/software-engineering/ch${i + 1}.mp4`) },
  'digital-electronics': { name: 'Digital Electronics', year: 'Second Year', chapterVideos: Array.from({ length: 10 }, (_, i) => `/assets/media/digital-electronics/ch${i + 1}.mp4`) },
  'machine-learning': { name: 'Machine Learning', year: 'Third Year', chapterVideos: Array.from({ length: 10 }, (_, i) => `/assets/media/machine-learning/ch${i + 1}.mp4`) },
  'cloud-computing': { name: 'Cloud Computing', year: 'Third Year', chapterVideos: Array.from({ length: 10 }, (_, i) => `/assets/media/cloud-computing/ch${i + 1}.mp4`) },
  'cyber-security': { name: 'Cyber Security', year: 'Third Year', chapterVideos: Array.from({ length: 10 }, (_, i) => `/assets/media/cyber-security/ch${i + 1}.mp4`) },
  'web-technologies': { name: 'Web Technologies', year: 'Third Year', chapterVideos: Array.from({ length: 10 }, (_, i) => `/assets/media/web-technologies/ch${i + 1}.mp4`) },
  'mobile-app-development': { name: 'Mobile App Development', year: 'Third Year', chapterVideos: Array.from({ length: 10 }, (_, i) => `/assets/media/mobile-app-development/ch${i + 1}.mp4`) },
  'artificial-intelligence': { name: 'Artificial Intelligence', year: 'Final Year', chapterVideos: Array.from({ length: 10 }, (_, i) => `/assets/media/artificial-intelligence/ch${i + 1}.mp4`) },
  'big-data-analytics': { name: 'Big Data Analytics', year: 'Final Year', chapterVideos: Array.from({ length: 10 }, (_, i) => `/assets/media/big-data-analytics/ch${i + 1}.mp4`) },
  'internet-of-things': { name: 'Internet of Things', year: 'Final Year', chapterVideos: Array.from({ length: 10 }, (_, i) => `/assets/media/internet-of-things/ch${i + 1}.mp4`) },
  'blockchain': { name: 'Blockchain', year: 'Final Year', chapterVideos: Array.from({ length: 10 }, (_, i) => `/assets/media/blockchain/ch${i + 1}.mp4`) },
  'project-management': { name: 'Project Management', year: 'Final Year', chapterVideos: Array.from({ length: 10 }, (_, i) => `/assets/media/project-management/ch${i + 1}.mp4`) },
  'physics': { name: 'Physics', year: 'Class 12', chapterVideos: Array.from({ length: 10 }, (_, i) => `/assets/media/physics/ch${i + 1}.mp4`) },
  'chemistry': { name: 'Chemistry', year: 'Class 12', chapterVideos: Array.from({ length: 10 }, (_, i) => `/assets/media/chemistry/ch${i + 1}.mp4`) },
  'mathematics': { name: 'Mathematics', year: 'Class 12', chapterVideos: Array.from({ length: 10 }, (_, i) => `/assets/media/mathematics/ch${i + 1}.mp4`) },
  'english': { name: 'English', year: 'Class 12', chapterVideos: Array.from({ length: 10 }, (_, i) => `/assets/media/english/ch${i + 1}.mp4`) },
  'computer-science': { name: 'Computer Science', year: 'Class 12', chapterVideos: Array.from({ length: 10 }, (_, i) => `/assets/media/computer-science/ch${i + 1}.mp4`) },
};

interface QuizQuestion { question: string; answer: string; }
interface TeacherVideo { course_id: number; course_name: string; video_path: string; teacher_name: string; }

function SubjectLearningContent() {
  const searchParams = useSearchParams();
  const subjectKey = searchParams.get('subject') || '';
  const lessonData = SUBJECT_LIBRARY[subjectKey] || null;

  const [selectedChapter, setSelectedChapter] = useState(0);
  const [summaryHtml, setSummaryHtml] = useState('');
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [openQuizIdx, setOpenQuizIdx] = useState<number | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDone, setAiDone] = useState(false);
  const [teacherVideos, setTeacherVideos] = useState<TeacherVideo[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

  const chapterCount = 10;
  const chapters = Array.from({ length: chapterCount }, (_, i) => `${lessonData?.name || 'Subject'} Chapter ${i + 1}`);
  const currentVideoUrl = selectedVideo ?? (lessonData?.chapterVideos[selectedChapter] || '');

  useEffect(() => {
    // Fetch teacher-uploaded videos for this subject's course
    if (!lessonData) return;
    fetch('/api/my-courses', { credentials: 'same-origin' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        const courses: TeacherVideo[] = Array.isArray(data.courses)
          ? data.courses.filter((c: { video_path?: string; course_name?: string; course_id?: number; teacher_name?: string }) => c.video_path && String(c.video_path).startsWith('/uploads/') && String(c.course_name || '').toLowerCase() === (lessonData?.name || '').toLowerCase())
          : [];
        setTeacherVideos(courses);
      })
      .catch(() => {});
  }, [lessonData]);

  const handleGenerateAI = async () => {
    if (aiLoading) return;
    setAiLoading(true);
    setSummaryHtml('');
    setQuizQuestions([]);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl: currentVideoUrl, maxQuestions: 5 }),
      });
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

  const selectChapter = (idx: number) => {
    setSelectedChapter(idx);
    setSelectedVideo(null);
    setSummaryHtml('');
    setQuizQuestions([]);
    setAiDone(false);
    setOpenQuizIdx(null);
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
        <div className="nav-actions">
          <Link href="/login" className="sign-in">Log In</Link>
          <Link href="/signup" className="sign-up">Sign Up</Link>
        </div>
      </header>

      <main className="learning-page">
        <div className="learning-topbar">
          <Link href={`/subject-detail?subject=${subjectKey}`} className="subject-back-link">← Back to Subject</Link>
          <div className="learning-meta">
            <span className="subject-page-badge">{lessonData?.year || 'Subject Track'}</span>
            <h1>{lessonData?.name || 'Subject Lessons'}</h1>
            <p>Choose a chapter from the left to play the lesson and load its AI summary.</p>
          </div>
        </div>

        <div className="learning-layout">
          {/* Chapters panel */}
          <aside className="chapters-panel">
            <div className="chapters-panel-header">
              <h2>Chapters</h2>
              <p>10 chapters for now</p>
            </div>
            <div className="chapter-list">
              {chapters.map((ch, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`chapter-item${selectedChapter === idx && !selectedVideo ? ' active' : ''}`}
                  onClick={() => selectChapter(idx)}
                >
                  <span className="chapter-number">Ch {idx + 1}</span>
                  <span className="chapter-title">{ch}</span>
                </button>
              ))}
            </div>
          </aside>

          {/* Lesson player */}
          <section className="lesson-player-panel">
            <div className="lesson-player-head">
              <div>
                <span className="lesson-kicker">Chapter {selectedChapter + 1}</span>
                <h2>{chapters[selectedChapter]}</h2>
              </div>
              <button
                className="get-started-free"
                type="button"
                onClick={handleGenerateAI}
                disabled={aiLoading}
                style={aiDone ? { background: 'var(--green)' } : {}}
              >
                {aiLoading ? 'Generating...' : aiDone ? '✅ Done' : 'Generate AI Summary'}
              </button>
            </div>
            <div className="video-wrapper lesson-video-wrapper">
              <video key={currentVideoUrl} controls preload="metadata">
                <source src={currentVideoUrl} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          </section>

          {/* AI and teacher panel */}
          <aside className="lesson-ai-panel">
            <div className="subject-panel">
              <h3>AI Summary</h3>
              <div className="summary-box lesson-summary-box">
                {summaryHtml ? (
                  <div dangerouslySetInnerHTML={{ __html: summaryHtml }} />
                ) : (
                  <div>Select a chapter and click &ldquo;Generate AI Summary&rdquo; to load the chapter summary here.</div>
                )}
              </div>
            </div>

            <div className="subject-panel">
              <h3>AI Questions</h3>
              <div>
                {quizQuestions.length > 0 ? (
                  <div className="quiz-list">
                    {quizQuestions.map((q, i) => (
                      <div
                        key={i}
                        className={`quiz-item${openQuizIdx === i ? ' open' : ''}`}
                        onClick={() => setOpenQuizIdx(openQuizIdx === i ? null : i)}
                      >
                        <div className="q">Q{i + 1}. {q.question}</div>
                        <div className="a">💡 {q.answer}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="quiz-list">
                    <div className="quiz-empty">The chapter quiz will appear here after AI generates questions.</div>
                  </div>
                )}
              </div>
            </div>

            <div className="subject-panel">
              <h3>Teacher Uploaded Videos</h3>
              <div className="chapter-list teacher-video-list">
                {teacherVideos.length > 0 ? teacherVideos.map((v, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`chapter-item${selectedVideo === v.video_path ? ' active' : ''}`}
                    onClick={() => { setSelectedVideo(v.video_path); setSummaryHtml(''); setQuizQuestions([]); setAiDone(false); }}
                  >
                    <span className="chapter-title">{v.course_name || 'Uploaded Lesson'}</span>
                    {v.teacher_name && <span className="chapter-number">{v.teacher_name}</span>}
                  </button>
                )) : (
                  <div className="quiz-empty">Teacher-uploaded videos for this subject will appear here.</div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </main>

      <footer><p>&copy; 2025 Learnix. All rights reserved.</p></footer>
    </>
  );
}

export default function SubjectLearningPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center' }}>Loading lessons...</div>}>
      <SubjectLearningContent />
    </Suspense>
  );
}
