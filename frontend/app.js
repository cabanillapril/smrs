/* ============================================
   SMRS — Student Monitoring & Recording System
   app.js — Full API-connected frontend (fixed)
   ============================================ */

const API_BASE = 'http://127.0.0.1:8000';

const MAJORS_DATA = {
  'Bachelor of Science in Industrial Technology': [
    'Automotive Technology',
    'Electrical Technology',
    'Electronics Technology'
  ],
  'Two-Year Technical Course': [
    'Automotive Technology',
    'Electrical Technology',
    'Electronics Technology'
  ],
  'One-Year Technical Course': [
    'Automechanics',
    'Practical Electricity',
    'Radio Mechanics',
    'Welding'
  ],
  'Associate in Mechatronics and Automation Technology': []
};

function updateMajorOptions(progId, majorId, isFilter = false) {
  const progVal = document.getElementById(progId).value;
  const majorSelect = document.getElementById(majorId);
  if (!majorSelect) return;

  const majors = MAJORS_DATA[progVal] || [];
  
  let html = isFilter ? '<option value="">All Majors</option>' : '<option value="">Select Major…</option>';
  if (majors.length === 0 && progVal) {
    html = isFilter ? '<option value="">All Majors</option>' : '<option value="">No majors for this program</option>';
  } else if (!progVal) {
    html = isFilter ? '<option value="">All Majors</option>' : '<option value="">Select Program first…</option>';
  }
  
  majors.forEach(m => {
    html += `<option>${m}</option>`;
  });
  
  majorSelect.innerHTML = html;
  
  if (isFilter) {
    const searchVal = document.getElementById('studentSearch')?.value || '';
    filterStudents(searchVal);
  }
}

// ─── API HELPER ───────────────────────────────────────────────────────────────

// ─── AUTH ────────────────────────────────────────────────────────────────────

async function handleLogin(e) {
  e.preventDefault();
  const u = document.getElementById('login_user').value;
  const p = document.getElementById('login_pass').value;
  const btn = e.target.querySelector('button');
  
  btn.disabled = true;
  btn.textContent = 'Signing in...';

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: u, password: p })
    });

    if (!res.ok) throw new Error('Invalid credentials');

    const data = await res.json();
    localStorage.setItem('smrs_token', data.access_token);
    localStorage.setItem('smrs_user', data.username);
    
    toast('Welcome back, ' + data.username + '!');
    checkAuth();
    
    // Load data after login
    await initAppData();
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sign In';
  }
}

function handleLogout() {
  if (!confirm('Are you sure you want to logout?')) return;
  localStorage.removeItem('smrs_token');
  localStorage.removeItem('smrs_user');
  location.reload();
}

function checkAuth() {
  const token = localStorage.getItem('smrs_token');
  const user  = localStorage.getItem('smrs_user');
  const loginScreen = document.getElementById('loginScreen');
  const appContent = document.getElementById('appContent');

  if (token) {
    if (loginScreen) loginScreen.style.display = 'none';
    if (appContent) appContent.classList.remove('app-hidden');
    if (user && document.getElementById('display_username')) {
       document.getElementById('display_username').textContent = user;
    }
    return true;
  } else {
    if (loginScreen) loginScreen.style.display = 'flex';
    if (appContent) appContent.classList.add('app-hidden');
    return false;
  }
}

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('smrs_token');
  const headers = { 
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers 
  };
  
  try {
    const res = await fetch(API_BASE + path, { ...options, headers });
    if (!res.ok) {
      if (res.status === 401) {
        localStorage.removeItem('smrs_token');
        checkAuth();
      }
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || `HTTP ${res.status}`);
    }
    if (res.status === 204) return null;
    return res.json();
  } catch (e) {
    if (e.name === 'TypeError' && e.message.includes('fetch')) {
      throw new Error('Cannot connect to backend. Make sure the server is running on port 8000.');
    }
    throw e;
  }
}

// ─── IN-MEMORY CACHE ─────────────────────────────────────────────────────────

let db = {
  students:     [],
  deficiencies: [],
  grades:       [],
  subjects:     [],
  activities:   [],
};

// ─── TOAST NOTIFICATIONS ─────────────────────────────────────────────────────

function toast(msg, type = 'success') {
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.innerHTML = `<span class="toast-icon">${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span><span>${msg}</span>`;
  document.getElementById('toastContainer').appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3500);
}

// ─── PAGE NAVIGATION ─────────────────────────────────────────────────────────

function showPage(pageId, linkEl) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById('page-' + pageId);
  if (target) target.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (linkEl) linkEl.classList.add('active');
  if (window.innerWidth <= 768) {
    document.getElementById('sidebar').classList.remove('open');
  }
  return false;
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

document.addEventListener('click', function (e) {
  const sidebar = document.getElementById('sidebar');
  const menuBtn = document.querySelector('.menu-btn');
  if (
    window.innerWidth <= 768 &&
    sidebar?.classList.contains('open') &&
    !sidebar.contains(e.target) &&
    menuBtn && !menuBtn.contains(e.target)
  ) {
    sidebar.classList.remove('open');
  }
});

// ─── MODAL MANAGEMENT ────────────────────────────────────────────────────────

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) { modal.classList.add('open'); document.body.style.overflow = 'hidden'; }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) { modal.classList.remove('open'); document.body.style.overflow = ''; }
}

document.addEventListener('click', function (e) {
  if (e.target.classList.contains('modal-overlay')) closeModal(e.target.id);
});

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => closeModal(m.id));
  }
});

// ─── MODAL TABS ──────────────────────────────────────────────────────────────

function switchTab(tabEl, tabId) {
  const modal = tabEl.closest('.modal');
  modal.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
  modal.querySelectorAll('.modal-tab-content').forEach(c => c.classList.remove('active'));
  tabEl.classList.add('active');
  const content = document.getElementById('tab-' + tabId);
  if (content) content.classList.add('active');
}

// ─── ACTIVITY LOG ────────────────────────────────────────────────────────────

function addActivity(text, type = 'blue') {
  db.activities.unshift({ text, type, time: new Date().toLocaleString() });
  if (db.activities.length > 15) db.activities.pop();
  renderActivityList();
}

