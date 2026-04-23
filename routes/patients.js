const express = require('express');
const router  = express.Router();
const db      = require('../db');

// GET all patients
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.*, e.fname AS doc_fname, e.lname AS doc_lname
      FROM patient p
      LEFT JOIN doctor d  ON p.doc_id = d.doc_id
      LEFT JOIN employee e ON d.doc_id = e.empid
      ORDER BY p.pid DESC
    `);
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET single patient with full details
router.get('/:id', async (req, res) => {
  const pid = req.params.id;
  try {
    const [[patient]] = await db.query(
      `SELECT p.*, e.fname AS doc_fname, e.lname AS doc_lname
       FROM patient p
       LEFT JOIN doctor d ON p.doc_id = d.doc_id
       LEFT JOIN employee e ON d.doc_id = e.empid
       WHERE p.pid = ?`, [pid]);

    if (!patient) return res.status(404).json({ success: false, error: 'Patient not found' });

    const [phones]     = await db.query('SELECT phoneno FROM pt_phone WHERE pid = ?', [pid]);
    const [relatives]  = await db.query('SELECT * FROM relative WHERE pid = ?', [pid]);
    const [outvisits]  = await db.query('SELECT * FROM out_patient WHERE pid = ? ORDER BY arrival_date DESC', [pid]);
    const [inadmits]   = await db.query('SELECT ip.*, r.roomtype FROM in_patient ip LEFT JOIN room r ON ip.rid=r.rid WHERE ip.pid = ? ORDER BY arrival_date DESC', [pid]);
    const [tests]      = await db.query('SELECT ht.*, t.tname, t.tcost FROM hadtest ht JOIN test t ON ht.tid=t.tid WHERE ht.pid = ?', [pid]);
    const [medicines]  = await db.query('SELECT hm.*, m.mname, m.mcost FROM had_medicine hm JOIN medicine m ON hm.mid=m.mid WHERE hm.pid = ?', [pid]);
    const [bills]      = await db.query('SELECT * FROM bill WHERE pid = ? ORDER BY billdate DESC', [pid]);

    res.json({ success: true, data: { ...patient, phones, relatives, outvisits, inadmits, tests, medicines, bills } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST create patient
router.post('/', async (req, res) => {
  const { fname, lname, gender, dob, blood_group, doc_id, hno, street, city, state, email, phones } = req.body;
  if (!fname || !gender || !dob) return res.status(400).json({ success: false, error: 'fname, gender, dob required' });
  try {
    const [result] = await db.query(
      `INSERT INTO patient (fname,lname,gender,dob,blood_group,doc_id,hno,street,city,state,email)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [fname, lname||null, gender, dob, blood_group||null, doc_id||null, hno||null, street||null, city||null, state||null, email||null]
    );
    const pid = result.insertId;
    if (phones && phones.length) {
      for (const ph of phones) {
        await db.query('INSERT IGNORE INTO pt_phone(pid,phoneno) VALUES(?,?)', [pid, ph]);
      }
    }
    res.json({ success: true, pid, message: 'Patient registered successfully' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// PUT update patient
router.put('/:id', async (req, res) => {
  const { fname, lname, gender, dob, blood_group, doc_id, hno, street, city, state, email } = req.body;
  try {
    await db.query(
      `UPDATE patient SET fname=?,lname=?,gender=?,dob=?,blood_group=?,doc_id=?,hno=?,street=?,city=?,state=?,email=? WHERE pid=?`,
      [fname, lname, gender, dob, blood_group, doc_id||null, hno, street, city, state, email, req.params.id]
    );
    res.json({ success: true, message: 'Patient updated' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// DELETE patient
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM patient WHERE pid=?', [req.params.id]);
    res.json({ success: true, message: 'Patient deleted' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST add relative
router.post('/:id/relative', async (req, res) => {
  const { rname, rtype, pno } = req.body;
  try {
    await db.query('INSERT INTO relative(pid,rname,rtype,pno) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE rname=?,rtype=?,pno=?',
      [req.params.id, rname, rtype, pno, rname, rtype, pno]);
    res.json({ success: true, message: 'Relative saved' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST add phone
router.post('/:id/phone', async (req, res) => {
  const { phoneno } = req.body;
  try {
    await db.query('INSERT IGNORE INTO pt_phone(pid,phoneno) VALUES(?,?)', [req.params.id, phoneno]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST admit as out-patient
router.post('/:id/outpatient', async (req, res) => {
  const { arrival_date, disease } = req.body;
  try {
    await db.query('INSERT INTO out_patient(pid,arrival_date,disease) VALUES(?,?,?)',
      [req.params.id, arrival_date || new Date().toISOString().slice(0,10), disease||null]);
    res.json({ success: true, message: 'OPD visit recorded' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST admit as in-patient
router.post('/:id/inpatient', async (req, res) => {
  const { nid, rid, arrival_date, disease } = req.body;
  try {
    await db.query('INSERT INTO in_patient(pid,nid,rid,arrival_date,disease) VALUES(?,?,?,?,?)',
      [req.params.id, nid||null, rid||null, arrival_date || new Date().toISOString().slice(0,10), disease||null]);
    if (rid) await db.query('UPDATE room SET isfree=0 WHERE rid=?', [rid]);
    if (nid) await db.query('UPDATE nurse_assigned SET countpatient=countpatient+1 WHERE nid=?', [nid]);
    res.json({ success: true, message: 'Patient admitted' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST prescribe test
router.post('/:id/test', async (req, res) => {
  const { tid, testdate } = req.body;
  try {
    await db.query('INSERT IGNORE INTO hadtest(pid,tid,testdate) VALUES(?,?,?)',
      [req.params.id, tid, testdate || new Date().toISOString().slice(0,10)]);
    res.json({ success: true, message: 'Test added' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST prescribe medicine
router.post('/:id/medicine', async (req, res) => {
  const { mid, med_date, qty } = req.body;
  try {
    await db.query('INSERT IGNORE INTO had_medicine(pid,mid,med_date,qty) VALUES(?,?,?,?)',
      [req.params.id, mid, med_date || new Date().toISOString().slice(0,10), qty||1]);
    res.json({ success: true, message: 'Medicine added' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST generate bill
router.post('/:id/bill', async (req, res) => {
  const pid = req.params.id;
  try {
    const [[mrow]] = await db.query(
      `SELECT COALESCE(SUM(m.mcost * hm.qty),0) AS total FROM had_medicine hm
       JOIN medicine m ON hm.mid=m.mid WHERE hm.pid=?`, [pid]);
    const [[trow]] = await db.query(
      `SELECT COALESCE(SUM(t.tcost),0) AS total FROM hadtest ht
       JOIN test t ON ht.tid=t.tid WHERE ht.pid=?`, [pid]);
    const [[rrow]] = await db.query(
      `SELECT COALESCE(SUM(rc.rcost * DATEDIFF(COALESCE(ip.discharge_date, CURDATE()), ip.arrival_date)),0) AS total
       FROM in_patient ip JOIN room r ON ip.rid=r.rid JOIN room_cost rc ON r.roomtype=rc.roomtype
       WHERE ip.pid=?`, [pid]);

    const mcost = parseFloat(mrow.total) || 0;
    const tcost = parseFloat(trow.total) || 0;
    const roomcharges = parseFloat(rrow.total) || 0;
    const othercharges = parseFloat(req.body.othercharges) || 0;
    const billdate = new Date().toISOString().slice(0,10);

    await db.query(
      `INSERT INTO bill(pid,mcost,tcost,roomcharges,othercharges,billdate) VALUES(?,?,?,?,?,?)`,
      [pid, mcost, tcost, roomcharges, othercharges, billdate]
    );
    res.json({ success: true, data: { pid, mcost, tcost, roomcharges, othercharges, total: mcost+tcost+roomcharges+othercharges, billdate } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET patient bill details
router.get('/:id/bill', async (req, res) => {
  try {
    const [bills] = await db.query('SELECT * FROM bill WHERE pid=? ORDER BY billdate DESC', [req.params.id]);
    res.json({ success: true, data: bills });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;
