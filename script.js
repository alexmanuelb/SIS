let db = { students: [], courses: [], users: [], enrollments: [], grades: [], schedules: [], attendance: [], records: [] };
let session = null;
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function doLogin() {
  const username = $('loginUser').value.trim();
  const password = $('loginPass').value.trim();
  if (!username || !password) return alert('Enter username and password');
  
  fetch('/api/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  }).then(res => res.json().then(data => ({ status: res.status, data })))
  .then(async ({ status, data }) => {
    if (status !== 200) return alert(data.error);
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
    else if (session.role === 'Registrar') navigate('activeDirectory');
    else if (session.role === 'Faculty') navigate('facultyDashboard');
    else navigate('studentDashboard');
    
    setInterval(() => { $('clock').textContent = new Date().toLocaleTimeString(); }, 1000);
  }).catch(e => alert('Login failed.'));
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
  return db.students.find(s => s.username === session.username) || null;
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
    <div class="panel">
      <h2>Admin Dashboard</h2>
      <p style="color:#666; font-size:15px;">Welcome back, <b>${esc(session.name)}</b>. Use the sidebar to manage records.</p>
    </div>`;
}

function renderFacultyDashboard(c) {
  const myCourses = db.courses.filter(x => x.adviser === session.name || x.subjectTeacher === session.name);
  c.innerHTML = `
    <div class="dashboard-cards">
      <div class="stat-card"><h3>${myCourses.length}</h3><p>MY ASSIGNED CLASSES</p></div>
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

function renderActiveDirectory(c) {
  const active = db.students.filter(s => s.status !== 'Archived' && s.status !== 'Graduated');
  c.innerHTML = `<div class="panel">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
      <h2 style="margin:0;">Student Directory</h2>
      <button class="btn" onclick="openStudentForm()">+ Add New Student</button>
    </div>
    <div id="enrollFormArea"></div>
    ${simpleTable(['Student ID','Last Name','First Name','Year Level','Status','Action'],
      active.map(s => [esc(s.id), esc(s.last), esc(s.first), esc(s.yr), `<span class="badge ${s.status === 'Active' ? 'active' : 'inactive'}">${esc(s.status)}</span>`,
        `<button class="btn secondary" onclick="openStudentForm('${esc(s.id)}')">Edit</button>`]))}
  </div>`;
}

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
  let currentSem = '1st Sem';
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
  const statuses = ['Active', 'Archived', 'Graduated'];
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
            <option value="1st Sem" ${currentSem === '1st Sem' ? 'selected' : ''}>1st Semester</option>
            <option value="2nd Sem" ${currentSem === '2nd Sem' ? 'selected' : ''}>2nd Semester</option>
          </select>
        </div>
        <div class="field"><label>Status</label>
          <select id="f_status">${statuses.map(st => `<option value="${st}" ${s?.status === st ? 'selected' : ''}>${st}</option>`).join('')}</select>
        </div>
      </div>
      <button class="btn" onclick="saveStudent('${esc(s?.id||'')}')">Save</button>
      <button class="btn secondary" onclick="$('enrollFormArea').innerHTML=''">Cancel</button>
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
    id: $('f_id').value, 
    last: $('f_last').value, 
    first: first, 
    mi: $('f_mi').value, 
    course: course, 
    yr: yr, 
    status: $('f_status').value, 
    enrol: 'Enrolled', 
    email: email,
    birthday: $('f_birthday').value,
    age: $('f_age').value,
    gender: $('f_gender').value,
    address: $('f_address').value,
    guardianName: $('f_guardianName').value,
    guardianContact: $('f_guardianContact').value
  };
  
  const res = await fetch('/api/students', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(rec) });
  if(!res.ok) return alert('Error saving');
  
  if (!existingId && email) {
    alert('Student added! An email containing their login credentials has been sent to ' + email);
  }

  db.students = await (await fetch('/api/students')).json();
  db.users = await (await fetch('/api/users')).json();
  $('enrollFormArea').innerHTML = ''; renderActiveDirectory($('content')); 
}

