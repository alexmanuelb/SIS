require('dotenv').config();
const { Pool } = require('pg');

// Connect to Neon
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function seedDatabase() {
    console.log("Starting database seeding...");

    try {
        // 1. Drop tables if they exist (to start fresh)
        await pool.query(`
            DROP TABLE IF EXISTS enrollments;
            DROP TABLE IF EXISTS grades;
            DROP TABLE IF EXISTS students;
            DROP TABLE IF EXISTS courses;
            DROP TABLE IF EXISTS users;
        `);

        // 2. Create Tables
        await pool.query(`
            CREATE TABLE users (
                username VARCHAR(50) PRIMARY KEY,
                password VARCHAR(100) NOT NULL,
                name VARCHAR(100),
                role VARCHAR(20),
                section VARCHAR(100)
            );
            
            CREATE TABLE students (
                id VARCHAR(50) PRIMARY KEY,
                last VARCHAR(50),
                first VARCHAR(50),
                mi VARCHAR(10),
                address VARCHAR(150),
                course VARCHAR(50),
                yr VARCHAR(50),
                status VARCHAR(20),
                enrol VARCHAR(20),
                username VARCHAR(50),
                password VARCHAR(100),
                birthday DATE
            );

            CREATE TABLE courses (
                code VARCHAR(50) PRIMARY KEY,
                name VARCHAR(100),
                gradeLevel VARCHAR(50),
                section VARCHAR(10),
                capacity INT,
                adviser VARCHAR(100),
                status VARCHAR(20)
            );

            CREATE TABLE enrollments (
                id SERIAL PRIMARY KEY,
                studentId VARCHAR(50) REFERENCES students(id),
                courseCode VARCHAR(50) REFERENCES courses(code),
                section VARCHAR(10),
                term VARCHAR(50)
            );

            CREATE TABLE grades (
                id SERIAL PRIMARY KEY,
                studentId VARCHAR(50) REFERENCES students(id),
                courseCode VARCHAR(50),
                courseName VARCHAR(100),
                units INT,
                grade VARCHAR(20),
                term VARCHAR(50)
            );
        `);

        // 3. Insert Users
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

        for (let user of users) {
            await pool.query(`INSERT INTO users (username, password, name, role, section) VALUES ($1, $2, $3, $4, $5)`, user);
        }
        console.log("Users inserted!");

        // 4. Insert Students
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

        for (let s of students) {
            await pool.query(`INSERT INTO students (id, last, first, mi, address, course, yr, status, enrol, username, password, birthday) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`, s);
        }
        console.log("Students inserted!");

        // 5. Insert Courses (Truncated for space, include your full array)
        const courses = [
            ['KIN-VAL', 'Values Education', 'Kinder', '1', 20, 'T. Mary C. Poppins', 'Open'],
            ['KIN-PHY', 'Physical Health & Motor Dev', 'Kinder', '1', 20, 'T. Mary C. Poppins', 'Open'],
            // ... KEEP ALL YOUR OTHER COURSES HERE ...
            ['ENG10-1', 'English 10', 'Grade 10', '1', 35, 'T. Emily Bronte', 'Open'],
            ['STEMW12-4', 'STEM Work Immersion', 'Grade 12 - STEM - 2nd Sem', '4', 40, 'T. Alan Turing', 'Open']
        ];

        for (let c of courses) {
            await pool.query(`INSERT INTO courses (code, name, gradeLevel, section, capacity, adviser, status) VALUES ($1, $2, $3, $4, $5, $6, $7)`, c);
        }
        console.log("Courses inserted!");

        console.log("Database seeded successfully!");
    } catch (err) {
        console.error("Error seeding database:", err);
    } finally {
        await pool.end();
    }
}

seedDatabase();