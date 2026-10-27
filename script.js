/* =========================================================
   EduTrack SIS - Logic & Data (WITH BILLING & INSTALLMENTS)
   ========================================================= */

let db = {
  students: [], courses: [], users: [], grades: [], enrollments: [], billing: [], payments: []
};

let session = null;
let currentLoginRole = 'Faculty'; 
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ---------- LOGIN & LOGOUT ---------- */
function setLoginRole(role) {
    currentLoginRole = role;
    const btnFaculty = document.getElementById('btn-role-faculty');
    const btnStudent = document.getElementById('btn-role-student');

    if (role === 'Faculty') {
        btnFaculty.style.background = '#800000';
        btnFaculty.style.color = 'white';
        btnStudent.style.background = '#a0a0a0';
        btnStudent.style.color = 'white';
    } else {
        btnStudent.style.background = '#800000';
        btnStudent.style.color = 'white';
        btnFaculty.style.background = '#a0a0a0';
        btnFaculty.style.color = 'white';
    }
}

function togglePassword() {
    const passInput = $('loginPass');
    const eyeOpen = $('eye-open');
    const eyeClosed = $('eye-closed');

    if (passInput.type === "password") {
        passInput.type = "text";
        eyeOpen.style.display = "block";
        eyeClosed.style.display = "none";
    } else {
        passInput.type = "password";
        eyeOpen.style.display = "none";
        eyeClosed.style.display = "block";
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
        if(student) {
            const resEnrollments = await fetch(`/api/enrollments/${student.id}`);
            db.enrollments = await resEnrollments.json();
            const resBilling = await fetch(`/api/billing/${student.id}`);
            db.billing = await resBilling.json();
            const resPayments = await fetch(`/api/payments/${student.id}`);
            db.payments = await resPayments.json();
        }
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
    { key:'users', label:'Users Roles & Access Control' },
    { key:'adminBilling', label:'Billing & Payments' }
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
    { key:'schedule', label:'View Class Schedule' },
    { key:'profileGrades', label:'Academic Profile & Grades' },
    { key:'studentBilling', label:'Billing & Payment' },
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
        <button 
            class="logout-btn" 
            style="width: 100%; background: white; color: #5c0000; border: 2px solid white; font-weight: bold; padding: 12px; cursor: pointer; border-radius: 5px; transition: 0.3s; text-align: center; font-size: 14px;" 
            onclick="doLogout()"
            onmouseover="this.style.background='#5c0000'; this.style.color='white'; this.style.borderColor='#ffcccc';"
            onmouseout="this.style.background='white'; this.style.color='#5c0000'; this.style.borderColor='white';"
        >
            Logout
        </button>
    </div>
  `;

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
    grading: renderClassRoster, 
    classRoster: renderClassRoster, 
    gradeEntry: renderGradeEntry,
    registration: renderRegistration, 
    schedule: renderSchedule, 
    profileGrades: renderProfileGrades,
    studentBilling: renderStudentBilling,
    adminBilling: renderAdminBilling,
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
    if (!student) {
        student = db.students.find(s => s.id === session.username);
    }
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
                <button class="btn" onclick="navigate('adminBilling'); highlight('adminBilling');">Manage Billing</button>
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
            <h2>Quick Links</h2>
            <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 10px;">
                <button class="btn" onclick="navigate('registration'); highlight('registration');">Register for a Course</button>
                <button class="btn" onclick="navigate('studentBilling'); highlight('studentBilling');">View Billing & Pay</button>
            </div>
        </div>
    </div>`;
    
    startClock('student-clock');
}

/* ---------- STUDENT BILLING & PAYMENT (FULLY FIXED) ---------- */
function renderStudentBilling(c) {
    const s = currentStudent();
    
    let yrStr = String(s.yr || '').trim().toLowerCase();
    
    let tuitionFee = 0;
    let feeLabel = '';
    
    if (yrStr.includes('kinder')) {
        tuitionFee = 5000;
        feeLabel = 'Kinder Tuition';
    } else if (yrStr.includes('grade 11') || yrStr.includes('grade 12')) {
        tuitionFee = 13000;
        feeLabel = 'Senior High School Tuition';
    } else if (yrStr.includes('grade 7') || yrStr.includes('grade 8') || yrStr.includes('grade 9') || yrStr.includes('grade 10')) {
        tuitionFee = 10000;
        feeLabel = 'High School Tuition';
    } else if (yrStr.includes('grade 1') || yrStr.includes('grade 2') || yrStr.includes('grade 3') || yrStr.includes('grade 4') || yrStr.includes('grade 5') || yrStr.includes('grade 6')) {
        tuitionFee = 8000;
        feeLabel = 'Elementary Tuition';
    } else {
        tuitionFee = 8000;
        feeLabel = 'Tuition Fee';
    }

    const miscFee = 1500;
    const totalAssessment = tuitionFee + miscFee;

    // Calculate total approved payments
    const approvedPayments = db.payments.filter(p => p.status === 'Approved');
    const totalPaid = approvedPayments.reduce((sum, p) => sum + p.amount, 0);

    const isFullyPaid = totalPaid >= totalAssessment;

    const currentBill = db.billing.find(b => b.status === 'Unpaid');
    const displayAmount = totalAssessment; 
    const displayDueDate = currentBill ? currentBill.dueDate : '2026-11-15';
    const billId = currentBill ? currentBill.id : 'new';

    // Build the assessment section conditionally
    let assessmentSection = '';
    if (isFullyPaid) {
        assessmentSection = `
            <div style="background: #e8f5e9; border: 1px solid #28a745; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="color: #28a745; margin-top: 0;">✓ Fully Paid</h3>
                <p style="margin: 0; color: #333;">Your total assessment of <b>PHP ${totalAssessment.toLocaleString('en-US', {minimumFractionDigits: 2})}</b> has been fully paid.</p>
                <p style="margin: 5px 0 0 0; color: #666;">Thank you for your payment!</p>
            </div>
        `;
    } else {
        assessmentSection = `
            <div style="background: #fff0f0; border: 1px solid #800000; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="color: #800000; margin-top: 0;">Assessment Breakdown</h3>
                
                <table style="width: 100%; margin-bottom: 15px; font-size: 14px;">
                    <tr>
                        <td>${feeLabel} (Per Year)</td>
                        <td style="text-align: right;">PHP ${tuitionFee.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                    </tr>
                    <tr>
                        <td>Miscellaneous Fees</td>
                        <td style="text-align: right;">PHP ${miscFee.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                    </tr>
                    <tr style="font-weight: bold; border-top: 1px solid #ddd;">
                        <td style="padding-top: 10px;">TOTAL AMOUNT DUE</td>
                        <td style="text-align: right; padding-top: 10px; color: #800000; font-size: 18px;">PHP ${displayAmount.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                    </tr>
                </table>
                <p style="margin: 0; color: #666;">Due Date: <b>${displayDueDate}</b></p>
                
                <div style="display: flex; gap: 10px; margin-top: 15px;">
                    <button class="btn" style="background: #800000; color: white; flex: 1; padding: 12px;" onclick="openPaymentModal('${billId}', ${displayAmount}, 'Full')">
                        Pay Full Amount
                    </button>
                    <button class="btn" style="background: #a00000; color: white; flex: 1; padding: 12px;" onclick="openPaymentModal('${billId}', ${displayAmount}, 'Installment')">
                        Pay Installment (50%)
                    </button>
                </div>
            </div>
        `;
    }

    c.innerHTML = `
        <div class="panel">
            <h2>Billing & Payment</h2>
            <p style="margin-bottom: 20px; color: #666;">View your assessment and payment history.</p>
            
            ${assessmentSection}

            <h3>Payment History</h3>
            ${simpleTable(
                ['Date', 'Amount', 'Method', 'Ref No.', 'Status'],
                db.payments.map(p => [
                    esc(p.datePaid),
                    `PHP ${p.amount.toLocaleString()}`,
                    esc(p.paymentMethod),
                    esc(p.referenceNo),
                    `<span class="badge ${p.status === 'Approved' ? 'active' : 'inactive'}">${p.status}</span>`
                ])
            )}
        </div>

        <!-- PAYMENT MODAL (still included for non-fully-paid students) -->
        <div id="paymentModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; align-items: center; justify-content: center;">
            <div style="background: white; width: 400px; padding: 30px; border-radius: 12px; position: relative;">
                <span onclick="$('paymentModal').style.display='none'" style="position: absolute; top: 10px; right: 15px; cursor: pointer; font-size: 20px;">&times;</span>
                <h3 style="margin-top: 0;" id="modalTitle">GCash Payment</h3>
                <p style="color: #666; font-size: 13px;">Scan the QR code below or send to <b>0917-123-4567</b> (EduTrack SIS).</p>
                
                <div style="text-align: center; margin: 15px 0;">
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=GCashPaymentEduTrack" alt="GCash QR" style="border: 1px solid #ccc; padding: 5px; border-radius: 8px;">
                </div>
                
                <div class="field" style="margin-bottom: 15px;">
                    <label>Amount to Pay</label>
                    <input type="text" id="payAmountDisplay" readonly style="width: 100%; padding: 8px; background: #f0f0f0; font-weight: bold;">
                </div>

                <div class="field" style="margin-bottom: 15px;">
                    <label>Reference Number</label>
                    <input type="text" id="payRefNo" placeholder="e.g., 10023456789" style="width: 100%; padding: 8px;">
                </div>

                <div class="field" style="margin-bottom: 15px;">
                    <label>Upload Receipt (Screenshot)</label>
                    <input type="file" id="payReceipt" accept="image/*" style="width: 100%; padding: 5px;" onchange="previewReceipt(this)">
                    <small style="color: #666;">Max size: 2MB</small>
                    <div id="receiptPreview" style="margin-top: 10px; display: none;">
                        <img id="previewImg" style="width: 100%; max-height: 150px; object-fit: contain; border: 1px solid #ccc;">
                    </div>
                </div>

                <button class="btn" style="width: 100%; background: #800000; color: white;" onclick="submitPayment()">Submit Payment</button>
            </div>
        </div>
    `;
}

let currentBillingId = null;
let currentPayAmount = 0;

function openPaymentModal(billingId, totalAmount, type) {
    currentBillingId = billingId;
    
    if (type === 'Full') {
        currentPayAmount = totalAmount;
        $('modalTitle').textContent = 'GCash Payment (Full)';
    } else {
        currentPayAmount = totalAmount * 0.5; 
        $('modalTitle').textContent = 'GCash Payment (Installment 50%)';
    }

    $('payAmountDisplay').value = `PHP ${currentPayAmount.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
    $('paymentModal').style.display = 'flex';
}

function previewReceipt(input) {
    if (input.files && input.files[0]) {
        var reader = new FileReader();
        reader.onload = function(e) {
            $('previewImg').src = e.target.result;
            $('receiptPreview').style.display = 'block';
        };
        reader.readAsDataURL(input.files[0]);
    }
}

async function submitPayment() {
    const refNo = $('payRefNo').value.trim();
    const fileInput = $('payReceipt');

    if (!refNo) { alert("Please enter the GCash Reference Number."); return; }
    if (!fileInput.files || fileInput.files.length === 0) { alert("Please upload a screenshot of your receipt."); return; }

    const reader = new FileReader();
    reader.onload = async function(e) {
        const base64Image = e.target.result;
        const s = currentStudent();

        try {
            const response = await fetch('/api/payments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentId: s.id,
                    billingId: currentBillingId,
                    amount: currentPayAmount,
                    paymentMethod: 'GCash',
                    referenceNo: refNo,
                    receiptImage: base64Image,
                    datePaid: new Date().toISOString().split('T')[0]
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            alert(data.message);
            $('paymentModal').style.display = 'none';
            
            const resPayments = await fetch(`/api/payments/${s.id}`);
            db.payments = await resPayments.json();
            renderStudentBilling($('content'));

        } catch (error) {
            alert("Failed to submit payment: " + error.message);
        }
    };
    reader.readAsDataURL(fileInput.files[0]);
}

/* ---------- ADMIN BILLING (WITH DIVISIONS & RECEIPT VIEWER) ---------- */
async function renderAdminBilling(c) {
    c.innerHTML = `
        <div class="panel">
            <h2>Billing & Payment Verification</h2>
            <p style="margin-bottom: 15px; color: #666;">Review student payment receipts and approve them.</p>
            
            <div style="margin-bottom: 30px;">
                <h3 style="color: #800000; border-bottom: 2px solid #800000; padding-bottom: 5px; margin-bottom: 15px;">Pending Payments (Action Required)</h3>
                <div id="pendingTable"><p class="empty-note">Loading...</p></div>
            </div>

            <div>
                <h3 style="color: #28a745; border-bottom: 2px solid #28a745; padding-bottom: 5px; margin-bottom: 15px;">Paid & Approved Students</h3>
                <div id="paidTable"><p class="empty-note">Loading...</p></div>
            </div>
            
            <div style="margin-top: 30px;">
                <h3 style="color: #333; border-bottom: 2px solid #ccc; padding-bottom: 5px; margin-bottom: 15px;">Unpaid Students (No Action Yet)</h3>
                <div id="unpaidTable"><p class="empty-note">Loading...</p></div>
            </div>
        </div>`;

    try {
        const res = await fetch('/api/admin/all-billing');
        
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const data = await res.json();

        let pendingRows = [];
        let paidRows = [];
        let unpaidRows = [];

        data.forEach(s => {
            const fullName = `<b>${esc(s.last)}, ${esc(s.first)}</b><br><small>(${esc(s.studentId)})</small>`;
            const year = esc(s.yr);
            const amountDue = s.totalAmount ? `PHP ${s.totalAmount.toLocaleString()}` : 'N/A';

            if (s.paymentStatus === 'Pending') {
                pendingRows.push([
                    fullName,
                    year,
                    amountDue,
                    `PHP ${s.paidAmount.toLocaleString()}`,
                    esc(s.referenceNo),
                    `<button class="btn small" style="background: #ffc107; color: #000;" onclick="adminViewReceipt(${s.paymentId}, '${s.receiptImage}', '${s.billingId}', true)">Review</button>`
                ]);
            } else if (s.paymentStatus === 'Approved') {
                paidRows.push({
                    date: s.datePaid,
                    row: [
                        fullName,
                        year,
                        `PHP ${s.paidAmount.toLocaleString()}`,
                        esc(s.referenceNo),
                        esc(s.datePaid),
                        `<button class="btn small secondary" onclick="adminViewReceipt(${s.paymentId}, '${s.receiptImage}', '${s.billingId}', false)">View Receipt</button>`
                    ]
                });
            } else {
                unpaidRows.push([
                    fullName,
                    year,
                    amountDue,
                    `<span class="badge inactive">Unpaid</span>`
                ]);
            }
        });

        // Sort Paid rows: Newest date first
        paidRows.sort((a, b) => new Date(b.date) - new Date(a.date));
        const sortedPaidRows = paidRows.map(pr => pr.row);

        if (pendingRows.length > 0) {
            $('pendingTable').innerHTML = simpleTable(
                ['Student', 'Year Level', 'Total Due', 'Amount Paid', 'Reference No.', 'Action'],
                pendingRows
            );
        } else {
            $('pendingTable').innerHTML = `<p class="empty-note">No pending payments to review.</p>`;
        }

        if (sortedPaidRows.length > 0) {
            $('paidTable').innerHTML = simpleTable(
                ['Student', 'Year Level', 'Amount Paid', 'Reference No.', 'Date Paid', 'Action'],
                sortedPaidRows
            );
        } else {
            $('paidTable').innerHTML = `<p class="empty-note">No approved payments yet.</p>`;
        }

        if (unpaidRows.length > 0) {
            $('unpaidTable').innerHTML = simpleTable(
                ['Student', 'Year Level', 'Amount Due', 'Status'],
                unpaidRows
            );
        } else {
            $('unpaidTable').innerHTML = `<p class="empty-note">All students have paid.</p>`;
        }

    } catch (error) {
        console.error("Failed to load billing data:", error);
        $('pendingTable').innerHTML = `<p class="empty-note">Failed to load billing data. Make sure server.js is updated and restarted.</p>`;
        $('paidTable').innerHTML = `<p class="empty-note"></p>`;
        $('unpaidTable').innerHTML = `<p class="empty-note"></p>`;
    }
}

function adminViewReceipt(paymentId, base64Img, billingId, isPending) {
    const modal = document.createElement('div');
    modal.style = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 1000; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px;";
    
    let actionButtons = `
        <button class="btn secondary" onclick="this.closest('div').parentElement.remove()">Close</button>
    `;

    if (isPending) {
        actionButtons = `
            <button class="btn" style="background: #28a745; color: white;" onclick="adminApprovePayment(${paymentId}, '${billingId}', this)">Approve Payment</button>
            <button class="btn secondary" onclick="this.closest('div').parentElement.remove()">Close</button>
        `;
    }

    modal.innerHTML = `
        <div style="background: white; padding: 20px; border-radius: 8px; max-width: 600px; width: 100%; text-align: center;">
            <h3>Payment Receipt</h3>
            <img src="${base64Img}" style="max-width: 100%; max-height: 60vh; border: 1px solid #ccc; margin-bottom: 20px;">
            <div style="display: flex; gap: 10px; justify-content: center;">
                ${actionButtons}
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

async function adminApprovePayment(paymentId, billingId, btnElement) {
    if (!confirm("Are you sure you want to approve this payment?")) return;

    try {
        const res = await fetch('/api/admin/payments/approve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentId: paymentId, billingId: billingId }) 
        });

        if (res.ok) {
            alert("Payment approved successfully!");
            btnElement.closest('div').parentElement.remove(); 
            renderAdminBilling($('content')); 
        }
    } catch (error) {
        alert("Error approving payment.");
    }
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
      .map(e => {
          const course = db.courses.find(c => c.code === e.courseCode);
          return course ? course.name : null;
      }).filter(name => name !== null);

  const availableCourses = db.courses.filter(course => {
      let matchesGradeAndSem = false;

      if (s.yr && s.yr.includes('-')) {
          matchesGradeAndSem = course.gradeLevel === s.yr;
      } else {
          matchesGradeAndSem = course.gradeLevel.startsWith(s.yr);
      }

      const isOpen = course.status === 'Open'; 
      const alreadyTaken = myEnrolledCourseNames.includes(course.name);
      const matchesSection = selectedSection === '' || course.section === selectedSection;
      
      return matchesGradeAndSem && isOpen && !alreadyTaken && matchesSection;
  });

  $('registrationTableArea').innerHTML = simpleTable(
      ['Course Code', 'Course Name', 'Section', 'Action'], 
      availableCourses.map(x => [
          esc(x.code), 
          esc(x.name), 
          esc(x.section), 
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
        
        drawRegistrationTable();
        alert("Successfully Enrolled!");
    } catch (error) {
        alert("Failed to enroll.");
    }
}

/* ---------- STUDENT SCHEDULE ---------- */
function renderSchedule(c) {
    const s = currentStudent();
    
    const myEnrollments = db.enrollments.filter(e => e.studentId === s.id);
    const myCourses = myEnrollments.map(e => db.courses.find(c => c.code === e.courseCode)).filter(c => c);

    if (myCourses.length === 0) {
        c.innerHTML = `<div class="panel"><h2>Weekly Class Schedule</h2><p class="empty-note">You are not enrolled in any courses yet. Please go to Online Course Registration.</p></div>`;
        return;
    }

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const isKinder = s.yr === 'Kinder';
    const isSHS = s.yr.includes('Grade 11') || s.yr.includes('Grade 12');
    const isElemOrJHS = !isKinder && !isSHS;

    let endTimeMinutes = 15 * 60; 
    if (isKinder) endTimeMinutes = 10 * 60; 
    else if (isElemOrJHS && (s.yr.includes('Grade 1') || s.yr.includes('Grade 2') || s.yr.includes('Grade 3'))) {
        endTimeMinutes = 12 * 60; 
    }

    const lunchStart = 12 * 60; 
    const lunchEnd = 13 * 60;   
    const snackStart = 9 * 60 + 30; 
    const snackEnd = 10 * 60;   

    const minorKeywords = ['Oral', 'Komunikasyon', 'General Math', 'Earth', 'Personal', 'Empowerment', 'PE and Health', 'Reading', 'Pagbasa', 'Statistics', 'Physical Science', 'Practical Research', '21st', 'Understanding', 'Philosophy', 'English for', 'Media', 'Contemporary', 'Pagsulat', 'Inquiries'];
    
    myCourses.forEach(course => {
        if (isSHS) {
            const isMinor = minorKeywords.some(kw => course.name.includes(kw));
            course._duration = isMinor ? 60 : 120; 
        } else if (isKinder) {
            course._duration = 30;
        } else {
            course._duration = 60; 
        }
    });

    let timeSlots = [];
    let currentTime = 7 * 60;
    while (currentTime < endTimeMinutes) {
        if (currentTime === lunchStart) { currentTime = lunchEnd; continue; }
        if (!isKinder && currentTime === snackStart) { currentTime = snackEnd; continue; }
        timeSlots.push(currentTime);
        currentTime += 30;
    }

    let scheduleGrid = {};
    days.forEach(day => {
        scheduleGrid[day] = {};
        timeSlots.forEach(time => scheduleGrid[day][time] = null);
    });

    let teacherBusy = {}; 

    for (let time of timeSlots) {
        for (let day of days) {
            if (scheduleGrid[day][time]) continue; 

            let assigned = false;
            let attempts = 0;
            let currentShiftedCourses = [...myCourses];

            while (!assigned && attempts < currentShiftedCourses.length) {
                let course = currentShiftedCourses[attempts];
                let teacher = course.adviser;
                let duration = course._duration;

                let canFit = true;
                let requiredSlots = duration / 30; 

                for (let i = 0; i < requiredSlots; i++) {
                    let checkTime = time + (i * 30);
                    if (!scheduleGrid[day].hasOwnProperty(checkTime) || scheduleGrid[day][checkTime] !== null) {
                        canFit = false; break;
                    }
                    if (!teacherBusy[teacher]) teacherBusy[teacher] = {};
                    if (teacherBusy[teacher][`${day}-${checkTime}`]) {
                        canFit = false; break;
                    }
                }

                if (canFit) {
                    for (let i = 0; i < requiredSlots; i++) {
                        let placeTime = time + (i * 30);
                        scheduleGrid[day][placeTime] = { ...course, isStart: i === 0 };
                        teacherBusy[teacher][`${day}-${placeTime}`] = true;
                    }
                    assigned = true;
                    myCourses.push(myCourses.shift()); 
                } else {
                    attempts++;
                }
            }
        }
    }

    let scheduleHTML = `
        <div class="panel">
            <h2>Weekly Class Schedule</h2>
            <p style="margin-bottom: 15px; color: #666;">Schedule for <b>${esc(s.first)} ${esc(s.last)}</b> (${esc(s.yr)})</p>
            <table style="width: 100%; border-collapse: collapse; text-align: center; font-size: 13px;">
                <thead>
                    <tr style="background: #5c0000; color: white;">
                        <th style="padding: 10px; border: 1px solid #ddd;">Time</th>
                        ${days.map(d => `<th style="padding: 10px; border: 1px solid #ddd;">${d}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
    `;

    let currentRowTime = 7 * 60;
    
    while (currentRowTime < endTimeMinutes) {
        const formatTime = (mins) => {
            let h = Math.floor(mins / 60);
            let m = mins % 60;
            let ampm = h >= 12 ? 'PM' : 'AM';
            if (h > 12) h -= 12;
            if (h === 0) h = 12;
            return `${h}:${m === 0 ? '00' : m} ${ampm}`;
        };

        if (!isKinder && currentRowTime === snackStart) {
            scheduleHTML += `<tr>
                <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; background: #f9f9f9;">${formatTime(snackStart)} - ${formatTime(snackEnd)}</td>
                <td colspan="5" style="padding: 10px; border: 1px solid #ddd; font-weight: bold; color: #b8860b; background: #fffcf0;">S N A C K S</td>
            </tr>`;
            currentRowTime = snackEnd;
            continue;
        }

        if (currentRowTime === lunchStart && endTimeMinutes > lunchStart) {
            scheduleHTML += `<tr>
                <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; background: #f9f9f9;">${formatTime(lunchStart)} - ${formatTime(lunchEnd)}</td>
                <td colspan="5" style="padding: 10px; border: 1px solid #ddd; font-weight: bold; color: #800000; background: #fff0f0;">L U N C H   B R E A K</td>
            </tr>`;
            currentRowTime = lunchEnd;
            continue;
        }

        scheduleHTML += `<tr>
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; background: #f9f9f9;">${formatTime(currentRowTime)} - ${formatTime(currentRowTime + 30)}</td>`;
            
        days.forEach(day => {
            const cell = scheduleGrid[day][currentRowTime];
            if (cell) {
                if (cell.isStart) {
                    let rowspan = cell._duration / 30; 
                    scheduleHTML += `<td rowspan="${rowspan}" style="padding: 10px; border: 1px solid #ddd; background: #fff; vertical-align: middle;">
                        <b>${esc(cell.name)}</b><br>
                        <small style="color: #666;">Sec: ${esc(cell.section)}</small>
                    </td>`;
                } 
            } else {
                scheduleHTML += `<td style="padding: 10px; border: 1px solid #ddd; background: #fafafa; color: #aaa;">—</td>`;
            }
        });
        
        scheduleHTML += `</tr>`;
        currentRowTime += 30;
    }

    scheduleHTML += `
                </tbody>
            </table>
        </div>
    `;

    c.innerHTML = scheduleHTML;
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

/* ---------- ADMIN: USERS, COURSES, DIRECTORY ---------- */
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

function renderCourses(c) {
  const gradeLevels = [...new Set(db.courses.map(course => course.gradeLevel))].sort();

  c.innerHTML = `
    <div class="panel">
        <h2>Course & Section Management</h2>
        <p style="margin-bottom: 15px; color: #666;">Courses will automatically close once the capacity limit is reached.</p>
        
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

        <div id="courseTableContainer"></div>
    </div>`;

  renderCoursesTable();
}

function renderCoursesTable() {
  const container = $('courseTableContainer');
  const selectedGrade = $('filterGrade') ? $('filterGrade').value : '';
  const selectedSection = $('filterSection') ? $('filterSection').value : '';

  updateSectionDropdown(selectedGrade, selectedSection);

  const filteredCourses = db.courses.filter(course => {
      const matchGrade = selectedGrade === '' || course.gradeLevel === selectedGrade;
      const matchSection = selectedSection === '' || course.section === selectedSection;
      return matchGrade && matchSection;
  });

  const rows = filteredCourses.map(x => [
      esc(x.code), 
      esc(x.name), 
      esc(x.section), 
      esc(x.adviser), 
      `<span class="badge ${x.status === 'Open' ? 'active' : 'inactive'}">${esc(x.status)}</span>`
  ]);

  container.innerHTML = simpleTable(['Code', 'Name', 'Section', 'Adviser', 'Status'], rows);
}

function updateSectionDropdown(selectedGrade, currentSection) {
  const sectionSelect = $('filterSection');
  if (!sectionSelect) return;

  let availableSections = db.courses;
  if (selectedGrade !== '') {
      availableSections = db.courses.filter(c => c.gradeLevel === selectedGrade);
  }
  
  const uniqueSections = [...new Set(availableSections.map(course => course.section))].sort();

  sectionSelect.innerHTML = `<option value="">All Sections</option>` + 
      uniqueSections.map(s => `<option value="${esc(s)}" ${s === currentSection ? 'selected' : ''}>${esc(s)}</option>`).join('');
}

function filterCoursesTable() {
  renderCoursesTable();
}

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
        
        <div class="field" id="f_strand_group" style="display: none;">
            <label>SHS Strand</label>
            <select id="f_strand">
                <option value="STEM">STEM</option>
                <option value="ABM">ABM</option>
                <option value="HUMSS">HUMSS</option>
                <option value="GAS">GAS</option>
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
        strandGroup.style.display = 'block'; 
        semGroup.style.display = 'block';    
    }

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
  
  const resUsers = await fetch('/api/users'); db.users = await resUsers.json();

  $('enrollmentFormArea').innerHTML = ''; 
  drawActiveTable();
  
  if(!existingId) alert("Student added! They can now login with their Student ID as username and 'password123' as password.");
}

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

async function renderProfileGrades(c) {
    const s = currentStudent();
    
    c.innerHTML = `
        <div class="panel">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <div>
                    <h2>Academic Profile & Grades</h2>
                    <p style="color: #666;">Below are your enrolled subjects and submitted grades.</p>
                </div>
                <button class="btn" style="background: #5c0000; color: white;" onclick="printCOR()">Print COR</button>
            </div>
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

function printCOR() {
    const s = currentStudent();
    const myEnrollments = db.enrollments.filter(e => e.studentId === s.id);
    
    if (myEnrollments.length === 0) {
        alert("You need to enroll in subjects first before printing your COR.");
        return;
    }

    const subjectsRows = myEnrollments.map((enroll, index) => {
        const course = db.courses.find(c => c.code === enroll.courseCode);
        if (!course) return '';
        return `
            <tr>
                <td style="text-align: center;">${index + 1}</td>
                <td>${esc(course.code)}</td>
                <td>${esc(course.name)}</td>
                <td style="text-align: center;">${esc(course.section)}</td>
                <td>${esc(course.adviser)}</td>
            </tr>
        `;
    }).join('');

    // --- DYNAMIC TUITION LOGIC FOR PRINT COR ---
    let yrStr = String(s.yr || '').trim().toLowerCase();
    let tuitionFee = 0;

    if (yrStr.includes('kinder')) {
        tuitionFee = 5000;
    } else if (yrStr.includes('grade 11') || yrStr.includes('grade 12')) {
        tuitionFee = 13000;
    } else if (yrStr.includes('grade 7') || yrStr.includes('grade 8') || yrStr.includes('grade 9') || yrStr.includes('grade 10')) {
        tuitionFee = 10000;
    } else if (yrStr.includes('grade 1') || yrStr.includes('grade 2') || yrStr.includes('grade 3') || yrStr.includes('grade 4') || yrStr.includes('grade 5') || yrStr.includes('grade 6')) {
        tuitionFee = 8000;
    } else {
        tuitionFee = 8000; 
    }

    const miscFee = 1500;
    const totalAmountDue = tuitionFee + miscFee;

    const printWindow = window.open('', '_blank', 'width=900,height=800');
    printWindow.document.write(`
        <html>
        <head>
            <title>Certificate of Registration</title>
            <style>
                body { font-family: 'Times New Roman', Times, serif; margin: 40px; color: #000; }
                .header { text-align: center; margin-bottom: 20px; }
                .header h1 { font-size: 18px; margin: 0; font-weight: bold; letter-spacing: 1px;}
                .header h2 { font-size: 16px; margin: 5px 0; font-weight: normal; }
                .header h3 { font-size: 14px; margin: 10px 0; font-weight: bold; letter-spacing: 2px; }
                .info-table { width: 100%; margin-bottom: 20px; font-size: 13px; }
                .info-table td { padding: 3px 0; }
                .main-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 20px; }
                .main-table th { background-color: #eee; border: 1px solid #000; padding: 6px; }
                .main-table td { border: 1px solid #000; padding: 6px; }
                .fees-table { width: 50%; border-collapse: collapse; font-size: 13px; float: right; margin-top: 10px; }
                .fees-table td { border: 1px solid #000; padding: 6px; }
                .footer { clear: both; margin-top: 50px; text-align: center; font-size: 12px; }
                .signature { margin-top: 50px; border-top: 1px solid #000; display: inline-block; padding-top: 5px; width: 250px; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>REPUBLIC OF THE PHILIPPINES</h1>
                <h2>EduTrack State University</h2>
                <h2 style="font-size: 12px;">Mariveles, Bataan</h2>
                <h3>CERTIFICATE OF REGISTRATION</h3>
            </div>

            <table class="info-table">
                <tr>
                    <td width="15%"><b>Student Name:</b></td>
                    <td width="35%">${esc(s.first)} ${esc(s.mi)} ${esc(s.last)}</td>
                    <td width="15%"><b>Student No:</b></td>
                    <td width="35%">${esc(s.id)}</td>
                </tr>
                <tr>
                    <td><b>Program:</b></td>
                    <td>${esc(s.course)}</td>
                    <td><b>School Year:</b></td>
                    <td>2026-2027</td>
                </tr>
                <tr>
                    <td><b>Year Level:</b></td>
                    <td>${esc(s.yr)}</td>
                    <td><b>Semester:</b></td>
                    <td>1st Semester</td>
                </tr>
            </table>

            <table class="main-table">
                <thead>
                    <tr>
                        <th width="5%">No.</th>
                        <th width="20%">Course Code</th>
                        <th width="40%">Course Description</th>
                        <th width="15%">Section</th>
                        <th width="20%">Faculty / Instructor</th>
                    </tr>
                </thead>
                <tbody>
                    ${subjectsRows}
                </tbody>
            </table>

            <table class="fees-table">
                <tr>
                    <td colspan="2" style="text-align: center; font-weight: bold; background-color: #eee;">ASSESSED FEES</td>
                </tr>
                <tr>
                    <td>Tuition Fee (Per Year)</td>
                    <td style="text-align: right;">PHP ${tuitionFee.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                </tr>
                <tr>
                    <td>Miscellaneous Fee</td>
                    <td style="text-align: right;">PHP ${miscFee.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                </tr>
                <tr>
                    <td style="font-weight: bold;">TOTAL AMOUNT DUE</td>
                    <td style="text-align: right; font-weight: bold;">PHP ${totalAmountDue.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                </tr>
            </table>

            <div class="footer">
                <p>This is a system-generated Certificate of Registration.</p>
                <div class="signature">UNIVERSITY REGISTRAR</div>
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
    }, 500);
}