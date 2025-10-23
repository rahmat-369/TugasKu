// Main application (ES module) - orchestrates storage + render + events
import { generateId, formatDate, formatTimestamp, isOverdue } from './utils.js';
import { loadAll, saveTasks, saveSchedules, saveNotes, saveSettings } from './storage.js';
import { renderTasks, renderSchedules, renderNotes, attachTaskListDelegation, attachScheduleDelegation, attachNotesDelegation } from './render.js';

// Application state (kept in-memory)
let state = {
  tasks: [],
  schedules: [],
  notes: [],
  settings: {}
};

const DOM = {
  taskForm: document.getElementById('taskForm'),
  scheduleForm: document.getElementById('scheduleForm'),
  noteForm: document.getElementById('noteForm'),
  openFormBtn: document.getElementById('openFormBtn'),
  addScheduleBtn: document.getElementById('addScheduleBtn'),
  addNoteBtn: document.getElementById('addNoteBtn'),
  cancelFormBtn: document.getElementById('cancelForm'),
  cancelScheduleFormBtn: document.getElementById('cancelScheduleForm'),
  cancelNoteFormBtn: document.getElementById('cancelNoteForm'),
  clearAllBtn: document.getElementById('clearAll'),
  filterButtons: document.querySelectorAll('.filter-btn[data-filter]'),
  tabButtons: document.querySelectorAll('.tab-btn'),
  fab: document.getElementById('fab'),
  toastEl: document.getElementById('toast'),
  settingsBtn: document.getElementById('settingsBtn'),
  settingsMenu: document.getElementById('settingsMenu'),
  settingsItems: document.querySelectorAll('.settings-item'),
  aboutModal: document.getElementById('aboutModal'),
  closeAboutModal: document.getElementById('closeAboutModal'),
  themeModal: document.getElementById('themeModal'),
  closeThemeModal: document.getElementById('closeThemeModal'),
  themeOptions: document.querySelectorAll('.theme-option'),
  notifBtn: document.getElementById('notifBtn'),
  notifBadge: document.getElementById('notifBadge'),
  statsBtn: document.getElementById('statsBtn'),
  statsModal: document.getElementById('statsModal'),
  closeStatsModal: document.getElementById('closeStatsModal'),
  totalTasksEl: document.getElementById('totalTasks'),
  completedTasksEl: document.getElementById('completedTasks'),
  pendingTasksEl: document.getElementById('pendingTasks'),
  overdueTasksEl: document.getElementById('overdueTasks'),
  highPriorityTasksEl: document.getElementById('highPriorityTasks'),
  mediumPriorityTasksEl: document.getElementById('mediumPriorityTasks'),
  lowPriorityTasksEl: document.getElementById('lowPriorityTasks'),
  tipsBtn: document.getElementById('tipsBtn'),
  tipsModal: document.getElementById('tipsModal'),
  closeTipsModal: document.getElementById('closeTipsModal'),
  watermark: document.getElementById('watermark'),
  taskListEl: document.getElementById('taskList'),
  scheduleContainerEl: document.getElementById('scheduleContainer'),
  notesListEl: document.getElementById('notesList'),
  taskDeadlineEl: document.getElementById('taskDeadline')
};

let currentFilter = 'all';
let currentTab = 'tasks';
let toastTimeout = null;

// Toast
function showToast(msg, duration = 3000) {
  if (!DOM.toastEl) return;
  clearTimeout(toastTimeout);
  DOM.toastEl.textContent = msg;
  DOM.toastEl.classList.add('show');
  toastTimeout = setTimeout(() => DOM.toastEl.classList.remove('show'), duration);
}

// Theme handling
function initTheme() {
  const saved = localStorage.getItem('theme') || 'light';
  document.body.className = saved;
}
function setTheme(theme) {
  document.body.className = theme;
  localStorage.setItem('theme', theme);
  showToast('Tema diubah');
}

// Settings menu toggle
function toggleSettingsMenu() {
  DOM.settingsMenu.classList.toggle('show');
}
function closeSettingsMenu(e){
  if (!DOM.settingsBtn.contains(e.target) && !DOM.settingsMenu.contains(e.target)) {
    DOM.settingsMenu.classList.remove('show');
  }
}

