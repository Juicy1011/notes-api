const app = require('./app');
const pool = require('./db');

const PORT = Number(process.env.PORT) || 3000;

// The database container may still be starting, so retry instead of crashing
async function initDb(retries = 10) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS notes (
          id SERIAL PRIMARY KEY,
          title TEXT NOT NULL,
          content TEXT NOT NULL DEFAULT '',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      return;
    } catch (err) {
      console.log(`Database not ready (attempt ${attempt}/${retries}): ${err.message}`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
  throw new Error('Could not connect to the database');
}

async function main() {
  await initDb();
  const server = app.listen(PORT, () => console.log(`notes-api listening on port ${PORT}`));

  // Graceful shutdown so Docker and Kubernetes can stop the container cleanly
  const shutdown = () => {
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
