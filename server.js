const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');
const { Resend } = require('resend');

const app = express();
const port = process.env.PORT || 10000;

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key');

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error("DB error:", err.message);
    else console.log("Connected to SQLite DB");
});

// AUTO-SEED CHECK
db.serialize(() => {
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='users'", (err, row) => {
        if (!row) {
            buildDatabase();
        } else {
            db.all("PRAGMA table_info(students)", (err, cols) => {
                const hasNewFields = cols.some(c => c.name === 'guardianName');
                if (!hasNewFields) {
                    console.log("⚠️ Old schema detected. Rebuilding database...");
                    db.run("DROP TABLE IF EXISTS attendance");
                    db.run("DROP TABLE IF EXISTS student_records");
                    db.run("DROP TABLE IF EXISTS enrollments");
                    db.run("DROP TABLE IF EXISTS students");
                    db.run("DROP TABLE IF EXISTS users");
                    db.run("DROP TABLE IF EXISTS courses");
                    db.run("DROP TABLE IF EXISTS grades");
                    db.run("DROP TABLE IF EXISTS schedules");
                    db.run("DROP TABLE IF EXISTS settings", () => buildDatabase());
                } else {
                    db.get("SELECT COUNT(*) as count FROM schedules", (e, r) => {
                        if(r && r.count === 0) generateSchedules();
                    });
                }
            });
        }
    });
});

function buildDatabase() {
    db.serialize(() => {
        db.run(`CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT)`);
        db.run(`INSERT INTO settings (key, value) VALUES ('active_term', '1st Semester')`);

        db.run(`CREATE TABLE users (username TEXT PRIMARY KEY, password TEXT, name TEXT, role TEXT, section TEXT, email TEXT)`);
        db.run(`CREATE TABLE students (id TEXT PRIMARY KEY, last TEXT, first TEXT, mi TEXT, address TEXT, course TEXT, yr TEXT, status TEXT, enrol TEXT, username TEXT, password TEXT, birthday TEXT, email TEXT, age TEXT, gender TEXT, guardianName TEXT, guardianContact TEXT)`);
        db.run(`CREATE TABLE courses (code TEXT PRIMARY KEY, name TEXT, gradeLevel TEXT, section TEXT, capacity INTEGER, adviser TEXT, subjectTeacher TEXT, status TEXT)`);
        db.run(`CREATE TABLE enrollments (id INTEGER PRIMARY KEY AUTOINCREMENT, studentId TEXT, courseCode TEXT, section TEXT, term TEXT)`);
        db.run(`CREATE TABLE grades (id INTEGER PRIMARY KEY AUTOINCREMENT, studentId TEXT, courseCode TEXT, courseName TEXT, grade REAL, term TEXT)`);
        db.run(`CREATE TABLE schedules (id INTEGER PRIMARY KEY AUTOINCREMENT, courseCode TEXT, section TEXT, day TEXT, startTime TEXT, endTime TEXT, UNIQUE(courseCode, section, day, startTime))`);
        db.run(`CREATE TABLE attendance (id INTEGER PRIMARY KEY AUTOINCREMENT, courseCode TEXT, section TEXT, studentId TEXT, date TEXT, status TEXT, UNIQUE(courseCode, section, studentId, date))`);
        db.run(`CREATE TABLE student_records (id INTEGER PRIMARY KEY AUTOINCREMENT, studentId TEXT, gradeLevel TEXT, schoolYear TEXT, subject TEXT, grade REAL, status TEXT, remarks TEXT)`);

        db.run(`INSERT INTO users (username, password, name, role, section, email) VALUES ('admin', 'admin123', 'Admin User', 'Admin', '', 'admin@edutrack.com')`);
        db.run(`INSERT INTO users (username, password, name, role, section, email) VALUES ('registrar', 'reg123', 'Registrar Staff', 'Registrar', '', 'registrar@edutrack.com')`);

        const insertUser = db.prepare(`INSERT INTO users (username, password, name, role, section, email) VALUES (?, ?, ?, ?, ?, ?)`);
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
            const email = `t${firstName.toLowerCase()}${i}@gmail.com`; // Naka-gmail na
            insertUser.run(`t${firstName.toLowerCase()}${i}`, `${firstName.toLowerCase()}123`, name, 'Faculty', '', email);
        });
        insertUser.finalize();

        const insertStudent = db.prepare(`INSERT INTO students (id, last, first, mi, address, course, yr, status, enrol, username, password, birthday, email, age, gender, guardianName, guardianContact) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        insertStudent.run('2023-0006', 'Dela Cruz', 'Juan', 'A', 'Mariveles, Bataan', 'Elem', 'Grade 4', 'Active', 'Enrolled', 'juandc', 'juan123', '2017-05-14', 'juan@example.com', '8', 'Male', 'Maria Dela Cruz', '0917-111-2222');
        insertStudent.run('2026-01523', 'Reyes', 'Maria', 'B', 'Limay, Bataan', 'SHS', 'Grade 11 - STEM - 1st Semester', 'Active', 'Enrolled', 'mariar', 'maria123', '2010-08-22', 'maria@example.com', '15', 'Female', 'Jose Reyes', '0918-333-4444');
        insertStudent.run('2026-0011', 'Manuel', 'Alexandra', 'B.', 'Mariveles, Bataan', 'SHS', 'Grade 12 - STEM - 1st Semester', 'Active', 'Enrolled', 'alexandram', 'alexandra123', '2009-03-30', 'alexandra@example.com', '17', 'Female', 'Rosa Manuel', '0921-999-0000');
        insertStudent.finalize();

        const insertCourse = db.prepare(`INSERT INTO courses (code, name, gradeLevel, section, capacity, adviser, subjectTeacher, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
        const gradeConfigs = [
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
            { level: 'Grade 11 - STEM - 1st Semester', subjects: [['ORAL', 'Oral Communication'], ['KOMU', 'Komunikasyon'], ['GENM', 'General Math'], ['EALS', 'Earth & Life Science'], ['PERD', 'Personal Dev'], ['EMPW', 'Empowerment Tech'], ['PE11', 'PE & Health 1'], ['PREC', 'Pre-Calculus'], ['CHEM1', 'Gen Chem 1']], capacity: 40 },
            { level: 'Grade 11 - STEM - 2nd Semester', subjects: [['READ', 'Reading & Writing'], ['PAGB', 'Pagbasa'], ['STAT', 'Statistics'], ['PHYS', 'Physical Science'], ['PE11B', 'PE & Health 2'], ['PR1', 'Practical Research 1'], ['BASC', 'Basic Calculus'], ['CHEM2', 'Gen Chem 2']], capacity: 40 },
            { level: 'Grade 12 - STEM - 1st Semester', subjects: [['21ST', '21st Century Lit'], ['UCSP', 'UCSP'], ['PHIL', 'Philosophy'], ['PE12', 'PE & Health 3'], ['EAPP', 'EAPP'], ['PR2', 'Practical Research 2'], ['CPAR', 'Contemporary Arts'], ['MIL', 'Media & Info Lit'], ['PHY1', 'Gen Physics 1'], ['BIO1', 'Gen Biology 1']], capacity: 40 },
            { level: 'Grade 12 - STEM - 2nd Semester', subjects: [['PAGS', 'Pagsulat'], ['PE12B', 'PE & Health 4'], ['ENTR', 'Entrepreneurship'], ['INQ', 'Inquiries'], ['PHY2', 'Gen Physics 2'], ['BIO2', 'Gen Biology 2'], ['STEMW', 'Work Immersion']], capacity: 40 }
        ];

        let teacherIndex = 0;
        gradeConfigs.forEach(config => {
            for (let sec = 1; sec <= 2; sec++) {
                const sectionStr = sec.toString();
                const gradePrefix = config.level.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                const advisoryTeacher = teachers[teacherIndex % teachers.length];
                teacherIndex++;

                config.subjects.forEach((sub, idx) => {
                    const subCode = sub[0];
                    const subName = sub[1];
                    const courseCode = `${subCode}-${gradePrefix}-${sec}`;
                    const subjectTeacher = teachers[(teacherIndex + idx) % teachers.length];
                    insertCourse.run(courseCode, `${subName} (${config.level})`, config.level, sectionStr, config.capacity, advisoryTeacher, subjectTeacher, 'Open');
                });
            }
        });
        insertCourse.finalize(() => {
            generateSchedules();
        });
    });
}