// Simple stats update
function updateStats() {
  const total = state.tasks.length;
  const completed = state.tasks.filter(t => t.status === 'done').length;
  const pending = total - completed;
  const overdue = state.tasks.filter(t => isOverdue(t.deadline) && t.status !== 'done').length;
  DOM.totalTasksEl && (DOM.totalTasksEl.textContent = total);
  DOM.completedTasksEl && (DOM.completedTasksEl.textContent = completed);
  DOM.pendingTasksEl && (DOM.pendingTasksEl.textContent = pending);
  DOM.overdueTasksEl && (DOM.overdueTasksEl.textContent = overdue);
}

// Notification badge
function updateNotifBadge() {
  const overdueCount = state.tasks.filter(t => isOverdue(t.deadline) && t.status !== 'done').length;
  if (overdueCount > 0) {
    DOM.notifBadge.textContent = overdueCount;
    DOM.notifBadge.style.display = 'flex';
  } else {
    DOM.notifBadge.style.display = 'none';
  }
}

// Load & render
function loadState() {
  const all = loadAll();
  state.tasks = all.tasks || [];
  state.schedules = all.schedules || [];
  state.notes = all.notes || [];
  state.settings = all.settings || {};
}

function persistTasks() { saveTasks(state.tasks); }
function persistSchedules() { saveSchedules(state.schedules); }
function persistNotes() { saveNotes(state.notes); }

// Setup min deadline
function setMinDeadline() {
  if (DOM.taskDeadlineEl) {
    const today = new Date().toISOString().split('T')[0];
    DOM.taskDeadlineEl.min = today;
  }
}

// Event handlers (delegated)
function onTaskAction(id, action) {
  const idx = state.tasks.findIndex(t => t.id === id);
  if (idx === -1) return;
  const task = state.tasks[idx];
  if (action === 'toggle') {
    task.status = task.status === 'done' ? 'active' : 'done';
    persistTasks();
    renderTasksView();
    showToast(task.status === 'done' ? 'Tugas selesai!' : 'Tugas dibatalkan');
  } else if (action === 'edit') {
    // populate form and remove item (edit workflow similar to previous)
    document.getElementById('taskSubject').value = task.subject;
    document.getElementById('taskName').value = task.name;
    document.getElementById('taskDeadline').value = task.deadline;
    document.getElementById('taskNotes').value = task.notes || '';
    document.getElementById('taskPriority').value = task.priority || 'medium';
    state.tasks.splice(idx,1);
    persistTasks();
    renderTasksView();
    toggleForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast('Edit tugas');
  } else if (action === 'delete') {
    if (!confirm('Apakah Anda yakin ingin menghapus tugas ini?')) return;
    state.tasks.splice(idx,1);
    persistTasks();
    renderTasksView();
    showToast('Tugas dihapus');
  }
}

function onScheduleAction(id, action) {
  const idx = state.schedules.findIndex(s => s.id === id);
  if (idx === -1) return;
  const schedule = state.schedules[idx];
  if (action === 'edit') {
    document.getElementById('scheduleSubject').value = schedule.subject;
    document.getElementById('scheduleDay').value = schedule.day;
    document.getElementById('scheduleTime').value = schedule.time;
    state.schedules.splice(idx,1);
    persistSchedules();
    renderSchedulesView();
    toggleScheduleForm(true);
    showToast('Edit jadwal');
  } else if (action === 'delete') {
    if (!confirm('Apakah Anda yakin ingin menghapus jadwal ini?')) return;
    state.schedules.splice(idx,1);
    persistSchedules();
    renderSchedulesView();
    showToast('Jadwal dihapus');
  }
}

function onNoteAction(id, action) {
  const idx = state.notes.findIndex(n => n.id === id);
  if (idx === -1) return;
  const note = state.notes[idx];
  if (action === 'edit') {
    document.getElementById('noteTitle').value = note.title;
    document.getElementById('noteContent').value = note.content;
    state.notes.splice(idx,1);
    persistNotes();
    renderNotesView();
    toggleNoteForm(true);
    showToast('Edit catatan');
  } else if (action === 'delete') {
    if (!confirm('Apakah Anda yakin ingin menghapus catatan ini?')) return;
    state.notes.splice(idx,1);
    persistNotes();
    renderNotesView();
    showToast('Catatan dihapus');
  }
}

