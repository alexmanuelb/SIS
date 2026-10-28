let db = { students: [], courses: [], users: [], enrollments: [], grades: [], schedules: [], attendance: [], records: [], activeTerm: '1st Semester' };
let session = null;
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// --- SMART MATCHING HELPER PARA SA SHS AT JHS/ELEM ---
function isStudentInSection(studentYr, courseGradeLevel, courseSection) {
    if (!studentYr || !courseGradeLevel) return false;
    const studentGrade = studentYr.split(' - ')[0].trim();
    const courseBaseGrade = courseGradeLevel.split(' - ')[0].trim();
    const secMatch = studentYr.match(/Sec(?:tion)?\s*(\d+)/i);
    const studentSec = secMatch ? secMatch[1] : '';
    return studentGrade === courseBaseGrade && studentSec === courseSection.toString().trim();
}

function getSectionFromYr(yrString) {
    const secMatch = yrString.match(/Sec(?:tion)?\s*(\d+)/i);
    return secMatch ? secMatch[1] : '';
}

// --- EYE ICON TOGGLE LOGIC ---
function togglePassword() {
  const passInput = $('loginPass');
  const icon = $('toggleIcon');
  if (passInput.type === 'password') {
    passInput.type = 'text';
    icon.innerHTML = `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>`;
  } else {
    passInput.type = 'password';
    icon.innerHTML = `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>`;
  }
}

// --- LOGIN LOGIC ---
async function doLogin() {
  const username = $('loginUser').value.trim();
  const password = $('loginPass').value.trim();
  if (!username || !password) return alert('Enter username and password');
  
  const loginBtn = document.querySelector('.login-btn');
  loginBtn.textContent = 'Logging in...';
  loginBtn.disabled = true;

  try {
    const res = await fetch('/api/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    if (res.status !== 200) {
      const data = await res.json();
      throw new Error(data.error);
    }
    
    session = await res.json();
    loginBtn.textContent = 'Loading data...';
    
    const termRes = await (await fetch('/api/settings/term')).json();
    db.activeTerm = termRes.term;

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
    else if (session.role === 'Registrar') navigate('activeDirectory');
    else if (session.role === 'Faculty') navigate('facultyDashboard');
    else navigate('studentDashboard');
    
    setInterval(() => { $('clock').textContent = new Date().toLocaleTimeString(); }, 1000);
    
  } catch (error) {
    alert(error.message || 'Login failed.');
  } finally {
    loginBtn.textContent = 'Log In \u2192';
    loginBtn.disabled = false;
  }
}

function doLogout() {
  if (!confirm('Log out?')) return;
  session = null;
  $('appScreen').style.display = 'none';
  $('loginScreen').style.display = 'flex';
  $('topUserDisplay').style.display = 'none';
  $('loginUser').value = ''; $('loginPass').value = '';
}

const MENUS = {
  Admin: [
    { key: 'adminDashboard', label: 'Dashboard' },
    { key: 'activeDirectory', label: 'Student Directory' },
    { key: 'facultyDirectory', label: 'Faculty Directory' },
    { key: 'courses', label: 'Course Management' },
    { key: 'users', label: 'Users & Access' }
  ],
  Registrar: [
    { key: 'activeDirectory', label: 'Student Directory' },
    { key: 'courses', label: 'Course Management' }
  ],
  Faculty: [
    { key: 'facultyDashboard', label: 'Dashboard' },
    { key: 'classRecords', label: 'Class Records' },
    { key: 'gradeEntry', label: 'Grade Entry' },
    { key: 'attendance', label: 'Attendance' }
  ],
  Student: [
    { key: 'studentDashboard', label: 'Dashboard' },
    { key: 'registration', label: 'My Subjects' },
    { key: 'schedule', label: 'Class Schedule' },
    { key: 'profileGrades', label: 'Report of Grades' }, 
    { key: 'profile', label: 'Student Profile' }
  ]
};

function buildSidebar() {
  const nav = $('sidebar');
  let html = `<div class="portal-title">${session.role.toUpperCase()} PORTAL</div>`;
  MENUS[session.role].forEach(m => {
    html += `<button type="button" onclick="navigate('${m.key}', this)">${m.label}</button>`;
  });
  html += `<button type="button" class="logout-btn" onclick="doLogout()">Logout</button>`;
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
    adminDashboard: renderAdminDashboard, activeDirectory: renderActiveDirectory, facultyDirectory: renderFacultyDirectory,
    courses: renderCourses, users: renderUsers, facultyDashboard: renderFacultyDashboard, classRecords: renderClassRecords,
    gradeEntry: renderGradeEntry, attendance: renderAttendance, studentDashboard: renderStudentDashboard,
    registration: renderRegistration, schedule: renderSchedule, profileGrades: renderProfileGrades,
    studentRecords: renderStudentRecords, profile: renderStudentProfile
  };
  (R[page] || renderAdminDashboard)(c);
}

