const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

process.env.NODE_ENV = 'test';
const app = require('./server');

// ponytail: in-memory ephemeral port runner; upgrade to supertest if complex request streaming needed.
function request(server, path, options = {}) {
  const url = new URL(path, `http://localhost:${server.address().port}`);
  return fetch(url, options);
}

test('API Integration Tests (Stdlib)', async (t) => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));

  t.after(() => server.close());

  await t.test('GET /api/health returns status ok', async () => {
    const res = await request(server, '/api/health');
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'ok');
  });

  let createdId = null;

  await t.test('POST /api/logs creates a production record', async () => {
    const res = await request(server, '/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        worker: 'Ahmed',
        task: 'عجن',
        quantity: '50 kg'
      })
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.worker, 'Ahmed');
    assert.equal(body.task, 'عجن');
    assert.equal(body.quantity, '50 kg');
    assert.ok(body.id);
    createdId = body.id;
  });

  await t.test('POST /api/logs validates required fields', async () => {
    const res = await request(server, '/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ worker: 'Ahmed' })
    });
    assert.equal(res.status, 400);
  });

  await t.test('GET /api/logs lists records', async () => {
    const res = await request(server, '/api/logs');
    assert.equal(res.status, 200);
    const list = await res.json();
    assert.ok(Array.isArray(list));
    assert.ok(list.some((item) => item.id === createdId));
  });

  await t.test('DELETE /api/logs/:id removes record', async () => {
    const res = await request(server, `/api/logs/${createdId}`, { method: 'DELETE' });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
  });

  await t.test('POST /api/admin/config sets credentials', async () => {
    const res = await request(server, '/api/admin/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin_test', password: 'secret123' })
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.username, 'admin_test');
  });

  await t.test('POST /api/admin/login handles valid and invalid credentials', async () => {
    const ok = await request(server, '/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin_test', password: 'secret123' })
    });
    assert.equal(ok.status, 200);

    const fail = await request(server, '/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin_test', password: 'wrong' })
    });
    assert.equal(fail.status, 401);
  });
});