function renderActivityList() {
  const activityList = document.getElementById('recentActivityList');
  if (!activityList) return;
  if (db.activities.length === 0) {
    activityList.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;padding:8px 0;">No recent activity.</p>';
    return;
  }
  activityList.innerHTML = db.activities.map(a => `
    <div class="activity-item">
      <div class="activity-dot ${a.type}"></div>
      <div class="activity-body">
        <span class="activity-text">${a.text}</span>
        <span class="activity-time">${a.time}</span>
      </div>
    </div>
  `).join('');
}

// ─── GLOBAL SEARCH ───────────────────────────────────────────────────────────

function handleGlobalSearch(val) {
  if (val.trim().length < 1) return;
  showPage('students', document.querySelector('[data-page="students"]'));
  filterStudents(val);
}

// ─── STUDENTS ────────────────────────────────────────────────────────────────

async function loadStudents() {
  try {
    db.students = await apiFetch('/students/getall');
    renderStudents();
  } catch (e) {
    console.error('Failed to load students:', e.message);
    toast('Failed to load students: ' + e.message, 'error');
  }
}

async function saveStudent() {
  const studentID    = document.getElementById('std_id').value.trim();
  const firstName    = document.getElementById('std_first_name').value.trim();
  const lastName     = document.getElementById('std_last_name').value.trim();
  const middleName   = document.getElementById('std_middle_name').value.trim() || null;
  const birthday     = document.getElementById('std_dob').value || null;
  const gender       = document.getElementById('std_gender').value || 'other';
  const contact      = document.getElementById('std_contact').value.trim() || 'N/A';
  const email        = document.getElementById('std_email').value.trim() || null;
  const program      = document.getElementById('std_program').value;
  const major        = document.getElementById('std_major').value;
  const yearLevelRaw = document.getElementById('std_year').value;
  const section      = document.getElementById('std_section').value.trim();
  const status       = document.getElementById('std_status').value || 'Regular';
  const address      = document.getElementById('std_address').value.trim() || 'N/A';

  if (!studentID || !lastName || !firstName || !program || !section) {
    toast('Please fill in Name, Program, and Section.', 'error');
    return;
  }

  // Parse "1st Year" → 1, "2nd Year" → 2, etc.
  const yearMap = { '1st Year': 1, '2nd Year': 2, '3rd Year': 3, '4th Year': 4 };
  const yearLevel = yearMap[yearLevelRaw] || parseInt(yearLevelRaw) || 1;

  const payload = {
    student_id: studentID,
    first_name:     firstName,
    middle_name:    middleName,
    last_name:      lastName,
    birthday,
    gender:         gender.toLowerCase(),
    address,
    contact_number: contact,
    email,
    year_level:     yearLevel,
    course:         program,
    major:          major,
    section,
    status,
  };

  try {
    const result = await apiFetch('/students/', { method: 'POST', body: JSON.stringify(payload) });
    addActivity(`New student <b>${firstName} ${lastName}</b> enrolled.`, 'blue');
    toast(`Student ${firstName} ${lastName} added successfully!`);
    await loadStudents();
    await loadDashboardStats();
    closeModal('addStudentModal');
    clearForm(['std_id','std_first_name','std_last_name','std_middle_name','std_dob','std_contact',
               'std_email','std_section','std_address']);
    document.getElementById('std_gender').value  = '';
    document.getElementById('std_program').value = '';
    document.getElementById('std_major').innerHTML = '<option value="">Select Program first…</option>';
    document.getElementById('std_year').value    = '';
    document.getElementById('std_status').value  = 'Regular';
  } catch (e) {
    toast('Failed to save student: ' + e.message, 'error');
  }
}

async function deleteStudent(number, name) {
  if (!confirm(`Delete student "${name}"? This cannot be undone.`)) return;
  try {
    await apiFetch(`/students/${number}`, { method: 'DELETE' });
    addActivity(`Student <b>${name}</b> deleted.`, 'red');
    toast('Student deleted.', 'info');
    await loadStudents();
    await loadDashboardStats();
  } catch (e) {
    toast('Failed to delete student: ' + e.message, 'error');
  }
}

async function openStudentProfile(studentNumber) {
  const s = db.students.find(s => s.student_number === studentNumber);
  if (!s) return;

  // Fill profile header
  const initials = ((s.first_name?.[0] || '') + (s.last_name?.[0] || '')).toUpperCase();
  document.getElementById('profileAvatar').textContent = initials;
  document.getElementById('profileName').textContent   = `${s.last_name}, ${s.first_name}${s.middle_name ? ' ' + s.middle_name[0] + '.' : ''}`;
  document.getElementById('profileId').textContent     = s.student_id || `STU-${s.student_number}`;

  const statusEl = document.getElementById('profileStatus');
  statusEl.textContent  = s.status;
  statusEl.className    = `status-badge ${s.status === 'Regular' ? 'regular' : 'irregular'}`;

  // Fill info tab
  document.getElementById('info-fullname').textContent   = `${s.first_name} ${s.middle_name || ''} ${s.last_name}`.trim();
  document.getElementById('info-birthday').textContent   = s.birthday || '—';
  document.getElementById('info-gender').textContent     = s.gender || '—';
  document.getElementById('info-contact').textContent    = s.contact_number || '—';
  document.getElementById('info-email').textContent      = s.email || '—';
  document.getElementById('info-course').textContent     = s.course || '—';
  document.getElementById('info-year').textContent       = s.year_level ? `${s.year_level}` + ['st','nd','rd','th'][Math.min(s.year_level-1,3)] + ' Year' : '—';
  document.getElementById('info-section').textContent    = s.section || '—';
  document.getElementById('info-address').textContent    = s.address || '—';

  // Store current student number for edit
  document.getElementById('studentProfileModal').dataset.studentNumber = studentNumber;

  // Reset to info tab
  document.querySelectorAll('#studentProfileModal .modal-tab').forEach((t, i) => t.classList.toggle('active', i === 0));
  document.querySelectorAll('#studentProfileModal .modal-tab-content').forEach((c, i) => c.classList.toggle('active', i === 0));

  // Load grades for this student
  loadProfileGrades(studentNumber);
  loadProfileDeficiencies(studentNumber);

  openModal('studentProfileModal');
}

