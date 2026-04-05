'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface User {
  username: string;
  email: string;
  role: string;
  university_name: string | null;
  department: string | null;
  subject: string | null;
  principal_name: string | null;
}

interface EnrolledCourse {
  course_name: string;
  credits: number | null;
  dept_name: string;
  teacher_name: string;
  enrollment_date: string;
  video_path: string;
}

function addEnrolledFlag(url: string) {
  return url + (url.includes('?') ? '&' : '?') + 'enrolled=1';
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch('/api/me', { credentials: 'same-origin' });
        if (!res.ok) {
          window.location.href = '/login';
          return;
        }
        const userData: User = await res.json();
        setUser(userData);

        if (userData.role === 'student') {
          const coursesRes = await fetch('/api/my-courses', { credentials: 'same-origin' });
          const coursesData = await coursesRes.json();
          setCourses(Array.isArray(coursesData.courses) ? coursesData.courses : []);
        }
      } catch {
        window.location.href = '/login';
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const initials = user
    ? (user.username || 'U').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  const roleLabel = user?.role === 'teacher' ? 'Teacher' : user?.role === 'university' ? 'University' : 'Student';

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
          <a href="/logout" className="schedule-demo">Sign Out</a>
        </div>
      </header>

      <main>
        <div className="profile-page">
          <div className="profile-card" id="profileCard">
            {loading && <div style={{ color: 'var(--text-muted)', padding: '20px 0' }}>Loading profile...</div>}
            {!loading && user && (
              <>
                <div className="profile-avatar">{initials}</div>
                <h2>{user.username || 'User'}</h2>
                <span className="profile-role">{roleLabel}</span>
                <div className="profile-fields">
                  <div className="profile-field">
                    <label>{user.role === 'university' ? 'University Name' : 'Name'}</label>
                    <span>{user.username || '-'}</span>
                  </div>
                  <div className="profile-field">
                    <label>Email Address</label>
                    <span>{user.email || '-'}</span>
                  </div>
                  <div className="profile-field">
                    <label>University</label>
                    <span>{user.university_name || (user.role === 'university' ? user.username || '-' : '-')}</span>
                  </div>
                  <div className="profile-field">
                    <label>Branch</label>
                    <span>{user.department || '-'}</span>
                  </div>
                  {user.role === 'teacher' && (
                    <div className="profile-field">
                      <label>Subject</label>
                      <span>{user.subject || '-'}</span>
                    </div>
                  )}
                  {user.role === 'university' && (
                    <div className="profile-field">
                      <label>Principal Name</label>
                      <span>{user.principal_name || '-'}</span>
                    </div>
                  )}
                  <div className="profile-field">
                    <label>Role</label>
                    <span style={{ textTransform: 'capitalize' }}>{user.role || '-'}</span>
                  </div>
                </div>
                <div style={{ marginTop: '24px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <Link href="/dashboard" className="get-started-free">Go to Dashboard</Link>
                  <Link href="/courses" className="schedule-demo">Browse Courses</Link>
                </div>
              </>
            )}
          </div>

          {courses.length > 0 && (
            <div style={{ marginTop: '32px' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0 0 16px' }}>My Enrolled Courses</h2>
              <div id="enrolledCourses" className="courses-grid">
                {courses.map((c, i) => (
                  <article key={i} className="course-detail-card">
                    <h4>{c.course_name || 'Course'}</h4>
                    <p><strong>Credits:</strong> {c.credits ?? 'N/A'}</p>
                    <p><strong>Department:</strong> {c.dept_name || 'N/A'}</p>
                    <p><strong>Teacher:</strong> {c.teacher_name || 'N/A'}</p>
                    <p><strong>Enrolled:</strong> {c.enrollment_date ? new Date(c.enrollment_date).toLocaleDateString() : 'N/A'}</p>
                    <a className="course-open-btn" href={addEnrolledFlag(c.video_path || '/courses')}>Open Course →</a>
                  </article>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <footer><p>&copy; 2025 Learnix. All rights reserved.</p></footer>
    </>
  );
}
