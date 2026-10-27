/* =========================================================
   EduTrack SIS - Logic & Data
   ✅ Billing removed
   ✅ Role toggle removed (auto-redirect by role)
   ✅ Attendance page (Faculty)
   ✅ Class Records folders (Faculty)
   ✅ Student Records folders (Student)
   ✅ Schedule from DB (no overlap)
   ✅ Units removed from Grade Entry
   ✅ Admin can create new course + section
   ========================================================= */

let db = {
  students: [], courses: [], users: [], grades: [],
  enrollments: [], schedules: [], records: [], attendance: []
};

let session = null;
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ---------- LOGIN & LOGOUT ---------- */
async function doLogin() {
  const username = $('loginUser').value.trim();
  const password = $('loginPass').value.trim();

  if (!username || !password) { alert('Please enter both username and password'); return; }

  try {
    const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    const data = await response.json();
    if (!response.ok) { alert(data.error); return; }

    session = data;

    db.students   = await (await fetch('/api/students')).json();
    db.courses    = await (await fetch('/api/courses')).json();
    db.users      = await (await fetch('/api/users')).json();
    db.schedules  = await (await fetch('/api/schedules')).json();

    if (session.role === 'Student') {
        const student = currentStudent();
        if (student) {
            db.enrollments = await (await fetch(`/api/enrollments/${student.id}`)).json();
            db.grades      = await (await fetch(`/api/student/grades/${student.id}`)).json();
            db.records     = await (await fetch(`/api/student/records/${student.id}`)).json();
        }
    }

    $('loginScreen').style.display = 'none';
    $('appScreen').style.display = 'flex';
    $('whoami').textContent = `${session.name} - ${session.role}`;

    buildSidebar();

    let startPage;
    if (session.role === 'Admin')        startPage = 'adminDashboard';
    else if (session.role === 'Faculty') startPage = 'facultyDashboard';
    else                                 startPage = 'studentDashboard';

    navigate(startPage);
    
    // Start Clock
    setInterval(() => {
        const now = new Date();
        $('clock').textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }, 1000);

  } catch (error) {
    console.error("Login error:", error);
    alert("Failed to connect to server. Is it running?");
  }
}

function doLogout() {
  if (confirm("Are you sure you want to log out?")) {
      session = null;
      $('appScreen').style.display = 'none';
      $('loginScreen').style.display = 'flex';
      $('loginUser').value = ''; $('loginPass').value = '';
  }
}

/* ---------- SIDEBAR ---------- */
const MENUS = {
  Admin: [
    { key:'adminDashboard', label:'Dashboard' },
    { key:'students', label:'Student Records Management', children:[
      { key:'activeDirectory', label:'Active Student Directory' },
      { key:'legacy', label:'Legacy Record Archive' }
    ]},
    { key:'courses', label:'Course & Section Management' },
    { key:'users', label:'Users Roles & Access Control' }
  ],
  Faculty: [
    { key:'facultyDashboard', label:'Dashboard' },
    { key:'classRecords', label:'Class Records' },
    { key:'gradeEntry', label:'Grade Entry Submission' },
    { key:'attendance', label:'Attendance' }
  ],
  Student: [
    { key:'studentDashboard', label:'Dashboard' },
    { key:'registration', label:'Online Course Registration' },
    { key:'schedule', label:'View Class Schedule' },
    { key:'profileGrades', label:'Academic Profile & Grades' },
    { key:'studentRecords', label:'My Records (All Grade Levels)' },
    { key:'profile', label:'Student Profile' }
  ]
};