async function loadProfileGrades(studentNumber) {
  const tbody = document.getElementById('profileGradesBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted)">Loading…</td></tr>';
  try {
    const grades = await apiFetch(`/grades/student/${studentNumber}`);
    if (!grades.length) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted)">No grades recorded.</td></tr>';
      return;
    }
    tbody.innerHTML = grades.map(g => {
      const gClass = g.grade <= 3.0 ? 'good' : 'bad';
      const rem = g.remarks === 'passed' ? 'Passed' : g.remarks === 'failed' ? 'Failed' : (g.remarks || 'INC');
      const remClass = g.remarks === 'passed' ? 'regular' : 'deficient';
      return `<tr>
        <td>${g.subject_code || '—'}</td>
        <td>${g.subject_name || '—'}</td>
        <td>${g.unit ?? '—'}</td>
        <td class="gwa ${gClass}">${g.grade}</td>
        <td><span class="status-badge ${remClass}">${rem}</span></td>
      </tr>`;
    }).join('');
    // GWA
    const avg = (grades.reduce((s, g) => s + g.grade, 0) / grades.length).toFixed(2);
    const gwaSummary = document.getElementById('profileGwaSummary');
    if (gwaSummary) gwaSummary.innerHTML = `GWA: <strong class="gwa ${avg <= 2.0 ? 'good' : avg <= 3.0 ? 'average' : 'bad'}">${avg}</strong>`;
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="5" style="color:var(--accent-red)">Error: ${e.message}</td></tr>`;
  }
}

async function loadProfileDeficiencies(studentNumber) {
  const container = document.getElementById('profileDeficiencies');
  if (!container) return;
  container.innerHTML = '<p style="color:var(--text-muted)">Loading…</p>';
  try {
    const defics = await apiFetch(`/deficiencies/student/${studentNumber}`);
    const pending = defics.filter(d => d.status !== 'resolved');
    if (!pending.length) {
      container.innerHTML = '<p class="empty-state">✓ No active deficiencies for this student.</p>';
      return;
    }
    container.innerHTML = `<table class="data-table">
      <thead><tr><th>Subject</th><th>Type</th><th>Semester</th><th>Deadline</th><th>Status</th></tr></thead>
      <tbody>${pending.map(d => `
        <tr>
          <td>${d.subject_code || ''} — ${d.subject_name || ''}</td>
          <td><span class="def-type ${d.reason.toLowerCase()}">${d.reason}</span></td>
          <td>${d.semester || '—'}</td>
          <td class="deadline-cell">${d.deadline || '—'}</td>
          <td><span class="status-badge deficient">Pending</span></td>
        </tr>`).join('')}
      </tbody></table>`;
  } catch (e) {
    container.innerHTML = `<p style="color:var(--accent-red)">Error: ${e.message}</p>`;
  }
}

function openEditStudent() {
  const modalEl  = document.getElementById('studentProfileModal');
  const sn       = parseInt(modalEl.dataset.studentNumber);
  const s        = db.students.find(s => s.student_number === sn);
  if (!s) return;

  const yearLabels = ['', '1st Year', '2nd Year', '3rd Year', '4th Year'];

  document.getElementById('edit_std_id').value          = s.student_id || '';
  document.getElementById('edit_first_name').value      = s.first_name || '';
  document.getElementById('edit_last_name').value       = s.last_name || '';
  document.getElementById('edit_middle_name').value     = s.middle_name || '';
  document.getElementById('edit_dob').value             = s.birthday || '';
  document.getElementById('edit_gender').value          = s.gender ? s.gender.charAt(0).toUpperCase() + s.gender.slice(1) : '';
  document.getElementById('edit_contact').value         = s.contact_number || '';
  document.getElementById('edit_email').value           = s.email || '';
  document.getElementById('edit_program').value         = s.course || '';
  
  // Populate and set major
  updateMajorOptions('edit_program', 'edit_major');
  document.getElementById('edit_major').value           = s.major || '';

  document.getElementById('edit_year').value            = yearLabels[s.year_level] || '';
  document.getElementById('edit_section').value         = s.section || '';
  document.getElementById('edit_status').value          = s.status || 'Regular';
  document.getElementById('edit_address').value         = s.address || '';

  // Use student_number for hidden field to identify record for update
  document.getElementById('edit_std_number_hidden').value = s.student_number;

  closeModal('studentProfileModal');
  openModal('editStudentModal');
}

async function updateStudent() {
  const sn = parseInt(document.getElementById('edit_std_number_hidden').value);
  const yearMap  = { '1st Year': 1, '2nd Year': 2, '3rd Year': 3, '4th Year': 4 };
  const yearRaw  = document.getElementById('edit_year').value;

  const payload = {
    student_id:     document.getElementById('edit_std_id').value.trim(),
    first_name:     document.getElementById('edit_first_name').value.trim(),
    last_name:      document.getElementById('edit_last_name').value.trim(),
    middle_name:    document.getElementById('edit_middle_name').value.trim() || null,
    birthday:       document.getElementById('edit_dob').value || null,
    gender:         document.getElementById('edit_gender').value.toLowerCase() || null,
    contact_number: document.getElementById('edit_contact').value.trim() || null,
    email:          document.getElementById('edit_email').value.trim() || null,
    course:         document.getElementById('edit_program').value,
    major:          document.getElementById('edit_major').value,
    year_level:     yearMap[yearRaw] || parseInt(yearRaw) || 1,
    section:        document.getElementById('edit_section').value.trim(),
    status:         document.getElementById('edit_status').value,
    address:        document.getElementById('edit_address').value.trim() || null,
  };

  if (!payload.first_name || !payload.last_name) {
    toast('Name is required.', 'error'); return;
  }

  try {
    await apiFetch(`/students/${sn}`, { method: 'PUT', body: JSON.stringify(payload) });
    addActivity(`Student <b>${payload.first_name} ${payload.last_name}</b> record updated.`, 'green');
    toast('Student updated successfully!');
    await loadStudents();
    await loadDashboardStats();
    closeModal('editStudentModal');
  } catch (e) {
    toast('Failed to update student: ' + e.message, 'error');
  }
}

function renderStudents(list) {
  const data  = list || db.students;
  const tbody = document.getElementById('studentTableBody');
  if (!tbody) return;

  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-muted)">No students found.</td></tr>`;
    return;
  }

  const avatarColors = ['#6366f1','#5b8ef0','#34d399','#f59e0b','#f87171','#a78bfa','#06b6d4'];

  tbody.innerHTML = data.map(s => {
    const initial  = ((s.first_name?.[0] || '') + (s.last_name?.[0] || '')).toUpperCase();
    const color    = avatarColors[s.student_number % avatarColors.length];
    const badge    = s.status === 'Regular' ? 'regular' : s.status === 'Irregular' ? 'irregular' : 'deficient';
    const yearLbls = ['','1st','2nd','3rd','4th'];
    const yr       = yearLbls[s.year_level] || s.year_level || '—';
    const name     = `${s.last_name}, ${s.first_name}${s.middle_name ? ' ' + s.middle_name[0] + '.' : ''}`;
    return `<tr class="table-row" onclick="openStudentProfile(${s.student_number})">
      <td class="id-cell">${s.student_id || 'STU-' + s.student_number}</td>
      <td class="name-cell">
        <div class="avatar-name">
          <div class="mini-avatar" style="--c:${color}">${initial}</div>
          ${name}
        </div>
      </td>
      <td>
        <div style="font-weight:500">${s.course || '—'}</div>
        <div style="font-size:0.75rem;color:var(--text-muted)">${s.major || 'No Major'}</div>
      </td>
      <td><span class="year-badge">${yr} Year</span></td>
      <td><span class="section-badge">${s.section || '—'}</span></td>
      <td class="gwa good">—</td>
      <td><span class="status-badge ${badge}">${s.status || 'Regular'}</span></td>
      <td class="actions-cell" onclick="event.stopPropagation()">
        <button class="icon-btn" title="Edit" onclick="openStudentProfile(${s.student_number}); setTimeout(openEditStudent, 100)">
          <i class="ph ph-pencil-simple"></i>
        </button>
        <button class="icon-btn danger" title="Delete" onclick="deleteStudent(${s.student_number}, '${name.replace(/'/g, "\\'")}')">
          <i class="ph ph-trash"></i>
        </button>
      </td>
    </tr>`;
  }).join('');

  const countEl = document.querySelector('.table-count');
  if (countEl) countEl.innerHTML = `Showing <b>${data.length}</b> of <b>${db.students.length}</b> students`;
}