function simpleTable(headers, rows) {
  if (!rows.length) return `<p style="color:#999; padding:20px; text-align:center;">No records found.</p>`;
  return `<table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

function currentStudent() {
  return db.students.find(s => s.username === session.username || s.id === session.username) || null;
}

function folderCard(title, subtitle, onclickStr) {
    return `<div style="background:white; border:1px solid #e0e0e0; border-radius:8px; padding:15px 20px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; box-shadow:0 2px 5px rgba(0,0,0,0.02); transition:all 0.2s;" onmouseover="this.style.borderColor='#5c0000'; this.style.boxShadow='0 4px 10px rgba(92,0,0,0.1)'; this.style.transform='translateY(-2px)'" onmouseout="this.style.borderColor='#e0e0e0'; this.style.boxShadow='0 2px 5px rgba(0,0,0,0.02)'; this.style.transform='translateY(0)'" onclick="${onclickStr}">
        <div>
            <div style="font-weight:700; color:#333; font-size:15px; margin-bottom:3px;">${title}</div>
            <div style="font-size:13px; color:#777;">${subtitle}</div>
        </div>
        <div style="background:#fff0f0; color:#5c0000; width:32px; height:32px; border-radius:50%; display:flex; justify-content:center; align-items:center; font-weight:bold;">&rarr;</div>
    </div>`;
}

function renderAdminDashboard(c) {
  const totalFaculty = db.users.filter(u => u.role === 'Faculty').length;
  c.innerHTML = `
    <div class="dashboard-cards">
      <div class="stat-card"><h3>${db.students.length}</h3><p>TOTAL STUDENTS</p></div>
      <div class="stat-card"><h3>${totalFaculty}</h3><p>FACULTY MEMBERS</p></div>
      <div class="stat-card"><h3>${db.courses.length}</h3><p>TOTAL COURSES</p></div>
      <div class="stat-card"><h3>${db.users.length}</h3><p>REGISTERED USERS</p></div>
    </div>
    <div class="panel" style="display:flex; justify-content:space-between; align-items:center;">
      <div>
        <h2 style="margin-bottom:5px;">Admin Dashboard</h2>
        <p style="color:#666; font-size:15px;">Welcome back, <b>${esc(session.name)}</b>.</p>
      </div>
      <div style="background:#f9eaea; padding:15px 20px; border-radius:8px; border-left:4px solid #5c0000;">
        <label style="font-size:12px; font-weight:bold; color:#5c0000; text-transform:uppercase;">Global School Term:</label>
        <div style="display:flex; gap:10px; margin-top:5px;">
          <select id="globalTermSelect" style="padding:8px; border-radius:6px; border:1px solid #ccc; font-weight:bold; color:#5c0000;">
            <option value="1st Semester" ${db.activeTerm === '1st Semester' ? 'selected' : ''}>1st Semester</option>
            <option value="2nd Semester" ${db.activeTerm === '2nd Semester' ? 'selected' : ''}>2nd Semester</option>
          </select>
          <button type="button" class="btn" onclick="updateGlobalTerm()">Update</button>
        </div>
      </div>
    </div>`;
}

async function updateGlobalTerm() {
  const newTerm = $('globalTermSelect').value;
  await fetch('/api/settings/term', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ term: newTerm }) });
  db.activeTerm = newTerm;
  alert('Global School Term updated to ' + newTerm + '. Student records and schedules will now reflect this term.');
}

function renderFacultyDashboard(c) {
  const myCourses = db.courses.filter(x => x.adviser === session.name || x.subjectTeacher === session.name);
  const uniqueStudents = new Set();
  myCourses.forEach(crs => {
      const enrolled = db.students.filter(s => isStudentInSection(s.yr, crs.gradeLevel, crs.section));
      enrolled.forEach(s => uniqueStudents.add(s.id));
  });
  const totalStudentsHandled = uniqueStudents.size;

  c.innerHTML = `
    <div class="dashboard-cards">
      <div class="stat-card"><h3>${myCourses.length}</h3><p>MY ASSIGNED CLASSES</p></div>
      <div class="stat-card" style="background: linear-gradient(135deg, #a00000, #800000);">
        <h3>${totalStudentsHandled}</h3><p>STUDENTS HANDLED</p>
      </div>
    </div>
    <div class="panel"><h2>Faculty Dashboard</h2><p>Welcome, <b>${esc(session.name)}</b>.</p></div>`;
}

function renderStudentDashboard(c) {
  const s = currentStudent();
  c.innerHTML = `
    <div class="dashboard-cards">
      <div class="stat-card"><h3>${db.enrollments.length}</h3><p>ENROLLED COURSES</p></div>
      <div class="stat-card" style="background: linear-gradient(135deg, #a00000, #800000);">
        <h3 id="dash-clock" style="font-size:26px;">--:-- --</h3><p>CURRENT TIME</p>
      </div>
    </div>
    <div class="panel"><h2>Student Dashboard</h2><p>Hello, <b>${esc(s.first)}</b>! You are in <b>${esc(s.yr)}</b>.</p></div>`;
  setInterval(() => { if($('dash-clock')) $('dash-clock').textContent = new Date().toLocaleTimeString(); }, 1000);
}

// --- STUDENT DIRECTORY ---
function renderActiveDirectory(c) {
  const uniqueGrades = [...new Set(db.students.map(s => s.yr.split(' - ')[0]))].filter(Boolean).sort();
  const currentGradeFilter = $('directoryGradeFilter') ? $('directoryGradeFilter').value : 'All';
  const currentSecFilter = $('directorySecFilter') ? $('directorySecFilter').value : 'All';

  let active = db.students.filter(s => s.status !== 'Archived' && s.status !== 'Graduated');
  
  if (currentGradeFilter !== 'All') active = active.filter(s => s.yr.split(' - ')[0].trim() === currentGradeFilter);
  if (currentSecFilter !== 'All') active = active.filter(s => getSectionFromYr(s.yr) === currentSecFilter);
  
  const totalStudents = active.length;
  
  // GUMAGANA NA STUDENT EDIT BUTTON
  let rows = active.map(s => [
      esc(s.id), esc(s.last), esc(s.first), esc(s.yr), 
      `<span class="badge ${s.status === 'Active' ? 'active' : 'inactive'}">${esc(s.status)}</span>`,
      `<button type="button" class="btn secondary" data-id="${esc(s.id)}" onclick="window.editStudent(this)">Edit</button>`
  ]);

  c.innerHTML = `<div class="panel">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
      <h2 style="margin:0;">Student Directory</h2>
      <button type="button" class="btn" onclick="openStudentForm()">+ Add New Student</button>
    </div>
    
    <div class="form-panel" style="margin-bottom: 20px; background: #f9eaea; border-left: 4px solid #5c0000; display:flex; align-items:center; gap:20px; flex-wrap:wrap;">
      <div style="display:flex; align-items:center; gap:10px;">
          <label style="font-weight:bold; color:#5c0000;">Filter by Grade Level:</label>
          <select id="directoryGradeFilter" onchange="renderActiveDirectory($('content'))" style="padding: 10px; border-radius: 6px; border: 1px solid #ccc; width: 200px; font-size:14px;">
            <option value="All" ${currentGradeFilter === 'All' ? 'selected' : ''}>All Grade Levels</option>
            ${uniqueGrades.map(g => `<option value="${g}" ${currentGradeFilter === g ? 'selected' : ''}>${g}</option>`).join('')}
          </select>
      </div>
      <div style="display:flex; align-items:center; gap:10px;">
          <label style="font-weight:bold; color:#5c0000;">Filter by Section:</label>
          <select id="directorySecFilter" onchange="renderActiveDirectory($('content'))" style="padding: 10px; border-radius: 6px; border: 1px solid #ccc; width: 150px; font-size:14px;">
            <option value="All" ${currentSecFilter === 'All' ? 'selected' : ''}>All Sections</option>
            <option value="1" ${currentSecFilter === '1' ? 'selected' : ''}>Section 1</option>
            <option value="2" ${currentSecFilter === '2' ? 'selected' : ''}>Section 2</option>
          </select>
      </div>
      <div style="margin-left: auto; background:#5c0000; color:white; padding:10px 20px; border-radius:8px; font-weight:bold; font-size:14px; display:flex; align-items:center; gap:8px;">
        <span style="font-size:18px;">👥</span>
        Total Students: <span style="font-size:20px;">${totalStudents}</span>
      </div>
    </div>
    <div id="enrollFormArea"></div>
    ${simpleTable(['Student ID','Last Name','First Name','Year Level','Status','Action'], rows)}
  </div>`;
}

// BAGONG HELPER PARA SA STUDENT EDIT (Katulad ng Faculty)
window.editStudent = function(btn) {
  const id = btn.getAttribute('data-id');
  if(id) openStudentForm(id);
};

function computeAge() {
  const bday = document.getElementById('f_birthday').value;
  if (!bday) return;
  const birthDate = new Date(bday);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  document.getElementById('f_age').value = age;
}

function openStudentForm(id) {
  const s = id ? db.students.find(x => x.id === id) : null;
  const nextId = s ? s.id : '2026-' + Math.floor(1000 + Math.random() * 9000);
  
  let currentYear = s ? s.yr : 'Grade 1';
  let currentSem = '1st Semester';
  let currentTrack = 'STEM';
  let currentSection = '1';
  
  if (currentYear && currentYear.includes('-')) {
      const parts = currentYear.split('-');
      currentYear = parts[0].trim();
      currentTrack = parts[1].trim();
      currentSem = parts[2].trim();
      if(parts[3]) currentSection = parts[3].replace('Sec', '').trim();
  }

  const yearLevels = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
  const statuses = ['Active', 'Archived', 'Graduated', 'Inactive']; 
  const sections = ['1', '2'];

  $('enrollFormArea').innerHTML = `
    <div class="form-panel">
      <h3 style="color:#5c0000; margin-bottom:15px;">${s ? 'Edit' : 'New'} Student Record</h3>
      <div class="form-grid">
        <div class="field"><label>Student No. (Auto)</label><input id="f_id" value="${esc(nextId)}" readonly style="background:#e9ecef;"></div>
        <div class="field"><label>Last Name</label><input id="f_last" value="${esc(s?.last||'')}"></div>
        <div class="field"><label>First Name</label><input id="f_first" value="${esc(s?.first||'')}"></div>
        <div class="field"><label>Middle Initial</label><input id="f_mi" value="${esc(s?.mi||'')}" maxlength="2"></div>
        <div class="field"><label>Email Address</label><input id="f_email" type="email" value="${esc(s?.email||'')}" placeholder="student@email.com"></div>
        <div class="field"><label>Birthday</label><input id="f_birthday" type="date" value="${esc(s?.birthday||'')}" onchange="computeAge()"></div>
        <div class="field"><label>Age</label><input id="f_age" type="number" value="${esc(s?.age||'')}" readonly style="background:#e9ecef;"></div>
        <div class="field"><label>Gender</label><select id="f_gender">
          <option value="Male" ${s?.gender === 'Male' ? 'selected' : ''}>Male</option>
          <option value="Female" ${s?.gender === 'Female' ? 'selected' : ''}>Female</option>
        </select></div>
        <div class="field"><label>Address</label><input id="f_address" value="${esc(s?.address||'')}" placeholder="Full Address"></div>
        <div class="field"><label>Guardian Name</label><input id="f_guardianName" value="${esc(s?.guardianName||'')}" placeholder="Parent/Guardian Name"></div>
        <div class="field"><label>Guardian Contact No.</label><input id="f_guardianContact" value="${esc(s?.guardianContact||'')}" placeholder="09XX-XXX-XXXX"></div>
        <div class="field"><label>Course / Dept</label>
          <select id="f_course" onchange="toggleSHS()">
            <option value="Elem" ${s?.course === 'Elem' ? 'selected' : ''}>Elementary</option>
            <option value="JHS" ${s?.course === 'JHS' ? 'selected' : ''}>Junior High School</option>
            <option value="SHS" ${s?.course === 'SHS' ? 'selected' : ''}>Senior High School</option>
          </select>
        </div>
        <div class="field"><label>Year Level</label>
          <select id="f_yr">${yearLevels.map(y => `<option value="${y}" ${currentYear === y ? 'selected' : ''}>${y}</option>`).join('')}</select>
        </div>
        <div class="field"><label>Section</label>
          <select id="f_section">${sections.map(sec => `<option value="${sec}" ${currentSection === sec ? 'selected' : ''}>Section ${sec}</option>`).join('')}</select>
        </div>
        <div class="field" id="shs_track_group" style="display: ${s?.course === 'SHS' ? 'block' : 'none'};">
          <label>SHS Track</label>
          <select id="f_track">
            <option value="STEM" ${currentTrack === 'STEM' ? 'selected' : ''}>STEM</option>
            <option value="HUMSS" ${currentTrack === 'HUMSS' ? 'selected' : ''}>HUMSS</option>
            <option value="ABM" ${currentTrack === 'ABM' ? 'selected' : ''}>ABM</option>
          </select>
        </div>
        <div class="field" id="shs_sem_group" style="display: ${s?.course === 'SHS' ? 'block' : 'none'};">
          <label>Semester</label>
          <select id="f_sem">
            <option value="1st Semester" ${currentSem === '1st Semester' ? 'selected' : ''}>1st Semester</option>
            <option value="2nd Semester" ${currentSem === '2nd Semester' ? 'selected' : ''}>2nd Semester</option>
          </select>
        </div>
        <div class="field"><label>Status</label>
          <select id="f_status">${statuses.map(st => `<option value="${st}" ${s?.status === st ? 'selected' : ''}>${st}</option>`).join('')}</select>
        </div>
      </div>
      <button type="button" class="btn" onclick="saveStudent('${esc(s?.id||'')}')">Save</button>
      <button type="button" class="btn secondary" onclick="$('enrollFormArea').innerHTML=''">Cancel</button>
    </div>`;
}

function toggleSHS() {
  const course = $('f_course').value;
  if (course === 'SHS') {
    $('shs_track_group').style.display = 'block';
    $('shs_sem_group').style.display = 'block';
  } else {
    $('shs_track_group').style.display = 'none';
    $('shs_sem_group').style.display = 'none';
  }
}

async function saveStudent(existingId) {
  const email = $('f_email').value;
  const first = $('f_first').value;
  const course = $('f_course').value;
  let yr = $('f_yr').value;
  const sec = $('f_section').value;
  
  if (course === 'SHS') {
    yr = `${yr} - ${$('f_track').value} - ${$('f_sem').value} - Sec ${sec}`;
  } else {
    yr = `${yr} - Sec ${sec}`;
  }

  const rec = { 
    id: $('f_id').value, last: $('f_last').value, first: first, mi: $('f_mi').value, 
    course: course, yr: yr, status: $('f_status').value, enrol: 'Enrolled', email: email,
    birthday: $('f_birthday').value, age: $('f_age').value, gender: $('f_gender').value,
    address: $('f_address').value, guardianName: $('f_guardianName').value, guardianContact: $('f_guardianContact').value
  };
  
  const res = await fetch('/api/students', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(rec) });
  
  if(!res.ok) {
      const errorData = await res.json();
      return alert(errorData.error || 'Error saving');
  }
  
  if (!existingId && email) alert('Student added! An email containing their login credentials has been sent to ' + email);

  db.students = await (await fetch('/api/students')).json();
  db.users = await (await fetch('/api/users')).json();
  $('enrollFormArea').innerHTML = ''; renderActiveDirectory($('content')); 
}

// --- FACULTY DIRECTORY ---
function renderFacultyDirectory(c) {
  const facultyList = db.users.filter(u => u.role === 'Faculty');
  
  const rows = facultyList.map(f => {
    const advised = db.courses.filter(crs => crs.adviser === f.name).map(crs => `${crs.gradeLevel} (Sec ${crs.section})`);
    const advisoryDisplay = advised.length > 0 ? advised[0] : '<span style="color:#999;">None</span>';
    return [
        `<b>${esc(f.username)}</b>`, 
        esc(f.name), 
        esc(f.email || 'N/A'), 
        advisoryDisplay, 
        `<button type="button" class="btn secondary" data-username="${esc(f.username)}" onclick="window.editFaculty(this)">Edit</button>`
    ];
  });

  c.innerHTML = `<div class="panel">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
      <h2 style="margin:0;">Faculty Directory</h2>
      <button type="button" class="btn" onclick="openAddFacultyForm()">+ Add New Teacher</button>
    </div>
    <div id="facultyFormArea"></div>
    ${simpleTable(['Username', 'Full Name', 'Email', 'Advisory Class', 'Action'], rows)}
  </div>`;
}

// BAGONG HELPER PARA SA FACULTY EDIT
window.editFaculty = function(btn) {
  const username = btn.getAttribute('data-username');
  if(username) openEditFacultyForm(username);
};

function openAddFacultyForm() {
  const grades = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11 - STEM', 'Grade 11 - HUMSS', 'Grade 11 - ABM', 'Grade 12 - STEM', 'Grade 12 - HUMSS', 'Grade 12 - ABM'];
  const sections = ['1', '2'];
  let uniqueSections = [];
  grades.forEach(g => sections.forEach(s => uniqueSections.push(`${g} - Section ${s}`)));

  $('facultyFormArea').innerHTML = `
    <div class="form-panel" style="border-left: 4px solid #5c0000;">
      <h3 style="color:#5c0000; margin-bottom:15px;">Add New Teacher</h3>
      <div class="form-grid">
        <div class="field" style="grid-column: span 2;"><label>Full Name (e.g., T. John Doe)</label><input id="t_name" onkeyup="generateFacultyCredentials()"></div>
        <div class="field" style="grid-column: span 2;"><label>Email Address (for credentials)</label><input id="t_email" type="email" placeholder="teacher@gmail.com"></div>
        <div class="field"><label>Department</label><input id="t_dept" placeholder="e.g., Math Dept"></div>
        <div class="field"><label>Advisory Class</label>
          <select id="t_advisory">
            <option value="">-- No Advisory Class --</option>
            ${uniqueSections.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join('')}
          </select>
        </div>
      </div>
      <button type="button" class="btn" onclick="saveFaculty()">Create Teacher</button>
      <button type="button" class="btn secondary" onclick="$('facultyFormArea').innerHTML=''">Cancel</button>
    </div>`;
}

function generateFacultyCredentials() {
  const name = $('t_name').value.trim().replace(/^T\.\s*/i, '');
  if (!name) return;
  const parts = name.split(' ');
  const firstName = parts[0].toLowerCase();
  const lastName = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
  window._generatedUser = `t.${firstName}${lastName}`;
  window._generatedPass = `${firstName}123`;
  const emailInput = $('t_email');
  if (emailInput && !emailInput.value) emailInput.value = `t${firstName}${lastName}@gmail.com`;
}

async function saveFaculty() {
  const username = window._generatedUser || '';
  const password = window._generatedPass || '';
  const rec = { username, password, name: $('t_name').value.trim(), role: 'Faculty', section: $('t_dept').value.trim(), email: $('t_email').value.trim() };
  const advisory = $('t_advisory').value;

  if(!rec.username || !rec.password || !rec.name) return alert('Please enter a valid Full Name first');
  const res = await fetch('/api/faculty', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(rec) });
  if(!res.ok) return alert('Username already exists');

  if (advisory) {
    const [gradePart, sectionPart] = advisory.split(' - Section ');
    const coursesToUpdate = db.courses.filter(c => c.gradeLevel === gradePart.trim() && c.section === sectionPart.trim());
    for(const crs of coursesToUpdate) {
        await fetch('/api/courses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...crs, adviser: rec.name }) });
    }
  }
  
  db.users = await (await fetch('/api/users')).json();
  db.courses = await (await fetch('/api/courses')).json();
  $('facultyFormArea').innerHTML = '';
  renderFacultyDirectory($('content'));
  if (rec.email) alert('Teacher created! Login credentials have been sent to ' + rec.email);
  else alert('Teacher created!');
}

function openEditFacultyForm(username) {
  const user = db.users.find(u => u.username === username);
  if(!user) return alert('User not found');
  const currentAdvisory = db.courses.filter(crs => crs.adviser === user.name).map(crs => `${crs.gradeLevel} - Section ${crs.section}`);
  const currentAdvisoryStr = currentAdvisory.length > 0 ? currentAdvisory[0] : "";
  const grades = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11 - STEM', 'Grade 11 - HUMSS', 'Grade 11 - ABM', 'Grade 12 - STEM', 'Grade 12 - HUMSS', 'Grade 12 - ABM'];
  const sections = ['1', '2'];
  let uniqueSections = [];
  grades.forEach(g => sections.forEach(s => uniqueSections.push(`${g} - Section ${s}`)));

  $('facultyFormArea').innerHTML = `
    <div class="form-panel" style="border-left: 4px solid #5c0000;">
      <h3 style="color:#5c0000; margin-bottom:15px;">Edit Teacher: ${esc(user.name)}</h3>
      <div class="form-grid">
        <div class="field"><label>Username (Read-only)</label><input value="${esc(user.username)}" readonly style="background:#e9ecef;"></div>
        <div class="field"><label>New Password (Leave blank to keep)</label><input id="et_pass" type="password"></div>
        <div class="field"><label>Full Name</label><input id="et_name" value="${esc(user.name)}"></div>
        <div class="field"><label>Department</label><input id="et_dept" value="${esc(user.section||'')}"></div>
        <div class="field" style="grid-column: span 2;"><label>Advisory Class</label>
          <select id="et_advisory">
            <option value="">-- No Advisory Class --</option>
            ${uniqueSections.map(s => `<option value="${esc(s)}" ${currentAdvisoryStr === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}
          </select>
        </div>
      </div>
      <button type="button" class="btn" onclick="updateFaculty('${esc(user.username)}')">Save Changes</button>
      <button type="button" class="btn secondary" onclick="$('facultyFormArea').innerHTML=''">Cancel</button>
    </div>`;
}

async function updateFaculty(username) {
  const newName = $('et_name').value.trim();
  const newPass = $('et_pass').value.trim();
  const newDept = $('et_dept').value.trim();
  const newAdvisory = $('et_advisory').value;
  const oldUser = db.users.find(u => u.username === username);

  const rec = { username, password: newPass, name: newName, role: 'Faculty', section: newDept };
  await fetch('/api/users/update', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(rec) });

  const oldCourses = db.courses.filter(c => c.adviser === oldUser.name);
  for(const c of oldCourses) {
      await fetch('/api/courses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...c, adviser: '' }) });
  }

  if (newAdvisory) {
    const [gradePart, sectionPart] = newAdvisory.split(' - Section ');
    const newCourses = db.courses.filter(c => c.gradeLevel === gradePart.trim() && c.section === sectionPart.trim());
    for(const c of newCourses) {
        await fetch('/api/courses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...c, adviser: newName }) });
    }
  }

  db.users = await (await fetch('/api/users')).json();
  db.courses = await (await fetch('/api/courses')).json();
  $('facultyFormArea').innerHTML = '';
  renderFacultyDirectory($('content'));
  alert('Teacher updated successfully!');
}

function renderCourses(c) {
  const grades = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11 - STEM - 1st Semester', 'Grade 11 - STEM - 2nd Semester', 'Grade 11 - HUMSS - 1st Semester', 'Grade 11 - HUMSS - 2nd Semester', 'Grade 11 - ABM - 1st Semester', 'Grade 11 - ABM - 2nd Semester', 'Grade 12 - STEM - 1st Semester', 'Grade 12 - STEM - 2nd Semester', 'Grade 12 - HUMSS - 1st Semester', 'Grade 12 - HUMSS - 2nd Semester', 'Grade 12 - ABM - 1st Semester', 'Grade 12 - ABM - 2nd Semester'];
  
  c.innerHTML = `<div class="panel">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
      <h2 style="margin:0;">Course & Section Management</h2>
      <div style="display:flex; gap:10px;">
        <button type="button" class="btn" onclick="openAddCourseForm()">+ Add New Course</button>
        <button type="button" class="btn secondary" onclick="openAddSectionForm()">+ Add New Section</button>
      </div>
    </div>
    <div class="form-panel" style="margin-bottom: 20px; background: #f9eaea; border-left: 4px solid #5c0000;">
      <label style="font-weight:bold; color:#5c0000; margin-bottom:5px; display:block;">Filter by Grade Level / Track:</label>
      <select id="courseFilter" onchange="renderCoursesTable()" style="padding: 10px; border-radius: 6px; border: 1px solid #ccc; width: 100%; max-width: 300px; font-size:14px;">
        <option value="All">All</option>
        ${grades.map(g => `<option value="${g}">${g}</option>`).join('')}
      </select>
    </div>
    <div id="courseFormArea"></div>
    <div id="courseTableContainer"></div>
  </div>`;
  renderCoursesTable();
}

function renderCoursesTable() {
  const filter = $('courseFilter') ? $('courseFilter').value : 'All';
  const filtered = filter === 'All' ? db.courses : db.courses.filter(c => c.gradeLevel === filter);
  $('courseTableContainer').innerHTML = simpleTable(['Code','Name','Grade Level','Section','Adviser','Subject Teacher'],
    filtered.map(x => [esc(x.code), esc(x.name), esc(x.gradeLevel), esc(x.section), esc(x.adviser), esc(x.subjectTeacher)])
  );
}

function openAddCourseForm() {
  const grades = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11 - STEM - 1st Semester', 'Grade 11 - STEM - 2nd Semester', 'Grade 11 - HUMSS - 1st Semester', 'Grade 11 - HUMSS - 2nd Semester', 'Grade 11 - ABM - 1st Semester', 'Grade 11 - ABM - 2nd Semester', 'Grade 12 - STEM - 1st Semester', 'Grade 12 - STEM - 2nd Semester', 'Grade 12 - HUMSS - 1st Semester', 'Grade 12 - HUMSS - 2nd Semester', 'Grade 12 - ABM - 1st Semester', 'Grade 12 - ABM - 2nd Semester'];
  $('courseFormArea').innerHTML = `
    <div class="form-panel" style="border-left: 4px solid #5c0000;">
      <h3 style="color:#5c0000; margin-bottom:15px;">Add New Course</h3>
      <div class="form-grid">
        <div class="field"><label>Course Code</label><input id="c_code" placeholder="e.g., MATH7-3"></div>
        <div class="field"><label>Course Name</label><input id="c_name" placeholder="e.g., Mathematics 7"></div>
        <div class="field"><label>Grade Level / Track</label><select id="c_grade">${grades.map(g => `<option value="${g}">${g}</option>`).join('')}</select></div>
        <div class="field"><label>Section</label><input id="c_section" placeholder="e.g., 3"></div>
        <div class="field" style="grid-column: span 2;"><label>Subject Teacher</label><input id="c_subjectTeacher" placeholder="e.g., T. Jose Rizal"></div>
      </div>
      <button type="button" class="btn" onclick="saveNewCourse()">Save Course</button>
      <button type="button" class="btn secondary" onclick="$('courseFormArea').innerHTML=''">Cancel</button>
    </div>`;
}

async function saveNewCourse() {
  const rec = { code: $('c_code').value, name: $('c_name').value, gradeLevel: $('c_grade').value, section: $('c_section').value, adviser: '', subjectTeacher: $('c_subjectTeacher').value, capacity: 30, status: 'Open' };
  await fetch('/api/courses', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(rec) });
  db.courses = await (await fetch('/api/courses')).json();
  $('courseFormArea').innerHTML = '';
  renderCourses($('content')); 
  alert('Course added!');
}

function openAddSectionForm() {
  const grades = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11 - STEM - 1st Semester', 'Grade 11 - STEM - 2nd Semester', 'Grade 11 - HUMSS - 1st Semester', 'Grade 11 - HUMSS - 2nd Semester', 'Grade 11 - ABM - 1st Semester', 'Grade 11 - ABM - 2nd Semester', 'Grade 12 - STEM - 1st Semester', 'Grade 12 - STEM - 2nd Semester', 'Grade 12 - HUMSS - 1st Semester', 'Grade 12 - HUMSS - 2nd Semester', 'Grade 12 - ABM - 1st Semester', 'Grade 12 - ABM - 2nd Semester'];
  $('courseFormArea').innerHTML = `
    <div class="form-panel" style="border-left: 4px solid #5c0000;">
      <h3 style="color:#5c0000; margin-bottom:15px;">Add New Section</h3>
      <div class="form-grid">
        <div class="field"><label>Grade Level / Track</label><select id="s_grade">${grades.map(g => `<option value="${g}">${g}</option>`).join('')}</select></div>
        <div class="field"><label>New Section Name</label><input id="s_section" placeholder="e.g., 3"></div>
        <div class="field" style="grid-column: span 2;"><label>Advisory Teacher</label><input id="s_adviser" placeholder="e.g., T. Maria Clara"></div>
      </div>
      <button type="button" class="btn" onclick="saveNewSection()">Create Section</button>
      <button type="button" class="btn secondary" onclick="$('courseFormArea').innerHTML=''">Cancel</button>
    </div>`;
}

async function saveNewSection() {
  const grade = $('s_grade').value.trim();
  const newSec = $('s_section').value.trim();
  const newAdviser = $('s_adviser').value.trim();
  if(!grade || !newSec || !newAdviser) return alert('Fill in all fields');
  const templates = db.courses.filter(c => c.gradeLevel === grade && c.section === '1');
  if(templates.length === 0) return alert('No courses found for Section 1 to copy.');

  for(const t of templates) {
    const newCode = t.code.replace(/-1$/, '-' + newSec);
    await fetch('/api/courses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: newCode, name: t.name, gradeLevel: t.gradeLevel, section: newSec, capacity: t.capacity, adviser: newAdviser, subjectTeacher: t.subjectTeacher, status: 'Open' }) });
  }
  db.courses = await (await fetch('/api/courses')).json();
  $('courseFormArea').innerHTML = '';
  renderCourses($('content'));
  alert(`Section ${newSec} created for ${grade}!`);
}

function renderUsers(c) {
  let filterVal = 'All';
  if($('userFilter')) filterVal = $('userFilter').value;
  let filteredUsers = db.users;
  if(filterVal !== 'All') {
      filteredUsers = db.users.filter(u => {
          if(filterVal === 'Students') return u.role === 'Student';
          return u.role === filterVal;
      });
  }

  const rows = filteredUsers.map(u => [
    esc(u.username), esc(u.name), esc(u.role), esc(u.section||'—'),
    `<div style="display:flex; gap:5px;">
        ${u.role === 'Student' ? `<button type="button" class="btn secondary" onclick="alert('Please edit student details in Student Directory')">Edit</button>` : (u.role === 'Faculty' ? `<button type="button" class="btn secondary" data-username="${esc(u.username)}" onclick="window.editFaculty(this)">Edit</button>` : '')}
        ${u.role !== 'Admin' ? `<button type="button" class="btn" style="background:#a00;" onclick="deleteUser('${esc(u.username)}')">Delete</button>` : ''}
     </div>`
  ]);

  c.innerHTML = `<div class="panel">
    <h2>Users & Access</h2>
    <p style="margin-bottom:15px; color:#666;">Manage system accounts.</p>
    <div class="form-panel" style="margin-bottom: 20px; background: #f9eaea; border-left: 4px solid #5c0000; display:flex; align-items:center; gap:20px;">
      <label style="font-weight:bold; color:#5c0000;">Filter by Role:</label>
      <select id="userFilter" onchange="renderUsers($('content'))" style="padding: 10px; border-radius: 6px; border: 1px solid #ccc; width: 100%; max-width: 300px; font-size:14px;">
        <option value="All" ${filterVal === 'All' ? 'selected' : ''}>All Users</option>
        <option value="Admin" ${filterVal === 'Admin' ? 'selected' : ''}>Admin</option>
        <option value="Faculty" ${filterVal === 'Faculty' ? 'selected' : ''}>Faculty</option>
        <option value="Students" ${filterVal === 'Students' ? 'selected' : ''}>Students</option>
      </select>
    </div>
    ${simpleTable(['Username','Name','Role','Section','Action'], rows)}
  </div>`;
}

async function deleteUser(username) {
  if(!confirm(`Are you sure you want to delete user ${username}? This will also remove their student record if applicable.`)) return;
  try {
      const res = await fetch('/api/users/' + username, { method: 'DELETE' });
      if(!res.ok) throw new Error('Failed to delete');
      alert('User deleted!');
      db.users = await (await fetch('/api/users')).json();
      db.students = await (await fetch('/api/students')).json();
      renderUsers($('content'));
  } catch (error) {
      alert('Error deleting user.');
  }
}

async function renderClassRecords(c) {
  const myCourses = db.courses.filter(x => {
    const isTeacher = x.adviser === session.name || x.subjectTeacher === session.name;
    if (!isTeacher) return false;
    if (x.gradeLevel.includes('Grade 11') || x.gradeLevel.includes('Grade 12')) return x.gradeLevel.includes(db.activeTerm);
    return true;
  });

  const groups = {};
  for (const crs of myCourses) {
    const key = crs.gradeLevel + '|Section ' + crs.section;
    if (!groups[key]) groups[key] = [];
    groups[key].push(crs);
  }
  
  let html = `<div class="panel"><h2>Class Records (${esc(db.activeTerm)})</h2><p style="margin-bottom:20px; color:#666;">Select a section to view enrolled students and manage status.</p>
    <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap:15px;">`;
    
  for (const key of Object.keys(groups)) {
      const [gradeLevel, secName] = key.split('|');
      const sectionNumber = secName.replace('Section ', '').trim();
      const studentCount = db.students.filter(s => isStudentInSection(s.yr, gradeLevel, sectionNumber)).length;
      html += folderCard(`${esc(gradeLevel)}`, `${esc(secName)} • ${studentCount} Students`, `showClassFolder('${esc(gradeLevel)}', '${esc(secName)}')`);
  }
  
  if(Object.keys(groups).length === 0) html += `<p style="color:#999;">No classes assigned to you for ${esc(db.activeTerm)}.</p>`;
  html += `</div><div id="classFolderView" style="margin-top:20px;"></div></div>`;
  c.innerHTML = html;
}

async function showClassFolder(gradeLevel, secName) {
  const section = secName.replace('Section ', '').trim();
  const keyStr = `${gradeLevel} | ${secName}`;
  let students = db.students.filter(s => isStudentInSection(s.yr, gradeLevel, section));
  const attendanceHistory = await (await fetch(`/api/attendance/history/${encodeURIComponent(section)}`)).json();

  let rows = students.map(s => {
      const studentAbsences = attendanceHistory.filter(a => a.studentId === s.id && a.status === 'Absent').length;
      const statusBadge = s.status === 'Active' ? 'badge active' : 'badge inactive';
      return [esc(s.id), esc(s.last+', '+s.first), esc(s.yr), `<span style="color:${studentAbsences > 0 ? 'red' : 'green'}; font-weight:bold;">${studentAbsences}</span>`, `<span class="${statusBadge}">${esc(s.status)}</span>`, `<button type="button" class="btn secondary" style="padding:5px 10px; font-size:11px;" onclick="openEditStatusModal('${esc(s.id)}', '${esc(s.status)}')">Edit Status</button>`];
  });

  $('classFolderView').innerHTML = `<div class="panel" style="border:2px solid #5c0000;">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
        <h3 style="margin:0; color:#5c0000;">${esc(keyStr)} — Enrolled Students</h3>
        <button type="button" class="btn secondary" onclick="$('classFolderView').innerHTML=''">Close</button>
    </div>
    ${simpleTable(['ID','Name','Year Level','Absences', 'Status', 'Action'], rows)}
  </div>`;
}

async function openEditStatusModal(studentId, currentStatus) {
    const newStatus = prompt(`Edit Status for ${studentId} (Active/Inactive/Archived):`, currentStatus);
    if(!newStatus) return;
    if(!['Active', 'Inactive', 'Archived'].includes(newStatus)) return alert('Invalid status. Please type Active, Inactive, or Archived.');
    
    const res = await fetch('/api/students/status', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ id: studentId, status: newStatus }) });
    if(res.ok) {
        alert('Status updated successfully!');
        db.students = await (await fetch('/api/students')).json();
        const titleStr = document.querySelector('#classFolderView h3').innerText; 
        const parts = titleStr.split(' — ')[0].split(' | ');
        showClassFolder(parts[0], parts[1]);
    } else alert('Failed to update status.');
}

