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
        quantity: '50 kg',
        notes: 'يرجى التأكد من درجة حرارة الفرن'
      })
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.worker, 'Ahmed');
    assert.equal(body.task, 'عجن');
    assert.equal(body.quantity, '50 kg');
    assert.equal(body.notes, 'يرجى التأكد من درجة حرارة الفرن');
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

  await t.test('PATCH /api/logs/:id/status transitions through full 5-stage production line: pending -> kneading -> oven -> milling -> completed', async () => {
    // Create new record for multi-stage test
    const createRes = await request(server, '/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ worker: 'Ahmed', task: 'عجن وتصنيع', quantity: '100 kg' })
    });
    const { id: stageTestId } = await createRes.json();

    // 1. Pending -> Kneading
    const toKneading = await request(server, `/api/logs/${stageTestId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'kneading', timestamp: '11:00:00' })
    });
    assert.equal(toKneading.status, 200);
    const bodyKnead = await toKneading.json();
    assert.equal(bodyKnead.status, 'kneading');
    assert.equal(bodyKnead.startedAt, '11:00:00');
    assert.equal(bodyKnead.kneadingAt, '11:00:00');

    // 2. Kneading -> Oven
    const toOven = await request(server, `/api/logs/${stageTestId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'oven', timestamp: '11:20:00' })
    });
    assert.equal(toOven.status, 200);
    const bodyOven = await toOven.json();
    assert.equal(bodyOven.status, 'oven');
    assert.equal(bodyOven.ovenAt, '11:20:00');

    // 3. Oven -> Milling
    const toMilling = await request(server, `/api/logs/${stageTestId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'milling', timestamp: '11:45:00' })
    });
    assert.equal(toMilling.status, 200);
    const bodyMill = await toMilling.json();
    assert.equal(bodyMill.status, 'milling');
    assert.equal(bodyMill.millingAt, '11:45:00');

    // 4. Milling -> Completed
    const toCompleted = await request(server, `/api/logs/${stageTestId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed', timestamp: '12:00:00' })
    });
    assert.equal(toCompleted.status, 200);
    const bodyDone = await toCompleted.json();
    assert.equal(bodyDone.status, 'completed');
    assert.equal(bodyDone.finishedAt, '12:00:00');
    assert.equal(bodyDone.kneadingAt, '11:00:00');
    assert.equal(bodyDone.ovenAt, '11:20:00');
    assert.equal(bodyDone.millingAt, '11:45:00');

    // Cleanup
    await request(server, `/api/logs/${stageTestId}`, { method: 'DELETE' });
  });

  await t.test('PATCH /api/logs/:id/status allows adminOverride to set or reset any stage directly', async () => {
    const createRes = await request(server, '/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ worker: 'Ahmed', task: 'عجن', quantity: '50 kg' })
    });
    const { id: testLogId } = await createRes.json();

    // Admin sets directly to oven stage
    const resOven = await request(server, `/api/logs/${testLogId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'oven', timestamp: '12:30:00', adminOverride: true })
    });
    assert.equal(resOven.status, 200);
    const bodyOven = await resOven.json();
    assert.equal(bodyOven.status, 'oven');

    // Admin resets back to pending
    const resReset = await request(server, `/api/logs/${testLogId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'pending', adminOverride: true })
    });
    assert.equal(resReset.status, 200);
    const bodyReset = await resReset.json();
    assert.equal(bodyReset.status, 'pending');
    assert.equal(bodyReset.startedAt, null);

    await request(server, `/api/logs/${testLogId}`, { method: 'DELETE' });
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
      body: JSON.stringify({ username: 'Mohamed Saeed', password: '123' })
    });
    assert.equal(workerRes.status, 200);
    const workerBody = await workerRes.json();
    assert.equal(workerBody.user.role, 'worker');
    assert.equal(workerBody.user.username, 'Mohamed Saeed');

    // Supervisor login
    const superRes = await request(server, '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'Ahmed Khaled', password: '123' })
    });
    assert.equal(superRes.status, 200);
    const superBody = await superRes.json();
    assert.equal(superBody.user.role, 'supervisor');

    // Admin login
    const adminRes = await request(server, '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'Admin', password: '123' })
    });
    assert.equal(adminRes.status, 200);
    const adminBody = await adminRes.json();
    assert.equal(adminBody.user.role, 'admin');

    // Invalid credentials
    const badRes = await request(server, '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'Admin', password: 'bad' })
    });
    assert.equal(badRes.status, 401);
  });

  await t.test('GET /api/users and PUT /api/users/:username allows admin to edit credentials', async () => {
    const listRes = await request(server, '/api/users');
    assert.equal(listRes.status, 200);
    const users = await listRes.json();
    assert.ok(Array.isArray(users));
    assert.ok(users.length >= 8);

    // Edit Ahmed Abd El Nasser password
    const putRes = await request(server, '/api/users/Ahmed Abd El Nasser', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'newpass456', name: 'عامل مجتهد' })
    });
    assert.equal(putRes.status, 200);

    // Verify login with new password
    const testLogin = await request(server, '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'Ahmed Abd El Nasser', password: 'newpass456' })
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

  await t.test('Supervisor / Admin assigns job with target duration and deadline for countdown', async () => {
    const testDeadline = new Date(Date.now() + 120 * 60000).toISOString();
    const res = await request(server, '/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        worker: 'worker1',
        task: 'عجن',
        product: 'مركب طبي',
        weight: '100',
        unit: 'kg',
        status: 'pending',
        assignedBy: 'admin',
        targetDurationMinutes: 120,
        deadline: testDeadline
      })
    });
    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.targetDurationMinutes, 120);
    assert.equal(data.deadline, testDeadline);
  });

  await t.test('Client UI units and action labels: kg/g in English and Start Production label', async () => {
    const fs = require('node:fs');
    const appJsContent = fs.readFileSync('app.js', 'utf8');
    const indexHtmlContent = fs.readFileSync('index.html', 'utf8');

    // 1. Check btnStartTask is 'Start Production'
    assert.ok(appJsContent.includes("btnStartTask: 'Start Production'"), 'btnStartTask must be Start Production');

    // 2. Check index.html default unit options are kg and g
    assert.ok(indexHtmlContent.includes('<option value="kg">kg</option>'), 'index.html contains kg option');
    assert.ok(indexHtmlContent.includes('<option value="g">g</option>'), 'index.html contains g option');

    // 3. Test formatDisplayQuantity logic directly
    const formatDisplayQuantity = (rawQty, rawUnit = '', lang = 'en') => {
      const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
      const localizeDigits = (val, l) => {
        if (!val) return '';
        const str = String(val);
        if (l !== 'ar') return str.replace(/[٠-٩]/g, d => ARABIC_DIGITS.indexOf(d));
        return str.replace(/[0-9]/g, d => ARABIC_DIGITS[Number(d)]);
      };
      let val = '';
      let unit = rawUnit || '';
      if (rawQty !== null && rawQty !== undefined) {
        const str = String(rawQty).trim();
        const match = str.match(/^([\d.٠-٩٫,]+)\s*(.*)$/);
        if (match) {
          val = match[1];
          if (match[2]) unit = match[2];
        } else {
          val = str;
        }
      }
      unit = String(unit).trim().toLowerCase();
      let normalizedUnit = unit;
      if (lang === 'ar') {
        if (unit === 'kg' || unit === 'كجم') normalizedUnit = 'كجم';
        else if (unit === 'g' || unit === 'gm' || unit === 'جرام') normalizedUnit = 'جرام';
      } else {
        if (unit === 'kg' || unit === 'كجم') normalizedUnit = 'kg';
        else if (unit === 'g' || unit === 'gm' || unit === 'جرام') normalizedUnit = 'g';
      }
      return `${localizeDigits(val, lang)} ${normalizedUnit}`.trim();
    };

    // English conversion assertions
    assert.equal(formatDisplayQuantity('15 كجم', '', 'en'), '15 kg');
    assert.equal(formatDisplayQuantity('500 جرام', '', 'en'), '500 g');
    assert.equal(formatDisplayQuantity('250 gm', '', 'en'), '250 g');
    assert.equal(formatDisplayQuantity('12', 'كجم', 'en'), '12 kg');
    assert.equal(formatDisplayQuantity('750', 'جرام', 'en'), '750 g');

    // Arabic conversion assertions
    assert.equal(formatDisplayQuantity('15 kg', '', 'ar'), '١٥ كجم');
    assert.equal(formatDisplayQuantity('500 g', '', 'ar'), '٥٠٠ جرام');
    assert.equal(formatDisplayQuantity('12', 'kg', 'ar'), '١٢ كجم');
  });

  await t.test('Overtime API: registers night attendance checkout and lists records', async () => {
    // 1. Register checkout
    const postRes = await request(server, '/api/overtime', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        worker: 'worker1',
        workerName: 'محمد سعيد',
        notes: 'إتمام تسليم خط التعبئة والتنظيف',
        date: '2026-10-18',
        time: '23:45:00'
      })
    });
    assert.equal(postRes.status, 201);
    const created = await postRes.json();
    assert.equal(created.worker, 'worker1');
    assert.equal(created.workerName, 'محمد سعيد');
    assert.equal(created.time, '23:45:00');
    assert.ok(created.id);

    // 2. Fetch list
    const getRes = await request(server, '/api/overtime');
    assert.equal(getRes.status, 200);
    const list = await getRes.json();
    assert.ok(Array.isArray(list));
    const found = list.find(r => (r.id || r._id) === created.id);
    assert.ok(found, 'Created overtime record must be in list');

    // 3. Delete record
    const delRes = await request(server, `/api/overtime/${created.id}`, { method: 'DELETE' });
    assert.equal(delRes.status, 200);
  });

  await t.test('Worker 5 (Ahmed) authentication and dynamic user creation with worker role abilities', async () => {
    // 1. Ahmed login (worker 5)
    const ahmedLogin = await request(server, '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'Ahmed', password: '123' })
    });
    assert.equal(ahmedLogin.status, 200);
    const ahmedData = await ahmedLogin.json();
    assert.equal(ahmedData.user.username, 'Ahmed');
    assert.equal(ahmedData.user.role, 'worker');
    assert.equal(ahmedData.user.roleTitle, 'عامل');

    // 2. Add new worker via POST /api/users
    const testUsername = 'WorkerAutoTest';
    const createRes = await request(server, '/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: testUsername,
        name: 'عامل اختبار تجريبي',
        password: '123',
        roleTitle: 'عامل'
      })
    });
    assert.equal(createRes.status, 201);
    const createData = await createRes.json();
    assert.equal(createData.user.username, testUsername);
    assert.equal(createData.user.role, 'worker');
    assert.equal(createData.user.roleTitle, 'عامل');

    // 3. Authenticate with newly created worker
    const newWorkerLogin = await request(server, '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: testUsername, password: '123' })
    });
    assert.equal(newWorkerLogin.status, 200);
    const newWorkerData = await newWorkerLogin.json();
    assert.equal(newWorkerData.user.role, 'worker');
    assert.equal(newWorkerData.user.name, 'عامل اختبار تجريبي');

    // 4. Delete the test user via DELETE /api/users/:username
    const delUserRes = await request(server, `/api/users/${testUsername}`, {
      method: 'DELETE'
    });
    assert.equal(delUserRes.status, 200);
  });
});


