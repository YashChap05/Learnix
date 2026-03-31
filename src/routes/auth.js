const express = require("express");
const bcrypt = require("bcrypt");
const db = require("../config/database");
const path = require("path");
const fs = require("fs");

const router = express.Router();

const AUTH_TABLE = "auth_users";
const TEACHER_TABLE = "teacher";
const UNIVERSITY_TABLE = "university";
const DEPT_TABLE = "dept";
const COURSE_TABLE = "courses";
const ENROLL_TABLE = "enrollment";
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

const normalizeText = (value) => String(value || "").trim();
const normalizeEmail = (value) => normalizeText(value).toLowerCase();
const normalizeRole = (value) => normalizeText(value).toLowerCase();
const normalizeCourseName = (value) => normalizeText(value).toLowerCase().replace(/\s+/g, " ");

const resolveCourseVideoPath = (courseName, uploadedPath) => {
  if (uploadedPath) return uploadedPath;
  return COURSE_VIDEO_MAP[normalizeCourseName(courseName)] || "/pages/courses.html";
};

const resolveDeptId = ({ branch, createIfMissing }, callback) => {
  const branchName = normalizeText(branch);
  if (!branchName) return callback(null, null, "");

  db.query(
    `SELECT dept_id, dept_name FROM ${DEPT_TABLE} WHERE dept_name = ? LIMIT 1`,
    [branchName],
    (err, rows) => {
      if (err) return callback(err);
      if (rows && rows.length > 0) return callback(null, rows[0].dept_id, rows[0].dept_name);
      if (!createIfMissing) return callback(new Error("Branch not found"));
      db.query(
        `INSERT INTO ${DEPT_TABLE} (dept_name) VALUES (?)`,
        [branchName],
        (insertErr, result) => {
          if (insertErr) return callback(insertErr);
          return callback(null, result.insertId, branchName);
        }
      );
    }
  );
};

const findUniversityByName = (universityName, callback) => {
  const name = normalizeText(universityName);
  if (!name) return callback(new Error("University is required"));
  db.query(
    `SELECT university_id, university_name FROM ${UNIVERSITY_TABLE} WHERE university_name = ? LIMIT 1`,
    [name],
    (err, rows) => {
      if (err) return callback(err);
      if (!rows || rows.length === 0) return callback(new Error("University account not found"));
      return callback(null, rows[0]);
    }
  );
};

const requireUniversity = (req, res) => {
  if (!req.session.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return false;
  }
  if (!req.session.user || req.session.user.role !== "university") {
    res.status(403).json({ error: "University access only" });
    return false;
  }
  return true;
};

const completeLoginSession = (req, user) => {
  req.session.userId = user.id;
  req.session.userSource = user.userSource;
  req.session.user = user;
};

router.get("/api/departments", (_req, res) => {
  db.query(`SELECT dept_id, dept_name FROM ${DEPT_TABLE} ORDER BY dept_name ASC`, (err, rows) => {
    if (err) return res.status(500).json({ error: "Failed to load branches" });
    return res.json({ departments: rows || [] });
  });
});

router.get("/api/universities", (_req, res) => {
  db.query(`SELECT university_id, university_name FROM ${UNIVERSITY_TABLE} ORDER BY university_name ASC`, (err, rows) => {
    if (err) return res.status(500).json({ error: "Failed to load universities" });
    return res.json({ universities: rows || [] });
  });
});

