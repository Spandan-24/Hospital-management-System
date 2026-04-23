const express = require('express');
const router  = express.Router();
const db      = require('../config/db');

// GET all employees
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT e.*, d.dname, s.salary
      FROM employee e
      LEFT JOIN department d ON e.deptid = d.deptid
      LEFT JOIN salary s ON e.emptype = s.etype
      ORDER BY e.empid DESC
    `);
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET single employee
router.get('/:id', async (req, res) => {
  try {
    const [[emp]] = await db.query(`
      SELECT e.*, d.dname, s.salary
      FROM employee e
      LEFT JOIN department d ON e.deptid = d.deptid
      LEFT JOIN salary s ON e.emptype = s.etype
      WHERE e.empid = ?`, [req.params.id]);
    if (!emp) return res.status(404).json({ success: false, error: 'Employee not found' });

    const [phones]  = await db.query('SELECT phoneno FROM emp_phone WHERE empid=?', [req.params.id]);
    const [prevdept]= await db.query('SELECT pd.*, d.dname FROM prev_department pd JOIN department d ON pd.deptid=d.deptid WHERE pd.empid=?', [req.params.id]);
    const [docinfo] = await db.query('SELECT qualification FROM doctor WHERE doc_id=?', [req.params.id]);
    const [nurseinfo]= await db.query('SELECT countpatient FROM nurse_assigned WHERE nid=?', [req.params.id]);

    res.json({ success: true, data: { ...emp, phones, prevdept, docinfo: docinfo[0]||null, nurseinfo: nurseinfo[0]||null } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST create employee
router.post('/', async (req, res) => {
  const { fname, mname, lname, gender, emptype, hno, street, city, state, date_of_joining, email, deptid, date_of_birth, phones, qualification } = req.body;
  if (!fname || !gender || !emptype) return res.status(400).json({ success: false, error: 'fname, gender, emptype required' });
  try {
    const since = date_of_joining || new Date().toISOString().slice(0,10);
    const [result] = await db.query(
      `INSERT INTO employee(fname,mname,lname,gender,emptype,hno,street,city,state,date_of_joining,email,deptid,since,date_of_birth)
       VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [fname,mname||null,lname||null,gender,emptype,hno||null,street||null,city||null,state||null,since,email||null,deptid||null,since,date_of_birth||null]
    );
    const empid = result.insertId;

    if (phones && phones.length) {
      for (const ph of phones) {
        await db.query('INSERT IGNORE INTO emp_phone(empid,phoneno) VALUES(?,?)', [empid, ph]);
      }
    }

    // If doctor, add qualification
    const doctorTypes = ['DOCTOR','SURGEON','PHYSICIAN'];
    if (doctorTypes.includes(emptype.toUpperCase()) && qualification) {
      await db.query('INSERT IGNORE INTO doctor(doc_id,qualification) VALUES(?,?)', [empid, qualification]);
    }

    res.json({ success: true, empid, message: 'Employee added successfully' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// PUT update employee
router.put('/:id', async (req, res) => {
  const { fname, mname, lname, gender, emptype, hno, street, city, state, email, deptid, date_of_birth } = req.body;
  try {
    await db.query(
      `UPDATE employee SET fname=?,mname=?,lname=?,gender=?,emptype=?,hno=?,street=?,city=?,state=?,email=?,deptid=?,date_of_birth=? WHERE empid=?`,
      [fname,mname,lname,gender,emptype,hno,street,city,state,email,deptid,date_of_birth,req.params.id]
    );
    res.json({ success: true, message: 'Employee updated' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// DELETE employee (triggers move to inactive)
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM employee WHERE empid=?', [req.params.id]);
    res.json({ success: true, message: 'Employee removed and archived' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET inactive employees
router.get('/inactive/all', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM employee_inactive ORDER BY date_of_leaving DESC');
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET doctors only
router.get('/type/doctors', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT e.empid, e.fname, e.lname, e.email, d.qualification, dept.dname
      FROM employee e
      JOIN doctor d ON e.empid = d.doc_id
      LEFT JOIN department dept ON e.deptid = dept.deptid
      ORDER BY e.fname
    `);
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET nurses only
router.get('/type/nurses', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT e.empid, e.fname, e.lname, na.countpatient
      FROM employee e
      JOIN nurse_assigned na ON e.empid = na.nid
      ORDER BY na.countpatient ASC
    `);
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST add phone to employee
router.post('/:id/phone', async (req, res) => {
  const { phoneno } = req.body;
  try {
    await db.query('INSERT IGNORE INTO emp_phone(empid,phoneno) VALUES(?,?)', [req.params.id, phoneno]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;
