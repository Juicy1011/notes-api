const express = require('express');
const pool = require('./db');

const app = express();
app.use(express.json());

function parseId(req, res) {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({ error: 'id must be a positive integer' });
    return null;
  }
  return id;
}

function validNote(body) {
  return (
    body &&
    typeof body.title === 'string' &&
    body.title.trim() !== '' &&
    (body.content === undefined || typeof body.content === 'string')
  );
}

// Liveness/readiness probe: also used later by Docker healthchecks and Kubernetes
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch {
    res.status(503).json({ status: 'unavailable' });
  }
});

app.get('/notes', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM notes ORDER BY id');
  res.json(rows);
});

app.get('/notes/:id', async (req, res) => {
  const id = parseId(req, res);
  if (id === null) return;
  const { rows } = await pool.query('SELECT * FROM notes WHERE id = $1', [id]);
  if (rows.length === 0) return res.status(404).json({ error: 'note not found' });
  res.json(rows[0]);
});

app.post('/notes', async (req, res) => {
  if (!validNote(req.body)) {
    return res.status(400).json({ error: 'title (non-empty string) is required' });
  }
  const { title, content = '' } = req.body;
  const { rows } = await pool.query(
    'INSERT INTO notes (title, content) VALUES ($1, $2) RETURNING *',
    [title.trim(), content]
  );
  res.status(201).json(rows[0]);
});

app.put('/notes/:id', async (req, res) => {
  const id = parseId(req, res);
  if (id === null) return;
  if (!validNote(req.body)) {
    return res.status(400).json({ error: 'title (non-empty string) is required' });
  }
  const { title, content = '' } = req.body;
  const { rows } = await pool.query(
    'UPDATE notes SET title = $1, content = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
    [title.trim(), content, id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'note not found' });
  res.json(rows[0]);
});

app.delete('/notes/:id', async (req, res) => {
  const id = parseId(req, res);
  if (id === null) return;
  const { rowCount } = await pool.query('DELETE FROM notes WHERE id = $1', [id]);
  if (rowCount === 0) return res.status(404).json({ error: 'note not found' });
  res.status(204).end();
});

// Express 5 forwards rejected async handlers here
app.use((err, req, res, next) => {
  if (err.status && err.status < 500) {
    return res.status(err.status).json({ error: 'invalid request' });
  }
  console.error(err);
  res.status(500).json({ error: 'internal server error' });
});
module.exports = app;