function filterStudents(val) {
  const course  = document.getElementById('filterCourse')?.value || '';
  const major   = document.getElementById('filterMajor')?.value || '';
  const year    = document.getElementById('filterYear')?.value || '';
  const status  = document.getElementById('filterStatus')?.value || '';
  const q       = val.toLowerCase();
  const yearMap = { '1st Year': 1, '2nd Year': 2, '3rd Year': 3, '4th Year': 4 };

  const filtered = db.students.filter(s => {
    const fullName = `${s.first_name} ${s.last_name} ${s.middle_name || ''}`.toLowerCase();
    const sid      = String(s.student_id);
    const snum     = (s.student_number || '').toLowerCase();
    const sectionF = document.getElementById('filterSection')?.value || '';
    
    const matchQ   = !q || fullName.includes(q) || sid.includes(q) || snum.includes(q);
    const matchC   = !course || s.course === course;
    const matchM   = !major || s.major === major;
    const matchY   = !year || s.year_level === yearMap[year];
    const matchSec = !sectionF || s.section === sectionF;
    const matchS   = !status || s.status === status;
    return matchQ && matchC && matchM && matchY && matchSec && matchS;
  });

  renderStudents(filtered);
}

// Auto-filter on filter changes
document.addEventListener('change', function(e) {
  if (['filterCourse','filterYear','filterSection','filterStatus'].includes(e.target.id)) {
    filterStudents(document.getElementById('studentSearch')?.value || '');
  }
  if (['filterDefCourse','filterDefYear','filterDefSection'].includes(e.target.id)) {
    filterDeficiencies(document.getElementById('defSearch')?.value || '');
  }
  if (['filterGradeCourse','filterGradeYear','filterGradeSection'].includes(e.target.id)) {
    filterGrades(document.getElementById('gradeSearch')?.value || '');
  }
  if (e.target.id === 'filterDefMajor') filterDeficiencies(document.getElementById('defSearch')?.value || '');
  if (e.target.id === 'filterGradeMajor') filterGrades(document.getElementById('gradeSearch')?.value || '');
});

// ─── SUBJECTS ────────────────────────────────────────────────────────────────

async function loadSubjects() {
  try {
    db.subjects = await apiFetch('/subjects/');
  } catch (e) {
    db.subjects = [];
    console.error('Failed to load subjects:', e.message);
  }
}





// ─── DEFICIENCIES ────────────────────────────────────────────────────────────

document.addEventListener('input', function (e) {
  if (e.target.id === 'def_std_id') {
    const val     = e.target.value.trim();
    const student = db.students.find(s => s.student_id === val || s.student_number == val);
    const nameEl  = document.getElementById('def_std_name');
    if (nameEl) nameEl.value = student ? `${student.last_name}, ${student.first_name}` : '';
  }
  if (e.target.id === 'def_subj_code') {
    const code    = e.target.value.trim().toUpperCase();
    const subject = db.subjects.find(s => s.subject_code.toUpperCase() === code);
    const nameEl  = document.getElementById('def_subj_name');
    if (nameEl && subject) nameEl.value = subject.subject_name;
  }
});

async function loadDeficiencies() {
  try {
    db.deficiencies = await apiFetch('/deficiencies/');
    renderDeficiencies();
  } catch (e) {
    console.error('Failed to load deficiencies:', e.message);
    toast('Failed to load deficiencies: ' + e.message, 'error');
  }
}

