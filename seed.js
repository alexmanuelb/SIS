const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // 1. Clear existing data from tables
    db.run("DELETE FROM enrollments");
    db.run("DELETE FROM students");
    db.run("DELETE FROM users");
    db.run("DELETE FROM courses");

    // 2. Insert ALL Users (Teachers AND Students)
    const insertUser = db.prepare(
        `INSERT INTO users (username, password, name, role, section) VALUES (?, ?, ?, ?, ?)`
    );

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

        // --- STUDENTS ---
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

    // 3. Insert the Students
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

    // 4. Insert all the Courses
    const insertCourse = db.prepare(`INSERT INTO courses (code, name, gradeLevel, section, capacity, adviser, status) VALUES (?, ?, ?, ?, ?, ?, ?)`);

    const courses = [
        // ==========================================
        // KINDERGARTEN (1 Section Only)
        // ==========================================
        ['KIN-VAL', 'Values Education', 'Kinder', '1', 20, 'T. Mary C. Poppins', 'Open'],
        ['KIN-PHY', 'Physical Health & Motor Dev', 'Kinder', '1', 20, 'T. Mary C. Poppins', 'Open'],
        ['KIN-SOC', 'Socio-Emotional Dev', 'Kinder', '1', 20, 'T. Mary C. Poppins', 'Open'],
        ['KIN-LAN', 'Language & Literacy', 'Kinder', '1', 20, 'T. Mary C. Poppins', 'Open'],
        ['KIN-MAT', 'Mathematics & Science', 'Kinder', '1', 20, 'T. Mary C. Poppins', 'Open'],

        // ==========================================
        // GRADE 1 (No Science - 4 Sections)
        // ==========================================
        ['LANG1-1', 'Language', 'Grade 1', '1', 30, 'T. John Emmanuel S.', 'Open'],
        ['LANG1-2', 'Language', 'Grade 1', '2', 30, 'T. John Emmanuel S.', 'Open'],
        ['LANG1-3', 'Language', 'Grade 1', '3', 30, 'T. John Emmanuel S.', 'Open'],
        ['LANG1-4', 'Language', 'Grade 1', '4', 30, 'T. John Emmanuel S.', 'Open'],

        ['READ1-1', 'Reading & Literacy', 'Grade 1', '1', 30, 'T. Emily Bronte', 'Open'],
        ['READ1-2', 'Reading & Literacy', 'Grade 1', '2', 30, 'T. Emily Bronte', 'Open'],
        ['READ1-3', 'Reading & Literacy', 'Grade 1', '3', 30, 'T. Emily Bronte', 'Open'],
        ['READ1-4', 'Reading & Literacy', 'Grade 1', '4', 30, 'T. Emily Bronte', 'Open'],

        ['MATH1-1', 'Mathematics', 'Grade 1', '1', 30, 'T. Alan Turing', 'Open'],
        ['MATH1-2', 'Mathematics', 'Grade 1', '2', 30, 'T. Alan Turing', 'Open'],
        ['MATH1-3', 'Mathematics', 'Grade 1', '3', 30, 'T. Alan Turing', 'Open'],
        ['MATH1-4', 'Mathematics', 'Grade 1', '4', 30, 'T. Alan Turing', 'Open'],

        ['GMRC1-1', 'Good Manners & Right Conduct', 'Grade 1', '1', 30, 'T. Liza Soberano', 'Open'],
        ['GMRC1-2', 'Good Manners & Right Conduct', 'Grade 1', '2', 30, 'T. Liza Soberano', 'Open'],
        ['GMRC1-3', 'Good Manners & Right Conduct', 'Grade 1', '3', 30, 'T. Liza Soberano', 'Open'],
        ['GMRC1-4', 'Good Manners & Right Conduct', 'Grade 1', '4', 30, 'T. Liza Soberano', 'Open'],

        ['MAK1-1', 'Makabansa', 'Grade 1', '1', 30, 'T. Andres Bonifacio', 'Open'],
        ['MAK1-2', 'Makabansa', 'Grade 1', '2', 30, 'T. Andres Bonifacio', 'Open'],
        ['MAK1-3', 'Makabansa', 'Grade 1', '3', 30, 'T. Andres Bonifacio', 'Open'],
        ['MAK1-4', 'Makabansa', 'Grade 1', '4', 30, 'T. Andres Bonifacio', 'Open'],

        // ==========================================
        // GRADE 2 (No Science - 4 Sections)
        // ==========================================
        ['ENG2-1', 'English', 'Grade 2', '1', 30, 'T. Emily Bronte', 'Open'],
        ['ENG2-2', 'English', 'Grade 2', '2', 30, 'T. Emily Bronte', 'Open'],
        ['ENG2-3', 'English', 'Grade 2', '3', 30, 'T. Emily Bronte', 'Open'],
        ['ENG2-4', 'English', 'Grade 2', '4', 30, 'T. Emily Bronte', 'Open'],

        ['FIL2-1', 'Filipino', 'Grade 2', '1', 30, 'T. Enrique Gil', 'Open'],
        ['FIL2-2', 'Filipino', 'Grade 2', '2', 30, 'T. Enrique Gil', 'Open'],
        ['FIL2-3', 'Filipino', 'Grade 2', '3', 30, 'T. Enrique Gil', 'Open'],
        ['FIL2-4', 'Filipino', 'Grade 2', '4', 30, 'T. Enrique Gil', 'Open'],

        ['MATH2-1', 'Mathematics', 'Grade 2', '1', 30, 'T. Alan Turing', 'Open'],
        ['MATH2-2', 'Mathematics', 'Grade 2', '2', 30, 'T. Alan Turing', 'Open'],
        ['MATH2-3', 'Mathematics', 'Grade 2', '3', 30, 'T. Alan Turing', 'Open'],
        ['MATH2-4', 'Mathematics', 'Grade 2', '4', 30, 'T. Alan Turing', 'Open'],

        ['GMRC2-1', 'Good Manners & Right Conduct', 'Grade 2', '1', 30, 'T. Liza Soberano', 'Open'],
        ['GMRC2-2', 'Good Manners & Right Conduct', 'Grade 2', '2', 30, 'T. Liza Soberano', 'Open'],
        ['GMRC2-3', 'Good Manners & Right Conduct', 'Grade 2', '3', 30, 'T. Liza Soberano', 'Open'],
        ['GMRC2-4', 'Good Manners & Right Conduct', 'Grade 2', '4', 30, 'T. Liza Soberano', 'Open'],

        ['MAK2-1', 'Makabansa', 'Grade 2', '1', 30, 'T. Andres Bonifacio', 'Open'],
        ['MAK2-2', 'Makabansa', 'Grade 2', '2', 30, 'T. Andres Bonifacio', 'Open'],
        ['MAK2-3', 'Makabansa', 'Grade 2', '3', 30, 'T. Andres Bonifacio', 'Open'],
        ['MAK2-4', 'Makabansa', 'Grade 2', '4', 30, 'T. Andres Bonifacio', 'Open'],

        // ==========================================
        // GRADE 3 (4 Sections)
        // ==========================================
        ['ENG3-1', 'English', 'Grade 3', '1', 30, 'T. Emily Bronte', 'Open'],
        ['ENG3-2', 'English', 'Grade 3', '2', 30, 'T. Emily Bronte', 'Open'],
        ['ENG3-3', 'English', 'Grade 3', '3', 30, 'T. Emily Bronte', 'Open'],
        ['ENG3-4', 'English', 'Grade 3', '4', 30, 'T. Emily Bronte', 'Open'],

        ['FIL3-1', 'Filipino', 'Grade 3', '1', 30, 'T. Kathryn Bernardo', 'Open'],
        ['FIL3-2', 'Filipino', 'Grade 3', '2', 30, 'T. Kathryn Bernardo', 'Open'],
        ['FIL3-3', 'Filipino', 'Grade 3', '3', 30, 'T. Kathryn Bernardo', 'Open'],
        ['FIL3-4', 'Filipino', 'Grade 3', '4', 30, 'T. Kathryn Bernardo', 'Open'],

        ['MATH3-1', 'Mathematics', 'Grade 3', '1', 30, 'T. Alan Turing', 'Open'],
        ['MATH3-2', 'Mathematics', 'Grade 3', '2', 30, 'T. Alan Turing', 'Open'],
        ['MATH3-3', 'Mathematics', 'Grade 3', '3', 30, 'T. Alan Turing', 'Open'],
        ['MATH3-4', 'Mathematics', 'Grade 3', '4', 30, 'T. Alan Turing', 'Open'],

        ['SCI3-1', 'Science', 'Grade 3', '1', 30, 'T. Marie Curie', 'Open'],
        ['SCI3-2', 'Science', 'Grade 3', '2', 30, 'T. Marie Curie', 'Open'],
        ['SCI3-3', 'Science', 'Grade 3', '3', 30, 'T. Marie Curie', 'Open'],
        ['SCI3-4', 'Science', 'Grade 3', '4', 30, 'T. Marie Curie', 'Open'],

        ['GMRC3-1', 'Good Manners & Right Conduct', 'Grade 3', '1', 30, 'T. Liza Soberano', 'Open'],
        ['GMRC3-2', 'Good Manners & Right Conduct', 'Grade 3', '2', 30, 'T. Liza Soberano', 'Open'],
        ['GMRC3-3', 'Good Manners & Right Conduct', 'Grade 3', '3', 30, 'T. Liza Soberano', 'Open'],
        ['GMRC3-4', 'Good Manners & Right Conduct', 'Grade 3', '4', 30, 'T. Liza Soberano', 'Open'],

        ['MAK3-1', 'Makabansa', 'Grade 3', '1', 30, 'T. Andres Bonifacio', 'Open'],
        ['MAK3-2', 'Makabansa', 'Grade 3', '2', 30, 'T. Andres Bonifacio', 'Open'],
        ['MAK3-3', 'Makabansa', 'Grade 3', '3', 30, 'T. Andres Bonifacio', 'Open'],
        ['MAK3-4', 'Makabansa', 'Grade 3', '4', 30, 'T. Andres Bonifacio', 'Open'],

        // ==========================================
        // GRADES 4, 5, 6 (4 Sections Each)
        // ==========================================
        ['ENG4-1', 'English 4', 'Grade 4', '1', 30, 'T. Emily Bronte', 'Open'],
        ['ENG4-2', 'English 4', 'Grade 4', '2', 30, 'T. Emily Bronte', 'Open'],
        ['ENG4-3', 'English 4', 'Grade 4', '3', 30, 'T. Emily Bronte', 'Open'],
        ['ENG4-4', 'English 4', 'Grade 4', '4', 30, 'T. Emily Bronte', 'Open'],

        ['FIL4-1', 'Filipino 4', 'Grade 4', '1', 30, 'T. Daniel Padilla', 'Open'],
        ['FIL4-2', 'Filipino 4', 'Grade 4', '2', 30, 'T. Daniel Padilla', 'Open'],
        ['FIL4-3', 'Filipino 4', 'Grade 4', '3', 30, 'T. Daniel Padilla', 'Open'],
        ['FIL4-4', 'Filipino 4', 'Grade 4', '4', 30, 'T. Daniel Padilla', 'Open'],

        ['MATH4-1', 'Mathematics 4', 'Grade 4', '1', 30, 'T. Alan Turing', 'Open'],
        ['MATH4-2', 'Mathematics 4', 'Grade 4', '2', 30, 'T. Alan Turing', 'Open'],
        ['MATH4-3', 'Mathematics 4', 'Grade 4', '3', 30, 'T. Alan Turing', 'Open'],
        ['MATH4-4', 'Mathematics 4', 'Grade 4', '4', 30, 'T. Alan Turing', 'Open'],

        ['SCI4-1', 'Science 4', 'Grade 4', '1', 30, 'T. Marie Curie', 'Open'],
        ['SCI4-2', 'Science 4', 'Grade 4', '2', 30, 'T. Marie Curie', 'Open'],
        ['SCI4-3', 'Science 4', 'Grade 4', '3', 30, 'T. Marie Curie', 'Open'],
        ['SCI4-4', 'Science 4', 'Grade 4', '4', 30, 'T. Marie Curie', 'Open'],

        ['AP4-1', 'Araling Panlipunan 4', 'Grade 4', '1', 30, 'T. Andres Bonifacio', 'Open'],
        ['AP4-2', 'Araling Panlipunan 4', 'Grade 4', '2', 30, 'T. Andres Bonifacio', 'Open'],
        ['AP4-3', 'Araling Panlipunan 4', 'Grade 4', '3', 30, 'T. Andres Bonifacio', 'Open'],
        ['AP4-4', 'Araling Panlipunan 4', 'Grade 4', '4', 30, 'T. Andres Bonifacio', 'Open'],

        ['ESP4-1', 'Values Education 4', 'Grade 4', '1', 30, 'T. Liza Soberano', 'Open'],
        ['ESP4-2', 'Values Education 4', 'Grade 4', '2', 30, 'T. Liza Soberano', 'Open'],
        ['ESP4-3', 'Values Education 4', 'Grade 4', '3', 30, 'T. Liza Soberano', 'Open'],
        ['ESP4-4', 'Values Education 4', 'Grade 4', '4', 30, 'T. Liza Soberano', 'Open'],

        ['MAPEH4-1', 'MAPEH 4', 'Grade 4', '1', 30, 'T. Francisco Balagtas', 'Open'],
        ['MAPEH4-2', 'MAPEH 4', 'Grade 4', '2', 30, 'T. Francisco Balagtas', 'Open'],
        ['MAPEH4-3', 'MAPEH 4', 'Grade 4', '3', 30, 'T. Francisco Balagtas', 'Open'],
        ['MAPEH4-4', 'MAPEH 4', 'Grade 4', '4', 30, 'T. Francisco Balagtas', 'Open'],

        ['EPP4-1', 'EPP 4', 'Grade 4', '1', 30, 'T. Gabriela Silang', 'Open'],
        ['EPP4-2', 'EPP 4', 'Grade 4', '2', 30, 'T. Gabriela Silang', 'Open'],
        ['EPP4-3', 'EPP 4', 'Grade 4', '3', 30, 'T. Gabriela Silang', 'Open'],
        ['EPP4-4', 'EPP 4', 'Grade 4', '4', 30, 'T. Gabriela Silang', 'Open'],

        ['ENG5-1', 'English 5', 'Grade 5', '1', 30, 'T. Emily Bronte', 'Open'],
        ['ENG5-2', 'English 5', 'Grade 5', '2', 30, 'T. Emily Bronte', 'Open'],
        ['ENG5-3', 'English 5', 'Grade 5', '3', 30, 'T. Emily Bronte', 'Open'],
        ['ENG5-4', 'English 5', 'Grade 5', '4', 30, 'T. Emily Bronte', 'Open'],

        ['FIL5-1', 'Filipino 5', 'Grade 5', '1', 30, 'T. Angel Locsin', 'Open'],
        ['FIL5-2', 'Filipino 5', 'Grade 5', '2', 30, 'T. Angel Locsin', 'Open'],
        ['FIL5-3', 'Filipino 5', 'Grade 5', '3', 30, 'T. Angel Locsin', 'Open'],
        ['FIL5-4', 'Filipino 5', 'Grade 5', '4', 30, 'T. Angel Locsin', 'Open'],

        ['MATH5-1', 'Mathematics 5', 'Grade 5', '1', 30, 'T. Alan Turing', 'Open'],
        ['MATH5-2', 'Mathematics 5', 'Grade 5', '2', 30, 'T. Alan Turing', 'Open'],
        ['MATH5-3', 'Mathematics 5', 'Grade 5', '3', 30, 'T. Alan Turing', 'Open'],
        ['MATH5-4', 'Mathematics 5', 'Grade 5', '4', 30, 'T. Alan Turing', 'Open'],

        ['SCI5-1', 'Science 5', 'Grade 5', '1', 30, 'T. Marie Curie', 'Open'],
        ['SCI5-2', 'Science 5', 'Grade 5', '2', 30, 'T. Marie Curie', 'Open'],
        ['SCI5-3', 'Science 5', 'Grade 5', '3', 30, 'T. Marie Curie', 'Open'],
        ['SCI5-4', 'Science 5', 'Grade 5', '4', 30, 'T. Marie Curie', 'Open'],

        ['AP5-1', 'Araling Panlipunan 5', 'Grade 5', '1', 30, 'T. Andres Bonifacio', 'Open'],
        ['AP5-2', 'Araling Panlipunan 5', 'Grade 5', '2', 30, 'T. Andres Bonifacio', 'Open'],
        ['AP5-3', 'Araling Panlipunan 5', 'Grade 5', '3', 30, 'T. Andres Bonifacio', 'Open'],
        ['AP5-4', 'Araling Panlipunan 5', 'Grade 5', '4', 30, 'T. Andres Bonifacio', 'Open'],

        ['ESP5-1', 'Values Education 5', 'Grade 5', '1', 30, 'T. Liza Soberano', 'Open'],
        ['ESP5-2', 'Values Education 5', 'Grade 5', '2', 30, 'T. Liza Soberano', 'Open'],
        ['ESP5-3', 'Values Education 5', 'Grade 5', '3', 30, 'T. Liza Soberano', 'Open'],
        ['ESP5-4', 'Values Education 5', 'Grade 5', '4', 30, 'T. Liza Soberano', 'Open'],

        ['MAPEH5-1', 'MAPEH 5', 'Grade 5', '1', 30, 'T. Francisco Balagtas', 'Open'],
        ['MAPEH5-2', 'MAPEH 5', 'Grade 5', '2', 30, 'T. Francisco Balagtas', 'Open'],
        ['MAPEH5-3', 'MAPEH 5', 'Grade 5', '3', 30, 'T. Francisco Balagtas', 'Open'],
        ['MAPEH5-4', 'MAPEH 5', 'Grade 5', '4', 30, 'T. Francisco Balagtas', 'Open'],

        ['EPP5-1', 'EPP 5', 'Grade 5', '1', 30, 'T. Gabriela Silang', 'Open'],
        ['EPP5-2', 'EPP 5', 'Grade 5', '2', 30, 'T. Gabriela Silang', 'Open'],
        ['EPP5-3', 'EPP 5', 'Grade 5', '3', 30, 'T. Gabriela Silang', 'Open'],
        ['EPP5-4', 'EPP 5', 'Grade 5', '4', 30, 'T. Gabriela Silang', 'Open'],

        ['ENG6-1', 'English 6', 'Grade 6', '1', 30, 'T. Emily Bronte', 'Open'],
        ['ENG6-2', 'English 6', 'Grade 6', '2', 30, 'T. Emily Bronte', 'Open'],
        ['ENG6-3', 'English 6', 'Grade 6', '3', 30, 'T. Emily Bronte', 'Open'],
        ['ENG6-4', 'English 6', 'Grade 6', '4', 30, 'T. Emily Bronte', 'Open'],

        ['FIL6-1', 'Filipino 6', 'Grade 6', '1', 30, 'T. Coco Martin', 'Open'],
        ['FIL6-2', 'Filipino 6', 'Grade 6', '2', 30, 'T. Coco Martin', 'Open'],
        ['FIL6-3', 'Filipino 6', 'Grade 6', '3', 30, 'T. Coco Martin', 'Open'],
        ['FIL6-4', 'Filipino 6', 'Grade 6', '4', 30, 'T. Coco Martin', 'Open'],

        ['MATH6-1', 'Mathematics 6', 'Grade 6', '1', 30, 'T. Alan Turing', 'Open'],
        ['MATH6-2', 'Mathematics 6', 'Grade 6', '2', 30, 'T. Alan Turing', 'Open'],
        ['MATH6-3', 'Mathematics 6', 'Grade 6', '3', 30, 'T. Alan Turing', 'Open'],
        ['MATH6-4', 'Mathematics 6', 'Grade 6', '4', 30, 'T. Alan Turing', 'Open'],

        ['SCI6-1', 'Science 6', 'Grade 6', '1', 30, 'T. Marie Curie', 'Open'],
        ['SCI6-2', 'Science 6', 'Grade 6', '2', 30, 'T. Marie Curie', 'Open'],
        ['SCI6-3', 'Science 6', 'Grade 6', '3', 30, 'T. Marie Curie', 'Open'],
        ['SCI6-4', 'Science 6', 'Grade 6', '4', 30, 'T. Marie Curie', 'Open'],

        ['AP6-1', 'Araling Panlipunan 6', 'Grade 6', '1', 30, 'T. Andres Bonifacio', 'Open'],
        ['AP6-2', 'Araling Panlipunan 6', 'Grade 6', '2', 30, 'T. Andres Bonifacio', 'Open'],
        ['AP6-3', 'Araling Panlipunan 6', 'Grade 6', '3', 30, 'T. Andres Bonifacio', 'Open'],
        ['AP6-4', 'Araling Panlipunan 6', 'Grade 6', '4', 30, 'T. Andres Bonifacio', 'Open'],

        ['ESP6-1', 'Values Education 6', 'Grade 6', '1', 30, 'T. Liza Soberano', 'Open'],
        ['ESP6-2', 'Values Education 6', 'Grade 6', '2', 30, 'T. Liza Soberano', 'Open'],
        ['ESP6-3', 'Values Education 6', 'Grade 6', '3', 30, 'T. Liza Soberano', 'Open'],
        ['ESP6-4', 'Values Education 6', 'Grade 6', '4', 30, 'T. Liza Soberano', 'Open'],

        ['MAPEH6-1', 'MAPEH 6', 'Grade 6', '1', 30, 'T. Francisco Balagtas', 'Open'],
        ['MAPEH6-2', 'MAPEH 6', 'Grade 6', '2', 30, 'T. Francisco Balagtas', 'Open'],
        ['MAPEH6-3', 'MAPEH 6', 'Grade 6', '3', 30, 'T. Francisco Balagtas', 'Open'],
        ['MAPEH6-4', 'MAPEH 6', 'Grade 6', '4', 30, 'T. Francisco Balagtas', 'Open'],

        ['TLE6-1', 'TLE 6', 'Grade 6', '1', 30, 'T. Gabriela Silang', 'Open'],
        ['TLE6-2', 'TLE 6', 'Grade 6', '2', 30, 'T. Gabriela Silang', 'Open'],
        ['TLE6-3', 'TLE 6', 'Grade 6', '3', 30, 'T. Gabriela Silang', 'Open'],
        ['TLE6-4', 'TLE 6', 'Grade 6', '4', 30, 'T. Gabriela Silang', 'Open'],

        // ==========================================
        // GRADES 7, 8, 9, 10 (4 Sections Each)
        // ==========================================
        ['ENG7-1', 'English 7', 'Grade 7', '1', 35, 'T. Emily Bronte', 'Open'],
        ['ENG7-2', 'English 7', 'Grade 7', '2', 35, 'T. Emily Bronte', 'Open'],
        ['ENG7-3', 'English 7', 'Grade 7', '3', 35, 'T. Emily Bronte', 'Open'],
        ['ENG7-4', 'English 7', 'Grade 7', '4', 35, 'T. Emily Bronte', 'Open'],

        ['FIL7-1', 'Filipino 7', 'Grade 7', '1', 35, 'T. Enrique Gil', 'Open'],
        ['FIL7-2', 'Filipino 7', 'Grade 7', '2', 35, 'T. Enrique Gil', 'Open'],
        ['FIL7-3', 'Filipino 7', 'Grade 7', '3', 35, 'T. Enrique Gil', 'Open'],
        ['FIL7-4', 'Filipino 7', 'Grade 7', '4', 35, 'T. Enrique Gil', 'Open'],

        ['MATH7-1', 'Mathematics 7', 'Grade 7', '1', 35, 'T. Jane C. Villa', 'Open'],
        ['MATH7-2', 'Mathematics 7', 'Grade 7', '2', 35, 'T. Jane C. Villa', 'Open'],
        ['MATH7-3', 'Mathematics 7', 'Grade 7', '3', 35, 'T. Jane C. Villa', 'Open'],
        ['MATH7-4', 'Mathematics 7', 'Grade 7', '4', 35, 'T. Jane C. Villa', 'Open'],

        ['SCI7-1', 'Science 7', 'Grade 7', '1', 35, 'T. Marie Curie', 'Open'],
        ['SCI7-2', 'Science 7', 'Grade 7', '2', 35, 'T. Marie Curie', 'Open'],
        ['SCI7-3', 'Science 7', 'Grade 7', '3', 35, 'T. Marie Curie', 'Open'],
        ['SCI7-4', 'Science 7', 'Grade 7', '4', 35, 'T. Marie Curie', 'Open'],

        ['AP7-1', 'Araling Panlipunan 7', 'Grade 7', '1', 35, 'T. Andres Bonifacio', 'Open'],
        ['AP7-2', 'Araling Panlipunan 7', 'Grade 7', '2', 35, 'T. Andres Bonifacio', 'Open'],
        ['AP7-3', 'Araling Panlipunan 7', 'Grade 7', '3', 35, 'T. Andres Bonifacio', 'Open'],
        ['AP7-4', 'Araling Panlipunan 7', 'Grade 7', '4', 35, 'T. Andres Bonifacio', 'Open'],

        ['ESP7-1', 'Values Education 7', 'Grade 7', '1', 35, 'T. Liza Soberano', 'Open'],
        ['ESP7-2', 'Values Education 7', 'Grade 7', '2', 35, 'T. Liza Soberano', 'Open'],
        ['ESP7-3', 'Values Education 7', 'Grade 7', '3', 35, 'T. Liza Soberano', 'Open'],
        ['ESP7-4', 'Values Education 7', 'Grade 7', '4', 35, 'T. Liza Soberano', 'Open'],

        ['MAPEH7-1', 'MAPEH 7', 'Grade 7', '1', 35, 'T. Francisco Balagtas', 'Open'],
        ['MAPEH7-2', 'MAPEH 7', 'Grade 7', '2', 35, 'T. Francisco Balagtas', 'Open'],
        ['MAPEH7-3', 'MAPEH 7', 'Grade 7', '3', 35, 'T. Francisco Balagtas', 'Open'],
        ['MAPEH7-4', 'MAPEH 7', 'Grade 7', '4', 35, 'T. Francisco Balagtas', 'Open'],

        ['TLE7-1', 'TLE 7', 'Grade 7', '1', 35, 'T. Gabriela Silang', 'Open'],
        ['TLE7-2', 'TLE 7', 'Grade 7', '2', 35, 'T. Gabriela Silang', 'Open'],
        ['TLE7-3', 'TLE 7', 'Grade 7', '3', 35, 'T. Gabriela Silang', 'Open'],
        ['TLE7-4', 'TLE 7', 'Grade 7', '4', 35, 'T. Gabriela Silang', 'Open'],

        ['ENG8-1', 'English 8', 'Grade 8', '1', 35, 'T. Emily Bronte', 'Open'],
        ['ENG8-2', 'English 8', 'Grade 8', '2', 35, 'T. Emily Bronte', 'Open'],
        ['ENG8-3', 'English 8', 'Grade 8', '3', 35, 'T. Emily Bronte', 'Open'],
        ['ENG8-4', 'English 8', 'Grade 8', '4', 35, 'T. Emily Bronte', 'Open'],

        ['FIL8-1', 'Filipino 8', 'Grade 8', '1', 35, 'T. Kathryn Bernardo', 'Open'],
        ['FIL8-2', 'Filipino 8', 'Grade 8', '2', 35, 'T. Kathryn Bernardo', 'Open'],
        ['FIL8-3', 'Filipino 8', 'Grade 8', '3', 35, 'T. Kathryn Bernardo', 'Open'],
        ['FIL8-4', 'Filipino 8', 'Grade 8', '4', 35, 'T. Kathryn Bernardo', 'Open'],

        ['MATH8-1', 'Mathematics 8', 'Grade 8', '1', 35, 'T. Alan Turing', 'Open'],
        ['MATH8-2', 'Mathematics 8', 'Grade 8', '2', 35, 'T. Alan Turing', 'Open'],
        ['MATH8-3', 'Mathematics 8', 'Grade 8', '3', 35, 'T. Alan Turing', 'Open'],
        ['MATH8-4', 'Mathematics 8', 'Grade 8', '4', 35, 'T. Alan Turing', 'Open'],

        ['SCI8-1', 'Science 8', 'Grade 8', '1', 35, 'T. Marie Curie', 'Open'],
        ['SCI8-2', 'Science 8', 'Grade 8', '2', 35, 'T. Marie Curie', 'Open'],
        ['SCI8-3', 'Science 8', 'Grade 8', '3', 35, 'T. Marie Curie', 'Open'],
        ['SCI8-4', 'Science 8', 'Grade 8', '4', 35, 'T. Marie Curie', 'Open'],

        ['AP8-1', 'Araling Panlipunan 8', 'Grade 8', '1', 35, 'T. Andres Bonifacio', 'Open'],
        ['AP8-2', 'Araling Panlipunan 8', 'Grade 8', '2', 35, 'T. Andres Bonifacio', 'Open'],
        ['AP8-3', 'Araling Panlipunan 8', 'Grade 8', '3', 35, 'T. Andres Bonifacio', 'Open'],
        ['AP8-4', 'Araling Panlipunan 8', 'Grade 8', '4', 35, 'T. Andres Bonifacio', 'Open'],

        ['ESP8-1', 'Values Education 8', 'Grade 8', '1', 35, 'T. Liza Soberano', 'Open'],
        ['ESP8-2', 'Values Education 8', 'Grade 8', '2', 35, 'T. Liza Soberano', 'Open'],
        ['ESP8-3', 'Values Education 8', 'Grade 8', '3', 35, 'T. Liza Soberano', 'Open'],
        ['ESP8-4', 'Values Education 8', 'Grade 8', '4', 35, 'T. Liza Soberano', 'Open'],

        ['MAPEH8-1', 'MAPEH 8', 'Grade 8', '1', 35, 'T. Francisco Balagtas', 'Open'],
        ['MAPEH8-2', 'MAPEH 8', 'Grade 8', '2', 35, 'T. Francisco Balagtas', 'Open'],
        ['MAPEH8-3', 'MAPEH 8', 'Grade 8', '3', 35, 'T. Francisco Balagtas', 'Open'],
        ['MAPEH8-4', 'MAPEH 8', 'Grade 8', '4', 35, 'T. Francisco Balagtas', 'Open'],

        ['TLE8-1', 'TLE 8', 'Grade 8', '1', 35, 'T. Gabriela Silang', 'Open'],
        ['TLE8-2', 'TLE 8', 'Grade 8', '2', 35, 'T. Gabriela Silang', 'Open'],
        ['TLE8-3', 'TLE 8', 'Grade 8', '3', 35, 'T. Gabriela Silang', 'Open'],
        ['TLE8-4', 'TLE 8', 'Grade 8', '4', 35, 'T. Gabriela Silang', 'Open'],

        ['ENG9-1', 'English 9', 'Grade 9', '1', 35, 'T. Emily Bronte', 'Open'],
        ['ENG9-2', 'English 9', 'Grade 9', '2', 35, 'T. Emily Bronte', 'Open'],
        ['ENG9-3', 'English 9', 'Grade 9', '3', 35, 'T. Emily Bronte', 'Open'],
        ['ENG9-4', 'English 9', 'Grade 9', '4', 35, 'T. Emily Bronte', 'Open'],

        ['FIL9-1', 'Filipino 9', 'Grade 9', '1', 35, 'T. Daniel Padilla', 'Open'],
        ['FIL9-2', 'Filipino 9', 'Grade 9', '2', 35, 'T. Daniel Padilla', 'Open'],
        ['FIL9-3', 'Filipino 9', 'Grade 9', '3', 35, 'T. Daniel Padilla', 'Open'],
        ['FIL9-4', 'Filipino 9', 'Grade 9', '4', 35, 'T. Daniel Padilla', 'Open'],

        ['MATH9-1', 'Mathematics 9', 'Grade 9', '1', 35, 'T. Alan Turing', 'Open'],
        ['MATH9-2', 'Mathematics 9', 'Grade 9', '2', 35, 'T. Alan Turing', 'Open'],
        ['MATH9-3', 'Mathematics 9', 'Grade 9', '3', 35, 'T. Alan Turing', 'Open'],
        ['MATH9-4', 'Mathematics 9', 'Grade 9', '4', 35, 'T. Alan Turing', 'Open'],

        ['SCI9-1', 'Science 9', 'Grade 9', '1', 35, 'T. Marie Curie', 'Open'],
        ['SCI9-2', 'Science 9', 'Grade 9', '2', 35, 'T. Marie Curie', 'Open'],
        ['SCI9-3', 'Science 9', 'Grade 9', '3', 35, 'T. Marie Curie', 'Open'],
        ['SCI9-4', 'Science 9', 'Grade 9', '4', 35, 'T. Marie Curie', 'Open'],

        ['AP9-1', 'Araling Panlipunan 9', 'Grade 9', '1', 35, 'T. Andres Bonifacio', 'Open'],
        ['AP9-2', 'Araling Panlipunan 9', 'Grade 9', '2', 35, 'T. Andres Bonifacio', 'Open'],
        ['AP9-3', 'Araling Panlipunan 9', 'Grade 9', '3', 35, 'T. Andres Bonifacio', 'Open'],
        ['AP9-4', 'Araling Panlipunan 9', 'Grade 9', '4', 35, 'T. Andres Bonifacio', 'Open'],

        ['ESP9-1', 'Values Education 9', 'Grade 9', '1', 35, 'T. Liza Soberano', 'Open'],
        ['ESP9-2', 'Values Education 9', 'Grade 9', '2', 35, 'T. Liza Soberano', 'Open'],
        ['ESP9-3', 'Values Education 9', 'Grade 9', '3', 35, 'T. Liza Soberano', 'Open'],
        ['ESP9-4', 'Values Education 9', 'Grade 9', '4', 35, 'T. Liza Soberano', 'Open'],

        ['MAPEH9-1', 'MAPEH 9', 'Grade 9', '1', 35, 'T. Francisco Balagtas', 'Open'],
        ['MAPEH9-2', 'MAPEH 9', 'Grade 9', '2', 35, 'T. Francisco Balagtas', 'Open'],
        ['MAPEH9-3', 'MAPEH 9', 'Grade 9', '3', 35, 'T. Francisco Balagtas', 'Open'],
        ['MAPEH9-4', 'MAPEH 9', 'Grade 9', '4', 35, 'T. Francisco Balagtas', 'Open'],

        ['TLE9-1', 'TLE 9', 'Grade 9', '1', 35, 'T. Gabriela Silang', 'Open'],
        ['TLE9-2', 'TLE 9', 'Grade 9', '2', 35, 'T. Gabriela Silang', 'Open'],
        ['TLE9-3', 'TLE 9', 'Grade 9', '3', 35, 'T. Gabriela Silang', 'Open'],
        ['TLE9-4', 'TLE 9', 'Grade 9', '4', 35, 'T. Gabriela Silang', 'Open'],

        ['ENG10-1', 'English 10', 'Grade 10', '1', 35, 'T. Emily Bronte', 'Open'],
        ['ENG10-2', 'English 10', 'Grade 10', '2', 35, 'T. Emily Bronte', 'Open'],
        ['ENG10-3', 'English 10', 'Grade 10', '3', 35, 'T. Emily Bronte', 'Open'],
        ['ENG10-4', 'English 10', 'Grade 10', '4', 35, 'T. Emily Bronte', 'Open'],

        ['FIL10-1', 'Filipino 10', 'Grade 10', '1', 35, 'T. Angel Locsin', 'Open'],
        ['FIL10-2', 'Filipino 10', 'Grade 10', '2', 35, 'T. Angel Locsin', 'Open'],
        ['FIL10-3', 'Filipino 10', 'Grade 10', '3', 35, 'T. Angel Locsin', 'Open'],
        ['FIL10-4', 'Filipino 10', 'Grade 10', '4', 35, 'T. Angel Locsin', 'Open'],

        ['MATH10-1', 'Mathematics 10', 'Grade 10', '1', 35, 'T. Alan Turing', 'Open'],
        ['MATH10-2', 'Mathematics 10', 'Grade 10', '2', 35, 'T. Alan Turing', 'Open'],
        ['MATH10-3', 'Mathematics 10', 'Grade 10', '3', 35, 'T. Alan Turing', 'Open'],
        ['MATH10-4', 'Mathematics 10', 'Grade 10', '4', 35, 'T. Alan Turing', 'Open'],

        ['SCI10-1', 'Science 10', 'Grade 10', '1', 35, 'T. Marie Curie', 'Open'],
        ['SCI10-2', 'Science 10', 'Grade 10', '2', 35, 'T. Marie Curie', 'Open'],
        ['SCI10-3', 'Science 10', 'Grade 10', '3', 35, 'T. Marie Curie', 'Open'],
        ['SCI10-4', 'Science 10', 'Grade 10', '4', 35, 'T. Marie Curie', 'Open'],

        ['AP10-1', 'Araling Panlipunan 10', 'Grade 10', '1', 35, 'T. Andres Bonifacio', 'Open'],
        ['AP10-2', 'Araling Panlipunan 10', 'Grade 10', '2', 35, 'T. Andres Bonifacio', 'Open'],
        ['AP10-3', 'Araling Panlipunan 10', 'Grade 10', '3', 35, 'T. Andres Bonifacio', 'Open'],
        ['AP10-4', 'Araling Panlipunan 10', 'Grade 10', '4', 35, 'T. Andres Bonifacio', 'Open'],

        ['ESP10-1', 'Values Education 10', 'Grade 10', '1', 35, 'T. Liza Soberano', 'Open'],
        ['ESP10-2', 'Values Education 10', 'Grade 10', '2', 35, 'T. Liza Soberano', 'Open'],
        ['ESP10-3', 'Values Education 10', 'Grade 10', '3', 35, 'T. Liza Soberano', 'Open'],
        ['ESP10-4', 'Values Education 10', 'Grade 10', '4', 35, 'T. Liza Soberano', 'Open'],

        ['MAPEH10-1', 'MAPEH 10', 'Grade 10', '1', 35, 'T. Francisco Balagtas', 'Open'],
        ['MAPEH10-2', 'MAPEH 10', 'Grade 10', '2', 35, 'T. Francisco Balagtas', 'Open'],
        ['MAPEH10-3', 'MAPEH 10', 'Grade 10', '3', 35, 'T. Francisco Balagtas', 'Open'],
        ['MAPEH10-4', 'MAPEH 10', 'Grade 10', '4', 35, 'T. Francisco Balagtas', 'Open'],

        ['TLE10-1', 'TLE 10', 'Grade 10', '1', 35, 'T. Gabriela Silang', 'Open'],
        ['TLE10-2', 'TLE 10', 'Grade 10', '2', 35, 'T. Gabriela Silang', 'Open'],
        ['TLE10-3', 'TLE 10', 'Grade 10', '3', 35, 'T. Gabriela Silang', 'Open'],
        ['TLE10-4', 'TLE 10', 'Grade 10', '4', 35, 'T. Gabriela Silang', 'Open'],

        // ==========================================
        // GRADE 11 - STEM (1st Sem)
        // ==========================================
        ['ORAL11-1', 'Oral Communication', 'Grade 11 - STEM - 1st Sem', '1', 40, 'T. Emily Bronte', 'Open'],
        ['ORAL11-2', 'Oral Communication', 'Grade 11 - STEM - 1st Sem', '2', 40, 'T. Emily Bronte', 'Open'],
        ['ORAL11-3', 'Oral Communication', 'Grade 11 - STEM - 1st Sem', '3', 40, 'T. Emily Bronte', 'Open'],
        ['ORAL11-4', 'Oral Communication', 'Grade 11 - STEM - 1st Sem', '4', 40, 'T. Emily Bronte', 'Open'],

        ['KOMU11-1', 'Komunikasyon at Pananaliksik', 'Grade 11 - STEM - 1st Sem', '1', 40, 'T. Coco Martin', 'Open'],
        ['KOMU11-2', 'Komunikasyon at Pananaliksik', 'Grade 11 - STEM - 1st Sem', '2', 40, 'T. Coco Martin', 'Open'],
        ['KOMU11-3', 'Komunikasyon at Pananaliksik', 'Grade 11 - STEM - 1st Sem', '3', 40, 'T. Coco Martin', 'Open'],
        ['KOMU11-4', 'Komunikasyon at Pananaliksik', 'Grade 11 - STEM - 1st Sem', '4', 40, 'T. Coco Martin', 'Open'],

        ['GENM11-1', 'General Mathematics', 'Grade 11 - STEM - 1st Sem', '1', 40, 'T. Smith V. Cruz', 'Open'],
        ['GENM11-2', 'General Mathematics', 'Grade 11 - STEM - 1st Sem', '2', 40, 'T. Smith V. Cruz', 'Open'],
        ['GENM11-3', 'General Mathematics', 'Grade 11 - STEM - 1st Sem', '3', 40, 'T. Smith V. Cruz', 'Open'],
        ['GENM11-4', 'General Mathematics', 'Grade 11 - STEM - 1st Sem', '4', 40, 'T. Smith V. Cruz', 'Open'],

        ['EALS11-1', 'Earth and Life Science', 'Grade 11 - STEM - 1st Sem', '1', 40, 'T. Marie Curie', 'Open'],
        ['EALS11-2', 'Earth and Life Science', 'Grade 11 - STEM - 1st Sem', '2', 40, 'T. Marie Curie', 'Open'],
        ['EALS11-3', 'Earth and Life Science', 'Grade 11 - STEM - 1st Sem', '3', 40, 'T. Marie Curie', 'Open'],
        ['EALS11-4', 'Earth and Life Science', 'Grade 11 - STEM - 1st Sem', '4', 40, 'T. Marie Curie', 'Open'],

        ['PERD11-1', 'Personal Development', 'Grade 11 - STEM - 1st Sem', '1', 40, 'T. Liza Soberano', 'Open'],
        ['PERD11-2', 'Personal Development', 'Grade 11 - STEM - 1st Sem', '2', 40, 'T. Liza Soberano', 'Open'],
        ['PERD11-3', 'Personal Development', 'Grade 11 - STEM - 1st Sem', '3', 40, 'T. Liza Soberano', 'Open'],
        ['PERD11-4', 'Personal Development', 'Grade 11 - STEM - 1st Sem', '4', 40, 'T. Liza Soberano', 'Open'],

        ['EMPW11-1', 'Empowerment Technologies', 'Grade 11 - STEM - 1st Sem', '1', 40, 'T. Alan Turing', 'Open'],
        ['EMPW11-2', 'Empowerment Technologies', 'Grade 11 - STEM - 1st Sem', '2', 40, 'T. Alan Turing', 'Open'],
        ['EMPW11-3', 'Empowerment Technologies', 'Grade 11 - STEM - 1st Sem', '3', 40, 'T. Alan Turing', 'Open'],
        ['EMPW11-4', 'Empowerment Technologies', 'Grade 11 - STEM - 1st Sem', '4', 40, 'T. Alan Turing', 'Open'],

        ['PE111-1', 'PE and Health 1', 'Grade 11 - STEM - 1st Sem', '1', 40, 'T. Francisco Balagtas', 'Open'],
        ['PE111-2', 'PE and Health 1', 'Grade 11 - STEM - 1st Sem', '2', 40, 'T. Francisco Balagtas', 'Open'],
        ['PE111-3', 'PE and Health 1', 'Grade 11 - STEM - 1st Sem', '3', 40, 'T. Francisco Balagtas', 'Open'],
        ['PE111-4', 'PE and Health 1', 'Grade 11 - STEM - 1st Sem', '4', 40, 'T. Francisco Balagtas', 'Open'],

        ['PREC11-1', 'Pre-Calculus (STEM)', 'Grade 11 - STEM - 1st Sem', '1', 40, 'T. Alan Turing', 'Open'],
        ['PREC11-2', 'Pre-Calculus (STEM)', 'Grade 11 - STEM - 1st Sem', '2', 40, 'T. Alan Turing', 'Open'],
        ['PREC11-3', 'Pre-Calculus (STEM)', 'Grade 11 - STEM - 1st Sem', '3', 40, 'T. Alan Turing', 'Open'],
        ['PREC11-4', 'Pre-Calculus (STEM)', 'Grade 11 - STEM - 1st Sem', '4', 40, 'T. Alan Turing', 'Open'],

        ['CHEM111-1', 'General Chemistry 1 (STEM)', 'Grade 11 - STEM - 1st Sem', '1', 40, 'T. Marie Curie', 'Open'],
        ['CHEM111-2', 'General Chemistry 1 (STEM)', 'Grade 11 - STEM - 1st Sem', '2', 40, 'T. Marie Curie', 'Open'],
        ['CHEM111-3', 'General Chemistry 1 (STEM)', 'Grade 11 - STEM - 1st Sem', '3', 40, 'T. Marie Curie', 'Open'],
        ['CHEM111-4', 'General Chemistry 1 (STEM)', 'Grade 11 - STEM - 1st Sem', '4', 40, 'T. Marie Curie', 'Open'],

        // ==========================================
        // GRADE 11 - STEM (2nd Sem)
        // ==========================================
        ['READ11-1', 'Reading and Writing Skills', 'Grade 11 - STEM - 2nd Sem', '1', 40, 'T. Emily Bronte', 'Open'],
        ['READ11-2', 'Reading and Writing Skills', 'Grade 11 - STEM - 2nd Sem', '2', 40, 'T. Emily Bronte', 'Open'],
        ['READ11-3', 'Reading and Writing Skills', 'Grade 11 - STEM - 2nd Sem', '3', 40, 'T. Emily Bronte', 'Open'],
        ['READ11-4', 'Reading and Writing Skills', 'Grade 11 - STEM - 2nd Sem', '4', 40, 'T. Emily Bronte', 'Open'],

        ['PAGB11-1', 'Pagbasa at Pagsusuri', 'Grade 11 - STEM - 2nd Sem', '1', 40, 'T. Enrique Gil', 'Open'],
        ['PAGB11-2', 'Pagbasa at Pagsusuri', 'Grade 11 - STEM - 2nd Sem', '2', 40, 'T. Enrique Gil', 'Open'],
        ['PAGB11-3', 'Pagbasa at Pagsusuri', 'Grade 11 - STEM - 2nd Sem', '3', 40, 'T. Enrique Gil', 'Open'],
        ['PAGB11-4', 'Pagbasa at Pagsusuri', 'Grade 11 - STEM - 2nd Sem', '4', 40, 'T. Enrique Gil', 'Open'],

        ['STAT11-1', 'Statistics and Probability', 'Grade 11 - STEM - 2nd Sem', '1', 40, 'T. Alan Turing', 'Open'],
        ['STAT11-2', 'Statistics and Probability', 'Grade 11 - STEM - 2nd Sem', '2', 40, 'T. Alan Turing', 'Open'],
        ['STAT11-3', 'Statistics and Probability', 'Grade 11 - STEM - 2nd Sem', '3', 40, 'T. Alan Turing', 'Open'],
        ['STAT11-4', 'Statistics and Probability', 'Grade 11 - STEM - 2nd Sem', '4', 40, 'T. Alan Turing', 'Open'],

        ['PHYS11-1', 'Physical Science', 'Grade 11 - STEM - 2nd Sem', '1', 40, 'T. Marie Curie', 'Open'],
        ['PHYS11-2', 'Physical Science', 'Grade 11 - STEM - 2nd Sem', '2', 40, 'T. Marie Curie', 'Open'],
        ['PHYS11-3', 'Physical Science', 'Grade 11 - STEM - 2nd Sem', '3', 40, 'T. Marie Curie', 'Open'],
        ['PHYS11-4', 'Physical Science', 'Grade 11 - STEM - 2nd Sem', '4', 40, 'T. Marie Curie', 'Open'],

        ['PE211-1', 'PE and Health 2', 'Grade 11 - STEM - 2nd Sem', '1', 40, 'T. Francisco Balagtas', 'Open'],
        ['PE211-2', 'PE and Health 2', 'Grade 11 - STEM - 2nd Sem', '2', 40, 'T. Francisco Balagtas', 'Open'],
        ['PE211-3', 'PE and Health 2', 'Grade 11 - STEM - 2nd Sem', '3', 40, 'T. Francisco Balagtas', 'Open'],
        ['PE211-4', 'PE and Health 2', 'Grade 11 - STEM - 2nd Sem', '4', 40, 'T. Francisco Balagtas', 'Open'],

        ['PR111-1', 'Practical Research 1', 'Grade 11 - STEM - 2nd Sem', '1', 40, 'T. Jane C. Villa', 'Open'],
        ['PR111-2', 'Practical Research 1', 'Grade 11 - STEM - 2nd Sem', '2', 40, 'T. Jane C. Villa', 'Open'],
        ['PR111-3', 'Practical Research 1', 'Grade 11 - STEM - 2nd Sem', '3', 40, 'T. Jane C. Villa', 'Open'],
        ['PR111-4', 'Practical Research 1', 'Grade 11 - STEM - 2nd Sem', '4', 40, 'T. Jane C. Villa', 'Open'],

        ['BASC11-1', 'Basic Calculus (STEM)', 'Grade 11 - STEM - 2nd Sem', '1', 40, 'T. Alan Turing', 'Open'],
        ['BASC11-2', 'Basic Calculus (STEM)', 'Grade 11 - STEM - 2nd Sem', '2', 40, 'T. Alan Turing', 'Open'],
        ['BASC11-3', 'Basic Calculus (STEM)', 'Grade 11 - STEM - 2nd Sem', '3', 40, 'T. Alan Turing', 'Open'],
        ['BASC11-4', 'Basic Calculus (STEM)', 'Grade 11 - STEM - 2nd Sem', '4', 40, 'T. Alan Turing', 'Open'],

        ['CHEM211-1', 'General Chemistry 2 (STEM)', 'Grade 11 - STEM - 2nd Sem', '1', 40, 'T. Marie Curie', 'Open'],
        ['CHEM211-2', 'General Chemistry 2 (STEM)', 'Grade 11 - STEM - 2nd Sem', '2', 40, 'T. Marie Curie', 'Open'],
        ['CHEM211-3', 'General Chemistry 2 (STEM)', 'Grade 11 - STEM - 2nd Sem', '3', 40, 'T. Marie Curie', 'Open'],
        ['CHEM211-4', 'General Chemistry 2 (STEM)', 'Grade 11 - STEM - 2nd Sem', '4', 40, 'T. Marie Curie', 'Open'],

        // ==========================================
        // GRADE 12 - STEM (1st Sem)
        // ==========================================
        ['21ST12-1', '21st Century Literature', 'Grade 12 - STEM - 1st Sem', '1', 40, 'T. Emily Bronte', 'Open'],
        ['21ST12-2', '21st Century Literature', 'Grade 12 - STEM - 1st Sem', '2', 40, 'T. Emily Bronte', 'Open'],
        ['21ST12-3', '21st Century Literature', 'Grade 12 - STEM - 1st Sem', '3', 40, 'T. Emily Bronte', 'Open'],
        ['21ST12-4', '21st Century Literature', 'Grade 12 - STEM - 1st Sem', '4', 40, 'T. Emily Bronte', 'Open'],

        ['UCSP12-1', 'Understanding Culture & Politics', 'Grade 12 - STEM - 1st Sem', '1', 40, 'T. Andres Bonifacio', 'Open'],
        ['UCSP12-2', 'Understanding Culture & Politics', 'Grade 12 - STEM - 1st Sem', '2', 40, 'T. Andres Bonifacio', 'Open'],
        ['UCSP12-3', 'Understanding Culture & Politics', 'Grade 12 - STEM - 1st Sem', '3', 40, 'T. Andres Bonifacio', 'Open'],
        ['UCSP12-4', 'Understanding Culture & Politics', 'Grade 12 - STEM - 1st Sem', '4', 40, 'T. Andres Bonifacio', 'Open'],

        ['PHIL12-1', 'Philosophy of the Human Person', 'Grade 12 - STEM - 1st Sem', '1', 40, 'T. Liza Soberano', 'Open'],
        ['PHIL12-2', 'Philosophy of the Human Person', 'Grade 12 - STEM - 1st Sem', '2', 40, 'T. Liza Soberano', 'Open'],
        ['PHIL12-3', 'Philosophy of the Human Person', 'Grade 12 - STEM - 1st Sem', '3', 40, 'T. Liza Soberano', 'Open'],
        ['PHIL12-4', 'Philosophy of the Human Person', 'Grade 12 - STEM - 1st Sem', '4', 40, 'T. Liza Soberano', 'Open'],

        ['PE312-1', 'PE and Health 3', 'Grade 12 - STEM - 1st Sem', '1', 40, 'T. Francisco Balagtas', 'Open'],
        ['PE312-2', 'PE and Health 3', 'Grade 12 - STEM - 1st Sem', '2', 40, 'T. Francisco Balagtas', 'Open'],
        ['PE312-3', 'PE and Health 3', 'Grade 12 - STEM - 1st Sem', '3', 40, 'T. Francisco Balagtas', 'Open'],
        ['PE312-4', 'PE and Health 3', 'Grade 12 - STEM - 1st Sem', '4', 40, 'T. Francisco Balagtas', 'Open'],

        ['EAPP12-1', 'English for Academic Purposes', 'Grade 12 - STEM - 1st Sem', '1', 40, 'T. Emily Bronte', 'Open'],
        ['EAPP12-2', 'English for Academic Purposes', 'Grade 12 - STEM - 1st Sem', '2', 40, 'T. Emily Bronte', 'Open'],
        ['EAPP12-3', 'English for Academic Purposes', 'Grade 12 - STEM - 1st Sem', '3', 40, 'T. Emily Bronte', 'Open'],
        ['EAPP12-4', 'English for Academic Purposes', 'Grade 12 - STEM - 1st Sem', '4', 40, 'T. Emily Bronte', 'Open'],

        ['PR212-1', 'Practical Research 2', 'Grade 12 - STEM - 1st Sem', '1', 40, 'T. Jane C. Villa', 'Open'],
        ['PR212-2', 'Practical Research 2', 'Grade 12 - STEM - 1st Sem', '2', 40, 'T. Jane C. Villa', 'Open'],
        ['PR212-3', 'Practical Research 2', 'Grade 12 - STEM - 1st Sem', '3', 40, 'T. Jane C. Villa', 'Open'],
        ['PR212-4', 'Practical Research 2', 'Grade 12 - STEM - 1st Sem', '4', 40, 'T. Jane C. Villa', 'Open'],

        ['CPAR12-1', 'Contemporary Arts', 'Grade 12 - STEM - 1st Sem', '1', 40, 'T. Francisco Balagtas', 'Open'],
        ['CPAR12-2', 'Contemporary Arts', 'Grade 12 - STEM - 1st Sem', '2', 40, 'T. Francisco Balagtas', 'Open'],
        ['CPAR12-3', 'Contemporary Arts', 'Grade 12 - STEM - 1st Sem', '3', 40, 'T. Francisco Balagtas', 'Open'],
        ['CPAR12-4', 'Contemporary Arts', 'Grade 12 - STEM - 1st Sem', '4', 40, 'T. Francisco Balagtas', 'Open'],

        ['MIL12-1', 'Media and Information Literacy', 'Grade 12 - STEM - 1st Sem', '1', 40, 'T. Alan Turing', 'Open'],
        ['MIL12-2', 'Media and Information Literacy', 'Grade 12 - STEM - 1st Sem', '2', 40, 'T. Alan Turing', 'Open'],
        ['MIL12-3', 'Media and Information Literacy', 'Grade 12 - STEM - 1st Sem', '3', 40, 'T. Alan Turing', 'Open'],
        ['MIL12-4', 'Media and Information Literacy', 'Grade 12 - STEM - 1st Sem', '4', 40, 'T. Alan Turing', 'Open'],

        ['PHY112-1', 'General Physics 1 (STEM)', 'Grade 12 - STEM - 1st Sem', '1', 40, 'T. Marie Curie', 'Open'],
        ['PHY112-2', 'General Physics 1 (STEM)', 'Grade 12 - STEM - 1st Sem', '2', 40, 'T. Marie Curie', 'Open'],
        ['PHY112-3', 'General Physics 1 (STEM)', 'Grade 12 - STEM - 1st Sem', '3', 40, 'T. Marie Curie', 'Open'],
        ['PHY112-4', 'General Physics 1 (STEM)', 'Grade 12 - STEM - 1st Sem', '4', 40, 'T. Marie Curie', 'Open'],

        ['BIO112-1', 'General Biology 1 (STEM)', 'Grade 12 - STEM - 1st Sem', '1', 40, 'T. Marie Curie', 'Open'],
        ['BIO112-2', 'General Biology 1 (STEM)', 'Grade 12 - STEM - 1st Sem', '2', 40, 'T. Marie Curie', 'Open'],
        ['BIO112-3', 'General Biology 1 (STEM)', 'Grade 12 - STEM - 1st Sem', '3', 40, 'T. Marie Curie', 'Open'],
        ['BIO112-4', 'General Biology 1 (STEM)', 'Grade 12 - STEM - 1st Sem', '4', 40, 'T. Marie Curie', 'Open'],

        // ==========================================
        // GRADE 12 - STEM (2nd Sem)
        // ==========================================
        ['PAGS12-1', 'Pagsulat sa Filipino', 'Grade 12 - STEM - 2nd Sem', '1', 40, 'T. Angel Locsin', 'Open'],
        ['PAGS12-2', 'Pagsulat sa Filipino', 'Grade 12 - STEM - 2nd Sem', '2', 40, 'T. Angel Locsin', 'Open'],
        ['PAGS12-3', 'Pagsulat sa Filipino', 'Grade 12 - STEM - 2nd Sem', '3', 40, 'T. Angel Locsin', 'Open'],
        ['PAGS12-4', 'Pagsulat sa Filipino', 'Grade 12 - STEM - 2nd Sem', '4', 40, 'T. Angel Locsin', 'Open'],

        ['PE412-1', 'PE and Health 4', 'Grade 12 - STEM - 2nd Sem', '1', 40, 'T. Francisco Balagtas', 'Open'],
        ['PE412-2', 'PE and Health 4', 'Grade 12 - STEM - 2nd Sem', '2', 40, 'T. Francisco Balagtas', 'Open'],
        ['PE412-3', 'PE and Health 4', 'Grade 12 - STEM - 2nd Sem', '3', 40, 'T. Francisco Balagtas', 'Open'],
        ['PE412-4', 'PE and Health 4', 'Grade 12 - STEM - 2nd Sem', '4', 40, 'T. Francisco Balagtas', 'Open'],

        ['ENTR12-1', 'Entrepreneurship', 'Grade 12 - STEM - 2nd Sem', '1', 40, 'T. Warren Buffet', 'Open'],
        ['ENTR12-2', 'Entrepreneurship', 'Grade 12 - STEM - 2nd Sem', '2', 40, 'T. Warren Buffet', 'Open'],
        ['ENTR12-3', 'Entrepreneurship', 'Grade 12 - STEM - 2nd Sem', '3', 40, 'T. Warren Buffet', 'Open'],
        ['ENTR12-4', 'Entrepreneurship', 'Grade 12 - STEM - 2nd Sem', '4', 40, 'T. Warren Buffet', 'Open'],

        ['INQ12-1', 'Inquiries and Immersions', 'Grade 12 - STEM - 2nd Sem', '1', 40, 'T. Jane C. Villa', 'Open'],
        ['INQ12-2', 'Inquiries and Immersions', 'Grade 12 - STEM - 2nd Sem', '2', 40, 'T. Jane C. Villa', 'Open'],
        ['INQ12-3', 'Inquiries and Immersions', 'Grade 12 - STEM - 2nd Sem', '3', 40, 'T. Jane C. Villa', 'Open'],
        ['INQ12-4', 'Inquiries and Immersions', 'Grade 12 - STEM - 2nd Sem', '4', 40, 'T. Jane C. Villa', 'Open'],

        ['PHY212-1', 'General Physics 2 (STEM)', 'Grade 12 - STEM - 2nd Sem', '1', 40, 'T. Marie Curie', 'Open'],
        ['PHY212-2', 'General Physics 2 (STEM)', 'Grade 12 - STEM - 2nd Sem', '2', 40, 'T. Marie Curie', 'Open'],
        ['PHY212-3', 'General Physics 2 (STEM)', 'Grade 12 - STEM - 2nd Sem', '3', 40, 'T. Marie Curie', 'Open'],
        ['PHY212-4', 'General Physics 2 (STEM)', 'Grade 12 - STEM - 2nd Sem', '4', 40, 'T. Marie Curie', 'Open'],

        ['BIO212-1', 'General Biology 2 (STEM)', 'Grade 12 - STEM - 2nd Sem', '1', 40, 'T. Marie Curie', 'Open'],
        ['BIO212-2', 'General Biology 2 (STEM)', 'Grade 12 - STEM - 2nd Sem', '2', 40, 'T. Marie Curie', 'Open'],
        ['BIO212-3', 'General Biology 2 (STEM)', 'Grade 12 - STEM - 2nd Sem', '3', 40, 'T. Marie Curie', 'Open'],
        ['BIO212-4', 'General Biology 2 (STEM)', 'Grade 12 - STEM - 2nd Sem', '4', 40, 'T. Marie Curie', 'Open'],

        ['STEMW12-1', 'STEM Work Immersion', 'Grade 12 - STEM - 2nd Sem', '1', 40, 'T. Alan Turing', 'Open'],
        ['STEMW12-2', 'STEM Work Immersion', 'Grade 12 - STEM - 2nd Sem', '2', 40, 'T. Alan Turing', 'Open'],
        ['STEMW12-3', 'STEM Work Immersion', 'Grade 12 - STEM - 2nd Sem', '3', 40, 'T. Alan Turing', 'Open'],
        ['STEMW12-4', 'STEM Work Immersion', 'Grade 12 - STEM - 2nd Sem', '4', 40, 'T. Alan Turing', 'Open']
    ];

    courses.forEach(c => insertCourse.run(c));
    insertCourse.finalize();
});

db.close((err) => {
    if (err) {
        console.error("Error closing database:", err.message);
    } else {
        console.log("Successfully added all teachers, students, and courses to the database!");
    }
});