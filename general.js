const express = require('express');
const router  = express.Router();
const db      = require('../config/db');

// ── DEPARTMENTS ──────────────────────────────
router.get('/departments', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT d.*, CONCAT(e.fname,' ',COALESCE(e.lname,'')) AS head_name
      FROM department d
      LEFT JOIN employee e ON d.dept_headid = e.empid
    `);
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/departments', async (req, res) => {
  const { dname } = req.body;
  try {
    const [r] = await db.query('INSERT INTO department(dname) VALUES(?)', [dname]);
    res.json({ success: true, deptid: r.insertId });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.delete('/departments/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM department WHERE deptid=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ── ROOMS ─────────────────────────────────────
router.get('/rooms', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT r.*, rc.rcost FROM room r
      LEFT JOIN room_cost rc ON r.roomtype = rc.roomtype
      ORDER BY r.rid
    `);
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/rooms/free', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT r.*, rc.rcost FROM room r
      LEFT JOIN room_cost rc ON r.roomtype = rc.roomtype
      WHERE r.isfree = 1 ORDER BY rc.rcost ASC
    `);
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/rooms', async (req, res) => {
  const { rid, roomtype } = req.body;
  try {
    await db.query('INSERT INTO room(rid,roomtype,isfree) VALUES(?,?,1)', [rid, roomtype]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ── ROOM COST ────────────────────────────────
router.get('/roomcosts', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM room_cost');
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/roomcosts', async (req, res) => {
  const { roomtype, rcost } = req.body;
  try {
    await db.query('INSERT INTO room_cost(roomtype,rcost) VALUES(?,?) ON DUPLICATE KEY UPDATE rcost=?', [roomtype, rcost, rcost]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ── TESTS ─────────────────────────────────────
router.get('/tests', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM test ORDER BY tname');
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/tests', async (req, res) => {
  const { tname, tcost } = req.body;
  try {
    const [r] = await db.query('INSERT INTO test(tname,tcost) VALUES(?,?)', [tname, tcost]);
    res.json({ success: true, tid: r.insertId });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.put('/tests/:id', async (req, res) => {
  const { tname, tcost } = req.body;
  try {
    await db.query('UPDATE test SET tname=?,tcost=? WHERE tid=?', [tname, tcost, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.delete('/tests/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM test WHERE tid=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ── MEDICINE ──────────────────────────────────
router.get('/medicines', async (req, res) => {
  try {
    const q = req.query.q;
    let rows;
    if (q) {
      [rows] = await db.query('SELECT * FROM medicine WHERE mname LIKE ? ORDER BY mname', [`%${q}%`]);
    } else {
      [rows] = await db.query('SELECT * FROM medicine ORDER BY mname');
    }
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/medicines', async (req, res) => {
  const { mname, mcost } = req.body;
  try {
    const [r] = await db.query('INSERT INTO medicine(mname,mcost) VALUES(?,?)', [mname, mcost]);
    res.json({ success: true, mid: r.insertId });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.put('/medicines/:id', async (req, res) => {
  const { mname, mcost } = req.body;
  try {
    await db.query('UPDATE medicine SET mname=?,mcost=? WHERE mid=?', [mname, mcost, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.delete('/medicines/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM medicine WHERE mid=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ── SALARY ────────────────────────────────────
router.get('/salary', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM salary ORDER BY salary DESC');
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/salary', async (req, res) => {
  const { etype, salary } = req.body;
  try {
    await db.query('INSERT INTO salary(etype,salary) VALUES(?,?) ON DUPLICATE KEY UPDATE salary=?', [etype, salary, salary]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ── ALL IN-PATIENTS ───────────────────────────
router.get('/inpatients-all', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT ip.*, p.fname, p.lname,
        CONCAT(p.fname,' ',COALESCE(p.lname,'')) AS patient_name,
        r.roomtype,
        CONCAT(ne.fname,' ',COALESCE(ne.lname,'')) AS nurse_name
      FROM in_patient ip
      JOIN patient p ON ip.pid = p.pid
      LEFT JOIN room r ON ip.rid = r.rid
      LEFT JOIN employee ne ON ip.nid = ne.empid
      ORDER BY ip.arrival_date DESC
    `);
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ── ALL OPD ──────────────────────────────────
router.get('/opd-all', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT op.*, p.fname, p.lname
      FROM out_patient op
      JOIN patient p ON op.pid = p.pid
      ORDER BY op.arrival_date DESC
    `);
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ── DASHBOARD STATS ───────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const [[{ total_patients }]] = await db.query('SELECT COUNT(*) AS total_patients FROM patient');
    const [[{ total_employees }]]= await db.query('SELECT COUNT(*) AS total_employees FROM employee');
    const [[{ total_doctors }]]  = await db.query('SELECT COUNT(*) AS total_doctors FROM doctor');
    const [[{ total_nurses }]]   = await db.query('SELECT COUNT(*) AS total_nurses FROM nurse_assigned');
    const [[{ admitted }]]       = await db.query("SELECT COUNT(*) AS admitted FROM in_patient WHERE discharge_date IS NULL");
    const [[{ free_rooms }]]     = await db.query('SELECT COUNT(*) AS free_rooms FROM room WHERE isfree=1');
    const [[{ total_rooms }]]    = await db.query('SELECT COUNT(*) AS total_rooms FROM room');
    const [[{ revenue }]]        = await db.query('SELECT COALESCE(SUM(mcost+tcost+roomcharges+othercharges),0) AS revenue FROM bill');
    const [dept_stats]           = await db.query(`
      SELECT d.dname, COUNT(e.empid) AS emp_count
      FROM department d LEFT JOIN employee e ON d.deptid=e.deptid
      GROUP BY d.deptid ORDER BY emp_count DESC LIMIT 6
    `);
    const [monthly_patients] = await db.query(`
      SELECT DATE_FORMAT(dob,'%Y-%m') AS month, COUNT(*) AS count
      FROM patient GROUP BY month ORDER BY month DESC LIMIT 6
    `);

    res.json({ success: true, data: {
      total_patients, total_employees, total_doctors, total_nurses,
      admitted, free_rooms, total_rooms, revenue, dept_stats, monthly_patients
    }});
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;
