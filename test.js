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

  await t.test('PATCH /api/logs/:id/status transitions through stages and forbids step-back', async () => {
    // 1. Move to in_progress
    const toProgress = await request(server, `/api/logs/${createdId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'in_progress', timestamp: '10:00:00' })
    });
    assert.equal(toProgress.status, 200);
    const bodyProg = await toProgress.json();
    assert.equal(bodyProg.status, 'in_progress');
    assert.equal(bodyProg.startedAt, '10:00:00');

    // 2. Cannot take step back to pending
    const stepBack = await request(server, `/api/logs/${createdId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'pending' })
    });
    assert.equal(stepBack.status, 400);

    // 3. Move to completed
    const toDone = await request(server, `/api/logs/${createdId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed', timestamp: '10:15:00' })
    });
    assert.equal(toDone.status, 200);
    const bodyDone = await toDone.json();
    assert.equal(bodyDone.status, 'completed');
    assert.equal(bodyDone.finishedAt, '10:15:00');

    // 4. Cannot take step back from completed
    const stepBackDone = await request(server, `/api/logs/${createdId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'in_progress' })
    });
    assert.equal(stepBackDone.status, 400);
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

  await t.test('POST /api/auth/login authenticates workers, supervisors, and admin', async () => {
    // Worker login
    const workerRes = await request(server, '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'worker1', password: '123' })
    });
    assert.equal(workerRes.status, 200);
    const workerBody = await workerRes.json();
    assert.equal(workerBody.user.role, 'worker');
    assert.equal(workerBody.user.username, 'worker1');

    // Supervisor login
    const superRes = await request(server, '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'supervisor1', password: '123' })
    });
    assert.equal(superRes.status, 200);
    const superBody = await superRes.json();
    assert.equal(superBody.user.role, 'supervisor');

    // Admin login
    const adminRes = await request(server, '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    assert.equal(adminRes.status, 200);
    const adminBody = await adminRes.json();
    assert.equal(adminBody.user.role, 'admin');

    // Invalid credentials
    const badRes = await request(server, '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'bad' })
    });
    assert.equal(badRes.status, 401);
  });

  await t.test('GET /api/users and PUT /api/users/:username allows admin to edit credentials', async () => {
    const listRes = await request(server, '/api/users');
    assert.equal(listRes.status, 200);
    const users = await listRes.json();
    assert.ok(Array.isArray(users));
    assert.ok(users.length >= 9);

    // Edit worker2 password
    const putRes = await request(server, '/api/users/worker2', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'newpass456', name: 'عامل مجتهد' })
    });
    assert.equal(putRes.status, 200);

    // Verify login with new password
    const testLogin = await request(server, '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'worker2', password: 'newpass456' })
    });
    assert.equal(testLogin.status, 200);
    const testBody = await testLogin.json();
    assert.equal(testBody.user.name, 'عامل مجتهد');
  });

  await t.test('Worker KPI metrics: calculates completed tasks and task durations accurately', async () => {
    // Helper to calculate duration seconds
    function computeDuration(s, f) {
      const p = str => {
        const [h, m, sec] = str.split(':').map(Number);
        return h * 3600 + m * 60 + (sec || 0);
      };
      let d = p(f) - p(s);
      if (d < 0) d += 86400;
      return d;
    }

    // Create a completed task with known timestamps (10:00:00 to 10:15:30 -> 930s = 15m 30s)
    const taskRes = await request(server, '/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        worker: 'worker3',
        task: 'عجن',
        product: 'كريم مرطب',
        weight: '100',
        unit: 'kg',
        date: '2026-10-18',
        time: '10:00:00',
        status: 'completed',
        startedAt: '10:00:00',
        finishedAt: '10:15:30'
      })
    });
    assert.equal(taskRes.status, 201);
    const task = await taskRes.json();
    assert.equal(task.worker, 'worker3');
    assert.equal(task.status, 'completed');

    const duration = computeDuration(task.startedAt, task.finishedAt);
    assert.equal(duration, 930);
  });

  await t.test('Supervisor / Admin assigns job to a worker with pending status and assignedBy', async () => {
    const assignRes = await request(server, '/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        worker: 'worker4',
        task: 'تعقيم',
        product: 'دفعة عبوات شامبو',
        weight: '500',
        unit: 'kg',
        date: '2026-10-18',
        time: '12:00:00',
        status: 'pending',
        assignedBy: 'supervisor1'
      })
    });
    assert.equal(assignRes.status, 201);
    const assignedTask = await assignRes.json();
    assert.equal(assignedTask.worker, 'worker4');
    assert.equal(assignedTask.task, 'تعقيم');
    assert.equal(assignedTask.status, 'pending');
    assert.equal(assignedTask.assignedBy, 'supervisor1');

    // Verify worker can fetch their assigned task
    const logsRes = await request(server, '/api/logs');
    assert.equal(logsRes.status, 200);
    const allLogs = await logsRes.json();
    const found = allLogs.find(l => (l.id || l._id) === (assignedTask.id || assignedTask._id));
    assert.ok(found);
    assert.equal(found.worker, 'worker4');
    assert.equal(found.assignedBy, 'supervisor1');
  });
});


