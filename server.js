const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');

const app = express();
// IMPORTANT: Use Render's dynamic port, fallback to 3000 for local testing
const port = process.env.PORT || 3000; 

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); 
app.use(express.static(__dirname)); 

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("Error opening database:", err.message);
    } else {
        console.log("Connected to SQLite database at:", dbPath);
        
        // AUTO-SEED LOGIC: Kung walang 'users' table, gagawin nito ang lahat.
        db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='users'", (err, row) => {
            if (!row) {
                console.log("Database is empty. Starting auto-seed...");
                
                db.serialize(() => {
                    // 1. Create Tables
                    db.run(`CREATE TABLE IF NOT EXISTS users (username TEXT PRIMARY KEY, password TEXT, name TEXT, role TEXT, section TEXT)`);
                    db.run(`CREATE TABLE IF NOT EXISTS students (id TEXT PRIMARY KEY, last TEXT, first TEXT, mi TEXT, address TEXT, course TEXT, yr TEXT, status TEXT, enrol TEXT, username TEXT, password TEXT, birthday TEXT)`);
                    db.run(`CREATE TABLE IF NOT EXISTS courses (code TEXT PRIMARY KEY, name TEXT, gradeLevel TEXT, section TEXT, capacity INTEGER, adviser TEXT, status TEXT)`);
                    db.run(`CREATE TABLE IF NOT EXISTS enrollments (id INTEGER PRIMARY KEY AUTOINCREMENT, studentId TEXT, courseCode TEXT, section TEXT, term TEXT)`);
                    db.run(`CREATE TABLE IF NOT EXISTS grades (id INTEGER PRIMARY KEY AUTOINCREMENT, studentId TEXT, courseCode TEXT, courseName TEXT, units INTEGER, grade REAL, term TEXT)`);
                    db.run(`CREATE TABLE IF NOT EXISTS billing (id INTEGER PRIMARY KEY AUTOINCREMENT, studentId TEXT, term TEXT, totalAmount REAL, dueDate TEXT, status TEXT DEFAULT 'Unpaid')`);
                    db.run(`CREATE TABLE IF NOT EXISTS payments (id INTEGER PRIMARY KEY AUTOINCREMENT, studentId TEXT, billingId INTEGER, amount REAL, paymentMethod TEXT, referenceNo TEXT, receiptImage TEXT, status TEXT DEFAULT 'Pending', datePaid TEXT)`);

                    // 2. Insert Users
                    const insertUser = db.prepare(`INSERT INTO users (username, password, name, role, section) VALUES (?, ?, ?, ?, ?)`);
                    const users = [
                        ['admin', 'admin123', 'Admin User', 'Admin', ''],
                        ['tmary', 'mary123', 'T. Mary C. Poppins', 'Faculty', 'Kinder'],
                        ['tjohn', 'john123', 'T. John Emmanuel S.', 'Faculty', 'Grade 1'],
                        ['tjane', 'jane123', 'T. Jane C. Villa', 'Faculty', 'Grade 7 & 11'],
                        ['tsmith', 'smith123', 'T. Smith V. Cruz', 'Faculty', 'Grade 11'],
                        ['talan', 'alan123', 'T. Alan Turing', 'Faculty', 'Math Dept'],
                        ['temily', 'emily123', 'T. Emily Bronte', 'Faculty', 'English Dept'],
                        ['tmarie', 'marie123', 'T. Marie Curie', 'Faculty', 'Science Dept'],
                        ['twarren', 'warren123', 'T. Warren Buffet', 'Faculty', 'Business Dept'],
                        ['taral', 'aral123', 'T. Andres Bonifacio', 'Faculty', 'Araling Panlipunan Dept'],
                        ['tmapeh', 'mapeh123', 'T. Francisco Balagtas', 'Faculty', 'MAPEH Dept'],
                        ['ttle', 'tle123', 'T. Gabriela Silang', 'Faculty', 'TLE Dept'],
                        ['tfil1', 'fil123', 'T. Liza Soberano', 'Faculty', 'Filipino Dept'],
                        ['tfil2', 'fil123', 'T. Enrique Gil', 'Faculty', 'Filipino Dept'],
                        ['tfil3', 'fil123', 'T. Kathryn Bernardo', 'Faculty', 'Filipino Dept'],
                        ['tfil4', 'fil123', 'T. Daniel Padilla', 'Faculty', 'Filipino Dept'],
                        ['tfil5', 'fil123', 'T. Angel Locsin', 'Faculty', 'Filipino Dept'],
                        ['tfil6', 'fil123', 'T. Coco Martin', 'Faculty', 'Filipino Dept'],
                        ['juandc', 'juan123', 'Juan Dela Cruz', 'Student', 'Grade 4'],
                        ['mariar', 'maria123', 'Maria Reyes', 'Student', 'Grade 11 - STEM - 1st Sem'],
                        ['pedros', 'pedro123', 'Pedro Santos', 'Student', 'Kindergarten'],
                        ['katiemaer', 'katie123', 'Katie Mae Reyes', 'Student', 'Grade 7'],
                        ['alexandram', 'alexandra123', 'Alexandra Manuel', 'Student', 'Grade 12 - STEM - 1st Sem'],
                        ['justinec', 'justine123', 'Justine Cruz', 'Student', 'Grade 2'],
                        ['leahb', 'leah123', 'Leah Braine', 'Student', 'Grade 4'],
                        ['chrisjohnm', 'chris123', 'Chris John Marquez', 'Student', 'Grade 12 - STEM - 1st Sem']
                    ];
                    users.forEach(u => insertUser.run(u));
                    insertUser.finalize();

                    // 3. Insert Students
                    const insertStudent = db.prepare(`INSERT INTO students (id, last, first, mi, address, course, yr, status, enrol, username, password, birthday) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
                    const students = [
                        ['2023-0006', 'Dela Cruz', 'Juan', 'A', 'Mariveles, Bataan', 'Elem', 'Grade 4', 'Active', 'Enrolled', 'juandc', 'juan123', '2017-05-14'],
                        ['2026-01523', 'Reyes', 'Maria', 'B', 'Limay, Bataan', 'SHS', 'Grade 11 - STEM - 1st Sem', 'Active', 'Enrolled', 'mariar', 'maria123', '2010-08-22'],
                        ['2026-0163', 'Santos', 'Pedro', 'C', 'Mariveles, Bataan', 'Kinder', 'Kindergarten', 'Active', 'Enrolled', 'pedros', 'pedro123', '2021-02-10'],
                        ['2026', 'Reyes', 'Katie Mae', '', 'Mariveles, Bataan', 'High School', 'Grade 7', 'Inactive', 'Enrolled', 'katiemaer', 'katie123', '2014-11-05'],
                        ['2026-0011', 'Manuel', 'Alexandra', 'B.', 'Mariveles, Bataan', 'SHS', 'Grade 12 - STEM - 1st Sem', 'Active', 'Enrolled', 'alexandram', 'alexandra123', '2009-03-30'],
                        ['2024-2235', 'Cruz', 'Justine', 'D.', 'Mariveles, Bataan', 'Elem', 'Grade 2', 'Active', 'Enrolled', 'justinec', 'justine123', '2019-07-12'],
                        ['2023-0391', 'Braine', 'Leah', 'H.', 'Limay, Bataan', 'Elem', 'Grade 4', 'Active', 'Enrolled', 'leahb', 'leah123', '2017-09-21'],
                        ['2022-0212', 'Marquez', 'Chris John', 'N.', 'Mariveles, Bataan', 'SHS', 'Grade 12 - STEM - 1st Sem', 'Archived', 'Enrolled', 'chrisjohnm', 'chris123', '2009-01-18']
                    ];
                    students.forEach(s => insertStudent.run(s));
                    insertStudent.finalize();

                    // 4. Insert Billing Base (Optional, pero nilagay na rin natin)
                    const insertBilling = db.prepare(`INSERT INTO billing (studentId, term, totalAmount, dueDate) VALUES (?, ?, ?, ?)`);
                    insertBilling.run('2023-0006', '1st Sem 2026-2027', 9500.00, '2026-11-15');
                    insertBilling.run('2026-01523', '1st Sem 2026-2027', 14500.00, '2026-11-15');
                    insertBilling.run('2026-0011', '1st Sem 2026-2027', 14500.00, '2026-11-15');
                    insertBilling.run('2026-0163', '1st Sem 2026-2027', 6500.00, '2026-11-15');
                    insertBilling.run('2024-2235', '1st Sem 2026-2027', 9500.00, '2026-11-15');
                    insertBilling.finalize();

                    console.log("Auto-seed complete! Database is ready.");
                });
            }
        });
    }
});

// ==========================================
// LOGIN
// ==========================================
app.post('/api/login', (req, res) => {
    const { username, password, roleAttempt } = req.body;
    db.get("SELECT * FROM users WHERE username = ? AND password = ?", [username, password], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(401).json({ error: "Invalid username or password" });
        if (user.role !== 'Admin' && user.role !== roleAttempt) {
            return res.status(403).json({ error: `This account is for ${user.role}s only.` });
        }
        res.json(user);
    });
});

// ==========================================
// STUDENTS & COURSES
// ==========================================
app.get('/api/students', (req, res) => {
    db.all("SELECT * FROM students", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/students', (req, res) => {
    const { id, last, first, mi, address, course, yr, status, enrol, birthday } = req.body;
    const username = id; 
    const password = "password123";
    const fullName = `${first} ${last}`;

    db.get("SELECT id FROM students WHERE id = ?", [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        
        if (row) {
            const sql = `UPDATE students SET last=?, first=?, mi=?, address=?, course=?, yr=?, status=?, enrol=?, birthday=? WHERE id=?`;
            db.run(sql, [last, first, mi, address, course, yr, status, enrol, birthday, id], function(err) {
                if (err) return res.status(400).json({ error: err.message });
                res.json({ message: "Student updated successfully" });
            });
        } else {
            const insertStudentSql = `INSERT INTO students (id, last, first, mi, address, course, yr, status, enrol, username, password, birthday) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            db.run(insertStudentSql, [id, last, first, mi, address, course, yr, status, enrol, username, password, birthday], function(err) {
                if (err) return res.status(400).json({ error: err.message });
                
                const insertUserSql = `INSERT INTO users (username, password, name, role, section) VALUES (?, ?, ?, 'Student', ?)`;
                db.run(insertUserSql, [username, password, fullName, yr], function(err) {
                    if (err) console.error("Failed to create user account:", err.message);
                    res.json({ message: "Student and Login Account created successfully!" });
                });
            });
        }
    });
});

