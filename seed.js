const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // 1. DROP TABLES
    db.run("DROP TABLE IF EXISTS attendance");
    db.run("DROP TABLE IF EXISTS student_records");
    db.run("DROP TABLE IF EXISTS enrollments");
    db.run("DROP TABLE IF EXISTS students");
    db.run("DROP TABLE IF EXISTS users");
    db.run("DROP TABLE IF EXISTS courses");
    db.run("DROP TABLE IF EXISTS grades");
    db.run("DROP TABLE IF EXISTS schedules");

    // 2. CREATE TABLES
    db.run(`CREATE TABLE users (username TEXT PRIMARY KEY, password TEXT, name TEXT, role TEXT, section TEXT)`);
    db.run(`CREATE TABLE students (id TEXT PRIMARY KEY, last TEXT, first TEXT, mi TEXT, address TEXT, course TEXT, yr TEXT, status TEXT, enrol TEXT, username TEXT, password TEXT, birthday TEXT)`);
    db.run(`CREATE TABLE courses (code TEXT PRIMARY KEY, name TEXT, gradeLevel TEXT, section TEXT, capacity INTEGER, adviser TEXT, subjectTeacher TEXT, status TEXT)`);
    db.run(`CREATE TABLE enrollments (id INTEGER PRIMARY KEY AUTOINCREMENT, studentId TEXT, courseCode TEXT, section TEXT, term TEXT)`);
    db.run(`CREATE TABLE grades (id INTEGER PRIMARY KEY AUTOINCREMENT, studentId TEXT, courseCode TEXT, courseName TEXT, grade REAL, term TEXT)`);
    db.run(`CREATE TABLE schedules (id INTEGER PRIMARY KEY AUTOINCREMENT, courseCode TEXT, section TEXT, day TEXT, startTime TEXT, endTime TEXT, UNIQUE(courseCode, section, day, startTime))`);
    db.run(`CREATE TABLE attendance (id INTEGER PRIMARY KEY AUTOINCREMENT, courseCode TEXT, section TEXT, studentId TEXT, date TEXT, status TEXT, UNIQUE(courseCode, section, studentId, date))`);
    db.run(`CREATE TABLE student_records (id INTEGER PRIMARY KEY AUTOINCREMENT, studentId TEXT, gradeLevel TEXT, schoolYear TEXT, subject TEXT, grade REAL, status TEXT, remarks TEXT)`);

    // ==========================================
    // 3. INSERT USERS (Teachers and Admin)
    // ==========================================
    const insertUser = db.prepare(`INSERT INTO users (username, password, name, role, section) VALUES (?, ?, ?, ?, ?)`);
    
    insertUser.run('admin', 'admin123', 'Admin User', 'Admin', '');

    // 20 Teachers for Elem/JHS, 10 Teachers for SHS para pantay-pantay
    const teachers = [
        // Elem & JHS Teachers
        'T. John Emmanuel S.', 'T. Emily Bronte', 'T. Alan Turing', 'T. Liza Soberano', 'T. Andres Bonifacio',
        'T. Enrique Gil', 'T. Kathryn Bernardo', 'T. Marie Curie', 'T. Daniel Padilla', 'T. Angel Locsin',
        'T. Coco Martin', 'T. Francisco Balagtas', 'T. Gabriela Silang', 'T. Jane C. Villa', 'T. Warren Buffet',
        'T. Michael Smith', 'T. Sarah Johnson', 'T. David Williams', 'T. Mary Brown', 'T. James Davis',
        // SHS Teachers (Specialized)
        'T. Smith V. Cruz', 'T. Albert Einstein', 'T. Isaac Newton', 'T. Charles Darwin', 'T. Nikola Tesla',
        'T. Rosalind Franklin', 'T. Stephen Hawking', 'T. Ada Lovelace', 'T. Galileo Galilei', 'T. Aristotle'
    ];

    teachers.forEach((name, i) => {
        const firstName = name.split(' ')[1] || 'Teacher';
        const username = `t${firstName.toLowerCase()}${i}`;
        const pass = `${firstName.toLowerCase()}123`;
        insertUser.run(username, pass, name, 'Faculty', '');
    });

    // Students
    const insertStudent = db.prepare(`INSERT INTO students (id, last, first, mi, address, course, yr, status, enrol, username, password, birthday) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const students = [
        ['2023-0006', 'Dela Cruz', 'Juan', 'A', 'Mariveles, Bataan', 'Elem', 'Grade 4', 'Active', 'Enrolled', 'juandc', 'juan123', '2017-05-14'],
        ['2026-01523', 'Reyes', 'Maria', 'B', 'Limay, Bataan', 'SHS', 'Grade 11 - STEM', 'Active', 'Enrolled', 'mariar', 'maria123', '2010-08-22'],
        ['2026-0163', 'Santos', 'Pedro', 'C', 'Mariveles, Bataan', 'Kinder', 'Kindergarten', 'Active', 'Enrolled', 'pedros', 'pedro123', '2021-02-10'],
        ['2026', 'Reyes', 'Katie Mae', '', 'Mariveles, Bataan', 'High School', 'Grade 7', 'Inactive', 'Enrolled', 'katiemaer', 'katie123', '2014-11-05'],
        ['2026-0011', 'Manuel', 'Alexandra', 'B.', 'Mariveles, Bataan', 'SHS', 'Grade 12 - STEM', 'Active', 'Enrolled', 'alexandram', 'alexandra123', '2009-03-30'],
    ];
    students.forEach(s => insertStudent.run(s));

    // ==========================================
    // 4. GENERATE COURSES (2 Sections per Grade)
    // ==========================================
    const insertCourse = db.prepare(`INSERT INTO courses (code, name, gradeLevel, section, capacity, adviser, subjectTeacher, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    const insertSchedule = db.prepare(`INSERT INTO schedules (courseCode, section, day, startTime, endTime) VALUES (?, ?, ?, ?, ?)`);

    // Subject Config per Grade Level
    const gradeConfigs = [
        { level: 'Kinder', subjects: [['VAL', 'Values Ed'], ['PHY', 'Physical Health'], ['SOC', 'Socio-Emotional'], ['LAN', 'Language'], ['MAT', 'Math & Science']], capacity: 20 },
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
        { level: 'Grade 11 - STEM - 1st Sem', subjects: [['ORAL', 'Oral Communication'], ['KOMU', 'Komunikasyon'], ['GENM', 'General Math'], ['EALS', 'Earth & Life Science'], ['PERD', 'Personal Dev'], ['EMPW', 'Empowerment Tech'], ['PE11', 'PE & Health 1'], ['PREC', 'Pre-Calculus'], ['CHEM1', 'Gen Chem 1']], capacity: 40 },
        { level: 'Grade 11 - STEM - 2nd Sem', subjects: [['READ', 'Reading & Writing'], ['PAGB', 'Pagbasa'], ['STAT', 'Statistics'], ['PHYS', 'Physical Science'], ['PE11B', 'PE & Health 2'], ['PR1', 'Practical Research 1'], ['BASC', 'Basic Calculus'], ['CHEM2', 'Gen Chem 2']], capacity: 40 },
        { level: 'Grade 12 - STEM - 1st Sem', subjects: [['21ST', '21st Century Lit'], ['UCSP', 'UCSP'], ['PHIL', 'Philosophy'], ['PE12', 'PE & Health 3'], ['EAPP', 'EAPP'], ['PR2', 'Practical Research 2'], ['CPAR', 'Contemporary Arts'], ['MIL', 'Media & Info Lit'], ['PHY1', 'Gen Physics 1'], ['BIO1', 'Gen Biology 1']], capacity: 40 },
        { level: 'Grade 12 - STEM - 2nd Sem', subjects: [['PAGS', 'Pagsulat'], ['PE12B', 'PE & Health 4'], ['ENTR', 'Entrepreneurship'], ['INQ', 'Inquiries'], ['PHY2', 'Gen Physics 2'], ['BIO2', 'Gen Biology 2'], ['STEMW', 'Work Immersion']], capacity: 40 }
    ];

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const timeSlots = [
        ['07:00', '08:00'], ['08:00', '09:00'], ['09:00', '10:00'], 
        ['10:00', '11:00'], ['13:00', '14:00'], ['14:00', '15:00'], ['15:00', '16:00']
    ];

    let teacherIndex = 0;

    gradeConfigs.forEach(config => {
        // 2 Sections per Grade Level
        for (let sec = 1; sec <= 2; sec++) {
            const sectionStr = sec.toString();
            const gradePrefix = config.level.replace(/[^a-zA-Z0-9]/g, '').toUpperCase(); // e.g., GRADE7

            // 1 Advisory Teacher per section
            const advisoryTeacher = teachers[teacherIndex % teachers.length];
            teacherIndex++;

            let timeIndex = 0;

            config.subjects.forEach((sub, idx) => {
                const subCode = sub[0];
                const subName = sub[1];
                const courseCode = `${subCode}-${gradePrefix}-${sec}`;

                // Distribute subject teachers evenly (Round Robin style)
                // We skip the advisory teacher to give others a chance, or just cycle through all
                const subjectTeacher = teachers[(teacherIndex + idx) % teachers.length];

                insertCourse.run(
                    courseCode, `${subName} (${config.level})`, config.level, sectionStr, 
                    config.capacity, advisoryTeacher, subjectTeacher, 'Open'
                );

                // Schedule (Round Robin para hindi mag-overlap per section)
                const day = days[timeIndex % 5];
                const time = timeSlots[Math.floor(timeIndex / 5) % timeSlots.length];
                insertSchedule.run(courseCode, sectionStr, day, time[0], time[1]);
                
                timeIndex++;
            });
        }
    });

    insertUser.finalize();
    insertStudent.finalize();
    insertCourse.finalize();
    insertSchedule.finalize();

    // ==========================================
    // 5. SAMPLE HISTORICAL RECORDS
    // ==========================================
    const insertRecord = db.prepare(`INSERT INTO student_records (studentId, gradeLevel, schoolYear, subject, grade, status, remarks) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    const records = [
        ['2023-0006','Grade 1','2020-2021','Language',90,'Passed','Good'],
        ['2023-0006','Grade 2','2021-2022','English',89,'Passed','Good'],
        ['2023-0006','Grade 3','2022-2023','Mathematics',94,'Passed','Excellent']
    ];
    records.forEach(r => insertRecord.run(r));
    insertRecord.finalize();

    console.log("✅ Database setup complete. Generated subjects, 2 sections per grade, and distributed teachers correctly.");
});

db.close();