function renderFacultyDirectory(c) {
  const facultyList = db.users.filter(u => u.role === 'Faculty');
  const rows = facultyList.map(f => {
    const advised = db.courses.filter(crs => crs.adviser === f.name).map(crs => `${crs.gradeLevel} (Sec ${crs.section})`);
    const advisoryDisplay = advised.length > 0 ? advised[0] : '<span style="color:#999;">None</span>';
    return [`<b>${esc(f.username)}</b>`, esc(f.name), advisoryDisplay, `<button class="btn secondary" onclick="openEditFacultyForm('${esc(f.username)}')">Edit</button>`];
  });

  c.innerHTML = `<div class="panel">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
      <h2 style="margin:0;">Faculty Directory</h2>
      <button class="btn" onclick="openAddFacultyForm()">+ Add New Teacher</button>
    </div>
    <div id="facultyFormArea"></div>
    ${simpleTable(['Username', 'Full Name', 'Advisory Class', 'Action'], rows)}
  </div>`;
}

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
        <div class="field"><label>System Generated Username</label><input id="t_user" readonly style="background:#e9ecef;"></div>
        <div class="field"><label>System Generated Password</label><input id="t_pass" readonly style="background:#e9ecef;"></div>
        <div class="field"><label>Department</label><input id="t_dept" placeholder="e.g., Math Dept"></div>
        <div class="field"><label>Advisory Class</label>
          <select id="t_advisory">
            <option value="">-- No Advisory Class --</option>
            ${uniqueSections.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join('')}
          </select>
        </div>
      </div>
      <button class="btn" onclick="saveFaculty()">Create Teacher</button>
      <button class="btn secondary" onclick="$('facultyFormArea').innerHTML=''">Cancel</button>
    </div>`;
}

function generateFacultyCredentials() {
  const name = $('t_name').value.trim().replace(/^T\.\s*/i, '');
  if (!name) {
    $('t_user').value = '';
    $('t_pass').value = '';
    return;
  }
  const parts = name.split(' ');
  const firstName = parts[0].toLowerCase();
  const lastName = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';

  $('t_user').value = `t.${firstName}${lastName}`;
  $('t_pass').value = `${firstName}123`;
}

async function saveFaculty() {
  const rec = { 
    username: $('t_user').value.trim(), 
    password: $('t_pass').value.trim(), 
    name: $('t_name').value.trim(), 
    role: 'Faculty', 
    section: $('t_dept').value.trim() 
  };
  const advisory = $('t_advisory').value;

  if(!rec.username || !rec.password || !rec.name) return alert('Fill in required fields');
  
  const res = await fetch('/api/faculty', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(rec) });
  if(!res.ok) return alert('Username already exists');

  if (advisory) {
    const [gradePart, sectionPart] = advisory.split(' - Section ');
    const grade = gradePart.trim();
    const sec = sectionPart.trim();
    const coursesToUpdate = db.courses.filter(c => c.gradeLevel === grade && c.section === sec);
    for(const crs of coursesToUpdate) {
        await fetch('/api/courses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...crs, adviser: rec.name }) });
    }
  }
  
  db.users = await (await fetch('/api/users')).json();
  db.courses = await (await fetch('/api/courses')).json();
  $('facultyFormArea').innerHTML = '';
  renderFacultyDirectory($('content'));
  alert('Teacher created!');
}

function openEditFacultyForm(username) {
  const user = db.users.find(u => u.username === username);
  if(!user) return;
  
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
      <button class="btn" onclick="updateFaculty('${esc(user.username)}')">Save Changes</button>
      <button class="btn secondary" onclick="$('facultyFormArea').innerHTML=''">Cancel</button>
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
    const grade = gradePart.trim();
    const sec = sectionPart.trim();
    const newCourses = db.courses.filter(c => c.gradeLevel === grade && c.section === sec);
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
  const grades = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11 - STEM - 1st Sem', 'Grade 11 - STEM - 2nd Sem', 'Grade 11 - HUMSS - 1st Sem', 'Grade 11 - HUMSS - 2nd Sem', 'Grade 11 - ABM - 1st Sem', 'Grade 11 - ABM - 2nd Sem', 'Grade 12 - STEM - 1st Sem', 'Grade 12 - STEM - 2nd Sem', 'Grade 12 - HUMSS - 1st Sem', 'Grade 12 - HUMSS - 2nd Sem', 'Grade 12 - ABM - 1st Sem', 'Grade 12 - ABM - 2nd Sem'];
  
  c.innerHTML = `<div class="panel">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
      <h2 style="margin:0;">Course & Section Management</h2>
      <div style="display:flex; gap:10px;">
        <button class="btn" onclick="openAddCourseForm()">+ Add New Course</button>
        <button class="btn secondary" onclick="openAddSectionForm()">+ Add New Section</button>
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

  // STATUS REMOVED
  $('courseTableContainer').innerHTML = simpleTable(['Code','Name','Grade Level','Section','Adviser','Subject Teacher'],
    filtered.map(x => [esc(x.code), esc(x.name), esc(x.gradeLevel), esc(x.section), esc(x.adviser), esc(x.subjectTeacher)])
  );
}

