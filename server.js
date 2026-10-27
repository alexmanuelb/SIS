const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error("DB error:", err.message);
    else console.log("Connected to SQLite DB");
});

/* =========================================================
   AUTO-SEED (runs only if tables are missing)
   ========================================================= */
db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='users'", (err, row) => {
    if (!row) {
        console.log("⚠️ No tables found. Auto-seeding database...");
        db.serialize(() => {
            // CREATE ALL TABLES
            db.run(`CREATE TABLE users (username TEXT PRIMARY KEY, password TEXT, name TEXT, role TEXT, section TEXT)`);
            db.run(`CREATE TABLE students (id TEXT PRIMARY KEY, last TEXT, first TEXT, mi TEXT, address TEXT, course TEXT, yr TEXT, status TEXT, enrol TEXT, username TEXT, password TEXT, birthday TEXT)`);
            db.run(`CREATE TABLE courses (code TEXT PRIMARY KEY, name TEXT, gradeLevel TEXT, section TEXT, capacity INTEGER, adviser TEXT, status TEXT)`);
            db.run(`CREATE TABLE enrollments (id INTEGER PRIMARY KEY AUTOINCREMENT, studentId TEXT, courseCode TEXT, section TEXT, term TEXT)`);
            db.run(`CREATE TABLE grades (id INTEGER PRIMARY KEY AUTOINCREMENT, studentId TEXT, courseCode TEXT, courseName TEXT, grade REAL, term TEXT)`);
            db.run(`CREATE TABLE schedules (id INTEGER PRIMARY KEY AUTOINCREMENT, courseCode TEXT, section TEXT, day TEXT, startTime TEXT, endTime TEXT, UNIQUE(courseCode, section, day, startTime))`);
            db.run(`CREATE TABLE attendance (id INTEGER PRIMARY KEY AUTOINCREMENT, courseCode TEXT, section TEXT, studentId TEXT, date TEXT, status TEXT, UNIQUE(courseCode, section, studentId, date))`);
            db.run(`CREATE TABLE student_records (id INTEGER PRIMARY KEY AUTOINCREMENT, studentId TEXT, gradeLevel TEXT, schoolYear TEXT, subject TEXT, grade REAL, status TEXT, remarks TEXT)`);

            // INSERT SEED DATA
            const insertUser = db.prepare(`INSERT INTO users (username, password, name, role, section) VALUES (?, ?, ?, ?, ?)`);
            [
                ['admin', 'admin123', 'Admin User', 'Admin', ''],
                ['talan', 'alan123', 'T. Alan Turing', 'Faculty', 'Math Dept'],
                ['temily', 'emily123', 'T. Emily Bronte', 'Faculty', 'English Dept'],
                ['juandc', 'juan123', 'Juan Dela Cruz', 'Student', 'Grade 4'],
                ['mariar', 'maria123', 'Maria Reyes', 'Student', 'Grade 11 - STEM - 1st Sem']
            ].forEach(u => insertUser.run(u));
            insertUser.finalize();

            const insertStudent = db.prepare(`INSERT INTO students (id, last, first, mi, address, course, yr, status, enrol, username, password, birthday) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
            [
                ['2023-0006', 'Dela Cruz', 'Juan', 'A', 'Mariveles, Bataan', 'Elem', 'Grade 4', 'Active', 'Enrolled', 'juandc', 'juan123', '2017-05-14'],
                ['2026-01523', 'Reyes', 'Maria', 'B', 'Limay, Bataan', 'SHS', 'Grade 11 - STEM - 1st Sem', 'Active', 'Enrolled', 'mariar', 'maria123', '2010-08-22']
            ].forEach(s => insertStudent.run(s));
            insertStudent.finalize();

            const insertCourse = db.prepare(`INSERT INTO courses (code, name, gradeLevel, section, capacity, adviser, status) VALUES (?, ?, ?, ?, ?, ?, ?)`);
            [
                ['ENG4-1', 'English 4', 'Grade 4', '1', 30, 'T. Emily Bronte', 'Open'],
                ['MATH4-1', 'Mathematics 4', 'Grade 4', '1', 30, 'T. Alan Turing', 'Open'],
                ['ORAL11-1', 'Oral Communication', 'Grade 11 - STEM - 1st Sem', '1', 40, 'T. Emily Bronte', 'Open']
            ].forEach(c => insertCourse.run(c));
            insertCourse.finalize();

            const insertSchedule = db.prepare(`INSERT INTO schedules (courseCode, section, day, startTime, endTime) VALUES (?, ?, ?, ?, ?)`);
            [
                ['ENG4-1', '1', 'Monday', '07:00', '08:00'],
                ['MATH4-1', '1', 'Tuesday', '07:00', '08:00'],
                ['ORAL11-1', '1', 'Monday', '08:00', '09:00']
            ].forEach(s => insertSchedule.run(s));
            insertSchedule.finalize();

            console.log("✅ Auto-seed complete! Database is ready.");
        });
    } else {
        console.log("✅ Tables present. Server ready.");
    }
});

/* =========================================================
   AUTH
   ========================================================= */
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username and password required" });
    db.get("SELECT * FROM users WHERE username = ? AND password = ?", [username, password], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(401).json({ error: "Invalid username or password" });
        res.json(user); // returns { username, name, role, section }
    });
});

/* =========================================================
   USERS
   ========================================================= */
app.get('/api/users', (req, res) => {
    db.all("SELECT username, name, role, section FROM users", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/users/update', (req, res) => {
    const { username, password, name, role, section } = req.body;
    if (!username) return res.status(400).json({ error: "Username required" });

    if (password && password.trim() !== '') {
        db.run(`UPDATE users SET password=?, name=?, role=?, section=? WHERE username=?`,
            [password, name, role, section, username],
            function (e) {
                if (e) return res.status(400).json({ error: e.message });
                if (this.changes === 0) return res.status(404).json({ error: "User not found" });
                res.json({ message: "User updated successfully" });
            });
    } else {
        db.run(`UPDATE users SET name=?, role=?, section=? WHERE username=?`,
            [name, role, section, username],
            function (e) {
                if (e) return res.status(400).json({ error: e.message });
                if (this.changes === 0) return res.status(404).json({ error: "User not found" });
                res.json({ message: "User updated successfully" });
            });
    }
});

/* =========================================================
   STUDENTS
   ========================================================= */
app.get('/api/students', (req, res) => {
    db.all("SELECT * FROM students", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/api/students/:id', (req, res) => {
    db.get("SELECT * FROM students WHERE id = ?", [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: "Student not found" });
        res.json(row);
    });
});

app.post('/api/students', (req, res) => {
    const { id, last, first, mi, address, course, yr, status, enrol, birthday } = req.body;
    if (!id) return res.status(400).json({ error: "Student ID required" });

    const username = id;
    const password = "password123";
    const fullName = `${first} ${last}`;

    db.get("SELECT id FROM students WHERE id = ?", [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });

        if (row) {
            // UPDATE existing
            db.run(`UPDATE students SET last=?, first=?, mi=?, address=?, course=?, yr=?, status=?, enrol=?, birthday=? WHERE id=?`,
                [last, first, mi, address, course, yr, status, enrol, birthday, id],
                function (e) {
                    if (e) return res.status(400).json({ error: e.message });
                    res.json({ message: "Student updated" });
                });
        } else {
            // INSERT new + auto-create user account
            db.run(`INSERT INTO students (id, last, first, mi, address, course, yr, status, enrol, username, password, birthday)
                    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
                [id, last, first, mi, address, course, yr, status, enrol, username, password, birthday],
                function (e) {
                    if (e) return res.status(400).json({ error: e.message });

                    db.get("SELECT username FROM users WHERE username = ?", [username], (e2, exists) => {
                        if (exists) {
                            return res.json({ message: "Student created (user already exists)" });
                        }
                        db.run(`INSERT INTO users (username, password, name, role, section) VALUES (?,?,?,'Student',?)`,
                            [username, password, fullName, yr],
                            (e3) => {
                                if (e3) return res.status(400).json({ error: e3.message });
                                res.json({ message: "Student + login account created" });
                            });
                    });
                });
        }
    });
});

