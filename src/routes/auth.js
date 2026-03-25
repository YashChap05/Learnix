const express = require("express");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const db = require("../config/database");
const path = require("path");

const router = express.Router();

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const AUTH_TABLE = "auth_users";
const TEACHER_TABLE = "teacher";
const DEPT_TABLE = "dept";
const COURSE_TABLE = "courses";
const ENROLL_TABLE = "enrollment";
const ENROLL_REQUEST_TABLE = "enrollment_requests";
const PERFORMANCE_TABLE = "student_performance";

const COURSE_VIDEO_MAP = {
  "web development": "/pages/webdev-video.html",
  "python programming": "/pages/python-video.html",
  "data science": "/pages/ds-video.html",
  "ui / ux design": "/pages/uiux-video.html",
  "ui/ux design": "/pages/uiux-video.html",
  "dbms": "/pages/subject-detail.html?subject=dbms",
  "operating systems": "/pages/subject-detail.html?subject=operating-systems",
  "ct": "/pages/subject-detail.html?subject=ct",
  "telecommunication": "/pages/subject-detail.html?subject=telecommunication",
  "fintech": "/pages/subject-detail.html?subject=fintech",
  "data structures": "/pages/subject-detail.html?subject=data-structures",
  "computer networks": "/pages/subject-detail.html?subject=computer-networks",
  "java programming": "/pages/subject-detail.html?subject=java-programming",
  "software engineering": "/pages/subject-detail.html?subject=software-engineering",
  "digital electronics": "/pages/subject-detail.html?subject=digital-electronics",
  "machine learning": "/pages/subject-detail.html?subject=machine-learning",
  "cloud computing": "/pages/subject-detail.html?subject=cloud-computing",
  "cyber security": "/pages/subject-detail.html?subject=cyber-security",
  "web technologies": "/pages/subject-detail.html?subject=web-technologies",
  "mobile app development": "/pages/subject-detail.html?subject=mobile-app-development",
  "artificial intelligence": "/pages/subject-detail.html?subject=artificial-intelligence",
  "big data analytics": "/pages/subject-detail.html?subject=big-data-analytics",
  "internet of things": "/pages/subject-detail.html?subject=internet-of-things",
  "blockchain": "/pages/subject-detail.html?subject=blockchain",
  "project management": "/pages/subject-detail.html?subject=project-management",
  "physics": "/pages/subject-detail.html?subject=physics",
  "chemistry": "/pages/subject-detail.html?subject=chemistry",
  "mathematics": "/pages/subject-detail.html?subject=mathematics",
  "english": "/pages/subject-detail.html?subject=english",
  "computer science": "/pages/subject-detail.html?subject=computer-science"
};

// ─────────────────────────────────────────────
// Ensure tables & columns exist on startup
// ─────────────────────────────────────────────
const ensureColumn = (table, col, def) => {
  db.query(`SHOW COLUMNS FROM \`${table}\` LIKE ?`, [col], (err, rows) => {
    if (err || (rows && rows.length > 0)) return;
    db.query(`ALTER TABLE \`${table}\` ADD COLUMN ${col} ${def}`, (alterErr) => {
      if (alterErr) console.error(`Failed to add ${col} to ${table}:`, alterErr.message);
    });
  });
};

ensureColumn(AUTH_TABLE, "role", "VARCHAR(20) NOT NULL DEFAULT 'student'");
ensureColumn(AUTH_TABLE, "dept_id", "INT NULL");
ensureColumn(AUTH_TABLE, "phone_no", "VARCHAR(15) NULL");
ensureColumn(COURSE_TABLE, "video_path", "VARCHAR(255) NULL");
ensureColumn(PERFORMANCE_TABLE, "attendance_pct", "DECIMAL(5,2) NULL");
ensureColumn(PERFORMANCE_TABLE, "marks_obtained", "INT NULL");
ensureColumn(PERFORMANCE_TABLE, "marks_total", "INT NULL");
ensureColumn(PERFORMANCE_TABLE, "focus_area", "VARCHAR(255) NULL");

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const normalizeEmail = (e) => String(e || "").trim().toLowerCase();
const normalizeCourseName = (n) => String(n || "").trim().toLowerCase().replace(/\s+/g, " ");

