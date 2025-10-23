// Storage helpers (ES module)
const STORAGE_KEYS = {
  TASKS: 'pr_tasks_v3',
  SCHEDULES: 'pr_schedules_v1',
  NOTES: 'pr_notes_v1',
  SETTINGS: 'pr_settings_v1'
};

export function load(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Storage load error', e);
    return [];
  }
}

export function save(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Storage save error', e);
  }
}

export function loadAll() {
  return {
    tasks: load(STORAGE_KEYS.TASKS),
    schedules: load(STORAGE_KEYS.SCHEDULES),
    notes: load(STORAGE_KEYS.NOTES),
    settings: JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS) || '{}')
  };
}

export function saveTasks(tasks) {
  save(STORAGE_KEYS.TASKS, tasks);
}

export function saveSchedules(schedules) {
  save(STORAGE_KEYS.SCHEDULES, schedules);
}

export function saveNotes(notes) {
  save(STORAGE_KEYS.NOTES, notes);
}

export function saveSettings(settings) {
  save(STORAGE_KEYS.SETTINGS, settings);
}