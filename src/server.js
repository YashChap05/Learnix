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

// ─── Multer for video uploads ────────────────
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

app.use(express.static(PUBLIC_DIR));

// ─── Teacher video upload ─────────────────────
app.post("/api/teacher/upload-video", (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: "Please log in first" });
  if (!req.session.user || req.session.user.role !== "teacher") {
    return res.status(403).json({ error: "Only teachers can upload videos" });
  }
  uploadVideo.single("courseVideo")(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || "Upload failed" });
    const courseName = req.body && req.body.courseName ? String(req.body.courseName).trim() : "";
    if (!courseName) return res.status(400).json({ error: "courseName is required" });
    if (!req.file) return res.status(400).json({ error: "courseVideo is required" });
    const filePath = `/uploads/${req.file.filename}`;
    db.query(
      `UPDATE courses SET video_path = ? WHERE course_name = ?`,
      [filePath, courseName],
      (upErr) => {
        if (upErr) return res.status(500).json({ error: "Upload succeeded but course update failed" });
        return res.json({ message: "Video uploaded successfully", filePath, courseName });
      }
    );
  });
});

// ─── AI generation endpoint ───────────────────
app.post("/api/generate", async (req, res) => {
  const { videoUrl, maxQuestions = 5 } = req.body || {};
  if (!videoUrl) return res.status(400).json({ error: "videoUrl required" });

  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_KEY) {
    const summary = `This video covers core concepts relevant to your course. It introduces foundational ideas and practical techniques used in real-world applications.`;
    const questions = [
      { question: "What is the main topic of this video?", answer: "Core concepts and practical techniques of the subject." },
      { question: "Why is this subject important?", answer: "It forms the foundation for many real-world applications." },
      { question: "What tools or languages are discussed?", answer: "Various tools relevant to the course topic." }
    ];
    return res.json({ summary, summary_html: `<p>${summary}</p>`, questions: questions.slice(0, maxQuestions) });
  }

  try {
    const payload = {
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: `You output JSON only: {"summary":"...","summary_html":"...","questions":[{"question":"...","answer":"..."}]}` },
        { role: "user", content: `Summarize this video and generate ${maxQuestions} quiz questions. Video: ${videoUrl}` }
      ],
      temperature: 0.2,
      max_tokens: 800
    };
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_KEY}` },
      body: JSON.stringify(payload)
    });
    if (!resp.ok) return res.status(502).json({ error: "OpenAI API error" });
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
