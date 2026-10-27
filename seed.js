const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // ===== DROP TABLES (NO BILLING/PAYMENTS) =====
    db.run("DROP TABLE IF EXISTS attendance");
    db.run("DROP TABLE IF EXISTS student_records");
    db.run("DROP TABLE IF EXISTS enrollments");
    db.run("DROP TABLE IF EXISTS students");
    db.run("DROP TABLE IF EXISTS users");
    db.run("DROP TABLE IF EXISTS courses");
    db.run("DROP TABLE IF EXISTS grades");
    db.run("DROP TABLE IF EXISTS schedules");

    // ===== CREATE TABLES (NO BILLING/PAYMENTS) =====
    db.run(`CREATE TABLE users (
        username TEXT PRIMARY KEY, password TEXT, name TEXT, role TEXT, section TEXT
    )`);

    db.run(`CREATE TABLE students (
        id TEXT PRIMARY KEY, last TEXT, first TEXT, mi TEXT, address TEXT,
        course TEXT, yr TEXT, status TEXT, enrol TEXT, username TEXT, password TEXT, birthday TEXT
    )`);

    db.run(`CREATE TABLE courses (
        code TEXT PRIMARY KEY, name TEXT, gradeLevel TEXT, section TEXT,
        capacity INTEGER, adviser TEXT, status TEXT
    )`);

    db.run(`CREATE TABLE enrollments (
        id INTEGER PRIMARY KEY AUTOINCREMENT, studentId TEXT, courseCode TEXT, section TEXT, term TEXT
    )`);

    db.run(`CREATE TABLE grades (
        id INTEGER PRIMARY KEY AUTOINCREMENT, studentId TEXT, courseCode TEXT,
        courseName TEXT, grade REAL, term TEXT
    )`);

    db.run(`CREATE TABLE schedules (
        id INTEGER PRIMARY KEY AUTOINCREMENT, courseCode TEXT, section TEXT,
        day TEXT, startTime TEXT, endTime TEXT,
        UNIQUE(courseCode, section, day, startTime)
    )`);

    db.run(`CREATE TABLE attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT, courseCode TEXT, section TEXT,
        studentId TEXT, date TEXT, status TEXT,
        UNIQUE(courseCode, section, studentId, date)
    )`);

    db.run(`CREATE TABLE student_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT, studentId TEXT, gradeLevel TEXT,
        schoolYear TEXT, subject TEXT, grade REAL, status TEXT, remarks TEXT
    )`);

    // ===== INSERT USERS =====
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

    // ===== INSERT STUDENTS =====
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

    // ===== INSERT COURSES =====
    const insertCourse = db.prepare(`INSERT INTO courses (code, name, gradeLevel, section, capacity, adviser, status) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    const courses = [
        ['KIN-VAL', 'Values Education', 'Kinder', '1', 20, 'T. Mary C. Poppins', 'Open'],
        ['KIN-PHY', 'Physical Health & Motor Dev', 'Kinder', '1', 20, 'T. Mary C. Poppins', 'Open'],
        ['KIN-SOC', 'Socio-Emotional Dev', 'Kinder', '1', 20, 'T. Mary C. Poppins', 'Open'],
        ['KIN-LAN', 'Language & Literacy', 'Kinder', '1', 20, 'T. Mary C. Poppins', 'Open'],
        ['KIN-MAT', 'Mathematics & Science', 'Kinder', '1', 20, 'T. Mary C. Poppins', 'Open'],
        ['LANG1-1', 'Language', 'Grade 1', '1', 30, 'T. John Emmanuel S.', 'Open'],
        ['READ1-1', 'Reading & Literacy', 'Grade 1', '1', 30, 'T. Emily Bronte', 'Open'],
        ['MATH1-1', 'Mathematics', 'Grade 1', '1', 30, 'T. Alan Turing', 'Open'],
        ['GMRC1-1', 'Good Manners & Right Conduct', 'Grade 1', '1', 30, 'T. Liza Soberano', 'Open'],
        ['MAK1-1', 'Makabansa', 'Grade 1', '1', 30, 'T. Andres Bonifacio', 'Open'],
        ['ENG2-1', 'English', 'Grade 2', '1', 30, 'T. Emily Bronte', 'Open'],
        ['FIL2-1', 'Filipino', 'Grade 2', '1', 30, 'T. Enrique Gil', 'Open'],
        ['MATH2-1', 'Mathematics', 'Grade 2', '1', 30, 'T. Alan Turing', 'Open'],
        ['GMRC2-1', 'Good Manners & Right Conduct', 'Grade 2', '1', 30, 'T. Liza Soberano', 'Open'],
        ['MAK2-1', 'Makabansa', 'Grade 2', '1', 30, 'T. Andres Bonifacio', 'Open'],
        ['ENG3-1', 'English', 'Grade 3', '1', 30, 'T. Emily Bronte', 'Open'],
        ['FIL3-1', 'Filipino', 'Grade 3', '1', 30, 'T. Kathryn Bernardo', 'Open'],
        ['MATH3-1', 'Mathematics', 'Grade 3', '1', 30, 'T. Alan Turing', 'Open'],
        ['SCI3-1', 'Science', 'Grade 3', '1', 30, 'T. Marie Curie', 'Open'],
        ['GMRC3-1', 'Good Manners & Right Conduct', 'Grade 3', '1', 30, 'T. Liza Soberano', 'Open'],
        ['MAK3-1', 'Makabansa', 'Grade 3', '1', 30, 'T. Andres Bonifacio', 'Open'],
        ['ENG4-1', 'English 4', 'Grade 4', '1', 30, 'T. Emily Bronte', 'Open'],
        ['FIL4-1', 'Filipino 4', 'Grade 4', '1', 30, 'T. Daniel Padilla', 'Open'],
        ['MATH4-1', 'Mathematics 4', 'Grade 4', '1', 30, 'T. Alan Turing', 'Open'],
        ['SCI4-1', 'Science 4', 'Grade 4', '1', 30, 'T. Marie Curie', 'Open'],
        ['AP4-1', 'Araling Panlipunan 4', 'Grade 4', '1', 30, 'T. Andres Bonifacio', 'Open'],
        ['ESP4-1', 'Values Education 4', 'Grade 4', '1', 30, 'T. Liza Soberano', 'Open'],
        ['MAPEH4-1', 'MAPEH 4', 'Grade 4', '1', 30, 'T. Francisco Balagtas', 'Open'],
        ['EPP4-1', 'EPP 4', 'Grade 4', '1', 30, 'T. Gabriela Silang', 'Open'],
        ['ENG5-1', 'English 5', 'Grade 5', '1', 30, 'T. Emily Bronte', 'Open'],
        ['FIL5-1', 'Filipino 5', 'Grade 5', '1', 30, 'T. Angel Locsin', 'Open'],
        ['MATH5-1', 'Mathematics 5', 'Grade 5', '1', 30, 'T. Alan Turing', 'Open'],
        ['SCI5-1', 'Science 5', 'Grade 5', '1', 30, 'T. Marie Curie', 'Open'],
        ['AP5-1', 'Araling Panlipunan 5', 'Grade 5', '1', 30, 'T. Andres Bonifacio', 'Open'],
        ['ESP5-1', 'Values Education 5', 'Grade 5', '1', 30, 'T. Liza Soberano', 'Open'],
        ['MAPEH5-1', 'MAPEH 5', 'Grade 5', '1', 30, 'T. Francisco Balagtas', 'Open'],
        ['EPP5-1', 'EPP 5', 'Grade 5', '1', 30, 'T. Gabriela Silang', 'Open'],
        ['ENG6-1', 'English 6', 'Grade 6', '1', 30, 'T. Emily Bronte', 'Open'],
        ['FIL6-1', 'Filipino 6', 'Grade 6', '1', 30, 'T. Coco Martin', 'Open'],
        ['MATH6-1', 'Mathematics 6', 'Grade 6', '1', 30, 'T. Alan Turing', 'Open'],
        ['SCI6-1', 'Science 6', 'Grade 6', '1', 30, 'T. Marie Curie', 'Open'],
        ['AP6-1', 'Araling Panlipunan 6', 'Grade 6', '1', 30, 'T. Andres Bonifacio', 'Open'],
        ['ESP6-1', 'Values Education 6', 'Grade 6', '1', 30, 'T. Liza Soberano', 'Open'],
        ['MAPEH6-1', 'MAPEH 6', 'Grade 6', '1', 30, 'T. Francisco Balagtas', 'Open'],
        ['TLE6-1', 'TLE 6', 'Grade 6', '1', 30, 'T. Gabriela Silang', 'Open'],
        ['ENG7-1', 'English 7', 'Grade 7', '1', 35, 'T. Emily Bronte', 'Open'],
        ['FIL7-1', 'Filipino 7', 'Grade 7', '1', 35, 'T. Enrique Gil', 'Open'],
        ['MATH7-1', 'Mathematics 7', 'Grade 7', '1', 35, 'T. Jane C. Villa', 'Open'],
        ['SCI7-1', 'Science 7', 'Grade 7', '1', 35, 'T. Marie Curie', 'Open'],
        ['AP7-1', 'Araling Panlipunan 7', 'Grade 7', '1', 35, 'T. Andres Bonifacio', 'Open'],
        ['ESP7-1', 'Values Education 7', 'Grade 7', '1', 35, 'T. Liza Soberano', 'Open'],
        ['MAPEH7-1', 'MAPEH 7', 'Grade 7', '1', 35, 'T. Francisco Balagtas', 'Open'],
        ['TLE7-1', 'TLE 7', 'Grade 7', '1', 35, 'T. Gabriela Silang', 'Open'],
        ['ENG8-1', 'English 8', 'Grade 8', '1', 35, 'T. Emily Bronte', 'Open'],
        ['FIL8-1', 'Filipino 8', 'Grade 8', '1', 35, 'T. Kathryn Bernardo', 'Open'],
        ['MATH8-1', 'Mathematics 8', 'Grade 8', '1', 35, 'T. Alan Turing', 'Open'],
        ['SCI8-1', 'Science 8', 'Grade 8', '1', 35, 'T. Marie Curie', 'Open'],
        ['AP8-1', 'Araling Panlipunan 8', 'Grade 8', '1', 35, 'T. Andres Bonifacio', 'Open'],
        ['ESP8-1', 'Values Education 8', 'Grade 8', '1', 35, 'T. Liza Soberano', 'Open'],
        ['MAPEH8-1', 'MAPEH 8', 'Grade 8', '1', 35, 'T. Francisco Balagtas', 'Open'],
        ['TLE8-1', 'TLE 8', 'Grade 8', '1', 35, 'T. Gabriela Silang', 'Open'],
        ['ENG9-1', 'English 9', 'Grade 9', '1', 35, 'T. Emily Bronte', 'Open'],
        ['FIL9-1', 'Filipino 9', 'Grade 9', '1', 35, 'T. Daniel Padilla', 'Open'],
        ['MATH9-1', 'Mathematics 9', 'Grade 9', '1', 35, 'T. Alan Turing', 'Open'],
        ['SCI9-1', 'Science 9', 'Grade 9', '1', 35, 'T. Marie Curie', 'Open'],
        ['AP9-1', 'Araling Panlipunan 9', 'Grade 9', '1', 35, 'T. Andres Bonifacio', 'Open'],
        ['ESP9-1', 'Values Education 9', 'Grade 9', '1', 35, 'T. Liza Soberano', 'Open'],
        ['MAPEH9-1', 'MAPEH 9', 'Grade 9', '1', 35, 'T. Francisco Balagtas', 'Open'],
        ['TLE9-1', 'TLE 9', 'Grade 9', '1', 35, 'T. Gabriela Silang', 'Open'],
        ['ENG10-1', 'English 10', 'Grade 10', '1', 35, 'T. Emily Bronte', 'Open'],
        ['FIL10-1', 'Filipino 10', 'Grade 10', '1', 35, 'T. Angel Locsin', 'Open'],
        ['MATH10-1', 'Mathematics 10', 'Grade 10', '1', 35, 'T. Alan Turing', 'Open'],
        ['SCI10-1', 'Science 10', 'Grade 10', '1', 35, 'T. Marie Curie', 'Open'],
        ['AP10-1', 'Araling Panlipunan 10', 'Grade 10', '1', 35, 'T. Andres Bonifacio', 'Open'],
        ['ESP10-1', 'Values Education 10', 'Grade 10', '1', 35, 'T. Liza Soberano', 'Open'],
        ['MAPEH10-1', 'MAPEH 10', 'Grade 10', '1', 35, 'T. Francisco Balagtas', 'Open'],
        ['TLE10-1', 'TLE 10', 'Grade 10', '1', 35, 'T. Gabriela Silang', 'Open'],
        ['ORAL11-1', 'Oral Communication', 'Grade 11 - STEM - 1st Sem', '1', 40, 'T. Emily Bronte', 'Open'],
        ['KOMU11-1', 'Komunikasyon at Pananaliksik', 'Grade 11 - STEM - 1st Sem', '1', 40, 'T. Coco Martin', 'Open'],
        ['GENM11-1', 'General Mathematics', 'Grade 11 - STEM - 1st Sem', '1', 40, 'T. Smith V. Cruz', 'Open'],
        ['EALS11-1', 'Earth and Life Science', 'Grade 11 - STEM - 1st Sem', '1', 40, 'T. Marie Curie', 'Open'],
        ['PERD11-1', 'Personal Development', 'Grade 11 - STEM - 1st Sem', '1', 40, 'T. Liza Soberano', 'Open'],
        ['EMPW11-1', 'Empowerment Technologies', 'Grade 11 - STEM - 1st Sem', '1', 40, 'T. Alan Turing', 'Open'],
        ['PE111-1', 'PE and Health 1', 'Grade 11 - STEM - 1st Sem', '1', 40, 'T. Francisco Balagtas', 'Open'],
        ['PREC11-1', 'Pre-Calculus (STEM)', 'Grade 11 - STEM - 1st Sem', '1', 40, 'T. Alan Turing', 'Open'],
        ['CHEM111-1', 'General Chemistry 1 (STEM)', 'Grade 11 - STEM - 1st Sem', '1', 40, 'T. Marie Curie', 'Open'],
        ['21ST12-1', '21st Century Literature', 'Grade 12 - STEM - 1st Sem', '1', 40, 'T. Emily Bronte', 'Open'],
        ['UCSP12-1', 'Understanding Culture & Politics', 'Grade 12 - STEM - 1st Sem', '1', 40, 'T. Andres Bonifacio', 'Open'],
        ['PHIL12-1', 'Philosophy of the Human Person', 'Grade 12 - STEM - 1st Sem', '1', 40, 'T. Liza Soberano', 'Open'],
        ['PE312-1', 'PE and Health 3', 'Grade 12 - STEM - 1st Sem', '1', 40, 'T. Francisco Balagtas', 'Open'],
        ['EAPP12-1', 'English for Academic Purposes', 'Grade 12 - STEM - 1st Sem', '1', 40, 'T. Emily Bronte', 'Open'],
        ['PR212-1', 'Practical Research 2', 'Grade 12 - STEM - 1st Sem', '1', 40, 'T. Jane C. Villa', 'Open'],
        ['CPAR12-1', 'Contemporary Arts', 'Grade 12 - STEM - 1st Sem', '1', 40, 'T. Francisco Balagtas', 'Open'],
        ['MIL12-1', 'Media and Information Literacy', 'Grade 12 - STEM - 1st Sem', '1', 40, 'T. Alan Turing', 'Open'],
        ['PHY112-1', 'General Physics 1 (STEM)', 'Grade 12 - STEM - 1st Sem', '1', 40, 'T. Marie Curie', 'Open'],
        ['BIO112-1', 'General Biology 1 (STEM)', 'Grade 12 - STEM - 1st Sem', '1', 40, 'T. Marie Curie', 'Open']
    ];
    courses.forEach(c => insertCourse.run(c));
    insertCourse.finalize();

    // ===== INSERT SCHEDULES (No overlaps per section) =====
    const insertSchedule = db.prepare(`INSERT INTO schedules (courseCode, section, day, startTime, endTime) VALUES (?, ?, ?, ?, ?)`);
    const schedules = [
        // Kinder
        ['KIN-VAL','1','Monday','07:00','07:30'],['KIN-PHY','1','Monday','07:30','08:00'],
        ['KIN-SOC','1','Tuesday','07:00','07:30'],['KIN-LAN','1','Wednesday','07:00','07:30'],
        ['KIN-MAT','1','Thursday','07:00','07:30'],
        // Grade 1
        ['LANG1-1','1','Monday','07:00','08:00'],['READ1-1','1','Monday','08:00','09:00'],
        ['MATH1-1','1','Tuesday','07:00','08:00'],['GMRC1-1','1','Wednesday','07:00','08:00'],
        ['MAK1-1','1','Thursday','07:00','08:00'],
        // Grade 2
        ['ENG2-1','1','Monday','07:00','08:00'],['FIL2-1','1','Monday','08:00','09:00'],
        ['MATH2-1','1','Tuesday','07:00','08:00'],['GMRC2-1','1','Wednesday','07:00','08:00'],
        ['MAK2-1','1','Thursday','07:00','08:00'],
        // Grade 3
        ['ENG3-1','1','Monday','07:00','08:00'],['FIL3-1','1','Monday','08:00','09:00'],
        ['MATH3-1','1','Tuesday','07:00','08:00'],['SCI3-1','1','Tuesday','08:00','09:00'],
        ['GMRC3-1','1','Wednesday','07:00','08:00'],['MAK3-1','1','Thursday','07:00','08:00'],
        // Grade 4
        ['ENG4-1','1','Monday','07:00','08:00'],['FIL4-1','1','Monday','08:00','09:00'],
        ['MATH4-1','1','Tuesday','07:00','08:00'],['SCI4-1','1','Tuesday','08:00','09:00'],
        ['AP4-1','1','Wednesday','07:00','08:00'],['ESP4-1','1','Wednesday','08:00','09:00'],
        ['MAPEH4-1','1','Thursday','07:00','08:00'],['EPP4-1','1','Thursday','08:00','09:00'],
        // Grade 5
        ['ENG5-1','1','Monday','07:00','08:00'],['FIL5-1','1','Monday','08:00','09:00'],
        ['MATH5-1','1','Tuesday','07:00','08:00'],['SCI5-1','1','Tuesday','08:00','09:00'],
        ['AP5-1','1','Wednesday','07:00','08:00'],['ESP5-1','1','Wednesday','08:00','09:00'],
        ['MAPEH5-1','1','Thursday','07:00','08:00'],['EPP5-1','1','Thursday','08:00','09:00'],
        // Grade 6
        ['ENG6-1','1','Monday','07:00','08:00'],['FIL6-1','1','Monday','08:00','09:00'],
        ['MATH6-1','1','Tuesday','07:00','08:00'],['SCI6-1','1','Tuesday','08:00','09:00'],
        ['AP6-1','1','Wednesday','07:00','08:00'],['ESP6-1','1','Wednesday','08:00','09:00'],
        ['MAPEH6-1','1','Thursday','07:00','08:00'],['TLE6-1','1','Thursday','08:00','09:00'],
        // Grade 7
        ['ENG7-1','1','Monday','07:00','08:00'],['FIL7-1','1','Monday','08:00','09:00'],
        ['MATH7-1','1','Tuesday','07:00','08:00'],['SCI7-1','1','Tuesday','08:00','09:00'],
        ['AP7-1','1','Wednesday','07:00','08:00'],['ESP7-1','1','Wednesday','08:00','09:00'],
        ['MAPEH7-1','1','Thursday','07:00','08:00'],['TLE7-1','1','Thursday','08:00','09:00'],
        // Grade 8
        ['ENG8-1','1','Monday','07:00','08:00'],['FIL8-1','1','Monday','08:00','09:00'],
        ['MATH8-1','1','Tuesday','07:00','08:00'],['SCI8-1','1','Tuesday','08:00','09:00'],
        ['AP8-1','1','Wednesday','07:00','08:00'],['ESP8-1','1','Wednesday','08:00','09:00'],
        ['MAPEH8-1','1','Thursday','07:00','08:00'],['TLE8-1','1','Thursday','08:00','09:00'],
        // Grade 9
        ['ENG9-1','1','Monday','07:00','08:00'],['FIL9-1','1','Monday','08:00','09:00'],
        ['MATH9-1','1','Tuesday','07:00','08:00'],['SCI9-1','1','Tuesday','08:00','09:00'],
        ['AP9-1','1','Wednesday','07:00','08:00'],['ESP9-1','1','Wednesday','08:00','09:00'],
        ['MAPEH9-1','1','Thursday','07:00','08:00'],['TLE9-1','1','Thursday','08:00','09:00'],
        // Grade 10
        ['ENG10-1','1','Monday','07:00','08:00'],['FIL10-1','1','Monday','08:00','09:00'],
        ['MATH10-1','1','Tuesday','07:00','08:00'],['SCI10-1','1','Tuesday','08:00','09:00'],
        ['AP10-1','1','Wednesday','07:00','08:00'],['ESP10-1','1','Wednesday','08:00','09:00'],
        ['MAPEH10-1','1','Thursday','07:00','08:00'],['TLE10-1','1','Thursday','08:00','09:00'],
        // Grade 11 STEM
        ['ORAL11-1','1','Monday','07:00','08:00'],['KOMU11-1','1','Monday','08:00','09:00'],
        ['GENM11-1','1','Tuesday','07:00','08:00'],['EALS11-1','1','Tuesday','08:00','09:00'],
        ['PERD11-1','1','Wednesday','07:00','08:00'],['EMPW11-1','1','Wednesday','08:00','09:00'],
        ['PE111-1','1','Thursday','07:00','08:00'],['PREC11-1','1','Thursday','08:00','09:00'],
        ['CHEM111-1','1','Friday','07:00','08:00'],
        // Grade 12 STEM
        ['21ST12-1','1','Monday','07:00','08:00'],['UCSP12-1','1','Monday','08:00','09:00'],
        ['PHIL12-1','1','Tuesday','07:00','08:00'],['PE312-1','1','Tuesday','08:00','09:00'],
        ['EAPP12-1','1','Wednesday','07:00','08:00'],['PR212-1','1','Wednesday','08:00','09:00'],
        ['CPAR12-1','1','Thursday','07:00','08:00'],['MIL12-1','1','Thursday','08:00','09:00'],
        ['PHY112-1','1','Friday','07:00','08:00'],['BIO112-1','1','Friday','08:00','09:00']
    ];
    schedules.forEach(s => insertSchedule.run(s));
    insertSchedule.finalize();

    // ===== INSERT SAMPLE STUDENT RECORDS (Historical Grades) =====
    const insertRecord = db.prepare(`INSERT INTO student_records (studentId, gradeLevel, schoolYear, subject, grade, status, remarks) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    // Sample: Juan Dela Cruz (Grade 4) - records from Grade 1 to 3
    const records = [
        ['2023-0006','Grade 1','2020-2021','Language',90,'Passed','Good'],
        ['2023-0006','Grade 1','2020-2021','Reading & Literacy',88,'Passed','Good'],
        ['2023-0006','Grade 1','2020-2021','Mathematics',92,'Passed','Excellent'],
        ['2023-0006','Grade 2','2021-2022','English',89,'Passed','Good'],
        ['2023-0006','Grade 2','2021-2022','Filipino',91,'Passed','Excellent'],
        ['2023-0006','Grade 2','2021-2022','Mathematics',93,'Passed','Excellent'],
        ['2023-0006','Grade 3','2022-2023','English',87,'Passed','Good'],
        ['2023-0006','Grade 3','2022-2023','Filipino',90,'Passed','Good'],
        ['2023-0006','Grade 3','2022-2023','Mathematics',94,'Passed','Excellent'],
        ['2023-0006','Grade 3','2022-2023','Science',91,'Passed','Excellent']
    ];
    records.forEach(r => insertRecord.run(r));
    insertRecord.finalize();

    console.log("✅ Database setup complete (billing removed).");
});

db.close();