'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Department {
  dept_id: number;
  dept_name: string;
}

interface University {
  university_id: number;
  university_name: string;
}

type Role = 'student' | 'teacher' | 'university';

export default function SignupPage() {
  const [role, setRole] = useState<Role>('student');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/departments')
      .then((r) => r.json())
      .then((data) => setDepartments(data.departments || []))
      .catch(() => {});
    fetch('/api/universities')
      .then((r) => r.json())
      .then((data) => setUniversities(data.universities || []))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    const form = e.currentTarget;
    const formData = new FormData(form);
    try {
      const res = await fetch('/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        credentials: 'same-origin',
        body: new URLSearchParams(Array.from(formData.entries()).map(([k, v]) => [k, String(v)])),
        redirect: 'follow',
      });
      if (res.redirected) {
        window.location.href = res.url;
      } else if (!res.ok) {
        const text = await res.text();
        setError(text || 'Signup failed. Please try again.');
      }
    } catch {
      setError('Signup failed. Please try again.');
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
            <li><Link href="/about">About</Link></li>
          </ul>
        </nav>
        <div className="nav-actions">
          <Link href="/login" className="sign-in">Log In</Link>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="transform-banner"><span>Create Your Account</span></div>
          <h1>Join <span className="journey">Learnix</span></h1>
          <p className="subtitle">Choose your role and fill in only the fields that match you.</p>

          <div className="signup-tabs" id="signupTabs">
            {(['student', 'teacher', 'university'] as Role[]).map((r) => (
              <button
                key={r}
                type="button"
                className={`signup-tab${role === r ? ' active' : ''}`}
                aria-pressed={role === r}
                onClick={() => {
                  setRole(r);
                  setError('');
                }}
              >
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>

          <form id="signupForm" className="demo-form" onSubmit={handleSubmit}>
            <input type="hidden" name="role" value={role} />

            {role === 'student' && (
              <div className="signup-panel active" data-panel="student">
                <input type="text" name="username" placeholder="Student Name" required />
                <input type="email" name="email" placeholder="Email Address" required />
                <select name="branch" defaultValue="" required>
                  <option value="" disabled>Select Branch</option>
                  {departments.map((d) => (
                    <option key={d.dept_id} value={d.dept_name}>{d.dept_name}</option>
                  ))}
                </select>
                <input type="text" name="university_name" placeholder="University" list="universityList" required />
              </div>
            )}

            {role === 'teacher' && (
              <div className="signup-panel active" data-panel="teacher">
                <input type="text" name="username" placeholder="Teacher Name" required />
                <input type="email" name="email" placeholder="Email Address" required />
                <select name="branch" defaultValue="" required>
                  <option value="" disabled>Select Branch</option>
                  {departments.map((d) => (
                    <option key={d.dept_id} value={d.dept_name}>{d.dept_name}</option>
                  ))}
                </select>
                <input type="text" name="university_name" placeholder="University" list="universityList" required />
                <input type="text" name="subject" placeholder="Subject (Optional)" />
              </div>
            )}

            {role === 'university' && (
              <div className="signup-panel active" data-panel="university">
                <input type="text" name="university_name" placeholder="University Name" required />
                <input type="email" name="email" placeholder="University Email" required />
                <input type="text" name="principal_name" placeholder="Principal Name" required />
              </div>
            )}

            <input type="password" name="password" placeholder="Password (min. 6 characters)" minLength={6} required />
            <input type="password" name="confirmPassword" placeholder="Confirm Password" required />
            <button type="submit" className="get-started-free">Create Account</button>
          </form>

          <datalist id="universityList">
            {universities.map((u) => (
              <option key={u.university_id} value={u.university_name} />
            ))}
          </datalist>

          {error && <div className="status-msg error">{error}</div>}

          <p style={{ marginTop: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: 'var(--blue)', fontWeight: 700 }}>Log in here</Link>
          </p>
        </section>
      </main>

      <footer><p>&copy; 2025 Learnix. All rights reserved.</p></footer>
    </>
  );
}
