'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function AboutPage() {
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    fetch('/api/me', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => setUser(u))
      .catch(() => {});

    const handleClick = () => setDropdownOpen(false);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

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
          {user ? (
            <div className="profile-menu">
              <button className="profile-trigger" type="button" onClick={(e) => { e.stopPropagation(); setDropdownOpen((open) => !open); }}>
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
        <section className="about-section">
          <div className="transform-banner" style={{ display: 'inline-block', marginBottom: '20px' }}>
            <span>🏫 About Us</span>
          </div>
          <h2>About <span style={{ color: 'var(--blue)' }}>Learnix</span></h2>
          <p>
            Learnix is a modern remote learning platform built to help students and professionals
            build real-world skills through flexible, mentor-led education. We believe that
            quality education should be accessible to everyone, anywhere.
          </p>
          <p>
            Our platform connects students with expert instructors, provides smart performance
            tracking, and offers AI-powered learning tools to make every study session more effective.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '16px', marginTop: '40px', textAlign: 'center' }}>
            <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '24px' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>👨‍🎓</div>
              <strong style={{ fontSize: '1.5rem', fontWeight: 800 }}>5,000+</strong>
              <p style={{ color: 'var(--text-muted)', margin: '4px 0 0', fontSize: '0.85rem' }}>Students Enrolled</p>
            </div>
            <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '24px' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📚</div>
              <strong style={{ fontSize: '1.5rem', fontWeight: 800 }}>4+</strong>
              <p style={{ color: 'var(--text-muted)', margin: '4px 0 0', fontSize: '0.85rem' }}>Expert Courses</p>
            </div>
            <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '24px' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>⭐</div>
              <strong style={{ fontSize: '1.5rem', fontWeight: 800 }}>4.8/5</strong>
              <p style={{ color: 'var(--text-muted)', margin: '4px 0 0', fontSize: '0.85rem' }}>Average Rating</p>
            </div>
            <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '24px' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🏆</div>
              <strong style={{ fontSize: '1.5rem', fontWeight: 800 }}>92%</strong>
              <p style={{ color: 'var(--text-muted)', margin: '4px 0 0', fontSize: '0.85rem' }}>Completion Rate</p>
            </div>
          </div>

          <div className="contact-card" style={{ marginTop: '40px' }}>
            <h3>📬 Contact Us</h3>
            <p><strong>Name:</strong> Yash Chaphekar</p>
            <p><strong>Phone:</strong> <a href="tel:8433661025">8433661025</a></p>
            <p><strong>Address:</strong> Mumbai, Maharashtra</p>
          </div>

          <div style={{ marginTop: '32px' }}>
            <Link href="/courses" className="get-started-free">Explore Courses →</Link>
          </div>
        </section>
      </main>

      <footer><p>&copy; 2025 Learnix. All rights reserved.</p></footer>
    </>
  );
}
