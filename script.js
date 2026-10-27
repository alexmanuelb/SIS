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
function togglePassword() {
    const passInput = $('loginPass');
    const eyeOpen = $('eye-open');
    const eyeClosed = $('eye-closed');
    if (!passInput) return;
    if (passInput.type === "password") {
        passInput.type = "text";
        if (eyeOpen) eyeOpen.style.display = "block";
        if (eyeClosed) eyeClosed.style.display = "none";
    } else {
        passInput.type = "password";
        if (eyeOpen) eyeOpen.style.display = "none";
        if (eyeClosed) eyeClosed.style.display = "block";
    }
}

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
    $('appScreen').style.display = 'block';
    $('whoami').textContent = `${session.name} - ${session.role}`;

    buildSidebar();

    let startPage;
    if (session.role === 'Admin')        startPage = 'adminDashboard';
    else if (session.role === 'Faculty') startPage = 'facultyDashboard';
    else                                 startPage = 'studentDashboard';

    navigate(startPage);
    highlight(startPage);

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

/* ---------- SIDEBAR (NO BILLING) ---------- */
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
  nav.style.display = 'flex';
  nav.style.flexDirection = 'column';
  nav.style.height = 'calc(100vh - 70px)';
  nav.style.background = '#5c0000';

  let menuHTML = `<div class="portal-title" style="padding: 15px 20px; font-size: 12px; letter-spacing: 1px; opacity: 0.8; color: white;">${session.role} Portal</div>`;

  MENUS[session.role].forEach(item => {
    menuHTML += `<button class="menu-item" data-key="${item.key}" onclick="navigate('${item.key}'); highlight('${item.key}');" style="width: 100%; text-align: left; padding: 12px 20px; border: none; background: transparent; color: #ffcccc; cursor: pointer; font-size: 14px; transition: 0.2s;">${item.label}</button>`;
    if (item.children) {
      item.children.forEach(c => {
        menuHTML += `<button class="sub menu-item" data-key="${c.key}" onclick="navigate('${c.key}'); highlight('${c.key}');" style="width: 100%; text-align: left; padding: 10px 20px 10px 40px; border: none; background: transparent; color: #ffcccc; cursor: pointer; font-size: 13px; transition: 0.2s;">— ${c.label}</button>`;
      });
    }
  });

  menuHTML += `
    <div style="margin-top: auto; padding: 20px; border-top: 1px solid rgba(255,255,255,0.1);">
        <button class="logout-btn"
            style="width: 100%; background: white; color: #5c0000; border: 2px solid white; font-weight: bold; padding: 12px; cursor: pointer; border-radius: 5px; text-align: center; font-size: 14px;"
            onclick="doLogout()"
            onmouseover="this.style.background='#5c0000'; this.style.color='white'; this.style.borderColor='#ffcccc';"
            onmouseout="this.style.background='white'; this.style.color='#5c0000'; this.style.borderColor='white';"
        >Logout</button>
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
  if (!rows.length) return `<p class="empty-note">No records to display.</p>`;
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
    let student = db.students.find(s => s.username === session.username);
    if (!student) student = db.students.find(s => s.id === session.username);
    return student || {id:'', first:'', last:'', course:'', yr:'', birthday:'', status:''};
}

/* ---------- DASHBOARDS ---------- */
function renderAdminDashboard(c) {
  const totalFaculty = db.users.filter(u => u.role === 'Faculty').length;
  const totalStudents = db.students.length;
  const totalCourses = db.courses.length;
  const activeUsers = db.users.length;

  const recentStudents = db.students.slice(-5).reverse().map(s =>
      `<li style="padding: 8px 0; border-bottom: 1px solid #eee; display: flex; justify-content: space-between;">
          <span><b>${esc(s.first)} ${esc(s.last)}</b> (${esc(s.yr)})</span>
          <span class="badge active" style="font-size: 10px;">${esc(s.status)}</span>
       </li>`).join('');

  c.innerHTML = `
    <div class="panel">
        <h2>System Overview</h2>
        <p style="margin-bottom: 20px; color: #666;">Welcome back, Admin. Here is the current status of EduTrack.</p>
        <div class="cards" style="margin-bottom: 20px;">
            <div class="card" style="background: linear-gradient(135deg, #800000, #5c0000);"><div class="num">${totalStudents}</div><div class="lbl">Total Students</div></div>
            <div class="card" style="background: linear-gradient(135deg, #a00000, #800000);"><div class="num">${totalFaculty}</div><div class="lbl">Faculty Members</div></div>
            <div class="card" style="background: linear-gradient(135deg, #c00000, #a00000);"><div class="num">${totalCourses}</div><div class="lbl">Total Courses</div></div>
            <div class="card" style="background: linear-gradient(135deg, #e00000, #c00000);"><div class="num">${activeUsers}</div><div class="lbl">Registered Users</div></div>
        </div>
    </div>
    <div class="grid2">
        <div class="panel">
            <h2>Recently Added Students</h2>
            <ul style="list-style-type: none; padding: 0;">${recentStudents || '<li>No recent students.</li>'}</ul>
        </div>
        <div class="panel">
            <h2>Quick Actions</h2>
            <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 10px;">
                <button class="btn" onclick="navigate('activeDirectory'); highlight('activeDirectory');">Manage Students</button>
                <button class="btn" onclick="navigate('courses'); highlight('courses');">Manage Courses</button>
            </div>
        </div>
    </div>`;
}

async function renderFacultyDashboard(c) {
  const myCourses = db.courses.filter(course => course.adviser === session.name);
  const myCourseCodes = myCourses.map(course => course.code);

  let uniqueStudentIds = new Set();
  for (const student of db.students) {
      const enrollments = await (await fetch(`/api/enrollments/${student.id}`)).json();
      if (enrollments.some(e => myCourseCodes.includes(e.courseCode))) uniqueStudentIds.add(student.id);
  }

  c.innerHTML = `
    <div class="panel">
        <h2>Faculty Dashboard</h2>
        <p style="margin-bottom: 20px; color: #666;">Welcome, <b>${esc(session.name)}</b>.</p>
        <div class="cards">
            <div class="card" style="background: linear-gradient(135deg, #800000, #5c0000);"><div class="num">${uniqueStudentIds.size}</div><div class="lbl">My Students</div></div>
            <div class="card" style="background: linear-gradient(135deg, #a00000, #800000);"><div class="num">${myCourses.length}</div><div class="lbl">My Courses</div></div>
        </div>
    </div>`;
}

function startClock(elementId) {
    const clockElement = $(elementId);
    if (!clockElement) return;
    const updateTime = () => {
        const now = new Date();
        clockElement.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };
    updateTime();
    if (window.myClockInterval) clearInterval(window.myClockInterval);
    window.myClockInterval = setInterval(updateTime, 1000);
}

function renderStudentDashboard(c) {
  const s = currentStudent();
  c.innerHTML = `
    <div class="panel">
        <h2>Student Dashboard</h2>
        <p style="margin-bottom: 20px; color: #666;">Hello, <b>${esc(s.first)}</b>! Here is your academic summary.</p>
        <div class="cards">
            <div class="card" style="background: linear-gradient(135deg, #800000, #5c0000);"><div class="num">${db.enrollments.length}</div><div class="lbl">Enrolled Courses</div></div>
            <div class="card" style="background: linear-gradient(135deg, #c00000, #a00000);"><div class="num" id="student-clock" style="font-size: 26px;">--:-- --</div><div class="lbl">Current Time</div></div>
        </div>
    </div>
    <div class="grid2">
        <div class="panel">
            <h2>Quick Links</h2>
            <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 10px;">
                <button class="btn" onclick="navigate('registration'); highlight('registration');">Register for a Course</button>
                <button class="btn" onclick="navigate('studentRecords'); highlight('studentRecords');">View My Records</button>
            </div>
        </div>
    </div>`;
    startClock('student-clock');
}

/* ---------- STUDENT REGISTRATION ---------- */
function renderRegistration(c) {
  const s = currentStudent();
  const availableSections = [...new Set(
      db.courses
        .filter(course => course.gradeLevel === s.yr || course.gradeLevel.startsWith(s.yr))
        .map(course => course.section)
  )].sort();

  c.innerHTML = `<div class="panel">
    <h2>Online Course Registration</h2>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; background: #f6f9fd; padding: 10px 15px; border-radius: 8px;">
        <p style="color: #666; margin: 0;">Showing available courses for: <b>${esc(s.yr)}</b></p>
        <div style="display: flex; align-items: center; gap: 10px;">
            <label style="font-weight: bold; color: #5c0000; font-size: 14px;">Filter by Section:</label>
            <select id="regSectionFilter" onchange="drawRegistrationTable()" style="padding: 8px; border-radius: 6px; border: 1px solid #ccc; font-size: 14px; font-weight: bold; color: #333; cursor: pointer;">
                <option value="">All Sections</option>
                ${availableSections.map(sec => `<option value="${esc(sec)}">Section ${esc(sec)}</option>`).join('')}
            </select>
        </div>
    </div>
    <div id="registrationTableArea"></div>
  </div>`;
  drawRegistrationTable();
}

function drawRegistrationTable() {
  const s = currentStudent();
  const selectedSection = $('regSectionFilter') ? $('regSectionFilter').value : '';
  const myEnrolledCourseNames = db.enrollments
      .filter(e => e.studentId === s.id)
      .map(e => { const course = db.courses.find(c => c.code === e.courseCode); return course ? course.name : null; })
      .filter(name => name !== null);

  const availableCourses = db.courses.filter(course => {
      let matchesGradeAndSem = (s.yr && s.yr.includes('-'))
          ? course.gradeLevel === s.yr
          : course.gradeLevel.startsWith(s.yr);
      const isOpen = course.status === 'Open';
      const alreadyTaken = myEnrolledCourseNames.includes(course.name);
      const matchesSection = selectedSection === '' || course.section === selectedSection;
      return matchesGradeAndSem && isOpen && !alreadyTaken && matchesSection;
  });

  $('registrationTableArea').innerHTML = simpleTable(
      ['Course Code', 'Course Name', 'Section', 'Action'],
      availableCourses.map(x => [
          esc(x.code), esc(x.name), esc(x.section),
          `<button class="btn small" onclick="enrollCourse('${esc(x.code)}', '${esc(x.section)}')">Enroll</button>`
      ])
  );
}

async function enrollCourse(courseCode, section) {
    const s = currentStudent();
    try {
        const response = await fetch('/api/enroll', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentId: s.id, courseCode, section, term: '1st Sem' })
        });
        const data = await response.json();
        if (!response.ok) { alert(data.error); return; }
        db.enrollments = await (await fetch(`/api/enrollments/${s.id}`)).json();
        db.courses     = await (await fetch('/api/courses')).json();
        drawRegistrationTable();
        alert("Successfully Enrolled!");
    } catch (error) { alert("Failed to enroll."); }
}

/* ---------- STUDENT SCHEDULE (FROM DB) ---------- */
async function renderSchedule(c) {
    const s = currentStudent();
    c.innerHTML = `<div class="panel"><h2>Weekly Class Schedule</h2><p class="empty-note">Loading schedule...</p></div>`;

    try {
        const sched = await (await fetch(`/api/schedules/${encodeURIComponent(s.yr)}/1`)).json();
        if (!sched.length) {
            c.innerHTML = `<div class="panel"><h2>Weekly Class Schedule</h2><p class="empty-note">No schedule found for your section.</p></div>`;
            return;
        }
        c.innerHTML = `
        <div class="panel">
            <h2>Weekly Class Schedule</h2>
            <p style="margin-bottom: 15px; color: #666;">Schedule for <b>${esc(s.first)} ${esc(s.last)}</b> (${esc(s.yr)})</p>
            <table style="width: 100%; border-collapse: collapse; text-align: center; font-size: 13px;">
                <thead>
                    <tr style="background: #5c0000; color: white;">
                        <th style="padding: 10px; border: 1px solid #ddd;">Day</th>
                        <th style="padding: 10px; border: 1px solid #ddd;">Time</th>
                        <th style="padding: 10px; border: 1px solid #ddd;">Course</th>
                        <th style="padding: 10px; border: 1px solid #ddd;">Adviser</th>
                    </tr>
                </thead>
                <tbody>
                    ${sched.map(x => `
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd;">${esc(x.day)}</td>
                            <td style="padding: 10px; border: 1px solid #ddd;">${esc(x.startTime)} - ${esc(x.endTime)}</td>
                            <td style="padding: 10px; border: 1px solid #ddd;"><b>${esc(x.courseName)}</b></td>
                            <td style="padding: 10px; border: 1px solid #ddd;">${esc(x.adviser)}</td>
                        </tr>`).join('')}
                </tbody>
            </table>
        </div>`;
    } catch (e) {
        c.innerHTML = `<div class="panel"><h2>Weekly Class Schedule</h2><p class="empty-note">Failed to load schedule.</p></div>`;
    }
}

/* ---------- STUDENT PROFILE ---------- */
function renderStudentProfile(c) {
    const s = currentStudent();
    let age = '—';
    if (s.birthday) {
        const birthDate = new Date(s.birthday);
        const today = new Date();
        age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    }
    let formattedBday = 'Not Set';
    if (s.birthday) {
        formattedBday = new Date(s.birthday).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    }
    const initials = `${s.first ? s.first.charAt(0) : ''}${s.last ? s.last.charAt(0) : ''}`.toUpperCase();

    c.innerHTML = `
        <div class="panel" style="max-width: 800px; margin: 0 auto; border-radius: 12px; overflow: hidden; padding: 0;">
            <div style="background: linear-gradient(135deg, #800000, #5c0000); height: 120px; position: relative;">
                <div style="width: 100px; height: 100px; border-radius: 50%; background: #fff; color: #5c0000; display: flex; align-items: center; justify-content: center; font-size: 36px; font-weight: 800; position: absolute; bottom: -50px; left: 40px; box-shadow: 0 4px 10px rgba(0,0,0,0.2); border: 4px solid #fff;">${initials}</div>
            </div>
            <div style="padding: 60px 40px 20px 40px; display: flex; justify-content: space-between; align-items: flex-end;">
                <div>
                    <h2 style="margin: 0; font-size: 28px; color: #333; text-transform: none; border: none; padding: 0;">${esc(s.first)} ${esc(s.mi)} ${esc(s.last)}</h2>
                    <p style="color: #666; margin-top: 5px; font-size: 15px;">Student ID: <b>${esc(s.id)}</b></p>
                </div>
                <div><span class="badge active" style="font-size: 14px; padding: 6px 15px;">${esc(s.status)}</span></div>
            </div>
            <hr style="border: none; border-top: 1px solid #eee; margin: 0 40px;">
            <div style="padding: 30px 40px 40px 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 25px;">
                <div><small style="color: #800000; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; font-size: 11px;">Grade Level</small><div style="font-size: 16px; color: #222; margin-top: 4px; font-weight: 500;">${esc(s.yr)}</div></div>
                <div><small style="color: #800000; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; font-size: 11px;">Section</small><div style="font-size: 16px; color: #222; margin-top: 4px; font-weight: 500;">${esc(s.course)}</div></div>
                <div><small style="color: #800000; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; font-size: 11px;">Birthday</small><div style="font-size: 16px; color: #222; margin-top: 4px; font-weight: 500;">${formattedBday}</div></div>
                <div><small style="color: #800000; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; font-size: 11px;">Age</small><div style="font-size: 16px; color: #222; margin-top: 4px; font-weight: 500;">${age} years old</div></div>
                <div style="grid-column: span 2;"><small style="color: #800000; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; font-size: 11px;">Home Address</small><div style="font-size: 16px; color: #222; margin-top: 4px; font-weight: 500;">${esc(s.address) || 'Not Provided'}</div></div>
            </div>
        </div>`;
}

/* ---------- ADMIN: USERS ---------- */
function renderUsers(c) {
  const rows = db.users.map(u => [
      `<b>${esc(u.username)}</b>`,
      esc(u.name),
      `<span class="badge ${u.role === 'Admin' ? 'inactive' : 'active'}" style="background:${u.role === 'Admin' ? '#fde2e2' : (u.role === 'Faculty' ? '#e2f3fd' : '#d3f2dd')}; color:#333;">${esc(u.role)}</span>`,
      esc(u.section || '—'),
      `<button class="btn small" onclick="openEditUserForm('${esc(u.username)}')">Edit</button>`
  ]);
  c.innerHTML = `
    <div class="panel">
      <h2>Users Roles & Access Control</h2>
      <div id="editUserFormArea"></div>
      <p style="margin-bottom: 15px; color: #666;">Manage all registered accounts for students, faculty, and admins.</p>
      ${simpleTable(['Username', 'Full Name', 'Role', 'Assigned Section', 'Action'], rows)}
    </div>`;
}

function openEditUserForm(username) {
    const user = db.users.find(u => u.username === username);
    if (!user) return;
    $('editUserFormArea').innerHTML = `
        <div class="panel" style="background:#f6f9fd; border: 2px solid #800000;">
            <h2>Edit User: ${esc(user.username)}</h2>
            <div class="grid2">
                <div class="field"><label>Username (Cannot be changed)</label><input value="${esc(user.username)}" readonly style="background:#e0e0e0;"></div>
                <div class="field"><label>New Password (Leave blank to keep current)</label><input type="password" id="u_pass" placeholder="Enter new password"></div>
                <div class="field"><label>Full Name</label><input id="u_name" value="${esc(user.name)}"></div>
                <div class="field"><label>Role</label>
                    <select id="u_role">
                        <option value="Admin" ${user.role === 'Admin' ? 'selected' : ''}>Admin</option>
                        <option value="Faculty" ${user.role === 'Faculty' ? 'selected' : ''}>Faculty</option>
                        <option value="Student" ${user.role === 'Student' ? 'selected' : ''}>Student</option>
                    </select>
                </div>
                <div class="field"><label>Assigned Section</label><input id="u_section" value="${esc(user.section || '')}"></div>
            </div>
            <div class="actions">
                <button class="btn" onclick="saveUserEdit('${esc(user.username)}')">Save Changes</button>
                <button class="btn secondary" onclick="$('editUserFormArea').innerHTML=''">Cancel</button>
            </div>
        </div>`;
}

async function saveUserEdit(username) {
    const rec = { username, password: $('u_pass').value, name: $('u_name').value, role: $('u_role').value, section: $('u_section').value };
    try {
        await fetch('/api/users/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rec) });
        db.users = await (await fetch('/api/users')).json();
        alert("User updated successfully!");
        renderUsers($('content'));
    } catch (error) { alert("Failed to update user."); }
}

/* ---------- ADMIN: COURSES ---------- */
function renderCourses(c) {
  const gradeLevels = [...new Set(db.courses.map(course => course.gradeLevel))].sort();
  c.innerHTML = `
    <div class="panel">
        <h2>Course & Section Management</h2>
        <p style="margin-bottom: 15px; color: #666;">Create new courses and assign sections.</p>
        <div id="courseFormArea"></div>
        <div style="display: flex; gap: 15px; margin-bottom: 20px; background: #f6f9fd; padding: 15px; border-radius: 8px; border: 1px solid #ddd;">
            <div class="field" style="margin: 0; flex: 1;">
                <label style="font-size: 12px; font-weight: bold; color: #5c0000;">Filter by Grade Level</label>
                <select id="filterGrade" onchange="filterCoursesTable()" style="padding: 10px; border-radius: 6px; border: 1px solid #ccc; width: 100%;">
                    <option value="">All Grade Levels</option>
                    ${gradeLevels.map(g => `<option value="${esc(g)}">${esc(g)}</option>`).join('')}
                </select>
            </div>
            <div class="field" style="margin: 0; flex: 1;">
                <label style="font-size: 12px; font-weight: bold; color: #5c0000;">Filter by Section</label>
                <select id="filterSection" onchange="filterCoursesTable()" style="padding: 10px; border-radius: 6px; border: 1px solid #ccc; width: 100%;">
                    <option value="">All Sections</option>
                </select>
            </div>
        </div>
        <button class="btn" style="margin-bottom: 15px;" onclick="openCourseForm()">+ New Course</button>
        <div id="courseTableContainer"></div>
    </div>`;
  renderCoursesTable();
}

function openCourseForm() {
    $('courseFormArea').innerHTML = `
        <div class="panel" style="background:#f9eaea; border: 2px solid #800000;">
            <h2>Create New Course</h2>
            <div class="grid2">
                <div class="field"><label>Course Code</label><input id="c_code" placeholder="e.g., MATH8-2"></div>
                <div class="field"><label>Course Name</label><input id="c_name" placeholder="e.g., Mathematics 8"></div>
                <div class="field"><label>Grade Level</label><input id="c_grade" placeholder="e.g., Grade 8 or Grade 11 - STEM - 1st Sem"></div>
                <div class="field"><label>Section</label><input id="c_section" placeholder="e.g., 2"></div>
                <div class="field"><label>Capacity</label><input type="number" id="c_capacity" value="35"></div>
                <div class="field"><label>Adviser</label><input id="c_adviser" placeholder="e.g., T. Alan Turing"></div>
            </div>
            <div class="actions">
                <button class="btn" onclick="saveCourse()">Create Course</button>
                <button class="btn secondary" onclick="$('courseFormArea').innerHTML=''">Cancel</button>
            </div>
        </div>`;
}

async function saveCourse() {
    const rec = {
        code: $('c_code').value.trim(),
        name: $('c_name').value.trim(),
        gradeLevel: $('c_grade').value.trim(),
        section: $('c_section').value.trim(),
        capacity: parseInt($('c_capacity').value) || 35,
        adviser: $('c_adviser').value.trim(),
        status: 'Open'
    };
    if (!rec.code || !rec.name || !rec.gradeLevel || !rec.section) { alert('Fill in all fields.'); return; }
    try {
        const res = await fetch('/api/courses', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(rec) });
        const data = await res.json();
        if (!res.ok) { alert(data.error || 'Failed'); return; }
        db.courses = await (await fetch('/api/courses')).json();
        $('courseFormArea').innerHTML = '';
        renderCourses($('content'));
        alert('Course created!');
    } catch (e) { alert('Failed to create course.'); }
}

function renderCoursesTable() {
  const container = $('courseTableContainer');
  const selectedGrade = $('filterGrade') ? $('filterGrade').value : '';
  const selectedSection = $('filterSection') ? $('filterSection').value : '';
  updateSectionDropdown(selectedGrade, selectedSection);

  const filteredCourses = db.courses.filter(course =>
      (selectedGrade === '' || course.gradeLevel === selectedGrade) &&
      (selectedSection === '' || course.section === selectedSection)
  );

  const rows = filteredCourses.map(x => [
      esc(x.code), esc(x.name), esc(x.gradeLevel), esc(x.section), esc(x.adviser),
      `<span class="badge ${x.status === 'Open' ? 'active' : 'inactive'}">${esc(x.status)}</span>`
  ]);
  container.innerHTML = simpleTable(['Code', 'Name', 'Grade Level', 'Section', 'Adviser', 'Status'], rows);
}

function updateSectionDropdown(selectedGrade, currentSection) {
  const sectionSelect = $('filterSection');
  if (!sectionSelect) return;
  let availableSections = db.courses;
  if (selectedGrade !== '') availableSections = db.courses.filter(c => c.gradeLevel === selectedGrade);
  const uniqueSections = [...new Set(availableSections.map(course => course.section))].sort();
  sectionSelect.innerHTML = `<option value="">All Sections</option>` +
      uniqueSections.map(s => `<option value="${esc(s)}" ${s === currentSection ? 'selected' : ''}>${esc(s)}</option>`).join('');
}

function filterCoursesTable() { renderCoursesTable(); }

/* ---------- ADMIN: STUDENT DIRECTORY ---------- */
function renderActiveDirectory(c) {
  c.innerHTML = `<div class="panel"><h2>Active Student Directory</h2>
    <div class="toolbar"><input type="text" id="searchActive" placeholder="Search..." oninput="filterTable('activeTable','searchActive')"><button class="btn" onclick="openEnrollmentForm()">+ New Student</button></div>
    <div id="enrollmentFormArea"></div><div id="activeTable"></div></div>`;
  drawActiveTable();
}

function drawActiveTable() {
  const activeStudents = db.students.filter(s => s.status !== 'Archived' && s.status !== 'Graduated');
  $('activeTable').innerHTML = simpleTable(
    ['Student ID','Last Name','First Name','Course','Year','Status','Action'],
    activeStudents.map(s => [
        esc(s.id), esc(s.last), esc(s.first), esc(s.course), esc(s.yr),
        `<span class="badge ${s.status === 'Active' ? 'active' : 'inactive'}">${esc(s.status)}</span>`,
        `<button class="btn small" onclick="openEnrollmentForm('${esc(s.id)}')">Edit</button>`
    ])
  );
}

function renderLegacy(c) {
  const archivedStudents = db.students.filter(s => s.status === 'Archived' || s.status === 'Graduated');
  c.innerHTML = `
    <div class="panel">
        <h2>Legacy Record Archive</h2>
        <p style="margin-bottom: 15px; color: #666;">Students who have been archived or graduated.</p>
        ${simpleTable(
            ['Student ID', 'Name', 'Course', 'Year Level', 'Status'],
            archivedStudents.map(s => [
                esc(s.id), esc(s.last + ', ' + s.first), esc(s.course), esc(s.yr),
                `<span class="badge inactive" style="background:${s.status === 'Graduated' ? '#e2f3fd' : '#fde2e2'}; color:${s.status === 'Graduated' ? '#0056b3' : '#9b1c1c'};">${esc(s.status)}</span>`
            ])
        )}
    </div>`;
}

function openEnrollmentForm(existingId) {
  const s = existingId ? db.students.find(x => x.id === existingId) : null;
  const courseOptions = ['Kinder', 'Elem', 'High School', 'SHS'];
  const statusOptions = ['Active', 'Inactive', 'Archived', 'Graduated'];

  $('enrollmentFormArea').innerHTML = `
    <div class="panel" style="background:#f6f9fd"><h2>${s ? 'Edit Student Record' : 'New Student Enrollment'}</h2>
      <div class="grid2">
        <div class="field"><label>Student ID</label><input id="f_id" value="${esc(s?.id||'')}" ${s?'readonly':''}></div>
        <div class="field"><label>Surname</label><input id="f_last" value="${esc(s?.last||'')}"></div>
        <div class="field"><label>First Name</label><input id="f_first" value="${esc(s?.first||'')}"></div>
        <div class="field"><label>Middle Initial</label><input id="f_mi" value="${esc(s?.mi||'')}"></div>
        <div class="field"><label>Address</label><input id="f_address" value="${esc(s?.address||'')}"></div>
        <div class="field"><label>Birthday</label><input type="date" id="f_birthday" value="${esc(s?.birthday||'')}"></div>
        <div class="field"><label>Course / Department</label>
            <select id="f_course" onchange="updateYearDropdown()">
                ${courseOptions.map(c => `<option value="${c}" ${s?.course === c ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
        </div>
        <div class="field"><label>Year Level</label><select id="f_yr"></select></div>
        <div class="field" id="f_strand_group" style="display: none;">
            <label>SHS Strand</label>
            <select id="f_strand">
                <option value="STEM">STEM</option><option value="ABM">ABM</option>
                <option value="HUMSS">HUMSS</option><option value="GAS">GAS</option>
            </select>
        </div>
        <div class="field" id="f_sem_group" style="display: none;">
            <label>Semester</label>
            <select id="f_sem">
                <option value="1st Sem">1st Semester</option>
                <option value="2nd Sem">2nd Semester</option>
            </select>
        </div>
        <div class="field"><label>Status</label><select id="f_status">${statusOptions.map(st => `<option value="${st}" ${s?.status === st ? 'selected' : ''}>${st}</option>`).join('')}</select></div>
      </div>
      <div class="actions"><button class="btn" id="btn-save-student">Save</button><button class="btn secondary" onclick="$('enrollmentFormArea').innerHTML=''">Cancel</button></div>
    </div>`;

  updateYearDropdown(s ? s.yr : null);
  document.getElementById('btn-save-student').onclick = function() { saveStudent(existingId); };
}

function updateYearDropdown(selectedYear = null) {
    const course = $('f_course').value;
    const strandGroup = $('f_strand_group');
    const semGroup = $('f_sem_group');
    let years = [];
    if (course === 'Kinder') { years = ['Kinder']; strandGroup.style.display = 'none'; semGroup.style.display = 'none'; }
    else if (course === 'Elem') { years = ['Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6']; strandGroup.style.display = 'none'; semGroup.style.display = 'none'; }
    else if (course === 'High School') { years = ['Grade 7','Grade 8','Grade 9','Grade 10']; strandGroup.style.display = 'none'; semGroup.style.display = 'none'; }
    else if (course === 'SHS') { years = ['Grade 11','Grade 12']; strandGroup.style.display = 'block'; semGroup.style.display = 'block'; }

    let currentStrand = 'STEM';
    let currentSem = '1st Sem';
    if (selectedYear && selectedYear.includes('-')) {
        const parts = selectedYear.split('-');
        selectedYear = parts[0].trim();
        if (parts[1]) currentStrand = parts[1].trim();
        if (parts[2]) currentSem = parts[2].trim();
    }
    $('f_yr').innerHTML = years.map(y => `<option value="${y}" ${selectedYear === y ? 'selected' : ''}>${y}</option>`).join('');
    if ($('f_strand')) $('f_strand').value = currentStrand;
    if ($('f_sem')) $('f_sem').value = currentSem;
}

async function saveStudent(existingId) {
  const course = $('f_course').value;
  let finalYear = $('f_yr').value;
  if (course === 'SHS') {
      const strand = $('f_strand').value;
      const sem = $('f_sem').value;
      finalYear = `${finalYear} - ${strand} - ${sem}`;
  }
  const rec = {
      id: $('f_id').value, last: $('f_last').value, first: $('f_first').value,
      mi: $('f_mi').value, address: $('f_address').value, course,
      yr: finalYear, status: $('f_status').value, enrol: 'Enrolled',
      birthday: $('f_birthday').value
  };
  await fetch('/api/students', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rec) });
  db.students = await (await fetch('/api/students')).json();
  db.users    = await (await fetch('/api/users')).json();
  $('enrollmentFormArea').innerHTML = '';
  drawActiveTable();
  if (!existingId) alert("Student added! Login: Student ID / password123");
}

