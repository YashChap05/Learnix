const express = require("express");
const path = require("path");
const mysql = require("mysql2/promise");
const bodyParser = require("body-parser");
const session = require("express-session");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// Session configuration
app.use(session({
  secret: 'learnix-secret-key-2024',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));


let users = [];
let sessions = {};

// Try to initialize MySQL, but use in-memory fallback if it fails
let useMySQL = false;
let pool = null;

async function initializeDatabase() {
  try {
    const mysql = require("mysql2/promise");
    
    pool = mysql.createPool({
      host: 'localhost',
      user: 'root',
      password: 'Reshma79', // Change this to your MySQL password
      database: 'world',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    
    const connection = await pool.getConnection();
    /*await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        fullname VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);*/


    connection.release();
    useMySQL = true;
    console.log('✓ MySQL database initialized successfully');
  } catch (err) {
    console.log('⚠ MySQL not available, using in-memory database:', err.message);
    useMySQL = false;
  }
}

initializeDatabase();

// Root -> index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Signup endpoint
app.post('/api/signup', async (req, res) => {
  const { fullname, email, password } = req.body;

  if (!fullname || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    if (useMySQL && pool) {
      const connection = await pool.getConnection();
      
      // Check if email already exists
      const [existingUser] = await connection.execute(
        'SELECT UserEmailAddress FROM UserLogin WHERE UserEmailAddress = ?',
        [email]
      );

      if (existingUser.length > 0) {
        connection.release();
        return res.status(400).json({ error: 'Email already registered' });
      }

      // Insert user into database
      const [result] = await connection.execute(
        'INSERT INTO UserLogin (UserName, UserEmailAddress, UserPassword) VALUES (?, ?, ?)',
        [fullname, email, password]
      );

      connection.release();

      // Create session
      req.session.userId = result.insertId;
      req.session.fullname = fullname;
      req.session.email = email;

      console.log('New User ID', result.insertId);

      res.json({ 
        success: true, 
        message: 'Signup successful',
        user: {
          id: result.insertId,
          fullname: fullname,
          email: email
        }
      });
    } else {
      // Use in-memory database
      if (users.find(u => u.email === email)) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      const newUser = {
        id: users.length + 1,
        fullname: fullname,
        email: email,
        password: password,
        created_at: new Date()
      };

      users.push(newUser);

      // Create session
      req.session.userId = newUser.id;
      req.session.fullname = fullname;
      req.session.email = email;

      res.json({ 
        success: true, 
        message: 'Signup successful',
        user: {
          id: newUser.id,
          fullname: fullname,
          email: email
        }
      });
    }
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  try {
    if (useMySQL && pool) {
      const connection = await pool.getConnection();
      
      const [users] = await connection.execute(
        'SELECT * FROM UserLogin WHERE UserEmailAddress = ? AND UserPassword = ?',
        [email, password]
      );

      connection.release();

      if (users.length === 0) {
        return res.status(401).json({ error: 'Invalid email or password' });
      } 

      const user = users[0];

      // Create session
      req.session.userId = user.UserID;
      req.session.fullname = user.UserName;
      req.session.email = user.UserEmailAddress;

      res.json({ 
        success: true, 
        message: 'Login successful',
        user: {
          id: user.UserID,
          fullname: user.UserName,
          email: user.UserEmailAddress
        }
      });
    } else {
      // Use in-memory database
      const user = users.find(u => u.email === email && u.password === password);

      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Create session
      req.session.userId = user.id;
      req.session.fullname = user.fullname;
      req.session.email = user.email;

      res.json({ 
        success: true, 
        message: 'Login successful',
        user: {
          id: user.id,
          fullname: user.fullname,
          email: user.email
        }
      });
    }
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Get current user info
app.get('/api/user', (req, res) => {
  if (req.session.userId) {
    res.json({
      id: req.session.userId,
      fullname: req.session.fullname,
      email: req.session.email
    });
  } else {
    res.status(401).json({ error: 'Not logged in' });
  }
});

// Logout endpoint
app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ success: true, message: 'Logout successful' });
  });
});

// Simple AI generation endpoint. If OPENAI_API_KEY is set, this will call OpenAI's chat API.
app.post('/api/generate', async (req, res) => {
  const { videoUrl, maxQuestions = 5 } = req.body || {};

  // Basic validation
  if (!videoUrl) return res.status(400).json({ error: 'videoUrl required' });

  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_KEY) {
    // Return a safe mock response if no API key is configured.
    const summary = `This video (${videoUrl}) is an introductory lecture on Data Science. It covers core concepts such as data cleaning, exploratory data analysis, and an overview of common tools like Python, R, and visualization libraries. The lecture also briefly introduces machine learning approaches and the roles of statistics and domain knowledge in building models.`;
    const questions = [
      { question: 'What is the main goal of data cleaning?', answer: 'To remove or correct errors and inconsistencies so data is reliable for analysis.' },
      { question: 'Name one common language used in data science.', answer: 'Python' },
      { question: 'What does exploratory data analysis help with?', answer: 'Understanding data distributions and spotting anomalies before modeling.' }
    ];
    return res.json({ summary, summary_html: `<p>${summary}</p>`, questions: questions.slice(0, maxQuestions) });
  }

  try {
    const prompt = `You are an assistant that reads a short description or metadata about a video and returns: 1) a 2-3 paragraph summary in plain text, 2) an HTML-safe summary in \
      a single string, and 3) a JSON array of ${maxQuestions} question objects with 'question' and concise 'answer' fields. Return JSON only.\n\nVideo reference: ${videoUrl}`;

    const payload = {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You output JSON only: {"summary":"...","summary_html":"...","questions":[{"question":"...","answer":"..."}] }' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 800
    };

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_KEY}`
      },
      body: JSON.stringify(payload)
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error('OpenAI error', resp.status, text);
      return res.status(502).json({ error: 'OpenAI API error', detail: text });
    }

    const body = await resp.json();
    const assistant = body.choices && body.choices[0] && body.choices[0].message && body.choices[0].message.content;
    // Try to parse JSON out of assistant content
    let parsed = null;
    try {
      parsed = JSON.parse(assistant);
    } catch (e) {
      // If Assistant replied with plain text, wrap it
      parsed = { summary: assistant, summary_html: `<p>${assistant.replace(/\n/g,'</p><p>')}</p>`, questions: [] };
    }

    // Ensure questions array
    parsed.questions = Array.isArray(parsed.questions) ? parsed.questions.slice(0, maxQuestions) : [];

    return res.json(parsed);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});