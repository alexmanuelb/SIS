const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static(__dirname)); 

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error("Error opening database:", err.message);
    else console.log("Connected to SQLite database at:", dbPath);
});

// ==========================================
// API ROUTES FOR LOGIN
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
// API ROUTES FOR STUDENTS
// ==========================================
app.get('/api/students', (req, res) => {
    db.all("SELECT * FROM students", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/students', (req, res) => {
    const { id, last, first, mi, address, course, yr, status, enrol, birthday } = req.body;
    db.get("SELECT id FROM students WHERE id = ?", [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        
        if (row) {
            const sql = `UPDATE students SET last=?, first=?, mi=?, address=?, course=?, yr=?, status=?, enrol=?, birthday=? WHERE id=?`;
            db.run(sql, [last, first, mi, address, course, yr, status, enrol, birthday, id], function(err) {
                if (err) return res.status(400).json({ error: err.message });
                res.json({ message: "Student updated successfully" });
            });
        } else {
            const sql = `INSERT INTO students (id, last, first, mi, address, course, yr, status, enrol, birthday) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            db.run(sql, [id, last, first, mi, address, course, yr, status, enrol, birthday], function(err) {
                if (err) return res.status(400).json({ error: err.message });
                res.json({ message: "Student added successfully" });
            });
        }
    });
});

// ==========================================
// API ROUTES FOR COURSES & ENROLLMENTS
// ==========================================
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

// UPDATED: Prevent double enrollment for the same subject name
app.post('/api/enroll', (req, res) => {
    const { studentId, courseCode, section, term } = req.body;

    // 1. Find the course details to get the name
    db.get("SELECT name, capacity FROM courses WHERE code = ?", [courseCode], (err, course) => {
        if (err || !course) return res.status(404).json({ error: "Course not found" });

        // 2. Check if the student is ALREADY enrolled in ANY course with this same name
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

            // 3. If not enrolled, proceed to insert
            const sql = `INSERT INTO enrollments (studentId, courseCode, section, term) VALUES (?, ?, ?, ?)`;
            db.run(sql, [studentId, courseCode, section, term], function(err) {
                if (err) return res.status(400).json({ error: err.message });

                // 4. Check capacity and auto-close if needed
                db.get("SELECT COUNT(*) as count FROM enrollments WHERE courseCode = ? AND section = ?", [courseCode, section], (err, result) => {
                    if (err) return res.json({ message: "Enrolled successfully" });

                    if (result.count >= course.capacity) {
                        db.run("UPDATE courses SET status = 'Closed' WHERE code = ?", [courseCode]);
                        console.log(`Course ${courseCode} (Section ${section}) is FULL and has been automatically Closed.`);
                    }
                    res.json({ message: "Enrolled successfully" });
                });
            });
        });
    });
});

// ==========================================
// API ROUTES FOR USERS
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
// FACULTY GRADING ROUTES
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

app.get('/api/all-grades', (req, res) => {
    db.all("SELECT * FROM grades", [], (err, rows) => {
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
// START SERVER
// ==========================================
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});