router.post("/signup", async (req, res) => {
  const role = normalizeRole(req.body && req.body.role);
  const password = normalizeText(req.body && req.body.password);
  const confirmPassword = normalizeText(req.body && req.body.confirmPassword);

  if (!["student", "teacher", "university"].includes(role)) {
    return res.status(400).send("Invalid role selected");
  }
  if (!password || password.length < 6) {
    return res.status(400).send("Password must be at least 6 characters");
  }
  if (password !== confirmPassword) {
    return res.status(400).send("Passwords do not match");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  if (role === "university") {
    const universityName = normalizeText(req.body && req.body.university_name);
    const email = normalizeEmail(req.body && req.body.email);
    const principalName = normalizeText(req.body && req.body.principal_name);

    if (!universityName || !email || !principalName) {
      return res.status(400).send("University name, email, and principal name are required");
    }

    db.query(
      `INSERT INTO ${UNIVERSITY_TABLE} (university_name, email, principal_name, password) VALUES (?, ?, ?, ?)`,
      [universityName, email, principalName, hashedPassword],
      (err) => {
        if (err) {
          if (err.code === "ER_DUP_ENTRY") return res.status(400).send("University or email already registered");
          return res.status(500).send("Error during university registration");
        }
        return res.redirect("/pages/login.html");
      }
    );
    return;
  }

  const name = normalizeText(req.body && req.body.username);
  const email = normalizeEmail(req.body && req.body.email);
  const branch = normalizeText(req.body && req.body.branch);
  const universityName = normalizeText(req.body && req.body.university_name);
  const subject = normalizeText(req.body && req.body.subject);

  if (!name || !email || !branch || !universityName) {
    return res.status(400).send("Name, email, branch, and university are required");
  }

  findUniversityByName(universityName, (universityErr, university) => {
    if (universityErr) return res.status(400).send(universityErr.message);
    resolveDeptId({ branch, createIfMissing: true }, (deptErr, deptId) => {
      if (deptErr) return res.status(400).send("Invalid branch");

      if (role === "teacher") {
        db.query(
          `INSERT INTO ${TEACHER_TABLE} (name, email, dept_id, university_id, subject, password) VALUES (?, ?, ?, ?, ?, ?)`,
          [name, email, deptId, university.university_id, subject || null, hashedPassword],
          (err) => {
            if (err) {
              if (err.code === "ER_DUP_ENTRY") return res.status(400).send("Email already registered");
              return res.status(500).send("Error during teacher registration");
            }
            return res.redirect("/pages/login.html");
          }
        );
        return;
      }

      db.query(
        `INSERT INTO ${AUTH_TABLE} (username, email, role, dept_id, university_id, password) VALUES (?, ?, 'student', ?, ?, ?)`,
        [name, email, deptId, university.university_id, hashedPassword],
        (err) => {
          if (err) {
            if (err.code === "ER_DUP_ENTRY") return res.status(400).send("Email already registered");
            return res.status(500).send("Error during student registration");
          }
          return res.redirect("/pages/login.html");
        }
      );
    });
  });
});

router.post("/login", (req, res) => {
  const role = normalizeRole(req.body && req.body.role);
  const email = normalizeEmail(req.body && req.body.username);
  const password = normalizeText(req.body && req.body.password);
  const branch = normalizeText(req.body && req.body.branch);

  if (!role || !email || !password) {
    return res.status(400).send("All fields are required");
  }

  if (role === "university") {
    db.query(
      `SELECT university_id, university_name, email, principal_name, password
       FROM ${UNIVERSITY_TABLE}
       WHERE email = ?
       LIMIT 1`,
      [email],
      async (err, rows) => {
        if (err) return res.status(500).send("Error during login");
        if (!rows || rows.length === 0) return res.status(401).send("Invalid email or password");
        const match = await bcrypt.compare(password, rows[0].password);
        if (!match) return res.status(401).send("Invalid email or password");

        completeLoginSession(req, {
          id: rows[0].university_id,
          username: rows[0].university_name,
          email: rows[0].email,
          role: "university",
          dept_id: null,
          department: "",
          university_id: rows[0].university_id,
          university_name: rows[0].university_name,
          principal_name: rows[0].principal_name,
          subject: null,
          userSource: "university"
        });
        return res.redirect("/pages/home.html");
      }
    );
    return;
  }

  if (role === "teacher") {
    if (!branch) return res.status(400).send("Branch is required");
    resolveDeptId({ branch, createIfMissing: false }, (deptErr, deptId, deptName) => {
      if (deptErr || !deptId) return res.status(400).send("Invalid branch selected");
      db.query(
        `SELECT t.teacher_id, t.name, t.email, t.subject, t.password, t.dept_id, t.university_id,
                d.dept_name, u.university_name
         FROM ${TEACHER_TABLE} t
         LEFT JOIN ${DEPT_TABLE} d ON d.dept_id = t.dept_id
         LEFT JOIN ${UNIVERSITY_TABLE} u ON u.university_id = t.university_id
         WHERE t.email = ? AND t.dept_id = ?
         LIMIT 1`,
        [email, deptId],
        async (err, rows) => {
          if (err) return res.status(500).send("Error during login");
          if (!rows || rows.length === 0) return res.status(401).send("Invalid email or password");
          const match = await bcrypt.compare(password, rows[0].password);
          if (!match) return res.status(401).send("Invalid email or password");

          completeLoginSession(req, {
            id: rows[0].teacher_id,
            username: rows[0].name,
            email: rows[0].email,
            role: "teacher",
            dept_id: rows[0].dept_id,
            department: deptName || rows[0].dept_name || "",
            university_id: rows[0].university_id,
            university_name: rows[0].university_name || "",
            principal_name: null,
            subject: rows[0].subject || null,
            userSource: "teacher"
          });
          return res.redirect("/pages/home.html");
        }
      );
    });
    return;
  }

  if (!branch) return res.status(400).send("Branch is required");
  resolveDeptId({ branch, createIfMissing: false }, (deptErr, deptId, deptName) => {
    if (deptErr || !deptId) return res.status(400).send("Invalid branch selected");
    db.query(
      `SELECT u.id, u.username, u.email, u.role, u.password, u.dept_id, u.university_id,
              d.dept_name, uni.university_name
       FROM ${AUTH_TABLE} u
       LEFT JOIN ${DEPT_TABLE} d ON d.dept_id = u.dept_id
       LEFT JOIN ${UNIVERSITY_TABLE} uni ON uni.university_id = u.university_id
       WHERE u.email = ? AND u.role = 'student' AND u.dept_id = ?
       LIMIT 1`,
      [email, deptId],
      async (err, rows) => {
        if (err) return res.status(500).send("Error during login");
        if (!rows || rows.length === 0) return res.status(401).send("Invalid email or password");
        const match = await bcrypt.compare(password, rows[0].password);
        if (!match) return res.status(401).send("Invalid email or password");

        completeLoginSession(req, {
          id: rows[0].id,
          username: rows[0].username,
          email: rows[0].email,
          role: "student",
          dept_id: rows[0].dept_id,
          department: deptName || rows[0].dept_name || "",
          university_id: rows[0].university_id,
          university_name: rows[0].university_name || "",
          principal_name: null,
          subject: null,
          userSource: "auth_users"
        });
        return res.redirect("/pages/home.html");
      }
    );
  });
});

router.get("/dashboard", (req, res) => {
  if (!req.session.userId) return res.redirect("/pages/login.html");
  res.sendFile(path.join(__dirname, "..", "..", "public", "pages", "dashboard.html"));
});

router.get("/profile", (req, res) => {
  if (!req.session.userId) return res.redirect("/pages/login.html");
  res.sendFile(path.join(__dirname, "..", "..", "public", "pages", "profile.html"));
});

router.get("/api/me", (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
  return res.json(req.session.user);
});

router.get("/api/courses", (req, res) => {
  const user = req.session && req.session.user;
  const deptId = Number(user && user.dept_id);
  const isUniversityUser = user && user.role === "university";
  const params = [];
  let whereSql = "";

  if (!isUniversityUser && Number.isInteger(deptId) && deptId > 0) {
    whereSql = "WHERE c.dept_id = ?";
    params.push(deptId);
  }

  db.query(
    `SELECT c.course_id, c.course_name, c.credits, c.video_path, d.dept_name, t.name AS teacher_name
     FROM ${COURSE_TABLE} c
     LEFT JOIN ${DEPT_TABLE} d ON d.dept_id = c.dept_id
     LEFT JOIN ${TEACHER_TABLE} t ON t.teacher_id = c.teacher_id
     ${whereSql}
     ORDER BY c.course_name ASC`,
    params,
    (err, rows) => {
      if (err) return res.status(500).json({ error: "Failed to fetch courses" });
      return res.json({
        courses: (rows || []).map((course) => ({
          ...course,
          video_path: resolveCourseVideoPath(course.course_name, course.video_path)
        }))
      });
    }
  );
});

router.get("/api/teacher/courses", (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
  if (!req.session.user || req.session.user.role !== "teacher") return res.status(403).json({ error: "Teachers only" });

  const teacherId = Number(req.session.userId);
  const deptId = Number(req.session.user.dept_id);

  db.query(
    `SELECT c.course_id, c.course_name, c.video_path, c.teacher_id, t.name AS teacher_name
     FROM ${COURSE_TABLE} c
     LEFT JOIN ${TEACHER_TABLE} t ON t.teacher_id = c.teacher_id
     WHERE c.dept_id = ? AND (c.teacher_id IS NULL OR c.teacher_id = ?)
     ORDER BY c.course_name ASC`,
    [deptId, teacherId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "Failed to load teacher courses" });
      return res.json({
        courses: (rows || []).map((course) => ({
          ...course,
          video_path: resolveCourseVideoPath(course.course_name, course.video_path)
        }))
      });
    }
  );
});