function openAddCourseForm() {
  const grades = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11 - STEM - 1st Sem', 'Grade 11 - STEM - 2nd Sem', 'Grade 11 - HUMSS - 1st Sem', 'Grade 11 - HUMSS - 2nd Sem', 'Grade 11 - ABM - 1st Sem', 'Grade 11 - ABM - 2nd Sem', 'Grade 12 - STEM - 1st Sem', 'Grade 12 - STEM - 2nd Sem', 'Grade 12 - HUMSS - 1st Sem', 'Grade 12 - HUMSS - 2nd Sem', 'Grade 12 - ABM - 1st Sem', 'Grade 12 - ABM - 2nd Sem'];
  $('courseFormArea').innerHTML = `
    <div class="form-panel" style="border-left: 4px solid #5c0000;">
      <h3 style="color:#5c0000; margin-bottom:15px;">Add New Course</h3>
      <div class="form-grid">
        <div class="field"><label>Course Code</label><input id="c_code" placeholder="e.g., MATH7-3"></div>
        <div class="field"><label>Course Name</label><input id="c_name" placeholder="e.g., Mathematics 7"></div>
        <div class="field"><label>Grade Level / Track</label>
          <select id="c_grade">${grades.map(g => `<option value="${g}">${g}</option>`).join('')}</select>
        </div>
        <div class="field"><label>Section</label><input id="c_section" placeholder="e.g., 3"></div>
        <div class="field" style="grid-column: span 2;"><label>Subject Teacher</label><input id="c_subjectTeacher" placeholder="e.g., T. Jose Rizal"></div>
      </div>
      <button class="btn" onclick="saveNewCourse()">Save Course</button>
      <button class="btn secondary" onclick="$('courseFormArea').innerHTML=''">Cancel</button>
    </div>`;
}

async function saveNewCourse() {
  const rec = { 
    code: $('c_code').value, 
    name: $('c_name').value, 
    gradeLevel: $('c_grade').value, 
    section: $('c_section').value, 
    adviser: '', 
    subjectTeacher: $('c_subjectTeacher').value,
    capacity: 30, 
    status: 'Open' 
  };
  await fetch('/api/courses', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(rec) });
  db.courses = await (await fetch('/api/courses')).json();
  $('courseFormArea').innerHTML = '';
  renderCourses($('content')); 
  alert('Course added!');
}

