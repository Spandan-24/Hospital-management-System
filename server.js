require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const bodyParser = require('body-parser');
const path       = require('path');

const app = express();

// ── Middleware ────────────────────────────────
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ── Serve frontend ────────────────────────────
app.use(express.static(path.join(__dirname)));

// ── API Routes ────────────────────────────────
const patientsRouter  = require('./routes/patients');
const employeesRouter = require('./routes/employees');
const generalRouter   = require('./routes/general');

app.use('/api/patients',  patientsRouter);
app.use('/api/employees', employeesRouter);
app.use('/api',           generalRouter);

// ── Health check ──────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// ── Fallback to frontend ──────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ── Start ─────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🏥 Hospital Management System running at http://localhost:${PORT}`));