app.delete('/api/students/:id', (req, res) => {
    db.run("DELETE FROM students WHERE id = ?", [req.params.id], function (e) {
        if (e) return res.status(400).json({ error: e.message });
        db.run("DELETE FROM users WHERE username = ?", [req.params.id]);
        res.json({ message: "Student deleted" });
    });
});

/* =========================================================
   COURSES
   ========================================================= */
app.get('/api/courses', (req, res) => {
    db.all("SELECT * FROM courses", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/api/courses/:code', (req, res) => {
    db.get("SELECT * FROM courses WHERE code = ?", [req.params.code], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: "Course not found" });
        res.json(row);
    });
});

app.post('/api/courses', (req, res) => {
    const { code, name, gradeLevel, section, capacity, adviser, status } = req.body;
    if (!code || !name || !gradeLevel || !section) {
        return res.status(400).json({ error: "Code, name, gradeLevel, and section required" });
    }
    db.get("SELECT code FROM courses WHERE code = ?", [code], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row) return res.status(400).json({ error: "Course code already exists" });

        db.run(`INSERT INTO courses (code, name, gradeLevel, section, capacity, adviser, status)
                VALUES (?,?,?,?,?,?,?)`,
            [code, name, gradeLevel, section, capacity || 30, adviser || '', status || 'Open'],
            function (e) {
                if (e) return res.status(400).json({ error: e.message });
                res.json({ message: "Course created" });
            });
    });
});