function renderGradeEntry(c) {
  const myCourses = db.courses.filter(x => {
    const isTeacher = x.adviser === session.name || x.subjectTeacher === session.name;
    if (!isTeacher) return false;
    if (x.gradeLevel.includes('Grade 11') || x.gradeLevel.includes('Grade 12')) return x.gradeLevel.includes(db.activeTerm);
    return true;
  });

  const sections = [...new Set(myCourses.map(x => x.gradeLevel + '|Section ' + x.section))];

  let html = `<div class="panel"><h2>Grade Entry (${esc(db.activeTerm)})</h2><p style="margin-bottom:20px; color:#666;">Select a section to view students and enter grades.</p>
    <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap:15px;">`;
  if(sections.length === 0) html += `<p style="color:#999;">No classes assigned to you for ${esc(db.activeTerm)}.</p>`;
  else sections.forEach(secString => { const [gradeLevel, secName] = secString.split('|'); html += folderCard(`${esc(gradeLevel)}`, esc(secName), `showGradeEntryFolder('${esc(gradeLevel)}', '${esc(secName)}')`); });
  html += `</div><div id="gradeEntryView" style="margin-top:20px;"></div></div>`;
  c.innerHTML = html;
}

async function showGradeEntryFolder(gradeLevel, secName) {
  const section = secName.replace('Section ', '').trim();
  const keyStr = `${gradeLevel} | ${secName}`;
  const myCourses = db.courses.filter(x => (x.adviser === session.name || x.subjectTeacher === session.name) && x.gradeLevel === gradeLevel && x.section === section);
  let students = db.students.filter(s => isStudentInSection(s.yr, gradeLevel, section));
  const males = students.filter(s => s.gender === 'Male').sort((a, b) => a.last.localeCompare(b.last));
  const females = students.filter(s => s.gender === 'Female').sort((a, b) => a.last.localeCompare(b.last));

  let html = `<div class="panel" style="border:2px solid #5c0000;">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
      <h3 style="margin:0; color:#5c0000;">${esc(keyStr)} — Grade Entry</h3>
      <select id="ge_course" style="padding:8px; border-radius:6px; border:1px solid #ccc; font-weight:bold;">
        ${myCourses.map(c => `<option value="${esc(c.name)}">${esc(c.name)}</option>`).join('')}
      </select>
    </div>
    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
      <div><h4 style="color:#333; border-bottom:2px solid #ccc; padding-bottom:5px; margin-bottom:10px;">Male Students</h4>
        ${males.length === 0 ? '<p style="color:#999;">No male students</p>' : `<table style="width:100%; font-size:14px;"><thead><tr style="background:#f0f0f0;"><th style="padding:8px; text-align:left;">Name</th><th style="padding:8px; text-align:left;">Grade</th></tr></thead><tbody>${males.map(s => `<tr><td style="padding:8px; border-bottom:1px solid #eee;">${esc(s.last)}, ${esc(s.first)}</td><td style="padding:8px; border-bottom:1px solid #eee;"><input type="number" step="0.25" min="1" max="5" placeholder="1.0" style="width:80px; padding:5px;" id="grade_${s.id}"></td></tr>`).join('')}</tbody></table>`}
      </div>
      <div><h4 style="color:#333; border-bottom:2px solid #ccc; padding-bottom:5px; margin-bottom:10px;">Female Students</h4>
        ${females.length === 0 ? '<p style="color:#999;">No female students</p>' : `<table style="width:100%; font-size:14px;"><thead><tr style="background:#f0f0f0;"><th style="padding:8px; text-align:left;">Name</th><th style="padding:8px; text-align:left;">Grade</th></tr></thead><tbody>${females.map(s => `<tr><td style="padding:8px; border-bottom:1px solid #eee;">${esc(s.last)}, ${esc(s.first)}</td><td style="padding:8px; border-bottom:1px solid #eee;"><input type="number" step="0.25" min="1" max="5" placeholder="1.0" style="width:80px; padding:5px;" id="grade_${s.id}"></td></tr>`).join('')}</tbody></table>`}
      </div>
    </div>
    <div style="margin-top:20px; text-align:right; display:flex; justify-content:space-between;">
        <button type="button" class="btn secondary" onclick="$('gradeEntryView').innerHTML=''">Close</button>
        <button type="button" class="btn" onclick="submitBulkGrades()">Submit All Grades for ${esc(keyStr)}</button>
    </div>
  </div>`;
  $('gradeEntryView').innerHTML = html;
  window._currentGradeSectionStudents = students;
}

