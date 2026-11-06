
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'notes',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'notes',
});

// Without this handler, a connection dropped by Postgres (restart, failover) crashes the process
pool.on('error', (err) => {
  console.error('Unexpected idle database client error:', err.message);
});

module.exports = pool;