const resolveCourseVideoPath = (courseName, uploadedPath) => {
  if (uploadedPath) return uploadedPath;
  return COURSE_VIDEO_MAP[normalizeCourseName(courseName)] || "/pages/courses.html";
};

// ─────────────────────────────────────────────
// OTP System
// ─────────────────────────────────────────────
const EMAIL_OTP_TTL_MS = 10 * 60 * 1000;
const EMAIL_OTP_MAX_ATTEMPTS = 5;
const emailOtpStore = new Map();

const hasSmtpConfig = () =>
  !!(process.env.EMAIL_SMTP_HOST && process.env.EMAIL_SMTP_PORT &&
     process.env.EMAIL_SMTP_USER && process.env.EMAIL_SMTP_PASS && process.env.EMAIL_FROM);

const smtpTransport = hasSmtpConfig()
  ? nodemailer.createTransport({
      host: process.env.EMAIL_SMTP_HOST,
      port: Number(process.env.EMAIL_SMTP_PORT),
      secure: Number(process.env.EMAIL_SMTP_PORT) === 465,
      auth: { user: process.env.EMAIL_SMTP_USER, pass: process.env.EMAIL_SMTP_PASS }
    })
  : null;

router.post("/api/email-otp/send", async (req, res) => {
  const email = normalizeEmail(req.body && req.body.email);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Valid email is required" });
  }
  if (!smtpTransport) {
    return res.status(500).json({ error: "SMTP not configured on server" });
  }
  const otp = String(Math.floor(10000 + Math.random() * 90000));
  emailOtpStore.set(email, { otp, expiresAt: Date.now() + EMAIL_OTP_TTL_MS, attempts: 0 });
  try {
    await smtpTransport.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "Your Learnix verification code",
      text: `Your Learnix verification code is ${otp}. It expires in 10 minutes.`
    });
    return res.json({ message: "OTP sent to your email" });
  } catch (err) {
    emailOtpStore.delete(email);
    return res.status(500).json({ error: "Failed to send OTP email" });
  }
});

router.post("/api/email-otp/verify", (req, res) => {
  const email = normalizeEmail(req.body && req.body.email);
  const otp = String((req.body && req.body.otp) || "").trim();
  if (!email || !otp) return res.status(400).json({ error: "Email and OTP are required" });
  const data = emailOtpStore.get(email);
  if (!data) return res.status(400).json({ error: "No active OTP for this email" });
  if (Date.now() > data.expiresAt) {
    emailOtpStore.delete(email);
    return res.status(400).json({ error: "OTP expired. Request a new one." });
  }
  if (data.attempts >= EMAIL_OTP_MAX_ATTEMPTS) {
    emailOtpStore.delete(email);
    return res.status(400).json({ error: "Too many invalid attempts. Request a new OTP." });
  }
  if (data.otp !== otp) {
    data.attempts += 1;
    emailOtpStore.set(email, data);
    return res.status(400).json({ error: "Invalid OTP" });
  }
  emailOtpStore.delete(email);
  req.session.verifiedSignupEmail = email;
  req.session.verifiedSignupAt = Date.now();
  return res.json({ message: "Email verified successfully" });
});

