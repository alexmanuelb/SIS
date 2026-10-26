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
    if (err) console.error("Error opening database:", err.message);
    else console.log("Connected to SQLite database at:", dbPath);
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