async function saveDeficiency() {
  const inputVal    = document.getElementById('def_std_id').value.trim();
  const subjectCode = document.getElementById('def_subj_code').value.trim().toUpperCase();
  const subjectName = document.getElementById('def_subj_name').value.trim();
  const reason      = document.getElementById('def_type').value;
  const semester    = document.getElementById('def_semester').value;
  const deadline    = document.getElementById('def_deadline').value || null;
  const remarks     = document.getElementById('def_remarks').value.trim() || null;

  if (!inputVal) { toast('Please enter a Student ID.', 'error'); return; }

  // Find student by student_id string or student_number
  const student = db.students.find(s => s.student_id === inputVal || s.student_number == inputVal);
  if (!student) { toast(`Student ID "${inputVal}" not found.`, 'error'); return; }
  
  const studentNumber = student.student_number;

  // Find or create subject
  let subject = db.subjects.find(s => s.subject_code.toUpperCase() === subjectCode);
  if (!subject) {
    try {
      subject = await apiFetch('/subjects/', {
        method: 'POST',
        body: JSON.stringify({ subject_code: subjectCode, subject_name: subjectName || subjectCode, unit: 3 })
      });
      await loadSubjects();
    } catch (e) {
      toast('Failed to register subject: ' + e.message, 'error'); return;
    }
  }

  const payload = {
    student_number: studentNumber,
    subject_id:     subject.subject_id,
    reason:         reason,
    status:         'pending',
    semester,
    deadline,
    remarks,
    date_recorded:  new Date().toISOString().slice(0, 10),
  };

  try {
    await apiFetch('/deficiencies/', { method: 'POST', body: JSON.stringify(payload) });
    addActivity(`Deficiency recorded for <b>${student.last_name}, ${student.first_name}</b> — ${subjectCode}`, 'orange');
    toast('Deficiency recorded successfully!');
    await loadDeficiencies();
    await loadDashboardStats();
    closeModal('addDeficiencyModal');
    clearForm(['def_std_id','def_std_name','def_subj_code','def_subj_name','def_deadline','def_remarks']);
    document.getElementById('def_type').value = '';
  } catch (e) {
    toast('Failed to save deficiency: ' + e.message, 'error');
  }
}

async function resolveDeficiency(id) {
  if (!confirm('Mark this deficiency as resolved?')) return;
  const dateResolved = new Date().toISOString().slice(0, 10);
  try {
    await apiFetch(`/deficiencies/${id}/resolve`, {
      method: 'PATCH',
      body: JSON.stringify({ date_resolved: dateResolved }),
    });
    addActivity(`Deficiency <b>#${id}</b> resolved.`, 'green');
    toast('Deficiency resolved!');
    await loadDeficiencies();
    await loadDashboardStats();
  } catch (e) {
    toast('Failed to resolve deficiency: ' + e.message, 'error');
  }
}

async function deleteDeficiency(id) {
  if (!confirm('Delete this deficiency record?')) return;
  try {
    await apiFetch(`/deficiencies/${id}`, { method: 'DELETE' });
    toast('Deficiency deleted.', 'info');
    await loadDeficiencies();
    await loadDashboardStats();
  } catch (e) {
    toast('Failed to delete deficiency: ' + e.message, 'error');
  }
}

function renderDeficiencies(list) {
  const data  = list || db.deficiencies;
  const tbody = document.getElementById('deficienciesTableBody');
  if (!tbody) return;

  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--text-muted)">No deficiencies recorded.</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(d => {
    const reasonLc  = (d.reason || '').toLowerCase();
    const typeClass = reasonLc.includes('incomplete') ? 'incomplete' : 'failed';
    const statusLbl = d.status === 'resolved' ? 'Resolved' : 'Pending';
    const statusCls = d.status === 'resolved' ? 'regular' : 'deficient';
    const isOverdue = d.deadline && d.status !== 'resolved' && new Date(d.deadline) < new Date();

    return `<tr class="table-row">
      <td class="id-cell">${d.student_id || d.student_number}</td>
      <td>${d.student_name || '—'}</td>
      <td>${d.subject_code || ''} — ${d.subject_name || ''}</td>
      <td><span class="def-type ${typeClass}">${d.reason}</span></td>
      <td>${d.semester || '—'}</td>
      <td class="deadline-cell ${isOverdue ? 'overdue' : ''}">${d.deadline || '—'}${isOverdue ? ' ⚠' : ''}</td>
      <td><span class="status-badge ${statusCls}">${statusLbl}</span></td>
      <td class="actions-cell">
        ${d.status !== 'resolved' ? `
          <button class="icon-btn" title="Resolve" onclick="resolveDeficiency(${d.deficiency_id})">
            <i class="ph ph-check-circle"></i>
          </button>` : ''}
        <button class="icon-btn danger" title="Delete" onclick="deleteDeficiency(${d.deficiency_id})">
          <i class="ph ph-trash"></i>
        </button>
      </td>
    </tr>`;
  }).join('');

  // Update deficiency stats
  const pending    = data.filter(d => d.status !== 'resolved');
  const resolved   = data.filter(d => d.status === 'resolved');
  const incomplete = pending.filter(d => d.reason?.toLowerCase().includes('incomplete'));
  const failed     = pending.filter(d => d.reason?.toLowerCase().includes('failed'));
  setEl('def-stat-total', pending.length);
  setEl('def-stat-inc',   incomplete.length);
  setEl('def-stat-fail',  failed.length);
  setEl('def-stat-res',   resolved.length);
}
function filterDeficiencies(val) {
  const course  = document.getElementById('filterDefCourse')?.value || '';
  const major   = document.getElementById('filterDefMajor')?.value || '';
  const year    = document.getElementById('filterDefYear')?.value || '';
  const section = document.getElementById('filterDefSection')?.value || '';
  const q       = (val || '').toLowerCase();
  const yearMap = { '1st Year': 1, '2nd Year': 2, '3rd Year': 3, '4th Year': 4 };

  const filtered = db.deficiencies.filter(d => {
    const student = db.students.find(s => s.student_number === d.student_number);
    if (!student && (course || major || year || section)) return false;

    const matchQ = !q || 
                   (d.student_name || '').toLowerCase().includes(q) || 
                   (d.subject_code || '').toLowerCase().includes(q) ||
                   String(d.student_id || d.student_number).includes(q);
    
    const matchC = !course || student?.course === course;
    const matchM = !major || student?.major === major;
    const matchY = !year || student?.year_level === yearMap[year];
    const matchSec = !section || student?.section === section;
    
    return matchQ && matchC && matchM && matchY && matchSec;
  });
  renderDeficiencies(filtered);
}