app.delete('/api/courses/:code', (req, res) => {
    db.run("DELETE FROM courses WHERE code = ?", [req.params.code], function (e) {
        if (e) return res.status(400).json({ error: e.message });
        res.json({ message: "Course deleted" });
    });
});

/* =========================================================
   SCHEDULES
   ========================================================= */
app.get('/api/schedules', (req, res) => {
    db.all("SELECT * FROM schedules", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/api/schedules/:gradeLevel/:section', (req, res) => {
    db.all(`SELECT s.*, c.name AS courseName, c.adviser
            FROM schedules s
            JOIN courses c ON s.courseCode = c.code
            WHERE c.gradeLevel = ? AND s.section = ?
            ORDER BY
                CASE s.day
                    WHEN 'Monday' THEN 1
                    WHEN 'Tuesday' THEN 2
                    WHEN 'Wednesday' THEN 3
                    WHEN 'Thursday' THEN 4
                    WHEN 'Friday' THEN 5
                    WHEN 'Saturday' THEN 6
                    ELSE 7
                END,
                s.startTime`,
        [req.params.gradeLevel, req.params.section],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
});

app.post('/api/schedules', (req, res) => {
    const { courseCode, section, day, startTime, endTime } = req.body;
    if (!courseCode || !section || !day || !startTime || !endTime) {
        return res.status(400).json({ error: "All schedule fields are required" });
    }

    // Conflict check: same section, same day, overlapping time
    db.all(`SELECT * FROM schedules WHERE section = ? AND day = ?`,
        [section, day],
        (err, existing) => {
            if (err) return res.status(500).json({ error: err.message });

            const toMin = t => { const [h,m] = t.split(':').map(Number); return h*60+m; };
            const newStart = toMin(startTime);
            const newEnd = toMin(endTime);

            const conflict = existing.find(s => {
                const sStart = toMin(s.startTime);
                const sEnd = toMin(s.endTime);
                return (newStart < sEnd) && (newEnd > sStart);
            });

            if (conflict) {
                return res.status(400).json({
                    error: `Time conflict with ${conflict.courseCode} (${conflict.startTime}-${conflict.endTime}) on ${day} in section ${section}`
                });
            }

            db.run(`INSERT INTO schedules (courseCode, section, day, startTime, endTime) VALUES (?,?,?,?,?)`,
                [courseCode, section, day, startTime, endTime],
                function (e) {
                    if (e) return res.status(400).json({ error: e.message });
                    res.json({ message: "Schedule added" });
                });
        });
});

app.delete('/api/schedules/:id', (req, res) => {
    db.run("DELETE FROM schedules WHERE id = ?", [req.params.id], function (e) {
        if (e) return res.status(400).json({ error: e.message });
        res.json({ message: "Schedule deleted" });
    });
});

/* =========================================================
   ENROLLMENTS
   ========================================================= */
app.get('/api/enrollments/:studentId', (req, res) => {
    db.all("SELECT * FROM enrollments WHERE studentId = ?", [req.params.studentId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/enroll', (req, res) => {
    const { studentId, courseCode, section, term } = req.body;
    if (!studentId || !courseCode) {
        return res.status(400).json({ error: "studentId and courseCode required" });
    }

    db.get("SELECT name, capacity, status FROM courses WHERE code = ?", [courseCode], (err, course) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!course) return res.status(404).json({ error: "Course not found" });
        if (course.status === 'Closed') return res.status(400).json({ error: "Course is closed" });

        // Check duplicate subject enrollment (same course name)
        db.get(`SELECT e.id FROM enrollments e
                JOIN courses c ON e.courseCode = c.code
                WHERE e.studentId = ? AND c.name = ?`,
            [studentId, course.name], (err2, existing) => {
                if (err2) return res.status(500).json({ error: err2.message });
                if (existing) return res.status(400).json({ error: "Already enrolled in this subject" });

                // Check capacity
                db.get(`SELECT COUNT(*) as count FROM enrollments WHERE courseCode = ? AND section = ?`,
                    [courseCode, section], (err3, result) => {
                        if (err3) return res.status(500).json({ error: err3.message });
                        if (result.count >= course.capacity) {
                            return res.status(400).json({ error: "Course is full" });
                        }

                        db.run(`INSERT INTO enrollments (studentId, courseCode, section, term) VALUES (?,?,?,?)`,
                            [studentId, courseCode, section, term || '1st Sem'],
                            function (e) {
                                if (e) return res.status(400).json({ error: e.message });

                                // Auto-close if full
                                db.get(`SELECT COUNT(*) as count FROM enrollments WHERE courseCode = ? AND section = ?`,
                                    [courseCode, section], (err4, finalCount) => {
                                        if (finalCount.count >= course.capacity) {
                                            db.run("UPDATE courses SET status = 'Closed' WHERE code = ?", [courseCode]);
                                        }
                                        res.json({ message: "Enrolled successfully" });
                                    });
                            });
                    });
            });
    });
});

app.delete('/api/enroll/:studentId/:courseCode', (req, res) => {
    db.run(`DELETE FROM enrollments WHERE studentId = ? AND courseCode = ?`,
        [req.params.studentId, req.params.courseCode],
        function (e) {
            if (e) return res.status(400).json({ error: e.message });
            res.json({ message: "Enrollment removed" });
        });
});

/* =========================================================
   GRADES
   ========================================================= */
app.get('/api/grades/check/:studentId/:courseName', (req, res) => {
    db.get("SELECT * FROM grades WHERE studentId = ? AND courseName = ?",
        [req.params.studentId, req.params.courseName],
        (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(row || null);
        });
});

app.post('/api/grades', (req, res) => {
    const { studentId, courseCode, courseName, grade, term } = req.body;
    if (!studentId || !courseName || grade === undefined || grade === null) {
        return res.status(400).json({ error: "studentId, courseName, and grade required" });
    }

    // UPSERT — update existing or insert new
    db.get("SELECT id FROM grades WHERE studentId = ? AND courseName = ?",
        [studentId, courseName],
        (err, existing) => {
            if (err) return res.status(500).json({ error: err.message });

            if (existing) {
                db.run(`UPDATE grades SET grade=?, term=? WHERE id=?`,
                    [grade, term, existing.id],
                    function (e) {
                        if (e) return res.status(400).json({ error: e.message });
                        res.json({ message: "Grade updated" });
                    });
            } else {
                db.run(`INSERT INTO grades (studentId, courseCode, courseName, grade, term) VALUES (?,?,?,?,?)`,
                    [studentId, courseCode || 'N/A', courseName, grade, term || '1st Sem 2026-2027'],
                    function (e) {
                        if (e) return res.status(400).json({ error: e.message });
                        res.json({ message: "Grade submitted" });
                    });
            }
        });
});

app.get('/api/student/grades/:studentId', (req, res) => {
    db.all("SELECT * FROM grades WHERE studentId = ?", [req.params.studentId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

/* =========================================================
   STUDENT RECORDS (Historical)
   ========================================================= */
app.get('/api/student/records/:studentId', (req, res) => {
    db.all("SELECT * FROM student_records WHERE studentId = ? ORDER BY gradeLevel, schoolYear",
        [req.params.studentId],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
});

app.post('/api/student/records', (req, res) => {
    const { studentId, gradeLevel, schoolYear, subject, grade, status, remarks } = req.body;
    if (!studentId || !gradeLevel || !subject) {
        return res.status(400).json({ error: "studentId, gradeLevel, and subject required" });
    }
    db.run(`INSERT INTO student_records (studentId, gradeLevel, schoolYear, subject, grade, status, remarks)
            VALUES (?,?,?,?,?,?,?)`,
        [studentId, gradeLevel, schoolYear, subject, grade, status || 'Passed', remarks || ''],
        function (e) {
            if (e) return res.status(400).json({ error: e.message });
            res.json({ message: "Record added" });
        });
});

/* =========================================================
   ATTENDANCE
   ========================================================= */
app.get('/api/attendance/:courseCode/:section/:date', (req, res) => {
    db.all(`SELECT * FROM attendance WHERE courseCode = ? AND section = ? AND date = ?`,
        [req.params.courseCode, req.params.section, req.params.date],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
});

app.post('/api/attendance', (req, res) => {
    const { courseCode, section, studentId, date, status } = req.body;
    if (!courseCode || !section || !studentId || !date || !status) {
        return res.status(400).json({ error: "All attendance fields required" });
    }

    // UPSERT — one record per student/course/date
    db.run(`INSERT INTO attendance (courseCode, section, studentId, date, status)
            VALUES (?,?,?,?,?)
            ON CONFLICT(courseCode, section, studentId, date)
            DO UPDATE SET status=excluded.status`,
        [courseCode, section, studentId, date, status],
        function (e) {
            if (e) return res.status(400).json({ error: e.message });
            res.json({ message: "Attendance recorded" });
        });
});

app.get('/api/attendance/student/:studentId', (req, res) => {
    db.all(`SELECT * FROM attendance WHERE studentId = ? ORDER BY date DESC`,
        [req.params.studentId],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
});

/* =========================================================
   START
   ========================================================= */
app.listen(port, () => console.log(`✅ Server running at http://localhost:${port}`));