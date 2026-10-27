const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 10000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error("DB error:", err.message);
    else console.log("Connected to SQLite DB");
});

// AUTO-SEED
db.serialize(() => {
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='users'", (err, row) => {
        if (!row) {
            console.log("⚠️ No tables found. Building database from scratch...");
            buildDatabase();
        } else {
            db.all("PRAGMA table_info(students)", (err, cols) => {
                const hasEmail = cols.some(c => c.name === 'email');
                if (!hasEmail) {
                    console.log("⚠️ Old structure detected. Rebuilding...");
                    db.run("DROP TABLE IF EXISTS attendance");
                    db.run("DROP TABLE IF EXISTS student_records");
                    db.run("DROP TABLE IF EXISTS enrollments");
                    db.run("DROP TABLE IF EXISTS students");
                    db.run("DROP TABLE IF EXISTS users");
                    db.run("DROP TABLE IF EXISTS courses");
                    db.run("DROP TABLE IF EXISTS grades");
                    db.run("DROP TABLE IF EXISTS schedules", () => buildDatabase());
                } else {
                    console.log("✅ Database is up to date.");
                }
            });
        }
    });
});

function buildDatabase() {
    db.serialize(() => {
        // CREATE TABLES
        db.run(`CREATE TABLE users (username TEXT PRIMARY KEY, password TEXT, name TEXT, role TEXT, section TEXT)`);
        db.run(`CREATE TABLE students (id TEXT PRIMARY KEY, last TEXT, first TEXT, mi TEXT, address TEXT, course TEXT, yr TEXT, status TEXT, enrol TEXT, username TEXT, password TEXT, birthday TEXT, email TEXT)`);
        db.run(`CREATE TABLE courses (code TEXT PRIMARY KEY, name TEXT, gradeLevel TEXT, section TEXT, capacity INTEGER, adviser TEXT, subjectTeacher TEXT, status TEXT)`);
        db.run(`CREATE TABLE enrollments (id INTEGER PRIMARY KEY AUTOINCREMENT, studentId TEXT, courseCode TEXT, section TEXT, term TEXT)`);
        db.run(`CREATE TABLE grades (id INTEGER PRIMARY KEY AUTOINCREMENT, studentId TEXT, courseCode TEXT, courseName TEXT, grade REAL, term TEXT)`);
        db.run(`CREATE TABLE schedules (id INTEGER PRIMARY KEY AUTOINCREMENT, courseCode TEXT, section TEXT, day TEXT, startTime TEXT, endTime TEXT, UNIQUE(courseCode, section, day, startTime))`);
        db.run(`CREATE TABLE attendance (id INTEGER PRIMARY KEY AUTOINCREMENT, courseCode TEXT, section TEXT, studentId TEXT, date TEXT, status TEXT, UNIQUE(courseCode, section, studentId, date))`);
        db.run(`CREATE TABLE student_records (id INTEGER PRIMARY KEY AUTOINCREMENT, studentId TEXT, gradeLevel TEXT, schoolYear TEXT, subject TEXT, grade REAL, status TEXT, remarks TEXT)`);

        // ADMIN & REGISTRAR
        db.run(`INSERT INTO users (username, password, name, role, section) VALUES ('admin', 'admin123', 'Admin User', 'Admin', '')`);
        db.run(`INSERT INTO users (username, password, name, role, section) VALUES ('registrar', 'reg123', 'Registrar Staff', 'Registrar', '')`);

        // TEACHERS
        const insertUser = db.prepare(`INSERT INTO users (username, password, name, role, section) VALUES (?, ?, ?, ?, ?)`);
        const teachers = [
            'T. John Emmanuel S.', 'T. Emily Bronte', 'T. Alan Turing', 'T. Liza Soberano', 'T. Andres Bonifacio',
            'T. Enrique Gil', 'T. Kathryn Bernardo', 'T. Marie Curie', 'T. Daniel Padilla', 'T. Angel Locsin',
            'T. Coco Martin', 'T. Francisco Balagtas', 'T. Gabriela Silang', 'T. Jane C. Villa', 'T. Warren Buffet',
            'T. Michael Smith', 'T. Sarah Johnson', 'T. David Williams', 'T. Mary Brown', 'T. James Davis',
            'T. Smith V. Cruz', 'T. Albert Einstein', 'T. Isaac Newton', 'T. Charles Darwin', 'T. Nikola Tesla',
            'T. Rosalind Franklin', 'T. Stephen Hawking', 'T. Ada Lovelace', 'T. Galileo Galilei', 'T. Aristotle'
        ];
        teachers.forEach((name, i) => {
            const firstName = name.split(' ')[1] || 'Teacher';
            insertUser.run(`t${firstName.toLowerCase()}${i}`, `${firstName.toLowerCase()}123`, name, 'Faculty', '');
        });
        insertUser.finalize();

        // STUDENTS (May email at specific na yr para sa sem)
        const insertStudent = db.prepare(`INSERT INTO students (id, last, first, mi, address, course, yr, status, enrol, username, password, birthday, email) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        insertStudent.run('2023-0006', 'Dela Cruz', 'Juan', 'A', 'Mariveles, Bataan', 'Elem', 'Grade 4', 'Active', 'Enrolled', 'juandc', 'juan123', '2017-05-14', 'juan@example.com');
        insertStudent.run('2026-01523', 'Reyes', 'Maria', 'B', 'Limay, Bataan', 'SHS', 'Grade 11 - STEM - 1st Sem', 'Active', 'Enrolled', 'mariar', 'maria123', '2010-08-22', 'maria@example.com');
        insertStudent.finalize();

        // COURSES & SCHEDULES
        const insertCourse = db.prepare(`INSERT INTO courses (code, name, gradeLevel, section, capacity, adviser, subjectTeacher, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
        const insertSchedule = db.prepare(`INSERT INTO schedules (courseCode, section, day, startTime, endTime) VALUES (?, ?, ?, ?, ?)`);

        const gradeConfigs = [
            // JHS
            { level: 'Grade 1', subjects: [['LANG', 'Language'], ['READ', 'Reading'], ['MATH', 'Mathematics'], ['GMRC', 'Good Manners'], ['MAK', 'Makabansa']], capacity: 30 },
            { level: 'Grade 2', subjects: [['ENG', 'English'], ['FIL', 'Filipino'], ['MATH', 'Mathematics'], ['GMRC', 'Good Manners'], ['MAK', 'Makabansa']], capacity: 30 },
            { level: 'Grade 3', subjects: [['ENG', 'English'], ['FIL', 'Filipino'], ['MATH', 'Mathematics'], ['SCI', 'Science'], ['GMRC', 'Good Manners'], ['MAK', 'Makabansa']], capacity: 30 },
            { level: 'Grade 4', subjects: [['ENG', 'English'], ['FIL', 'Filipino'], ['MATH', 'Mathematics'], ['SCI', 'Science'], ['AP', 'Araling Panlipunan'], ['ESP', 'Values Ed'], ['MAPEH', 'MAPEH'], ['EPP', 'EPP']], capacity: 30 },
            { level: 'Grade 5', subjects: [['ENG', 'English'], ['FIL', 'Filipino'], ['MATH', 'Mathematics'], ['SCI', 'Science'], ['AP', 'Araling Panlipunan'], ['ESP', 'Values Ed'], ['MAPEH', 'MAPEH'], ['EPP', 'EPP']], capacity: 30 },
            { level: 'Grade 6', subjects: [['ENG', 'English'], ['FIL', 'Filipino'], ['MATH', 'Mathematics'], ['SCI', 'Science'], ['AP', 'Araling Panlipunan'], ['ESP', 'Values Ed'], ['MAPEH', 'MAPEH'], ['TLE', 'TLE']], capacity: 30 },
            { level: 'Grade 7', subjects: [['ENG', 'English'], ['FIL', 'Filipino'], ['MATH', 'Mathematics'], ['SCI', 'Science'], ['AP', 'Araling Panlipunan'], ['ESP', 'Values Ed'], ['MAPEH', 'MAPEH'], ['TLE', 'TLE']], capacity: 35 },
            { level: 'Grade 8', subjects: [['ENG', 'English'], ['FIL', 'Filipino'], ['MATH', 'Mathematics'], ['SCI', 'Science'], ['AP', 'Araling Panlipunan'], ['ESP', 'Values Ed'], ['MAPEH', 'MAPEH'], ['TLE', 'TLE']], capacity: 35 },
            { level: 'Grade 9', subjects: [['ENG', 'English'], ['FIL', 'Filipino'], ['MATH', 'Mathematics'], ['SCI', 'Science'], ['AP', 'Araling Panlipunan'], ['ESP', 'Values Ed'], ['MAPEH', 'MAPEH'], ['TLE', 'TLE']], capacity: 35 },
            { level: 'Grade 10', subjects: [['ENG', 'English'], ['FIL', 'Filipino'], ['MATH', 'Mathematics'], ['SCI', 'Science'], ['AP', 'Araling Panlipunan'], ['ESP', 'Values Ed'], ['MAPEH', 'MAPEH'], ['TLE', 'TLE']], capacity: 35 },
            
            // SHS STEM 1st Sem
            { level: 'Grade 11 - STEM - 1st Sem', subjects: [['ORAL', 'Oral Communication'], ['KOMU', 'Komunikasyon'], ['GENM', 'General Math'], ['EALS', 'Earth & Life Science'], ['PERD', 'Personal Dev'], ['EMPW', 'Empowerment Tech'], ['PE11', 'PE & Health 1'], ['PREC', 'Pre-Calculus'], ['CHEM1', 'Gen Chem 1']], capacity: 40 },
            // SHS STEM 2nd Sem
            { level: 'Grade 11 - STEM - 2nd Sem', subjects: [['READ', 'Reading & Writing'], ['PAGB', 'Pagbasa'], ['STAT', 'Statistics'], ['PHYS', 'Physical Science'], ['PE11B', 'PE & Health 2'], ['PR1', 'Practical Research 1'], ['BASC', 'Basic Calculus'], ['CHEM2', 'Gen Chem 2']], capacity: 40 },
            // SHS STEM 1st Sem (Gr 12)
            { level: 'Grade 12 - STEM - 1st Sem', subjects: [['21ST', '21st Century Lit'], ['UCSP', 'UCSP'], ['PHIL', 'Philosophy'], ['PE12', 'PE & Health 3'], ['EAPP', 'EAPP'], ['PR2', 'Practical Research 2'], ['CPAR', 'Contemporary Arts'], ['MIL', 'Media & Info Lit'], ['PHY1', 'Gen Physics 1'], ['BIO1', 'Gen Biology 1']], capacity: 40 },
            // SHS STEM 2nd Sem (Gr 12)
            { level: 'Grade 12 - STEM - 2nd Sem', subjects: [['PAGS', 'Pagsulat'], ['PE12B', 'PE & Health 4'], ['ENTR', 'Entrepreneurship'], ['INQ', 'Inquiries'], ['PHY2', 'Gen Physics 2'], ['BIO2', 'Gen Biology 2'], ['STEMW', 'Work Immersion']], capacity: 40 },
            
            // SHS HUMSS 1st Sem (Gr 11)
            { level: 'Grade 11 - HUMSS - 1st Sem', subjects: [['ORAL', 'Oral Communication'], ['KOMU', 'Komunikasyon'], ['PERD', 'Personal Dev'], ['UCSP', 'UCSP'], ['DISS', 'Disciplines & Ideas'], ['HUM1', 'Humanities 1'], ['PE11', 'PE & Health 1']], capacity: 40 },
            // SHS HUMSS 2nd Sem (Gr 11)
            { level: 'Grade 11 - HUMSS - 2nd Sem', subjects: [['READ', 'Reading & Writing'], ['PAGB', 'Pagbasa'], ['STAT', 'Statistics'], ['PHYS', 'Physical Science'], ['PE11B', 'PE & Health 2'], ['PR1', 'Practical Research 1'], ['HUM2', 'Humanities 2'], ['POLG', 'Politics & Governance']], capacity: 40 },
            // SHS HUMSS 1st Sem (Gr 12)
            { level: 'Grade 12 - HUMSS - 1st Sem', subjects: [['21ST', '21st Century Lit'], ['PHIL', 'Philosophy'], ['PE12', 'PE & Health 3'], ['EAPP', 'EAPP'], ['PR2', 'Practical Research 2'], ['CPAR', 'Contemporary Arts'], ['MIL', 'Media & Info Lit']], capacity: 40 },
            // SHS HUMSS 2nd Sem (Gr 12)
            { level: 'Grade 12 - HUMSS - 2nd Sem', subjects: [['PAGS', 'Pagsulat'], ['PE12B', 'PE & Health 4'], ['ENTR', 'Entrepreneurship'], ['INQ', 'Inquiries'], ['CULM', 'Culminating Activity']], capacity: 40 },

            // SHS ABM 1st Sem (Gr 11)
            { level: 'Grade 11 - ABM - 1st Sem', subjects: [['ORAL', 'Oral Communication'], ['KOMU', 'Komunikasyon'], ['PERD', 'Personal Dev'], ['FABM1', 'Fundamentals of ABM 1'], ['BUSM', 'Business Math'], ['PE11', 'PE & Health 1']], capacity: 40 },
            // SHS ABM 2nd Sem (Gr 11)
            { level: 'Grade 11 - ABM - 2nd Sem', subjects: [['READ', 'Reading & Writing'], ['PAGB', 'Pagbasa'], ['STAT', 'Statistics'], ['PE11B', 'PE & Health 2'], ['PR1', 'Practical Research 1'], ['FABM2', 'Fundamentals of ABM 2'], ['BUSF', 'Business Finance']], capacity: 40 },
            // SHS ABM 1st Sem (Gr 12)
            { level: 'Grade 12 - ABM - 1st Sem', subjects: [['21ST', '21st Century Lit'], ['PHIL', 'Philosophy'], ['PE12', 'PE & Health 3'], ['EAPP', 'EAPP'], ['PR2', 'Practical Research 2'], ['CPAR', 'Contemporary Arts'], ['MIL', 'Media & Info Lit']], capacity: 40 },
            // SHS ABM 2nd Sem (Gr 12)
            { level: 'Grade 12 - ABM - 2nd Sem', subjects: [['PAGS', 'Pagsulat'], ['PE12B', 'PE & Health 4'], ['ENTR', 'Entrepreneurship'], ['INQ', 'Inquiries'], ['BUSR', 'Business Research']], capacity: 40 }
        ];

        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        const timeSlots = [ ['07:00','08:00'], ['08:00','09:00'], ['09:00','10:00'], ['10:00','11:00'], ['13:00','14:00'], ['14:00','15:00'], ['15:00','16:00'] ];

        let teacherIndex = 0;

        gradeConfigs.forEach(config => {
            for (let sec = 1; sec <= 2; sec++) {
                const sectionStr = sec.toString();
                const gradePrefix = config.level.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                const advisoryTeacher = teachers[teacherIndex % teachers.length];
                teacherIndex++;
                let timeIndex = 0;

                config.subjects.forEach((sub, idx) => {
                    const subCode = sub[0];
                    const subName = sub[1];
                    const courseCode = `${subCode}-${gradePrefix}-${sec}`;
                    const subjectTeacher = teachers[(teacherIndex + idx) % teachers.length];

                    insertCourse.run(courseCode, `${subName} (${config.level})`, config.level, sectionStr, config.capacity, advisoryTeacher, subjectTeacher, 'Open');

                    const day = days[timeIndex % 5];
                    const time = timeSlots[Math.floor(timeIndex / 5) % timeSlots.length];
                    insertSchedule.run(courseCode, sectionStr, day, time[0], time[1]);
                    timeIndex++;
                });
            }
        });

        insertCourse.finalize();
        insertSchedule.finalize(() => {
            console.log("✅ Database successfully created with 1st and 2nd Semester configurations.");
        });
    });
}

// API ROUTES
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username and password required" });
    db.get("SELECT * FROM users WHERE username = ? AND password = ?", [username, password], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(401).json({ error: "Invalid credentials" });
        res.json(user);
    });
});