function openAddSectionForm() {
  const grades = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11 - STEM - 1st Sem', 'Grade 11 - STEM - 2nd Sem', 'Grade 11 - HUMSS - 1st Sem', 'Grade 11 - HUMSS - 2nd Sem', 'Grade 11 - ABM - 1st Sem', 'Grade 11 - ABM - 2nd Sem', 'Grade 12 - STEM - 1st Sem', 'Grade 12 - STEM - 2nd Sem', 'Grade 12 - HUMSS - 1st Sem', 'Grade 12 - HUMSS - 2nd Sem', 'Grade 12 - ABM - 1st Sem', 'Grade 12 - ABM - 2nd Sem'];
  $('courseFormArea').innerHTML = `
    <div class="form-panel" style="border-left: 4px solid #5c0000;">
      <h3 style="color:#5c0000; margin-bottom:15px;">Add New Section</h3>
      <div class="form-grid">
        <div class="field"><label>Grade Level / Track</label>
          <select id="s_grade">${grades.map(g => `<option value="${g}">${g}</option>`).join('')}</select>
        </div>
        <div class="field"><label>New Section Name</label><input id="s_section" placeholder="e.g., 3"></div>
        <div class="field" style="grid-column: span 2;"><label>Advisory Teacher</label><input id="s_adviser" placeholder="e.g., T. Maria Clara"></div>
      </div>
      <button class="btn" onclick="saveNewSection()">Create Section</button>
      <button class="btn secondary" onclick="$('courseFormArea').innerHTML=''">Cancel</button>
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
    await fetch('/api/courses', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: newCode, name: t.name, gradeLevel: t.gradeLevel, section: newSec, capacity: t.capacity, adviser: newAdviser, subjectTeacher: t.subjectTeacher, status: 'Open' })
    });
  }
  
  db.courses = await (await fetch('/api/courses')).json();
  $('courseFormArea').innerHTML = '';
  renderCourses($('content'));
  alert(`Section ${newSec} created for ${grade}!`);
}

function renderUsers(c) {
  const rows = db.users.map(u => [
    esc(u.username), 
    esc(u.name), 
    esc(u.role), 
    esc(u.section||'—'),
    `<div style="display:flex; gap:5px;">
        ${u.role === 'Student' ? `<button class="btn secondary" onclick="alert('Please edit student details in Student Directory')">Edit</button>` : (u.role === 'Faculty' ? `<button class="btn secondary" onclick="openEditFacultyForm('${esc(u.username)}')">Edit</button>` : '')}
        ${u.role !== 'Admin' ? `<button class="btn" style="background:#a00;" onclick="deleteUser('${esc(u.username)}')">Delete</button>` : ''}
     </div>`
  ]);
  c.innerHTML = `<div class="panel"><h2>Users & Access</h2>
    <p style="margin-bottom:15px; color:#666;">Manage system accounts.</p>
    ${simpleTable(['Username','Name','Role','Section','Action'], rows)}
  </div>`;
}

async function deleteUser(username) {
  if(!confirm(`Are you sure you want to delete user ${username}? This will also remove their student record if applicable.`)) return;
  const res = await fetch('/api/users/' + username, { method: 'DELETE' });
  if(!res.ok) return alert('Error deleting user');
  alert('User deleted!');
  db.users = await (await fetch('/api/users')).json();
  db.students = await (await fetch('/api/students')).json();
  renderUsers($('content'));
}

async function renderClassRecords(c) {
  const myCourses = db.courses.filter(x => x.adviser === session.name || x.subjectTeacher === session.name);
  const groups = {};
  for (const crs of myCourses) {
    const key = crs.gradeLevel + ' | Section ' + crs.section;
    if (!groups[key]) groups[key] = [];
    groups[key].push(crs);
  }
  let html = `<div class="panel"><h2>Class Records</h2><p>Click a folder to view enrolled students.</p>`;
  for (const key of Object.keys(groups)) html += `<div class="folder" onclick="showClassFolder('${esc(key)}')"><span>📁 ${esc(key)}</span> <span>&rarr;</span></div>`;
  if(Object.keys(groups).length === 0) html += `<p style="color:#999;">No classes assigned to you.</p>`;
  html += `<div id="classFolderView"></div></div>`;
  c.innerHTML = html;
}

async function showClassFolder(key) {
  const [gradeLevel, sectionPart] = key.split(' | Section ');
  const section = sectionPart.trim();
  const myCourses = db.courses.filter(x => (x.adviser === session.name || x.subjectTeacher === session.name) && x.gradeLevel === gradeLevel && x.section === section);
  const codes = myCourses.map(c => c.code);
  let rows = [];
  for (const s of db.students) {
    const en = await (await fetch('/api/enrollments/' + s.id)).json();
    if (en.some(e => codes.includes(e.courseCode))) rows.push(s);
  }
  $('classFolderView').innerHTML = `<div class="panel" style="margin-top:20px; border:2px solid #5c0000;"><h3>${esc(key)} — Enrolled Students</h3>${simpleTable(['ID','Name','Year'], rows.map(s => [esc(s.id), esc(s.last+', '+s.first), esc(s.yr)]))}</div>`;
}

function renderGradeEntry(c) {
  c.innerHTML = `<div class="panel"><h2>Grade Entry</h2><div class="form-panel"><div class="form-grid">
    <div class="field"><label>Student ID</label><input id="g_sid"></div>
    <div class="field"><label>Course Name</label><input id="g_cname"></div>
    <div class="field"><label>Grade (1.0 - 5.0)</label><input id="g_grade" type="number" step="0.25"></div>
    <div class="field"><label>Term</label><input id="g_term" value="1st Sem 2026-2027"></div>
  </div><button class="btn" onclick="submitGrade()">Submit Grade</button></div></div>`;
}

async function submitGrade() {
  const rec = { studentId: $('g_sid').value, courseCode: 'N/A', courseName: $('g_cname').value, grade: parseFloat($('g_grade').value), term: $('g_term').value };
  await fetch('/api/grades', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(rec) });
  alert('Grade submitted!'); $('g_sid').value = ''; $('g_cname').value = ''; $('g_grade').value = '';
}

function renderAttendance(c) {
  const myCourses = db.courses.filter(x => x.adviser === session.name || x.subjectTeacher === session.name);
  c.innerHTML = `<div class="panel"><h2>Attendance</h2><div class="form-panel" style="display:flex; gap:20px; align-items:flex-end;">
    <div class="field" style="flex:1;"><label>Course</label><select id="att_course">${myCourses.map(x=>`<option value="${esc(x.code)}">${esc(x.name)} — Sec ${esc(x.section)}</option>`).join('')}</select></div>
    <div class="field" style="flex:1;"><label>Date</label><input type="date" id="att_date" value="${new Date().toISOString().slice(0,10)}"></div>
    <button class="btn" style="margin-bottom:2px;" onclick="loadAttendance()">Load Students</button>
  </div><div id="att_list" style="margin-top:20px;"></div></div>`;
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
    ${list.map(s => `<tr><td>${esc(s.last+', '+s.first)}</td><td><select onchange="markAttendance('${code}','${esc(crs.section)}','${esc(s.id)}','${date}', this.value)" style="padding:8px; border-radius:4px; border:1px solid #ccc;">
      <option value="Present" ${map[s.id]==='Present'?'selected':''}>Present</option><option value="Absent" ${map[s.id]==='Absent'?'selected':''}>Absent</option><option value="Late" ${map[s.id]==='Late'?'selected':''}>Late</option>
    </select></td></tr>`).join('')}</tbody></table>`;
}