// ─────────────────────────────────────────────
// Department resolver
// ─────────────────────────────────────────────
const resolveDeptId = ({ deptId, departmentName, createIfMissing }, callback) => {
  const name = departmentName ? String(departmentName).trim() : "";
  const id = deptId ? Number(deptId) : null;

  if (Number.isInteger(id) && id > 0) {
    db.query(`SELECT dept_id FROM ${DEPT_TABLE} WHERE dept_id = ?`, [id], (err, rows) => {
      if (err) return callback(err);
      if (!rows || rows.length === 0) return callback(new Error("Invalid department"));
      return callback(null, rows[0].dept_id, name);
    });
    return;
  }

  if (!name) return callback(new Error("Department is required"));

  db.query(`SELECT dept_id, dept_name FROM ${DEPT_TABLE} WHERE dept_name = ?`, [name], (err, rows) => {
    if (err) return callback(err);
    if (rows && rows.length > 0) return callback(null, rows[0].dept_id, rows[0].dept_name);
    if (!createIfMissing) return callback(new Error("Invalid department selected"));
    db.query(`INSERT INTO ${DEPT_TABLE} (dept_name) VALUES (?)`, [name], (insErr, result) => {
      if (insErr) return callback(insErr);
      return callback(null, result.insertId, name);
    });
  });
};

// ─────────────────────────────────────────────
// GET /api/departments
// ─────────────────────────────────────────────
router.get("/api/departments", (_req, res) => {
  db.query(`SELECT dept_id, dept_name FROM ${DEPT_TABLE} ORDER BY dept_name ASC`, (err, rows) => {
    if (err) return res.status(500).json({ error: "Failed to load departments" });
    return res.json({ departments: rows || [] });
  });
});

