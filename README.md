# 📖 Learnix v2.0

A modern remote learning platform — upgraded from scratch with proper file structure, secure authentication, role-based dashboards, and dark mode.

---

## 🗂️ Project Structure

```
learnix/
├── src/
│   ├── server.js              # Main Express server
│   ├── config/
│   │   └── database.js        # MySQL connection (uses .env)
│   └── routes/
│       └── auth.js            # All auth routes + API endpoints
├── public/
│   ├── assets/
│   │   ├── css/main.css       # Global stylesheet (dark mode included)
│   │   ├── js/main.js         # Dark mode toggle
│   │   └── media/videos/      # MP4 course videos
│   └── pages/
│       ├── login.html
│       ├── signup.html
│       ├── home.html
│       ├── courses.html
│       ├── dashboard.html
│       ├── profile.html
│       ├── about.html
│       ├── demo.html
│       ├── webdev-video.html
│       ├── python-video.html
│       ├── ds-video.html
│       └── uiux-video.html
├── sql/
│   └── schema.sql             # Full DB schema
├── scripts/
│   └── db-check.js            # Quick DB connection test
├── .env.example               # Environment variable template
├── .gitignore
└── package.json
```

---

## ⚡ Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Set up your `.env` file

```bash
cp .env.example .env
```

Then edit `.env` with your MySQL credentials:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=learnix
SESSION_SECRET=any-random-string-here
```

### 3. Set up the database

```bash
mysql -u root -p < sql/schema.sql
```

This creates the `learnix` database with all tables and seeds the 4 default courses.

### 4. (Optional) Test DB connection

```bash
npm run db:check
```

### 5. Start the server

```bash
npm start
```

Visit: **http://localhost:3000**

---

## 🔑 Features

| Feature | Details |
|---|---|
| **Auth** | Signup / Login with bcrypt-hashed passwords |
| **OTP Verification** | Email OTP before signup (requires SMTP config in `.env`) |
| **Roles** | Student and Teacher roles with separate dashboards |
| **Student Dashboard** | Attendance %, marks, score, focus area per course |
| **Teacher Dashboard** | All enrolled students, bar charts, donut charts, filters |
| **Dark Mode** | Toggle across all pages, saved to localStorage |
| **Enroll API** | Students can enroll directly from courses page |
| **AI Tools** | Video summary + quiz generation (OpenAI optional) |
| **Department Loader** | Departments loaded from DB into signup/login dropdowns |
| **File Uploads** | Teachers can upload videos via `/api/teacher/upload-video` |

---

## 🌐 API Endpoints

| Method | Route | Description |
|---|---|---|
| `POST` | `/signup` | Register a new user |
| `POST` | `/login` | Authenticate user |
| `GET` | `/logout` | Destroy session |
| `GET` | `/api/me` | Get current session user |
| `GET` | `/api/departments` | List all departments |
| `GET` | `/api/courses` | List all courses |
| `GET` | `/api/my-courses` | Student's enrolled courses |
| `POST` | `/api/enroll` | Enroll in a course |
| `GET` | `/api/student-performance` | Student performance data |
| `GET` | `/api/teacher/students-performance` | Teacher view of all students |
| `POST` | `/api/email-otp/send` | Send OTP to email |
| `POST` | `/api/email-otp/verify` | Verify OTP |
| `POST` | `/api/generate` | AI video summary + quiz |

---

## 🔒 Security Notes

- Passwords are **bcrypt hashed** (10 rounds)
- Session secret from **`.env`** (never hardcoded)
- DB credentials from **`.env`** (never hardcoded)
- Email OTP expires in **10 minutes**
- `.gitignore` excludes `.env` and `node_modules`

---

## 📧 Email OTP Setup (Optional)

For OTP email verification on signup, add these to your `.env`:

```env
EMAIL_SMTP_HOST=smtp.gmail.com
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USER=your@gmail.com
EMAIL_SMTP_PASS=your_app_password   # Use Gmail App Password
EMAIL_FROM=Learnix <your@gmail.com>
```

If SMTP is not configured, the OTP endpoint returns an error — you can skip email verification by removing the OTP check in `auth.js` for local development.

---

## 🤖 OpenAI Integration (Optional)

Add your key to `.env`:

```env
OPENAI_API_KEY=sk-...
```

Without it, the AI endpoint returns mock data (still works for demo purposes).

---

*Built by Yash Chaphekar — Mumbai University, AI & Data Science*