function resetDefFilters() {
  document.getElementById('defSearch').value = '';
  document.getElementById('filterDefCourse').value = '';
  document.getElementById('filterDefMajor').innerHTML = '<option value="">All Majors</option>';
  document.getElementById('filterDefYear').value = '';
  document.getElementById('filterDefSection').value = '';
  filterDeficiencies('');
}

// ─── GRADES ──────────────────────────────────────────────────────────────────

async function loadGrades() {
  try {
    db.grades = await apiFetch('/grades/');
    renderGrades();
  } catch (e) {
    console.error('Failed to load grades:', e.message);
    toast('Failed to load grades: ' + e.message, 'error');
  }
}

async function saveGrade() {
  const inputVal    = document.getElementById('gradeStudentId').value.trim();
  const subjectCode = document.getElementById('gradeSubjCode').value.trim().toUpperCase();
  const midterm     = parseFloat(document.getElementById('gradeMidterm').value) || null;
  const finals      = parseFloat(document.getElementById('gradeFinals').value) || null;
  const gradeValue  = parseFloat(document.getElementById('gradeValue').value.trim());
  
  const semRaw      = document.getElementById('gradeSemester').value || '1st Semester 2025–2026';
  const semester    = parseInt(semRaw[0]) || 1;
  const schoolYear  = semRaw.split(' ').pop(); // Gets '2025–2026'

  if (!inputVal || !subjectCode || isNaN(gradeValue)) {
    toast('Student ID, Subject Code, and Final Grade are required.', 'error'); return;
  }
  if (gradeValue < 1.0 || gradeValue > 5.0) {
    toast('Grade must be between 1.0 and 5.0.', 'error'); return;
  }

  // Find student by student_id string or student_number
  const student = db.students.find(s => s.student_id === inputVal || s.student_number == inputVal);
  if (!student) { toast(`Student ID "${inputVal}" not found.`, 'error'); return; }
  
  const studentNumber = student.student_number;

  let subject = db.subjects.find(s => s.subject_code.toUpperCase() === subjectCode);
  if (!subject) { toast(`Subject "${subjectCode}" not found. Add it in the Subjects page first.`, 'error'); return; }

  const remarks = gradeValue <= 3.0 ? 'passed' : 'failed';

  const payload = {
    student_number: studentNumber,
    subject_id:     subject.subject_id,
    semester:       semester,
    school_year:    schoolYear,
    midterm,
    finals,
    grade:          gradeValue,
    remarks,
  };

  try {
    await apiFetch('/grades/', { method: 'POST', body: JSON.stringify(payload) });
    addActivity(`Grade <b>${gradeValue}</b> recorded for <b>${student.last_name}, ${student.first_name}</b> — ${subjectCode}`, 'green');
    toast('Grade saved successfully!');
    await loadGrades();
    closeModal('addGradeModal');
    clearForm(['gradeStudentId','gradeSubjCode','gradeMidterm','gradeFinals','gradeValue']);
  } catch (e) {
    toast('Failed to save grade: ' + e.message, 'error');
  }
}

async function deleteGrade(id) {
  if (!confirm('Delete this grade record?')) return;
  try {
    await apiFetch(`/grades/${id}`, { method: 'DELETE' });
    toast('Grade deleted.', 'info');
    await loadGrades();
  } catch (e) {
    toast('Failed to delete grade: ' + e.message, 'error');
  }
}

function renderGrades(list) {
  const data  = list || db.grades;
  const tbody = document.getElementById('gradesTableBody');
  if (!tbody) return;

  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:2rem;color:var(--text-muted)">No grades recorded.</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(g => {
    const gClass = g.grade <= 3.0 ? 'good' : 'bad';
    const rem    = g.remarks === 'passed' ? 'Passed' : g.remarks === 'failed' ? 'Failed' : (g.remarks || 'INC');
    const rCls   = g.remarks === 'passed' ? 'regular' : 'deficient';
    return `<tr class="table-row">
      <td class="id-cell">${g.student_id || g.student_number}</td>
      <td>${g.student_name || '—'}</td>
      <td><span class="subj-code-badge">${g.subject_code || '—'}</span></td>
      <td>${g.subject_name || '—'}</td>
      <td>${g.unit ?? '—'}</td>
      <td>${g.midterm ?? '—'}</td>
      <td>${g.finals ?? '—'}</td>
      <td class="gwa ${gClass}">${g.grade}</td>
      <td><span class="status-badge ${rCls}">${rem}</span></td>
      <td class="actions-cell">
        <button class="icon-btn danger" title="Delete" onclick="deleteGrade(${g.grade_id})">
          <i class="ph ph-trash"></i>
        </button>
      </td>
    </tr>`;
  }).join('');
}

function filterGrades(val) {
  const course  = document.getElementById('filterGradeCourse')?.value || '';
  const major   = document.getElementById('filterGradeMajor')?.value || '';
  const year    = document.getElementById('filterGradeYear')?.value || '';
  const section = document.getElementById('filterGradeSection')?.value || '';
  const q       = (val || '').toLowerCase();
  const yearMap = { '1st Year': 1, '2nd Year': 2, '3rd Year': 3, '4th Year': 4 };

  const filtered = db.grades.filter(g => {
    const student = db.students.find(s => s.student_number === g.student_number);
    if (!student && (course || major || year || section)) return false;

    const matchQ = !q || 
                   (g.student_name || '').toLowerCase().includes(q) || 
                   (g.subject_code || '').toLowerCase().includes(q) ||
                   String(g.student_id || g.student_number).includes(q);
    
    const matchC = !course || student?.course === course;
    const matchM = !major || student?.major === major;
    const matchY = !year || student?.year_level === yearMap[year];
    const matchSec = !section || student?.section === section;

    return matchQ && matchC && matchM && matchY && matchSec;
  });
  renderGrades(filtered);
}

