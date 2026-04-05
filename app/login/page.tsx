'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Department {
  dept_id: number;
  dept_name: string;
}

export default function LoginPage() {
  const [error, setError] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [role, setRole] = useState('');
  const [showBranch, setShowBranch] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('error')) {
      setError(decodeURIComponent(params.get('error') || ''));
    }
    fetch('/api/departments')
      .then((r) => r.json())
      .then((data) => setDepartments(data.departments || []))
      .catch(() => {});
  }, []);

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setRole(val);
    setShowBranch(val === 'student' || val === 'teacher');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    const form = e.currentTarget;
    const formData = new FormData(form);
    const email = (formData.get('username') as string || '').trim().toLowerCase();
    const password = formData.get('password') as string || '';
    const isAdmin = email === 'admin@gmail.com' && password === 'Admin@123';
    if (!isAdmin && !role) {
      setError('Please select a role before logging in.');
      return;
    }
    try {
      const res = await fetch('/login', {
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
        setError(text || 'Login failed. Please try again.');
      }
    } catch {
      setError('Login failed. Please try again.');
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
          <Link href="/signup" className="sign-up">Sign Up</Link>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="transform-banner"><span>Welcome Back</span></div>
          <h1>Log in to <span className="journey">Learnix</span></h1>
          <p className="subtitle">
            Use your email and password to sign in. The platform admin can log in directly without selecting a role.
          </p>

          <form className="demo-form" id="loginForm" onSubmit={handleSubmit}>
            <input type="email" name="username" id="loginEmail" placeholder="Email Address" required />
            <input
              type={showPwd ? 'text' : 'password'}
              name="password"
              id="loginPassword"
              placeholder="Password"
              required
            />

            <div className="show-password-toggle">
              <input
                type="checkbox"
                id="showPwd"
                checked={showPwd}
                onChange={(e) => setShowPwd(e.target.checked)}
              />
              <label htmlFor="showPwd">Show Password</label>
            </div>

            <select name="role" id="loginRole" value={role} onChange={handleRoleChange}>
              <option value="" disabled>Select Role</option>
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="university">University</option>
            </select>

            {showBranch && (
              <select name="branch" id="loginBranch" required>
                <option value="" disabled selected>Select Branch</option>
                {departments.map((d) => (
                  <option key={d.dept_id} value={d.dept_name}>{d.dept_name}</option>
                ))}
              </select>
            )}

            <button type="submit" className="get-started-free">Log In</button>
          </form>

          {error && (
            <div id="loginError" className="status-msg error">{error}</div>
          )}

          <p style={{ marginTop: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Don&apos;t have an account?{' '}
            <Link href="/signup" style={{ color: 'var(--blue)', fontWeight: 700 }}>Sign up free</Link>
          </p>
        </section>
      </main>

      <footer><p>&copy; 2025 Learnix. All rights reserved.</p></footer>
    </>
  );
}
