const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/factory_production';

// Do not hang requests when Mongo is disconnected
mongoose.set('bufferCommands', false);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const CAIRO_TZ = 'Africa/Cairo';

function getCairoDateString(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: CAIRO_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

function getCairoTimeString(date = new Date()) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: CAIRO_TZ,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(date);
}

// Local File Storage Fallback (zero downtime if Mongo service is stopped)
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'production_data.json');

const DEFAULT_USERS = [
  { username: 'Admin', password: '123', role: 'admin', name: 'حمزه', roleTitle: 'مدير النظام' },
  { username: 'Ehab', password: '123', role: 'admin', name: 'إيهاب', roleTitle: 'رئيس مجلس الاداره' },
  { username: 'Salwa', password: '123', role: 'admin', name: 'سلوى', roleTitle: 'مدير تنفيذي' },
  { username: 'Hossam', password: '123', role: 'admin', name: 'حسام', roleTitle: 'مدير انتاج' },
  { username: 'Fatma', password: '123', role: 'supervisor', name: 'فاطمة', roleTitle: 'مدير مالي' },
  { username: 'Ahmed Khaled', password: '123', role: 'supervisor', name: 'احمد خالد', roleTitle: 'مشرف انتاج' },
  { username: 'Mohamed Saeed', password: '123', role: 'worker', name: 'محمد سعيد', roleTitle: 'عامل' },
  { username: 'Ahmed Abd El Nasser', password: '123', role: 'worker', name: 'احمد عبد الناصر', roleTitle: 'عامل' },
  { username: 'Mohamed Hamdy', password: '123', role: 'worker', name: 'محمد حمدي', roleTitle: 'عامل' },
  { username: 'Youseef Khaled', password: '123', role: 'worker', name: 'يوسف خالد', roleTitle: 'عامل' },
  { username: 'Ahmed', password: '123', role: 'worker', name: 'احمد', roleTitle: 'عامل' }
];

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ logs: [], admin: null, users: DEFAULT_USERS }, null, 2));
  }
}

function readLocalData() {
  ensureDataFile();
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    data.users = data.users || [];
    DEFAULT_USERS.forEach(defU => {
      if (!data.users.some(u => u.username.toLowerCase() === defU.username.toLowerCase())) {
        data.users.push({ ...defU });
      }
    });
    return data;
  } catch {
    return { logs: [], admin: null, users: JSON.parse(JSON.stringify(DEFAULT_USERS)) };
  }
}

function writeLocalData(data) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Mongoose Models
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['worker', 'supervisor', 'admin'], required: true },
  roleTitle: { type: String, default: '' },
  name: { type: String, default: '' },
  updatedAt: { type: Date, default: Date.now }
});