// GENERATE SCHEDULES
function generateSchedules() {
    db.all("SELECT * FROM courses", [], (err, courses) => {
        if (err || !courses) return;
        db.run("DELETE FROM schedules", () => {
            const insertSchedule = db.prepare(`INSERT INTO schedules (courseCode, section, day, startTime, endTime) VALUES (?, ?, ?, ?, ?)`);
            
            const groupedBySection = {};
            courses.forEach(c => {
                const key = `${c.gradeLevel}|${c.section}`;
                if (!groupedBySection[key]) groupedBySection[key] = [];
                groupedBySection[key].push(c);
            });

            const teacherSchedule = {}; 

            Object.keys(groupedBySection).forEach(key => {
                const [gradeLevel, section] = key.split('|');
                const subjectList = groupedBySection[key];
                
                const slots = [
                    { start: '07:00', end: '09:00' },
                    { start: '09:00', end: '11:00' },
                    { start: '11:00', end: '13:00' },
                    { start: '13:00', end: '15:00' }
                ];

                subjectList.forEach((sub, index) => {
                    let assignedDays = [];
                    if (index % 3 === 0) assignedDays = ['Monday', 'Wednesday'];
                    else if (index % 3 === 1) assignedDays = ['Tuesday', 'Thursday'];
                    else assignedDays = ['Wednesday', 'Friday'];

                    const teacher = sub.subjectTeacher || 'Unassigned';

                    let assignedSlot = null;
                    for (let s of slots) {
                        let isFree = true;
                        for (let d of assignedDays) {
                            if (teacherSchedule[`${teacher}-${d}-${s.start}`]) { isFree = false; break; }
                        }
                        if (isFree) { assignedSlot = s; break; }
                    }

                    if (!assignedSlot) assignedSlot = slots[0]; 

                    assignedDays.forEach(d => {
                        teacherSchedule[`${teacher}-${d}-${assignedSlot.start}`] = true;
                        insertSchedule.run(sub.code, section, d, assignedSlot.start, assignedSlot.end);
                    });
                });
            });

            insertSchedule.finalize(() => {
                console.log("✅ Schedules generated.");
            });
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

app.get('/api/settings/term', (req, res) => {
    db.get("SELECT value FROM settings WHERE key = 'active_term'", [], (err, row) => {
        if(err || !row) return res.json({ term: '1st Semester' });
        res.json({ term: row.value });
    });
});
app.post('/api/settings/term', (req, res) => {
    const { term } = req.body;
    db.run("UPDATE settings SET value = ? WHERE key = 'active_term'", [term], (err) => {
        if(err) return res.status(500).json({ error: err.message });
        res.json({ message: "Term updated" });
    });
});

app.get('/api/users', (req, res) => db.all("SELECT username, name, role, section, email FROM users", [], (err, rows) => res.json(err ? [] : rows)));

app.post('/api/faculty', (req, res) => {
    const { username, password, name, role, section, email } = req.body;
    
    db.run(`INSERT INTO users (username, password, name, role, section, email) VALUES (?,?,?,?,?,?)`, 
    [username, password, name, role, section, email], async function(e) {
        if(e) return res.status(400).json({ error: "Username already exists" });
        
        if (email && email.trim() !== "") {
            try {
                if(process.env.RESEND_API_KEY) {
                    await resend.emails.send({
                        from: 'EduTrack <onboarding@resend.dev>', 
                        to: [email],
                        subject: 'Your EduTrack Faculty Account',
                        html: `<div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                                <h2 style="color: #5c0000;">Welcome to EduTrack, ${name}!</h2>
                                <p>Your faculty account has been successfully created by the Administrator. Here are your login credentials:</p>
                                <table style="margin-top: 15px; border-collapse: collapse;">
                                    <tr><td style="padding: 5px; font-weight: bold;">Username:</td><td style="padding: 5px;">${username}</td></tr>
                                    <tr><td style="padding: 5px; font-weight: bold;">Password:</td><td style="padding: 5px;">${password}</td></tr>
                                </table>
                                <p style="margin-top: 20px;">Please log in to the portal to manage your classes and students.</p>
                            </div>`
                    });
                }
            } catch (error) {
                console.error("❌ Failed to send faculty email:", error);
            }
        }
        
        res.json({ message: "Faculty created and email sent!" });
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
    const { id, last, first, mi, address, course, yr, status, enrol, birthday, email, age, gender, guardianName, guardianContact } = req.body;
    if (!id) return res.status(400).json({ error: "Student ID required" });
    const fullName = `${first} ${last}`;
    const generatedPass = `${first.toLowerCase()}123`;

    db.get("SELECT id FROM students WHERE id = ?", [id], async (err, row) => {
        if (row) {
            db.run(`UPDATE students SET last=?, first=?, mi=?, address=?, course=?, yr=?, status=?, enrol=?, birthday=?, email=?, age=?, gender=?, guardianName=?, guardianContact=? WHERE id=?`, 
            [last, first, mi, address, course, yr, status, enrol, birthday, email, age, gender, guardianName, guardianContact, id], (e) => res.json({ message: e ? e.message : "Updated" }));
        } else {
            db.run(`INSERT INTO students (id, last, first, mi, address, course, yr, status, enrol, username, password, birthday, email, age, gender, guardianName, guardianContact) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, 
            [id, last, first, mi, address, course, yr, status, enrol, id, generatedPass, birthday, email, age, gender, guardianName, guardianContact], async (e) => {
                if (e) return res.status(400).json({ error: e.message });
                
                db.run(`INSERT INTO users (username, password, name, role, section, email) VALUES (?,?,?,'Student',?,?)`, [id, generatedPass, fullName, yr, email], async () => {
                    if (email && email.trim() !== "") {
                        try {
                            if(process.env.RESEND_API_KEY) {
                                await resend.emails.send({
                                    from: 'EduTrack <onboarding@resend.dev>', 
                                    to: [email],
                                    subject: 'Your EduTrack SIS Account',
                                    html: `<div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                                            <h2 style="color: #5c0000;">Welcome to EduTrack, ${first}!</h2>
                                            <p>Your student account has been successfully created. Here are your login credentials:</p>
                                            <table style="margin-top: 15px; border-collapse: collapse;">
                                                <tr><td style="padding: 5px; font-weight: bold;">Username:</td><td style="padding: 5px;">${id}</td></tr>
                                                <tr><td style="padding: 5px; font-weight: bold;">Password:</td><td style="padding: 5px;">${generatedPass}</td></tr>
                                            </table>
                                        </div>`
                                });
                            }
                        } catch (error) { console.error("❌ Failed to send email:", error); }
                    }
                    res.json({ message: "Student created!" });
                });
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
                db.run(`INSERT INTO enrollments (studentId, courseCode, section, term) VALUES (?,?,?,?)`, [studentId, courseCode, section, term || '1st Semester'], (e) => {
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