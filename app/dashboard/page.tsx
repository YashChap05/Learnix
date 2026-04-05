'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function DashboardPage() {
  const [navUser, setNavUser] = useState<{ email?: string; role?: string } | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    // All the dashboard JavaScript logic runs after the component mounts.
    // This approach preserves all original functionality while using Next.js page routing.

    const fmt = (v: unknown, sfx?: string) =>
      v === null || v === undefined || (typeof v === 'number' && isNaN(v)) ? 'N/A' : `${v}${sfx || ''}`;
    let teacherCache: Record<string, unknown>[] = [];
    let universityState: {
      enrollments: Record<string, unknown>[];
      courses: Record<string, unknown>[];
      teachers: Record<string, unknown>[];
      branches: Record<string, unknown>[];
      summary: Record<string, unknown>;
      selectedBranchId: number | null;
    } = { enrollments: [], courses: [], teachers: [], branches: [], summary: {}, selectedBranchId: null };
    let adminState: {
      summary: Record<string, unknown>;
      universities: Record<string, unknown>[];
      teachers: Record<string, unknown>[];
      students: Record<string, unknown>[];
      courses: Record<string, unknown>[];
      enrollments: Record<string, unknown>[];
      uploads: Record<string, unknown>[];
    } = { summary: {}, universities: [], teachers: [], students: [], courses: [], enrollments: [], uploads: [] };

    function escapeHtml(value: unknown) {
      return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function setStatusMessage(id: string, type: string, text: string) {
      const el = document.getElementById(id);
      if (!el) return;
      el.textContent = text;
      el.className = 'status-msg ' + (type || '');
      el.style.display = 'block';
    }

    function formatDate(value: unknown) {
      if (!value) return 'N/A';
      const parsed = new Date(String(value));
      return Number.isNaN(parsed.getTime()) ? 'N/A' : parsed.toLocaleDateString();
    }

    function renderPerformanceCards(perf: Record<string, unknown>[]) {
      const grid = document.getElementById('performanceGrid');
      if (!grid) return;
      if (!perf || perf.length === 0) {
        grid.innerHTML = `
          <div class="performance-empty">
            <h3>No performance data yet</h3>
            <p>Enroll in a course and your attendance and marks will appear here.</p>
            <a href="/courses" class="get-started-free" style="display:inline-block;margin-top:16px;">Browse Courses</a>
          </div>`;
        return;
      }
      grid.innerHTML = perf.map(item => {
        const scorePct = Number(item.score_pct);
        const attendancePct = Number(item.attendance_pct);
        const tag = isFinite(scorePct) && scorePct < 60 ? 'Needs Focus'
          : isFinite(attendancePct) && attendancePct < 75 ? 'Attendance Risk'
          : 'On Track';
        const tagClass = tag === 'Needs Focus' ? 'needs' : tag === 'Attendance Risk' ? 'risk' : '';
        const marks = (item.marks_obtained !== null && item.marks_total !== null)
          ? `${item.marks_obtained} / ${item.marks_total}` : 'N/A';
        return `
          <article class="performance-card">
            <div class="performance-head">
              <h3>${escapeHtml(item.course_name || 'Untitled Course')}</h3>
              <span class="performance-tag ${tagClass}">${tag}</span>
            </div>
            <div class="performance-metrics">
              <div class="metric-row">
                <span class="metric-label">Attendance</span>
                <span class="metric-value">${fmt(item.attendance_pct, '%')}</span>
              </div>
              <div class="metric-row">
                <span class="metric-label">Marks</span>
                <span class="metric-value">${marks}</span>
              </div>
              <div class="metric-row">
                <span class="metric-label">Score</span>
                <span class="metric-value">${fmt(item.score_pct, '%')}</span>
              </div>
            </div>
            <div class="performance-focus">
              <span>Focus Area</span>
              <p>${escapeHtml(item.focus_area || 'Keep practicing to improve.')}</p>
            </div>
          </article>`;
      }).join('');
    }

    function renderTeacherCards(students: Record<string, unknown>[]) {
      const grid = document.getElementById('teacherGrid');
      if (!grid) return;
      if (!students || students.length === 0) {
        grid.innerHTML = `
          <div class="performance-empty">
            <h3>No student data yet</h3>
            <p>Students who enroll in your courses will appear here.</p>
          </div>`;
        return;
      }
      grid.innerHTML = students.map(s => {
        const scorePct = Number(s.score_pct);
        const attendancePct = Number(s.attendance_pct);
        const tag = isFinite(scorePct) && scorePct < 60 ? 'Needs Focus'
          : isFinite(attendancePct) && attendancePct < 75 ? 'Attendance Risk'
          : 'On Track';
        const tagClass = tag === 'Needs Focus' ? 'needs' : tag === 'Attendance Risk' ? 'risk' : '';
        const marks = (s.marks_obtained !== null && s.marks_total !== null)
          ? `${s.marks_obtained} / ${s.marks_total}` : 'N/A';
        return `
          <article class="teacher-card">
            <div class="teacher-card-head">
              <div>
                <h3>${escapeHtml(s.student_name || 'Student')}</h3>
                <p>${escapeHtml(s.student_email || '')}</p>
              </div>
              <span class="performance-tag ${tagClass}">${tag}</span>
            </div>
            <div class="teacher-course">${escapeHtml(s.course_name || 'Course')}</div>
            <div class="performance-metrics">
              <div class="metric-row">
                <span class="metric-label">Attendance</span>
                <span class="metric-value">${fmt(s.attendance_pct, '%')}</span>
              </div>
              <div class="metric-row">
                <span class="metric-label">Marks</span>
                <span class="metric-value">${fmt(s.marks_obtained, '')}</span>
              </div>
              <div class="metric-row">
                <span class="metric-label">Score</span>
                <span class="metric-value">${fmt(s.score_pct, '%')}</span>
              </div>
            </div>
          </article>`;
      }).join('');
    }

    function renderBarChart(id: string, rows: Record<string, unknown>[], valKey: string, labelKey: string) {
      const el = document.getElementById(id);
      if (!el) return;
      if (!rows || rows.length === 0) { el.innerHTML = '<div class="chart-empty">No data yet.</div>'; return; }
      const max = Math.max(...rows.map(r => Number(r[valKey]) || 0), 1);
      el.innerHTML = rows.map(r => {
        const value = Number(r[valKey]) || 0;
        return `<div class="chart-row">
          <span class="chart-label">${escapeHtml(r[labelKey])}</span>
          <div class="chart-bar"><div class="chart-fill" style="width:${Math.round(value / max * 100)}%"></div></div>
          <span class="chart-value">${value}%</span>
        </div>`;
      }).join('');
    }

    function renderDonut(id: string, value: unknown, label: string, color: string) {
      const el = document.getElementById(id);
      if (!el) return;
      const numValue = Number(value);
      const safeValue = isFinite(numValue) ? Math.max(0, Math.min(100, numValue)) : 0;
      const radius = 44;
      const circumference = 2 * Math.PI * radius;
      const dash = (safeValue / 100) * circumference;
      el.innerHTML = `
        <div class="donut-wrap">
          <svg width="120" height="120" viewBox="0 0 120 120">
            <circle class="donut-bg" cx="60" cy="60" r="${radius}"></circle>
            <circle class="donut-fill" cx="60" cy="60" r="${radius}"
              style="stroke:${color || '#2563eb'};stroke-dasharray:${dash} ${circumference};"></circle>
          </svg>
          <div class="donut-center">
            <strong>${isFinite(numValue) ? Math.round(safeValue) + '%' : 'N/A'}</strong>
            <span>${escapeHtml(label)}</span>
          </div>
        </div>`;
    }

    function applyTeacherFilters() {
      const courseFilter = document.getElementById('teacherCourseFilter') as HTMLSelectElement;
      const nameFilter = document.getElementById('teacherNameFilter') as HTMLInputElement;
      const course = courseFilter?.value || 'all';
      const name = (nameFilter?.value || '').trim().toLowerCase();
      let filtered = course === 'all' ? teacherCache : teacherCache.filter(s => s.course_name === course);
      if (name) filtered = filtered.filter(s => (String(s.student_name || '')).toLowerCase().includes(name));
      renderTeacherCards(filtered);
      const topScores = filtered.filter(s => isFinite(Number(s.score_pct))).sort((a, b) => Number(b.score_pct) - Number(a.score_pct)).slice(0, 6).map(s => ({ label: s.student_name || 'Student', value: Math.round(Number(s.score_pct)) }));
      const topAttendance = filtered.filter(s => isFinite(Number(s.attendance_pct))).sort((a, b) => Number(b.attendance_pct) - Number(a.attendance_pct)).slice(0, 6).map(s => ({ label: s.student_name || 'Student', value: Math.round(Number(s.attendance_pct)) }));
      renderBarChart('scoreChart', topScores as Record<string, unknown>[], 'value', 'label');
      renderBarChart('attendanceChart', topAttendance as Record<string, unknown>[], 'value', 'label');
    }

    async function loadTeacherUploadCourses() {
      const select = document.getElementById('teacherUploadCourse') as HTMLSelectElement;
      if (!select) return;
      try {
        const res = await fetch('/api/teacher/courses', { credentials: 'same-origin' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load courses');
        const courses: Record<string, unknown>[] = Array.isArray(data.courses) ? data.courses : [];
        select.innerHTML = '<option value="">Select course</option>' + courses.map(c => `<option value="${c.course_id}">${escapeHtml(c.course_name)}</option>`).join('');
      } catch (e: unknown) {
        setStatusMessage('teacherUploadMsg', 'error', e instanceof Error ? e.message : 'Unable to load courses.');
      }
    }

    async function handleTeacherVideoUpload(event: Event) {
      event.preventDefault();
      const button = document.getElementById('teacherUploadBtn') as HTMLButtonElement;
      const courseSelect = document.getElementById('teacherUploadCourse') as HTMLSelectElement;
      const fileInput = document.getElementById('teacherUploadVideo') as HTMLInputElement;
      const courseId = Number(courseSelect?.value || 0);
      const file = fileInput?.files?.[0];
      if (!courseId) { setStatusMessage('teacherUploadMsg', 'error', 'Please select a course.'); return; }
      if (!file) { setStatusMessage('teacherUploadMsg', 'error', 'Please choose a video file to upload.'); return; }
      button.disabled = true;
      button.textContent = 'Uploading...';
      const formData = new FormData();
      formData.append('courseId', String(courseId));
      formData.append('courseVideo', file);
      try {
        const res = await fetch('/api/teacher/upload-video', { method: 'POST', body: formData, credentials: 'same-origin' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload failed');
        fileInput.value = '';
        setStatusMessage('teacherUploadMsg', 'success', `Uploaded for ${data.courseName}. Students can now open this video from their enrolled courses.`);
        await loadTeacherUploadCourses();
      } catch (e: unknown) {
        setStatusMessage('teacherUploadMsg', 'error', e instanceof Error ? e.message : 'Upload failed');
      } finally {
        button.disabled = false;
        button.textContent = 'Upload Video';
      }
    }

    async function loadStudentDashboard() {
      try {
        const res = await fetch('/api/student-performance', { credentials: 'same-origin' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed');
        const performance: Record<string, unknown>[] = Array.isArray(data.performance) ? data.performance : [];
        const statusEl = document.getElementById('studentStatus');
        if (statusEl) statusEl.textContent = performance.length === 0 ? 'Awaiting data' : 'Up to date';
        renderPerformanceCards(performance);
      } catch {
        const statusEl = document.getElementById('studentStatus');
        if (statusEl) statusEl.textContent = 'Unavailable';
        renderPerformanceCards([]);
      }
    }

    async function loadTeacherDashboard() {
      const section = document.getElementById('teacherSection');
      try {
        const res = await fetch('/api/teacher/students-performance', { credentials: 'same-origin' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed');
        const students: Record<string, unknown>[] = Array.isArray(data.students) ? data.students : [];
        const summary = data.summary || {};
        teacherCache = students;
        if (section) section.style.display = 'block';
        await loadTeacherUploadCourses();
        const courseFilter = document.getElementById('teacherCourseFilter') as HTMLSelectElement;
        if (courseFilter) {
          courseFilter.innerHTML = '<option value="all">All Courses</option>';
          [...Array.from(new Set(students.map(s => s.course_name).filter(Boolean)))].forEach(courseName => {
            const option = document.createElement('option');
            option.value = String(courseName);
            option.textContent = String(courseName);
            courseFilter.appendChild(option);
          });
          courseFilter.onchange = applyTeacherFilters;
        }
        const nameFilter = document.getElementById('teacherNameFilter') as HTMLInputElement;
        if (nameFilter) nameFilter.oninput = applyTeacherFilters;
        const countEl = document.getElementById('teacherStudentCount');
        if (countEl) countEl.textContent = String(summary.student_count ?? 0);
        const avgAttEl = document.getElementById('teacherAvgAttendance');
        if (avgAttEl) avgAttEl.textContent = summary.avg_attendance_pct != null ? summary.avg_attendance_pct + '%' : 'N/A';
        const avgScEl = document.getElementById('teacherAvgScore');
        if (avgScEl) avgScEl.textContent = summary.avg_score_pct != null ? summary.avg_score_pct + '%' : 'N/A';
        const statusEl = document.getElementById('teacherStatus');
        if (statusEl) statusEl.textContent = students.length === 0 ? 'Awaiting data' : 'Up to date';
        applyTeacherFilters();
        renderDonut('scoreDonut', summary.avg_score_pct, 'Avg Score', '#2563eb');
        renderDonut('attendanceDonut', summary.avg_attendance_pct, 'Avg Attendance', '#22c55e');
        const uploadForm = document.getElementById('teacherUploadForm');
        if (uploadForm) uploadForm.addEventListener('submit', handleTeacherVideoUpload);
      } catch {
        if (section) section.style.display = 'none';
      }
    }

    function getSelectedBranch() {
      return (universityState.branches || []).find((b) => Number(b.dept_id) === Number(universityState.selectedBranchId)) || null;
    }

    function renderUniversitySummary() {
      const s = universityState.summary || {};
      const elMap: Record<string, string> = {
        universityStudentCount: String(s.total_students ?? 0),
        universityTeacherCount: String(s.total_teachers ?? 0),
        universityCourseCount: String(s.total_courses ?? 0),
        universityUploadCount: String(s.uploaded_videos ?? 0),
      };
      Object.entries(elMap).forEach(([id, val]) => { const el = document.getElementById(id); if (el) el.textContent = val; });
    }

    function renderUniversityBranches() {
      const container = document.getElementById('universityBranchSections');
      if (!container) return;
      const branches = universityState.branches || [];
      if (branches.length === 0) {
        container.innerHTML = '<div class="performance-empty"><h3>No branch information yet</h3><p>Students and teachers will appear inside their branch sections once they register.</p></div>';
        return;
      }
      container.innerHTML = branches.map(b => `
        <button type="button" class="branch-selector ${Number(universityState.selectedBranchId) === Number(b.dept_id) ? 'active' : ''}" data-branch-id="${b.dept_id}">
          <strong>${escapeHtml(b.dept_name || 'Branch')}</strong>
          <span>${(b.students as unknown[]).length} students</span>
          <span>${(b.teachers as unknown[]).length} teachers</span>
        </button>`).join('');
    }

    function renderSelectedBranchDetail() {
      const detail = document.getElementById('universityBranchDetail');
      if (!detail) return;
      const branch = getSelectedBranch();
      if (!branch) { detail.innerHTML = '<div class="chart-empty">Select a branch to view its details.</div>'; return; }
      const students = branch.students as Record<string, unknown>[];
      const teachers = branch.teachers as Record<string, unknown>[];
      detail.innerHTML = `
        <section class="branch-section">
          <div class="branch-section-head"><div><h3>${escapeHtml(branch.dept_name || 'Branch')}</h3><p>${students.length} students and ${teachers.length} teachers</p></div></div>
          <div class="branch-section-grid">
            <div class="branch-column">
              <h4>Students</h4>
              ${students.length ? students.map(s => `<article class="branch-mini-card"><strong>${escapeHtml(s.student_name)}</strong><span>${escapeHtml(s.student_email)}</span></article>`).join('') : '<div class="chart-empty">No students in this branch yet.</div>'}
            </div>
            <div class="branch-column">
              <h4>Teachers</h4>
              ${teachers.length ? teachers.map(t => `<article class="branch-mini-card"><strong>${escapeHtml(t.teacher_name)}</strong><span>${escapeHtml(t.teacher_email)}</span><small>${escapeHtml(t.subject || 'No subject assigned')}</small></article>`).join('') : '<div class="chart-empty">No teachers in this branch yet.</div>'}
            </div>
          </div>
        </section>`;
    }

    function renderUniversityEnrollments() {
      const grid = document.getElementById('universityEnrollmentGrid');
      if (!grid) return;
      const branch = getSelectedBranch();
      if (!branch) {
        grid.innerHTML = '<div class="performance-empty"><h3>Select a branch first</h3><p>Branch-specific enrollment management will appear here after you choose a branch.</p></div>';
        return;
      }
      const enrollments = (universityState.enrollments || []).filter(r => String(r.dept_name || '') === String(branch.dept_name || ''));
      const courses = universityState.courses || [];
      if (enrollments.length === 0) {
        grid.innerHTML = `<div class="performance-empty"><h3>No student enrollments in ${escapeHtml(branch.dept_name)}</h3><p>Student enrollments for this branch will appear here.</p></div>`;
        return;
      }
      grid.innerHTML = enrollments.map(row => {
        const courseOptions = courses.filter(c => Number(c.course_id) !== Number(row.course_id)).map(c => `<option value="${c.course_id}">${escapeHtml(c.course_name)}</option>`).join('');
        return `
          <article class="teacher-card">
            <div class="teacher-card-head"><div><h3>${escapeHtml(row.student_name || 'Student')}</h3><p>${escapeHtml(row.student_email || '')}</p></div><span class="performance-tag">Enrolled</span></div>
            <div class="teacher-course">${escapeHtml(row.course_name || 'Course')}</div>
            <div class="performance-metrics">
              <div class="metric-row"><span class="metric-label">Teacher</span><span class="metric-value">${escapeHtml(row.teacher_name || 'Unassigned')}</span></div>
              <div class="metric-row"><span class="metric-label">Enrolled On</span><span class="metric-value">${formatDate(row.enrollment_date)}</span></div>
            </div>
            <div class="performance-focus">
              <span>Change Course</span>
              <div class="university-action-row">
                <select id="courseChange-${row.enrollment_id}" class="university-select"><option value="">Select new course</option>${courseOptions}</select>
                <button class="schedule-demo university-action-btn" data-action="change-course" data-enrollment-id="${row.enrollment_id}">Change</button>
              </div>
            </div>
            <div class="university-action-row" style="margin-top:14px;">
              <button class="get-started-free university-action-btn university-danger-btn" data-action="remove-enrollment" data-enrollment-id="${row.enrollment_id}">Remove From Course</button>
            </div>
          </article>`;
      }).join('');
    }

    function renderUniversityTeachers() {
      const grid = document.getElementById('universityTeacherGrid');
      if (!grid) return;
      const branch = getSelectedBranch();
      if (!branch) { grid.innerHTML = '<div class="performance-empty"><h3>Select a branch first</h3><p>Teacher performance will appear here after you choose a branch.</p></div>'; return; }
      const teachers = (universityState.teachers || []).filter(t => String(t.dept_name || '') === String(branch.dept_name || ''));
      if (teachers.length === 0) { grid.innerHTML = `<div class="performance-empty"><h3>No teachers in ${escapeHtml(branch.dept_name)}</h3></div>`; return; }
      grid.innerHTML = teachers.map(t => `
        <article class="teacher-card">
          <div class="teacher-card-head"><div><h3>${escapeHtml(t.teacher_name || 'Teacher')}</h3><p>${escapeHtml(t.teacher_email || '')}</p></div><span class="performance-tag">${t.student_count || 0} Students</span></div>
          <div class="teacher-course">${escapeHtml(t.dept_name || 'No Department')}</div>
          <div class="performance-metrics">
            <div class="metric-row"><span class="metric-label">Avg Attendance</span><span class="metric-value">${fmt(t.avg_attendance_pct, '%')}</span></div>
            <div class="metric-row"><span class="metric-label">Avg Score</span><span class="metric-value">${fmt(t.avg_score_pct, '%')}</span></div>
          </div>
        </article>`).join('');
    }

    function renderUniversityUploads() {
      const grid = document.getElementById('universityUploadGrid');
      if (!grid) return;
      const branch = getSelectedBranch();
      if (!branch) { grid.innerHTML = '<div class="performance-empty"><h3>Select a branch first</h3></div>'; return; }
      const uploads = (universityState.courses || []).filter(c => String(c.video_path || '').startsWith('/uploads/') && String(c.dept_name || '') === String(branch.dept_name || ''));
      if (uploads.length === 0) { grid.innerHTML = `<div class="performance-empty"><h3>No uploaded files in ${escapeHtml(branch.dept_name)}</h3></div>`; return; }
      grid.innerHTML = uploads.map(c => `
        <article class="teacher-card">
          <div class="teacher-card-head"><div><h3>${escapeHtml(c.course_name || 'Course')}</h3><p>${escapeHtml(c.dept_name || '')}</p></div><span class="performance-tag">Uploaded File</span></div>
          <div class="teacher-course">${escapeHtml(c.teacher_name || 'Teacher not assigned')}</div>
          <div class="performance-metrics"><div class="metric-row"><span class="metric-label">Video Path</span><span class="metric-value">${escapeHtml(c.video_path || '')}</span></div></div>
          <div class="university-action-row">
            <button class="get-started-free university-action-btn university-danger-btn" data-action="delete-upload" data-course-id="${c.course_id}">Delete File</button>
          </div>
        </article>`).join('');
    }

    async function postJson(url: string, body: Record<string, unknown>) {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(body || {}) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      return data;
    }

    async function loadUniversityDashboard() {
      const section = document.getElementById('universitySection');
      try {
        const res = await fetch('/api/university/dashboard', { credentials: 'same-origin' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed');
        universityState = { summary: data.summary || {}, enrollments: Array.isArray(data.enrollments) ? data.enrollments : [], courses: Array.isArray(data.courses) ? data.courses : [], teachers: Array.isArray(data.teachers) ? data.teachers : [], branches: Array.isArray(data.branches) ? data.branches : [], selectedBranchId: null };
        if (section) section.style.display = 'block';
        const statusEl = document.getElementById('universityStatus');
        if (statusEl) statusEl.textContent = 'Up to date';
        renderUniversitySummary();
        renderUniversityBranches();
        renderSelectedBranchDetail();
        renderUniversityEnrollments();
        renderUniversityTeachers();
        renderUniversityUploads();

        // Branch selector event delegation
        const branchSections = document.getElementById('universityBranchSections');
        if (branchSections) {
          branchSections.addEventListener('click', (e) => {
            const btn = (e.target as HTMLElement).closest('[data-branch-id]') as HTMLElement;
            if (!btn) return;
            universityState.selectedBranchId = Number(btn.dataset.branchId);
            renderUniversityBranches();
            renderSelectedBranchDetail();
            renderUniversityEnrollments();
            renderUniversityTeachers();
            renderUniversityUploads();
          });
        }

        // Enrollment action event delegation
        const enrollmentGrid = document.getElementById('universityEnrollmentGrid');
        if (enrollmentGrid) {
          enrollmentGrid.addEventListener('click', async (e) => {
            const btn = (e.target as HTMLElement).closest('[data-action]') as HTMLElement;
            if (!btn) return;
            const action = btn.dataset.action;
            const enrollmentId = Number(btn.dataset.enrollmentId);
            const statusMsg = 'universityStatusMsg';
            if (action === 'remove-enrollment') {
              try {
                await postJson('/api/university/enrollments/remove', { enrollmentId });
                setStatusMessage(statusMsg, 'success', 'Student removed from course.');
                const res = await fetch('/api/university/dashboard', { credentials: 'same-origin' });
                const data = await res.json();
                universityState.enrollments = Array.isArray(data.enrollments) ? data.enrollments : [];
                renderUniversityEnrollments();
              } catch (err: unknown) {
                setStatusMessage(statusMsg, 'error', err instanceof Error ? err.message : 'Failed');
              }
            } else if (action === 'change-course') {
              const sel = document.getElementById(`courseChange-${enrollmentId}`) as HTMLSelectElement;
              const newCourseId = Number(sel?.value || 0);
              if (!newCourseId) { setStatusMessage(statusMsg, 'error', 'Please select a course.'); return; }
              try {
                const data = await postJson('/api/university/enrollments/change', { enrollmentId, newCourseId });
                setStatusMessage(statusMsg, 'success', `Student moved to ${data.courseName}.`);
                const res = await fetch('/api/university/dashboard', { credentials: 'same-origin' });
                const dashData = await res.json();
                universityState.enrollments = Array.isArray(dashData.enrollments) ? dashData.enrollments : [];
                renderUniversityEnrollments();
              } catch (err: unknown) {
                setStatusMessage(statusMsg, 'error', err instanceof Error ? err.message : 'Failed');
              }
            } else if (action === 'delete-upload') {
              const courseId = Number(btn.dataset.courseId);
              try {
                await postJson('/api/university/courses/remove-video', { courseId });
                setStatusMessage(statusMsg, 'success', 'Uploaded file deleted.');
                const res = await fetch('/api/university/dashboard', { credentials: 'same-origin' });
                const dashData = await res.json();
                universityState.courses = Array.isArray(dashData.courses) ? dashData.courses : [];
                renderUniversityUploads();
              } catch (err: unknown) {
                setStatusMessage(statusMsg, 'error', err instanceof Error ? err.message : 'Failed');
              }
            }
          });
        }
      } catch (error: unknown) {
        if (section) section.style.display = 'block';
        const statusEl = document.getElementById('universityStatus');
        if (statusEl) statusEl.textContent = 'Unavailable';
        setStatusMessage('universityStatusMsg', 'error', error instanceof Error ? error.message : 'Unable to load university dashboard.');
      }
    }

    function renderAdminSummary() {
      const s = adminState.summary || {};
      const el = document.getElementById('adminSummary');
      if (!el) return;
      el.innerHTML = [
        ['Universities', s.total_universities ?? 0],
        ['Teachers', s.total_teachers ?? 0],
        ['Students', s.total_students ?? 0],
        ['Courses', s.total_courses ?? 0],
        ['Enrollments', s.total_enrollments ?? 0],
        ['Uploaded Videos', s.total_uploads ?? 0],
      ].map(([label, value]) => `
        <div class="admin-summary-card">
          <span>${label}</span>
          <strong>${value}</strong>
        </div>`).join('');
    }

    function renderAdminList(id: string, items: Record<string, unknown>[], renderFn: (item: Record<string, unknown>) => string) {
      const el = document.getElementById(id);
      if (!el) return;
      if (!items || items.length === 0) { el.innerHTML = '<div class="performance-empty"><h3>No items yet</h3></div>'; return; }
      el.innerHTML = items.map(renderFn).join('');
    }

    function renderAdminSection() {
      renderAdminSummary();
      renderAdminList('adminUniversityList', adminState.universities, u => `
        <article class="admin-item">
          <div class="admin-item-head"><div><h4>${escapeHtml(u.university_name || 'University')}</h4><p>${escapeHtml(u.email || '')}</p></div></div>
          <div class="admin-meta"><span>Principal: ${escapeHtml(u.principal_name || 'N/A')}</span></div>
          <div class="admin-actions">
            <button class="get-started-free admin-action-btn" data-action="delete-university" data-id="${u.university_id}">Delete</button>
          </div>
        </article>`);
      renderAdminList('adminTeacherList', adminState.teachers, t => `
        <article class="admin-item">
          <div class="admin-item-head"><div><h4>${escapeHtml(t.name || 'Teacher')}</h4><p>${escapeHtml(t.email || '')}</p></div></div>
          <div class="admin-meta"><span>Dept: ${escapeHtml(t.dept_name || 'N/A')}</span><span>University: ${escapeHtml(t.university_name || 'N/A')}</span></div>
          <div class="admin-actions">
            <button class="get-started-free admin-action-btn" data-action="delete-teacher" data-id="${t.teacher_id}">Delete</button>
          </div>
        </article>`);
      renderAdminList('adminStudentList', adminState.students, s => `
        <article class="admin-item">
          <div class="admin-item-head"><div><h4>${escapeHtml(s.username || 'Student')}</h4><p>${escapeHtml(s.email || '')}</p></div></div>
          <div class="admin-meta"><span>Dept: ${escapeHtml(s.dept_name || 'N/A')}</span><span>University: ${escapeHtml(s.university_name || 'N/A')}</span></div>
          <div class="admin-actions">
            <button class="get-started-free admin-action-btn" data-action="delete-student" data-id="${s.id}">Delete</button>
          </div>
        </article>`);
      renderAdminList('adminCourseList', adminState.courses, c => `
        <article class="admin-item">
          <div class="admin-item-head"><div><h4>${escapeHtml(c.course_name || 'Course')}</h4></div></div>
          <div class="admin-meta"><span>Dept: ${escapeHtml(c.dept_name || 'N/A')}</span><span>Teacher: ${escapeHtml(c.teacher_name || 'Unassigned')}</span></div>
          <div class="admin-actions">
            <button class="get-started-free admin-action-btn" data-action="delete-course" data-id="${c.course_id}">Delete</button>
          </div>
        </article>`);
      renderAdminList('adminEnrollmentList', adminState.enrollments, e => `
        <article class="admin-item">
          <div class="admin-item-head"><div><h4>${escapeHtml(e.student_name || 'Student')}</h4><p>${escapeHtml(e.course_name || 'Course')}</p></div></div>
          <div class="admin-meta"><span>Enrolled: ${formatDate(e.enrollment_date)}</span></div>
          <div class="admin-actions">
            <button class="get-started-free admin-action-btn" data-action="delete-enrollment" data-id="${e.enrollment_id}">Delete</button>
          </div>
        </article>`);
      renderAdminList('adminUploadList', adminState.uploads, u => `
        <article class="admin-item">
          <div class="admin-item-head"><div><h4>${escapeHtml(u.course_name || 'Course')}</h4><p>${escapeHtml(u.video_path || '')}</p></div></div>
          <div class="admin-actions">
            <button class="get-started-free admin-action-btn" data-action="delete-upload" data-id="${u.course_id}">Delete Upload</button>
          </div>
        </article>`);
    }

    async function loadAdminDashboard() {
      const section = document.getElementById('adminSection');
      try {
        const res = await fetch('/api/admin/dashboard', { credentials: 'same-origin' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed');
        adminState = {
          summary: data.summary || {},
          universities: Array.isArray(data.universities) ? data.universities : [],
          teachers: Array.isArray(data.teachers) ? data.teachers : [],
          students: Array.isArray(data.students) ? data.students : [],
          courses: Array.isArray(data.courses) ? data.courses : [],
          enrollments: Array.isArray(data.enrollments) ? data.enrollments : [],
          uploads: Array.isArray(data.uploads) ? data.uploads : [],
        };
        if (section) section.style.display = 'block';
        const statusEl = document.getElementById('adminStatus');
        if (statusEl) statusEl.textContent = 'Up to date';
        renderAdminSection();

        // Admin action event delegation
        const adminMain = document.getElementById('adminSection');
        if (adminMain) {
          adminMain.addEventListener('click', async (e) => {
            const btn = (e.target as HTMLElement).closest('[data-action]') as HTMLElement;
            if (!btn) return;
            const action = btn.dataset.action || '';
            const id = Number(btn.dataset.id);
            const statusMsgId = 'adminStatusMsg';
            try {
              if (action === 'delete-university') {
                await postJson('/api/admin/universities/delete', { universityId: id });
                adminState.universities = adminState.universities.filter(u => Number(u.university_id) !== id);
              } else if (action === 'delete-teacher') {
                await postJson('/api/admin/teachers/delete', { teacherId: id });
                adminState.teachers = adminState.teachers.filter(t => Number(t.teacher_id) !== id);
              } else if (action === 'delete-student') {
                await postJson('/api/admin/students/delete', { studentId: id });
                adminState.students = adminState.students.filter(s => Number(s.id) !== id);
              } else if (action === 'delete-course') {
                await postJson('/api/admin/courses/delete', { courseId: id });
                adminState.courses = adminState.courses.filter(c => Number(c.course_id) !== id);
              } else if (action === 'delete-enrollment') {
                await postJson('/api/admin/enrollments/delete', { enrollmentId: id });
                adminState.enrollments = adminState.enrollments.filter(en => Number(en.enrollment_id) !== id);
              } else if (action === 'delete-upload') {
                await postJson('/api/admin/uploads/delete', { courseId: id });
                adminState.uploads = adminState.uploads.filter(u => Number(u.course_id) !== id);
              }
              setStatusMessage(statusMsgId, 'success', 'Done.');
              renderAdminSection();
            } catch (err: unknown) {
              setStatusMessage(statusMsgId, 'error', err instanceof Error ? err.message : 'Failed');
            }
          });
        }
      } catch (error: unknown) {
        if (section) section.style.display = 'block';
        const statusEl = document.getElementById('adminStatus');
        if (statusEl) statusEl.textContent = 'Unavailable';
        setStatusMessage('adminStatusMsg', 'error', error instanceof Error ? error.message : 'Unable to load admin dashboard.');
      }
    }

    // Main init: fetch user and load appropriate dashboard
    fetch('/api/me', { credentials: 'same-origin' })
      .then(r => { if (!r.ok) { window.location.href = '/login'; return null; } return r.json(); })
      .then(user => {
        if (!user) return;
        setNavUser(user);
        const titleEl = document.getElementById('welcomeTitle');
        const userEl = document.getElementById('welcomeUser');
        if (titleEl) titleEl.innerHTML = `${escapeHtml(user.username || 'Welcome')}&apos;s <span class="journey">Dashboard</span>`;
        if (userEl) userEl.textContent = `Logged in as: ${user.email || ''}`;

        if (user.role === 'student') {
          const section = document.getElementById('studentSection');
          if (section) section.style.display = 'block';
          loadStudentDashboard();
        } else if (user.role === 'teacher') {
          loadTeacherDashboard();
        } else if (user.role === 'university') {
          loadUniversityDashboard();
        } else if (user.role === 'admin') {
          loadAdminDashboard();
        }
      })
      .catch(() => { window.location.href = '/login'; });

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
          {navUser ? (
            <div className="profile-menu">
              <button
                className="profile-trigger"
                type="button"
                onClick={(e) => { e.stopPropagation(); setDropdownOpen((open) => !open); }}
              >
                {navUser.email || 'My Account'}
              </button>
              <div className={`profile-dropdown${dropdownOpen ? ' open' : ''}`}>
                <div className="profile-email">{navUser.email || ''}</div>
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
        <section className="hero" style={{ paddingBottom: '32px' }}>
          <div className="transform-banner"><span>Welcome</span></div>
          <h1 id="welcomeTitle">Your <span className="journey">Dashboard</span></h1>
          <p className="subtitle" id="welcomeUser">Loading your profile...</p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/courses" className="get-started-free">Browse Courses</Link>
            <Link href="/profile" className="schedule-demo">My Profile</Link>
          </div>
        </section>

        {/* Student Section */}
        <section className="dashboard-section" id="studentSection" style={{ display: 'none' }}>
          <div className="dashboard-header">
            <div>
              <span className="dashboard-kicker">Student Dashboard</span>
              <h2>Performance Overview</h2>
              <p>Track your attendance, marks, and focus areas across enrolled courses.</p>
            </div>
            <div className="dashboard-badge" id="studentStatus">Loading...</div>
          </div>
          <div id="performanceGrid" className="performance-grid">
            <div className="performance-card loading">
              <h3 style={{ margin: '0 0 8px' }}>Loading performance data...</h3>
              <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>Please wait.</p>
            </div>
          </div>
        </section>

        {/* Teacher Section */}
        <section className="dashboard-section" id="teacherSection" style={{ display: 'none' }}>
          <div className="dashboard-header">
            <div>
              <span className="dashboard-kicker">Teacher Dashboard</span>
              <h2>Student Performance</h2>
              <p>Review attendance and marks for each enrolled student across your courses.</p>
            </div>
            <div className="dashboard-badge" id="teacherStatus">Loading...</div>
          </div>
          <div className="teacher-filters">
            <label><span>Course</span><select id="teacherCourseFilter"><option value="all">All Courses</option></select></label>
            <label><span>Student Name</span><input id="teacherNameFilter" type="text" placeholder="Search student..." /></label>
          </div>
          <div className="teacher-summary">
            <div className="teacher-summary-card"><span>Total Students</span><strong id="teacherStudentCount">0</strong></div>
            <div className="teacher-summary-card"><span>Avg Attendance</span><strong id="teacherAvgAttendance">N/A</strong></div>
            <div className="teacher-summary-card"><span>Avg Score</span><strong id="teacherAvgScore">N/A</strong></div>
          </div>
          <div className="subject-panel" style={{ margin: '16px 0 8px' }}>
            <h3 style={{ margin: '0 0 12px' }}>Upload Course Video</h3>
            <p style={{ margin: '0 0 12px', color: 'var(--text-muted)' }}>Upload your lecture video so enrolled students can open and watch it.</p>
            <form id="teacherUploadForm" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'end' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '220px' }}>
                <span>Course</span>
                <select id="teacherUploadCourse" required><option value="">Select course</option></select>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '240px' }}>
                <span>Video file</span>
                <input id="teacherUploadVideo" type="file" accept="video/*" required />
              </label>
              <button className="get-started-free" id="teacherUploadBtn" type="submit">Upload Video</button>
            </form>
            <div id="teacherUploadMsg" className="status-msg" style={{ display: 'none', marginTop: '10px' }}></div>
          </div>
          <div id="teacherGrid" className="teacher-grid">
            <div className="teacher-card loading"><h3 style={{ margin: 0 }}>Loading students...</h3></div>
          </div>
          <div className="teacher-visuals">
            <div className="teacher-chart-card"><h3>Top Scores</h3><div id="scoreChart" className="teacher-bar-chart"></div></div>
            <div className="teacher-chart-card"><h3>Attendance Overview</h3><div id="attendanceChart" className="teacher-bar-chart"></div></div>
            <div className="teacher-chart-card"><h3>Average Score</h3><div id="scoreDonut" className="teacher-donut"></div></div>
            <div className="teacher-chart-card"><h3>Average Attendance</h3><div id="attendanceDonut" className="teacher-donut"></div></div>
          </div>
        </section>

        {/* University Section */}
        <section className="dashboard-section" id="universitySection" style={{ display: 'none' }}>
          <div className="dashboard-header">
            <div>
              <span className="dashboard-kicker">University Dashboard</span>
              <h2>Control Center</h2>
              <p>Manage enrollments, remove wrong teacher uploads, and review teacher performance.</p>
            </div>
            <div className="dashboard-badge" id="universityStatus">Loading...</div>
          </div>
          <div className="teacher-summary">
            <div className="teacher-summary-card"><span>Total Students</span><strong id="universityStudentCount">0</strong></div>
            <div className="teacher-summary-card"><span>Total Teachers</span><strong id="universityTeacherCount">0</strong></div>
            <div className="teacher-summary-card"><span>Total Courses</span><strong id="universityCourseCount">0</strong></div>
            <div className="teacher-summary-card"><span>Uploaded Videos</span><strong id="universityUploadCount">0</strong></div>
          </div>
          <div id="universityStatusMsg" className="status-msg" style={{ display: 'none', margin: '0 0 16px' }}></div>
          <div className="subject-panel" style={{ margin: '16px 0 24px' }}><h3 style={{ margin: '0 0 10px' }}>Branch Overview</h3></div>
          <div id="universityBranchSections" className="university-branch-sections"><div className="teacher-card loading"><h3 style={{ margin: 0 }}>Loading branch information...</h3></div></div>
          <div id="universityBranchDetail" className="university-branch-detail"><div className="chart-empty">Select a branch to view its details.</div></div>
          <div className="subject-panel" style={{ margin: '16px 0 24px' }}><h3 style={{ margin: '0 0 10px' }}>Student Course Management</h3></div>
          <div id="universityEnrollmentGrid" className="university-grid"><div className="teacher-card loading"><h3 style={{ margin: 0 }}>Loading enrollments...</h3></div></div>
          <div className="subject-panel" style={{ margin: '8px 0 24px' }}><h3 style={{ margin: '0 0 10px' }}>Teacher Performance</h3></div>
          <div id="universityTeacherGrid" className="university-grid"><div className="teacher-card loading"><h3 style={{ margin: 0 }}>Loading teacher performance...</h3></div></div>
          <div className="subject-panel" style={{ margin: '8px 0 24px' }}><h3 style={{ margin: '0 0 10px' }}>Teacher Uploaded Files</h3></div>
          <div id="universityUploadGrid" className="university-grid"><div className="teacher-card loading"><h3 style={{ margin: 0 }}>Loading uploaded files...</h3></div></div>
        </section>

        {/* Admin Section */}
        <section className="dashboard-section" id="adminSection" style={{ display: 'none' }}>
          <div className="dashboard-header">
            <div>
              <span className="dashboard-kicker">Admin Dashboard</span>
              <h2>Platform Control Center</h2>
              <p>Manage all universities, teachers, students, courses, student enrollments, and uploaded teaching files.</p>
            </div>
            <div className="dashboard-badge" id="adminStatus">Loading...</div>
          </div>
          <div id="adminStatusMsg" className="status-msg" style={{ display: 'none', margin: '0 0 16px' }}></div>
          <div className="admin-summary" id="adminSummary"></div>
          <div className="admin-section-block">
            <div className="subject-panel"><h3 style={{ margin: '0 0 10px' }}>Universities</h3></div>
            <div className="admin-list" id="adminUniversityList"></div>
          </div>
          <div className="admin-section-block">
            <div className="subject-panel"><h3 style={{ margin: '0 0 10px' }}>Teachers</h3></div>
            <div className="admin-list" id="adminTeacherList"></div>
          </div>
          <div className="admin-section-block">
            <div className="subject-panel"><h3 style={{ margin: '0 0 10px' }}>Students</h3></div>
            <div className="admin-list" id="adminStudentList"></div>
          </div>
          <div className="admin-section-block">
            <div className="subject-panel"><h3 style={{ margin: '0 0 10px' }}>Courses</h3></div>
            <div className="admin-list" id="adminCourseList"></div>
          </div>
          <div className="admin-section-block">
            <div className="subject-panel"><h3 style={{ margin: '0 0 10px' }}>Enrollments</h3></div>
            <div className="admin-list" id="adminEnrollmentList"></div>
          </div>
          <div className="admin-section-block">
            <div className="subject-panel"><h3 style={{ margin: '0 0 10px' }}>Uploaded Files</h3></div>
            <div className="admin-list" id="adminUploadList"></div>
          </div>
        </section>
      </main>

      <footer><p>&copy; 2025 Learnix. All rights reserved.</p></footer>
    </>
  );
}