/* ---------- FACULTY: CLASS RECORDS (folders per section/year) ---------- */
async function renderClassRecords(c) {
  const myCourses = db.courses.filter(course => course.adviser === session.name);
  const groups = {};
  myCourses.forEach(cr => {
      const key = `${cr.gradeLevel} | Section ${cr.section}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(cr);
  });

  let html = `<div class="panel"><h2>Class Records</h2>
    <p style="margin-bottom: 15px; color: #666;">Folders by section/year. Click to view enrolled students.</p>`;
  if (!Object.keys(groups).length) html += `<p class="empty-note">No courses assigned to you.</p>`;
  Object.keys(groups).forEach(key => {
      html += `<div class="folder" style="background:#f9eaea; padding:12px; margin:8px 0; border-left:4px solid #800000; border-radius:6px; cursor:pointer;" onclick="showClassFolder('${esc(key)}')">📁 ${esc(key)} <small style="color:#666;">(${groups[key].length} subject${groups[key].length>1?'s':''})</small></div>`;
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
      const matched = en.find(e => codes.includes(e.courseCode));
      if (matched) {
          const crs = courses.find(c => c.code === matched.courseCode);
          rows.push([esc(s.id), esc(s.last + ', ' + s.first), esc(crs.name), esc(crs.adviser)]);
      }
  }

  $('classFolderView').innerHTML = `
    <div class="panel" style="margin-top: 10px; border: 2px solid #800000;">
        <h3>${esc(key)} — Enrolled Students</h3>
        ${simpleTable(['Student ID','Name','Subject','Adviser'], rows)}
    </div>`;
}

/* ---------- FACULTY: GRADE ENTRY (No Units) ---------- */
function renderGradeEntry(c) {
  c.innerHTML = `
    <div class="panel">
        <h2>Grade Entry Submission</h2>
        <p style="margin-bottom: 15px; color: #666;">Enter the grade for the selected student below.</p>
        <div class="grid2">
            <div class="field"><label>Student ID</label><input type="text" id="g_studentId" placeholder="e.g., 2023-0001"></div>
            <div class="field"><label>Course Name</label><input type="text" id="g_courseName" placeholder="e.g., Mathematics 7"></div>
            <div class="field"><label>Grade (1.0 - 5.0)</label><input type="number" step="0.25" id="g_grade" placeholder="e.g., 1.50"></div>
            <div class="field"><label>Term</label><input type="text" id="g_term" value="1st Sem 2026-2027"></div>
        </div>
        <div class="actions">
            <button class="btn" onclick="submitGrade()">Submit Grade</button>
        </div>
    </div>`;
}

function openGradeForm(studentId, courseName) {
    navigate('gradeEntry');
    highlight('gradeEntry');
    $('g_studentId').value = studentId;
    $('g_courseName').value = courseName;
}

async function submitGrade() {
    const studentId = $('g_studentId').value.trim();
    const courseName = $('g_courseName').value.trim();
    const grade = parseFloat($('g_grade').value);
    const term = $('g_term').value.trim();

    if (!studentId || !courseName || isNaN(grade)) { alert("Please fill in all fields correctly."); return; }

    try {
        await fetch('/api/grades', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentId, courseCode: 'N/A', courseName, grade, term })
        });
        alert("Grade submitted successfully!");
        $('g_studentId').value = '';
        $('g_courseName').value = '';
        $('g_grade').value = '';
    } catch (error) { alert("Failed to submit grade."); }
}

/* ---------- FACULTY: ATTENDANCE ---------- */
async function renderAttendance(c) {
  const myCourses = db.courses.filter(course => course.adviser === session.name);
  c.innerHTML = `<div class="panel"><h2>Attendance</h2>
    <p style="margin-bottom: 15px; color: #666;">Mark attendance per course per meeting date. Tied to schedule.</p>
    <div class="grid2">
        <div class="field"><label>Course</label>
            <select id="att_course">
                ${myCourses.map(x => `<option value="${esc(x.code)}">${esc(x.name)} — Sec ${esc(x.section)}</option>`).join('')}
            </select>
        </div>
        <div class="field"><label>Meeting Date</label>
            <input type="date" id="att_date" value="${new Date().toISOString().slice(0,10)}">
        </div>
    </div>
    <button class="btn" onclick="loadAttendance()">Load Students</button>
    <div id="att_list" style="margin-top: 20px;"></div>
  </div>`;
}

async function loadAttendance() {
    const code = $('att_course').value;
    const date = $('att_date').value;
    const crs = db.courses.find(x => x.code === code);
    if (!crs) return;

    let list = [];
    for (const s of db.students) {
        const en = await (await fetch(`/api/enrollments/${s.id}`)).json();
        if (en.some(e => e.courseCode === code)) list.push(s);
    }

    const existing = await (await fetch(`/api/attendance/${code}/${crs.section}/${date}`)).json();
    const map = {};
    existing.forEach(e => map[e.studentId] = e.status);

    $('att_list').innerHTML = `
      <div class="panel" style="background:#f6f9fd;">
        <h3>Attendance — ${esc(crs.name)} (Sec ${esc(crs.section)}) — ${esc(date)}</h3>
        <table><thead><tr>
            <th>Student ID</th><th>Name</th><th>Status</th>
        </tr></thead><tbody>
          ${list.map(s => `<tr>
            <td>${esc(s.id)}</td>
            <td>${esc(s.last + ', ' + s.first)}</td>
            <td>
              <select onchange="markAttendance('${esc(code)}','${esc(crs.section)}','${esc(s.id)}','${esc(date)}', this.value)">
                <option value="Present" ${map[s.id]==='Present'?'selected':''}>Present</option>
                <option value="Absent"  ${map[s.id]==='Absent' ?'selected':''}>Absent</option>
                <option value="Late"    ${map[s.id]==='Late'   ?'selected':''}>Late</option>
              </select>
            </td>
          </tr>`).join('')}
        </tbody></table>
        ${list.length === 0 ? '<p class="empty-note">No students enrolled in this course.</p>' : ''}
      </div>`;
}

async function markAttendance(courseCode, section, studentId, date, status) {
    try {
        await fetch('/api/attendance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ courseCode, section, studentId, date, status })
        });
    } catch (e) { alert('Failed to save attendance.'); }
}

/* ---------- STUDENT: GRADES ---------- */
async function renderProfileGrades(c) {
    const s = currentStudent();
    c.innerHTML = `
        <div class="panel">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <div><h2>Academic Profile & Grades</h2><p style="color: #666;">Below are your enrolled subjects and submitted grades.</p></div>
                <button class="btn" style="background: #5c0000; color: white;" onclick="printCOR()">Print COR</button>
            </div>
            <div id="studentGradesTable"><p class="empty-note">Loading grades...</p></div>
        </div>`;

    try {
        const myGrades = await (await fetch(`/api/student/grades/${s.id}`)).json();
        const enrolledCourses = db.enrollments.filter(e => e.studentId === s.id);
        if (enrolledCourses.length === 0) {
            $('studentGradesTable').innerHTML = `<p class="empty-note">You are not enrolled in any courses yet.</p>`;
            return;
        }
        const tableRows = enrolledCourses.map(enroll => {
            const courseData = db.courses.find(c => c.code === enroll.courseCode) || {};
            const gradeData = myGrades.find(g => g.courseName === courseData.name);
            return [
                esc(courseData.code || enroll.courseCode),
                esc(courseData.name || 'Unknown Course'),
                esc(courseData.section || enroll.section),
                gradeData ? `<b>${esc(gradeData.grade)}</b>` : `<span style="color: #999; font-style: italic;">Not yet graded</span>`
            ];
        });
        $('studentGradesTable').innerHTML = simpleTable(['Course Code','Course Name','Section','Final Grade'], tableRows);
    } catch (error) {
        $('studentGradesTable').innerHTML = `<p class="empty-note">Failed to load grades.</p>`;
    }
}

/* ---------- STUDENT: ALL RECORDS (folder per grade level) ---------- */
async function renderStudentRecords(c) {
    const s = currentStudent();
    c.innerHTML = `<div class="panel"><h2>My Records (All Grade Levels)</h2>
        <p style="color:#666;">Click a grade-level folder to view your subject grades.</p>
        <div id="recordsFolders"><p class="empty-note">Loading...</p></div>
        <div id="recordView"></div></div>`;

    try {
        const records = await (await fetch(`/api/student/records/${s.id}`)).json();
        const groups = {};
        records.forEach(r => { if (!groups[r.gradeLevel]) groups[r.gradeLevel] = []; groups[r.gradeLevel].push(r); });

        if (!Object.keys(groups).length) {
            $('recordsFolders').innerHTML = `<p class="empty-note">No historical records yet.</p>`;
            return;
        }

        $('recordsFolders').innerHTML = Object.keys(groups).map(k =>
            `<div class="folder" style="background:#f9eaea; padding:12px; margin:8px 0; border-left:4px solid #800000; border-radius:6px; cursor:pointer;" onclick="showRecordFolder('${esc(k)}')">📁 ${esc(k)} <small style="color:#666;">(${groups[k].length} subjects)</small></div>`
        ).join('');

        window._studentRecords = groups;
    } catch (e) {
        $('recordsFolders').innerHTML = `<p class="empty-note">Failed to load records.</p>`;
    }
}

function showRecordFolder(grade) {
    const rows = (window._studentRecords || {})[grade] || [];
    $('recordView').innerHTML = `
      <div class="panel" style="margin-top: 10px; border: 2px solid #800000;">
        <h3>${esc(grade)} — Records</h3>
        ${simpleTable(['School Year','Subject','Grade','Status','Remarks'],
            rows.map(r => [esc(r.schoolYear), esc(r.subject), `<b>${esc(r.grade)}</b>`, esc(r.status), esc(r.remarks||'')]))}
      </div>`;
}

/* ---------- PRINT COR ---------- */
function printCOR() {
    const s = currentStudent();
    const myEnrollments = db.enrollments.filter(e => e.studentId === s.id);
    if (myEnrollments.length === 0) { alert("Enroll in subjects first."); return; }

    const subjectsRows = myEnrollments.map((enroll, index) => {
        const course = db.courses.find(c => c.code === enroll.courseCode);
        if (!course) return '';
        return `<tr>
            <td style="text-align:center;">${index + 1}</td>
            <td>${esc(course.code)}</td>
            <td>${esc(course.name)}</td>
            <td style="text-align:center;">${esc(course.section)}</td>
            <td>${esc(course.adviser)}</td>
        </tr>`;
    }).join('');

    const printWindow = window.open('', '_blank', 'width=900,height=800');
    printWindow.document.write(`
        <html><head><title>Certificate of Registration</title>
        <style>
            body { font-family: 'Times New Roman', Times, serif; margin: 40px; }
            .header { text-align: center; margin-bottom: 20px; }
            .header h1 { font-size: 18px; margin: 0; }
            .header h2 { font-size: 16px; margin: 5px 0; font-weight: normal; }
            .header h3 { font-size: 14px; margin: 10px 0; letter-spacing: 2px; }
            .info-table, .main-table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px; }
            .info-table td { padding: 3px 0; }
            .main-table th, .main-table td { border: 1px solid #000; padding: 6px; }
            .main-table th { background: #eee; }
        </style></head><body>
            <div class="header">
                <h1>REPUBLIC OF THE PHILIPPINES</h1>
                <h2>EduTrack State University</h2>
                <h2 style="font-size:12px;">Mariveles, Bataan</h2>
                <h3>CERTIFICATE OF REGISTRATION</h3>
            </div>
            <table class="info-table">
                <tr><td width="15%"><b>Student Name:</b></td><td width="35%">${esc(s.first)} ${esc(s.mi)} ${esc(s.last)}</td>
                    <td width="15%"><b>Student No:</b></td><td width="35%">${esc(s.id)}</td></tr>
                <tr><td><b>Program:</b></td><td>${esc(s.course)}</td>
                    <td><b>School Year:</b></td><td>2026-2027</td></tr>
                <tr><td><b>Year Level:</b></td><td>${esc(s.yr)}</td>
                    <td><b>Semester:</b></td><td>1st Semester</td></tr>
            </table>
            <table class="main-table">
                <thead><tr>
                    <th width="5%">No.</th><th width="20%">Course Code</th>
                    <th width="40%">Course Description</th><th width="15%">Section</th>
                    <th width="20%">Faculty / Instructor</th>
                </tr></thead>
                <tbody>${subjectsRows}</tbody>
            </table>
        </body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
}