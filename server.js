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
                    db.get("SELECT COUNT(*) as count FROM enrollments", (e, r) => {
                        if(r && r.count === 0) autoEnrollAllStudents();
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

        const teachers = [
            'T. John Emmanuel S.', 'T. Emily Bronte', 'T. Alan Turing', 'T. Liza Soberano', 'T. Andres Bonifacio',
            'T. Enrique Gil', 'T. Kathryn Bernardo', 'T. Marie Curie', 'T. Daniel Padilla', 'T. Angel Locsin',
            'T. Coco Martin', 'T. Francisco Balagtas', 'T. Gabriela Silang', 'T. Jane C. Villa', 'T. Warren Buffet',
            'T. Michael Smith', 'T. Sarah Johnson', 'T. David Williams', 'T. Mary Brown', 'T. James Davis',
            'T. Smith V. Cruz', 'T. Albert Einstein', 'T. Isaac Newton', 'T. Charles Darwin', 'T. Nikola Tesla',
            'T. Rosalind Franklin', 'T. Stephen Hawking', 'T. Ada Lovelace', 'T. Galileo Galilei', 'T. Aristotle'
        ];
        
        const insertUser = db.prepare(`INSERT INTO users (username, password, name, role, section, email) VALUES (?, ?, ?, ?, ?, ?)`);
        teachers.forEach((name, i) => {
            const firstName = name.split(' ')[1] || 'Teacher';
            const email = `t${firstName.toLowerCase()}${i}@gmail.com`;
            insertUser.run(`t${firstName.toLowerCase()}${i}`, `${firstName.toLowerCase()}123`, name, 'Faculty', '', email);
        });
        insertUser.finalize();

        // --- STUDENT GENERATION LOGIC (Sections 1 to 3) ---
        const insertStudent = db.prepare(`INSERT INTO students (id, last, first, mi, address, course, yr, status, enrol, username, password, birthday, email, age, gender, guardianName, guardianContact) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        
        const firstNamesList = ['Juan', 'Maria', 'Jose', 'Ana', 'Pedro', 'Rosa', 'Mark', 'Katie', 'Alexandra', 'Paul', 'Liza', 'Carlo', 'Mia', 'Leo', 'Ella', 'Ben', 'Sarah', 'David', 'Mary', 'James', 'John', 'Emily', 'Alan', 'Jane', 'Michael', 'Sarah', 'David', 'Jessica', 'Daniel', 'Ashley', 'Matthew', 'Amanda', 'Christopher', 'Melissa', 'Andrew', 'Stephanie', 'Joshua', 'Nicole', 'Ryan', 'Angela', 'Nicholas', 'Heather', 'Tyler', 'Amber', 'Brandon', 'Michelle', 'Zachary', 'Tiffany', 'Jacob', 'Christina'];
        const lastNamesList = ['Dela Cruz', 'Reyes', 'Santos', 'Manuel', 'Garcia', 'Mendoza', 'Torres', 'Flores', 'Ramos', 'Rivera', 'Cruz', 'Bautista', 'Ocampo', 'Aquino', 'Navarro', 'Villanueva', 'Gonzales', 'Perez', 'Castillo', 'Soriano', 'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson'];

        firstNamesList.sort(() => Math.random() - 0.5);
        lastNamesList.sort(() => Math.random() - 0.5);

        let globalStudentCount = 0;

        for (let grade = 1; grade <= 12; grade++) {
            const yearPrefix = 2027 - grade;
            
            for (let sec = 1; sec <= 3; sec++) { // Sections 1, 2, 3
                let targetCount = 30; 

                for (let i = 0; i < targetCount; i++) {
                    const first = firstNamesList[globalStudentCount % firstNamesList.length];
                    const last = lastNamesList[globalStudentCount % lastNamesList.length];
                    
                    let studentId = `${yearPrefix}-${String(grade).padStart(2, '0')}${sec}${String(i + 1).padStart(2, '0')}`;
                    
                    let birthday = `200${10 - grade}-05-14`;
                    let email = `${first.toLowerCase()}.${last.toLowerCase()}${globalStudentCount}@example.com`;
                    let age = (12 - grade) + 6;
                    if(age < 5) age = 5;
                    let gender = (globalStudentCount % 2 === 0) ? 'Male' : 'Female';

                    let courseType = 'Elem';
                    let yrLevel = `Grade ${grade}`;
                    
                    if (grade >= 7 && grade <= 10) courseType = 'JHS';
                    if (grade >= 11) courseType = 'SHS';

                    if (courseType === 'SHS') {
                        yrLevel = `Grade ${grade} - STEM - 1st Semester - Sec ${sec}`;
                    } else {
                        yrLevel = `Grade ${grade} - Sec ${sec}`;
                    }

                    const generatedPass = `${first.toLowerCase()}123`;

                    insertStudent.run(studentId, last, first, 'A', 'Mariveles, Bataan', courseType, yrLevel, 'Active', 'Enrolled', studentId, generatedPass, birthday, email, age, gender, `Parent ${last}`, '0917-000-0000');
                    
                    db.run(`INSERT INTO users (username, password, name, role, section, email) VALUES (?,?,?,'Student',?,?)`, 
                        [studentId, generatedPass, `${first} ${last}`, yrLevel, email]);

                    globalStudentCount++;
                }
            }
        }
        insertStudent.finalize();

        const insertCourse = db.prepare(`INSERT INTO courses (code, name, gradeLevel, section, capacity, adviser, subjectTeacher, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
        const gradeConfigs = [
            { level: 'Grade 1', subjects: [['LANG', 'Language'], ['READ', 'Reading'], ['MATH', 'Mathematics'], ['GMRC', 'Good Manners'], ['MAK', 'Makabansa']], capacity: 30 },
            { level: 'Grade 2', subjects: [['ENG', 'English'], ['FIL', 'Filipino'], ['MATH', 'Mathematics'], ['GMRC', 'Good Manners'], ['MAK', 'Makabansa']], capacity: 30 },
            { level: 'Grade 3', subjects: [['ENG', 'English'], ['FIL', 'Filipino'], ['MATH', 'Mathematics'], ['SCI', 'Science'], ['GMRC', 'Good Manners'], ['MAK', 'Makabansa']], capacity: 30 },
            { level: 'Grade 4', subjects: [['ENG', 'English'], ['FIL', 'Filipino'], ['MATH', 'Mathematics'], ['SCI', 'Science'], ['AP', 'Araling Panlipunan'], ['ESP', 'Values Ed'], ['MAPEH', 'MAPEH'], ['EPP', 'EPP']], capacity: 30 },
            { level: 'Grade 5', subjects: [['ENG', 'English'], ['FIL', 'Filipino'], ['MATH', 'Mathematics'], ['SCI', 'Science'], ['AP', 'Araling Panlipunan'], ['ESP', 'Values Ed'], ['MAPEH', 'MAPEH'], ['EPP', 'EPP']], capacity: 30 },
            { level: 'Grade 6', subjects: [['ENG', 'English'], ['FIL', 'Filipino'], ['MATH', 'Mathematics'], ['SCI', 'Science'], ['AP', 'Araling Panlipunan'], ['ESP', 'Values Ed'], ['MAPEH', 'MAPEH'], ['TLE', 'TLE']], capacity: 30 },
            { level: 'Grade 7', subjects: [['ENG', 'English'], ['FIL', 'Filipino'], ['MATH', 'Mathematics'], ['SCI', 'Science'], ['AP', 'Araling Panlipunan'], ['ESP', 'Values Ed'], ['MAPEH', 'MAPEH'], ['TLE', 'TLE']], capacity: 30 },
            { level: 'Grade 8', subjects: [['ENG', 'English'], ['FIL', 'Filipino'], ['MATH', 'Mathematics'], ['SCI', 'Science'], ['AP', 'Araling Panlipunan'], ['ESP', 'Values Ed'], ['MAPEH', 'MAPEH'], ['TLE', 'TLE']], capacity: 30 },
            { level: 'Grade 9', subjects: [['ENG', 'English'], ['FIL', 'Filipino'], ['MATH', 'Mathematics'], ['SCI', 'Science'], ['AP', 'Araling Panlipunan'], ['ESP', 'Values Ed'], ['MAPEH', 'MAPEH'], ['TLE', 'TLE']], capacity: 30 },
            { level: 'Grade 10', subjects: [['ENG', 'English'], ['FIL', 'Filipino'], ['MATH', 'Mathematics'], ['SCI', 'Science'], ['AP', 'Araling Panlipunan'], ['ESP', 'Values Ed'], ['MAPEH', 'MAPEH'], ['TLE', 'TLE']], capacity: 30 },
            { level: 'Grade 11 - STEM - 1st Semester', subjects: [['ORAL', 'Oral Communication'], ['KOMU', 'Komunikasyon'], ['GENM', 'General Math'], ['EALS', 'Earth & Life Science'], ['PERD', 'Personal Dev'], ['EMPW', 'Empowerment Tech'], ['PE11', 'PE & Health 1'], ['PREC', 'Pre-Calculus'], ['CHEM1', 'Gen Chem 1']], capacity: 30 },
            { level: 'Grade 11 - STEM - 2nd Semester', subjects: [['READ', 'Reading & Writing'], ['PAGB', 'Pagbasa'], ['STAT', 'Statistics'], ['PHYS', 'Physical Science'], ['PE11B', 'PE & Health 2'], ['PR1', 'Practical Research 1'], ['BASC', 'Basic Calculus'], ['CHEM2', 'Gen Chem 2']], capacity: 30 },
            { level: 'Grade 12 - STEM - 1st Semester', subjects: [['21ST', '21st Century Lit'], ['UCSP', 'UCSP'], ['PHIL', 'Philosophy'], ['PE12', 'PE & Health 3'], ['EAPP', 'EAPP'], ['PR2', 'Practical Research 2'], ['CPAR', 'Contemporary Arts'], ['MIL', 'Media & Info Lit'], ['PHY1', 'Gen Physics 1'], ['BIO1', 'Gen Biology 1']], capacity: 30 },
            { level: 'Grade 12 - STEM - 2nd Semester', subjects: [['PAGS', 'Pagsulat'], ['PE12B', 'PE & Health 4'], ['ENTR', 'Entrepreneurship'], ['INQ', 'Inquiries'], ['PHY2', 'Gen Physics 2'], ['BIO2', 'Gen Biology 2'], ['STEMW', 'Work Immersion']], capacity: 30 }
        ];

        let globalSubCount = 0;

        gradeConfigs.forEach(config => {
            for (let sec = 1; sec <= 3; sec++) {
                const sectionStr = sec.toString();
                const gradePrefix = config.level.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                
                const advisoryTeacher = teachers[(globalSubCount + sec) % teachers.length];

                config.subjects.forEach((sub, idx) => {
                    const subCode = sub[0];
                    const subName = sub[1];
                    const courseCode = `${subCode}-${gradePrefix}-${sec}`;
                    
                    const teacherIdx = (globalSubCount + idx + (sec * 2)) % teachers.length;
                    const subjectTeacher = teachers[teacherIdx];
                    
                    insertCourse.run(courseCode, `${subName} (${config.level})`, config.level, sectionStr, config.capacity, advisoryTeacher, subjectTeacher, 'Open');
                });
                
                globalSubCount += config.subjects.length;
            }
        });
        
        insertCourse.finalize(() => {
            generateSchedules();
            autoEnrollAllStudents();
        });
    });
}

// ==========================================
// AUTO ENROLL: Ine-enroll lahat ng students sa subjects nila
// ==========================================
function autoEnrollAllStudents() {
    db.all("SELECT * FROM students", [], (err, students) => {
        if (err || !students) return;
        db.all("SELECT * FROM courses", [], (err, courses) => {
            if (err || !courses) return;
            
            const insertEnroll = db.prepare(`INSERT INTO enrollments (studentId, courseCode, section, term) VALUES (?, ?, ?, ?)`);
            
            students.forEach(s => {
                const parts = s.yr.split(' - ');
                const gradeLevel = parts[0].trim();
                const secMatch = s.yr.match(/Sec(?:tion)?\s*(\d+)/i);
                const section = secMatch ? secMatch[1] : '1';
                
                let track = '';
                let semester = '';
                if (s.course === 'SHS') {
                    track = s.yr.includes('STEM') ? 'STEM' : s.yr.includes('HUMSS') ? 'HUMSS' : s.yr.includes('ABM') ? 'ABM' : '';
                    semester = s.yr.includes('2nd Semester') ? '2nd Semester' : '1st Semester';
                }

                const mySubjects = courses.filter(c => {
                    if (s.course === 'SHS') {
                        return c.gradeLevel.includes(gradeLevel) && c.gradeLevel.includes(track) && c.gradeLevel.includes(semester) && c.section === section;
                    } else {
                        return c.gradeLevel.startsWith(gradeLevel) && c.section === section;
                    }
                });

                mySubjects.forEach(sub => {
                    insertEnroll.run(s.id, sub.code, section, s.course === 'SHS' ? semester : '1st Semester');
                });
            });
            
            insertEnroll.finalize(() => console.log("✅ Auto-enrolled all students."));
        });
    });
}

// ==========================================
// ✅ SCHEDULE GENERATOR (FIXED)
// ==========================================
function generateSchedules() {
    db.all("SELECT * FROM courses", [], (err, courses) => {
        if (err || !courses) return;
        db.run("DELETE FROM schedules", () => {
            const insertSchedule = db.prepare(`INSERT INTO schedules (courseCode, section, day, startTime, endTime) VALUES (?, ?, ?, ?, ?)`);
            
            const toMin = t => { const [h,m] = t.split(':').map(Number); return h*60+m; };
            const toTime = m => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
            const overlaps = (a1,a2,b1,b2) => a1 < b2 && b1 < a2;

            const teacherBusy = {};

            const isTeacherFree = (teacher, day, start, end) => {
                const s = toMin(start), e = toMin(end);
                for (const key in teacherBusy) {
                    const [tName, d, timeRange] = key.split('|');
                    if (tName !== teacher || d !== day) continue;
                    const [bs, be] = timeRange.split('-');
                    if (overlaps(s, e, toMin(bs), toMin(be))) return false;
                }
                return true;
            };

            const markTeacherBusy = (teacher, day, start, end) => {
                teacherBusy[`${teacher}|${day}|${start}-${end}`] = true;
            };

            const SNACK = { start: '09:30', end: '10:00' };
            const LUNCH = { start: '12:00', end: '13:00' };

            const buildDaySlots = (startTime, endTime, duration) => {
                const slots = [];
                let cur = toMin(startTime);
                const end = toMin(endTime);
                const snackS = toMin(SNACK.start), snackE = toMin(SNACK.end);
                const lunchS = toMin(LUNCH.start), lunchE = toMin(LUNCH.end);

                while (cur + duration <= end) {
                    let slotEnd = cur + duration;
                    if (overlaps(cur, slotEnd, snackS, snackE)) { cur = snackE; continue; }
                    if (overlaps(cur, slotEnd, lunchS, lunchE)) { cur = lunchE; continue; }
                    slots.push({ start: cur, end: slotEnd });
                    cur = slotEnd;
                }
                return slots;
            };

            const grouped = {};
            courses.forEach(c => {
                const key = `${c.gradeLevel}|${c.section}`;
                if (!grouped[key]) grouped[key] = [];
                grouped[key].push(c);
            });

            const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

            Object.keys(grouped).forEach(key => {
                const [gradeLevel, section] = key.split('|');
                const isSHS = gradeLevel.includes('Grade 11') || gradeLevel.includes('Grade 12');

                const duration = isSHS ? 90 : 60;
                const maxPerDay = isSHS ? 4 : 6;
                const meetingsPerWeek = isSHS ? 2 : 1;

                let subjects = grouped[key].map(s => ({
                    ...s,
                    meetingsLeft: meetingsPerWeek
                }));

                DAYS.forEach(day => {
                    const slots = buildDaySlots('07:00', '15:00', duration);
                    const usedSubjectsToday = new Set();
                    let countToday = 0;

                    for (const slot of slots) {
                        if (countToday >= maxPerDay) break;
                        if (subjects.every(s => s.meetingsLeft === 0)) break;

                        const slotStart = toTime(slot.start);
                        const slotEnd = toTime(slot.end);

                        const candidate = subjects.find(sub => {
                            if (sub.meetingsLeft <= 0) return false;
                            if (isSHS && usedSubjectsToday.has(sub.code)) return false;
                            const teacher = sub.subjectTeacher || 'Unassigned';
                            return isTeacherFree(teacher, day, slotStart, slotEnd);
                        });

                        if (!candidate) continue;

                        insertSchedule.run(candidate.code, section, day, slotStart, slotEnd);
                        markTeacherBusy(candidate.subjectTeacher || 'Unassigned', day, slotStart, slotEnd);
                        usedSubjectsToday.add(candidate.code);
                        candidate.meetingsLeft--;
                        countToday++;
                    }
                });
            });

            insertSchedule.finalize(() => {
                console.log(`✅ Schedules generated successfully.`);
            });
        });
    });
}

// ==========================================
// ✅ NEW ENDPOINT: Add Section (Auto-copy courses, auto-enroll, auto-schedule)
// ==========================================
app.post('/api/sections/add', (req, res) => {
    const { gradeLevel, newSection, adviser } = req.body;
    if (!gradeLevel || !newSection) return res.status(400).json({ error: "Missing fields" });

    // Hanapin ang template courses (galing sa Section 1)
    db.all("SELECT * FROM courses WHERE gradeLevel = ? AND section = '1'", [gradeLevel], (err, templates) => {
        if (err || !templates || templates.length === 0) {
            return res.status(400).json({ error: "No template courses found in Section 1 for this grade level." });
        }

        let insertCount = 0;
        const insertCourse = db.prepare(`INSERT INTO courses (code, name, gradeLevel, section, capacity, adviser, subjectTeacher, status) VALUES (?,?,?,?,?,?,?,?)`);

        templates.forEach(t => {
            const newCode = t.code.replace(/-1$/, `-${newSection}`);
            insertCourse.run(newCode, t.name, t.gradeLevel, newSection, t.capacity, adviser || t.adviser, t.subjectTeacher, 'Open', (e) => {
                if (e) console.error("Error inserting course:", e.message);
                insertCount++;
                if (insertCount === templates.length) {
                    insertCourse.finalize(() => {
                        // Auto-enroll existing students na nasa bagong section
                        db.all("SELECT * FROM students", [], (errS, students) => {
                            if (errS || !students) {
                                generateSchedules();
                                return res.json({ message: `Section ${newSection} created (courses copied).` });
                            }
                            
                            const insertEnroll = db.prepare(`INSERT INTO enrollments (studentId, courseCode, section, term) VALUES (?, ?, ?, ?)`);
                            let enrolledCount = 0;

                            students.forEach(s => {
                                const secMatch = s.yr.match(/Sec(?:tion)?\s*(\d+)/i);
                                const studentSec = secMatch ? secMatch[1] : '';
                                if (studentSec !== newSection.toString()) return;

                                const parts = s.yr.split(' - ');
                                const studentGrade = parts[0].trim();
                                if (studentGrade !== gradeLevel.split(' - ')[0].trim()) return;

                                // Hanapin ang newly created courses for this student
                                db.all("SELECT * FROM courses WHERE gradeLevel = ? AND section = ?", [gradeLevel, newSection], (errC, newCourses) => {
                                    if (errC || !newCourses) return;
                                    newCourses.forEach(nc => {
                                        insertEnroll.run(s.id, nc.code, newSection, '1st Semester');
                                    });
                                });
                            });

                            insertEnroll.finalize(() => {
                                generateSchedules();
                                res.json({ message: `Section ${newSection} created. Courses copied, schedules generated.` });
                            });
                        });
                    });
                }
            });
        });
    });
});

// ==========================================
// ✅ NEW ENDPOINT: Generate Schedules Manually
// ==========================================
app.post('/api/schedules/generate', (req, res) => {
    generateSchedules();
    res.json({ message: "Schedules generated successfully!" });
});

// REST OF THE API ROUTES
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username and password required" });
    
    db.get("SELECT * FROM users WHERE username = ? AND password = ?", [username, password], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        
        if (user) {
            return res.json(user);
        } else {
            db.get("SELECT * FROM students WHERE (username = ? OR id = ?) AND password = ?", [username, username, password], (err, student) => {
                if (err) return res.status(500).json({ error: err.message });
                if (!student) return res.status(401).json({ error: "Invalid credentials" });
                
                const fullName = `${student.first} ${student.last}`;
                db.run(`INSERT INTO users (username, password, name, role, section, email) VALUES (?,?,?,'Student',?,?)`, 
                [student.id, student.password, fullName, student.yr, student.email], (e) => {
                    if (e) console.error("Auto-sync error:", e);
                    res.json({ username: student.id, name: fullName, role: 'Student', section: student.yr });
                });
            });
        }
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

app.get('/api/users', (req, res) => {
    db.all("SELECT * FROM students", [], (err, students) => {
        if (err || !students) return res.status(500).json({ error: "DB Error" });
        
        db.all("SELECT username FROM users WHERE role = 'Student'", [], (err, existingUsers) => {
            const existingUsernames = existingUsers.map(u => u.username);
            
            students.forEach(s => {
                if (!existingUsernames.includes(s.id)) {
                    db.run(`INSERT INTO users (username, password, name, role, section, email) VALUES (?,?,?,'Student',?,?)`, 
                    [s.id, s.password || `${s.first.toLowerCase()}123`, `${s.first} ${s.last}`, s.yr, s.email]);
                }
            });

            db.all("SELECT username, name, role, section, email FROM users", [], (err, rows) => res.json(err ? [] : rows));
        });
    });
});

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

    const parts = yr.split(' - ');
    const gradeLevel = parts[0].trim();
    const secMatch = yr.match(/Sec(?:tion)?\s*(\d+)/i);
    const section = secMatch ? secMatch[1] : '';

    db.get("SELECT id FROM students WHERE id = ?", [id], async (err, row) => {
        if (row) {
            db.run(`UPDATE students SET last=?, first=?, mi=?, address=?, course=?, yr=?, status=?, enrol=?, birthday=?, email=?, age=?, gender=?, guardianName=?, guardianContact=? WHERE id=?`, 
            [last, first, mi, address, course, yr, status, enrol, birthday, email, age, gender, guardianName, guardianContact, id], (e) => {
                if (e) return res.status(400).json({ error: e.message });
                db.run(`UPDATE users SET name=?, section=? WHERE username=?`, [fullName, yr, id]);
                
                // AUTO ENROLL: Check kung may bagong section na dapat i-enroll
                db.all("SELECT * FROM courses WHERE section = ?", [section], (errC, coursesInSec) => {
                    if (errC || !coursesInSec) return res.json({ message: "Updated" });
                    
                    db.all("SELECT * FROM enrollments WHERE studentId = ?", [id], (errE, existing) => {
                        const existingCodes = (existing || []).map(e => e.courseCode);
                        const insertEnroll = db.prepare(`INSERT INTO enrollments (studentId, courseCode, section, term) VALUES (?, ?, ?, ?)`);
                        
                        coursesInSec.forEach(c => {
                            if (!existingCodes.includes(c.code)) {
                                insertEnroll.run(id, c.code, section, '1st Semester');
                            }
                        });
                        insertEnroll.finalize(() => res.json({ message: "Updated & auto-enrolled" }));
                    });
                });
            });
        } else {
            db.get(`SELECT COUNT(*) as count FROM students WHERE yr LIKE ? AND yr LIKE ?`, [`${gradeLevel}%`, `%Sec ${section}%`], (errCount, countRes) => {
                if (errCount) return res.status(500).json({ error: "DB Error" });

                const maxCapacity = 30;

                if (countRes.count >= maxCapacity) {
                    return res.status(400).json({ error: `Cannot add student. Section ${section} is already full (${countRes.count}/${maxCapacity} students).` });
                }

                db.run(`INSERT INTO students (id, last, first, mi, address, course, yr, status, enrol, username, password, birthday, email, age, gender, guardianName, guardianContact) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, 
                [id, last, first, mi, address, course, yr, status, enrol, id, generatedPass, birthday, email, age, gender, guardianName, guardianContact], async (e) => {
                    if (e) return res.status(400).json({ error: e.message });
                    
                    db.run(`INSERT INTO users (username, password, name, role, section, email) VALUES (?,?,?,'Student',?,?)`, [id, generatedPass, fullName, yr, email], async () => {
                        // AUTO ENROLL NEW STUDENT
                        db.all("SELECT * FROM courses WHERE section = ?", [section], (errC, coursesInSec) => {
                            if (!errC && coursesInSec) {
                                const insertEnroll = db.prepare(`INSERT INTO enrollments (studentId, courseCode, section, term) VALUES (?, ?, ?, ?)`);
                                coursesInSec.forEach(c => insertEnroll.run(id, c.code, section, '1st Semester'));
                                insertEnroll.finalize();
                            }
                        });

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
            });
        }
    });
});

app.post('/api/students/status', (req, res) => {
    const { id, status } = req.body;
    db.run(`UPDATE students SET status = ? WHERE id = ?`, [status, id], (e) => {
        if(e) return res.status(500).json({ error: e.message });
        res.json({ message: "Status updated" });
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
app.get('/api/schedules/:gradeLevel/:section', (req, res) => {
    db.all(`SELECT s.*, c.name AS courseName, c.subjectTeacher AS teacherName FROM schedules s JOIN courses c ON s.courseCode = c.code WHERE c.gradeLevel = ? AND s.section = ?`, [req.params.gradeLevel, req.params.section], (err, rows) => {
        res.json(err ? [] : rows);
    });
});

app.get('/api/attendance/:courseCode/:section/:date', (req, res) => db.all(`SELECT * FROM attendance WHERE courseCode = ? AND section = ? AND date = ?`, [req.params.courseCode, req.params.section, req.params.date], (err, rows) => res.json(err ? [] : rows)));
app.post('/api/attendance', (req, res) => {
    const { courseCode, section, studentId, date, status } = req.body;
    db.run(`INSERT INTO attendance (courseCode, section, studentId, date, status) VALUES (?,?,?,?,?) ON CONFLICT(courseCode, section, studentId, date) DO UPDATE SET status=excluded.status`, [courseCode, section, studentId, date, status], (e) => {
        if(e) return res.status(500).json({ error: e.message });

        if (status === 'Absent') {
            db.get(`SELECT COUNT(*) as absences FROM attendance WHERE studentId = ? AND courseCode = ? AND status = 'Absent'`, [studentId, courseCode], (err, row) => {
                if (row && row.absences >= 3) {
                    db.run(`UPDATE students SET status = 'Inactive' WHERE id = ?`, [studentId]);
                }
            });
        }
        res.json({ message: "Recorded" });
    });
});

app.get('/api/attendance/history/:section', (req, res) => {
    const sectionStr = req.params.section;
    db.all(`SELECT a.*, s.first, s.last, c.name as courseName, c.gradeLevel 
            FROM attendance a 
            JOIN students s ON a.studentId = s.id 
            JOIN courses c ON a.courseCode = c.code 
            WHERE a.section = ? 
            ORDER BY a.date DESC, a.courseCode`, [sectionStr], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/api/student/records/:studentId', (req, res) => db.all("SELECT * FROM student_records WHERE studentId = ? ORDER BY gradeLevel", [req.params.studentId], (err, rows) => res.json(err ? [] : rows)));

app.listen(port, () => console.log(`✅ Server running on port ${port}`));