async function submitBulkGrades() {
  const courseName = $('ge_course').value;
  const students = window._currentGradeSectionStudents || [];
  let successCount = 0;
  for(const s of students) {
      const input = $(`grade_${s.id}`);
      if(input && input.value.trim() !== "") {
          const gradeVal = parseFloat(input.value);
          if(gradeVal >= 1 && gradeVal <= 5) {
              const rec = { studentId: s.id, courseCode: 'N/A', courseName: courseName, grade: gradeVal, term: `${db.activeTerm} 2026-2027` };
              await fetch('/api/grades', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(rec) });
              successCount++;
          }
      }
  }
  if(successCount > 0) alert(`Successfully submitted ${successCount} grades for ${courseName}.`);
  else alert('No grades entered.');
}

function renderAttendance(c) {
  const myCourses = db.courses.filter(x => {
    const isTeacher = x.adviser === session.name || x.subjectTeacher === session.name;
    if (!isTeacher) return false;
    if (x.gradeLevel.includes('Grade 11') || x.gradeLevel.includes('Grade 12')) return x.gradeLevel.includes(db.activeTerm);
    return true;
  });

  const uniqueSections = [...new Set(myCourses.map(x => `${x.gradeLevel}|${x.section}`))];

  let html = `<div class="panel"><h2>Attendance (${esc(db.activeTerm)})</h2>
    <div class="form-panel" style="display:flex; gap:20px; align-items:flex-end; margin-bottom:30px;">
      <div class="field" style="flex:1;"><label>Course</label><select id="att_course">${myCourses.map(x=>`<option value="${esc(x.code)}">${esc(x.name)} — Sec ${esc(x.section)}</option>`).join('')}</select></div>
      <div class="field" style="flex:1;"><label>Date</label><input type="date" id="att_date" value="${new Date().toISOString().slice(0,10)}"></div>
      <button type="button" class="btn" style="margin-bottom:2px;" onclick="loadAttendance()">Load Students</button>
    </div>
    <div id="att_list" style="margin-bottom:30px;"></div>
    <hr style="border:0; border-top:1px solid #eaeaea; margin-bottom:20px;">
    <h3 style="color:#5c0000; margin-bottom:15px;">Attendance History</h3>
    <p style="color:#666; margin-bottom:20px; font-size:14px;">Select a section to view all submitted attendance records.</p>
    <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap:15px;">`;

  if(uniqueSections.length === 0) html += `<p style="color:#999;">No classes assigned to you for ${esc(db.activeTerm)}.</p>`;
  else uniqueSections.forEach(secString => { const [gradeLevel, section] = secString.split('|'); html += folderCard(`${esc(gradeLevel)}`, `Section ${esc(section)}`, `showAttendanceHistory('${esc(gradeLevel)}', '${esc(section)}')`); });
  html += `</div><div id="attendance_history_view" style="margin-top:20px;"></div></div>`;
  c.innerHTML = html;
}

