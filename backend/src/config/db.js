const mysql = require("mysql2/promise");

let pool;

function getPool() {
  if (pool) return pool;

  const host = process.env.DB_HOST;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_NAME;
  const port = process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306;

  if (!host || !user || !database) {
    const missing = ["DB_HOST", "DB_USER", "DB_NAME"].filter(
      (k) => !process.env[k]
    );
    throw new Error(
      `Missing database env vars: ${missing.join(
        ", "
      )}. Create backend/.env from backend/.env.example.`
    );
  }

  pool = mysql.createPool({
    host,
    user,
    password,
    database,
    port,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    namedPlaceholders: true,
    timezone: "Z",
  });

  return pool;
}

async function query(sql, params) {
  const [rows] = await getPool().execute(sql, params);
  return rows;
}

module.exports = { getPool, query };