function resetGradeFilters() {
  document.getElementById('gradeSearch').value = '';
  document.getElementById('filterGradeCourse').value = '';
  document.getElementById('filterGradeMajor').innerHTML = '<option value="">All Majors</option>';
  document.getElementById('filterGradeYear').value = '';
  document.getElementById('filterGradeSection').value = '';
  filterGrades('');
}


// ─── CURRICULUM ──────────────────────────────────────────────────────────────

const COURSE_KEYS = {
  bsit:      'Bachelor of Science in Industrial Technology',
  mechatronics: 'Associate in Mechatronics and Automation Technology',
  'two-year':'Two-Year Technical Course',
  'one-year':'One-Year Technical Course',
};

async function switchCurrTab(tabEl, courseKey) {
  document.querySelectorAll('.curr-tab').forEach(t => t.classList.remove('active'));
  tabEl.classList.add('active');

  const course = COURSE_KEYS[courseKey] || courseKey;

  // Update Major Filter options
  const majorFilter = document.getElementById('currMajorFilter');
  if (majorFilter) {
    const majors = MAJORS_DATA[course] || [];
    if (majorFilter.dataset.lastCourse !== course) {
      let html = '<option value="">All Majors</option>';
      majors.forEach(m => html += `<option>${m}</option>`);
      majorFilter.innerHTML = html;
      majorFilter.dataset.lastCourse = course;
    }
  }

  const container = document.getElementById('currContent');
  if (!container) return;
  container.innerHTML = '<p style="color:var(--text-muted);padding:1rem;">Loading curriculum…</p>';

  try {
    const major  = document.getElementById('currMajorFilter')?.value || '';
    let url = `/curriculum/?course=${encodeURIComponent(course)}`;
    if (major) url += `&major=${encodeURIComponent(major)}`;
    const data = await apiFetch(url);

    if (!data?.length) {
      container.innerHTML = `<div class="curr-empty-state">
        <i class="ph ph-books" style="font-size:2rem;opacity:0.3"></i>
        <p>No curriculum data for this ${major ? 'major' : 'program'} yet.</p>
        <button class="btn btn-primary" onclick="openAddCurriculumModal('${course}')">+ Add Subject to Curriculum</button>
      </div>`;
      return;
    }

    const grouped = {};
    data.forEach(e => {
      const key = `${e.year_level}-${e.semester}`;
      if (!grouped[key]) grouped[key] = { year_level: e.year_level, semester: e.semester, subjects: [] };
      grouped[key].subjects.push(e);
    });

    const ordY = n => ['1st','2nd','3rd','4th'][n-1] || `${n}th`;
    const ordS = n => n === 1 ? '1st Semester' : '2nd Semester';

    container.innerHTML = Object.values(grouped)
      .sort((a,b) => a.year_level - b.year_level || a.semester - b.semester)
      .map(group => `
        <div class="curr-year-card">
          <div class="curr-year-header">${ordY(group.year_level)} Year — ${ordS(group.semester)}</div>
          <div class="curr-subjects">
            ${group.subjects.map(s => `
              <div class="curr-subj">
                <span class="subj-code">${s.subject_code || '—'}</span>
                <span class="subj-name">${s.subject_name || '—'}</span>
                <span class="subj-units">${s.unit ?? '—'} units</span>
                <button class="icon-btn danger" style="margin-left:auto;font-size:0.7rem" title="Remove" onclick="removeCurriculumEntry(${s.curriculum_id})">
                  <i class="ph ph-minus-circle"></i>
                </button>
              </div>`).join('')}
          </div>
        </div>`).join('');

  } catch (e) {
    container.innerHTML = `<p style="color:var(--accent-red);padding:1rem;">Error: ${e.message}</p>`;
  }
}

let _currentCurriculumCourse = '';
function openAddCurriculumModal(course) {
  _currentCurriculumCourse = course;
  document.getElementById('curr_course').value = course;
  
  // Update major dropdown for curriculum
  updateMajorOptions('curr_course', 'curr_major');
  
  openModal('addCurriculumModal');
}

async function saveCurriculumEntry() {
  const course     = document.getElementById('curr_course').value.trim();
  const major      = document.getElementById('curr_major').value;
  const yearLevel  = parseInt(document.getElementById('curr_year').value);
  const semester   = parseInt(document.getElementById('curr_semester').value);
  const subjectCode= document.getElementById('curr_subj_code').value.trim().toUpperCase();
  const subjectName= document.getElementById('curr_subj_name').value.trim();
  const units      = parseInt(document.getElementById('curr_units').value) || 3;

  if (!course || !yearLevel || !semester || !subjectCode) {
    toast('All fields except Subject Name are required.', 'error'); return;
  }

  // Find or create subject
  let subject = db.subjects.find(s => s.subject_code.toUpperCase() === subjectCode);
  if (!subject) {
    try {
      subject = await apiFetch('/subjects/', {
        method: 'POST',
        body: JSON.stringify({ subject_code: subjectCode, subject_name: subjectName || subjectCode, unit: units, course, major })
      });
      await loadSubjects();
    } catch (e) {
      toast('Failed to register subject: ' + e.message, 'error'); return;
    }
  }

  try {
    await apiFetch('/curriculum/', {
      method: 'POST',
      body: JSON.stringify({ course, major, year_level: yearLevel, semester, subject_id: subject.subject_id })
    });
    toast('Curriculum entry added!');
    closeModal('addCurriculumModal');
    clearForm(['curr_subj_code','curr_subj_name','curr_units']);
    
    // Update local subjects cache
    await loadSubjects();
    
    // Refresh current tab
    const activeTab = document.querySelector('.curr-tab.active');
    if (activeTab) activeTab.click();
  } catch (e) {
    toast('Failed to add curriculum entry: ' + e.message, 'error');
  }
}

async function removeCurriculumEntry(curriculumId) {
  if (!confirm('Remove this subject from the curriculum?')) return;
  try {
    await apiFetch(`/curriculum/${curriculumId}`, { method: 'DELETE' });
    toast('Removed from curriculum.', 'info');
    const activeTab = document.querySelector('.curr-tab.active');
    if (activeTab) activeTab.click();
  } catch (e) {
    toast('Failed to remove: ' + e.message, 'error');
  }
}

// ─── DASHBOARD ───────────────────────────────────────────────────────────────