router.get("/api/my-courses", (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
  if (!req.session.user || req.session.user.role !== "student") return res.json({ courses: [] });

  db.query(
    `SELECT c.course_id, c.course_name, c.credits, c.video_path, d.dept_name, t.name AS teacher_name, e.enrollment_date
     FROM ${ENROLL_TABLE} e
     JOIN ${COURSE_TABLE} c ON c.course_id = e.course_id
     LEFT JOIN ${DEPT_TABLE} d ON d.dept_id = c.dept_id
     LEFT JOIN ${TEACHER_TABLE} t ON t.teacher_id = c.teacher_id
     WHERE e.auth_user_id = ?
     ORDER BY e.enrollment_date DESC, c.course_name ASC`,
    [req.session.userId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "Failed to load enrolled courses" });
      return res.json({
        courses: (rows || []).map((course) => ({
          ...course,
          video_path: resolveCourseVideoPath(course.course_name, course.video_path)
        }))
      });
    }
  );
});

router.post("/api/enroll", (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: "Please log in first" });
  if (!req.session.user || req.session.user.role !== "student") {
    return res.status(403).json({ error: "Only students can enroll in courses" });
  }

  const courseName = normalizeText(req.body && req.body.courseName);
  if (!courseName) return res.status(400).json({ error: "courseName is required" });

  const userId = Number(req.session.userId);
  const deptId = Number(req.session.user.dept_id) || null;

  db.query(`SELECT course_id, course_name FROM ${COURSE_TABLE} WHERE course_name = ? LIMIT 1`, [courseName], (err, courseRows) => {
    if (err) return res.status(500).json({ error: "Failed to fetch course" });

    const enrollStudent = (courseId, actualCourseName) => {
      db.query(
        `SELECT 1 FROM ${ENROLL_TABLE} WHERE auth_user_id = ? AND course_id = ? LIMIT 1`,
        [userId, courseId],
        (checkErr, existingRows) => {
          if (checkErr) return res.status(500).json({ error: "Failed to check enrollment" });
          if (existingRows && existingRows.length > 0) {
            return res.json({ message: "Already enrolled", alreadyEnrolled: true });
          }

          db.query(
            `INSERT INTO ${ENROLL_TABLE} (auth_user_id, course_id, enrollment_date) VALUES (?, ?, CURDATE())`,
            [userId, courseId],
            (insertErr) => {
              if (insertErr) return res.status(500).json({ error: "Failed to enroll" });
              return res.json({
                message: "Enrollment successful",
                alreadyEnrolled: false,
                enrollment: {
                  course_name: actualCourseName,
                  video_path: resolveCourseVideoPath(actualCourseName, null)
                }
              });
            }
          );
        }
      );
    };

    if (courseRows && courseRows.length > 0) {
      return enrollStudent(courseRows[0].course_id, courseRows[0].course_name);
    }

    db.query(
      `INSERT INTO ${COURSE_TABLE} (course_name, credits, dept_id) VALUES (?, 3, ?)`,
      [courseName, deptId],
      (insertErr, result) => {
        if (insertErr) return res.status(500).json({ error: "Failed to create course" });
        return enrollStudent(result.insertId, courseName);
      }
    );
  });
});