// Render wrappers
function renderTasksView() {
  renderTasks(state.tasks, currentFilter);
  updateStats();
  updateNotifBadge();
}
function renderSchedulesView() {
  renderSchedules(state.schedules);
}
function renderNotesView() {
  renderNotes(state.notes);
}

// Toggle forms
function toggleForm(show) {
  const f = DOM.taskForm;
  const isVisible = !f.classList.contains('hidden');
  const shouldShow = typeof show === 'boolean' ? show : !isVisible;
  if (shouldShow) f.classList.remove('hidden'); else f.classList.add('hidden');
  DOM.openFormBtn.setAttribute('aria-expanded', shouldShow);
}
function toggleScheduleForm(show) {
  const f = DOM.scheduleForm;
  const isVisible = !f.classList.contains('hidden');
  const shouldShow = typeof show === 'boolean' ? show : !isVisible;
  if (shouldShow) f.classList.remove('hidden'); else f.classList.add('hidden');
  DOM.addScheduleBtn.setAttribute('aria-expanded', shouldShow);
}
function toggleNoteForm(show) {
  const f = DOM.noteForm;
  const isVisible = !f.classList.contains('hidden');
  const shouldShow = typeof show === 'boolean' ? show : !isVisible;
  if (shouldShow) f.classList.remove('hidden'); else f.classList.add('hidden');
  DOM.addNoteBtn.setAttribute('aria-expanded', shouldShow);
}

