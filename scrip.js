// ===== SHARED STORAGE MANAGER =====
const StorageManager = {
  STORAGE_KEYS: {
    TASKS: 'pr_tasks_v3',
    SCHEDULES: 'pr_schedules_v1',
    NOTES: 'pr_notes_v1',
    SETTINGS: 'pr_settings_v1'
  },

  get(key, defaultValue = []) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`Error reading ${key}:`, error);
      return defaultValue;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Error saving ${key}:`, error);
      if (error.name === 'QuotaExceededError') {
        showToast('Gagal menyimpan: penyimpanan penuh. Hapus tugas lama.');
      }
      return false;
    }
  },

  clearAll() {
    Object.values(this.STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }
};

// ===== SHARED UI HELPERS =====
let toastTimeout = null;
function showToast(message, duration = 3000) {
  if (toastTimeout) {
    clearTimeout(toastTimeout);
  }
  const toastEl = document.getElementById('toast');
  if (!toastEl) {
    console.error('Toast element not found!');
    return;
  }
  toastEl.textContent = message;
  toastEl.classList.add('show');
  toastTimeout = setTimeout(() => {
    toastEl.classList.remove('show');
  }, duration);
}

function generateId() {
  return Date.now() + Math.floor(Math.random() * 1000);
}

// ===== PARSING LOGIC =====
const Parser = {
  DEV_MODE: false, // Set false for release

  detectIntent(lc) {
    if (lc.match(/\b(tugas|pr|pekerjaan rumah|deadline)\b/)) return 'task';
    if (lc.match(/\b(jadwal|jam|pelajaran)\b/) && lc.match(/\b(senin|selasa|rabu|kamis|jumat|sabtu|minggu)\b/)) return 'schedule';
    if (lc.match(/\b(catat|ingat|note|catatan)\b/)) return 'note';
    return 'unknown';
  },

  normalizeDate(word) {
    const today = new Date();
    const dayMap = { senin: 1, selasa: 2, rabu: 3, kamis: 4, jumat: 5, sabtu: 6, minggu: 0 };
    word = word.toLowerCase();

    if (word === 'hari ini' || word === 'today') {
      return today.toISOString().split('T')[0];
    }
    if (word === 'besok' || word === 'tomorrow') {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    }
    if (dayMap[word]) {
      const dayNum = dayMap[word];
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + ((dayNum - today.getDay() + 7) % 7 || 7));
      return targetDate.toISOString().split('T')[0];
    }
    // Explicit date regex: dd-mm-yyyy or dd/mm/yyyy or yyyy-mm-dd
    const dateMatch = word.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-](?:\d{2}|\d{4}))|(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      let dateStr = dateMatch[0];
      // Convert dd-mm-yyyy or dd/mm/yyyy to yyyy-mm-dd
      if (dateStr.includes('/')) dateStr = dateStr.replace(/\//g, '-');
      if (dateStr.match(/^\d{1,2}-\d{1,2}-\d{4}$/)) {
        const parts = dateStr.split('-');
        dateStr = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
      return dateStr;
    }
    return null;
  },

  splitItems(text) {
    return text.split(/dan|,/).map(item => item.trim()).filter(item => item.length > 0);
  },

  confidenceForField(match) {
    const highConfidenceKeywords = ['matematika', 'fisika', 'kimia', 'biologi', 'b. indonesia', 'b. inggris', 'sejarah', 'geografi', 'ekonomi', 'sosiologi', 'pai', 'pjok', 'seni', 'tik', 'pkn'];
    if (match && highConfidenceKeywords.some(kw => match.toLowerCase().includes(kw))) return 'HIGH';
    return match ? 'MED' : 'LOW';
  },

  parseTask(message) {
    const raw = message.trim();
    const lc = raw.toLowerCase();
    const task = {
      type: 'task',
      title: '',
      subject: '',
      name: '',
      page: null,
      deadline: '',
      notes: '',
      warning: '',
      priority: 'medium',
      status: 'new',
      createdAt: Date.now()
    };

    // Extract subject
    const subjectRegex = /\b(tugas|pr|pekerjaan rumah)\s+untuk?\s*(\w+)/i;
    const subjectMatch = lc.match(subjectRegex);
    if (subjectMatch) {
      task.subject = subjectMatch[2];
      task.priority = this.confidenceForField(task.subject) === 'HIGH' ? 'high' : 'medium';
    }

    // Extract page number
    const pageRegex = /\b(halaman|page|pg)\s*(\d{1,3})\b/i;
    const pageMatch = lc.match(pageRegex);
    if (pageMatch) {
      task.page = parseInt(pageMatch[2], 10);
      task.name = `Halaman ${task.page}`;
    }

    // Extract deadline
    const deadlineRegex = /\b(besok|hari ini|senin|selasa|rabu|kamis|jumat|sabtu|minggu|\d{1,2}[\/\-]\d{1,2}[\/\-](?:\d{2}|\d{4})|\d{4}-\d{2}-\d{2})\b/;
    const deadlineMatch = lc.match(deadlineRegex);
    if (deadlineMatch) {
        task.deadline = this.normalizeDate(deadlineMatch[1]) || '';
    } else {
        // Default to tomorrow if no explicit deadline and contains deadline-related words
        if (lc.includes('deadline')) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            task.deadline = tomorrow.toISOString().split('T')[0];
        }
    }

    // Extract items to bring
    const itemsRegex = /\b(bawa|membawa|jangan lupa bawa|bawalah)\s+([^.,;]+)/i;
    const itemsMatch = lc.match(itemsRegex);
    if (itemsMatch) {
      task.notes = this.splitItems(itemsMatch[2]).join(', ');
    }

    // Extract warning/hukuman
    const warningRegex = /\b(lari lapangan|push up|sit up|jangan lupa|peringatan|dihukum|ditegur)\b/i;
    const warningMatch = lc.match(warningRegex);
    if (warningMatch) {
      task.warning = warningMatch[0];
    }

    // Construct title
    if (task.subject && task.name) {
      task.title = `${task.name} - ${task.subject}`;
    } else if (task.subject) {
      task.title = `Tugas ${task.subject}`;
    } else {
      task.title = raw.substring(0, 30) + (raw.length > 30 ? '...' : '');
    }

    return task;
  },

  parseSchedule(message) {
    const raw = message.trim();
    const lc = raw.toLowerCase();
    const schedule = {
      type: 'schedule',
      subject: '',
      day: '',
      startTime: '',
      endTime: '',
      teacher: '',
      notes: '',
      createdAt: Date.now()
    };

    // Extract subject
    const subjectRegex = /\b(jadwal|pelajaran)\s+(\w+)/i;
    const subjectMatch = lc.match(subjectRegex);
    if (subjectMatch) {
      schedule.subject = subjectMatch[2];
    }

    // Extract day
    const dayRegex = /\b(senin|selasa|rabu|kamis|jumat|sabtu|minggu)\b/i;
    const dayMatch = lc.match(dayRegex);
    if (dayMatch) {
      schedule.day = dayMatch[0].toLowerCase();
    }

    // Extract time (simple HH:MM-HH:MM or HH:MM)
    const timeRegex = /(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})|(\d{1,2}:\d{2})/i;
    const timeMatch = lc.match(timeRegex);
    if (timeMatch) {
      if (timeMatch[1] && timeMatch[2]) { // HH:MM-HH:MM
        schedule.startTime = timeMatch[1];
        schedule.endTime = timeMatch[2];
      } else if (timeMatch[3]) { // HH:MM (assume start time)
        schedule.startTime = timeMatch[3];
      }
    }

    // Extract teacher
    const teacherRegex = /\b(guru|pak|bu)\s+([a-z\s]+)/i;
    const teacherMatch = lc.match(teacherRegex);
    if (teacherMatch) {
      schedule.teacher = teacherMatch[2].trim();
    }

    // Extract notes
    if (lc.includes('bawa')) {
      const noteIndex = lc.indexOf('bawa');
      schedule.notes = raw.substring(noteIndex).trim();
    }

    return schedule;
  },

  parseNote(message) {
    const raw = message.trim();
    const note = {
      type: 'note',
      title: '',
      content: '',
      createdAt: Date.now()
    };

    const cleanMessage = raw.replace(/^(catat|ingat|note|catatan)\s*:\s*/i, '').trim();
    const words = cleanMessage.split(' ');

    if (words.length > 3) {
      note.title = words.slice(0, 3).join(' ');
      note.content = words.slice(3).join(' ');
    } else {
      note.title = cleanMessage || 'Catatan Baru';
      note.content = 'Isi catatan...';
    }

    return note;
  },

  generateResponse(result, originalMessage) {
    if (result.type === 'unknown') {
      return result.message;
    }
    const responses = {
      task: `✅ Tugas "${result.title}" telah ditambahkan.`,
      schedule: `📅 Jadwal "${result.subject}" pada hari ${result.day} jam ${result.startTime} telah ditambahkan.`,
      note: `📝 Catatan "${result.title}" telah disimpan.`
    };
    return responses[result.type] || 'Permintaan Anda telah diproses.';
  }
};

// ===== PREVIEW MODAL LOGIC =====
function openPreviewModal(parsedItem, originalMessage, onConfirm) {
  const modal = document.getElementById('previewModal');
  const content = document.getElementById('previewModalContent');
  if (!modal || !content) {
    console.error('Preview modal elements not found!');
    return;
  }

  // Render form based on type
  let formHTML = `<h3>Pratinjau & Edit</h3>`;
  if (parsedItem.type === 'task') {
    formHTML += `
      <div class="input-group">
        <label>Judul</label>
        <input type="text" id="previewTitle" value="${parsedItem.title}">
      </div>
      <div class="input-group">
        <label>Nama Tugas</label>
        <input type="text" id="previewName" value="${parsedItem.name}">
      </div>
      <div class="input-group">
        <label>Mata Pelajaran</label>
        <input type="text" id="previewSubject" value="${parsedItem.subject}">
      </div>
      <div class="input-group">
        <label>Halaman (opsional)</label>
        <input type="number" id="previewPage" value="${parsedItem.page || ''}">
      </div>
      <div class="input-group">
        <label>Deadline (YYYY-MM-DD)</label>
        <input type="date" id="previewDeadline" value="${parsedItem.deadline}">
      </div>
      <div class="input-group">
        <label>Catatan / Barang Bawaan</label>
        <textarea id="previewNotes">${parsedItem.notes}</textarea>
      </div>
      <div class="input-group">
        <label>Peringatan / Hukuman</label>
        <input type="text" id="previewWarning" value="${parsedItem.warning}">
      </div>
      <div class="input-group">
        <label>Prioritas</label>
        <select id="previewPriority">
          <option value="low" ${parsedItem.priority === 'low' ? 'selected' : ''}>Rendah</option>
          <option value="medium" ${parsedItem.priority === 'medium' ? 'selected' : ''}>Sedang</option>
          <option value="high" ${parsedItem.priority === 'high' ? 'selected' : ''}>Tinggi</option>
        </select>
      </div>
    `;
  } else if (parsedItem.type === 'schedule') {
    formHTML += `
      <div class="input-group">
        <label>Mata Pelajaran</label>
        <input type="text" id="previewSubject" value="${parsedItem.subject}">
      </div>
      <div class="input-group">
        <label>Hari</label>
        <select id="previewDay">
          <option value="senin" ${parsedItem.day === 'senin' ? 'selected' : ''}>Senin</option>
          <option value="selasa" ${parsedItem.day === 'selasa' ? 'selected' : ''}>Selasa</option>
          <option value="rabu" ${parsedItem.day === 'rabu' ? 'selected' : ''}>Rabu</option>
          <option value="kamis" ${parsedItem.day === 'kamis' ? 'selected' : ''}>Kamis</option>
          <option value="jumat" ${parsedItem.day === 'jumat' ? 'selected' : ''}>Jumat</option>
          <option value="sabtu" ${parsedItem.day === 'sabtu' ? 'selected' : ''}>Sabtu</option>
          <option value="minggu" ${parsedItem.day === 'minggu' ? 'selected' : ''}>Minggu</option>
        </select>
      </div>
      <div class="input-group">
        <label>Jam Mulai</label>
        <input type="time" id="previewStartTime" value="${parsedItem.startTime}">
      </div>
      <div class="input-group">
        <label>Jam Selesai (opsional)</label>
        <input type="time" id="previewEndTime" value="${parsedItem.endTime}">
      </div>
      <div class="input-group">
        <label>Nama Guru</label>
        <input type="text" id="previewTeacher" value="${parsedItem.teacher}">
      </div>
      <div class="input-group">
        <label>Catatan</label>
        <textarea id="previewNotes">${parsedItem.notes}</textarea>
      </div>
    `;
  } else if (parsedItem.type === 'note') {
    formHTML += `
      <div class="input-group">
        <label>Judul</label>
        <input type="text" id="previewTitle" value="${parsedItem.title}">
      </div>
      <div class="input-group">
        <label>Isi Catatan</label>
        <textarea id="previewContent" rows="4">${parsedItem.content}</textarea>
      </div>
    `;
  }

  formHTML += `
    <div style="display: flex; gap: 8px; margin-top: 16px;">
        <button class="btn btn-success" id="confirmSaveBtn">Simpan</button>
        <button class="btn btn-outline" id="saveAsNoteBtn" style="display:none;">Simpan sebagai Catatan</button>
        <button class="btn btn-outline" id="cancelBtn">Batal</button>
    </div>
  `;

  content.innerHTML = formHTML;
  modal.classList.add('show');

  document.getElementById('confirmSaveBtn').addEventListener('click', () => {
    // Collect updated values
    const updatedItem = { ...parsedItem };
    updatedItem.title = document.getElementById('previewTitle')?.value || updatedItem.title;
    updatedItem.name = document.getElementById('previewName')?.value || updatedItem.name;
    updatedItem.subject = document.getElementById('previewSubject')?.value || updatedItem.subject;
    updatedItem.page = document.getElementById('previewPage')?.value ? parseInt(document.getElementById('previewPage').value, 10) : updatedItem.page;
    updatedItem.deadline = document.getElementById('previewDeadline')?.value || updatedItem.deadline;
    updatedItem.notes = document.getElementById('previewNotes')?.value || updatedItem.notes;
    updatedItem.warning = document.getElementById('previewWarning')?.value || updatedItem.warning;
    updatedItem.priority = document.getElementById('previewPriority')?.value || updatedItem.priority;
    updatedItem.day = document.getElementById('previewDay')?.value || updatedItem.day;
    updatedItem.startTime = document.getElementById('previewStartTime')?.value || updatedItem.startTime;
    updatedItem.endTime = document.getElementById('previewEndTime')?.value || updatedItem.endTime;
    updatedItem.teacher = document.getElementById('previewTeacher')?.value || updatedItem.teacher;
    updatedItem.content = document.getElementById('previewContent')?.value || updatedItem.content;

    closeModal(modal);
    onConfirm(updatedItem);
  });

  document.getElementById('cancelBtn').addEventListener('click', () => {
    closeModal(modal);
  });

  // Show "Save as Note" button only for task/schedule
  if (parsedItem.type === 'task' || parsedItem.type === 'schedule') {
      document.getElementById('saveAsNoteBtn').style.display = 'inline-block';
      document.getElementById('saveAsNoteBtn').addEventListener('click', () => {
          const noteItem = {
              type: 'note',
              title: parsedItem.title,
              content: `Dari parsing: ${originalMessage}`,
              createdAt: Date.now()
          };
          closeModal(modal);
          onConfirm(noteItem); // Save as note instead
      });
  }
}

function closeModal(modalElement) {
  if (modalElement) {
    modalElement.classList.remove('show');
  }
}

// ===== CHAT UI LOGIC (for ai.html) =====
let chatMessagesEl, messageInputEl, typingIndicatorEl;

function initChatElements() {
  chatMessagesEl = document.getElementById('chatMessages');
  messageInputEl = document.getElementById('messageInput');
  typingIndicatorEl = document.getElementById('typingIndicator');
  if (!chatMessagesEl) return false; // Only run on ai.html
  return true;
}

function displayChatUserMessage(message) {
  if (!chatMessagesEl) return;
  const messageElement = document.createElement('div');
  messageElement.classList.add('message', 'user');
  messageElement.textContent = message;
  chatMessagesEl.appendChild(messageElement);
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}

function displayChatAiMessage(message) {
  if (!chatMessagesEl) return;
  const messageElement = document.createElement('div');
  messageElement.classList.add('message', 'ai');
  messageElement.textContent = message;
  chatMessagesEl.appendChild(messageElement);
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}

function displayTypingIndicator() {
  if (!chatMessagesEl || !typingIndicatorEl) return;
  chatMessagesEl.appendChild(typingIndicatorEl);
  typingIndicatorEl.style.display = 'block';
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}

function hideTypingIndicator() {
  if (typingIndicatorEl) {
    typingIndicatorEl.style.display = 'none';
  }
}

function processAIMessage(rawMessage) {
  if (!initChatElements()) return; // Only run if on AI page

  if (rawMessage.length > 2000) {
    showToast("Pesan terlalu panjang. Harap singkatkan.");
    return;
  }

  displayChatUserMessage(rawMessage);
  displayChatAiMessage("Sedang memproses..."); // Temporary message
  displayTypingIndicator();

  // Simulate processing delay
  setTimeout(() => {
    hideTypingIndicator();

    const lc = rawMessage.toLowerCase();
    let intent = Parser.detectIntent(lc);
    let parsedItem;

    if (intent === 'task') parsedItem = Parser.parseTask(rawMessage);
    else if (intent === 'schedule') parsedItem = Parser.parseSchedule(rawMessage);
    else if (intent === 'note') parsedItem = Parser.parseNote(rawMessage);
    else {
      displayChatAiMessage("Maaf, saya tidak mengerti permintaan Anda. Coba gunakan format yang lebih jelas.");
      return;
    }

    // Show summary before modal
    let summary = `✅ Saya menemukan: `;
    if (parsedItem.type === 'task') {
      summary += `${parsedItem.subject || 'Tugas'} — ${parsedItem.name || 'Tugas Umum'} — Deadline: ${parsedItem.deadline || 'N/A'} — Bawa: ${parsedItem.notes || 'N/A'} — Peringatan: ${parsedItem.warning || 'N/A'}`;
    } else if (parsedItem.type === 'schedule') {
      summary += `${parsedItem.subject || 'Jadwal'} — Hari: ${parsedItem.day || 'N/A'} — Jam: ${parsedItem.startTime || 'N/A'}`;
    } else if (parsedItem.type === 'note') {
      summary += `"${parsedItem.title}"`;
    }
    summary += `. [Tinjau & Simpan]`;
    displayChatAiMessage(summary);

    openPreviewModal(parsedItem, rawMessage, (itemToSave) => {
      let saveSuccess = false;
      if (itemToSave.type === 'task') {
        const tasks = StorageManager.get(StorageManager.STORAGE_KEYS.TASKS);
        tasks.push(itemToSave);
        saveSuccess = StorageManager.set(StorageManager.STORAGE_KEYS.TASKS, tasks);
      } else if (itemToSave.type === 'schedule') {
        const schedules = StorageManager.get(StorageManager.STORAGE_KEYS.SCHEDULES);
        schedules.push(itemToSave);
        saveSuccess = StorageManager.set(StorageManager.STORAGE_KEYS.SCHEDULES, schedules);
      } else if (itemToSave.type === 'note') {
        const notes = StorageManager.get(StorageManager.STORAGE_KEYS.NOTES);
        notes.push(itemToSave);
        saveSuccess = StorageManager.set(StorageManager.STORAGE_KEYS.NOTES, notes);
      }

      if (saveSuccess) {
        showToast('Sukses disimpan');
        displayChatAiMessage(Parser.generateResponse(itemToSave, rawMessage));
        // Trigger UI updates if on main page
        if (window.updateTasks) updateTasks();
        if (window.updateSchedules) updateSchedules();
        if (window.updateNotes) updateNotes();
      } else {
        showToast('Gagal menyimpan data.');
      }
    });
  }, 800); // Simulate processing time
}

// ===== MAIN PAGE LOGIC (index.html specific, wrapped in function) =====
// This part is moved to the end of the script to ensure all functions are defined first.
// The original logic from index.html is assumed to be placed here if needed,
// but since the request is to create new code based on update.txt, the focus is on the AI/chat logic and parsing.
// The existing index.html logic for task/schedule/note management remains largely the same, just using the shared StorageManager.

// Example of how the shared save functions might look if needed in index context:
function saveTasks() {
  StorageManager.set(StorageManager.STORAGE_KEYS.TASKS, window.tasks || []);
}
function saveSchedules() {
  StorageManager.set(StorageManager.STORAGE_KEYS.SCHEDULES, window.schedules || []);
}
function saveNotes() {
  StorageManager.set(StorageManager.STORAGE_KEYS.NOTES, window.notes || []);
}
// The rest of the index-specific UI rendering and state management functions would go here if they were re-implemented from scratch,
// but they are typically part of the original index.html's script block.