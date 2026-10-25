require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors'); // Added CORS

const app = express();
const port = process.env.PORT || 3000;

app.use(cors()); // Allows GitHub Pages to talk to Render
app.use(express.json());
app.use(express.static(__dirname)); 

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

pool.connect((err) => {
    if (err) console.error("Error connecting to PostgreSQL:", err.message);
    else console.log("Connected to Neon PostgreSQL database!");
});

// ==========================================
// API ROUTES FOR LOGIN
// ==========================================
app.post('/api/login', async (req, res) => {
    const { username, password, roleAttempt } = req.body;
    try {
        const result = await pool.query("SELECT * FROM users WHERE username = $1 AND password = $2", [username, password]);
        const user = result.rows[0];
        
        if (!user) return res.status(401).json({ error: "Invalid username or password" });
        if (user.role !== 'Admin' && user.role !== roleAttempt) {
            return res.status(403).json({ error: `This account is for ${user.role}s only.` });
        }
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// API ROUTES FOR STUDENTS
// ==========================================
app.get('/api/students', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM students");
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/students', async (req, res) => {
    const { id, last, first, mi, address, course, yr, status, enrol, birthday } = req.body;
    try {
        const check = await pool.query("SELECT id FROM students WHERE id = $1", [id]);
        
        if (check.rows.length > 0) {
            const sql = `UPDATE students SET last=$1, first=$2, mi=$3, address=$4, course=$5, yr=$6, status=$7, enrol=$8, birthday=$9 WHERE id=$10`;
            await pool.query(sql, [last, first, mi, address, course, yr, status, enrol, birthday, id]);
            res.json({ message: "Student updated successfully" });
        } else {
            const sql = `INSERT INTO students (id, last, first, mi, address, course, yr, status, enrol, birthday) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`;
            await pool.query(sql, [id, last, first, mi, address, course, yr, status, enrol, birthday]);
            res.json({ message: "Student added successfully" });
        }
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// ==========================================
// API ROUTES FOR COURSES & ENROLLMENTS
// ==========================================
app.get('/api/courses', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM courses");
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/enrollments/:studentId', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM enrollments WHERE studentId = $1", [req.params.studentId]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/enroll', async (req, res) => {
    const { studentId, courseCode, section, term } = req.body;
    try {
        const courseRes = await pool.query("SELECT name, capacity FROM courses WHERE code = $1", [courseCode]);
        const course = courseRes.rows[0];
        if (!course) return res.status(404).json({ error: "Course not found" });

        const checkSql = `
            SELECT e.id FROM enrollments e
            JOIN courses c ON e.courseCode = c.code
            WHERE e.studentId = $1 AND c.name = $2
        `;
        const existing = await pool.query(checkSql, [studentId, course.name]);
        
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: "You are already enrolled in this subject." });
        }

        await pool.query(`INSERT INTO enrollments (studentId, courseCode, section, term) VALUES ($1, $2, $3, $4)`, [studentId, courseCode, section, term]);

        const countRes = await pool.query("SELECT COUNT(*) as count FROM enrollments WHERE courseCode = $1 AND section = $2", [courseCode, section]);
        const count = parseInt(countRes.rows[0].count);

        if (count >= course.capacity) {
            await pool.query("UPDATE courses SET status = 'Closed' WHERE code = $1", [courseCode]);
            console.log(`Course ${courseCode} (Section ${section}) is FULL and has been automatically Closed.`);
        }
        res.json({ message: "Enrolled successfully" });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// ==========================================
// API ROUTES FOR USERS
// ==========================================
app.get('/api/users', async (req, res) => {
    try {
        const result = await pool.query("SELECT username, name, role, section FROM users");
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/users/update', async (req, res) => {
    const { username, password, name, role, section } = req.body;
    try {
        if (!password) {
            await pool.query(`UPDATE users SET name=$1, role=$2, section=$3 WHERE username=$4`, [name, role, section, username]);
            res.json({ message: "User details updated successfully" });
        } else {
            await pool.query(`UPDATE users SET password=$1, name=$2, role=$3, section=$4 WHERE username=$5`, [password, name, role, section, username]);
            res.json({ message: "User details and password updated successfully" });
        }
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// ==========================================
// FACULTY GRADING ROUTES
// ==========================================
app.get('/api/students/teacher/:teacherName', async (req, res) => {
    try {
        const sql = `
            SELECT DISTINCT s.*, c.name as courseName, c.code as courseCode
            FROM students s
            JOIN enrollments e ON s.id = e.studentId
            JOIN courses c ON e.courseCode = c.code
            WHERE c.adviser = $1
        `;
        const result = await pool.query(sql, [req.params.teacherName]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/all-grades', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM grades");
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/grades/check/:studentId/:courseName', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM grades WHERE studentId = $1 AND courseName = $2", [req.params.studentId, req.params.courseName]);
        res.json(result.rows[0] || null);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/grades', async (req, res) => {
    const { studentId, courseCode, courseName, units, grade, term } = req.body;
    try {
        await pool.query(`INSERT INTO grades (studentId, courseCode, courseName, units, grade, term) VALUES ($1, $2, $3, $4, $5, $6)`, [studentId, courseCode, courseName, units, grade, term]);
        res.json({ message: "Grade submitted successfully" });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.get('/api/student/grades/:studentId', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM grades WHERE studentId = $1", [req.params.studentId]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// START SERVER
// ==========================================
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});