function buildSidebar() {
  const nav = $('sidebar');
  
  let menuHTML = `<div class="portal-title" style="padding: 15px 20px; font-size: 12px; letter-spacing: 1px; opacity: 0.8; color: white;">${session.role} Portal</div>`;
  
  MENUS[session.role].forEach(item => {
    menuHTML += `<button class="menu-item" data-key="${item.key}" onclick="navigate('${item.key}'); highlight('${item.key}');" style="width: 100%; text-align: left; padding: 12px 20px; border: none; background: transparent; color: #ffcccc; cursor: pointer; font-size: 14px;">${item.label}</button>`;
    
    if (item.children) {
      item.children.forEach(c => {
        menuHTML += `<button class="sub menu-item" data-key="${c.key}" onclick="navigate('${c.key}'); highlight('${c.key}');" style="width: 100%; text-align: left; padding: 10px 20px 10px 40px; border: none; background: transparent; color: #ffcccc; cursor: pointer; font-size: 13px;">— ${c.label}</button>`;
      });
    }
  });

  menuHTML += `
    <div style="margin-top: auto; padding: 20px; border-top: 1px solid rgba(255,255,255,0.1);">
        <button class="logout-btn" style="width: 100%; background: white; color: #5c0000; border: 2px solid white; font-weight: bold; padding: 12px; cursor: pointer; border-radius: 5px; text-align: center; font-size: 14px;" onclick="doLogout()">Logout</button>
    </div>`;
  nav.innerHTML = menuHTML;
}

function highlight(key) {
  document.querySelectorAll('#sidebar .menu-item').forEach(b => {
      if (b.dataset.key === key) {
          b.style.background = '#800000';
          b.style.color = 'white';
          b.style.fontWeight = 'bold';
          b.style.borderLeft = '4px solid #ffcccc';
      } else {
          b.style.background = 'transparent';
          b.style.color = '#ffcccc';
          b.style.fontWeight = 'normal';
          b.style.borderLeft = '4px solid transparent';
      }
  });
}

function navigate(page) {
  const c = $('content');
  const R = {
    adminDashboard: renderAdminDashboard,
    facultyDashboard: renderFacultyDashboard,
    studentDashboard: renderStudentDashboard,
    students: renderActiveDirectory,
    activeDirectory: renderActiveDirectory,
    legacy: renderLegacy,
    courses: renderCourses,
    users: renderUsers,
    classRecords: renderClassRecords,
    gradeEntry: renderGradeEntry,
    attendance: renderAttendance,
    registration: renderRegistration,
    schedule: renderSchedule,
    profileGrades: renderProfileGrades,
    studentRecords: renderStudentRecords,
    profile: renderStudentProfile
  };
  (R[page] || renderAdminDashboard)(c);
}

/* ---------- HELPERS ---------- */
function simpleTable(headers, rows) {
  if (!rows.length) return `<p class="empty-note" style="color:#999; font-style:italic;">No records to display.</p>`;
  return `<table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

function filterTable(tableId, inputId) {
  const q = $(inputId).value.toLowerCase();
  document.querySelectorAll(`#${tableId} tbody tr`).forEach(tr => {
    tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
}

function currentStudent() {
    let student = db.students.find(s => s.username === session.username) || db.students.find(s => s.id === session.username);
    return student || {id:'', first:'', last:'', course:'', yr:'', birthday:'', status:''};
}

/* ---------- DASHBOARDS ---------- */
function renderAdminDashboard(c) {
  c.innerHTML = `
    <div class="panel">
        <h2>System Overview</h2>
        <p style="margin-bottom: 20px; color: #666;">Welcome back, Admin. Here is the current status of EduTrack.</p>
        <div class="cards" style="display:flex; gap:15px; margin-bottom: 20px;">
            <div class="card" style="flex:1; padding:20px; background: linear-gradient(135deg, #800000, #5c0000); color:white; border-radius:8px;">
                <div style="font-size:24px; font-weight:bold;">${db.students.length}</div><div>Total Students</div>
            </div>
            <div class="card" style="flex:1; padding:20px; background: linear-gradient(135deg, #a00000, #800000); color:white; border-radius:8px;">
                <div style="font-size:24px; font-weight:bold;">${db.courses.length}</div><div>Total Courses</div>
            </div>
            <div class="card" style="flex:1; padding:20px; background: linear-gradient(135deg, #c00000, #a00000); color:white; border-radius:8px;">
                <div style="font-size:24px; font-weight:bold;">${db.users.length}</div><div>Registered Users</div>
            </div>
        </div>
    </div>`;
}

