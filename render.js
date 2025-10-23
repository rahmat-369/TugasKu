// Render module (ES module)
import { escapeHtml, formatDate, getRelativeTime, isOverdue, formatTimestamp } from './utils.js';

const taskList = document.getElementById('taskList');
const scheduleContainer = document.getElementById('scheduleContainer');
const notesList = document.getElementById('notesList');

export function renderTasks(tasks, currentFilter = 'all') {
  const filterFn = (task) => {
    switch (currentFilter) {
      case 'all': return true;
      case 'new': return task.status === 'new';
      case 'active': return task.status !== 'done';
      case 'done': return task.status === 'done';
      case 'today': return (task.deadline && new Date(task.deadline).toDateString() === new Date().toDateString()) && task.status !== 'done';
      case 'tomorrow': {
        const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate()+1);
        return (task.deadline && new Date(task.deadline).toDateString() === tomorrow.toDateString()) && task.status !== 'done';
      }
      case 'week': {
        // simple week check
        return task.deadline && (function(){ const d=new Date(task.deadline); const now=new Date(); const first=new Date(now); first.setDate(now.getDate() - ((now.getDay()+6)%7)); first.setHours(0,0,0,0); const last=new Date(first); last.setDate(first.getDate()+6); return d>=first && d<=last; })() && task.status !== 'done';
      }
      case 'overdue':
        return task.deadline && isOverdue(task.deadline) && task.status !== 'done';
      default: return true;
    }
  };

  const filtered = tasks.filter(filterFn);
  // sort by priority then deadline
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  filtered.sort((a,b) => {
    const pa = priorityOrder[a.priority] ?? 2;
    const pb = priorityOrder[b.priority] ?? 2;
    if (pa !== pb) return pa - pb;
    return new Date(a.deadline) - new Date(b.deadline);
  });

  if (filtered.length === 0) {
    taskList.innerHTML = `
      <div class="empty-state">
        <div style="font-size:48px;margin-bottom:16px;">📋</div>
        <h3>Tidak ada tugas</h3>
        <p>Tambahkan tugas baru untuk memulai</p>
      </div>
    `;
    return;
  }

  // Use DocumentFragment for performance
  const frag = document.createDocumentFragment();
  filtered.forEach(task => {
    const card = document.createElement('div');
    card.className = `task-card ${isOverdue(task.deadline) && task.status !== 'done' ? 'dl-overdue' : ''} priority-${task.priority}`;
    card.dataset.id = task.id;

    // Title
    const title = document.createElement('div');
    title.className = 'task-title';
    const indicator = document.createElement('span');
    indicator.className = 'priority-indicator ' + (task.priority === 'high' ? 'priority-high-indicator' : task.priority === 'medium' ? 'priority-medium-indicator' : 'priority-low-indicator');
    indicator.title = task.priority === 'high' ? 'Prioritas: Tinggi' : task.priority === 'medium' ? 'Prioritas: Sedang' : 'Prioritas: Rendah';
    const titleText = document.createElement('span');
    titleText.className = 'title-text';
    titleText.textContent = `${task.subject} - ${task.name}`;
    title.appendChild(indicator);
    title.appendChild(titleText);

    const detail = document.createElement('div');
    detail.className = 'task-detail';
    const dlSpan = document.createElement('span');
    dlSpan.title = formatDate(task.deadline);
    dlSpan.textContent = `📅 ${formatDate(task.deadline)}`;
    const relSpan = document.createElement('span');
    relSpan.title = getRelativeTime(task.deadline);
    relSpan.textContent = `⏰ ${getRelativeTime(task.deadline)}`;
    detail.appendChild(dlSpan);
    detail.appendChild(relSpan);

    const notesDiv = document.createElement('div');
    if (task.notes) {
      notesDiv.className = 'task-detail';
      const longText = document.createElement('div');
      longText.className = 'long-text';
      longText.title = task.notes;
      longText.textContent = `📝 ${task.notes}`;
      notesDiv.appendChild(longText);
    }

    const status = document.createElement('div');
    status.className = 'status-pill';
    const statusText = task.status === 'done' ? 'Selesai' : task.status === 'opened' ? 'Dibaca' : 'Baru';
    const statusColor = task.status === 'done' ? 'var(--success)' : task.status === 'opened' ? 'var(--primary)' : 'var(--warning)';
    status.style.background = statusColor;
    status.textContent = statusText;

    const actions = document.createElement('div');
    actions.className = 'task-actions';
    // Buttons with data-action
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'filter-btn';
    toggleBtn.dataset.action = 'toggle';
    toggleBtn.textContent = task.status === 'done' ? '↩️ Batal' : '✅ Selesai';

    const editBtn = document.createElement('button');
    editBtn.className = 'filter-btn';
    editBtn.dataset.action = 'edit';
    editBtn.textContent = '✏️ Edit';

    const delBtn = document.createElement('button');
    delBtn.className = 'filter-btn';
    delBtn.dataset.action = 'delete';
    delBtn.textContent = '🗑️ Hapus';

    actions.appendChild(toggleBtn);
    actions.appendChild(editBtn);
    actions.appendChild(delBtn);

    card.appendChild(title);
    card.appendChild(detail);
    if (task.notes) card.appendChild(notesDiv);
    card.appendChild(status);
    card.appendChild(actions);

    frag.appendChild(card);
  });

  taskList.innerHTML = '';
  taskList.appendChild(frag);
}