app.get('/api/users', (req, res) => db.all("SELECT username, name, role, section FROM users", [], (err, rows) => res.json(err ? [] : rows)));
app.post('/api/faculty', (req, res) => {
    const { username, password, name, role, section } = req.body;
    db.run(`INSERT INTO users (username, password, name, role, section) VALUES (?,?,?,?,?)`, [username, password, name, role, section], function(e) {
        if(e) return res.status(400).json({ error: "Username already exists" });
        res.json({ message: "Faculty created" });
    });
});
app.post('/api/users/update', (req, res) => {
    const { username, password, name, role, section } = req.body;
    if (password && password.trim() !== '') {
        db.run(`UPDATE users SET password=?, name=?, role=?, section=? WHERE username=?`, [password, name, role, section, username], (e) => res.json({ message: e ? e.message : "Updated" }));
    } else {
        db.run(`UPDATE users SET name=?, role=?, section=? WHERE username=?`, [name, role, section, username], (e) => res.json({ message: e ? e.message : "Updated" }));
    }
});
app.delete('/api/users/:username', (req, res) => {
    const username = req.params.username;
    if (username === 'admin') return res.status(403).json({ error: "Cannot delete admin" });
    db.run("DELETE FROM users WHERE username = ?", [username], function(e) {
        if (e) return res.status(400).json({ error: e.message });
        db.run("DELETE FROM students WHERE id = ?", [username]); 
        res.json({ message: "User deleted" });
    });
});