async function markAttendance(courseCode, section, studentId, date, status) {
  await fetch('/api/attendance', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ courseCode, section, studentId, date, status }) });
}

function renderRegistration(c) {
  const s = currentStudent();
  
  const studentYear = s.yr.split('-')[0].trim(); 
  const studentTrack = s.yr.includes('STEM') ? 'STEM' : s.yr.includes('HUMSS') ? 'HUMSS' : s.yr.includes('ABM') ? 'ABM' : '';
  const studentSem = s.yr.includes('2nd Sem') ? '2nd Sem' : '1st Sem';
  
  let studentSec = '1'; 
  if (s.yr.includes('Sec ')) {
      studentSec = s.yr.split('Sec ')[1].trim();
  }

  const mySubjects = db.courses.filter(cr => {
    if (s.course === 'SHS') {
      return cr.gradeLevel.includes(studentYear) && 
             cr.gradeLevel.includes(studentTrack) && 
             cr.gradeLevel.includes(studentSem) && 
             cr.section === studentSec && 
             cr.status === 'Open';
    } else {
      return cr.gradeLevel.startsWith(studentYear) && cr.section === studentSec && cr.status === 'Open';
    }
  });
  
  c.innerHTML = `<div class="panel"><h2>My Subjects</h2>
    <p style="margin-bottom:15px; color:#666;">These are the subjects you are officially enrolled in for <b>${esc(s.yr)}</b>.</p>
    ${simpleTable(['Code','Name','Section','Teacher'], mySubjects.map(x => [esc(x.code), esc(x.name), esc(x.section), esc(x.subjectTeacher)]))}
  </div>`;
}