async function renderFacultyDashboard(c) {
  const myCourses = db.courses.filter(course => course.adviser === session.name);
  c.innerHTML = `
    <div class="panel">
        <h2>Faculty Dashboard</h2>
        <p style="margin-bottom: 20px; color: #666;">Welcome, <b>${esc(session.name)}</b>.</p>
        <div class="cards" style="display:flex; gap:15px;">
            <div class="card" style="flex:1; padding:20px; background: linear-gradient(135deg, #800000, #5c0000); color:white; border-radius:8px;">
                <div style="font-size:24px; font-weight:bold;">${myCourses.length}</div><div>My Courses</div>
            </div>
        </div>
    </div>`;
}

function renderStudentDashboard(c) {
  const s = currentStudent();
  c.innerHTML = `
    <div class="panel">
        <h2>Student Dashboard</h2>
        <p style="margin-bottom: 20px; color: #666;">Hello, <b>${esc(s.first)}</b>! Here is your academic summary.</p>
        <div class="cards" style="display:flex; gap:15px;">
            <div class="card" style="flex:1; padding:20px; background: linear-gradient(135deg, #800000, #5c0000); color:white; border-radius:8px;">
                <div style="font-size:24px; font-weight:bold;">${db.enrollments.length}</div><div>Enrolled Courses</div>
            </div>
        </div>
    </div>`;
}

/* ---------- STUDENT REGISTRATION ---------- */
function renderRegistration(c) {
  const s = currentStudent();
  c.innerHTML = `<div class="panel"><h2>Online Course Registration</h2><div id="registrationTableArea"></div></div>`;
  drawRegistrationTable();
}

function drawRegistrationTable() {
  const s = currentStudent();
  const myEnrolledCourseNames = db.enrollments
      .filter(e => e.studentId === s.id)
      .map(e => { const course = db.courses.find(c => c.code === e.courseCode); return course ? course.name : null; })
      .filter(name => name !== null);

  const availableCourses = db.courses.filter(course => {
      let matchesGradeAndSem = (s.yr && s.yr.includes('-')) ? course.gradeLevel === s.yr : course.gradeLevel.startsWith(s.yr);
      const isOpen = course.status === 'Open';
      const alreadyTaken = myEnrolledCourseNames.includes(course.name);
      return matchesGradeAndSem && isOpen && !alreadyTaken;
  });

  $('registrationTableArea').innerHTML = simpleTable(
      ['Course Code', 'Course Name', 'Section', 'Action'],
      availableCourses.map(x => [
          esc(x.code), esc(x.name), esc(x.section),
          `<button class="btn" onclick="enrollCourse('${esc(x.code)}', '${esc(x.section)}')">Enroll</button>`
      ])
  );
}

async function enrollCourse(courseCode, section) {
    const s = currentStudent();
    const response = await fetch('/api/enroll', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: s.id, courseCode, section, term: '1st Sem' })
    });
    const data = await response.json();
    if (!response.ok) { alert(data.error); return; }
    db.enrollments = await (await fetch(`/api/enrollments/${s.id}`)).json();
    db.courses     = await (await fetch('/api/courses')).json();
    drawRegistrationTable();
    alert("Successfully Enrolled!");
}

/* ---------- STUDENT SCHEDULE ---------- */
async function renderSchedule(c) {
    const s = currentStudent();
    c.innerHTML = `<div class="panel"><h2>Weekly Class Schedule</h2><p>Loading schedule...</p></div>`;

    const sched = await (await fetch(`/api/schedules/${encodeURIComponent(s.yr)}/1`)).json();
    if (!sched.length) {
        c.innerHTML = `<div class="panel"><h2>Weekly Class Schedule</h2><p>No schedule found.</p></div>`;
        return;
    }
    c.innerHTML = `
    <div class="panel">
        <h2>Weekly Class Schedule</h2>
        <table>
            <thead><tr><th>Day</th><th>Time</th><th>Course</th><th>Adviser</th></tr></thead>
            <tbody>${sched.map(x => `<tr><td>${esc(x.day)}</td><td>${esc(x.startTime)} - ${esc(x.endTime)}</td><td>${esc(x.courseName)}</td><td>${esc(x.adviser)}</td></tr>`).join('')}</tbody>
        </table>
    </div>`;
}

