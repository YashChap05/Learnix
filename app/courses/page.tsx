'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface User {
  email: string;
}

interface Subject {
  name: string;
  slug: string;
  badge: string;
  summary: string;
}

interface SubjectGroup {
  title: string;
  description: string;
  subjects: Subject[];
}

const SUBJECT_GROUPS: SubjectGroup[] = [
  {
    title: 'First Year',
    description: 'Core subjects for your first-year foundation.',
    subjects: [
      { name: 'DBMS', slug: 'dbms', badge: 'Foundation', summary: 'Database basics, SQL, normalization, and data modeling.' },
      { name: 'Operating Systems', slug: 'operating-systems', badge: 'Core', summary: 'Processes, memory, scheduling, and file systems.' },
      { name: 'CT', slug: 'ct', badge: 'Theory', summary: 'Computational thinking, logic building, and structured problem solving.' },
      { name: 'Telecommunication', slug: 'telecommunication', badge: 'Systems', summary: 'Signals, communication models, and transmission basics.' },
      { name: 'FinTech', slug: 'fintech', badge: 'Industry', summary: 'Digital payments, banking technology, and finance platforms.' },
    ],
  },
  {
    title: 'Second Year',
    description: 'Intermediate technical subjects to deepen your skills.',
    subjects: [
      { name: 'Data Structures', slug: 'data-structures', badge: 'Coding', summary: 'Arrays, trees, graphs, and problem solving.' },
      { name: 'Computer Networks', slug: 'computer-networks', badge: 'Core', summary: 'Protocols, routing, switching, and internet basics.' },
      { name: 'Java Programming', slug: 'java-programming', badge: 'Programming', summary: 'OOP, collections, exception handling, and apps.' },
      { name: 'Software Engineering', slug: 'software-engineering', badge: 'Project', summary: 'SDLC, testing, requirements, and teamwork.' },
      { name: 'Digital Electronics', slug: 'digital-electronics', badge: 'Lab', summary: 'Logic gates, circuits, and digital design fundamentals.' },
    ],
  },
  {
    title: 'Third Year',
    description: 'Advanced subjects focused on building specialization.',
    subjects: [
      { name: 'Machine Learning', slug: 'machine-learning', badge: 'Advanced', summary: 'Models, evaluation, features, and practical ML workflows.' },
      { name: 'Cloud Computing', slug: 'cloud-computing', badge: 'Infrastructure', summary: 'Cloud services, deployment, storage, and scaling.' },
      { name: 'Cyber Security', slug: 'cyber-security', badge: 'Security', summary: 'Threats, protection, secure systems, and awareness.' },
      { name: 'Web Technologies', slug: 'web-technologies', badge: 'Development', summary: 'Modern frontend, backend, APIs, and deployment.' },
      { name: 'Mobile App Development', slug: 'mobile-app-development', badge: 'Product', summary: 'App UI, architecture, APIs, and mobile workflows.' },
    ],
  },
  {
    title: 'Final Year',
    description: 'Capstone and specialization-ready subjects for senior students.',
    subjects: [
      { name: 'Artificial Intelligence', slug: 'artificial-intelligence', badge: 'Expert', summary: 'Reasoning, search, optimization, and AI applications.' },
      { name: 'Big Data Analytics', slug: 'big-data-analytics', badge: 'Data', summary: 'Large-scale data processing, analytics, and pipelines.' },
      { name: 'Internet of Things', slug: 'internet-of-things', badge: 'Embedded', summary: 'Sensors, devices, and connected systems.' },
      { name: 'Blockchain', slug: 'blockchain', badge: 'Emerging', summary: 'Distributed ledgers, consensus, and smart contract ideas.' },
      { name: 'Project Management', slug: 'project-management', badge: 'Career', summary: 'Planning, execution, delivery, and stakeholder coordination.' },
    ],
  },
  {
    title: 'Class 12',
    description: 'School-level subjects organized for Class 12 students.',
    subjects: [
      { name: 'Physics', slug: 'physics', badge: 'Boards', summary: 'Concepts, derivations, numericals, and revision support.' },
      { name: 'Chemistry', slug: 'chemistry', badge: 'Boards', summary: 'Organic, inorganic, physical chemistry, and practice.' },
      { name: 'Mathematics', slug: 'mathematics', badge: 'Boards', summary: 'Calculus, algebra, vectors, and exam-style problem solving.' },
      { name: 'English', slug: 'english', badge: 'Boards', summary: 'Writing, grammar, reading, and literature preparation.' },
      { name: 'Computer Science', slug: 'computer-science', badge: 'Boards', summary: 'Programming, SQL, practical prep, and theory revision.' },
    ],
  },
];

function subjectUrl(slug: string) {
  return `/subject-detail?subject=${slug}`;
}

export default function CoursesPage() {
  const [user, setUser] = useState<User | null>(null);
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
            <li><Link href="/dashboard">Dashboard</Link></li>
            <li><Link href="/courses">Courses</Link></li>
            <li><Link href="/about">About</Link></li>
          </ul>
        </nav>
        <div className="nav-actions" id="navActions">
          {user ? (
            <div className="profile-menu">
              <button
                className="profile-trigger"
                type="button"
                onClick={(e) => { e.stopPropagation(); setDropdownOpen((o) => !o); }}
              >
                {user.email || 'My Account'}
              </button>
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
        <section className="hero" style={{ paddingBottom: '24px' }}>
          <div className="transform-banner"><span>📘 Explore Our Courses</span></div>
          <h1>Choose Subjects by <span className="journey">Year</span></h1>
          <p className="subtitle">
            Browse year-wise subjects, open a dedicated page for each one, and enroll directly in the subject you want to study.
          </p>
        </section>

        <section className="section subject-catalog-section" style={{ paddingTop: 0 }}>
          <div className="catalog-intro">
            <h2>Year-Wise Subject Catalog</h2>
            <p>Each subject opens its own page when you click enroll, so students can go straight into the right course.</p>
          </div>
          <div id="subjectCatalog">
            {SUBJECT_GROUPS.map((group) => (
              <section key={group.title} className="subject-group">
                <div className="subject-group-header">
                  <div>
                    <h3>{group.title}</h3>
                    <p>{group.description}</p>
                  </div>
                </div>
                <div className="course-grid">
                  {group.subjects.map((subject) => (
                    <article key={subject.slug} className="course-card subject-card">
                      <div className="badge">{subject.badge}</div>
                      <h3>{subject.name}</h3>
                      <p>{subject.summary}</p>
                      <div className="course-meta">
                        <span>📚 Dedicated subject page</span>
                        <span>📝 Enrollment available</span>
                      </div>
                      <Link href={subjectUrl(subject.slug)} className="course-btn">Enroll Now</Link>
                      <Link href={subjectUrl(subject.slug)} className="course-btn sample-btn">Open Subject</Link>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </section>
      </main>

      <section className="cta">
        <h2>Start Learning Today</h2>
        <p>Pick your year, open the subject page, and begin learning with Learnix.</p>
        <Link href="/signup">Get Started Free →</Link>
      </section>

      <footer><p>&copy; 2025 Learnix. All rights reserved.</p></footer>
    </>
  );
}