app.get('/api/students', (req, res) => db.all("SELECT * FROM students", [], (err, rows) => res.json(err ? [] : rows)));
app.post('/api/students', (req, res) => {
    const { id, last, first, mi, address, course, yr, status, enrol, birthday, email } = req.body;
    if (!id) return res.status(400).json({ error: "Student ID required" });
    const fullName = `${first} ${last}`;
    const generatedPass = `${first.toLowerCase()}123`;

    db.get("SELECT id FROM students WHERE id = ?", [id], (err, row) => {
        if (row) {
            db.run(`UPDATE students SET last=?, first=?, mi=?, address=?, course=?, yr=?, status=?, enrol=?, birthday=?, email=? WHERE id=?`, [last, first, mi, address, course, yr, status, enrol, birthday, email, id], (e) => res.json({ message: e ? e.message : "Updated" }));
        } else {
            db.run(`INSERT INTO students (id, last, first, mi, address, course, yr, status, enrol, username, password, birthday, email) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`, [id, last, first, mi, address, course, yr, status, enrol, id, generatedPass, birthday, email], (e) => {
                if (e) return res.status(400).json({ error: e.message });
                db.run(`INSERT INTO users (username, password, name, role, section) VALUES (?,?,?,'Student',?)`, [id, generatedPass, fullName, yr], () => res.json({ message: "Created" }));
            });
        }
    });
});