async function loadAttendance() {
  const code = $('att_course').value;
  const date = $('att_date').value;
  const crs = db.courses.find(x => x.code === code);
  if (!crs) return;

  let list = db.students.filter(s => isStudentInSection(s.yr, crs.gradeLevel, crs.section));

  if (list.length === 0) {
      $('att_list').innerHTML = `<div class="panel" style="background:#f9eaea; border-left:4px solid #a00;"><p style="color:#a00; font-weight:bold;">Walang estudyanteng naka-assign sa Grade Level at Section na ito.</p></div>`;
      return;
  }

  const existing = await (await fetch(`/api/attendance/${code}/${crs.section}/${date}`)).json();
  const map = {}; existing.forEach(e => map[e.studentId] = e.status);
  
  $('att_list').innerHTML = `<div class="panel" style="background:#f9f9f9; border:1px solid #ddd; padding:20px;">
  <h4 style="margin-bottom:15px; color:#5c0000;">Taking Attendance: ${esc(crs.name)} (${esc(date)})</h4>
  <table style="width:100%;"><thead><tr><th>Student Name</th><th>Status</th></tr></thead><tbody>
    ${list.map(s => `<tr><td style="padding:10px; border-bottom:1px solid #eee;">${esc(s.last+', '+s.first)}</td><td style="padding:10px; border-bottom:1px solid #eee;">
      <select id="att_status_${s.id}" style="padding:8px; border-radius:4px; border:1px solid #ccc;">
        <option value="Present" ${map[s.id]==='Present' || !map[s.id] ? 'selected' : ''}>Present</option>
        <option value="Absent" ${map[s.id]==='Absent'?'selected':''}>Absent</option>
        <option value="Late" ${map[s.id]==='Late'?'selected':''}>Late</option>
      </select>
    </td></tr>`).join('')}</tbody></table>
    <div style="margin-top:20px; text-align:right;">
        <button type="button" class="btn" onclick="saveBulkAttendance('${code}', '${crs.section}', '${date}', '${crs.gradeLevel}')">Save Attendance</button>
    </div>
  </div>`;
}

