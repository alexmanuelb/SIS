/* =========================================================
   EduTrack SIS - Logic & Data
   ========================================================= */

let db = {
  students: [], courses: [], users: [], grades: [], enrollments: []
};

let session = null;
let currentLoginRole = 'Faculty'; 
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ---------- LOGIN & LOGOUT ---------- */
function setLoginRole(role) {
    currentLoginRole = role;
    document.getElementById('btn-role-faculty').className = role === 'Faculty' ? 'btn' : 'btn secondary';
    document.getElementById('btn-role-student').className = role === 'Student' ? 'btn' : 'btn secondary';
}

async function doLogin() { 
  const username = $('loginUser').value.trim();
  const password = $('loginPass').value.trim();

  if (!username || !password) { alert('Please enter both username and password'); return; }
  
  try {
    const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, roleAttempt: currentLoginRole })
    });

    const data = await response.json();
    if (!response.ok) { alert(data.error); return; }

    session = data;
    
    const resStudents = await fetch('/api/students');
    db.students = await resStudents.json();
    const resCourses = await fetch('/api/courses');
    db.courses = await resCourses.json();
    const resUsers = await fetch('/api/users');
    db.users = await resUsers.json();

    if (session.role === 'Student') {
        const student = currentStudent();
        const resEnrollments = await fetch(`/api/enrollments/${student.id}`);
        db.enrollments = await resEnrollments.json();
    }

    $('loginScreen').style.display = 'none';
    $('appScreen').style.display = 'block';
    $('whoami').textContent = `${session.name} - ${session.role}`;
    
    buildSidebar();
    const startPage = session.role === 'Admin' ? 'adminDashboard' : session.role === 'Faculty' ? 'facultyDashboard' : 'studentDashboard';
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
      setLoginRole('Faculty'); 
  }
}

/* ---------- SIDEBAR & ROUTING ---------- */
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
    { key:'grading', label:'Grading Module', children:[
      { key:'classRoster', label:'Class Roster Selection' },
      { key:'gradeEntry', label:'Grade Entry Submission' }
    ]}
  ],
  Student: [
    { key:'studentDashboard', label:'Dashboard' }, 
    { key:'registration', label:'Online Course Registration' },
    { key:'profileGrades', label:'Academic Profile & Grades' },
    { key:'profile', label:'Student Profile' }
  ]
};

function buildSidebar() {
  const nav = $('sidebar');
  nav.innerHTML = `<div class="portal-title">${session.role} Portal</div>`;
  MENUS[session.role].forEach(item => {
    const btn = document.createElement('button');
    btn.textContent = item.label;
    btn.dataset.key = item.key;
    btn.onclick = () => { navigate(item.key); highlight(item.key); };
    nav.appendChild(btn);
    if (item.children) {
      item.children.forEach(c => {
        const sub = document.createElement('button');
        sub.className = 'sub'; sub.textContent = '— ' + c.label;
        sub.dataset.key = c.key;
        sub.onclick = () => { navigate(c.key); highlight(c.key); };
        nav.appendChild(sub);
      });
    }
  });
}

function highlight(key) {
  document.querySelectorAll('#sidebar button').forEach(b => b.classList.toggle('active', b.dataset.key === key));
}

