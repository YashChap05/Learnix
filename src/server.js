require("dotenv").config();
const express = require("express");
const session = require("express-session");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const authRoutes = require("./routes/auth");
const db = require("./config/database");

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "..", "public");
const UPLOADS_DIR = path.join(PUBLIC_DIR, "uploads");

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

//  ─── Multer for video uploads ────────────────
const uploadStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const safe = String(file.originalname || "video").replace(/[^\w.\-]/g, "_").toLowerCase();
    cb(null, `${Date.now()}-${safe}`);
  }
});

const uploadVideo = multer({
  storage: uploadStorage,
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (String(file.mimetype || "").startsWith("video/")) return cb(null, true);
    cb(new Error("Only video files are allowed"));
  }
});

// ─── Middleware ───────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || "learnix-secret-key-2025",
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

app.use(authRoutes);

// ─── Root & redirects ─────────────────────────
app.get("/", (_req, res) => res.redirect("/pages/login.html"));
app.get("/dashboard.html", (_req, res) => res.redirect("/dashboard"));
app.get("/profile.html", (_req, res) => res.redirect("/profile"));
app.get("/login.html", (_req, res) => res.redirect("/pages/login.html"));
app.get("/signup.html", (_req, res) => res.redirect("/pages/signup.html"));
app.get("/Courses.html", (_req, res) => res.redirect("/pages/courses.html"));
app.get("/Sample_vid.html", (_req, res) => res.redirect("/pages/webdev-video.html"));
app.get("/Python_vid.html", (_req, res) => res.redirect("/pages/python-video.html"));
app.get("/DS_vid.html", (_req, res) => res.redirect("/pages/ds-video.html"));
app.get("/UIUX_vid.html", (_req, res) => res.redirect("/pages/uiux-video.html"));

app.use("/uploads", (req, res, next) => {
  if (!req.session.userId || !req.session.user) {
    return res.status(401).send("Please log in first");
  }

  if (req.session.user.role === "university" || req.session.user.role === "admin") {
    return next();
  }

  const userDeptId = Number(req.session.user.dept_id);
  if (!Number.isInteger(userDeptId) || userDeptId <= 0) {
    return res.status(403).send("Department access is required");
  }

  const requestedPath = `/uploads${req.path}`;
  db.query(
    "SELECT course_id FROM courses WHERE video_path = ? AND dept_id = ? LIMIT 1",
    [requestedPath, userDeptId],
    (err, rows) => {
      if (err) return res.status(500).send("Failed to verify video access");
      if (!rows || rows.length === 0) {
        return res.status(403).send("You do not have access to this video");
      }
      return next();
    }
  );
});

app.use(express.static(PUBLIC_DIR));

function buildFallbackAiResponse(maxQuestions = 5, reason = "") {
  const summary = "This lesson covers core concepts relevant to your course and highlights practical ideas you should review while studying the chapter.";
  const questions = [
    { question: "What is the main focus of this lesson?", answer: "The lesson focuses on the chapter's core concepts and practical understanding." },
    { question: "What should you revise after watching the chapter?", answer: "You should revise the important concepts, terms, and examples from the lesson." },
    { question: "How can you improve your understanding of this topic?", answer: "Review the summary, replay the lesson if needed, and practice answering chapter questions." }
  ];

  return {
    summary,
    summary_html: `<p>${summary}</p>`,
    questions: questions.slice(0, maxQuestions),
    warning: reason || undefined
  };
}