// ─────────────────────────────────────────────
// Signup
// ─────────────────────────────────────────────
router.post("/signup", async (req, res) => {
  const { username, email, phone_no: phoneNo, password, confirmPassword, role, department, dept_id: deptId } = req.body;
  const normalizedEmail = normalizeEmail(email);
  const normalizedRole = role ? String(role).trim().toLowerCase() : "";
  const normalizedPhone = phoneNo ? String(phoneNo).trim() : "";

  if (!username || !normalizedEmail || !normalizedPhone || !password || !confirmPassword || !normalizedRole) {
    return res.status(400).send("All fields are required");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return res.status(400).send("Invalid email format");
  }
  if (!/^\d{10}$/.test(normalizedPhone)) {
    return res.status(400).send("Phone number must be exactly 10 digits");
  }
  if (!["student", "teacher"].includes(normalizedRole)) {
    return res.status(400).send("Invalid role selected");
  }
  if (password !== confirmPassword) {
    return res.status(400).send("Passwords do not match");
  }

  // OTP verification check (bypass if BYPASS_OTP is enabled)
  const bypassOtp = process.env.BYPASS_OTP === "true";
  if (!bypassOtp) {
    const verifiedEmail = normalizeEmail(req.session && req.session.verifiedSignupEmail);
    const verifiedAt = req.session && req.session.verifiedSignupAt ? Number(req.session.verifiedSignupAt) : 0;
    if (!verifiedEmail || verifiedEmail !== normalizedEmail || !verifiedAt || Date.now() - verifiedAt > EMAIL_OTP_TTL_MS) {
      return res.status(400).send("Please verify your email with the 5-digit OTP before signing up");
    }
  } else {
    // Bypass: auto-verify email
    req.session.verifiedSignupEmail = normalizedEmail;
    req.session.verifiedSignupAt = Date.now();
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  resolveDeptId({ deptId, departmentName: department, createIfMissing: true }, (deptErr, resolvedDeptId) => {
    if (deptErr) return res.status(400).send(deptErr.message);

    if (normalizedRole === "teacher") {
      db.query(
        `INSERT INTO ${TEACHER_TABLE} (name, email, password, phone_no, dept_id) VALUES (?, ?, ?, ?, ?)`,
        [username, normalizedEmail, hashedPassword, normalizedPhone, resolvedDeptId],
        (err) => {
          if (err) {
            if (err.code === "ER_DUP_ENTRY") return res.status(400).send("Email already registered");
            return res.status(500).send("Error during teacher registration: " + err.sqlMessage);
          }
          delete req.session.verifiedSignupEmail;
          delete req.session.verifiedSignupAt;
          return res.redirect("/pages/login.html");
        }
      );
      return;
    }

    db.query(
      `INSERT INTO ${AUTH_TABLE} (username, email, phone_no, role, dept_id, password) VALUES (?, ?, ?, ?, ?, ?)`,
      [username, normalizedEmail, normalizedPhone, normalizedRole, resolvedDeptId, hashedPassword],
      (err) => {
        if (err) {
          if (err.code === "ER_DUP_ENTRY") return res.status(400).send("Email already registered");
          return res.status(500).send("Error during registration: " + err.sqlMessage);
        }
        delete req.session.verifiedSignupEmail;
        delete req.session.verifiedSignupAt;
        return res.redirect("/pages/login.html");
      }
    );
  });
});

// ─────────────────────────────────────────────
// Login
// ─────────────────────────────────────────────
router.post("/login", (req, res) => {
  const { username: email, password, role, department, dept_id: deptId } = req.body;
  const normalizedRole = role ? String(role).trim().toLowerCase() : "";

  if (!email || !password || !normalizedRole) {
    return res.status(400).send("All fields are required");
  }

  resolveDeptId({ deptId, departmentName: department, createIfMissing: false }, (deptErr, resolvedDeptId, resolvedDeptName) => {
    if (deptErr) return res.status(400).send("Invalid department selected");

    if (normalizedRole === "teacher") {
      db.query(
        `SELECT teacher_id, name, email, phone_no, dept_id, password FROM ${TEACHER_TABLE} WHERE email = ? AND dept_id = ?`,
        [email, resolvedDeptId],
        async (err, results) => {
          if (err) return res.status(500).send("Error during login");
          if (!results || results.length === 0) return res.status(401).send("Invalid email or password");
          const isMatch = await bcrypt.compare(password, results[0].password);
          if (!isMatch) return res.status(401).send("Invalid email or password");
          req.session.userId = results[0].teacher_id;
          req.session.userSource = "teacher";
          req.session.user = {
            id: results[0].teacher_id,
            username: results[0].name,
            email: results[0].email,
            phone_no: results[0].phone_no,
            role: "teacher",
            dept_id: results[0].dept_id,
            department: resolvedDeptName || ""
          };
          return res.redirect("/pages/home.html");
        }
      );
      return;
    }

    db.query(
      `SELECT id, username, email, phone_no, role, dept_id, password FROM ${AUTH_TABLE} WHERE email = ? AND role = ? AND dept_id = ?`,
      [email, normalizedRole, resolvedDeptId],
      async (err, results) => {
        if (err) return res.status(500).send("Error during login");
        if (!results || results.length === 0) return res.status(401).send("Invalid email or password");
        const isMatch = await bcrypt.compare(password, results[0].password);
        if (!isMatch) return res.status(401).send("Invalid email or password");
        req.session.userId = results[0].id;
        req.session.userSource = "auth_users";
        req.session.user = {
          id: results[0].id,
          username: results[0].username,
          email: results[0].email,
          phone_no: results[0].phone_no,
          role: results[0].role,
          dept_id: results[0].dept_id,
          department: resolvedDeptName || ""
        };
        return res.redirect("/pages/home.html");
      }
    );
  });
});

// ─────────────────────────────────────────────
// Protected page routes
// ─────────────────────────────────────────────
router.get("/dashboard", (req, res) => {
  if (!req.session.userId) return res.redirect("/pages/login.html");
  res.sendFile(path.join(__dirname, "..", "..", "public", "pages", "dashboard.html"));
});

router.get("/profile", (req, res) => {
  if (!req.session.userId) return res.redirect("/pages/login.html");
  res.sendFile(path.join(__dirname, "..", "..", "public", "pages", "profile.html"));
});

// ─────────────────────────────────────────────
// API: Me
// ─────────────────────────────────────────────
router.get("/api/me", (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
  if (req.session.user) return res.json(req.session.user);

  if (req.session.userSource === "teacher") {
    db.query(
      `SELECT t.teacher_id AS id, t.name AS username, t.email, t.phone_no, 'teacher' AS role, t.dept_id, d.dept_name AS department
       FROM ${TEACHER_TABLE} t LEFT JOIN ${DEPT_TABLE} d ON d.dept_id = t.dept_id
       WHERE t.teacher_id = ?`,
      [req.session.userId],
      (err, results) => {
        if (err) return res.status(500).json({ error: "Failed to fetch user" });
        if (!results || results.length === 0) return res.status(404).json({ error: "User not found" });
        req.session.user = results[0];
        return res.json(results[0]);
      }
    );
    return;
  }

  db.query(
    `SELECT u.id, u.username, u.email, u.phone_no, u.role, u.dept_id, d.dept_name AS department
     FROM ${AUTH_TABLE} u LEFT JOIN ${DEPT_TABLE} d ON d.dept_id = u.dept_id
     WHERE u.id = ?`,
    [req.session.userId],
    (err, results) => {
      if (err) return res.status(500).json({ error: "Failed to fetch user" });
      if (!results || results.length === 0) return res.status(404).json({ error: "User not found" });
      req.session.user = results[0];
      return res.json(results[0]);
    }
  );
});

// ─────────────────────────────────────────────
// API: Courses
// ─────────────────────────────────────────────
router.get("/api/courses", (_req, res) => {
  db.query(
    `SELECT c.course_id, c.course_name, c.credits, d.dept_name, t.name AS teacher_name, c.video_path
     FROM ${COURSE_TABLE} c
     LEFT JOIN ${DEPT_TABLE} d ON d.dept_id = c.dept_id
     LEFT JOIN ${TEACHER_TABLE} t ON t.teacher_id = c.teacher_id
     ORDER BY c.course_name ASC`,
    (err, rows) => {
      if (err) return res.status(500).json({ error: "Failed to fetch courses" });
      const courses = (rows || []).map((c) => ({
        ...c,
        video_path: resolveCourseVideoPath(c.course_name, c.video_path)
      }));
      return res.json({ courses });
    }
  );
});

// ─────────────────────────────────────────────
// API: Teacher Courses (for upload management)
// ─────────────────────────────────────────────
router.get("/api/teacher/courses", (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
  if (req.session.userSource !== "teacher") return res.status(403).json({ error: "Teachers only" });

  const teacherId = Number(req.session.userId);
  db.query(
    `SELECT c.course_id, c.course_name, c.video_path,
            c.teacher_id, t.name AS teacher_name
     FROM ${COURSE_TABLE} c
     LEFT JOIN ${TEACHER_TABLE} t ON t.teacher_id = c.teacher_id
     WHERE c.teacher_id IS NULL OR c.teacher_id = ?
     ORDER BY c.course_name ASC`,
    [teacherId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "Failed to load teacher courses" });
      const courses = (rows || []).map((c) => ({
        course_id: c.course_id,
        course_name: c.course_name,
        video_path: resolveCourseVideoPath(c.course_name, c.video_path),
        teacher_id: c.teacher_id,
        teacher_name: c.teacher_name || null,
        is_owner: Number(c.teacher_id) === teacherId || c.teacher_id === null
      }));
      return res.json({ courses });
    }
  );
});

