require("dotenv").config();
const mysql = require("mysql2");

const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "Reshma79",
  database: process.env.DB_NAME || "learnix",
});

// Listen for connection error events
db.on('error', (err) => {
  console.error("❌ DB connection error:", err.message);
  process.exit(1);
});

// Also listen for general errors
db.on('protocol_error', (err) => {
  console.error("❌ DB protocol error:", err.message);
  process.exit(1);
});

// Try to connect
const timeout = setTimeout(() => {
  console.error("❌ Connection timeout - database not responding");
  process.exit(1);
}, 5000);

db.connect((err) => {
  if (err) {
    clearTimeout(timeout);
    console.error("❌ DB connection failed:", err.message);
    process.exit(1);
  }
  console.log("✅ Connected to MySQL:", process.env.DB_NAME || "learnix");

  db.query("SHOW TABLES", (err2, rows) => {
    clearTimeout(timeout);
    if (err2) {
      console.error("❌ Query error:", err2.message);
      db.end();
      process.exit(1);
      return;
    }
    console.log("\n📋 Tables in database:");
    (rows || []).forEach(r => console.log(" •", Object.values(r)[0]));
    console.log("\n✅ Database check complete!\n");
    db.end(() => process.exit(0));
  });
});
