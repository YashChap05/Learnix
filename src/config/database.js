require("dotenv").config();
const mysql = require("mysql2");

const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "learnix"
});

// Catch immediate errors before connect is called
db.on('error', (err) => {
  console.error("❌ MySQL connection error:", err.message);
  if (err.code === 'PROTOCOL_CONNECTION_LOST') console.error("   Connection was closed by the MySQL server");
  if (err.code === 'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR') console.error("   Connection has failed fatally");
  if (err.code === 'PROTOCOL_ENQUEUE_AFTER_QUILTING') console.error("   Connection was terminated by the system");
  if (err.code === 'ECONNREFUSED') console.error("   MySQL server refused connection - is it running?");
  if (err.code === 'ER_ACCESS_DENIED_ERROR') console.error("   Access denied - check username and password");
});

db.connect((err) => {
  if (err) {
    console.error("❌ MySQL connection failed:", err.message);
    console.error("   Make sure MySQL is running and your .env credentials are correct.");
    process.exit(1);
  }
  console.log("✅ Connected to MySQL database:", process.env.DB_NAME || "learnix");
});

module.exports = db;