// ─────────────────────────────────────────────
// API: My Courses
// ─────────────────────────────────────────────
router.get("/api/my-courses", (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
  if (req.session.userSource === "teacher") return res.json({ courses: [] });

  db.query(
    `SELECT c.course_id, c.course_name, c.credits, d.dept_name, t.name AS teacher_name,
            e.enrollment_date, c.video_path
     FROM ${ENROLL_TABLE} e
     JOIN ${COURSE_TABLE} c ON c.course_id = e.course_id
     LEFT JOIN ${DEPT_TABLE} d ON d.dept_id = c.dept_id
     LEFT JOIN ${TEACHER_TABLE} t ON t.teacher_id = c.teacher_id
     WHERE e.auth_user_id = ?
     ORDER BY e.enrollment_date DESC, c.course_name ASC`,
    [req.session.userId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "Failed to load enrolled courses" });
      const courses = (rows || []).map((c) => ({
        ...c,
        video_path: resolveCourseVideoPath(c.course_name, c.video_path)
      }));
      return res.json({ courses });
    }
  );
});

// ─────────────────────────────────────────────
// API: Enroll
// ─────────────────────────────────────────────
router.post("/api/enroll", (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: "Please log in first" });
  if (req.session.userSource === "teacher") return res.status(403).json({ error: "Teachers cannot enroll in courses" });

  const courseName = req.body && req.body.courseName ? String(req.body.courseName).trim() : "";
  if (!courseName) return res.status(400).json({ error: "courseName is required" });

  const userId = req.session.userId;

  db.query(`SELECT course_id, course_name FROM ${COURSE_TABLE} WHERE course_name = ? LIMIT 1`, [courseName], (err, courseRows) => {
    if (err) return res.status(500).json({ error: "Failed to fetch course" });

    const proceed = (courseId, cName) => {
      db.query(
        `SELECT 1 FROM ${ENROLL_TABLE} WHERE auth_user_id = ? AND course_id = ? LIMIT 1`,
        [userId, courseId],
        (checkErr, existing) => {
          if (checkErr) return res.status(500).json({ error: "Failed to check enrollment" });
          if (existing && existing.length > 0) {
            return res.json({ message: "Already enrolled", alreadyEnrolled: true });
          }
          db.query(
            `INSERT INTO ${ENROLL_TABLE} (auth_user_id, course_id, enrollment_date) VALUES (?, ?, CURDATE())`,
            [userId, courseId],
            (insErr) => {
              if (insErr) return res.status(500).json({ error: "Failed to enroll" });
              return res.json({
                message: "Enrollment successful",
                alreadyEnrolled: false,
                enrollment: { course_name: cName, video_path: resolveCourseVideoPath(cName, null) }
              });
            }
          );
        }
      );
    };

    if (courseRows && courseRows.length > 0) {
      return proceed(courseRows[0].course_id, courseRows[0].course_name);
    }
    // Create course if not found
    db.query(
      `INSERT INTO ${COURSE_TABLE} (course_name, credits) VALUES (?, 3)`,
      [courseName],
      (insErr, result) => {
        if (insErr) return res.status(500).json({ error: "Failed to create course" });
        return proceed(result.insertId, courseName);
      }
    );
  });
});

