let db = { students: [], courses: [], users: [], enrollments: [], grades: [], schedules: [], attendance: [], records: [] };
let session = null;
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ---------- LOGIN & LOGOUT ---------- */
function togglePassword() {
  const p = $('loginPass');
  p.type = p.type === 'password' ? 'text' : 'password';
}

async function doLogin() {
  const username = $('loginUser').value.trim();
  const password = $('loginPass').value.trim();
  if (!username || !password) return alert('Enter username and password');
  
  try {
    const res = await fetch('/api/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) return alert(data.error);
    
    session = data;
    
    db.students = await (await fetch('/api/students')).json();
    db.courses = await (await fetch('/api/courses')).json();
    db.users = await (await fetch('/api/users')).json();
    db.schedules = await (await fetch('/api/schedules')).json();
    
    if (session.role === 'Student') {
      const s = currentStudent();
      if (s) {
        db.enrollments = await (await fetch('/api/enrollments/' + s.id)).json();
        db.grades = await (await fetch('/api/student/grades/' + s.id)).json();
        db.records = await (await fetch('/api/student/records/' + s.id)).json();
      }
    }
    
    $('loginScreen').style.display = 'none';
    $('appScreen').style.display = 'flex';
    $('topUserDisplay').style.display = 'block';
    $('topUserDisplay').textContent = session.name + ' - ' + session.role;
    $('whoami').textContent = session.name;
    
    buildSidebar();
    
    if (session.role === 'Admin') navigate('adminDashboard');
    else if (session.role === 'Faculty') navigate('facultyDashboard');
    else navigate('studentDashboard');
    
    setInterval(() => { $('clock').textContent = new Date().toLocaleTimeString(); }, 1000);
  } catch (e) { alert('Login failed. Is server running?'); }
}

function doLogout() {
  if (!confirm('Log out?')) return;
  session = null;
  $('appScreen').style.display = 'none';
  $('loginScreen').style.display = 'flex';
  $('topUserDisplay').style.display = 'none';
  $('loginUser').value = ''; $('loginPass').value = '';
}

/* ---------- SIDEBAR ---------- */
const MENUS = {
  Admin: [
    { key: 'adminDashboard', label: 'Dashboard' },
    { key: 'activeDirectory', label: 'Student Directory' },
    { key: 'facultyDirectory', label: 'Faculty Directory' },
    { key: 'courses', label: 'Course Management' },
    { key: 'users', label: 'Users & Access' }
  ],
  Faculty: [
    { key: 'facultyDashboard', label: 'Dashboard' },
    { key: 'classRecords', label: 'Class Records' },
    { key: 'gradeEntry', label: 'Grade Entry' },
    { key: 'attendance', label: 'Attendance' }
  ],
  Student: [
    { key: 'studentDashboard', label: 'Dashboard' },
    { key: 'registration', label: 'Course Registration' },
    { key: 'schedule', label: 'Class Schedule' },
    { key: 'profileGrades', label: 'Academic Profile' },
    { key: 'studentRecords', label: 'My Records' },
    { key: 'profile', label: 'Student Profile' }
  ]
};

function buildSidebar() {
  const nav = $('sidebar');
  let html = `<div class="portal-title">${session.role.toUpperCase()} PORTAL</div>`;
  MENUS[session.role].forEach(m => {
    html += `<button onclick="navigate('${m.key}', this)">${m.label}</button>`;
  });
  html += `<button class="logout-btn" onclick="doLogout()">Logout</button>`;
  nav.innerHTML = html;
  nav.querySelector('button').classList.add('active');
}

function navigate(page, btn) {
  if(btn) {
    document.querySelectorAll('#sidebar button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }
  
  const c = $('content');
  const R = {
    adminDashboard: renderAdminDashboard, 
    activeDirectory: renderActiveDirectory, 
    facultyDirectory: renderFacultyDirectory,
    courses: renderCourses, 
    users: renderUsers,
    facultyDashboard: renderFacultyDashboard, 
    classRecords: renderClassRecords, 
    gradeEntry: renderGradeEntry, 
    attendance: renderAttendance,
    studentDashboard: renderStudentDashboard, 
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
  if (!rows.length) return `<p style="color:#999; padding:20px; text-align:center;">No records found.</p>`;
  return `<table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

function currentStudent() {
  return db.students.find(s => s.username === session.username) || null;
}

/* ---------- DASHBOARDS ---------- */
function renderAdminDashboard(c) {
  const totalFaculty = db.users.filter(u => u.role === 'Faculty').length;
  c.innerHTML = `
    <div class="dashboard-cards">
      <div class="stat-card"><h3>${db.students.length}</h3><p>TOTAL STUDENTS</p></div>
      <div class="stat-card"><h3>${totalFaculty}</h3><p>FACULTY MEMBERS</p></div>
      <div class="stat-card"><h3>${db.courses.length}</h3><p>TOTAL COURSES</p></div>
      <div class="stat-card"><h3>${db.users.length}</h3><p>REGISTERED USERS</p></div>
    </div>
    <div class="panel">
      <h2>Admin Dashboard</h2>
      <p style="color:#666; font-size:15px;">Welcome back, <b>${esc(session.name)}</b>. Use the sidebar to manage records.</p>
    </div>`;
}

function renderFacultyDashboard(c) {
  const myCourses = db.courses.filter(x => x.adviser === session.name);
  c.innerHTML = `
    <div class="dashboard-cards">
      <div class="stat-card"><h3>${myCourses.length}</h3><p>MY COURSES</p></div>
    </div>
    <div class="panel">
      <h2>Faculty Dashboard</h2>
      <p style="color:#666; font-size:15px;">Welcome, <b>${esc(session.name)}</b>.</p>
    </div>`;
}

function renderStudentDashboard(c) {
  const s = currentStudent();
  c.innerHTML = `
    <div class="dashboard-cards">
      <div class="stat-card"><h3>${db.enrollments.length}</h3><p>ENROLLED COURSES</p></div>
      <div class="stat-card" style="background: linear-gradient(135deg, #a00000, #800000);">
        <h3 id="dash-clock" style="font-size:26px;">--:-- --</h3>
        <p>CURRENT TIME</p>
      </div>
    </div>
    <div class="panel">
      <h2>Student Dashboard</h2>
      <p style="color:#666; font-size:15px;">Hello, <b>${esc(s.first)}</b>! You are currently in <b>${esc(s.yr)}</b>.</p>
    </div>`;
  setInterval(() => { 
    if($('dash-clock')) $('dash-clock').textContent = new Date().toLocaleTimeString(); 
  }, 1000);
}

/* ---------- ADMIN: STUDENT DIRECTORY ---------- */
function renderActiveDirectory(c) {
  const active = db.students.filter(s => s.status !== 'Archived' && s.status !== 'Graduated');
  c.innerHTML = `<div class="panel"><h2>Student Directory</h2>
    <div id="enrollFormArea"></div>
    ${simpleTable(['Student ID','Last Name','First Name','Year Level','Status','Action'],
      active.map(s => [esc(s.id), esc(s.last), esc(s.first), esc(s.yr), `<span class="badge ${s.status === 'Active' ? 'active' : 'inactive'}">${esc(s.status)}</span>`,
        `<button class="btn" onclick="openStudentForm('${esc(s.id)}')">Edit</button>`]))}
    <button class="btn" style="margin-top:20px;" onclick="openStudentForm()">+ Add New Student</button>
  </div>`;
}

// RESTORED DROPDOWNS FOR COURSE, YEAR LEVEL, AND STATUS
function openStudentForm(id) {
  const s = id ? db.students.find(x => x.id === id) : null;
  const nextId = s ? s.id : '2026-' + Math.floor(1000 + Math.random() * 9000);
  
  // Parse existing Year Level if editing (e.g., "Grade 11 - STEM - 1st Sem" -> "Grade 11")
  let currentYear = s ? s.yr : 'Grade 7';
  if (currentYear && currentYear.includes('-')) {
      currentYear = currentYear.split('-')[0].trim();
  }

  const yearLevels = [
      'Kinder', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 
      'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'
  ];
  
  const statuses = ['Active', 'Archived', 'Graduated'];

  $('enrollFormArea').innerHTML = `
    <div class="form-panel">
      <h3 style="color:#5c0000; margin-bottom:15px;">${s ? 'Edit' : 'New'} Student Record</h3>
      <div class="form-grid">
        <div class="field"><label>Student No. (Auto-generated)</label><input id="f_id" value="${esc(nextId)}" readonly style="background:#e9ecef; cursor:not-allowed;"></div>
        <div class="field"><label>Last Name</label><input id="f_last" value="${esc(s?.last||'')}"></div>
        <div class="field"><label>First Name</label><input id="f_first" value="${esc(s?.first||'')}"></div>
        
        <div class="field">
          <label>Course / Dept</label>
          <select id="f_course">
            <option value="Elem" ${s?.course === 'Elem' ? 'selected' : ''}>Elementary</option>
            <option value="JHS" ${s?.course === 'JHS' ? 'selected' : ''}>Junior High School</option>
            <option value="SHS" ${s?.course === 'SHS' ? 'selected' : ''}>Senior High School</option>
          </select>
        </div>

        <div class="field">
          <label>Year Level</label>
          <select id="f_yr">
            ${yearLevels.map(y => `<option value="${y}" ${currentYear === y ? 'selected' : ''}>${y}</option>`).join('')}
          </select>
        </div>

        <div class="field">
          <label>Status</label>
          <select id="f_status">
            ${statuses.map(st => `<option value="${st}" ${s?.status === st ? 'selected' : ''}>${st}</option>`).join('')}
          </select>
        </div>

      </div>
      <button class="btn" onclick="saveStudent('${esc(s?.id||'')}')">Save Record</button>
      <button class="btn secondary" onclick="$('enrollFormArea').innerHTML=''">Cancel</button>
    </div>`;
}

async function saveStudent(existingId) {
  const rec = { 
    id: $('f_id').value, 
    last: $('f_last').value, 
    first: $('f_first').value, 
    course: $('f_course').value, 
    yr: $('f_yr').value, 
    status: $('f_status').value, 
    enrol: 'Enrolled' 
  };
  
  const res = await fetch('/api/students', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(rec) });
  const data = await res.json();
  if(!res.ok) return alert(data.error);
  
  db.students = await (await fetch('/api/students')).json();
  db.users = await (await fetch('/api/users')).json();
  
  $('enrollFormArea').innerHTML = ''; 
  renderActiveDirectory($('content')); 
  alert(existingId ? 'Student updated!' : 'Student added successfully!');
}

/* ---------- ADMIN: FACULTY DIRECTORY ---------- */
function renderFacultyDirectory(c) {
  const facultyList = db.users.filter(u => u.role === 'Faculty');
  
  const rows = facultyList.map(f => {
    const advised = db.courses.filter(crs => crs.adviser === f.name).map(crs => `${crs.gradeLevel} (Sec ${crs.section})`).join(', ');
    return [
      `<b>${esc(f.username)}</b>`,
      esc(f.name),
      advised || '<span style="color:#999;">None</span>',
      `<button class="btn secondary" onclick="alert('To edit faculty, please use the Users & Access page.')">Edit</button>`
    ];
  });

  c.innerHTML = `<div class="panel"><h2>Faculty Directory</h2>
    <div id="facultyFormArea"></div>
    ${simpleTable(['Username', 'Full Name', 'Advisory Class', 'Action'], rows)}
    <button class="btn" style="margin-top:20px;" onclick="openFacultyForm()">+ Add New Teacher</button>
  </div>`;
}

function openFacultyForm() {
  $('facultyFormArea').innerHTML = `
    <div class="form-panel">
      <h3 style="color:#5c0000; margin-bottom:15px;">Add New Teacher</h3>
      <div class="form-grid">
        <div class="field"><label>Username</label><input id="t_user" placeholder="e.g., tsmith"></div>
        <div class="field"><label>Password</label><input id="t_pass" type="password" placeholder="e.g., smith123"></div>
        <div class="field" style="grid-column: span 2;"><label>Full Name</label><input id="t_name" placeholder="e.g., T. John Smith"></div>
      </div>
      <button class="btn" onclick="saveFaculty()">Create Teacher Account</button>
      <button class="btn secondary" onclick="$('facultyFormArea').innerHTML=''">Cancel</button>
    </div>`;
}

async function saveFaculty() {
  const rec = { 
    username: $('t_user').value.trim(), 
    password: $('t_pass').value.trim(), 
    name: $('t_name').value.trim(), 
    role: 'Faculty', 
    section: '' 
  };
  if(!rec.username || !rec.password || !rec.name) return alert('Fill in all fields');
  
  const res = await fetch('/api/faculty', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(rec) });
  const data = await res.json();
  if(!res.ok) return alert(data.error);
  
  db.users = await (await fetch('/api/users')).json();
  $('facultyFormArea').innerHTML = '';
  renderFacultyDirectory($('content'));
  alert('Teacher account created!');
}

/* ---------- ADMIN: COURSES & SECTIONS ---------- */
function renderCourses(c) {
  c.innerHTML = `<div class="panel"><h2>Course & Section Management</h2>
    <div id="courseFormArea"></div>
    ${simpleTable(['Code','Name','Grade Level','Section','Adviser','Status'],
      db.courses.map(x => [esc(x.code), esc(x.name), esc(x.gradeLevel), esc(x.section), esc(x.adviser), `<span class="badge active">${esc(x.status)}</span>`]))}
    <div style="margin-top:20px; display:flex; gap:10px;">
      <button class="btn" onclick="openCourseForm()">+ Add New Subject</button>
      <button class="btn secondary" onclick="openSectionForm()">+ Add New Section</button>
    </div>
  </div>`;
}

function openCourseForm() {
  $('courseFormArea').innerHTML = `
    <div class="form-panel">
      <h3 style="color:#5c0000; margin-bottom:15px;">New Course</h3>
      <div class="form-grid">
        <div class="field"><label>Course Code</label><input id="c_code" placeholder="e.g., MATH7-1"></div>
        <div class="field"><label>Course Name</label><input id="c_name" placeholder="e.g., Mathematics 7"></div>
        <div class="field"><label>Grade Level</label><input id="c_grade" placeholder="e.g., Grade 7"></div>
        <div class="field"><label>Adviser</label><input id="c_adviser" placeholder="e.g., T. Jane"></div>
      </div>
      <button class="btn" onclick="saveCourse()">Save Subject</button>
      <button class="btn secondary" onclick="$('courseFormArea').innerHTML=''">Cancel</button>
    </div>`;
}

async function saveCourse() {
  const rec = { code: $('c_code').value, name: $('c_name').value, gradeLevel: $('c_grade').value, section: '1', adviser: $('c_adviser').value, capacity: 30, status: 'Open' };
  await fetch('/api/courses', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(rec) });
  db.courses = await (await fetch('/api/courses')).json();
  renderCourses($('content')); 
  alert('Subject added!');
}

function openSectionForm() {
  $('courseFormArea').innerHTML = `
    <div class="form-panel">
      <h3 style="color:#5c0000; margin-bottom:15px;">Create New Section</h3>
      <p style="font-size:13px; color:#666; margin-bottom:15px;">This will duplicate all subjects from Section 1 to the new section.</p>
      <div class="form-grid">
        <div class="field"><label>Grade Level</label><input id="s_grade" placeholder="e.g., Grade 7"></div>
        <div class="field"><label>New Section Name</label><input id="s_name" placeholder="e.g., 2"></div>
      </div>
      <button class="btn" onclick="createSection()">Create Section</button>
      <button class="btn secondary" onclick="$('courseFormArea').innerHTML=''">Cancel</button>
    </div>`;
}

async function createSection() {
  const grade = $('s_grade').value.trim();
  const secName = $('s_name').value.trim();
  if(!grade || !secName) return alert('Fill in all fields');
  
  const templates = db.courses.filter(c => c.gradeLevel === grade && c.section === '1');
  if(templates.length === 0) return alert('No courses found for this grade level in Section 1 to copy.');
  
  for(const t of templates) {
    const newCode = t.code.replace('-1', '-' + secName);
    await fetch('/api/courses', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: newCode, name: t.name, gradeLevel: t.gradeLevel, section: secName, capacity: t.capacity, adviser: '', status: 'Open' })
    });
  }
  db.courses = await (await fetch('/api/courses')).json();
  renderCourses($('content'));
  alert(`Section ${secName} created for ${grade}!`);
}

function renderUsers(c) {
  c.innerHTML = `<div class="panel"><h2>Users & Access</h2>
    ${simpleTable(['Username','Name','Role','Section'], db.users.map(u => [esc(u.username), esc(u.name), esc(u.role), esc(u.section||'—')]))}
  </div>`;
}

/* ---------- FACULTY PAGES ---------- */
async function renderClassRecords(c) {
  const myCourses = db.courses.filter(x => x.adviser === session.name);
  const groups = {};
  for (const crs of myCourses) {
    const key = crs.gradeLevel + ' | Section ' + crs.section;
    if (!groups[key]) groups[key] = [];
    groups[key].push(crs);
  }
  let html = `<div class="panel"><h2>Class Records</h2><p style="color:#666; margin-bottom:20px;">Click a folder to view enrolled students.</p>`;
  for (const key of Object.keys(groups)) {
    html += `<div class="folder" onclick="showClassFolder('${esc(key)}')"><span>📁 ${esc(key)}</span> <span>&rarr;</span></div>`;
  }
  if(Object.keys(groups).length === 0) html += `<p style="color:#999;">No advisory classes assigned to you.</p>`;
  html += `<div id="classFolderView"></div></div>`;
  c.innerHTML = html;
}

async function showClassFolder(key) {
  const [gradeLevel, sectionPart] = key.split(' | Section ');
  const section = sectionPart.trim();
  const myCourses = db.courses.filter(x => x.adviser === session.name && x.gradeLevel === gradeLevel && x.section === section);
  const codes = myCourses.map(c => c.code);
  let rows = [];
  for (const s of db.students) {
    const en = await (await fetch('/api/enrollments/' + s.id)).json();
    if (en.some(e => codes.includes(e.courseCode))) rows.push(s);
  }
  $('classFolderView').innerHTML = `<div class="panel" style="margin-top:20px; border:2px solid #5c0000;">
    <h3 style="color:#5c0000; margin-bottom:15px;">${esc(key)} — Enrolled Students</h3>
    ${simpleTable(['ID','Name','Year'], rows.map(s => [esc(s.id), esc(s.last+', '+s.first), esc(s.yr)]))}
  </div>`;
}

function renderGradeEntry(c) {
  c.innerHTML = `<div class="panel"><h2>Grade Entry</h2>
    <div class="form-panel">
      <div class="form-grid">
        <div class="field"><label>Student ID</label><input id="g_sid"></div>
        <div class="field"><label>Course Name</label><input id="g_cname"></div>
        <div class="field"><label>Grade (1.0 - 5.0)</label><input id="g_grade" type="number" step="0.25"></div>
        <div class="field"><label>Term</label><input id="g_term" value="1st Sem 2026-2027"></div>
      </div>
      <button class="btn" onclick="submitGrade()">Submit Grade</button>
    </div>
  </div>`;
}

async function submitGrade() {
  const rec = { studentId: $('g_sid').value, courseCode: 'N/A', courseName: $('g_cname').value, grade: parseFloat($('g_grade').value), term: $('g_term').value };
  await fetch('/api/grades', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(rec) });
  alert('Grade submitted!'); 
  $('g_sid').value = ''; $('g_cname').value = ''; $('g_grade').value = '';
}

function renderAttendance(c) {
  const myCourses = db.courses.filter(x => x.adviser === session.name);
  c.innerHTML = `<div class="panel"><h2>Attendance</h2>
    <div class="form-panel" style="display:flex; gap:20px; align-items:flex-end;">
      <div class="field" style="flex:1;"><label>Course</label>
        <select id="att_course">${myCourses.map(x=>`<option value="${esc(x.code)}">${esc(x.name)} — Sec ${esc(x.section)}</option>`).join('')}</select>
      </div>
      <div class="field" style="flex:1;"><label>Date</label><input type="date" id="att_date" value="${new Date().toISOString().slice(0,10)}"></div>
      <button class="btn" style="margin-bottom:2px;" onclick="loadAttendance()">Load Students</button>
    </div>
    <div id="att_list" style="margin-top:20px;"></div>
  </div>`;
}

async function loadAttendance() {
  const code = $('att_course').value;
  const date = $('att_date').value;
  const crs = db.courses.find(x => x.code === code);
  if (!crs) return;
  let list = [];
  for (const s of db.students) {
    const en = await (await fetch('/api/enrollments/' + s.id)).json();
    if (en.some(e => e.courseCode === code)) list.push(s);
  }
  const existing = await (await fetch(`/api/attendance/${code}/${crs.section}/${date}`)).json();
  const map = {}; existing.forEach(e => map[e.studentId] = e.status);
  
  $('att_list').innerHTML = `<table><thead><tr><th>Student Name</th><th>Status</th></tr></thead><tbody>
    ${list.map(s => `<tr><td>${esc(s.last+', '+s.first)}</td><td>
      <select onchange="markAttendance('${code}','${esc(crs.section)}','${esc(s.id)}','${date}', this.value)" style="padding:8px; border-radius:4px; border:1px solid #ccc;">
        <option value="Present" ${map[s.id]==='Present'?'selected':''}>Present</option>
        <option value="Absent" ${map[s.id]==='Absent'?'selected':''}>Absent</option>
        <option value="Late" ${map[s.id]==='Late'?'selected':''}>Late</option>
      </select></td></tr>`).join('')}
  </tbody></table>`;
}

async function markAttendance(courseCode, section, studentId, date, status) {
  await fetch('/api/attendance', { method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ courseCode, section, studentId, date, status }) });
}

/* ---------- STUDENT PAGES ---------- */
function renderRegistration(c) {
  const s = currentStudent();
  const myCourseNames = db.enrollments.map(e => {
    const cr = db.courses.find(x => x.code === e.courseCode);
    return cr ? cr.name : '';
  });
  const avail = db.courses.filter(cr => (cr.gradeLevel === s.yr || s.yr.startsWith(cr.gradeLevel)) && cr.status === 'Open' && !myCourseNames.includes(cr.name));
  
  c.innerHTML = `<div class="panel"><h2>Course Registration</h2>
    ${simpleTable(['Code','Name','Section','Action'], avail.map(x => [esc(x.code), esc(x.name), esc(x.section), `<button class="btn" onclick="enroll('${esc(x.code)}','${esc(x.section)}')">Enroll</button>`]))}
  </div>`;
}

async function enroll(code, section) {
  const s = currentStudent();
  const res = await fetch('/api/enroll', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ studentId: s.id, courseCode: code, section, term: '1st Sem' }) });
  const d = await res.json();
  if (!res.ok) return alert(d.error);
  db.enrollments = await (await fetch('/api/enrollments/' + s.id)).json();
  renderRegistration($('content')); alert('Enrolled!');
}

async function renderSchedule(c) {
  const s = currentStudent();
  const sched = await (await fetch(`/api/schedules/${encodeURIComponent(s.yr)}/1`)).json();
  c.innerHTML = `<div class="panel"><h2>Class Schedule</h2>
    ${sched.length === 0 ? '<p style="color:#999;">No schedule found for your section.</p>' : `
    <table><thead><tr><th>Day</th><th>Time</th><th>Course</th><th>Adviser</th></tr></thead><tbody>
    ${sched.map(x => `<tr><td>${esc(x.day)}</td><td>${esc(x.startTime)} - ${esc(x.endTime)}</td><td><b>${esc(x.courseName)}</b></td><td>${esc(x.adviser)}</td></tr>`).join('')}
    </tbody></table>`}
  </div>`;
}

async function renderProfileGrades(c) {
  const s = currentStudent();
  const grades = await (await fetch('/api/student/grades/' + s.id)).json();
  c.innerHTML = `<div class="panel"><h2>Academic Profile & Grades</h2>
    ${simpleTable(['Course','Grade','Term'], grades.map(g => [esc(g.courseName), `<b>${esc(g.grade)}</b>`, esc(g.term)]))}
  </div>`;
}

async function renderStudentRecords(c) {
  const s = currentStudent();
  const records = await (await fetch('/api/student/records/' + s.id)).json();
  const groups = {};
  records.forEach(r => { if (!groups[r.gradeLevel]) groups[r.gradeLevel] = []; groups[r.gradeLevel].push(r); });
  
  let html = `<div class="panel"><h2>My Records (All Grade Levels)</h2><p style="color:#666; margin-bottom:20px;">Click a grade-level folder to view your subject grades.</p>`;
  const keys = Object.keys(groups);
  if (keys.length === 0) html += `<p style="color:#999;">No historical records yet.</p>`;
  
  keys.forEach(k => { 
    html += `<div class="folder" onclick="showRecordFolder('${esc(k)}')"><span>📁 ${esc(k)} (${groups[k].length} subjects)</span> <span>&rarr;</span></div>`; 
  });
  html += `<div id="recordView"></div></div>`;
  c.innerHTML = html;
  window._records = groups;
}

function showRecordFolder(grade) {
  const rows = window._records[grade] || [];
  $('recordView').innerHTML = `<div class="panel" style="margin-top:20px; border:2px solid #5c0000;">
    <h3 style="color:#5c0000; margin-bottom:15px;">${esc(grade)} — Records</h3>
    ${simpleTable(['School Year','Subject','Grade','Status'], rows.map(r => [esc(r.schoolYear), esc(r.subject), `<b>${esc(r.grade)}</b>`, esc(r.status)]))}
  </div>`;
}

function renderStudentProfile(c) {
  const s = currentStudent();
  c.innerHTML = `<div class="panel"><h2>Student Profile</h2>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-top:20px;">
      <div><small style="color:#888; font-weight:bold;">NAME</small><div style="font-size:16px; font-weight:600; margin-top:5px;">${esc(s.first)} ${esc(s.mi)} ${esc(s.last)}</div></div>
      <div><small style="color:#888; font-weight:bold;">STUDENT NO.</small><div style="font-size:16px; font-weight:600; margin-top:5px;">${esc(s.id)}</div></div>
      <div><small style="color:#888; font-weight:bold;">YEAR LEVEL</small><div style="font-size:16px; font-weight:600; margin-top:5px;">${esc(s.yr)}</div></div>
      <div><small style="color:#888; font-weight:bold;">ADDRESS</small><div style="font-size:16px; font-weight:600; margin-top:5px;">${esc(s.address)}</div></div>
    </div>
  </div>`;
}