app.get('/api/courses', (req, res) => db.all("SELECT * FROM courses", [], (err, rows) => res.json(err ? [] : rows)));
app.post('/api/courses', (req, res) => {
    const { code, name, gradeLevel, section, capacity, adviser, subjectTeacher, status } = req.body;
    db.run(`INSERT INTO courses (code, name, gradeLevel, section, capacity, adviser, subjectTeacher, status) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(code) DO UPDATE SET name=excluded.name, gradeLevel=excluded.gradeLevel, section=excluded.section, capacity=excluded.capacity, adviser=excluded.adviser, subjectTeacher=excluded.subjectTeacher, status=excluded.status`, [code, name, gradeLevel, section, capacity || 30, adviser || '', subjectTeacher || '', status || 'Open'], (e) => res.json({ message: e ? e.message : "Created" }));
});

app.get('/api/enrollments/:studentId', (req, res) => db.all("SELECT * FROM enrollments WHERE studentId = ?", [req.params.studentId], (err, rows) => res.json(err ? [] : rows)));
app.post('/api/enroll', (req, res) => {
    const { studentId, courseCode, section, term } = req.body;
    db.get("SELECT name, capacity, status FROM courses WHERE code = ?", [courseCode], (err, course) => {
        if (!course) return res.status(404).json({ error: "Course not found" });
        if (course.status === 'Closed') return res.status(400).json({ error: "Course is closed" });
        db.get(`SELECT e.id FROM enrollments e JOIN courses c ON e.courseCode = c.code WHERE e.studentId = ? AND c.name = ?`, [studentId, course.name], (err2, existing) => {
            if (existing) return res.status(400).json({ error: "Already enrolled" });
            db.get(`SELECT COUNT(*) as count FROM enrollments WHERE courseCode = ? AND section = ?`, [courseCode, section], (err3, result) => {
                if (result.count >= course.capacity) {
                    db.run(`UPDATE courses SET status = 'Closed' WHERE code = ?`, [courseCode]);
                    return res.status(400).json({ error: "Course is full" });
                }
                db.run(`INSERT INTO enrollments (studentId, courseCode, section, term) VALUES (?,?,?,?)`, [studentId, courseCode, section, term || '1st Sem'], (e) => {
                    if (e) return res.status(400).json({ error: e.message });
                    res.json({ message: "Enrolled" });
                });
            });
        });
    });
});