userSchema.set('toJSON', {
  transform: (_, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

const User = mongoose.model('User', userSchema);

const logSchema = new mongoose.Schema({
  worker: { type: String, required: true, trim: true },
  task: { type: String, required: true, trim: true },
  product: { type: String, default: '', trim: true },
  weight: { type: String, default: '', trim: true },
  unit: { type: String, default: 'kg', trim: true },
  quantity: { type: String, required: true, trim: true },
  status: { type: String, enum: ['pending', 'kneading', 'oven', 'milling', 'completed', 'in_progress'], default: 'pending' },
  startedAt: { type: String, default: null },
  finishedAt: { type: String, default: null },
  kneadingAt: { type: String, default: null },
  ovenAt: { type: String, default: null },
  millingAt: { type: String, default: null },
  date: { type: String, required: true },
  time: { type: String, required: true },
  notes: { type: String, default: '', trim: true },
  assignedBy: { type: String, default: null, trim: true },
  targetDurationMinutes: { type: Number, default: null },
  deadline: { type: String, default: null },
  completedAt: { type: String, default: null },
  isOverdue: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

logSchema.set('toJSON', {
  transform: (_, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

const Log = mongoose.model('Log', logSchema);

// Overtime / Night Attendance Model (بصمة السهر)
const overtimeSchema = new mongoose.Schema({
  worker: { type: String, required: true, trim: true },
  workerName: { type: String, default: '', trim: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  notes: { type: String, default: '', trim: true },
  createdAt: { type: Date, default: Date.now }
});

overtimeSchema.set('toJSON', {
  transform: (_, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

const Overtime = mongoose.model('Overtime', overtimeSchema);

// ponytail: plain text password for simple factory setup; upgrade to bcrypt when multi-user roles required.
const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, trim: true },
  password: { type: String, required: true },
  updatedAt: { type: Date, default: Date.now }
});

const Admin = mongoose.model('Admin', adminSchema);

const isMongo = () => mongoose.connection.readyState === 1;

async function seedMongoUsers() {
  if (!isMongo()) return;
  try {
    const count = await User.countDocuments();
    if (count === 0) {
      await User.insertMany(DEFAULT_USERS);
      console.log('[OK] Default users seeded in MongoDB');
    }
  } catch (err) {
    console.warn('Could not seed users in Mongo:', err.message);
  }
}

// Routes: Health
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: isMongo() ? 'mongodb' : 'local_file_fallback',
    mongoConnected: isMongo(),
    mongoUri: MONGODB_URI.replace(/:([^:@]+)@/, ':****@')
  });
});

// Routes: Logs
app.get('/api/logs', async (req, res) => {
  try {
    if (isMongo()) {
      const logs = await Log.find().sort({ createdAt: -1 });
      return res.json(logs);
    }
    const data = readLocalData();
    res.json(data.logs);
  } catch (err) {
    const data = readLocalData();
    res.json(data.logs);
  }
});

app.post('/api/logs', async (req, res) => {
  try {
    let { worker, task, product, weight, unit, quantity, status, startedAt, finishedAt, kneadingAt, ovenAt, millingAt, date, time, assignedBy, notes, targetDurationMinutes, deadline } = req.body;
    if (!quantity && weight) {
      quantity = `${weight} ${unit || 'kg'}`;
    }
    if (!worker || !task || !quantity) {
      return res.status(400).json({ error: 'Worker, task, and quantity are required' });
    }

    const payload = {
      worker,
      task,
      product: product || '',
      weight: weight || '',
      unit: unit || 'kg',
      quantity,
      status: status || 'pending',
      startedAt: startedAt || null,
      finishedAt: finishedAt || null,
      kneadingAt: kneadingAt || null,
      ovenAt: ovenAt || null,
      millingAt: millingAt || null,
      notes: notes || '',
      date: date || getCairoDateString(),
      time: time || getCairoTimeString(),
      assignedBy: assignedBy || null,
      targetDurationMinutes: (targetDurationMinutes != null && !isNaN(Number(targetDurationMinutes))) ? Number(targetDurationMinutes) : null,
      deadline: deadline || null,
      completedAt: null,
      isOverdue: false,
      createdAt: new Date()
    };

    if (isMongo()) {
      try {
        const log = await Log.create(payload);
        return res.status(201).json(log);
      } catch (mongoErr) {
        console.warn('Mongo create log failed, falling back to local file:', mongoErr.message);
      }
    }

    const data = readLocalData();
    const newLog = { id: Date.now().toString(), ...payload };
    data.logs.unshift(newLog);
    writeLocalData(data);
    res.status(201).json(newLog);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/logs/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, timestamp, adminOverride } = req.body;

    const allowedStatuses = ['pending', 'kneading', 'oven', 'milling', 'in_progress', 'completed'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status: ${status}` });
    }

    const validTransitions = {
      'pending': ['kneading', 'in_progress'],
      'kneading': ['oven', 'completed'],
      'oven': ['milling', 'completed'],
      'milling': ['completed'],
      'in_progress': ['oven', 'milling', 'completed'],
      'completed': []
    };

    const timeNow = timestamp || getCairoTimeString();

    if (isMongo()) {
      const log = await Log.findById(id);
      if (!log) return res.status(404).json({ error: 'Log not found' });
      const current = log.status || 'pending';
      if (!adminOverride && (!validTransitions[current] || !validTransitions[current].includes(status))) {
        return res.status(400).json({ error: `Cannot transition from ${current} to ${status}` });
      }
      log.status = status;
      if (status === 'kneading') {
        log.kneadingAt = timeNow;
        if (!log.startedAt) log.startedAt = log.kneadingAt;
      } else if (status === 'oven') {
        log.ovenAt = timeNow;
      } else if (status === 'milling') {
        log.millingAt = timeNow;
      } else if (status === 'in_progress') {
        if (!log.startedAt) log.startedAt = timeNow;
      } else if (status === 'completed') {
        log.finishedAt = timeNow;
        log.completedAt = new Date().toISOString();
      } else if (status === 'pending' && adminOverride) {
        log.startedAt = null;
        log.finishedAt = null;
        log.completedAt = null;
        log.kneadingAt = null;
        log.ovenAt = null;
        log.millingAt = null;
      }
      if (log.deadline && Date.now() > new Date(log.deadline).getTime()) {
        log.isOverdue = true;
      }
      await log.save();
      return res.json(log);
    }

    const data = readLocalData();
    const log = data.logs.find((l) => l.id === id);
    if (!log) return res.status(404).json({ error: 'Log not found' });
    const current = log.status || 'pending';
    if (!adminOverride && (!validTransitions[current] || !validTransitions[current].includes(status))) {
      return res.status(400).json({ error: `Cannot transition from ${current} to ${status}` });
    }
    log.status = status;
    if (status === 'kneading') {
      log.kneadingAt = timeNow;
      if (!log.startedAt) log.startedAt = log.kneadingAt;
    } else if (status === 'oven') {
      log.ovenAt = timeNow;
    } else if (status === 'milling') {
      log.millingAt = timeNow;
    } else if (status === 'in_progress') {
      if (!log.startedAt) log.startedAt = timeNow;
    } else if (status === 'completed') {
      log.finishedAt = timeNow;
      log.completedAt = new Date().toISOString();
    } else if (status === 'pending' && adminOverride) {
      log.startedAt = null;
      log.finishedAt = null;
      log.completedAt = null;
      log.kneadingAt = null;
      log.ovenAt = null;
      log.millingAt = null;
    }
    if (log.deadline && Date.now() > new Date(log.deadline).getTime()) {
      log.isOverdue = true;
    }
    writeLocalData(data);
    res.json(log);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/logs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (isMongo()) {
      try {
        await Log.findByIdAndDelete(id);
      } catch (_) {}
    }
    const data = readLocalData();
    data.logs = data.logs.filter((l) => l.id !== id);
    writeLocalData(data);
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Routes: Overtime / Night Shift Attendance (بصمة السهر)
app.get('/api/overtime', async (req, res) => {
  try {
    if (isMongo()) {
      const records = await Overtime.find().sort({ createdAt: -1 });
      return res.json(records);
    }
    const data = readLocalData();
    res.json(data.overtime || []);
  } catch (err) {
    const data = readLocalData();
    res.json(data.overtime || []);
  }
});

app.post('/api/overtime', async (req, res) => {
  try {
    const { worker, workerName, date, time, notes } = req.body;
    if (!worker) {
      return res.status(400).json({ error: 'Worker is required' });
    }

    const payload = {
      worker: String(worker).trim(),
      workerName: workerName ? String(workerName).trim() : '',
      date: date || getCairoDateString(),
      time: time || getCairoTimeString(),
      notes: notes ? String(notes).trim() : '',
      createdAt: new Date()
    };

    if (isMongo()) {
      try {
        const doc = await Overtime.create(payload);
        return res.status(201).json(doc);
      } catch (mongoErr) {
        console.warn('Mongo overtime create failed, falling back to local file:', mongoErr.message);
      }
    }

    const data = readLocalData();
    data.overtime = data.overtime || [];
    payload.id = Date.now().toString();
    data.overtime.unshift(payload);
    writeLocalData(data);
    res.status(201).json(payload);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/overtime/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (isMongo()) {
      try {
        await Overtime.findByIdAndDelete(id);
      } catch (_) {}
    }
    const data = readLocalData();
    data.overtime = (data.overtime || []).filter(item => (item.id || item._id) !== id);
    writeLocalData(data);
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Routes: Admin Config & Auth
app.get('/api/admin/config', async (req, res) => {
  try {
    if (isMongo()) {
      const admin = await Admin.findOne();
      return res.json({ configured: Boolean(admin), username: admin?.username || null });
    }
    const data = readLocalData();
    res.json({ configured: Boolean(data.admin), username: data.admin?.username || null });
  } catch {
    const data = readLocalData();
    res.json({ configured: Boolean(data.admin), username: data.admin?.username || null });
  }
});

app.post('/api/admin/config', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    if (isMongo()) {
      let admin = await Admin.findOne();
      if (admin) {
        admin.username = username;
        admin.password = password;
        admin.updatedAt = new Date();
        await admin.save();
      } else {
        admin = await Admin.create({ username, password });
      }
    }

    const data = readLocalData();
    data.admin = { username, password, updatedAt: new Date().toISOString() };
    writeLocalData(data);

    res.json({ success: true, username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const ARABIC_DIGITS_LIST = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
function normalizeArabicDigits(str) {
  if (!str) return '';
  return String(str).replace(/[٠-٩]/g, d => ARABIC_DIGITS_LIST.indexOf(d));
}

app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const cleanUser = normalizeArabicDigits(username).trim().toLowerCase();
    const cleanPass = normalizeArabicDigits(password).trim();

    if (isMongo()) {
      const admin = await Admin.findOne({
        username: new RegExp(`^${cleanUser}$`, 'i'),
        $or: [{ password: cleanPass }, { password: password }]
      });
      if (admin) return res.json({ success: true, username: admin.username });
    }

    const data = readLocalData();
    if (data.admin && data.admin.username.toLowerCase() === cleanUser &&
        (data.admin.password === cleanPass || data.admin.password === password)) {
      return res.json({ success: true, username: data.admin.username });
    }

    res.status(401).json({ error: 'Invalid username or password' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Routes: Universal Login (workers, supervisors, admin)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const cleanUser = normalizeArabicDigits(username).trim().toLowerCase();
    const cleanPass = normalizeArabicDigits(password).trim();
    const userNoSpace = cleanUser.replace(/[\s_-]+/g, '');

    if (isMongo()) {
      const allUsers = await User.find({
        $or: [{ password: cleanPass }, { password: password }]
      });
      const user = allUsers.find(u => {
        const dbU = String(u.username || '').trim().toLowerCase();
        const dbN = String(u.name || '').trim().toLowerCase();
        return dbU === cleanUser || dbU.replace(/[\s_-]+/g, '') === userNoSpace ||
               (cleanUser === 'worker5' && (dbU === 'ahmed' || dbN === 'احمد'));
      });
      if (user) {
        return res.json({
          success: true,
          user: {
            username: user.username,
            role: user.role,
            name: user.name,
            roleTitle: user.roleTitle || (user.role === 'admin' ? 'مدير النظام' : (user.role === 'supervisor' ? 'مشرف انتاج' : 'عامل'))
          }
        });
      }
    }

    const data = readLocalData();
    const user = (data.users || []).find(u => {
      const dbU = String(u.username || '').trim().toLowerCase();
      const dbN = String(u.name || '').trim().toLowerCase();
      const passOk = (u.password === cleanPass || u.password === password);
      const userOk = (dbU === cleanUser || dbU.replace(/[\s_-]+/g, '') === userNoSpace ||
                     (cleanUser === 'worker5' && (dbU === 'ahmed' || dbN === 'احمد')));
      return userOk && passOk;
    });

    if (user) {
      return res.json({
        success: true,
        user: {
          username: user.username,
          role: user.role,
          name: user.name,
          roleTitle: user.roleTitle || (user.role === 'admin' ? 'مدير النظام' : (user.role === 'supervisor' ? 'مشرف انتاج' : 'عامل'))
        }
      });
    }

    // Fallback: legacy admin credentials
    if (data.admin && data.admin.username.toLowerCase() === cleanUser &&
        (data.admin.password === cleanPass || data.admin.password === password)) {
      return res.json({
        success: true,
        user: { username: data.admin.username, role: 'admin', name: 'المدير العام' }
      });
    }

    res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route: Get all users (Admin Settings)
app.get('/api/users', async (req, res) => {
  try {
    if (isMongo()) {
      const users = await User.find().sort({ role: 1, username: 1 });
      if (users.length > 0) return res.json(users);
    }
    const data = readLocalData();
    res.json(data.users || DEFAULT_USERS);
  } catch (err) {
    const data = readLocalData();
    res.json(data.users || DEFAULT_USERS);
  }
});

// Route: Add new user (Admin Settings)
app.post('/api/users', async (req, res) => {
  try {
    let { username, password, name, role, roleTitle } = req.body;
    if (!username || !username.trim()) {
      return res.status(400).json({ error: 'اسم المستخدم مطلوب (Username is required)' });
    }
    const cleanUser = username.trim();
    const cleanUserLower = cleanUser.toLowerCase();

    if (!roleTitle) {
      roleTitle = role === 'admin' ? 'مدير النظام' : (role === 'supervisor' ? 'مشرف انتاج' : 'عامل');
    }
    if (!role) {
      role = (roleTitle === 'عامل' || roleTitle === 'Worker' || roleTitle === 'عمال') ? 'worker' :
             (roleTitle === 'مشرف انتاج' || roleTitle === 'Production Supervisor' || roleTitle === 'مدير مالي' || roleTitle === 'Financial Director') ? 'supervisor' : 'admin';
    }
    if (!password || !password.trim()) {
      password = '123';
    }
    if (!name || !name.trim()) {
      name = cleanUser;
    }

    if (isMongo()) {
      const existing = await User.findOne({ username: new RegExp(`^${cleanUserLower}$`, 'i') });
      if (existing) {
        return res.status(400).json({ error: 'اسم المستخدم مسجل بالفعل (Username already exists)' });
      }
      const created = await User.create({
        username: cleanUser,
        password: password.trim(),
        name: name.trim(),
        role,
        roleTitle,
        updatedAt: new Date()
      });
      return res.status(201).json({ success: true, user: created });
    }

    const data = readLocalData();
    data.users = data.users || JSON.parse(JSON.stringify(DEFAULT_USERS));
    if (data.users.some(u => u.username.toLowerCase() === cleanUserLower)) {
      return res.status(400).json({ error: 'اسم المستخدم مسجل بالفعل (Username already exists)' });
    }

    const newUser = {
      username: cleanUser,
      password: password.trim(),
      role,
      roleTitle,
      name: name.trim(),
      updatedAt: new Date().toISOString()
    };
    data.users.push(newUser);
    writeLocalData(data);
    res.status(201).json({ success: true, user: newUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route: Delete user (Admin Settings)
app.delete('/api/users/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const cleanUser = username.trim().toLowerCase();

    if (cleanUser === 'admin' || cleanUser === 'hamza') {
      return res.status(403).json({ error: 'لا يمكن حذف حساب مدير النظام أو اونر السيرفر' });
    }

    if (isMongo()) {
      const delRes = await User.deleteOne({ username: new RegExp(`^${cleanUser}$`, 'i') });
      if (delRes.deletedCount > 0) {
        return res.json({ success: true, message: 'تم حذف المستخدم بنجاح' });
      }
    }

    const data = readLocalData();
    data.users = data.users || JSON.parse(JSON.stringify(DEFAULT_USERS));
    const initLen = data.users.length;
    data.users = data.users.filter(u => u.username.toLowerCase() !== cleanUser);
    if (data.users.length < initLen) {
      writeLocalData(data);
      return res.json({ success: true, message: 'تم حذف المستخدم بنجاح' });
    }

    res.status(404).json({ error: 'المستخدم غير موجود' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route: Edit credentials (Admin Settings)
app.put('/api/users/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const { password, name, role, roleTitle } = req.body;
    const cleanUser = username.trim().toLowerCase();

    if (isMongo()) {
      const user = await User.findOne({ username: new RegExp(`^${cleanUser}$`, 'i') });
      if (user) {
        if (password) user.password = password;
        if (name) user.name = name;
        if (role) user.role = role;
        if (roleTitle !== undefined) user.roleTitle = roleTitle;
        user.updatedAt = new Date();
        await user.save();
        return res.json({ success: true, user });
      }
    }

    const data = readLocalData();
    data.users = data.users || JSON.parse(JSON.stringify(DEFAULT_USERS));
    const user = data.users.find(u => u.username.toLowerCase() === cleanUser);
    if (user) {
      if (password) user.password = password;
      if (name) user.name = name;
      if (role) user.role = role;
      if (roleTitle !== undefined) user.roleTitle = roleTitle;
      user.updatedAt = new Date().toISOString();
      writeLocalData(data);
      return res.json({ success: true, user });
    }

    const newUser = {
      username,
      password: password || '123',
      role: role || 'worker',
      roleTitle: roleTitle || '',
      name: name || username,
      updatedAt: new Date().toISOString()
    };
    if (isMongo()) {
      await User.create(newUser);
    }
    data.users.push(newUser);
    writeLocalData(data);
    res.json({ success: true, user: newUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Server boot
async function start() {
  try {
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
    console.log('[OK] MongoDB connected successfully');
    await seedMongoUsers();
  } catch (err) {
    console.warn(`! MongoDB offline (${err.message}). Using local JSON storage fallback.`);
  }

  app.listen(PORT, () => {
    console.log(`[OK] Factory Production Logger running at: http://localhost:${PORT}`);
  });
}

if (process.env.NODE_ENV !== 'test') {
  start();
}

module.exports = app;