async function saveBulkAttendance(courseCode, section, date, gradeLevel) {
  const crs = db.courses.find(x => x.code === courseCode);
  let list = db.students.filter(s => isStudentInSection(s.yr, crs.gradeLevel, crs.section));
  let successCount = 0;

  for (const s of list) {
    const statusSelect = $(`att_status_${s.id}`);
    if (statusSelect) {
      const status = statusSelect.value;
      await fetch('/api/attendance', { 
        method: 'POST', 
        headers: {'Content-Type':'application/json'}, 
        body: JSON.stringify({ courseCode, section, studentId: s.id, date, status }) 
      });
      successCount++;
    }
  }

  alert(`Successfully saved attendance for ${successCount} students!`);
  showAttendanceHistory(gradeLevel, section);
}

async function showAttendanceHistory(gradeLevel, section) {
  const history = await (await fetch(`/api/attendance/history/${encodeURIComponent(section)}`)).json();
  const filteredHistory = history.filter(h => h.gradeLevel === gradeLevel);

  if(filteredHistory.length === 0) {
      $('attendance_history_view').innerHTML = `<div class="panel" style="background:#f9f9f9; border-left:4px solid #ccc;"><p style="color:#666;">No attendance records found for ${esc(gradeLevel)} | Section ${esc(section)} yet.</p></div>`;
      return;
  }

  const groupedByDate = {};
  filteredHistory.forEach(h => {
      if (!groupedByDate[h.date]) groupedByDate[h.date] = [];
      groupedByDate[h.date].push(h);
  });

  const sortedDates = Object.keys(groupedByDate).sort().reverse();
  let html = `<div class="panel" style="border:2px solid #5c0000;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
        <h3 style="color:#5c0000; margin:0;">History: ${esc(gradeLevel)} | Section ${esc(section)}</h3>
        <button type="button" class="btn secondary" onclick="$('attendance_history_view').innerHTML=''">Close</button>
      </div>
      <div style="display:grid; gap:20px;">`;

  sortedDates.forEach(date => {
      const dailyRecords = groupedByDate[date];
      const groupedBySubject = {};
      dailyRecords.forEach(r => {
          if (!groupedBySubject[r.courseName]) groupedBySubject[r.courseName] = [];
          groupedBySubject[r.courseName].push(r);
      });

      html += `<div style="background:#f9eaea; padding:15px; border-radius:8px; border-left:4px solid #5c0000;">
          <h4 style="margin-bottom:15px; color:#333;">📅 ${esc(date)}</h4>
          <div style="display:grid; gap:15px;">`;

      Object.keys(groupedBySubject).forEach(subject => {
          const subjectRecords = groupedBySubject[subject];
          html += `<div style="background:white; padding:15px; border-radius:6px; box-shadow:0 2px 4px rgba(0,0,0,0.05);">
              <h5 style="margin-bottom:10px; color:#5c0000; border-bottom:1px solid #eee; padding-bottom:5px;">${esc(subject)}</h5>
              <table style="width:100%; font-size:13px;">
                  <thead><tr style="background:#f8f9fa; color:#555;">
                      <th style="padding:8px; text-align:left;">Student Name</th>
                      <th style="padding:8px; text-align:left;">Status</th>
                  </tr></thead>
                  <tbody>`;

          subjectRecords.forEach(r => {
              const color = r.status === 'Present' ? 'green' : r.status === 'Late' ? 'orange' : 'red';
              html += `<tr style="border-bottom:1px solid #f0f0f0;">
                  <td style="padding:8px;">${esc(r.last)}, ${esc(r.first)}</td>
                  <td style="padding:8px; font-weight:bold; color:${color};">${esc(r.status)}</td>
              </tr>`;
          });
          html += `</tbody></table></div>`;
      });
      html += `</div></div>`;
  });
  html += `</div></div>`;
  $('attendance_history_view').innerHTML = html;
}