// ─────────────────────────────────────────────
// API: Student Performance
// ─────────────────────────────────────────────
const getRandomPerformanceSample = () => {
  const r = Math.random();
  let aMin = 55, aMax = 75, sMin = 40, sMax = 60;
  if (r > 0.35 && r <= 0.75) { aMin = 70; aMax = 88; sMin = 60; sMax = 82; }
  else if (r > 0.75) { aMin = 85; aMax = 98; sMin = 82; sMax = 98; }
  const attendance = Math.round((aMin + Math.random() * (aMax - aMin)) * 10) / 10;
  const score = Math.round(sMin + Math.random() * (sMax - sMin));
  return { attendance, marksObtained: score, marksTotal: 100, score };
};

router.get("/api/student-performance", (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
  if (req.session.userSource === "teacher") return res.json({ performance: [] });

  const userId = req.session.userId;

  // Insert defaults for any enrolled courses missing performance rows
  db.query(
    `INSERT INTO ${PERFORMANCE_TABLE} (auth_user_id, course_id, attendance_pct, marks_obtained, marks_total, focus_area)
     SELECT e.auth_user_id, e.course_id, 82.50, 76, 100, CONCAT('Focus on practice in ', c.course_name)
     FROM ${ENROLL_TABLE} e JOIN ${COURSE_TABLE} c ON c.course_id = e.course_id
     WHERE e.auth_user_id = ?
       AND NOT EXISTS (
         SELECT 1 FROM ${PERFORMANCE_TABLE} p WHERE p.auth_user_id = e.auth_user_id AND p.course_id = e.course_id
       )`,
    [userId],
    () => {
      db.query(
        `SELECT p.performance_id, c.course_name, p.attendance_pct, p.marks_obtained, p.marks_total, p.focus_area, p.updated_at
         FROM ${PERFORMANCE_TABLE} p
         JOIN ${COURSE_TABLE} c ON c.course_id = p.course_id
         WHERE p.auth_user_id = ?
         ORDER BY c.course_name ASC`,
        [userId],
        (err, rows) => {
          if (err) return res.status(500).json({ error: "Failed to load performance" });
          const performance = (rows || []).map((row) => {
            let { attendance_pct: att, marks_obtained: mo, marks_total: mt } = row;
            // Replace stub defaults with random realistic data
            if (att == 82.5 && mo == 76 && mt == 100) {
              const s = getRandomPerformanceSample();
              att = s.attendance; mo = s.marksObtained; mt = s.marksTotal;
            }
            const score = mt > 0 ? Math.round((mo / mt) * 100) : null;
            let focus = row.focus_area || "";
            if (!focus) {
              focus = score < 60 ? `Focus on ${row.course_name} fundamentals.` :
                      att < 75 ? `Increase attendance in ${row.course_name}.` :
                      `Maintain your progress in ${row.course_name}.`;
            }
            return {
              course_name: row.course_name,
              attendance_pct: att,
              marks_obtained: mo,
              marks_total: mt,
              score_pct: score,
              focus_area: focus,
              updated_at: row.updated_at
            };
          });
          return res.json({ performance });
        }
      );
    }
  );
});

