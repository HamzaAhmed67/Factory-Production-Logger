const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/factory_production';

// Do not hang requests when Mongo is disconnected
mongoose.set('bufferCommands', false);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Local File Storage Fallback (zero downtime if Mongo service is stopped)
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'production_data.json');

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ logs: [], admin: null }, null, 2));
  }
}

function readLocalData() {
  ensureDataFile();
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return { logs: [], admin: null };
  }
}

function writeLocalData(data) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Mongoose Models
const logSchema = new mongoose.Schema({
  worker: { type: String, required: true, trim: true },
  task: { type: String, required: true, trim: true },
  quantity: { type: String, required: true, trim: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
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

// ponytail: plain text password for simple factory setup; upgrade to bcrypt when multi-user roles required.
const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, trim: true },
  password: { type: String, required: true },
  updatedAt: { type: Date, default: Date.now }
});

const Admin = mongoose.model('Admin', adminSchema);

const isMongo = () => mongoose.connection.readyState === 1;

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
    const { worker, task, quantity, date, time } = req.body;
    if (!worker || !task || !quantity) {
      return res.status(400).json({ error: 'Worker, task, and quantity are required' });
    }

    const payload = {
      worker,
      task,
      quantity,
      date: date || new Date().toISOString().slice(0, 10),
      time: time || new Date().toTimeString().slice(0, 8),
      createdAt: new Date()
    };

    if (isMongo()) {
      const log = await Log.create(payload);
      return res.status(201).json(log);
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

app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (isMongo()) {
      const admin = await Admin.findOne({ username, password });
      if (admin) return res.json({ success: true, username: admin.username });
    }

    const data = readLocalData();
    if (data.admin && data.admin.username === username && data.admin.password === password) {
      return res.json({ success: true, username: data.admin.username });
    }

    res.status(401).json({ error: 'Invalid username or password' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Server boot
async function start() {
  try {
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 3000 });
    console.log('✓ MongoDB connected successfully');
  } catch (err) {
    console.warn(`! MongoDB offline (${err.message}). Using local JSON storage fallback.`);
  }

  app.listen(PORT, () => {
    console.log(`✓ Factory Production Logger running at: http://localhost:${PORT}`);
  });
}

if (process.env.NODE_ENV !== 'test') {
  start();
}

module.exports = app;