/* ---------- STUDENT PROFILE ---------- */
function renderStudentProfile(c) {
    const s = currentStudent();
    c.innerHTML = `<div class="panel"><h2>Student Profile</h2>
        <p><b>Name:</b> ${esc(s.first)} ${esc(s.mi)} ${esc(s.last)}</p>
        <p><b>ID:</b> ${esc(s.id)}</p>
        <p><b>Year Level:</b> ${esc(s.yr)}</p>
        <p><b>Address:</b> ${esc(s.address)}</p>
    </div>`;
}

/* ---------- ADMIN: USERS ---------- */
function renderUsers(c) {
  const rows = db.users.map(u => [
      `<b>${esc(u.username)}</b>`, esc(u.name), esc(u.role), esc(u.section || '—'),
      `<button class="btn" onclick="openEditUserForm('${esc(u.username)}')">Edit</button>`
  ]);
  c.innerHTML = `<div class="panel"><h2>Users Roles & Access Control</h2><div id="editUserFormArea"></div>${simpleTable(['Username', 'Full Name', 'Role', 'Section', 'Action'], rows)}</div>`;
}

function openEditUserForm(username) {
    const user = db.users.find(u => u.username === username);
    $('editUserFormArea').innerHTML = `
        <div class="panel" style="background:#f6f9fd; border: 2px solid #800000; margin-bottom:15px;">
            <h3>Edit: ${esc(user.username)}</h3>
            <div class="field"><label>New Password</label><input type="password" id="u_pass"></div>
            <div class="field"><label>Name</label><input id="u_name" value="${esc(user.name)}"></div>
            <button class="btn" onclick="saveUserEdit('${esc(user.username)}')">Save</button>
            <button class="btn secondary" onclick="$('editUserFormArea').innerHTML=''">Cancel</button>
        </div>`;
}

async function saveUserEdit(username) {
    await fetch('/api/users/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password: $('u_pass').value, name: $('u_name').value, role: 'Student', section: '' }) });
    db.users = await (await fetch('/api/users')).json();
    renderUsers($('content'));
}

/* ---------- ADMIN: COURSES ---------- */
function renderCourses(c) {
  c.innerHTML = `
    <div class="panel">
        <h2>Course Management</h2>
        <div id="courseFormArea"></div>
        <button class="btn" style="margin-bottom: 15px;" onclick="openCourseForm()">+ New Course</button>
        <div id="courseTableContainer"></div>
    </div>`;
  renderCoursesTable();
}

function openCourseForm() {
    $('courseFormArea').innerHTML = `
        <div class="panel" style="background:#f9eaea; border: 2px solid #800000; margin-bottom:15px;">
            <h3>Create New Course</h3>
            <div class="field"><label>Code</label><input id="c_code"></div>
            <div class="field"><label>Name</label><input id="c_name"></div>
            <div class="field"><label>Grade Level</label><input id="c_grade"></div>
            <div class="field"><label>Section</label><input id="c_section"></div>
            <div class="field"><label>Adviser</label><input id="c_adviser"></div>
            <button class="btn" onclick="saveCourse()">Create</button>
            <button class="btn secondary" onclick="$('courseFormArea').innerHTML=''">Cancel</button>
        </div>`;
}

async function saveCourse() {
    const rec = { code: $('c_code').value, name: $('c_name').value, gradeLevel: $('c_grade').value, section: $('c_section').value, adviser: $('c_adviser').value };
    const res = await fetch('/api/courses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rec) });
    if (res.ok) { $('courseFormArea').innerHTML = ''; db.courses = await (await fetch('/api/courses')).json(); renderCoursesTable(); }
    else alert('Failed');
}

function renderCoursesTable() {
  const rows = db.courses.map(x => [esc(x.code), esc(x.name), esc(x.gradeLevel), esc(x.section), esc(x.adviser)]);
  $('courseTableContainer').innerHTML = simpleTable(['Code', 'Name', 'Grade Level', 'Section', 'Adviser'], rows);
}

/* ---------- ADMIN: STUDENT DIRECTORY ---------- */
function renderActiveDirectory(c) {
  c.innerHTML = `<div class="panel"><h2>Active Student Directory</h2><div id="enrollmentFormArea"></div><div id="activeTable"></div></div>`;
  drawActiveTable();
}

function drawActiveTable() {
  const active = db.students.filter(s => s.status !== 'Archived');
  $('activeTable').innerHTML = simpleTable(['ID', 'Last Name', 'First Name', 'Year', 'Status', 'Action'],
    active.map(s => [esc(s.id), esc(s.last), esc(s.first), esc(s.yr), esc(s.status), `<button class="btn" onclick="openEnrollmentForm('${esc(s.id)}')">Edit</button>`])
  );
}

function renderLegacy(c) {
  const arch = db.students.filter(s => s.status === 'Archived');
  c.innerHTML = `<div class="panel"><h2>Legacy Archive</h2>${simpleTable(['ID', 'Name', 'Status'], arch.map(s => [esc(s.id), esc(s.last+', '+s.first), esc(s.status)]))}</div>`;
}

function openEnrollmentForm(id) {
  const s = id ? db.students.find(x => x.id === id) : null;
  $('enrollmentFormArea').innerHTML = `
    <div class="panel" style="background:#f6f9fd; border: 2px solid #800000; margin-bottom:15px;">
        <h3>${s ? 'Edit Student' : 'New Student'}</h3>
        <div class="field"><label>ID</label><input id="f_id" value="${esc(s?.id||'')}" ${s?'readonly':''}></div>
        <div class="field"><label>Last Name</label><input id="f_last" value="${esc(s?.last||'')}"></div>
        <div class="field"><label>First Name</label><input id="f_first" value="${esc(s?.first||'')}"></div>
        <div class="field"><label>Year Level</label><input id="f_yr" value="${esc(s?.yr||'')}"></div>
        <button class="btn" onclick="saveStudent('${esc(s?.id||'')}')">Save</button>
    </div>`;
}

async function saveStudent(existingId) {
  const rec = { id: $('f_id').value, last: $('f_last').value, first: $('f_first').value, yr: $('f_yr').value, status: 'Active' };
  await fetch('/api/students', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rec) });
  db.students = await (await fetch('/api/students')).json();
  $('enrollmentFormArea').innerHTML = ''; drawActiveTable();
}