// ─── Teacher video upload ─────────────────────
app.post("/api/teacher/upload-video", (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: "Please log in first" });
  if (!req.session.user || req.session.user.role !== "teacher") {
    return res.status(403).json({ error: "Only teachers can upload videos" });
  }
  uploadVideo.single("courseVideo")(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || "Upload failed" });
    const teacherId = Number(req.session.userId);
    const teacherDeptId = Number(req.session.user && req.session.user.dept_id);
    const courseName = req.body && req.body.courseName ? String(req.body.courseName).trim() : "";
    const rawCourseId = req.body && req.body.courseId ? Number(req.body.courseId) : null;
    if (!courseName && !Number.isInteger(rawCourseId)) {
      return res.status(400).json({ error: "courseName or courseId is required" });
    }
    if (!req.file) return res.status(400).json({ error: "courseVideo is required" });
    if (!Number.isInteger(teacherDeptId) || teacherDeptId <= 0) {
      return res.status(400).json({ error: "Teacher department not found" });
    }

    const selectSql = Number.isInteger(rawCourseId)
      ? "SELECT course_id, course_name, teacher_id, dept_id FROM courses WHERE course_id = ? LIMIT 1"
      : "SELECT course_id, course_name, teacher_id, dept_id FROM courses WHERE course_name = ? LIMIT 1";
    const selectVal = Number.isInteger(rawCourseId) ? rawCourseId : courseName;

    db.query(selectSql, [selectVal], (findErr, courseRows) => {
      if (findErr) return res.status(500).json({ error: "Failed to validate course" });
      if (!courseRows || courseRows.length === 0) {
        return res.status(404).json({ error: "Course not found" });
      }

      const course = courseRows[0];
      if (course.teacher_id && Number(course.teacher_id) !== teacherId) {
        return res.status(403).json({ error: "This course belongs to another teacher" });
      }
      if (course.dept_id && Number(course.dept_id) !== teacherDeptId) {
        return res.status(403).json({ error: "You can only upload videos for your department" });
      }

      const filePath = `/uploads/${req.file.filename}`;
      db.query(
        `UPDATE courses
         SET video_path = ?, teacher_id = COALESCE(teacher_id, ?), dept_id = COALESCE(dept_id, ?)
         WHERE course_id = ?`,
        [filePath, teacherId, teacherDeptId, course.course_id],
        (upErr) => {
          if (upErr) return res.status(500).json({ error: "Upload succeeded but course update failed" });
          return res.json({
            message: "Video uploaded successfully",
            filePath,
            courseId: course.course_id,
            courseName: course.course_name
          });
        }
      );
    });
  });
});

// ─── AI generation endpoint ───────────────────
app.post("/api/generate", async (req, res) => {
  const { videoUrl, maxQuestions = 5 } = req.body || {};
  if (!videoUrl) return res.status(400).json({ error: "videoUrl required" });

  const OPENAI_KEY = String(process.env.OPENAI_API_KEY || "").trim();
  const OPENAI_MODEL = String(process.env.OPENAI_MODEL || "gpt-4o-mini").trim();
  const OPENAI_BASE_URL = String(process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").trim().replace(/\/$/, "");

  if (!OPENAI_KEY) {
    return res.json(buildFallbackAiResponse(maxQuestions, "OPENAI_API_KEY is not configured."));
  }

  if (!OPENAI_KEY.startsWith("sk-")) {
    console.warn("AI summary fallback: OPENAI_API_KEY does not look like a valid OpenAI key.");
    return res.json(buildFallbackAiResponse(maxQuestions, "Configured API key is not an OpenAI key."));
  }

  try {
    const payload = {
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: `You output JSON only: {"summary":"...","summary_html":"...","questions":[{"question":"...","answer":"..."}]}` },
        { role: "user", content: `Summarize this video and generate ${maxQuestions} quiz questions. Video: ${videoUrl}` }
      ],
      temperature: 0.2,
      stream: false,
      max_tokens: 800
    };
    const resp = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_KEY}` },
      body: JSON.stringify(payload)
    });
    if (!resp.ok) {
      const errorText = await resp.text();
      console.error(`OpenAI API error (${resp.status}): ${errorText}`);
      return res.json(buildFallbackAiResponse(maxQuestions, `OpenAI request failed with status ${resp.status}.`));
    }
    const body = await resp.json();
    const content = body.choices?.[0]?.message?.content || "{}";
    let parsed;
    try { parsed = JSON.parse(content); } catch { parsed = { summary: content, summary_html: `<p>${content}</p>`, questions: [] }; }
    parsed.questions = Array.isArray(parsed.questions) ? parsed.questions.slice(0, maxQuestions) : [];
    return res.json(parsed);
  } catch (err) {
    return res.status(500).json({ error: "Server error", detail: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 Learnix running at http://localhost:${PORT}`);
  console.log(`   Visit: http://localhost:${PORT}/pages/login.html\n`);
});