function renderRegistration(c) {
  const s = currentStudent();
  const studentYear = s.yr.split('-')[0].trim(); 
  const studentTrack = s.yr.includes('STEM') ? 'STEM' : s.yr.includes('HUMSS') ? 'HUMSS' : s.yr.includes('ABM') ? 'ABM' : '';
  const studentSem = s.yr.includes('2nd Semester') ? '2nd Semester' : '1st Semester';
  let studentSec = '1'; 
  if (s.yr.includes('Sec ')) studentSec = s.yr.split('Sec ')[1].trim();

  const mySubjects = db.courses.filter(cr => {
    if (s.course === 'SHS') {
      return cr.gradeLevel.includes(studentYear) && cr.gradeLevel.includes(studentTrack) && cr.gradeLevel.includes(db.activeTerm) && cr.section === studentSec && cr.status === 'Open';
    } else {
      return cr.gradeLevel.startsWith(studentYear) && cr.section === studentSec && cr.status === 'Open';
    }
  });
  
  c.innerHTML = `<div class="panel"><h2>My Subjects</h2>
    <p style="margin-bottom:15px; color:#666;">These are the subjects you are officially enrolled in for <b>${esc(db.activeTerm)}</b>.</p>
    ${simpleTable(['Code','Name','Section','Teacher'], mySubjects.map(x => [esc(x.code), esc(x.name), esc(x.section), esc(x.subjectTeacher)]))}
  </div>`;
}