/* ---------- FACULTY: CLASS RECORDS ---------- */
async function renderClassRecords(c) {
  const myCourses = db.courses.filter(course => course.adviser === session.name);
  const groups = {};
  myCourses.forEach(cr => {
      const key = `${cr.gradeLevel} | Section ${cr.section}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(cr);
  });

  let html = `<div class="panel"><h2>Class Records</h2>`;
  Object.keys(groups).forEach(key => {
      html += `<div class="folder" onclick="showClassFolder('${esc(key)}')">📁 ${esc(key)}</div>`;
  });
  html += `<div id="classFolderView"></div></div>`;
  c.innerHTML = html;
  window._classGroups = groups;
}

async function showClassFolder(key) {
  const courses = window._classGroups[key] || [];
  const codes = courses.map(c => c.code);
  let rows = [];
  for (const s of db.students) {
      const en = await (await fetch(`/api/enrollments/${s.id}`)).json();
      if (en.some(e => codes.includes(e.courseCode))) rows.push([esc(s.id), esc(s.last+', '+s.first)]);
  }
  $('classFolderView').innerHTML = `<h3>${esc(key)} Students</h3>${simpleTable(['ID', 'Name'], rows)}`;
}

/* ---------- FACULTY: GRADE ENTRY ---------- */
function renderGradeEntry(c) {
  c.innerHTML = `
    <div class="panel"><h2>Grade Entry</h2>
        <div class="field"><label>Student ID</label><input id="g_sid"></div>
        <div class="field"><label>Course Name</label><input id="g_cname"></div>
        <div class="field"><label>Grade</label><input id="g_grade" type="number" step="0.25"></div>
        <button class="btn" onclick="submitGrade()">Submit</button>
    </div>`;
}

async function submitGrade() {
    const rec = { studentId: $('g_sid').value, courseCode: 'N/A', courseName: $('g_cname').value, grade: parseFloat($('g_grade').value), term: '1st Sem 2026-2027' };
    await fetch('/api/grades', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rec) });
    alert("Grade submitted!"); $('g_sid').value = ''; $('g_cname').value = ''; $('g_grade').value = '';
}

/* ---------- FACULTY: ATTENDANCE ---------- */
async function renderAttendance(c) {
  const myCourses = db.courses.filter(course => course.adviser === session.name);
  c.innerHTML = `<div class="panel"><h2>Attendance</h2>
    <div class="field"><label>Course</label>
        <select id="att_course">${myCourses.map(x => `<option value="${esc(x.code)}">${esc(x.name)}</option>`).join('')}</select>
    </div>
    <div class="field"><label>Date</label><input type="date" id="att_date" value="${new Date().toISOString().slice(0,10)}"></div>
    <button class="btn" onclick="loadAttendance()">Load</button>
    <div id="att_list" style="margin-top:20px;"></div>
  </div>`;
}

async function loadAttendance() {
    const code = $('att_course').value;
    const date = $('att_date').value;
    const crs = db.courses.find(x => x.code === code);
    let list = [];
    for (const s of db.students) {
        const en = await (await fetch(`/api/enrollments/${s.id}`)).json();
        if (en.some(e => e.courseCode === code)) list.push(s);
    }
    const existing = await (await fetch(`/api/attendance/${code}/${crs.section}/${date}`)).json();
    const map = {}; existing.forEach(e => map[e.studentId] = e.status);

    $('att_list').innerHTML = `<table><thead><tr><th>Student</th><th>Status</th></tr></thead><tbody>
      ${list.map(s => `<tr><td>${esc(s.last+', '+s.first)}</td><td>
        <select onchange="markAttendance('${esc(code)}','${esc(crs.section)}','${esc(s.id)}','${esc(date)}', this.value)">
            <option value="Present" ${map[s.id]==='Present'?'selected':''}>Present</option>
            <option value="Absent" ${map[s.id]==='Absent'?'selected':''}>Absent</option>
            <option value="Late" ${map[s.id]==='Late'?'selected':''}>Late</option>
        </select></td></tr>`).join('')}
    </tbody></table>`;
}

async function markAttendance(courseCode, section, studentId, date, status) {
    await fetch('/api/attendance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ courseCode, section, studentId, date, status }) });
}

/* ---------- STUDENT: GRADES & RECORDS ---------- */
async function renderProfileGrades(c) {
    const s = currentStudent();
    const myGrades = await (await fetch(`/api/student/grades/${s.id}`)).json();
    const enrolled = db.enrollments.filter(e => e.studentId === s.id);
    
    const rows = enrolled.map(enroll => {
        const crs = db.courses.find(c => c.code === enroll.courseCode) || {};
        const g = myGrades.find(x => x.courseName === crs.name);
        return [esc(crs.code), esc(crs.name), g ? `<b>${esc(g.grade)}</b>` : 'Not graded'];
    });
    c.innerHTML = `<div class="panel"><h2>My Grades</h2>${simpleTable(['Code', 'Name', 'Grade'], rows)}</div>`;
}

async function renderStudentRecords(c) {
    const s = currentStudent();
    const records = await (await fetch(`/api/student/records/${s.id}`)).json();
    const groups = {};
    records.forEach(r => { if (!groups[r.gradeLevel]) groups[r.gradeLevel] = []; groups[r.gradeLevel].push(r); });

    let html = `<div class="panel"><h2>My Records</h2>`;
    Object.keys(groups).forEach(k => { html += `<div class="folder" onclick="showRecordFolder('${esc(k)}')">📁 ${esc(k)}</div>`; });
    html += `<div id="recordView"></div></div>`;
    c.innerHTML = html;
    window._studentRecords = groups;
}

function showRecordFolder(grade) {
    const rows = (window._studentRecords || {})[grade] || [];
    $('recordView').innerHTML = `<h3>${esc(grade)}</h3>${simpleTable(['School Year','Subject','Grade','Status'], rows.map(r => [esc(r.schoolYear), esc(r.subject), `<b>${esc(r.grade)}</b>`, esc(r.status)]))}`;
}