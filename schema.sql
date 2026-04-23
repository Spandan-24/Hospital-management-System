-- ============================================================
--  Hospital Management System - Full Database Schema
--  Compatible with MySQL 5.7+ / MariaDB 10.3+
-- ============================================================

CREATE DATABASE IF NOT EXISTS hospital_db;
USE hospital_db;

-- ─────────────────────────────────────────────
--  LOOKUP / REFERENCE TABLES
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS salary (
    etype    VARCHAR(30) PRIMARY KEY,
    salary   DECIMAL(10,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS department (
    deptid      INT PRIMARY KEY AUTO_INCREMENT,
    dname       VARCHAR(40) NOT NULL,
    dept_headid INT DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS room (
    rid      INT PRIMARY KEY AUTO_INCREMENT,
    roomtype VARCHAR(30) NOT NULL,
    isfree   TINYINT(1) DEFAULT 1
);

CREATE TABLE IF NOT EXISTS room_cost (
    roomtype VARCHAR(30) PRIMARY KEY,
    rcost    DECIMAL(10,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS test (
    tid   INT PRIMARY KEY AUTO_INCREMENT,
    tname VARCHAR(50) NOT NULL,
    tcost DECIMAL(10,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS medicine (
    mid   INT PRIMARY KEY AUTO_INCREMENT,
    mname VARCHAR(60) NOT NULL,
    mcost DECIMAL(10,2) NOT NULL
);

-- ─────────────────────────────────────────────
--  EMPLOYEE & RELATED
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS employee (
    empid           INT PRIMARY KEY AUTO_INCREMENT,
    fname           VARCHAR(30) NOT NULL,
    mname           VARCHAR(30),
    lname           VARCHAR(30),
    gender          VARCHAR(10) NOT NULL,
    emptype         VARCHAR(30) NOT NULL,
    hno             VARCHAR(15),
    street          VARCHAR(40),
    city            VARCHAR(30),
    state           VARCHAR(30),
    date_of_joining DATE,
    email           VARCHAR(60),
    deptid          INT,
    since           DATE,
    date_of_birth   DATE,
    FOREIGN KEY (deptid)  REFERENCES department(deptid) ON UPDATE CASCADE,
    FOREIGN KEY (emptype) REFERENCES salary(etype) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS emp_phone (
    empid   INT,
    phoneno VARCHAR(15),
    PRIMARY KEY (empid, phoneno),
    FOREIGN KEY (empid) REFERENCES employee(empid) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS doctor (
    doc_id        INT PRIMARY KEY,
    qualification VARCHAR(40),
    FOREIGN KEY (doc_id) REFERENCES employee(empid) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS nurse_assigned (
    nid          INT PRIMARY KEY,
    countpatient INT DEFAULT 0,
    FOREIGN KEY (nid) REFERENCES employee(empid) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS employee_inactive (
    empid           INT PRIMARY KEY,
    fname           VARCHAR(30) NOT NULL,
    mname           VARCHAR(30),
    lname           VARCHAR(30),
    gender          VARCHAR(10) NOT NULL,
    emptype         VARCHAR(30) NOT NULL,
    hno             VARCHAR(15),
    street          VARCHAR(40),
    city            VARCHAR(30),
    state           VARCHAR(30),
    date_of_joining DATE,
    date_of_leaving DATE,
    email           VARCHAR(60)
);

CREATE TABLE IF NOT EXISTS prev_department (
    empid           INT,
    deptid          INT,
    date_of_joining DATE,
    date_of_leaving DATE,
    PRIMARY KEY (empid, deptid, date_of_leaving)
);

-- ─────────────────────────────────────────────
--  PATIENT & RELATED
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS patient (
    pid         INT PRIMARY KEY AUTO_INCREMENT,
    fname       VARCHAR(30) NOT NULL,
    lname       VARCHAR(30),
    gender      VARCHAR(10) NOT NULL,
    dob         DATE NOT NULL,
    blood_group VARCHAR(5),
    doc_id      INT,
    hno         VARCHAR(15),
    street      VARCHAR(40),
    city        VARCHAR(30),
    state       VARCHAR(30),
    email       VARCHAR(60),
    FOREIGN KEY (doc_id) REFERENCES doctor(doc_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS pt_phone (
    pid     INT,
    phoneno VARCHAR(15),
    PRIMARY KEY (pid, phoneno),
    FOREIGN KEY (pid) REFERENCES patient(pid) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS relative (
    pid   INT,
    rname VARCHAR(40) NOT NULL,
    rtype VARCHAR(30),
    pno   VARCHAR(15),
    PRIMARY KEY (pid),
    FOREIGN KEY (pid) REFERENCES patient(pid) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS out_patient (
    pid          INT,
    arrival_date DATE,
    disease      VARCHAR(60),
    PRIMARY KEY (pid, arrival_date),
    FOREIGN KEY (pid) REFERENCES patient(pid) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS in_patient (
    pid            INT,
    nid            INT,
    rid            INT,
    arrival_date   DATE NOT NULL,
    discharge_date DATE,
    disease        VARCHAR(60),
    PRIMARY KEY (pid, arrival_date),
    FOREIGN KEY (pid) REFERENCES patient(pid) ON DELETE CASCADE,
    FOREIGN KEY (nid) REFERENCES employee(empid) ON DELETE SET NULL,
    FOREIGN KEY (rid) REFERENCES room(rid) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS hadtest (
    pid      INT,
    tid      INT,
    testdate DATE,
    PRIMARY KEY (pid, tid, testdate),
    FOREIGN KEY (pid) REFERENCES patient(pid) ON DELETE CASCADE,
    FOREIGN KEY (tid) REFERENCES test(tid)
);

CREATE TABLE IF NOT EXISTS had_medicine (
    pid      INT,
    mid      INT,
    med_date DATE,
    qty      INT DEFAULT 1,
    PRIMARY KEY (pid, mid, med_date),
    FOREIGN KEY (pid) REFERENCES patient(pid) ON DELETE CASCADE,
    FOREIGN KEY (mid) REFERENCES medicine(mid)
);

CREATE TABLE IF NOT EXISTS bill (
    pid          INT,
    mcost        DECIMAL(10,2) DEFAULT 0,
    tcost        DECIMAL(10,2) DEFAULT 0,
    roomcharges  DECIMAL(10,2) DEFAULT 0,
    othercharges DECIMAL(10,2) DEFAULT 0,
    billdate     DATE,
    PRIMARY KEY (pid, billdate),
    FOREIGN KEY (pid) REFERENCES patient(pid) ON DELETE CASCADE
);

-- ─────────────────────────────────────────────
--  TRIGGERS
-- ─────────────────────────────────────────────

DROP TRIGGER IF EXISTS transfer_to_passive;
DELIMITER //
CREATE TRIGGER transfer_to_passive BEFORE DELETE ON employee
FOR EACH ROW
BEGIN
    INSERT IGNORE INTO employee_inactive
        (empid,fname,mname,lname,gender,emptype,hno,street,city,state,date_of_joining,date_of_leaving,email)
    VALUES
        (OLD.empid,OLD.fname,OLD.mname,OLD.lname,OLD.gender,OLD.emptype,
         OLD.hno,OLD.street,OLD.city,OLD.state,OLD.date_of_joining,CURDATE(),OLD.email);
END;//
DELIMITER ;

DROP TRIGGER IF EXISTS update_nurse_assigned;
DELIMITER //
CREATE TRIGGER update_nurse_assigned AFTER INSERT ON employee
FOR EACH ROW
BEGIN
    IF NEW.emptype = 'NURSE' THEN
        INSERT IGNORE INTO nurse_assigned(nid, countpatient) VALUES(NEW.empid, 0);
    END IF;
    IF NEW.emptype IN ('DOCTOR','DENTIST','SURGEON','PHYSICIAN') THEN
        INSERT IGNORE INTO doctor(doc_id, qualification) VALUES(NEW.empid, '');
    END IF;
END;//
DELIMITER ;

DROP TRIGGER IF EXISTS on_insertemployee_update_dept;
DELIMITER //
CREATE TRIGGER on_insertemployee_update_dept AFTER INSERT ON employee
FOR EACH ROW
BEGIN
    UPDATE department
    SET dept_headid = CASE
        WHEN dept_headid IS NULL THEN NEW.empid
        ELSE dept_headid
    END
    WHERE deptid = NEW.deptid;
END;//
DELIMITER ;

DROP TRIGGER IF EXISTS transfer_to_prev_department;
DELIMITER //
CREATE TRIGGER transfer_to_prev_department AFTER UPDATE ON employee
FOR EACH ROW
BEGIN
    IF NEW.deptid <> OLD.deptid THEN
        INSERT IGNORE INTO prev_department(empid, deptid, date_of_joining, date_of_leaving)
        VALUES(OLD.empid, OLD.deptid, OLD.since, CURDATE());
        UPDATE department
        SET dept_headid = CASE WHEN dept_headid IS NULL THEN NEW.empid ELSE dept_headid END
        WHERE deptid = NEW.deptid;
    END IF;
END;//
DELIMITER ;

DROP TRIGGER IF EXISTS decrease_on_discharge;
DELIMITER //
CREATE TRIGGER decrease_on_discharge BEFORE INSERT ON bill
FOR EACH ROW
BEGIN
    UPDATE room SET isfree = 1
    WHERE rid = (SELECT rid FROM in_patient WHERE pid = NEW.pid AND discharge_date IS NULL LIMIT 1);
    UPDATE nurse_assigned SET countpatient = GREATEST(countpatient - 1, 0)
    WHERE nid = (SELECT nid FROM in_patient WHERE pid = NEW.pid AND discharge_date IS NULL LIMIT 1);
    UPDATE in_patient SET discharge_date = CURDATE()
    WHERE pid = NEW.pid AND discharge_date IS NULL;
END;//
DELIMITER ;

-- ─────────────────────────────────────────────
--  SEED DATA
-- ─────────────────────────────────────────────

INSERT IGNORE INTO salary VALUES
('DOCTOR',70000),('NURSE',25000),('RECEPTIONIST',20000),
('ACCOUNTANT',15000),('CLEANER',14000),('SECURITY',12000),
('AMBULANCE DRIVER',13000),('SURGEON',90000),('PHYSICIAN',75000),
('LAB TECHNICIAN',22000),('PHARMACIST',28000);

INSERT IGNORE INTO department(deptid,dname) VALUES
(1,'ALLERGY'),(2,'INTENSIVE CARE'),(3,'ANESTHESIOLOGY'),(4,'CARDIOLOGY'),
(5,'ENT'),(6,'NEUROLOGY'),(7,'ORTHOPEDICS'),(8,'PATHOLOGY'),
(9,'RADIOLOGY'),(10,'SURGERY'),(11,'NURSING'),(12,'ACCOUNTS'),
(13,'SECURITY'),(14,'HOUSEKEEPING'),(15,'PHARMACY'),(16,'EMERGENCY');

INSERT IGNORE INTO room_cost VALUES
('GENERAL',500),('SEMI-PRIVATE',1000),('PRIVATE',2000),
('ICU',5000),('DELUXE',3000);

INSERT IGNORE INTO room(rid,roomtype,isfree) VALUES
(101,'GENERAL',1),(102,'GENERAL',1),(103,'GENERAL',1),
(104,'SEMI-PRIVATE',1),(105,'SEMI-PRIVATE',1),
(106,'PRIVATE',1),(107,'PRIVATE',1),(108,'PRIVATE',1),
(109,'ICU',1),(110,'ICU',1),(111,'DELUXE',1),(112,'DELUXE',1);

INSERT IGNORE INTO test VALUES
(1,'X-RAY',100),(2,'BLOOD TEST',300),(3,'URINE TEST',100),
(4,'MRI SCAN',1200),(5,'ENDOSCOPY',3000),(6,'BIOPSY',3500),
(7,'ULTRASOUND',900),(8,'CT-SCAN',1100),(9,'CBC',350),(10,'FLU TEST',1500);

INSERT IGNORE INTO medicine VALUES
(1,'CROCINE',10),(2,'ASPIRIN',8),(3,'NAMOSLATE',8),(4,'GLUCOSE',200),
(5,'TARIVID',80),(6,'CANESTEN',12),(7,'DICLOFENAC',18),(8,'ANTACIDS',8),
(9,'VERMOX',40),(10,'OVEX',25),(11,'OMEE',35),(12,'AVIL',4),
(13,'HIDRASEC',50),(14,'UTINOR',80),(15,'PARIET',8),(16,'CIPROXIN',6),
(17,'CYPROSTAT',12),(18,'ANDROCUR',80),(19,'DESTOLIT',82),(20,'URSOFALK',15),
(21,'ORS',7),(22,'URSOGAL',20),(23,'OMNI GEL',30),(24,'DETTOL',45),
(25,'BETADINE',8),(26,'LIVER-52',100),(27,'METHYLPHENIDATE',12),
(28,'BETA-BLOCKER',90),(29,'BENZODIAZEPINES',120),(30,'Z-DRUG',150),
(31,'ANTIPSYCHOTIC',200),(32,'SSRI-ANTIDEPRESSANT',250),(33,'MAOI-DRUG',140),
(34,'BICASUL',1),(35,'NASAL DECONGESTANTS',20),(36,'EXPECTORANTS',10),
(37,'COUGH SUPPRESSANTS',60),(38,'ANTI HISTAMINES',40),(39,'ACETAMINOPHEN',60),
(40,'HPV VACCINE',140),(41,'SYRINGE',3),(42,'INJECTION',10),
(43,'MORPHINE',5),(44,'ORLISTAT',10),(45,'ZALASTA',85),(46,'ZANTAC',84),
(47,'ZEFFIX',82),(48,'ZINNAT',100),(49,'ZOFRAN',80),(50,'ZOCOR',18);