async function renderSchedule(c) {
  const s = currentStudent();
  
  let studentYear = s.yr.split('-')[0].trim(); 
  let queryYr = s.yr;
  if (s.course === 'SHS') {
     const studentTrack = s.yr.includes('STEM') ? 'STEM' : s.yr.includes('HUMSS') ? 'HUMSS' : s.yr.includes('ABM') ? 'ABM' : '';
     const studentSem = s.yr.includes('2nd Sem') ? '2nd Sem' : '1st Sem';
     queryYr = `${studentYear} - ${studentTrack} - ${studentSem}`;
  }
  
  let studentSec = '1'; 
  if (s.yr.includes('Sec ')) {
      studentSec = s.yr.split('Sec ')[1].trim();
  }

  const sched = await (await fetch(`/api/schedules/${encodeURIComponent(queryYr)}/${studentSec}`)).json();
  
  if (sched.length === 0) {
    c.innerHTML = `<div class="panel"><h2>Class Schedule</h2><p style="color:#999;">No schedule found for your section.</p></div>`;
    return;
  }

  const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  let html = `<div class="panel"><h2>Class Schedule</h2><p style="margin-bottom:15px; color:#666;">Weekly schedule for <b>${esc(s.yr)}</b></p>
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
          <td style="padding:10px; font-size:13px; color:#555;">${esc(item.adviser)}</td>
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
  const grades = await (await fetch('/api/student/grades/' + s.id)).json();
  c.innerHTML = `<div class="panel"><h2>Academic Profile & Grades</h2>${simpleTable(['Course','Grade','Term'], grades.map(g => [esc(g.courseName), `<b>${esc(g.grade)}</b>`, esc(g.term)]))}</div>`;
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
  c.innerHTML = `<div class="panel"><h2>Student Profile</h2><div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-top:20px;">
    <div><small style="color:#888; font-weight:bold;">NAME</small><div style="font-size:16px; font-weight:600; margin-top:5px;">${esc(s.first)} ${esc(s.mi)} ${esc(s.last)}</div></div>
    <div><small style="color:#888; font-weight:bold;">STUDENT NO.</small><div style="font-size:16px; font-weight:600; margin-top:5px;">${esc(s.id)}</div></div>
    <div><small style="color:#888; font-weight:bold;">YEAR LEVEL</small><div style="font-size:16px; font-weight:600; margin-top:5px;">${esc(s.yr)}</div></div>
    <div><small style="color:#888; font-weight:bold;">ADDRESS</small><div style="font-size:16px; font-weight:600; margin-top:5px;">${esc(s.address)}</div></div>
    <div><small style="color:#888; font-weight:bold;">BIRTHDAY</small><div style="font-size:16px; font-weight:600; margin-top:5px;">${esc(s.birthday || 'N/A')}</div></div>
    <div><small style="color:#888; font-weight:bold;">AGE</small><div style="font-size:16px; font-weight:600; margin-top:5px;">${esc(s.age || 'N/A')}</div></div>
    <div><small style="color:#888; font-weight:bold;">GENDER</small><div style="font-size:16px; font-weight:600; margin-top:5px;">${esc(s.gender || 'N/A')}</div></div>
    <div><small style="color:#888; font-weight:bold;">GUARDIAN</small><div style="font-size:16px; font-weight:600; margin-top:5px;">${esc(s.guardianName || 'N/A')}</div></div>
    <div><small style="color:#888; font-weight:bold;">GUARDIAN CONTACT</small><div style="font-size:16px; font-weight:600; margin-top:5px;">${esc(s.guardianContact || 'N/A')}</div></div>
  </div></div>`;
}