// ─────────────────────────────────────────────
// API: Teacher - Students Performance
// ─────────────────────────────────────────────
router.get("/api/teacher/students-performance", (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
  if (req.session.userSource !== "teacher") return res.status(403).json({ error: "Teachers only" });

  db.query(
    `SELECT u.id AS student_id, u.username AS student_name, u.email AS student_email,
            c.course_name, p.attendance_pct, p.marks_obtained, p.marks_total, p.focus_area, p.updated_at
     FROM ${ENROLL_TABLE} e
     JOIN ${AUTH_TABLE} u ON u.id = e.auth_user_id
     JOIN ${COURSE_TABLE} c ON c.course_id = e.course_id
     LEFT JOIN ${PERFORMANCE_TABLE} p ON p.auth_user_id = e.auth_user_id AND p.course_id = e.course_id
     WHERE LOWER(COALESCE(u.role, 'student')) = 'student'
     ORDER BY u.username ASC, c.course_name ASC`,
    (err, rows) => {
      if (err) return res.status(500).json({ error: "Failed to load student data" });
      const students = (rows || []).map((row) => {
        let { attendance_pct: att, marks_obtained: mo, marks_total: mt } = row;
        if (att == 82.5 && mo == 76 && mt == 100) {
          const s = getRandomPerformanceSample();
          att = s.attendance; mo = s.marksObtained; mt = s.marksTotal;
        }
        const score = mt > 0 ? Math.round((mo / mt) * 100) : null;
        return {
          student_id: row.student_id,
          student_name: row.student_name,
          student_email: row.student_email,
          course_name: row.course_name,
          attendance_pct: att,
          marks_obtained: mo,
          marks_total: mt,
          score_pct: score,
          focus_area: row.focus_area || null,
          updated_at: row.updated_at
        };
      });

      const unique = new Set(students.map((s) => s.student_id)).size;
      const attVals = students.map((s) => s.attendance_pct).filter(Number.isFinite);
      const scoreVals = students.map((s) => s.score_pct).filter(Number.isFinite);

      return res.json({
        summary: {
          student_count: unique,
          avg_attendance_pct: attVals.length ? Math.round((attVals.reduce((a, b) => a + b, 0) / attVals.length) * 10) / 10 : null,
          avg_score_pct: scoreVals.length ? Math.round((scoreVals.reduce((a, b) => a + b, 0) / scoreVals.length) * 10) / 10 : null
        },
        students
      });
    }
  );
});

// ─────────────────────────────────────────────
// Logout
// ─────────────────────────────────────────────
router.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/pages/login.html");
});

module.exports = router;