app.get('/api/courses', (req, res) => {
    db.all("SELECT * FROM courses", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/api/enrollments/:studentId', (req, res) => {
    db.all("SELECT * FROM enrollments WHERE studentId = ?", [req.params.studentId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/enroll', (req, res) => {
    const { studentId, courseCode, section, term } = req.body;

    db.get("SELECT name, capacity FROM courses WHERE code = ?", [courseCode], (err, course) => {
        if (err || !course) return res.status(404).json({ error: "Course not found" });

        const checkSql = `
            SELECT e.id FROM enrollments e
            JOIN courses c ON e.courseCode = c.code
            WHERE e.studentId = ? AND c.name = ?
        `;
        
        db.get(checkSql, [studentId, course.name], (err, existing) => {
            if (err) return res.status(500).json({ error: err.message });
            
            if (existing) {
                return res.status(400).json({ error: "You are already enrolled in this subject." });
            }

            const sql = `INSERT INTO enrollments (studentId, courseCode, section, term) VALUES (?, ?, ?, ?)`;
            db.run(sql, [studentId, courseCode, section, term], function(err) {
                if (err) return res.status(400).json({ error: err.message });

                db.get("SELECT COUNT(*) as count FROM enrollments WHERE courseCode = ? AND section = ?", [courseCode, section], (err, result) => {
                    if (err) return res.json({ message: "Enrolled successfully" });

                    if (result.count >= course.capacity) {
                        db.run("UPDATE courses SET status = 'Closed' WHERE code = ?", [courseCode]);
                    }
                    res.json({ message: "Enrolled successfully" });
                });
            });
        });
    });
});

// ==========================================
// USERS
// ==========================================
app.get('/api/users', (req, res) => {
    db.all("SELECT username, name, role, section FROM users", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/users/update', (req, res) => {
    const { username, password, name, role, section } = req.body;
    
    if (!password) {
        const sql = `UPDATE users SET name=?, role=?, section=? WHERE username=?`;
        db.run(sql, [name, role, section, username], function(err) {
            if (err) return res.status(400).json({ error: err.message });
            res.json({ message: "User details updated successfully" });
        });
    } else {
        const sql = `UPDATE users SET password=?, name=?, role=?, section=? WHERE username=?`;
        db.run(sql, [password, name, role, section, username], function(err) {
            if (err) return res.status(400).json({ error: err.message });
            res.json({ message: "User details and password updated successfully" });
        });
    }
});

// ==========================================
// GRADING
// ==========================================
app.get('/api/students/teacher/:teacherName', (req, res) => {
    const teacherName = req.params.teacherName;
    const sql = `
        SELECT DISTINCT s.*, c.name as courseName, c.code as courseCode
        FROM students s
        JOIN enrollments e ON s.id = e.studentId
        JOIN courses c ON e.courseCode = c.code
        WHERE c.adviser = ?
    `;
    db.all(sql, [teacherName], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/api/grades/check/:studentId/:courseName', (req, res) => {
    db.get("SELECT * FROM grades WHERE studentId = ? AND courseName = ?", [req.params.studentId, req.params.courseName], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row || null);
    });
});

app.post('/api/grades', (req, res) => {
    const { studentId, courseCode, courseName, units, grade, term } = req.body;
    const sql = `INSERT INTO grades (studentId, courseCode, courseName, units, grade, term) VALUES (?, ?, ?, ?, ?, ?)`;
    db.run(sql, [studentId, courseCode, courseName, units, grade, term], function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ message: "Grade submitted successfully" });
    });
});