export function renderSchedules(schedules) {
  const days = ['senin','selasa','rabu','kamis','jumat','sabtu'];
  if (!schedules || schedules.length === 0) {
    scheduleContainer.innerHTML = `
      <div class="empty-state">
        <div style="font-size:48px;margin-bottom:16px;">📅</div>
        <h3>Belum ada jadwal</h3>
        <p>Tambahkan jadwal pelajaran Anda</p>
      </div>
    `;
    return;
  }

  const schedulesByDay = {};
  days.forEach(d => schedulesByDay[d] = []);
  schedules.forEach(s => schedulesByDay[s.day]?.push(s));
  const frag = document.createDocumentFragment();

  days.forEach(day => {
    const list = schedulesByDay[day];
    if (!list || list.length === 0) return;
    list.sort((a,b) => a.time.localeCompare(b.time));
    const dayWrap = document.createElement('div');
    dayWrap.className = 'schedule-day';
    const header = document.createElement('div');
    header.className = 'schedule-header';
    const dayNames = { 'senin':'Senin','selasa':'Selasa','rabu':'Rabu','kamis':'Kamis','jumat':'Jumat','sabtu':'Sabtu' };
    header.textContent = dayNames[day] || day;
    dayWrap.appendChild(header);
    list.forEach(schedule => {
      const item = document.createElement('div');
      item.className = 'schedule-item';
      item.dataset.id = schedule.id;
      const time = document.createElement('div'); time.className = 'schedule-time'; time.textContent = schedule.time;
      const subj = document.createElement('div'); subj.className = 'schedule-subject'; subj.textContent = schedule.subject;
      const actions = document.createElement('div');
      const edit = document.createElement('button'); edit.className='filter-btn'; edit.dataset.action='edit'; edit.textContent='✏️';
      const del = document.createElement('button'); del.className='filter-btn'; del.dataset.action='delete'; del.dataset.type='schedule'; del.textContent='🗑️';
      actions.appendChild(edit); actions.appendChild(del);
      item.appendChild(time); item.appendChild(subj); item.appendChild(actions);
      dayWrap.appendChild(item);
    });
    frag.appendChild(dayWrap);
  });

  scheduleContainer.innerHTML = '';
  scheduleContainer.appendChild(frag);
}

export function renderNotes(notes) {
  if (!notes || notes.length === 0) {
    notesList.innerHTML = `
      <div class="empty-state">
        <div style="font-size:48px;margin-bottom:16px;">📝</div>
        <h3>Belum ada catatan</h3>
        <p>Tambahkan catatan baru untuk memulai</p>
      </div>
    `;
    return;
  }

  notes.sort((a,b) => b.updatedAt - a.updatedAt);
  const frag = document.createDocumentFragment();
  notes.forEach(note => {
    const card = document.createElement('div');
    card.className = 'note-card';
    card.dataset.id = note.id;
    const title = document.createElement('div'); title.className='note-title'; title.textContent = note.title;
    const content = document.createElement('div'); content.className='note-content'; content.textContent = note.content;
    const meta = document.createElement('div'); meta.className='note-meta'; meta.innerHTML = `Dibuat: ${formatTimestamp(note.createdAt)}<br>Diupdate: ${formatTimestamp(note.updatedAt)}`;
    const actions = document.createElement('div'); actions.className='note-actions';
    const edit = document.createElement('button'); edit.className='filter-btn'; edit.dataset.action='edit'; edit.textContent='✏️';
    const del = document.createElement('button'); del.className='filter-btn'; del.dataset.action='delete'; del.textContent='🗑️';
    actions.appendChild(edit); actions.appendChild(del);

    card.appendChild(title); card.appendChild(content); card.appendChild(meta); card.appendChild(actions);
    frag.appendChild(card);
  });

  notesList.innerHTML = '';
  notesList.appendChild(frag);
}

/* Event delegation handlers exported to be used by main */
export function attachTaskListDelegation(handler) {
  const el = document.getElementById('taskList');
  if (!el) return;
  el.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const card = btn.closest('.task-card');
    if (!card) return;
    const id = card.dataset.id;
    handler(id, btn.dataset.action);
  });
}

export function attachScheduleDelegation(handler) {
  const el = document.getElementById('scheduleContainer');
  if (!el) return;
  el.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const card = btn.closest('.schedule-item');
    if (!card) return;
    const id = card.dataset.id;
    handler(id, btn.dataset.action);
  });
}

export function attachNotesDelegation(handler) {
  const el = document.getElementById('notesList');
  if (!el) return;
  el.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const card = btn.closest('.note-card');
    if (!card) return;
    const id = card.dataset.id;
    handler(id, btn.dataset.action);
  });
}