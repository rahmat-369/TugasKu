// Centralized Storage Management
class StorageManager {
    static STORAGE_KEYS = {
        TASKS: 'pr_tasks_v3',
        SCHEDULES: 'pr_schedules_v1', 
        NOTES: 'pr_notes_v1',
        SETTINGS: 'pr_settings_v1'
    };

    // Task methods
    static getTasks() {
        return this._get(this.STORAGE_KEYS.TASKS, []);
    }

    static saveTasks(tasks) {
        this._set(this.STORAGE_KEYS.TASKS, tasks);
    }

    static addTask(task) {
        const tasks = this.getTasks();
        tasks.push(task);
        this.saveTasks(tasks);
        return task;
    }

    // Schedule methods  
    static getSchedules() {
        return this._get(this.STORAGE_KEYS.SCHEDULES, []);
    }

    static saveSchedules(schedules) {
        this._set(this.STORAGE_KEYS.SCHEDULES, schedules);
    }

    static addSchedule(schedule) {
        const schedules = this.getSchedules();
        schedules.push(schedule);
        this.saveSchedules(schedules);
        return schedule;
    }

    // Note methods
    static getNotes() {
        return this._get(this.STORAGE_KEYS.NOTES, []);
    }

    static saveNotes(notes) {
        this._set(this.STORAGE_KEYS.NOTES, notes);
    }

    static addNote(note) {
        const notes = this.getNotes();
        notes.push(note);
        this.saveNotes(notes);
        return note;
    }

    // Settings methods
    static getSettings() {
        return this._get(this.STORAGE_KEYS.SETTINGS, {});
    }

    static saveSettings(settings) {
        this._set(this.STORAGE_KEYS.SETTINGS, settings);
    }

    // Generic methods
    static _get(key, defaultValue) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error(`Error reading ${key}:`, error);
            return defaultValue;
        }
    }

    static _set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error(`Error saving ${key}:`, error);
            return false;
        }
    }

    static clearAll() {
        Object.values(this.STORAGE_KEYS).forEach(key => {
            localStorage.removeItem(key);
        });
    }
}