app.get('/api/student/grades/:studentId', (req, res) => {
    db.all("SELECT * FROM grades WHERE studentId = ?", [req.params.studentId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// ==========================================
// BILLING & PAYMENTS
// ==========================================
app.get('/api/billing/:studentId', (req, res) => {
    const studentId = req.params.studentId;

    db.all("SELECT * FROM billing WHERE studentId = ?", [studentId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        
        if (rows.length > 0) {
            return res.json(rows);
        }

        // Auto-generate if no bill exists
        db.get("SELECT yr FROM students WHERE id = ?", [studentId], (err, student) => {
            if (err || !student) return res.json([]); 

            const yearStr = (student.yr || '').toLowerCase();
            let tuitionFee = 8000; 

            if (yearStr.includes('kinder')) {
                tuitionFee = 5000;
            } else if (
                yearStr.includes('grade 1') || yearStr.includes('grade 2') || 
                yearStr.includes('grade 3') || yearStr.includes('grade 4') || 
                yearStr.includes('grade 5') || yearStr.includes('grade 6')
            ) {
                tuitionFee = 8000;
            } else if (
                yearStr.includes('grade 7') || yearStr.includes('grade 8') || 
                yearStr.includes('grade 9') || yearStr.includes('grade 10')
            ) {
                tuitionFee = 10000;
            } else if (
                yearStr.includes('grade 11') || yearStr.includes('grade 12')
            ) {
                tuitionFee = 13000;
            }

            const totalAmount = tuitionFee + 1500; 
            const term = '1st Sem 2026-2027';
            const dueDate = '2026-11-15';

            const insertSql = `INSERT INTO billing (studentId, term, totalAmount, dueDate) VALUES (?, ?, ?, ?)`;
            db.run(insertSql, [studentId, term, totalAmount, dueDate], function(err) {
                if (err) return res.status(500).json({ error: err.message });
                
                db.all("SELECT * FROM billing WHERE studentId = ?", [studentId], (err, newRows) => {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json(newRows);
                });
            });
        });
    });
});

app.get('/api/payments/:studentId', (req, res) => {
    db.all("SELECT * FROM payments WHERE studentId = ? ORDER BY id DESC", [req.params.studentId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/payments', (req, res) => {
    const { studentId, billingId, amount, paymentMethod, referenceNo, receiptImage, datePaid } = req.body;
    const finalBillingId = billingId === 'new' ? 0 : billingId;

    const sql = `INSERT INTO payments (studentId, billingId, amount, paymentMethod, referenceNo, receiptImage, datePaid) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    
    db.run(sql, [studentId, finalBillingId, amount, paymentMethod, referenceNo, receiptImage, datePaid], function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ message: "Payment submitted successfully! Waiting for admin approval." });
    });
});

app.get('/api/admin/all-billing', (req, res) => {
    const sql = `
        SELECT 
            s.id as studentId, s.first, s.last, s.yr,
            b.id as billingId, b.totalAmount, b.dueDate, b.status as billStatus,
            p.id as paymentId, p.amount as paidAmount, p.referenceNo, p.receiptImage, p.datePaid, p.status as paymentStatus
        FROM students s
        LEFT JOIN billing b ON s.id = b.studentId AND b.status = 'Unpaid'
        LEFT JOIN payments p ON s.id = p.studentId AND p.status IN ('Pending', 'Approved')
        ORDER BY s.last ASC
    `;
    
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        
        let processed = [];
        let seen = new Set();
        
        rows.forEach(row => {
            if (!seen.has(row.studentId)) {
                processed.push(row);
                seen.add(row.studentId);
            }
        });
        res.json(processed);
    });
});

app.post('/api/admin/payments/approve', (req, res) => {
    const { paymentId, billingId } = req.body;
    
    db.run(`UPDATE payments SET status = 'Approved' WHERE id = ?`, [paymentId], function(err) {
        if (err) return res.status(400).json({ error: err.message });
        
        if (billingId && billingId !== 0) {
            db.run(`UPDATE billing SET status = 'Paid' WHERE id = ?`, [billingId], function(err) {
                if (err) return res.status(400).json({ error: err.message });
                res.json({ message: "Payment approved and bill marked as Paid." });
            });
        } else {
            res.json({ message: "Payment approved." });
        }
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});