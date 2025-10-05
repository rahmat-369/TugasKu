// Existing application code dari index.html dengan penambahan fitur tahap 3 dan Tips modal
(function(){
  // State management
  let tasks = [];
  let schedules = [];
  let notes = [];
  let currentFilter = 'all';
  let searchQuery = '';
  let currentTab = 'tasks';
  let currentTheme = localStorage.getItem('theme') || 'light';
  const STORAGE_KEYS = {
    TASKS: 'pr_tasks_v3',
    SCHEDULES: 'pr_schedules_v1',
    NOTES: 'pr_notes_v1',
    SETTINGS: 'pr_settings_v1'
  };
  
  // DOM elements
  const taskForm = document.getElementById('taskForm');
  const scheduleForm = document.getElementById('scheduleForm');
  const noteForm = document.getElementById('noteForm');
  const openFormBtn = document.getElementById('openFormBtn');
  const addScheduleBtn = document.getElementById('addScheduleBtn');
  const addNoteBtn = document.getElementById('addNoteBtn');
  const cancelFormBtn = document.getElementById('cancelForm');
  const cancelScheduleFormBtn = document.getElementById('cancelScheduleForm');
  const cancelNoteFormBtn = document.getElementById('cancelNoteForm');
  const clearAllBtn = document.getElementById('clearAll');
  const taskList = document.getElementById('taskList');
  const scheduleContainer = document.getElementById('scheduleContainer');
  const notesList = document.getElementById('notesList');
  const filterButtons = document.querySelectorAll('.filter-btn[data-filter]');
  const tabButtons = document.querySelectorAll('.tab-btn');
  const fab = document.getElementById('fab');
  const toastEl = document.getElementById('toast');
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsMenu = document.getElementById('settingsMenu');
  const settingsItems = document.querySelectorAll('.settings-item');
  const aboutModal = document.getElementById('aboutModal');
  const closeAboutModal = document.getElementById('closeAboutModal');
  const themeModal = document.getElementById('themeModal');
  const closeThemeModal = document.getElementById('closeThemeModal');
  const themeOptions = document.querySelectorAll('.theme-option');
  const notifBtn = document.getElementById('notifBtn');
  const notifBadge = document.getElementById('notifBadge');
  const statsBtn = document.getElementById('statsBtn');
  const statsModal = document.getElementById('statsModal');
  const closeStatsModal = document.getElementById('closeStatsModal');
  const totalTasksEl = document.getElementById('totalTasks');
  const completedTasksEl = document.getElementById('completedTasks');
  const pendingTasksEl = document.getElementById('pendingTasks');
  const overdueTasksEl = document.getElementById('overdueTasks');
  const highPriorityTasksEl = document.getElementById('highPriorityTasks');
  const mediumPriorityTasksEl = document.getElementById('mediumPriorityTasks');
  const lowPriorityTasksEl = document.getElementById('lowPriorityTasks');
  // Tips modal elements
  const tipsBtn = document.getElementById('tipsBtn');
  const tipsModal = document.getElementById('tipsModal');
  const closeTipsModal = document.getElementById('closeTipsModal');
  
  // Chart instances
  let statusChart = null;
  let priorityChart = null;
  
  // Initialize min date for deadline input
  function setMinDeadline() {
    const today = new Date().toISOString().split('T')[0];
    const el = document.getElementById('taskDeadline');
    if (el) el.min = today;
  }
  
  // Initialize theme
  function initTheme() {
    document.body.className = currentTheme;
  }
  
  // Save theme preference
  function saveTheme() {
    localStorage.setItem('theme', currentTheme);
  }
  
  // Set theme
  function setTheme(theme) {
    currentTheme = theme;
    initTheme();
    saveTheme();
    showToast('Tema diubah');
  }
  
  // Toggle settings menu
  function toggleSettingsMenu() {
    settingsMenu.classList.toggle('show');
  }
  
  // Close settings menu if clicked outside
  function closeSettingsMenu(e) {
    if (!settingsBtn.contains(e.target) && !settingsMenu.contains(e.target)) {
      settingsMenu.classList.remove('show');
    }
  }
  
  // Show about modal
  function showAboutModal() {
    aboutModal.classList.add('show');
  }
  
  // Close about modal
  function closeAboutModalFunc() {
    aboutModal.classList.remove('show');
  }
  
  // Show theme modal
  function showThemeModal() {
    themeModal.classList.add('show');
    settingsMenu.classList.remove('show');
  }
  
  // Close theme modal
  function closeThemeModalFunc() {
    themeModal.classList.remove('show');
  }
  
  // Show stats modal
  function showStatsModal() {
    updateStats();
    statsModal.classList.add('show');
    setTimeout(() => {
      createOrUpdateCharts();
    }, 80);
  }
  
  // Close stats modal
  function closeStatsModalFunc() {
    statsModal.classList.remove('show');
  }
  
  // Tips modal controls
  function showTipsModal() {
    tipsModal.classList.add('show');
  }
  
  function closeTipsModalFunc() {
    tipsModal.classList.remove('show');
  }
  
  // Helper to read theme-aware colors from computed styles
  function getThemeColors() {
    const computed = getComputedStyle(document.body);
    const primary = computed.getPropertyValue('--primary').trim() || '#3B82F6';
    const success = computed.getPropertyValue('--success').trim() || '#10b981';
    const warning = computed.getPropertyValue('--warning').trim() || '#f59e0b';
    const danger = computed.getPropertyValue('--danger').trim() || '#ef4444';
    const pHigh = computed.getPropertyValue('--priority-high').trim() || danger;
    const pMed = computed.getPropertyValue('--priority-medium').trim() || warning;
    const pLow = computed.getPropertyValue('--priority-low').trim() || success;
    return { primary, success, warning, danger, pHigh, pMed, pLow };
  }
  
  // Create or update Chart.js charts
  function createOrUpdateCharts() {
    // Gather data
    const totalTasks = tasks.length;
    const completed = tasks.filter(t => t.status === 'done').length;
    const pending = tasks.filter(t => t.status !== 'done').length;
    const overdue = tasks.filter(t => isOverdue(t.deadline) && t.status !== 'done').length;
    const highPriority = tasks.filter(t => t.priority === 'high').length;
    const mediumPriority = tasks.filter(t => t.priority === 'medium').length;
    const lowPriority = tasks.filter(t => t.priority === 'low').length;
    
    // Colors based on active theme
    const colors = getThemeColors();
    
    // Status Chart (Total / Selesai / Belum Selesai / Terlambat)
    const statusCtx = document.getElementById('statusChart').getContext('2d');
    if (statusChart) statusChart.destroy();
    statusChart = new Chart(statusCtx, {
      type: 'bar',
      data: {
        labels: ['Total', 'Selesai', 'Belum Selesai', 'Terlambat'],
        datasets: [{
          label: 'Jumlah',
          data: [totalTasks, completed, pending, overdue],
          backgroundColor: [
            colors.primary,
            colors.success,
            colors.warning,
            colors.danger
          ],
          borderRadius: 8,
          barPercentage: 0.6,
          categoryPercentage: 0.7
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 700,
          easing: 'easeOutQuart'
        },
        plugins: {
          legend: { display: false },
          tooltip: { enabled: true }
        },
        scales: {
          x: {
            ticks: { color: getComputedStyle(document.body).getPropertyValue('--muted').trim() || '#6b7280' },
            grid: { display: false }
          },
          y: {
            beginAtZero: true,
            ticks: { precision:0, color: getComputedStyle(document.body).getPropertyValue('--muted').trim() || '#6b7280' },
            grid: { color: 'rgba(0,0,0,0.04)' }
          }
        }
      }
    });
    
    // Priority Chart (High / Medium / Low)
    const priorityCtx = document.getElementById('priorityChart').getContext('2d');
    if (priorityChart) priorityChart.destroy();
    priorityChart = new Chart(priorityCtx, {
      type: 'bar',
      data: {
        labels: ['Tinggi', 'Sedang', 'Rendah'],
        datasets: [{
          label: 'Jumlah',
          data: [highPriority, mediumPriority, lowPriority],
          backgroundColor: [colors.pHigh, colors.pMed, colors.pLow],
          borderRadius: 8,
          barPercentage: 0.6,
          categoryPercentage: 0.7
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 700,
          easing: 'easeOutQuart'
        },
        plugins: {
          legend: { display: false },
          tooltip: { enabled: true }
        },
        scales: {
          x: {
            ticks: { color: getComputedStyle(document.body).getPropertyValue('--muted').trim() || '#6b7280' },
            grid: { display: false }
          },
          y: {
            beginAtZero: true,
            ticks: { precision:0, color: getComputedStyle(document.body).getPropertyValue('--muted').trim() || '#6b7280' },
            grid: { color: 'rgba(0,0,0,0.04)' }
          }
        }
      }
    });
  }
  
  // Update stats values
  function updateStats() {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.status === 'done').length;
    const pendingTasks = totalTasks - completedTasks;
    const overdueTasks = tasks.filter(task => isOverdue(task.deadline) && task.status !== 'done').length;
    const highPriorityTasks = tasks.filter(task => task.priority === 'high').length;
    const mediumPriorityTasks = tasks.filter(task => task.priority === 'medium').length;
    const lowPriorityTasks = tasks.filter(task => task.priority === 'low').length;
    
    totalTasksEl.textContent = totalTasks;
    completedTasksEl.textContent = completedTasks;
    pendingTasksEl.textContent = pendingTasks;
    overdueTasksEl.textContent = overdueTasks;
    highPriorityTasksEl.textContent = highPriorityTasks;
    mediumPriorityTasksEl.textContent = mediumPriorityTasks;
    lowPriorityTasksEl.textContent = lowPriorityTasks;
    
    // Update charts if they exist (so stats update live when modal open)
    if (statsModal.classList.contains('show')) {
      createOrUpdateCharts();
    }
  }
  
  // Update notification badge (example logic)
  function updateNotifBadge() {
    const overdueCount = tasks.filter(task => isOverdue(task.deadline) && task.status !== 'done').length;
    if (overdueCount > 0) {
        notifBadge.textContent = overdueCount;
        notifBadge.style.display = 'flex';
    } else {
        notifBadge.style.display = 'none';
    }
  }
  
  // Handle settings actions
  function handleSettingsAction(action) {
    switch(action) {
      case 'about':
        showAboutModal();
        settingsMenu.classList.remove('show');
        break;
      case 'theme':
        showThemeModal();
        break;
      case 'reset':
        if (confirm('Apakah Anda yakin ingin mereset semua data?')) {
          localStorage.removeItem(STORAGE_KEYS.TASKS);
          localStorage.removeItem(STORAGE_KEYS.SCHEDULES);
          localStorage.removeItem(STORAGE_KEYS.NOTES);
          tasks = [];
          schedules = [];
          notes = [];
          renderTasks();
          renderSchedules();
          renderNotes();
          updateBadge();
          updateNotifBadge();
          showToast('Data telah direset');
        }
        settingsMenu.classList.remove('show');
        break;
    }
  }
  
  // Toggle task form visibility
  function toggleForm(show) {
    const isVisible = taskForm.style.display !== 'none';
    const shouldShow = typeof show === 'boolean' ? show : !isVisible;
    taskForm.style.display = shouldShow ? 'block' : 'none';
    openFormBtn.setAttribute('aria-expanded', shouldShow);
    taskForm.setAttribute('aria-hidden', !shouldShow);
    if (!shouldShow) {
      taskForm.reset();
    }
  }
  
  // Toggle schedule form visibility
  function toggleScheduleForm(show) {
    const isVisible = scheduleForm.style.display !== 'none';
    const shouldShow = typeof show === 'boolean' ? show : !isVisible;
    scheduleForm.style.display = shouldShow ? 'block' : 'none';
    addScheduleBtn.setAttribute('aria-expanded', shouldShow);
    scheduleForm.setAttribute('aria-hidden', !shouldShow);
    if (!shouldShow) {
      scheduleForm.reset();
    }
  }
  
  // Toggle note form visibility
  function toggleNoteForm(show) {
    const isVisible = noteForm.style.display !== 'none';
    const shouldShow = typeof show === 'boolean' ? show : !isVisible;
    noteForm.style.display = shouldShow ? 'block' : 'none';
    addNoteBtn.setAttribute('aria-expanded', shouldShow);
    noteForm.setAttribute('aria-hidden', !shouldShow);
    if (!shouldShow) {
      noteForm.reset();
    }
  }
  
  // Switch tabs
  function switchTab(tabName) {
    tabButtons.forEach(btn => {
      if (btn.dataset.tab === tabName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    
    document.querySelectorAll('.tab-content').forEach(content => {
      if (content.id === `${tabName}Tab`) {
        content.classList.add('active');
      } else {
        content.classList.remove('active');
      }
    });
    
    currentTab = tabName;
    fab.style.display = 'flex';
  }
  
  // Update badge count (keeps previous behavior)
  function updateBadge() {
    const activeTasks = tasks.filter(task => task.status !== 'done').length;
    const badge = document.querySelector('.badge');
    if (badge && badge.id !== 'notifBadge') {
      badge.textContent = activeTasks;
      badge.style.display = activeTasks > 0 ? 'flex' : 'none';
    }
  }
  
  // Format date to human readable
  function formatDate(dateStr) {
    const date = new Date(dateStr);
    if (isNaN(date)) return dateStr;
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()) {
      return 'Hari Ini';
    }
    
    if (date.getDate() === tomorrow.getDate() &&
        date.getMonth() === tomorrow.getMonth() &&
        date.getFullYear() === tomorrow.getFullYear()) {
      return 'Besok';
    }
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }
  
  // Get relative time text
  function getRelativeTime(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffTime = date - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Terlambat';
    if (diffDays === 0) return 'Hari Ini';
    if (diffDays === 1) return 'Besok';
    return `${diffDays} hari lagi`;
  }
  
  // Format timestamp for notes
  function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  // Check if date is today
  function isToday(dateStr) {
    const date = new Date(dateStr);
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  }
  
  // Check if date is tomorrow
  function isTomorrow(dateStr) {
    const date = new Date(dateStr);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return date.getDate() === tomorrow.getDate() &&
           date.getMonth() === tomorrow.getMonth() &&
           date.getFullYear() === tomorrow.getFullYear();
  }
  
  // Check if date is this week
  function isThisWeek(dateStr) {
    const date = new Date(dateStr);
    const today = new Date();
    const firstDayOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 1));
    firstDayOfWeek.setHours(0,0,0,0);
    const lastDayOfWeek = new Date(firstDayOfWeek);
    lastDayOfWeek.setDate(lastDayOfWeek.getDate() + 6);
    lastDayOfWeek.setHours(23,59,59,999);
    return date >= firstDayOfWeek && date <= lastDayOfWeek;
  }
  
  // Check if task is overdue
  function isOverdue(dateStr) {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  }
  
  // Filter tasks based on current filter
  function filterTasks() {
    return tasks.filter(task => {
      switch(currentFilter) {
        case 'all':
          return true;
        case 'new':
          return task.status === 'new';
        case 'active':
          return task.status !== 'done';
        case 'done':
          return task.status === 'done';
        case 'today': {
          return isToday(task.deadline) && task.status !== 'done';
        }
        case 'tomorrow': {
          return isTomorrow(task.deadline) && task.status !== 'done';
        }
        case 'week': {
          return isThisWeek(task.deadline) && task.status !== 'done';
        }
        case 'overdue':
          return isOverdue(task.deadline) && task.status !== 'done';
        default:
          return true;
      }
    });
  }
  
  // Render tasks with priority indicator (visual) and improved text wrapping
  function renderTasks() {
    const filteredTasks = filterTasks();
    
    // Sort tasks: priority (high > medium > low) then by deadline
    filteredTasks.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      if ((priorityOrder[a.priority] || 2) !== (priorityOrder[b.priority] || 2)) {
        return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
      }
      return new Date(a.deadline) - new Date(b.deadline);
    });
    
    if (filteredTasks.length === 0) {
      taskList.innerHTML = `
        <div class="empty-state">
          <div style="font-size:48px;margin-bottom:16px;">📋</div>
          <h3>Tidak ada tugas</h3>
          <p>Tambahkan tugas baru untuk memulai</p>
        </div>
      `;
      updateBadge();
      updateNotifBadge();
      return;
    }
    
    taskList.innerHTML = filteredTasks.map(task => {
      // Determine status text and color
      let statusText = '';
      let statusColor = '';
      switch (task.status) {
        case 'new':
          statusText = 'Baru';
          statusColor = 'var(--warning)';
          break;
        case 'opened':
          statusText = 'Dibaca';
          statusColor = 'var(--primary)';
          break;
        case 'done':
          statusText = 'Selesai';
          statusColor = 'var(--success)';
          break;
        default:
          statusText = 'Baru';
          statusColor = 'var(--warning)';
      }
      
      // Priority indicator classes and tooltip
      let indicatorClass = 'priority-low-indicator';
      let indicatorTitle = 'Prioritas: Rendah';
      switch (task.priority) {
        case 'high':
          indicatorClass = 'priority-high-indicator';
          indicatorTitle = 'Prioritas: Tinggi';
          break;
        case 'medium':
          indicatorClass = 'priority-medium-indicator';
          indicatorTitle = 'Prioritas: Sedang';
          break;
        case 'low':
        default:
          indicatorClass = 'priority-low-indicator';
          indicatorTitle = 'Prioritas: Rendah';
      }
      
      // Determine deadline class
      let deadlineClass = '';
      if (task.status === 'done') {
        deadlineClass = 'dl-ok';
      } else if (isOverdue(task.deadline)) {
        deadlineClass = 'dl-overdue';
      } else {
        const daysDiff = Math.ceil((new Date(task.deadline) - new Date()) / (1000 * 60 * 60 * 24));
        if (daysDiff < 0) {
          deadlineClass = 'dl-overdue';
        } else if (daysDiff === 0) {
          deadlineClass = 'dl-urgent';
        } else if (daysDiff === 1) {
          deadlineClass = 'dl-soon';
        } else if (daysDiff <= 3) {
          deadlineClass = 'dl-soon';
        } else {
          deadlineClass = 'dl-ok';
        }
      }
      
      // Use title attribute for tooltip when truncated
      const titleAttr = `${task.subject} - ${task.name}`.replace(/"/g, '&quot;');
      
      // Notes handling (long content scroll)
      const notesHtml = task.notes ? `<div class="task-detail"><div class="long-text" title="${(task.notes||'').replace(/"/g,'&quot;')}">📝 ${task.notes}</div></div>` : '';
      
      return `
        <div class="task-card ${deadlineClass} priority-${task.priority}" data-id="${task.id}">
          <div class="task-title">
            <span class="priority-indicator ${indicatorClass}" title="${indicatorTitle}" aria-hidden="true"></span>
            <span class="title-text" title="${titleAttr}">${task.subject} - ${task.name}</span>
          </div>
          <div class="task-detail">
            <span title="${formatDate(task.deadline)}">📅 ${formatDate(task.deadline)}</span>
            <span title="${getRelativeTime(task.deadline)}">⏰ ${getRelativeTime(task.deadline)}</span>
          </div>
          ${notesHtml}
          <div class="status-pill" style="background:${statusColor};color:#fff">${statusText}</div>
          <div class="task-actions">
            <button class="filter-btn" onclick="handleTaskAction('${task.id}', 'toggle')">
              ${task.status === 'done' ? '↩️ Batal' : '✅ Selesai'}
            </button>
            <button class="filter-btn" onclick="handleTaskAction('${task.id}', 'edit')">✏️ Edit</button>
            <button class="filter-btn" onclick="handleTaskAction('${task.id}', 'delete')">🗑️ Hapus</button>
          </div>
        </div>
      `;
    }).join('');
    
    updateBadge();
    updateNotifBadge();
  }
  
  // Render schedules
  function renderSchedules() {
    if (schedules.length === 0) {
      scheduleContainer.innerHTML = `
        <div class="empty-state">
          <div style="font-size:48px;margin-bottom:16px;">📅</div>
          <h3>Belum ada jadwal</h3>
          <p>Tambahkan jadwal pelajaran Anda</p>
        </div>
      `;
      return;
    }
    
    const days = ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];
    const schedulesByDay = {};
    days.forEach(day => {
      schedulesByDay[day] = schedules.filter(schedule => schedule.day === day);
    });
    
    days.forEach(day => {
      schedulesByDay[day].sort((a, b) => a.time.localeCompare(b.time));
    });
    
    scheduleContainer.innerHTML = days.map(day => {
      if (!schedulesByDay[day] || schedulesByDay[day].length === 0) return '';
      const dayNames = { 'senin': 'Senin', 'selasa': 'Selasa', 'rabu': 'Rabu', 'kamis': 'Kamis', 'jumat': 'Jumat', 'sabtu': 'Sabtu' };
      return `
        <div class="schedule-day">
          <div class="schedule-header">${dayNames[day]}</div>
          ${schedulesByDay[day].map(schedule => `
            <div class="schedule-item">
              <div class="schedule-time">${schedule.time}</div>
              <div class="schedule-subject">${schedule.subject}</div>
              <div>
                <button class="filter-btn" onclick="handleScheduleAction('${schedule.id}', 'edit')">✏️</button>
                <button class="filter-btn" onclick="handleScheduleAction('${schedule.id}', 'delete')">🗑️</button>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }).join('');
  }
  
  // Render notes
  function renderNotes() {
    if (notes.length === 0) {
      notesList.innerHTML = `
        <div class="empty-state">
          <div style="font-size:48px;margin-bottom:16px;">📝</div>
          <h3>Belum ada catatan</h3>
          <p>Tambahkan catatan baru untuk memulai</p>
        </div>
      `;
      return;
    }
    
    notes.sort((a, b) => b.updatedAt - a.updatedAt);
    notesList.innerHTML = notes.map(note => `
      <div class="note-card" data-id="${note.id}">
        <div class="note-title">${note.title}</div>
        <div class="note-content">${note.content}</div>
        <div class="note-meta">
          Dibuat: ${formatTimestamp(note.createdAt)}<br>
          Diupdate: ${formatTimestamp(note.updatedAt)}
        </div>
        <div class="note-actions">
          <button class="filter-btn" onclick="handleNoteAction('${note.id}', 'edit')">✏️ Edit</button>
          <button class="filter-btn" onclick="handleNoteAction('${note.id}', 'delete')">🗑️ Hapus</button>
        </div>
      </div>
    `).join('');
  }
  
  // Handle task actions (toggle, edit, delete)
  function handleTaskAction(taskId, action) {
    const taskIndex = tasks.findIndex(t => t.id == taskId);
    if (taskIndex === -1) return;
    
    const task = tasks[taskIndex];
    switch(action) {
      case 'toggle':
        task.status = task.status === 'done' ? 'active' : 'done';
        saveTasks();
        renderTasks();
        showToast(task.status === 'done' ? 'Tugas selesai!' : 'Tugas dibatalkan');
        break;
      case 'edit':
        document.getElementById('taskSubject').value = task.subject;
        document.getElementById('taskName').value = task.name;
        document.getElementById('taskDeadline').value = task.deadline;
        document.getElementById('taskNotes').value = task.notes || '';
        document.getElementById('taskPriority').value = task.priority || 'medium';
        tasks.splice(taskIndex, 1);
        saveTasks();
        updateBadge();
        toggleForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        showToast('Edit tugas');
        break;
      case 'delete':
        if (confirm('Apakah Anda yakin ingin menghapus tugas ini?')) {
          tasks.splice(taskIndex, 1);
          saveTasks();
          renderTasks();
          updateBadge();
          showToast('Tugas dihapus');
        }
        break;
    }
  }
  
  // Handle schedule actions (edit, delete)
  function handleScheduleAction(scheduleId, action) {
    const scheduleIndex = schedules.findIndex(s => s.id == scheduleId);
    if (scheduleIndex === -1) return;
    
    const schedule = schedules[scheduleIndex];
    switch(action) {
      case 'edit':
        document.getElementById('scheduleSubject').value = schedule.subject;
        document.getElementById('scheduleDay').value = schedule.day;
        document.getElementById('scheduleTime').value = schedule.time;
        schedules.splice(scheduleIndex, 1);
        saveSchedules();
        toggleScheduleForm(true);
        document.getElementById('scheduleSubject').scrollIntoView({ behavior: 'smooth' });
        showToast('Edit jadwal');
        break;
      case 'delete':
        if (confirm('Apakah Anda yakin ingin menghapus jadwal ini?')) {
          schedules.splice(scheduleIndex, 1);
          saveSchedules();
          renderSchedules();
          showToast('Jadwal dihapus');
        }
        break;
    }
  }
  
  // Handle note actions (edit, delete)
  function handleNoteAction(noteId, action) {
    const noteIndex = notes.findIndex(n => n.id == noteId);
    if (noteIndex === -1) return;
    
    const note = notes[noteIndex];
    switch(action) {
      case 'edit':
        document.getElementById('noteTitle').value = note.title;
        document.getElementById('noteContent').value = note.content;
        notes.splice(noteIndex, 1);
        saveNotes();
        toggleNoteForm(true);
        document.getElementById('noteTitle').scrollIntoView({ behavior: 'smooth' });
        showToast('Edit catatan');
        break;
      case 'delete':
        if (confirm('Apakah Anda yakin ingin menghapus catatan ini?')) {
          notes.splice(noteIndex, 1);
          saveNotes();
          renderNotes();
          showToast('Catatan dihapus');
        }
        break;
    }
  }
  
  // Load tasks from localStorage
  function loadTasks() {
    try {
      const storedTasks = localStorage.getItem(STORAGE_KEYS.TASKS);
      tasks = storedTasks ? JSON.parse(storedTasks) : [];
    } catch (error) {
      console.error('Error loading tasks:', error);
      tasks = [];
      showToast('Gagal memuat tugas');
    }
    updateBadge();
    updateNotifBadge();
    renderTasks();
  }
  
  // Load schedules from localStorage
  function loadSchedules() {
    try {
      const storedSchedules = localStorage.getItem(STORAGE_KEYS.SCHEDULES);
      schedules = storedSchedules ? JSON.parse(storedSchedules) : [];
    } catch (error) {
      console.error('Error loading schedules:', error);
      schedules = [];
      showToast('Gagal memuat jadwal');
    }
    renderSchedules();
  }
  
  // Load notes from localStorage
  function loadNotes() {
    try {
      const storedNotes = localStorage.getItem(STORAGE_KEYS.NOTES);
      notes = storedNotes ? JSON.parse(storedNotes) : [];
    } catch (error) {
      console.error('Error loading notes:', error);
      notes = [];
      showToast('Gagal memuat catatan');
    }
    renderNotes();
  }
  
  // Save tasks to localStorage
  function saveTasks() {
    try {
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    } catch (error) {
      console.error('Error saving tasks:', error);
      showToast('Gagal menyimpan tugas');
    }
  }
  
  // Save schedules to localStorage
  function saveSchedules() {
    try {
      localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(schedules));
    } catch (error) {
      console.error('Error saving schedules:', error);
      showToast('Gagal menyimpan jadwal');
    }
  }
  
  // Save notes to localStorage
  function saveNotes() {
    try {
      localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(notes));
    } catch (error) {
      console.error('Error saving notes:', error);
      showToast('Gagal menyimpan catatan');
    }
  }
  
  // Show toast notification
  let toastTimeout = null;
  function showToast(message, duration = 3000) {
    if (toastTimeout) {
      clearTimeout(toastTimeout);
    }
    toastEl.textContent = message;
    toastEl.classList.add('show');
    toastTimeout = setTimeout(() => {
      toastEl.classList.remove('show');
    }, duration);
  }
  
  // Generate unique ID
  function generateId() {
    return Date.now() + Math.floor(Math.random() * 1000);
  }
  
  // Initialize event listeners
  function initEventListeners() {
    // Task form submission
    taskForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const subject = document.getElementById('taskSubject').value.trim();
      const name = document.getElementById('taskName').value.trim();
      const deadline = document.getElementById('taskDeadline').value;
      const notesText = document.getElementById('taskNotes').value.trim();
      const priority = document.getElementById('taskPriority').value;
      
      if (!subject || !name || !deadline) {
        showToast('Harap isi semua field yang diperlukan');
        return;
      }
      
      const newTask = {
        id: generateId(),
        subject,
        name,
        deadline,
        notes: notesText,
        priority,
        status: 'new',
        createdAt: Date.now()
      };
      
      tasks.push(newTask);
      saveTasks();
      renderTasks();
      toggleForm(false);
      showToast('Tugas ditambahkan');
    });
    
    // Schedule form submission
    scheduleForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const subject = document.getElementById('scheduleSubject').value.trim();
      const day = document.getElementById('scheduleDay').value;
      const time = document.getElementById('scheduleTime').value;
      
      if (!subject || !day || !time) {
        showToast('Harap isi semua field yang diperlukan');
        return;
      }
      
      const newSchedule = {
        id: generateId(),
        subject,
        day,
        time
      };
      
      schedules.push(newSchedule);
      saveSchedules();
      renderSchedules();
      toggleScheduleForm(false);
      showToast('Jadwal ditambahkan');
    });
    
    // Note form submission
    noteForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const title = document.getElementById('noteTitle').value.trim();
      const content = document.getElementById('noteContent').value.trim();
      
      if (!title || !content) {
        showToast('Harap isi semua field yang diperlukan');
        return;
      }
      
      const now = Date.now();
      const newNote = {
        id: generateId(),
        title,
        content,
        createdAt: now,
        updatedAt: now
      };
      
      notes.push(newNote);
      saveNotes();
      renderNotes();
      toggleNoteForm(false);
      showToast('Catatan ditambahkan');
    });
    
    // Open task form button
    openFormBtn.addEventListener('click', () => toggleForm());
    
    // Add schedule button
    addScheduleBtn.addEventListener('click', () => toggleScheduleForm());
    
    // Add note button
    addNoteBtn.addEventListener('click', () => toggleNoteForm());
    
    // Cancel task form button
    cancelFormBtn.addEventListener('click', () => toggleForm(false));
    
    // Cancel schedule form button
    cancelScheduleFormBtn.addEventListener('click', () => toggleScheduleForm(false));
    
    // Cancel note form button
    cancelNoteFormBtn.addEventListener('click', () => toggleNoteForm(false));
    
    // Clear all tasks button
    clearAllBtn.addEventListener('click', function() {
      if (tasks.length === 0) {
        showToast('Tidak ada tugas untuk dihapus');
        return;
      }
      
      if (confirm('Apakah Anda yakin ingin menghapus semua tugas?')) {
        tasks = [];
        saveTasks();
        renderTasks();
        updateBadge();
        showToast('Semua tugas dihapus');
      }
    });
    
    // Filter buttons
    filterButtons.forEach(button => {
      button.addEventListener('click', function() {
        filterButtons.forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');
        currentFilter = this.dataset.filter;
        renderTasks();
      });
    });
    
    // Tab buttons
    tabButtons.forEach(button => {
      button.addEventListener('click', function() {
        switchTab(this.dataset.tab);
      });
    });
    
    // FAB button
    fab.addEventListener('click', function() {
      if (currentTab === 'tasks') {
        toggleForm(true);
        document.getElementById('taskSubject').scrollIntoView({ behavior: 'smooth' });
      } else if (currentTab === 'schedule') {
        toggleScheduleForm(true);
        document.getElementById('scheduleSubject').scrollIntoView({ behavior: 'smooth' });
      } else if (currentTab === 'notes') {
        toggleNoteForm(true);
        document.getElementById('noteTitle').scrollIntoView({ behavior: 'smooth' });
      }
    });
    
    // Settings button
    settingsBtn.addEventListener('click', toggleSettingsMenu);
    
    // Close settings menu when clicking outside
    document.addEventListener('click', closeSettingsMenu);
    
    // Settings menu items
    settingsItems.forEach(item => {
      item.addEventListener('click', function() {
        const action = this.dataset.action;
        handleSettingsAction(action);
      });
    });
    
    // Close about modal
    closeAboutModal.addEventListener('click', closeAboutModalFunc);
    aboutModal.addEventListener('click', function(e) {
      if (e.target === aboutModal) {
        closeAboutModalFunc();
      }
    });
    
    // Theme selection
    themeOptions.forEach(option => {
      option.addEventListener('click', function() {
        const theme = this.dataset.theme;
        setTheme(theme);
        closeThemeModalFunc();
      });
    });
    
    closeThemeModal.addEventListener('click', closeThemeModalFunc);
    themeModal.addEventListener('click', function(e) {
      if (e.target === themeModal) {
        closeThemeModalFunc();
      }
    });
    
    // Stats button
    statsBtn.addEventListener('click', showStatsModal);
    closeStatsModal.addEventListener('click', closeStatsModalFunc);
    statsModal.addEventListener('click', function(e) {
      if (e.target === statsModal) {
        closeStatsModalFunc();
      }
    });
    
    // Tips button events
    tipsBtn.addEventListener('click', showTipsModal);
    closeTipsModal.addEventListener('click', closeTipsModalFunc);
    tipsModal.addEventListener('click', function(e) {
      if (e.target === tipsModal) {
        closeTipsModalFunc();
      }
    });
    
    // Notif button (optional action)
    notifBtn.addEventListener('click', function() {
        filterButtons.forEach(btn => btn.classList.remove('active'));
        const overdueBtn = document.querySelector('.filter-btn[data-filter="overdue"]');
        if (overdueBtn) overdueBtn.classList.add('active');
        currentFilter = 'overdue';
        renderTasks();
        switchTab('tasks');
        showToast('Menampilkan tugas terlambat');
    });
    
    // Make functions globally accessible
    window.handleTaskAction = handleTaskAction;
    window.handleScheduleAction = handleScheduleAction;
    window.handleNoteAction = handleNoteAction;
    window.switchTab = switchTab;
  }
  
  // Initialize the app
  function init() {
    // Set version in watermark
    const versionMeta = document.querySelector('meta[name="app-version"]');
    if (versionMeta) {
      const versionText = versionMeta.getAttribute('content');
      const watermark = document.querySelector('.watermark');
      if (watermark) {
        watermark.textContent = `by : Rahmat - v${versionText}`;
      }
    }
    
    // Load saved theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      currentTheme = savedTheme;
    }
    
    initTheme();
    setMinDeadline();
    loadTasks();
    loadSchedules();
    loadNotes();
    initEventListeners();
    
    // Set initial tab
    switchTab('tasks');
    showToast('Aplikasi siap digunakan', 2000);
  }
  
  // Start the application when DOM is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();