'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface User {
  email: string;
  role: string;
}

interface Course {
  course_name: string;
  credits: number | null;
  dept_name: string;
  teacher_name: string;
  enrollment_date: string;
  video_path: string;
}

function addEnrolledFlag(v: string) {
  return v + (v.includes('?') ? '&' : '?') + 'enrolled=1';
}

function formatDate(v: string | null) {
  if (!v) return 'N/A';
  const d = new Date(v);
  return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString();
}

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [coursePanelOpen, setCoursePanelOpen] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [coursesError, setCoursesError] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    fetch('/api/me', { credentials: 'same-origin' })
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((u: User) => setUser(u))
      .catch(() => {});

    const handleClick = () => setDropdownOpen(false);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const openMyCoursesPanel = async () => {
    setCoursePanelOpen(true);
    setCoursesLoading(true);
    setCoursesError('');
    try {
      const res = await fetch('/api/my-courses', { credentials: 'same-origin' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load courses');
      const list: Course[] = Array.isArray(data.courses) ? data.courses : [];
      if (list.length === 0) {
        setCoursePanelOpen(false);
        window.location.href = '/courses';
        return;
      }
      if (list.length === 1) {
        window.location.href = addEnrolledFlag(list[0].video_path || '/courses');
        return;
      }
      setCourses(list);
    } catch (e: unknown) {
      setCoursesError(e instanceof Error ? e.message : 'Failed to load courses');
    } finally {
      setCoursesLoading(false);
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
            <li><Link href="/dashboard">Dashboard</Link></li>
            <li><Link href="/courses">Courses</Link></li>
            <li><a href="#whyLearnix">Features</a></li>
            <li><Link href="/about">About</Link></li>
          </ul>
        </nav>
        <div className="nav-actions" id="navActions">
          {user ? (
            <div className="profile-menu">
              <button
                id="profileTrigger"
                className="profile-trigger"
                type="button"
                onClick={(e) => { e.stopPropagation(); setDropdownOpen((o) => !o); }}
              >
                {user.email || 'My Account'}
              </button>
              <div className={`profile-dropdown${dropdownOpen ? ' open' : ''}`}>
                <div className="profile-email">{user.email || ''}</div>
                <Link href="/dashboard" className="profile-item">Dashboard</Link>
                <Link href="/profile" className="profile-item">My Profile</Link>
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
        <section className="hero">
          <div className="transform-banner">
            <span>✨ Ready to Transform Your Learning?</span>
          </div>
          <h1>
            Start Your Learning<br />
            <span className="journey">Journey</span>
            <span className="today"> Today</span>
          </h1>
          <p className="subtitle">
            Join thousands of successful students who have transformed their careers
            and achieved their goals through our innovative remote learning platform.
          </p>
          <div className="cta-buttons" id="heroCtaButtons">
            {!user && (
              <Link href="/signup" id="heroGetStartedBtn" className="get-started-free">Get Started Free</Link>
            )}
            <Link href="/demo" className="schedule-demo">Schedule a Demo</Link>
          </div>
          <div className="trial-info">
            No credit card required • 30-day free trial • Cancel anytime
          </div>
        </section>
      </main>

      <section className="section why-learnix-section" id="whyLearnix">
        <div className="why-learnix-header">
          <div className="premium-badge"><span>✨ Premium Features</span></div>
          <h1 className="why-learnix-title">
            Why Choose <span className="learnix-gradient">Learnix</span><span className="why-q">?</span>
          </h1>
          <p className="why-learnix-desc">
            Experience the future of education with our cutting-edge remote learning platform
            designed to deliver exceptional educational outcomes.
          </p>
        </div>
        <div className="why-learnix-cards">
          <div className="why-card">
            <div className="why-icon why-icon-blue"><span style={{ fontSize: '1.7rem' }}>📹</span></div>
            <h3>Live Virtual Classes</h3>
            <p>Interactive HD video sessions with real-time collaboration and screen sharing capabilities.</p>
          </div>
          <div className="why-card">
            <div className="why-icon why-icon-green"><span style={{ fontSize: '1.7rem' }}>👨‍🏫</span></div>
            <h3>Expert Instructors</h3>
            <p>Learn from industry professionals and certified educators with years of teaching experience.</p>
          </div>
          <div className="why-card">
            <div className="why-icon why-icon-orange"><span style={{ fontSize: '1.7rem' }}>📊</span></div>
            <h3>Smart Attendance Tracking</h3>
            <p>Automated attendance monitoring with detailed analytics and engagement metrics for better outcomes.</p>
          </div>
          <div className="why-card">
            <div className="why-icon why-icon-blue"><span style={{ fontSize: '1.7rem' }}>🏆</span></div>
            <h3>Performance Dashboard</h3>
            <p>Track your marks, attendance, and focus areas across all enrolled courses in one place.</p>
          </div>
          <div className="why-card">
            <div className="why-icon why-icon-green"><span style={{ fontSize: '1.7rem' }}>🤖</span></div>
            <h3>AI-Powered Summaries</h3>
            <p>Get instant video summaries and auto-generated quiz questions powered by AI.</p>
          </div>
          <div className="why-card">
            <div className="why-icon why-icon-orange"><span style={{ fontSize: '1.7rem' }}>📱</span></div>
            <h3>Learn Anywhere</h3>
            <p>Fully responsive platform - learn on desktop, tablet, or mobile, anytime you want.</p>
          </div>
        </div>
      </section>

      {user && (
        <section className="student-reviews-section" id="reviewsSection">
          <div className="reviews-header">
            <h2>What Our Students Say</h2>
            <p>Recent feedback from learners who completed classes this month.</p>
          </div>
          <div className="reviews-grid">
            <article className="review-card">
              <div className="review-meta">
                <strong>Riya Patil</strong>
                <span>Data Science • Weekend Batch</span>
              </div>
              <p>&ldquo;Before joining, I could not clean datasets properly. After 6 weeks, I built my first mini project and my interview confidence improved a lot.&rdquo;</p>
              <div className="review-foot">⭐ 4.8/5 • Posted 3 days ago</div>
            </article>
            <article className="review-card">
              <div className="review-meta">
                <strong>Aman Sharma</strong>
                <span>Python Basics • Evening Batch</span>
              </div>
              <p>&ldquo;The recorded sessions plus live doubt support really helped. I work full-time, so this format was practical and easy to follow.&rdquo;</p>
              <div className="review-foot">⭐ 4.7/5 • Posted 5 days ago</div>
            </article>
            <article className="review-card">
              <div className="review-meta">
                <strong>Neha Kulkarni</strong>
                <span>UI/UX Fundamentals • Morning Batch</span>
              </div>
              <p>&ldquo;Assignments were very real-world. My portfolio now has 3 proper case studies, and I got shortlisted for two internships this week.&rdquo;</p>
              <div className="review-foot">⭐ 4.9/5 • Posted 1 week ago</div>
            </article>
            <article className="review-card">
              <div className="review-meta">
                <strong>Harsh Verma</strong>
                <span>Web Development • Advanced Batch</span>
              </div>
              <p>&ldquo;Best part was the weekly code reviews. My mistakes reduced a lot and I finally understood when to use different frameworks.&rdquo;</p>
              <div className="review-foot">⭐ 4.8/5 • Posted 6 days ago</div>
            </article>
          </div>
        </section>
      )}

      <section id="myCoursesPanel" className={`courses-panel${coursePanelOpen ? ' open' : ''}`}>
        <div className="courses-panel-header">
          <h3 className="courses-panel-title">My Enrolled Courses</h3>
          <button id="closeCoursesPanel" className="courses-close" type="button" onClick={() => setCoursePanelOpen(false)}>Close ✕</button>
        </div>
        <div id="myCoursesGrid" className="courses-grid">
          {coursesLoading && <p style={{ color: 'var(--text-muted)', padding: '16px' }}>Loading your courses...</p>}
          {coursesError && <p style={{ color: '#dc2626', padding: '16px' }}>{coursesError}</p>}
          {courses.map((c, i) => (
            <article key={i} className="course-detail-card">
              <h4>{c.course_name || 'Untitled Course'}</h4>
              <p><strong>Credits:</strong> {c.credits ?? 'N/A'}</p>
              <p><strong>Department:</strong> {c.dept_name || 'N/A'}</p>
              <p><strong>Teacher:</strong> {c.teacher_name || 'N/A'}</p>
              <p><strong>Enrolled:</strong> {formatDate(c.enrollment_date)}</p>
              <a className="course-open-btn" href={addEnrolledFlag(c.video_path || '/courses')}>Open Course →</a>
            </article>
          ))}
        </div>
      </section>

      {!user && (
        <section className="cta" id="ctaSection">
          <h2>Ready to Start Learning?</h2>
          <p>Join thousands of students already building skills with Learnix.</p>
          <Link href="/signup">Get Started Free →</Link>
        </section>
      )}

      <footer><p>&copy; 2025 Learnix. All rights reserved.</p></footer>
    </>
  );
}