async function renderSchedule(c) {
  const s = currentStudent();
  let studentYear = s.yr.split('-')[0].trim(); 
  let queryYr = s.yr;
  if (s.course === 'SHS') {
     const studentTrack = s.yr.includes('STEM') ? 'STEM' : s.yr.includes('HUMSS') ? 'HUMSS' : s.yr.includes('ABM') ? 'ABM' : '';
     queryYr = `${studentYear} - ${studentTrack} - ${db.activeTerm}`;
  }
  let studentSec = '1'; 
  if (s.yr.includes('Sec ')) studentSec = s.yr.split('Sec ')[1].trim();

  const sched = await (await fetch(`/api/schedules/${encodeURIComponent(queryYr)}/${studentSec}`)).json();
  
  if (sched.length === 0) {
    c.innerHTML = `<div class="panel"><h2>Class Schedule</h2><p style="color:#999;">No schedule found for ${esc(db.activeTerm)}.</p></div>`;
    return;
  }

  const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']; 
  let html = `<div class="panel"><h2>Class Schedule</h2><p style="margin-bottom:15px; color:#666;">Weekly schedule for <b>${esc(s.yr)}</b> | <b>${esc(db.activeTerm)}</b></p>
    <div style="display:grid; gap:20px;">`;

  daysOrder.forEach(day => {
    const daySched = sched.filter(x => x.day === day).sort((a,b) => a.startTime.localeCompare(b.startTime));
    if (daySched.length > 0) {
      html += `<div style="background:#f9eaea; padding:15px; border-radius:8px; border-left:4px solid #5c0000;">
        <h3 style="color:#5c0000; margin-bottom:10px; text-transform:uppercase; font-size:14px;">${day}</h3>
        <table style="width:100%; background:white; border-radius:6px; overflow:hidden; box-shadow:0 2px 5px rgba(0,0,0,0.05);">
          <thead><tr style="background:#5c0000; color:white; font-size:12px;">
            <th style="padding:8px; text-align:left;">TIME</th>
            <th style="padding:8px; text-align:left;">SUBJECT</th>
            <th style="padding:8px; text-align:left;">TEACHER</th>
          </tr></thead>
          <tbody>`;
      daySched.forEach(item => {
        html += `<tr style="border-bottom:1px solid #eee;">
          <td style="padding:10px; font-weight:bold; color:#5c0000; font-size:13px;">${item.startTime} - ${item.endTime}</td>
          <td style="padding:10px; font-size:14px;"><b>${esc(item.courseName)}</b></td>
          <td style="padding:10px; font-size:13px; color:#555;">${esc(item.teacherName)}</td>
        </tr>`;
      });
      html += `</tbody></table></div>`;
    }
  });
  html += `</div></div>`;
  c.innerHTML = html;
}

async function renderProfileGrades(c) {
  const s = currentStudent();
  const studentYear = s.yr.split('-')[0].trim(); 
  const studentTrack = s.yr.includes('STEM') ? 'STEM' : s.yr.includes('HUMSS') ? 'HUMSS' : s.yr.includes('ABM') ? 'ABM' : '';
  let studentSec = '1';
  if (s.yr.includes('Sec ')) studentSec = s.yr.split('Sec ')[1].trim();

  const mySubjects = db.courses.filter(cr => {
    if (s.course === 'SHS') {
      return cr.gradeLevel.includes(studentYear) && cr.gradeLevel.includes(studentTrack) && cr.gradeLevel.includes(db.activeTerm) && cr.section === studentSec;
    } else {
      return cr.gradeLevel.startsWith(studentYear) && cr.section === studentSec;
    }
  });

  const grades = await (await fetch('/api/student/grades/' + s.id)).json();
  const rows = mySubjects.map(sub => {
    const gradeRec = grades.find(g => g.courseName === sub.name);
    const gradeVal = gradeRec ? gradeRec.grade : '--';
    const remarks = gradeRec ? (gradeRec.grade <= 3.0 ? 'PASSED' : 'FAILED') : 'ONGOING';
    return [esc(sub.code), esc(sub.name), esc(sub.subjectTeacher), `<b>${gradeVal}</b>`, remarks];
  });

  c.innerHTML = `<div class="panel">
    <h2 style="margin-bottom:10px;">Report of Grades</h2>
    <p style="margin-bottom:20px; color:#666;">Showing subjects for <b>${esc(db.activeTerm)}</b>.</p>
    ${simpleTable(['Course Code','Subject Name','Teacher','Grade','Remarks'], rows)}
  </div>`;
}

async function renderStudentRecords(c) {
  const s = currentStudent();
  const records = await (await fetch('/api/student/records/' + s.id)).json();
  const groups = {};
  records.forEach(r => { if (!groups[r.gradeLevel]) groups[r.gradeLevel] = []; groups[r.gradeLevel].push(r); });
  let html = `<div class="panel"><h2>My Records</h2>`;
  const keys = Object.keys(groups);
  if (keys.length === 0) html += `<p style="color:#999;">No historical records yet.</p>`;
  keys.forEach(k => html += `<div class="folder" onclick="showRecordFolder('${esc(k)}')"><span>📁 ${esc(k)} (${groups[k].length} subjects)</span> <span>&rarr;</span></div>`);
  html += `<div id="recordView"></div></div>`;
  c.innerHTML = html;
  window._records = groups;
}

function showRecordFolder(grade) {
  const rows = window._records[grade] || [];
  $('recordView').innerHTML = `<div class="panel" style="margin-top:20px; border:2px solid #5c0000;"><h3>${esc(grade)} — Records</h3>${simpleTable(['School Year','Subject','Grade','Status'], rows.map(r => [esc(r.schoolYear), esc(r.subject), `<b>${esc(r.grade)}</b>`, esc(r.status)]))}</div>`;
}

function renderStudentProfile(c) {
  const s = currentStudent();
  c.innerHTML = `
    <div class="panel">
      <h2 style="border-bottom: 2px solid #5c0000; padding-bottom:10px; margin-bottom:20px;">Student Profile</h2>
      <div style="display:flex; align-items:center; gap:20px; margin-bottom:30px;">
        <div style="width:80px; height:80px; background:#5c0000; color:white; border-radius:50%; display:flex; justify-content:center; align-items:center; font-size:32px; font-weight:bold;">
          ${esc(s.first.charAt(0))}${esc(s.last.charAt(0))}
        </div>
        <div>
          <h3 style="font-size:24px; color:#333; margin-bottom:5px;">${esc(s.first)} ${esc(s.mi)} ${esc(s.last)}</h3>
          <p style="color:#666; font-size:15px;">${esc(s.yr)}</p>
        </div>
      </div>
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(250px, 1fr)); gap:20px;">
        <div style="background:#f9f9f9; padding:15px; border-radius:8px; border-left:4px solid #5c0000;"><small style="color:#888; font-weight:bold; text-transform:uppercase;">Student No.</small><div style="font-size:16px; font-weight:600; margin-top:5px;">${esc(s.id)}</div></div>
        <div style="background:#f9f9f9; padding:15px; border-radius:8px; border-left:4px solid #5c0000;"><small style="color:#888; font-weight:bold; text-transform:uppercase;">Email Address</small><div style="font-size:16px; font-weight:600; margin-top:5px;">${esc(s.email || 'N/A')}</div></div>
        <div style="background:#f9f9f9; padding:15px; border-radius:8px; border-left:4px solid #5c0000;"><small style="color:#888; font-weight:bold; text-transform:uppercase;">Birthday</small><div style="font-size:16px; font-weight:600; margin-top:5px;">${esc(s.birthday || 'N/A')}</div></div>
        <div style="background:#f9f9f9; padding:15px; border-radius:8px; border-left:4px solid #5c0000;"><small style="color:#888; font-weight:bold; text-transform:uppercase;">Age</small><div style="font-size:16px; font-weight:600; margin-top:5px;">${esc(s.age || 'N/A')}</div></div>
        <div style="background:#f9f9f9; padding:15px; border-radius:8px; border-left:4px solid #5c0000;"><small style="color:#888; font-weight:bold; text-transform:uppercase;">Gender</small><div style="font-size:16px; font-weight:600; margin-top:5px;">${esc(s.gender || 'N/A')}</div></div>
        <div style="background:#f9f9f9; padding:15px; border-radius:8px; border-left:4px solid #5c0000;"><small style="color:#888; font-weight:bold; text-transform:uppercase;">Address</small><div style="font-size:16px; font-weight:600; margin-top:5px;">${esc(s.address || 'N/A')}</div></div>
        <div style="background:#f9f9f9; padding:15px; border-radius:8px; border-left:4px solid #5c0000;"><small style="color:#888; font-weight:bold; text-transform:uppercase;">Guardian Name</small><div style="font-size:16px; font-weight:600; margin-top:5px;">${esc(s.guardianName || 'N/A')}</div></div>
        <div style="background:#f9f9f9; padding:15px; border-radius:8px; border-left:4px solid #5c0000;"><small style="color:#888; font-weight:bold; text-transform:uppercase;">Guardian Contact</small><div style="font-size:16px; font-weight:600; margin-top:5px;">${esc(s.guardianContact || 'N/A')}</div></div>
      </div>
    </div>`;
}