// initialize event listeners
function initEventListeners() {
  // Forms
  DOM.taskForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const subject = document.getElementById('taskSubject').value.trim();
    const name = document.getElementById('taskName').value.trim();
    const deadline = document.getElementById('taskDeadline').value;
    const notes = document.getElementById('taskNotes').value.trim();
    const priority = document.getElementById('taskPriority').value;
    if (!subject || !name || !deadline) {
      showToast('Harap isi semua field yang diperlukan');
      return;
    }
    const newTask = { id: generateId(), subject, name, deadline, notes, priority, status: 'new', createdAt: Date.now() };
    state.tasks.push(newTask);
    persistTasks();
    renderTasksView();
    toggleForm(false);
    DOM.taskForm.reset();
    showToast('Tugas ditambahkan');
  });

  DOM.scheduleForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const subject = document.getElementById('scheduleSubject').value.trim();
    const day = document.getElementById('scheduleDay').value;
    const time = document.getElementById('scheduleTime').value;
    if (!subject || !day || !time) {
      showToast('Harap isi semua field yang diperlukan');
      return;
    }
    state.schedules.push({ id: generateId(), subject, day, time });
    persistSchedules();
    renderSchedulesView();
    toggleScheduleForm(false);
    DOM.scheduleForm.reset();
    showToast('Jadwal ditambahkan');
  });

  DOM.noteForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('noteTitle').value.trim();
    const content = document.getElementById('noteContent').value.trim();
    if (!title || !content) {
      showToast('Harap isi semua field yang diperlukan');
      return;
    }
    const now = Date.now();
    state.notes.push({ id: generateId(), title, content, createdAt: now, updatedAt: now });
    persistNotes();
    renderNotesView();
    toggleNoteForm(false);
    DOM.noteForm.reset();
    showToast('Catatan ditambahkan');
  });

  DOM.openFormBtn?.addEventListener('click', () => toggleForm());
  DOM.addScheduleBtn?.addEventListener('click', () => toggleScheduleForm());
  DOM.addNoteBtn?.addEventListener('click', () => toggleNoteForm());
  DOM.cancelFormBtn?.addEventListener('click', () => { toggleForm(false); DOM.taskForm.reset(); });
  DOM.cancelScheduleFormBtn?.addEventListener('click', () => { toggleScheduleForm(false); DOM.scheduleForm.reset(); });
  DOM.cancelNoteFormBtn?.addEventListener('click', () => { toggleNoteForm(false); DOM.noteForm.reset(); });

  DOM.clearAllBtn?.addEventListener('click', () => {
    if (state.tasks.length === 0) { showToast('Tidak ada tugas untuk dihapus'); return; }
    if (!confirm('Apakah Anda yakin ingin menghapus semua tugas?')) return;
    state.tasks = [];
    persistTasks();
    renderTasksView();
    showToast('Semua tugas dihapus');
  });

  // Filters
  DOM.filterButtons?.forEach(btn => {
    btn.addEventListener('click', function() {
      DOM.filterButtons.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      currentFilter = this.dataset.filter;
      renderTasksView();
    });
  });

  // Tabs
  DOM.tabButtons.forEach(btn => {
    btn.addEventListener('click', function() {
      DOM.tabButtons.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      const tab = this.dataset.tab;
      document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
      document.getElementById(tab + 'Tab').classList.add('active');
      currentTab = tab;
    });
  });

  // FAB
  DOM.fab?.addEventListener('click', () => {
    if (currentTab === 'tasks') { toggleForm(true); document.getElementById('taskSubject').focus(); }
    if (currentTab === 'schedule') { toggleScheduleForm(true); document.getElementById('scheduleSubject').focus(); }
    if (currentTab === 'notes') { toggleNoteForm(true); document.getElementById('noteTitle').focus(); }
  });

  // Settings interactions
  DOM.settingsBtn?.addEventListener('click', toggleSettingsMenu);
  document.addEventListener('click', closeSettingsMenu);
  DOM.settingsItems?.forEach(item => {
    item.addEventListener('click', () => {
      const action = item.dataset.action;
      if (action === 'about') {
        DOM.aboutModal.classList.add('show');
        DOM.settingsMenu.classList.remove('show');
      } else if (action === 'theme') {
        DOM.themeModal.classList.add('show');
        DOM.settingsMenu.classList.remove('show');
      } else if (action === 'reset') {
        if (confirm('Apakah Anda yakin ingin mereset semua data?')) {
          localStorage.clear();
          state.tasks = []; state.schedules = []; state.notes = [];
          persistTasks(); persistSchedules(); persistNotes();
          renderTasksView(); renderSchedulesView(); renderNotesView();
          showToast('Data telah direset');
        }
        DOM.settingsMenu.classList.remove('show');
      }
    });
  });

  // Close modals
  document.getElementById('closeAboutModal')?.addEventListener('click', () => DOM.aboutModal.classList.remove('show'));
  document.getElementById('closeThemeModal')?.addEventListener('click', () => DOM.themeModal.classList.remove('show'));
  document.getElementById('closeTipsModal')?.addEventListener('click', () => DOM.tipsModal.classList.remove('show'));
  document.getElementById('closeStatsModal')?.addEventListener('click', () => DOM.statsModal.classList.remove('show'));
  DOM.tipsBtn?.addEventListener('click', () => DOM.tipsModal.classList.add('show'));
  DOM.statsBtn?.addEventListener('click', () => { updateStats(); DOM.statsModal.classList.add('show'); });

  // Theme options
  DOM.themeOptions?.forEach(option => {
    option.addEventListener('click', () => {
      const theme = option.dataset.theme;
      setTheme(theme);
      DOM.themeModal.classList.remove('show');
    });
  });

  // Notification button (go to overdue filter)
  DOM.notifBtn?.addEventListener('click', () => {
    DOM.filterButtons.forEach(b => b.classList.remove('active'));
    const overdueBtn = document.querySelector('.filter-btn[data-filter="overdue"]');
    if (overdueBtn) overdueBtn.classList.add('active');
    currentFilter = 'overdue';
    renderTasksView();
    document.querySelector('.tab-btn[data-tab="tasks"]').click();
    showToast('Menampilkan tugas terlambat');
  });

  // Delegation
  attachTaskListDelegation(onTaskAction);
  attachScheduleDelegation(onScheduleAction);
  attachNotesDelegation(onNoteAction);
}

// Initialize app
function init() {
  // set version watermark
  const versionMeta = document.querySelector('meta[name="app-version"]');
  if (versionMeta && DOM.watermark) {
    DOM.watermark.textContent = `by : Rahmat - v${versionMeta.getAttribute('content')}`;
  }

  initTheme();
  setMinDeadline();
  loadState();
  initEventListeners();

  renderTasksView();
  renderSchedulesView();
  renderNotesView();

  // brief ready toast
  showToast('Aplikasi siap digunakan', 1500);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}