const getRandomPerformanceSample = () => {
  const r = Math.random();
  let aMin = 55, aMax = 75, sMin = 40, sMax = 60;
  if (r > 0.35 && r <= 0.75) { aMin = 70; aMax = 88; sMin = 60; sMax = 82; }
  else if (r > 0.75) { aMin = 85; aMax = 98; sMin = 82; sMax = 98; }
  const attendance = Math.round((aMin + Math.random() * (aMax - aMin)) * 10) / 10;
  const score = Math.round(sMin + Math.random() * (sMax - sMin));
  return { attendance, marksObtained: score, marksTotal: 100 };
};

router.get("/api/student-performance", (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
  if (!req.session.user || req.session.user.role !== "student") return res.json({ performance: [] });

  const userId = Number(req.session.userId);
  db.query(
    `INSERT INTO ${PERFORMANCE_TABLE} (auth_user_id, course_id, attendance_pct, marks_obtained, marks_total, focus_area)
     SELECT e.auth_user_id, e.course_id, 82.50, 76, 100, CONCAT('Focus on practice in ', c.course_name)
     FROM ${ENROLL_TABLE} e
     JOIN ${COURSE_TABLE} c ON c.course_id = e.course_id
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
            let att = row.attendance_pct;
            let mo = row.marks_obtained;
            let mt = row.marks_total;
            if (att == 82.5 && mo == 76 && mt == 100) {
              const sample = getRandomPerformanceSample();
              att = sample.attendance;
              mo = sample.marksObtained;
              mt = sample.marksTotal;
            }
            return {
              course_name: row.course_name,
              attendance_pct: att,
              marks_obtained: mo,
              marks_total: mt,
              score_pct: mt > 0 ? Math.round((mo / mt) * 100) : null,
              focus_area: row.focus_area || `Keep improving in ${row.course_name}.`,
              updated_at: row.updated_at
            };
          });
          return res.json({ performance });
        }
      );
    }
  );
});

router.get("/api/teacher/students-performance", (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
  if (!req.session.user || req.session.user.role !== "teacher") return res.status(403).json({ error: "Teachers only" });

  const teacherId = Number(req.session.userId);
  const deptId = Number(req.session.user.dept_id);
  const universityId = Number(req.session.user.university_id);

  db.query(
    `SELECT u.id AS student_id, u.username AS student_name, u.email AS student_email,
            c.course_name, p.attendance_pct, p.marks_obtained, p.marks_total, p.focus_area, p.updated_at
     FROM ${AUTH_TABLE} u
     LEFT JOIN ${ENROLL_TABLE} e ON e.auth_user_id = u.id
     LEFT JOIN ${COURSE_TABLE} c ON c.course_id = e.course_id
     LEFT JOIN ${PERFORMANCE_TABLE} p ON p.auth_user_id = e.auth_user_id AND p.course_id = e.course_id
     WHERE u.role = 'student'
       AND u.dept_id = ?
       AND u.university_id = ?
       AND (c.teacher_id = ? OR c.teacher_id IS NULL OR c.dept_id = ? OR c.course_id IS NULL)
     ORDER BY u.username ASC, c.course_name ASC`,
    [deptId, universityId, teacherId, deptId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "Failed to load student data" });
      const students = (rows || []).map((row) => {
        let att = row.attendance_pct;
        let mo = row.marks_obtained;
        let mt = row.marks_total;
        if (att == 82.5 && mo == 76 && mt == 100) {
          const sample = getRandomPerformanceSample();
          att = sample.attendance;
          mo = sample.marksObtained;
          mt = sample.marksTotal;
        }
        return {
          student_id: row.student_id,
          student_name: row.student_name,
          student_email: row.student_email,
          course_name: row.course_name,
          attendance_pct: att,
          marks_obtained: mo,
          marks_total: mt,
          score_pct: mt > 0 ? Math.round((mo / mt) * 100) : null,
          focus_area: row.focus_area || null,
          updated_at: row.updated_at
        };
      });

      const attValues = students.map((student) => student.attendance_pct).filter(Number.isFinite);
      const scoreValues = students.map((student) => student.score_pct).filter(Number.isFinite);
      return res.json({
        summary: {
          student_count: new Set(students.map((student) => student.student_id)).size,
          avg_attendance_pct: attValues.length ? Math.round((attValues.reduce((a, b) => a + b, 0) / attValues.length) * 10) / 10 : null,
          avg_score_pct: scoreValues.length ? Math.round((scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length) * 10) / 10 : null
        },
        students
      });
    }
  );
});

router.get("/api/university/dashboard", (req, res) => {
  if (!requireUniversity(req, res)) return;
  const universityId = Number(req.session.userId);
  const summarySql = `
    SELECT
      (SELECT COUNT(*) FROM ${AUTH_TABLE} WHERE university_id = ?) AS total_students,
      (SELECT COUNT(*) FROM ${TEACHER_TABLE} WHERE university_id = ?) AS total_teachers,
      (SELECT COUNT(*) FROM ${COURSE_TABLE} c LEFT JOIN ${TEACHER_TABLE} t ON t.teacher_id = c.teacher_id WHERE t.university_id = ?) AS total_courses,
      (SELECT COUNT(*) FROM ${COURSE_TABLE} c LEFT JOIN ${TEACHER_TABLE} t ON t.teacher_id = c.teacher_id WHERE t.university_id = ? AND c.video_path LIKE '/uploads/%') AS uploaded_videos
  `;

  db.query(summarySql, [universityId, universityId, universityId, universityId], (summaryErr, summaryRows) => {
    if (summaryErr) return res.status(500).json({ error: "Failed to load university summary" });
    db.query(
      `SELECT e.enrollment_id, e.enrollment_date,
              u.id AS student_id, u.username AS student_name, u.email AS student_email,
              c.course_id, c.course_name, c.video_path,
              t.teacher_id, t.name AS teacher_name,
              d.dept_name
       FROM ${ENROLL_TABLE} e
       JOIN ${AUTH_TABLE} u ON u.id = e.auth_user_id
       JOIN ${COURSE_TABLE} c ON c.course_id = e.course_id
       LEFT JOIN ${TEACHER_TABLE} t ON t.teacher_id = c.teacher_id
       LEFT JOIN ${DEPT_TABLE} d ON d.dept_id = c.dept_id
       WHERE u.university_id = ?
       ORDER BY e.enrollment_date DESC, u.username ASC`,
      [universityId],
      (enrollErr, enrollmentRows) => {
        if (enrollErr) return res.status(500).json({ error: "Failed to load student enrollments" });
        db.query(
          `SELECT c.course_id, c.course_name, c.video_path, d.dept_name, t.teacher_id, t.name AS teacher_name
           FROM ${COURSE_TABLE} c
           LEFT JOIN ${DEPT_TABLE} d ON d.dept_id = c.dept_id
           LEFT JOIN ${TEACHER_TABLE} t ON t.teacher_id = c.teacher_id
           LEFT JOIN ${ENROLL_TABLE} e ON e.course_id = c.course_id
           LEFT JOIN ${AUTH_TABLE} u ON u.id = e.auth_user_id
           WHERE t.university_id = ? OR u.university_id = ?
           ORDER BY c.course_name ASC`,
          [universityId, universityId],
          (courseErr, courseRows) => {
            if (courseErr) return res.status(500).json({ error: "Failed to load courses" });
            db.query(
              `SELECT t.teacher_id, t.name AS teacher_name, t.email AS teacher_email, t.subject, d.dept_name,
                      COUNT(DISTINCT e.auth_user_id) AS student_count,
                      ROUND(AVG(p.attendance_pct), 1) AS avg_attendance_pct,
                      ROUND(AVG(CASE WHEN p.marks_total > 0 THEN (p.marks_obtained / p.marks_total) * 100 ELSE NULL END), 1) AS avg_score_pct,
                      COUNT(DISTINCT CASE WHEN c.video_path LIKE '/uploads/%' THEN c.course_id END) AS uploaded_course_count
               FROM ${TEACHER_TABLE} t
               LEFT JOIN ${DEPT_TABLE} d ON d.dept_id = t.dept_id
               LEFT JOIN ${COURSE_TABLE} c ON c.teacher_id = t.teacher_id
               LEFT JOIN ${ENROLL_TABLE} e ON e.course_id = c.course_id
               LEFT JOIN ${PERFORMANCE_TABLE} p ON p.auth_user_id = e.auth_user_id AND p.course_id = c.course_id
               WHERE t.university_id = ?
               GROUP BY t.teacher_id, t.name, t.email, t.subject, d.dept_name
               ORDER BY t.name ASC`,
              [universityId],
              (teacherErr, teacherRows) => {
                if (teacherErr) return res.status(500).json({ error: "Failed to load teacher performance" });
                db.query(
                  `SELECT d.dept_id, d.dept_name,
                          s.id AS student_id, s.username AS student_name, s.email AS student_email,
                          t.teacher_id, t.name AS teacher_name, t.email AS teacher_email, t.subject
                   FROM ${DEPT_TABLE} d
                   LEFT JOIN ${AUTH_TABLE} s
                     ON s.dept_id = d.dept_id
                    AND s.university_id = ?
                    AND s.role = 'student'
                   LEFT JOIN ${TEACHER_TABLE} t
                     ON t.dept_id = d.dept_id
                    AND t.university_id = ?
                   ORDER BY d.dept_name ASC, s.username ASC, t.name ASC`,
                  [universityId, universityId],
                  (branchErr, branchRows) => {
                    if (branchErr) return res.status(500).json({ error: "Failed to load branch data" });

                    const branchMap = new Map();
                    (branchRows || []).forEach((row) => {
                      if (!branchMap.has(row.dept_id)) {
                        branchMap.set(row.dept_id, {
                          dept_id: row.dept_id,
                          dept_name: row.dept_name,
                          students: [],
                          teachers: []
                        });
                      }

                      const branch = branchMap.get(row.dept_id);
                      if (row.student_id && !branch.students.some((student) => student.student_id === row.student_id)) {
                        branch.students.push({
                          student_id: row.student_id,
                          student_name: row.student_name,
                          student_email: row.student_email
                        });
                      }
                      if (row.teacher_id && !branch.teachers.some((teacher) => teacher.teacher_id === row.teacher_id)) {
                        branch.teachers.push({
                          teacher_id: row.teacher_id,
                          teacher_name: row.teacher_name,
                          teacher_email: row.teacher_email,
                          subject: row.subject || null
                        });
                      }
                    });

                    return res.json({
                      summary: summaryRows && summaryRows[0] ? summaryRows[0] : {},
                      enrollments: enrollmentRows || [],
                      courses: (courseRows || []).map((course) => ({
                        ...course,
                        video_path: resolveCourseVideoPath(course.course_name, course.video_path)
                      })),
                      teachers: teacherRows || [],
                      branches: Array.from(branchMap.values())
                    });
                  }
                );
              }
            );
          }
        );
      }
    );
  });
});

router.post("/api/university/enrollments/remove", (req, res) => {
  if (!requireUniversity(req, res)) return;

  const enrollmentId = Number(req.body && req.body.enrollmentId);
  const universityId = Number(req.session.userId);

  db.query(
    `SELECT e.enrollment_id, e.auth_user_id, e.course_id
     FROM ${ENROLL_TABLE} e
     JOIN ${AUTH_TABLE} u ON u.id = e.auth_user_id
     WHERE e.enrollment_id = ? AND u.university_id = ?
     LIMIT 1`,
    [enrollmentId, universityId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "Failed to validate enrollment" });
      if (!rows || rows.length === 0) return res.status(404).json({ error: "Enrollment not found" });
      db.query(
        `DELETE FROM ${PERFORMANCE_TABLE} WHERE auth_user_id = ? AND course_id = ?`,
        [rows[0].auth_user_id, rows[0].course_id],
        (perfErr) => {
          if (perfErr) return res.status(500).json({ error: "Failed to remove performance data" });
          db.query(`DELETE FROM ${ENROLL_TABLE} WHERE enrollment_id = ?`, [enrollmentId], (deleteErr) => {
            if (deleteErr) return res.status(500).json({ error: "Failed to remove enrollment" });
            return res.json({ message: "Student removed from the course" });
          });
        }
      );
    }
  );
});

router.post("/api/university/enrollments/change", (req, res) => {
  if (!requireUniversity(req, res)) return;

  const enrollmentId = Number(req.body && req.body.enrollmentId);
  const newCourseId = Number(req.body && req.body.newCourseId);
  const universityId = Number(req.session.userId);

  db.query(
    `SELECT e.enrollment_id, e.auth_user_id, e.course_id
     FROM ${ENROLL_TABLE} e
     JOIN ${AUTH_TABLE} u ON u.id = e.auth_user_id
     WHERE e.enrollment_id = ? AND u.university_id = ?
     LIMIT 1`,
    [enrollmentId, universityId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "Failed to validate enrollment" });
      if (!rows || rows.length === 0) return res.status(404).json({ error: "Enrollment not found" });
      db.query(`SELECT course_id, course_name FROM ${COURSE_TABLE} WHERE course_id = ? LIMIT 1`, [newCourseId], (courseErr, courseRows) => {
        if (courseErr) return res.status(500).json({ error: "Failed to validate course" });
        if (!courseRows || courseRows.length === 0) return res.status(404).json({ error: "Target course not found" });
        db.query(
          `UPDATE ${ENROLL_TABLE} SET course_id = ?, enrollment_date = CURDATE() WHERE enrollment_id = ?`,
          [newCourseId, enrollmentId],
          (updateErr) => {
            if (updateErr) return res.status(500).json({ error: "Failed to change student course" });
            db.query(
              `DELETE FROM ${PERFORMANCE_TABLE} WHERE auth_user_id = ? AND course_id = ?`,
              [rows[0].auth_user_id, rows[0].course_id],
              (perfErr) => {
                if (perfErr) return res.status(500).json({ error: "Course updated but performance cleanup failed" });
                return res.json({ message: "Student course updated successfully", courseName: courseRows[0].course_name });
              }
            );
          }
        );
      });
    }
  );
});

router.post("/api/university/courses/remove-video", (req, res) => {
  if (!requireUniversity(req, res)) return;

  const courseId = Number(req.body && req.body.courseId);
  const universityId = Number(req.session.userId);

  db.query(
    `SELECT c.course_id, c.video_path
     FROM ${COURSE_TABLE} c
     JOIN ${TEACHER_TABLE} t ON t.teacher_id = c.teacher_id
     WHERE c.course_id = ? AND t.university_id = ?
     LIMIT 1`,
    [courseId, universityId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "Failed to validate course" });
      if (!rows || rows.length === 0) return res.status(404).json({ error: "Course not found" });
      if (!String(rows[0].video_path || "").startsWith("/uploads/")) {
        return res.status(400).json({ error: "This course does not have a teacher-uploaded file" });
      }

      const absoluteFile = path.join(__dirname, "..", "..", "public", String(rows[0].video_path).replace(/^\//, ""));
      db.query(`UPDATE ${COURSE_TABLE} SET video_path = NULL WHERE course_id = ?`, [courseId], (updateErr) => {
        if (updateErr) return res.status(500).json({ error: "Failed to remove uploaded file" });
        fs.unlink(absoluteFile, (unlinkErr) => {
          if (unlinkErr && unlinkErr.code !== "ENOENT") {
            console.error("Failed to delete uploaded file:", unlinkErr.message);
          }
          return res.json({ message: "Teacher uploaded file deleted successfully" });
        });
      });
    }
  );
});

router.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/pages/login.html");
});

module.exports = router;