async function loadDashboardStats() {
  try {
    const stats = await apiFetch('/dashboard/stats');
    setEl('stat-students',     stats.total_students);
    setEl('stat-active',       stats.active_students);
    setEl('stat-deficiencies', stats.pending_deficiencies);
    setEl('def-stat-total',    stats.total_deficiencies || stats.pending_deficiencies);
    setEl('def-stat-inc',      stats.incomplete_count);
    setEl('def-stat-fail',     stats.failed_count);
    setEl('def-stat-res',      stats.resolved_count);
  } catch (e) {
    console.error('Failed to load dashboard stats:', e.message);
  }
}

function renderDashboardCharts() {
  if (!db.students || db.students.length === 0) return;

  // --- BAR CHART: Enrollment by Year Level ---
  const courseConfigs = [
    { label: 'BSIT', search: 'Industrial Technology', years: 4 },
    { label: 'Mechatronics', search: 'Mechatronics', years: 3 },
    { label: '2-Year', search: 'Two-Year', years: 2 },
    { label: '1-Year', search: 'One-Year', years: 1 }
  ];

  const counts = courseConfigs.map(c => {
    const yearsData = [];
    for (let yr = 1; yr <= c.years; yr++) {
      const count = db.students.filter(s => 
        (s.course || '').includes(c.search) && s.year_level === yr && s.status !== 'Graduated'
      ).length;
      yearsData.push(count);
    }
    return yearsData;
  });

  // Scale for height (100% is the max count found in any group)
  const max = Math.max(...counts.flat(), 1);

  const barGroups = document.querySelectorAll('.bar-group');
  counts.forEach((yearCounts, courseIdx) => {
    const group = barGroups[courseIdx];
    if (!group) return;
    const bars = group.querySelectorAll('.bar');
    yearCounts.forEach((count, yrIdx) => {
      if (bars[yrIdx]) {
        const height = (count / max) * 100;
        bars[yrIdx].style.setProperty('--h', `${height}%`);
        bars[yrIdx].setAttribute('title', `${count} students`);
      }
    });
  });

  // --- DONUT CHART: Status Breakdown ---
  const activeStudents = db.students.filter(s => s.status !== 'Graduated');
  const totalActive = activeStudents.length || 1;

  const regularCount = activeStudents.filter(s => s.status === 'Regular').length;
  const irregularCount = activeStudents.filter(s => s.status === 'Irregular').length;
  
  // Deficient count based on pending deficiencies
  const deficientIds = new Set(db.deficiencies.filter(d => d.status === 'pending').map(d => d.student_number));
  const deficientCount = activeStudents.filter(s => deficientIds.has(s.student_number)).length;

  // Update Legend Labels
  const dlItems = document.querySelectorAll('.dl-item b');
  if (dlItems[0]) dlItems[0].textContent = regularCount;
  if (dlItems[1]) dlItems[1].textContent = irregularCount;
  if (dlItems[2]) dlItems[2].textContent = deficientCount;

  // Center Number
  setEl('stat-students-donut', regularCount + irregularCount + deficientCount);

  // SVG Circles
  const total = regularCount + irregularCount + deficientCount || 1;
  const circumference = 289; // 2 * PI * 46 approx

  const segs = document.querySelectorAll('.donut-seg');
  if (segs.length >= 3) {
    const rPerc = (regularCount / total) * circumference;
    const iPerc = (irregularCount / total) * circumference;
    const dPerc = (deficientCount / total) * circumference;

    segs[0].setAttribute('stroke-dasharray', `${rPerc} ${circumference - rPerc}`);
    segs[0].setAttribute('stroke-dashoffset', 0);

    segs[1].setAttribute('stroke-dasharray', `${iPerc} ${circumference - iPerc}`);
    segs[1].setAttribute('stroke-dashoffset', -rPerc);

    segs[2].setAttribute('stroke-dasharray', `${dPerc} ${circumference - dPerc}`);
    segs[2].setAttribute('stroke-dashoffset', -(rPerc + iPerc));
  }
}

// ─── REPORT DOWNLOAD ─────────────────────────────────────────────────────────

function downloadReport(type) {
  let rows, headers, filename;

  if (type === 'enrollment') {
    headers  = ['Student ID','Name','Course','Year Level','Section','Status'];
    rows     = db.students.map(s => [
      s.student_number || s.student_id,
      `${s.last_name}, ${s.first_name}`,
      s.course, s.year_level, s.section, s.status
    ]);
    filename = 'enrollment_report.csv';
  } else if (type === 'deficiency') {
    headers  = ['Student ID','Student Name','Subject','Reason','Status','Semester','Deadline'];
    rows     = db.deficiencies.map(d => [
      d.student_id, d.student_name, `${d.subject_code} ${d.subject_name}`,
      d.reason, d.status, d.semester, d.deadline
    ]);
    filename = 'deficiency_report.csv';
  } else if (type === 'grades') {
    headers  = ['Student ID','Name','Subject Code','Subject','Grade','Remarks'];
    rows     = db.grades.map(g => [
      g.student_id, g.student_name, g.subject_code, g.subject_name, g.grade, g.remarks
    ]);
    filename = 'grade_report.csv';
  }

  const csv = [headers, ...rows].map(r => r.map(c => `"${c ?? ''}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  toast(`${filename} downloaded!`);
  closeModal('reportModal');
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val ?? '—';
}

function clearForm(ids) {
  ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
}

// ─── INIT ────────────────────────────────────────────────────────────────────

async function initAppData() {
  await Promise.allSettled([
    loadSubjects(),
    loadStudents(),
    loadDeficiencies(),
    loadGrades(),
    loadDashboardStats(),
  ]);
  renderActivityList();
  renderDashboardCharts();
}

document.addEventListener('DOMContentLoaded', async function () {
  showPage('dashboard', document.querySelector('[data-page="dashboard"]'));

  // 1. Check Auth First
  if (!checkAuth()) return;

  // 2. Check backend connectivity
  try {
    await fetch(API_BASE + '/');
  } catch (e) {
    toast('⚠ Backend server not reachable. Start the FastAPI server on port 8000.', 'error');
  }

  // 3. Load Data
  await initAppData();
});
