'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function DemoPage() {
  const [status, setStatus] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const name = (form.querySelector('#demoName') as HTMLInputElement)?.value.trim() || '';
    setStatus({ text: `✅ Thanks, ${name}! We'll reach out within 24 hours to schedule your demo.`, type: 'success' });
    form.reset();
    setTimeout(() => setStatus(null), 6000);
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
          <Link href="/signup" className="sign-up">Sign Up</Link>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="transform-banner"><span>📅 Book a Session</span></div>
          <h1>Schedule a <span className="journey">Demo</span></h1>
          <p className="subtitle">
            See Learnix in action. Fill in your details and we&apos;ll get in touch to set up a
            personalised walkthrough of the platform.
          </p>

          <form className="demo-form" id="demoForm" onSubmit={handleSubmit}>
            <input type="text" id="demoName" placeholder="Your Full Name" required />
            <input type="email" id="demoEmail" placeholder="Email Address" required />
            <input type="tel" id="demoPhone" placeholder="Phone Number (10 digits)" pattern="[0-9]{10}" maxLength={10} required />
            <select id="demoCourse" required>
              <option value="" disabled selected>Interested Course</option>
              <option>Web Development</option>
              <option>Python Programming</option>
              <option>Data Science</option>
              <option>UI / UX Design</option>
              <option>Other</option>
            </select>
            <textarea id="demoMsg" placeholder="Any specific questions or requirements? (optional)" rows={3} style={{ resize: 'vertical' }}></textarea>
            <button type="submit">Request Demo →</button>
          </form>

          {status && (
            <div id="demoStatus" className={`status-msg ${status.type}`}>{status.text}</div>
          )}
        </section>

        <section className="section why-learnix-section" style={{ marginTop: 0 }}>
          <div className="why-learnix-header">
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0 0 12px' }}>What to Expect</h2>
            <p style={{ color: 'var(--text-muted)' }}>Your free demo session includes:</p>
          </div>
          <div className="why-learnix-cards" style={{ maxWidth: '800px' }}>
            <div className="why-card">
              <div className="why-icon why-icon-blue"><span style={{ fontSize: '1.5rem' }}>🎯</span></div>
              <h3>Platform Walkthrough</h3>
              <p>A full tour of Learnix — courses, dashboard, performance tracking, and AI tools.</p>
            </div>
            <div className="why-card">
              <div className="why-icon why-icon-green"><span style={{ fontSize: '1.5rem' }}>💬</span></div>
              <h3>Live Q&amp;A</h3>
              <p>Ask anything about our courses, teaching methodology, or technical requirements.</p>
            </div>
            <div className="why-card">
              <div className="why-icon why-icon-orange"><span style={{ fontSize: '1.5rem' }}>🎁</span></div>
              <h3>Exclusive Trial Access</h3>
              <p>Get extended free access to sample videos and course content after your demo.</p>
            </div>
          </div>
        </section>
      </main>

      <footer><p>&copy; 2025 Learnix. All rights reserved.</p></footer>
    </>
  );
}