app.get('/api/grades/check/:studentId/:courseName', (req, res) => db.get("SELECT * FROM grades WHERE studentId = ? AND courseName = ?", [req.params.studentId, req.params.courseName], (err, row) => res.json(row || null)));
app.post('/api/grades', (req, res) => {
    const { studentId, courseCode, courseName, grade, term } = req.body;
    db.get("SELECT id FROM grades WHERE studentId = ? AND courseName = ?", [studentId, courseName], (err, existing) => {
        if (existing) db.run(`UPDATE grades SET grade=?, term=? WHERE id=?`, [grade, term, existing.id], (e) => res.json({ message: "Updated" }));
        else db.run(`INSERT INTO grades (studentId, courseCode, courseName, grade, term) VALUES (?,?,?,?,?)`, [studentId, courseCode, courseName, grade, term], (e) => res.json({ message: "Submitted" }));
    });
});

app.get('/api/student/grades/:studentId', (req, res) => db.all("SELECT * FROM grades WHERE studentId = ?", [req.params.studentId], (err, rows) => res.json(err ? [] : rows)));
app.get('/api/schedules', (req, res) => db.all("SELECT * FROM schedules", [], (err, rows) => res.json(err ? [] : rows)));
app.get('/api/schedules/:gradeLevel/:section', (req, res) => db.all(`SELECT s.*, c.name AS courseName, c.adviser FROM schedules s JOIN courses c ON s.courseCode = c.code WHERE c.gradeLevel = ? AND s.section = ?`, [req.params.gradeLevel, req.params.section], (err, rows) => res.json(err ? [] : rows)));
app.get('/api/attendance/:courseCode/:section/:date', (req, res) => db.all(`SELECT * FROM attendance WHERE courseCode = ? AND section = ? AND date = ?`, [req.params.courseCode, req.params.section, req.params.date], (err, rows) => res.json(err ? [] : rows)));
app.post('/api/attendance', (req, res) => {
    const { courseCode, section, studentId, date, status } = req.body;
    db.run(`INSERT INTO attendance (courseCode, section, studentId, date, status) VALUES (?,?,?,?,?) ON CONFLICT(courseCode, section, studentId, date) DO UPDATE SET status=excluded.status`, [courseCode, section, studentId, date, status], (e) => res.json({ message: "Recorded" }));
});
app.get('/api/student/records/:studentId', (req, res) => db.all("SELECT * FROM student_records WHERE studentId = ? ORDER BY gradeLevel", [req.params.studentId], (err, rows) => res.json(err ? [] : rows)));

app.listen(port, () => console.log(`✅ Server running on port ${port}`));