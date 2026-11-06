const { test, mock, before, after, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/app');
const pool = require('../src/db');

let server;
let base;

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server.close();
  server.closeAllConnections();
});

afterEach(() => {
  mock.restoreAll();
});

test('GET /health returns ok when the database responds', async () => {
  mock.method(pool, 'query', async () => ({ rows: [{ '?column?': 1 }] }));
  const res = await fetch(`${base}/health`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: 'ok' });
});

test('GET /health returns 503 when the database is down', async () => {
  mock.method(pool, 'query', async () => {
    throw new Error('connection refused');
  });
  const res = await fetch(`${base}/health`);
  assert.equal(res.status, 503);
});

test('POST /notes creates a note and trims the title', async () => {
  const row = { id: 1, title: 'hello', content: 'world' };
  mock.method(pool, 'query', async () => ({ rows: [row] }));
  const res = await fetch(`${base}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: '  hello  ', content: 'world' }),
  });
  assert.equal(res.status, 201);
  assert.deepEqual(await res.json(), row);
  assert.deepEqual(pool.query.mock.calls[0].arguments[1], ['hello', 'world']);
});

test('POST /notes without a title returns 400 and never hits the database', async () => {
  mock.method(pool, 'query', async () => ({ rows: [] }));
  const res = await fetch(`${base}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: 'no title' }),
  });
  assert.equal(res.status, 400);
  assert.equal(pool.query.mock.calls.length, 0);
});

test('GET /notes/abc returns 400 for a non-numeric id', async () => {
  const res = await fetch(`${base}/notes/abc`);
  assert.equal(res.status, 400);
});

test('GET /notes/99 returns 404 when the note does not exist', async () => {
  mock.method(pool, 'query', async () => ({ rows: [] }));
  const res = await fetch(`${base}/notes/99`);
  assert.equal(res.status, 404);
});

test('DELETE /notes/1 returns 204 when the note was deleted', async () => {
  mock.method(pool, 'query', async () => ({ rowCount: 1 }));
  const res = await fetch(`${base}/notes/1`, { method: 'DELETE' });
  assert.equal(res.status, 204);
});
