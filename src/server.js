require("dotenv").config();
const express = require("express");
const session = require("express-session");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const authRoutes = require("./routes/auth");
const db = require("./config/database");

const app = express();
const PORT = Number(process.env.PORT) || 3456;
const PUBLIC_DIR = path.join(__dirname, "..", "public");
const UPLOADS_DIR = path.join(PUBLIC_DIR, "uploads");
const AUTH_TABLE = "auth_users";

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

function ensureStudentYearColumn() {
  db.query(
    `ALTER TABLE ${AUTH_TABLE} ADD COLUMN academic_year VARCHAR(30) NULL AFTER university_id`,
    (err) => {
      if (!err || err.code === "ER_DUP_FIELDNAME") return;
      console.error("Failed to ensure auth_users.academic_year column:", err.message);
    }
  );
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

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeTopicLabel(value = "", fallback = "this chapter") {
  const cleaned = String(value || "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || fallback;
}

function buildFallbackAiResponse(videoUrl = "", maxQuestions = 5, reason = "") {
  let subject = "this subject";
  let chapter = "this chapter";

  try {
    const parsedUrl = new URL(String(videoUrl || ""), "http://localhost");
    subject = normalizeTopicLabel(parsedUrl.searchParams.get("subject"), "this subject");
    chapter = normalizeTopicLabel(parsedUrl.searchParams.get("chapter"), "this chapter");
  } catch (_) {
    subject = "this subject";
    chapter = "this chapter";
  }

  const summary = `${chapter} in ${subject} introduces the main ideas students should understand first, then connects those ideas to examples, definitions, and likely exam-oriented revision points. Focus on the terminology used in the lesson, how each concept relates to the overall topic, and where the chapter would be applied in problem solving or practical understanding. After watching, revise the core points, recheck any formulas, steps, or keywords mentioned, and test yourself with short-answer questions so the chapter becomes easier to recall during study and exams.`;

  const summaryHtml = `
    <p><strong>${escapeHtml(chapter)}</strong> in <strong>${escapeHtml(subject)}</strong> explains the foundation of the topic and highlights the ideas you should be comfortable with before moving ahead.</p>
    <p>While revising, pay attention to important definitions, the sequence of concepts, and any examples or applications that show how the topic works in practice.</p>
    <p>A good study approach is to replay the difficult parts, note the key terms, and practice explaining the chapter in your own words.</p>
  `;

  const questions = [
    { question: `What is the main idea covered in ${chapter}?`, answer: `${chapter} focuses on the core concepts, definitions, and practical understanding of the topic.` },
    { question: `What should you revise after studying ${chapter}?`, answer: `You should revise the key definitions, concepts, examples, and important terms from ${chapter}.` },
    { question: `How can you improve your understanding of ${chapter}?`, answer: `Replay the lesson, review the summary, make short notes, and practice chapter questions.` },
    { question: `Why is ${chapter} important in ${subject}?`, answer: `It builds foundational understanding that helps with later topics, revision, and exam preparation in ${subject}.` },
    { question: `What is an effective way to remember ${chapter}?`, answer: `Use short notes, active recall, and regular practice with examples and questions.` }
  ];

  return {
    summary,
    summary_html: summaryHtml,
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
    return res.json(buildFallbackAiResponse(videoUrl, maxQuestions, "OPENAI_API_KEY is not configured."));
  }

  if (!OPENAI_KEY.startsWith("sk-")) {
    console.warn("AI summary fallback: OPENAI_API_KEY does not look like a valid OpenAI key.");
    return res.json(buildFallbackAiResponse(videoUrl, maxQuestions, "Configured API key is not an OpenAI key."));
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
      return res.json(buildFallbackAiResponse(videoUrl, maxQuestions, `OpenAI request failed with status ${resp.status}.`));
    }
    const body = await resp.json();
    const content = body.choices?.[0]?.message?.content || "{}";
    let parsed;
    try { parsed = JSON.parse(content); } catch { parsed = { summary: content, summary_html: `<p>${content}</p>`, questions: [] }; }
    parsed.questions = Array.isArray(parsed.questions) ? parsed.questions.slice(0, maxQuestions) : [];
    return res.json(parsed);
  } catch (err) {
    console.error("AI generation failed:", err.message);
    return res.json(buildFallbackAiResponse(videoUrl, maxQuestions, "AI service is unavailable right now. Showing local summary instead."));
  }
});

app.listen(PORT, () => {
  ensureStudentYearColumn();
  console.log(`\n🚀 Learnix running at http://localhost:${PORT}`);
  console.log(`   Visit: http://localhost:${PORT}/pages/login.html\n`);
});