function navigate(page) {
  const c = $('content');
  const R = {
    adminDashboard: renderAdminDashboard, facultyDashboard: renderFacultyDashboard, studentDashboard: renderStudentDashboard,
    students: renderActiveDirectory, activeDirectory: renderActiveDirectory, legacy: renderLegacy,
    courses: renderCourses, users: renderUsers,
    grading: renderClassRoster, classRoster: renderClassRoster, gradeEntry: renderGradeEntry,
    registration: renderRegistration, profileGrades: renderProfileGrades,
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
    return db.students.find(s => s.username === session.username) || db.students[0] || {id:'', first:'', last:'', course:'', yr:'', birthday:''}; 
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
       </li>`
  ).join('');

  c.innerHTML = `
    <div class="panel">
        <h2>System Overview</h2>
        <p style="margin-bottom: 20px; color: #666;">Welcome back, Admin. Here is the current status of EduTrack.</p>
        <div class="cards" style="margin-bottom: 20px;">
            <div class="card" style="background: linear-gradient(135deg, #800000, #5c0000);">
                <div class="num">${totalStudents}</div><div class="lbl">Total Students</div>
            </div>
            <div class="card" style="background: linear-gradient(135deg, #a00000, #800000);">
                <div class="num">${totalFaculty}</div><div class="lbl">Faculty Members</div>
            </div>
            <div class="card" style="background: linear-gradient(135deg, #c00000, #a00000);">
                <div class="num">${totalCourses}</div><div class="lbl">Total Courses</div>
            </div>
            <div class="card" style="background: linear-gradient(135deg, #e00000, #c00000);">
                <div class="num">${activeUsers}</div><div class="lbl">Registered Users</div>
            </div>
        </div>
    </div>

    <div class="grid2">
        <div class="panel">
            <h2>Recently Added Students</h2>
            <ul style="list-style-type: none; padding: 0;">
                ${recentStudents || '<li>No recent students.</li>'}
            </ul>
        </div>
        <div class="panel">
            <h2>Quick Actions</h2>
            <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 10px;">
                <button class="btn" onclick="navigate('activeDirectory'); highlight('activeDirectory');">Manage Students</button>
                <button class="btn" onclick="navigate('users'); highlight('users');">Manage Users</button>
                <button class="btn" onclick="navigate('courses'); highlight('courses');">View Courses</button>
            </div>
        </div>
    </div>`;
}

async function renderFacultyDashboard(c) {
  const myCourses = db.courses.filter(course => course.adviser === session.name);
  const myCourseCodes = myCourses.map(course => course.code);

  let uniqueStudentIds = new Set();
  
  for (const student of db.students) {
      const res = await fetch(`/api/enrollments/${student.id}`);
      const enrollments = await res.json();
      
      const isEnrolledInMyClass = enrollments.some(e => myCourseCodes.includes(e.courseCode));
      if (isEnrolledInMyClass) {
          uniqueStudentIds.add(student.id);
      }
  }

  c.innerHTML = `
    <div class="panel">
        <h2>Faculty Dashboard</h2>
        <p style="margin-bottom: 20px; color: #666;">Welcome, <b>${esc(session.name)}</b>.</p>
        <div class="cards">
            <div class="card" style="background: linear-gradient(135deg, #800000, #5c0000);">
                <div class="num">${uniqueStudentIds.size}</div><div class="lbl">My Students</div>
            </div>
            <div class="card" style="background: linear-gradient(135deg, #a00000, #800000);">
                <div class="num">3</div><div class="lbl">Pending Grades</div>
            </div>
            <div class="card" style="background: linear-gradient(135deg, #c00000, #a00000);">
                <div class="num" id="faculty-clock" style="font-size: 26px;">--:-- --</div>
                <div class="lbl">Current Time</div>
            </div>
        </div>
    </div>

    <div class="grid2">
        <div class="panel">
            <h2>Quick Actions</h2>
            <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 10px;">
                <button class="btn" onclick="navigate('classRoster'); highlight('classRoster');">View Class Roster</button>
                <button class="btn" onclick="navigate('gradeEntry'); highlight('gradeEntry');">Submit Grades</button>
            </div>
        </div>
    </div>`;

  startClock('faculty-clock');
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
  
  const enrolledDetails = db.enrollments.map(e => {
      const course = db.courses.find(c => c.code === e.courseCode);
      return course ? `<li style="padding: 8px 0; border-bottom: 1px solid #eee;">
          <b>${esc(course.name)}</b> <br> 
          <small style="color: #666;">Section: ${esc(course.section)} | Adviser: ${esc(course.adviser)}</small>
      </li>` : '';
  }).join('');

  c.innerHTML = `
    <div class="panel">
        <h2>Student Dashboard</h2>
        <p style="margin-bottom: 20px; color: #666;">Hello, <b>${esc(s.first)}</b>! Here is your academic summary.</p>
        <div class="cards">
            <div class="card" style="background: linear-gradient(135deg, #800000, #5c0000);">
                <div class="num">${db.enrollments.length}</div><div class="lbl">Enrolled Courses</div>
            </div>
            <div class="card" style="background: linear-gradient(135deg, #c00000, #a00000);">
                <div class="num" id="student-clock" style="font-size: 26px;">--:-- --</div>
                <div class="lbl">Current Time</div>
            </div>
        </div>
    </div>
    
    <div class="grid2">
        <div class="panel">
            <h2>My Enrolled Courses</h2>
            <ul style="list-style-type: none; padding: 0;">
                ${enrolledDetails || '<li>No courses enrolled yet. Go to Registration!</li>'}
            </ul>
        </div>
        <div class="panel">
            <h2>Quick Links</h2>
            <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 10px;">
                <button class="btn" onclick="navigate('registration'); highlight('registration');">Register for a Course</button>
                <button class="btn" onclick="navigate('profile'); highlight('profile');">View My Profile</button>
            </div>
        </div>
    </div>`;
    
    startClock('student-clock');
}

/* ---------- STUDENT REGISTRATION (UPDATED) ---------- */
function renderRegistration(c) {
  const s = currentStudent();
  
  // Get a list of course names the student is already enrolled in
  const myEnrolledCourseNames = db.enrollments
      .filter(e => e.studentId === s.id)
      .map(e => {
          const course = db.courses.find(c => c.code === e.courseCode);
          return course ? course.name : null;
      }).filter(name => name !== null);

  const availableCourses = db.courses.filter(course => {
      let matchesGradeAndSem = false;

      // 1. Check if the student is in SHS (contains a hyphen like "Grade 12 - STEM - 1st Sem")
      if (s.yr && s.yr.includes('-')) {
          // STRICT MATCH for SHS: Must match exactly (Grade + Strand + Sem)
          matchesGradeAndSem = course.gradeLevel === s.yr;
      } else {
          // 2. LENIENT MATCH for Kinder, Elem, and HS
          // We check if the course's gradeLevel includes the student's year.
          matchesGradeAndSem = course.gradeLevel.startsWith(s.yr);
      }

      const isOpen = course.status === 'Open'; 
      
      // Check if the course name is already in their enrolled list
      const alreadyTaken = myEnrolledCourseNames.includes(course.name);
      
      // Only show if it matches grade, is open, and they haven't taken the subject yet
      return matchesGradeAndSem && isOpen && !alreadyTaken;
  });

  c.innerHTML = `<div class="panel"><h2>Online Course Registration</h2>
    <p style="margin-bottom: 15px; color: #666;">Showing available courses for: <b>${esc(s.yr)}</b></p>
    ${simpleTable(
        ['Course Code', 'Course Name', 'Section', 'Action'], 
        availableCourses.map(x => [
            esc(x.code), 
            esc(x.name), 
            esc(x.section), 
            `<button class="btn small" onclick="enrollCourse('${esc(x.code)}', '${esc(x.section)}')">Enroll</button>`
        ])
    )}
  </div>`;
}

async function enrollCourse(courseCode, section) {
    const s = currentStudent();
    try {
        const response = await fetch('/api/enroll', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentId: s.id, courseCode: courseCode, section: section, term: '1st Sem' })
        });
        
        const data = await response.json();

        if (!response.ok) {
            alert(data.error);
            return;
        }
        
        const resEnrollments = await fetch(`/api/enrollments/${s.id}`);
        db.enrollments = await resEnrollments.json();
        
        const resCourses = await fetch('/api/courses');
        db.courses = await resCourses.json();
        
        renderRegistration($('content'));
        alert("Successfully Enrolled!");
    } catch (error) {
        alert("Failed to enroll.");
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
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
    }

    let formattedBday = 'Not Set';
    if (s.birthday) {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        formattedBday = new Date(s.birthday).toLocaleDateString(undefined, options);
    }

    const initials = `${s.first ? s.first.charAt(0) : ''}${s.last ? s.last.charAt(0) : ''}`.toUpperCase();

    c.innerHTML = `
        <div class="panel" style="max-width: 800px; margin: 0 auto; border-radius: 12px; overflow: hidden; padding: 0;">
            
            <div style="background: linear-gradient(135deg, #800000, #5c0000); height: 120px; position: relative;">
                <div style="width: 100px; height: 100px; border-radius: 50%; background: #fff; color: #5c0000; display: flex; align-items: center; justify-content: center; font-size: 36px; font-weight: 800; position: absolute; bottom: -50px; left: 40px; box-shadow: 0 4px 10px rgba(0,0,0,0.2); border: 4px solid #fff;">
                    ${initials}
                </div>
            </div>

            <div style="padding: 60px 40px 20px 40px; display: flex; justify-content: space-between; align-items: flex-end;">
                <div>
                    <h2 style="margin: 0; font-size: 28px; color: #333; text-transform: none; border: none; padding: 0;">${esc(s.first)} ${esc(s.mi)} ${esc(s.last)}</h2>
                    <p style="color: #666; margin-top: 5px; font-size: 15px;">Student ID: <b>${esc(s.id)}</b></p>
                </div>
                <div>
                    <span class="badge active" style="font-size: 14px; padding: 6px 15px;">${esc(s.status)}</span>
                </div>
            </div>

            <hr style="border: none; border-top: 1px solid #eee; margin: 0 40px;">

            <div style="padding: 30px 40px 40px 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 25px;">
                
                <div>
                    <small style="color: #800000; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; font-size: 11px;">Grade Level</small>
                    <div style="font-size: 16px; color: #222; margin-top: 4px; font-weight: 500;">${esc(s.yr)}</div>
                </div>

                <div>
                    <small style="color: #800000; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; font-size: 11px;">Section</small>
                    <div style="font-size: 16px; color: #222; margin-top: 4px; font-weight: 500;">${esc(s.course)}</div>
                </div>

                <div>
                    <small style="color: #800000; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; font-size: 11px;">Birthday</small>
                    <div style="font-size: 16px; color: #222; margin-top: 4px; font-weight: 500;">${formattedBday}</div>
                </div>

                <div>
                    <small style="color: #800000; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; font-size: 11px;">Age</small>
                    <div style="font-size: 16px; color: #222; margin-top: 4px; font-weight: 500;">${age} years old</div>
                </div>

                <div style="grid-column: span 2;">
                    <small style="color: #800000; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; font-size: 11px;">Home Address</small>
                    <div style="font-size: 16px; color: #222; margin-top: 4px; font-weight: 500;">${esc(s.address) || 'Not Provided'}</div>
                </div>

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
                <div class="field">
                    <label>Username (Cannot be changed)</label>
                    <input value="${esc(user.username)}" readonly style="background:#e0e0e0;">
                </div>
                <div class="field">
                    <label>New Password (Leave blank to keep current)</label>
                    <input type="password" id="u_pass" placeholder="Enter new password">
                </div>
                <div class="field">
                    <label>Full Name</label>
                    <input id="u_name" value="${esc(user.name)}">
                </div>
                <div class="field">
                    <label>Role</label>
                    <select id="u_role">
                        <option value="Admin" ${user.role === 'Admin' ? 'selected' : ''}>Admin</option>
                        <option value="Faculty" ${user.role === 'Faculty' ? 'selected' : ''}>Faculty</option>
                        <option value="Student" ${user.role === 'Student' ? 'selected' : ''}>Student</option>
                    </select>
                </div>
                <div class="field">
                    <label>Assigned Section</label>
                    <input id="u_section" value="${esc(user.section || '')}">
                </div>
            </div>
            <div class="actions">
                <button class="btn" onclick="saveUserEdit('${esc(user.username)}')">Save Changes</button>
                <button class="btn secondary" onclick="$('editUserFormArea').innerHTML=''">Cancel</button>
            </div>
        </div>`;
}

async function saveUserEdit(username) {
    const rec = {
        username: username,
        password: $('u_pass').value,
        name: $('u_name').value,
        role: $('u_role').value,
        section: $('u_section').value
    };

    try {
        await fetch('/api/users/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(rec)
        });

        const resUsers = await fetch('/api/users');
        db.users = await resUsers.json();
        
        alert("User updated successfully!");
        renderUsers($('content')); 
        
    } catch (error) {
        alert("Failed to update user.");
    }
}

/* ---------- ADMIN: COURSES & SECTIONS ---------- */
function renderCourses(c) {
  const rows = db.courses.map(x => [
      esc(x.code), 
      esc(x.name), 
      esc(x.section), 
      esc(x.adviser), 
      `<span class="badge ${x.status === 'Open' ? 'active' : 'inactive'}">${esc(x.status)}</span>`
  ]);

  c.innerHTML = `
    <div class="panel">
        <h2>Course & Section Management</h2>
        <p style="margin-bottom: 15px; color: #666;">Courses will automatically close once the capacity limit is reached.</p>
        ${simpleTable(['Code', 'Name', 'Section', 'Adviser', 'Status'], rows)}
    </div>`;
}

/* ---------- ADMIN: STUDENT DIRECTORY & ARCHIVE ---------- */

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
        esc(s.id), 
        esc(s.last), 
        esc(s.first), 
        esc(s.course), 
        esc(s.yr), 
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
                esc(s.id), 
                esc(s.last + ', ' + s.first), 
                esc(s.course), 
                esc(s.yr), 
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
        
        <div class="field">
            <label>Course / Department</label>
            <select id="f_course" onchange="updateYearDropdown()">
                ${courseOptions.map(c => `<option value="${c}" ${s?.course === c ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
        </div>
        
        <div class="field"><label>Year Level</label><select id="f_yr"></select></div>
        
        <!-- SHS STRAND DROPDOWN -->
        <div class="field" id="f_strand_group" style="display: none;">
            <label>SHS Strand</label>
            <select id="f_strand">
                <option value="STEM">STEM</option>
                <option value="ABM">ABM</option>
                <option value="HUMSS">HUMSS</option>
                <option value="GAS">GAS</option>
            </select>
        </div>

        <!-- SHS SEMESTER DROPDOWN -->
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
    if (course === 'Kinder') {
        years = ['Kinder'];
        strandGroup.style.display = 'none';
        semGroup.style.display = 'none';
    } else if (course === 'Elem') {
        years = ['Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6'];
        strandGroup.style.display = 'none';
        semGroup.style.display = 'none';
    } else if (course === 'High School') {
        years = ['Grade 7','Grade 8','Grade 9','Grade 10'];
        strandGroup.style.display = 'none';
        semGroup.style.display = 'none';
    } else if (course === 'SHS') {
        years = ['Grade 11','Grade 12'];
        strandGroup.style.display = 'block'; // SHOW STRAND
        semGroup.style.display = 'block';    // SHOW SEMESTER
    }

    // Parse existing data if editing
    let currentStrand = 'STEM';
    let currentSem = '1st Sem';
    
    if (selectedYear && selectedYear.includes('-')) {
        const parts = selectedYear.split('-');
        selectedYear = parts[0].trim(); // "Grade 12"
        
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
  
  // If SHS, combine the year, strand, and semester exactly as it is in the courses DB
  if (course === 'SHS') {
      const strand = $('f_strand').value;
      const sem = $('f_sem').value;
      finalYear = `${finalYear} - ${strand} - ${sem}`; // e.g., "Grade 12 - STEM - 1st Sem"
  }

  const rec = { 
      id: $('f_id').value, 
      last: $('f_last').value, 
      first: $('f_first').value, 
      mi: $('f_mi').value, 
      address: $('f_address').value, 
      course: course, 
      yr: finalYear, 
      status: $('f_status').value, 
      enrol: 'Enrolled', 
      birthday: $('f_birthday').value 
  };
  
  await fetch('/api/students', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rec) });
  const res = await fetch('/api/students'); db.students = await res.json();
  $('enrollmentFormArea').innerHTML = ''; drawActiveTable();
}

/* ---------- FACULTY: GRADING ---------- */

function renderClassRoster(c) {
  c.innerHTML = `
    <div class="panel">
        <h2>My Class Roster</h2>
        <p style="margin-bottom: 15px; color: #666;">Students enrolled in the courses you handle.</p>
        <div id="rosterTableArea"><p class="empty-note">Loading students...</p></div>
    </div>`;
    
  drawRosterTable();
}

async function drawRosterTable() {
  const teacherName = session.name; 

  try {
      const resStudents = await fetch('/api/students');
      const allStudents = await resStudents.json();
      const resCourses = await fetch('/api/courses');
      const allCourses = await resCourses.json();

      const myCourses = allCourses.filter(c => c.adviser === teacherName);
      const myCourseCodes = myCourses.map(c => c.code);

      let myStudents = [];
      
      for (const student of allStudents) {
          const resEnroll = await fetch(`/api/enrollments/${student.id}`);
          const studentEnrolls = await resEnroll.json();
          
          const enrolledInMyCourse = studentEnrolls.find(e => myCourseCodes.includes(e.courseCode));
          
          if (enrolledInMyCourse) {
              const courseData = myCourses.find(c => c.code === enrolledInMyCourse.courseCode);
              
              const gradeRes = await fetch(`/api/grades/check/${student.id}/${encodeURIComponent(courseData.name)}`);
              const existingGrade = await gradeRes.json();

              myStudents.push({
                  ...student,
                  enrolledCourseName: courseData.name,
                  hasGrade: existingGrade ? true : false
              });
          }
      }

      if (myStudents.length === 0) {
          $('rosterTableArea').innerHTML = `<p class="empty-note">No students are currently enrolled in your classes.</p>`;
          return;
      }

      $('rosterTableArea').innerHTML = simpleTable(
          ['Student ID', 'Name', 'Course Enrolled', 'Status', 'Action'], 
          myStudents.map(s => [
              esc(s.id), 
              esc(s.last + ', ' + s.first), 
              esc(s.enrolledCourseName), 
              
              s.hasGrade 
                ? `<span class="badge active" style="background:#d3f2dd; color:#186a3b;">Graded</span>` 
                : `<span class="badge inactive" style="background:#fde2e2; color:#9b1c1c;">Pending</span>`,
              
              `<button class="btn small" onclick="openGradeForm('${esc(s.id)}', '${esc(s.enrolledCourseName)}')">
                  ${s.hasGrade ? 'Edit Grade' : 'Input Grade'}
               </button>`
          ])
      );
      
  } catch (error) {
      console.error(error);
      $('rosterTableArea').innerHTML = `<p class="empty-note">Failed to load students. Please refresh.</p>`;
  }
}

function renderGradeEntry(c) {
  c.innerHTML = `
    <div class="panel">
        <h2>Grade Entry Submission</h2>
        <p style="margin-bottom: 15px; color: #666;">Enter the grade for the selected student below.</p>
        
        <div class="grid2">
            <div class="field">
                <label>Student ID</label>
                <input type="text" id="g_studentId" placeholder="e.g., 2023-0001">
            </div>
            <div class="field">
                <label>Course Name</label>
                <input type="text" id="g_courseName" placeholder="e.g., Mathematics 7">
            </div>
            <div class="field">
                <label>Grade (1.0 - 5.0)</label>
                <input type="number" step="0.25" id="g_grade" placeholder="e.g., 1.50">
            </div>
            <div class="field">
                <label>Units</label>
                <input type="number" id="g_units" value="3">
            </div>
            <div class="field">
                <label>Term</label>
                <input type="text" id="g_term" value="1st Sem 2026-2027">
            </div>
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
    const units = parseInt($('g_units').value);
    const term = $('g_term').value.trim();

    if (!studentId || !courseName || isNaN(grade)) {
        alert("Please fill in all fields correctly.");
        return;
    }

    try {
        await fetch('/api/grades', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentId, courseCode: 'N/A', courseName, units, grade, term })
        });
        
        alert("Grade submitted successfully!");
        $('g_studentId').value = '';
        $('g_courseName').value = '';
        $('g_grade').value = '';
        
        navigate('classRoster');
        
    } catch (error) {
        alert("Failed to submit grade.");
    }
}

/* ---------- STUDENT: ACADEMIC PROFILE & GRADES ---------- */
async function renderProfileGrades(c) {
    const s = currentStudent();
    
    c.innerHTML = `
        <div class="panel">
            <h2>Academic Profile & Grades</h2>
            <p style="margin-bottom: 15px; color: #666;">Below are your enrolled subjects and submitted grades.</p>
            <div id="studentGradesTable"><p class="empty-note">Loading grades...</p></div>
        </div>`;

    try {
        const resGrades = await fetch(`/api/student/grades/${s.id}`);
        const myGrades = await resGrades.json();
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
                gradeData 
                    ? `<b>${esc(gradeData.grade)}</b>` 
                    : `<span style="color: #999; font-style: italic;">Not yet graded</span>`
            ];
        });

        $('studentGradesTable').innerHTML = simpleTable(
            ['Course Code', 'Course Name', 'Section', 'Final Grade'], 
            tableRows
        );

    } catch (error) {
        console.error(error);
        $('studentGradesTable').innerHTML = `<p class="empty-note">Failed to load grades.</p>`;
    }
}