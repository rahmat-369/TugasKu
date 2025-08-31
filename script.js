document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const taskForm = document.getElementById('taskForm');
    const toggleFormBtn = document.getElementById('toggleForm');
    const tasksContainer = document.getElementById('tasksContainer');
    const newTasksBadge = document.getElementById('newTasksBadge');
    const searchBox = document.getElementById('searchBox');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const themeToggle = document.getElementById('themeToggle');
    
    // State
    let currentFilter = 'all';
    let searchQuery = '';
    let tasks = JSON.parse(localStorage.getItem('pr_tasks')) || [];
    let darkMode = localStorage.getItem('darkMode') === 'true';
    
    // Initialize
    if (darkMode) {
        document.body.classList.add('dark-mode');
    }
    updateBadge();
    renderTasks();
    
    // Event Listeners
    toggleFormBtn.addEventListener('click', function() {
        const isFormVisible = taskForm.style.display === 'grid';
        taskForm.style.display = isFormVisible ? 'none' : 'grid';
        toggleFormBtn.innerHTML = isFormVisible ? 
            '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>Tambah Tugas Baru' : 
            '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>Tutup Form';
    });
    
    taskForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const newTask = {
            id: Date.now(),
            subject: document.getElementById('taskSubject').value,
            name: document.getElementById('taskName').value,
            deadline: document.getElementById('taskDeadline').value,
            notes: document.getElementById('taskNotes').value,
            status: 'new', // new, opened, done
            createdAt: new Date().toISOString()
        };
        
        tasks.unshift(newTask);
        saveTasks();
        taskForm.reset();
        taskForm.style.display = 'none';
        toggleFormBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>Tambah Tugas Baru';
        
        updateBadge();
        renderTasks();
    });
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            filterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.dataset.filter;
            renderTasks();
        });
    });
    
    searchBox.addEventListener('input', function() {
        searchQuery = this.value.toLowerCase();
        renderTasks();
    });
    
    themeToggle.addEventListener('click', function() {
        darkMode = !darkMode;
        if (darkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
        localStorage.setItem('darkMode', darkMode);
    });
    
    // Functions
    function saveTasks() {
        localStorage.setItem('pr_tasks', JSON.stringify(tasks));
    }
    
    function updateBadge() {
        const newTasksCount = tasks.filter(task => task.status === 'new').length;
        newTasksBadge.textContent = newTasksCount;
        newTasksBadge.style.display = newTasksCount > 0 ? 'flex' : 'none';
    }
    
    function renderTasks() {
        // Clear container
        tasksContainer.innerHTML = '';
        
        // Filter tasks based on current filter and search query
        let filteredTasks = tasks.filter(task => {
            const matchesSearch = searchQuery === '' || 
                                task.name.toLowerCase().includes(searchQuery) || 
                                task.subject.toLowerCase().includes(searchQuery);
            
            if (currentFilter === 'all') return matchesSearch;
            if (currentFilter === 'new') return task.status === 'new' && matchesSearch;
            if (currentFilter === 'active') return task.status !== 'done' && matchesSearch;
            if (currentFilter === 'done') return task.status === 'done' && matchesSearch;
            return matchesSearch;
        });
        
        // Group tasks by subject
        const tasksBySubject = {};
        filteredTasks.forEach(task => {
            if (!tasksBySubject[task.subject]) {
                tasksBySubject[task.subject] = [];
            }
            tasksBySubject[task.subject].push(task);
        });
        
        // Display message if no tasks
        if (filteredTasks.length === 0) {
            tasksContainer.innerHTML = `
                <div class="empty-state">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p>Tidak ada tugas yang ditemukan</p>
                </div>
            `;
            return;
        }
        
        // Render tasks grouped by subject
        for (const subject in tasksBySubject) {
            const subjectTasks = tasksBySubject[subject];
            
            const subjectHeader = document.createElement('div');
            subjectHeader.className = 'subject-header';
            subjectHeader.innerHTML = `
                <span>${subject}</span>
                <span class="subject-badge">${subjectTasks.length}</span>
            `;
            tasksContainer.appendChild(subjectHeader);
            
            subjectTasks.forEach(task => {
                const taskCard = document.createElement('div');
                taskCard.className = `task-card ${task.status === 'new' ? 'new' : ''} ${task.status === 'done' ? 'done' : ''}`;
                
                const statusText = task.status === 'new' ? 'Baru' : 
                                  task.status === 'opened' ? 'Dibaca' : 'Selesai';
                const statusClass = task.status === 'new' ? 'status-new' : 
                                   task.status === 'opened' ? 'status-opened' : 'status-done';
                
                // Format deadline
                const deadlineDate = new Date(task.deadline);
                const formattedDeadline = deadlineDate.toLocaleDateString('id-ID', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                
                taskCard.innerHTML = `
                    <div class="task-status ${statusClass}">${statusText}</div>
                    <h3 class="task-title">${task.subject}</h3>
                    <div class="task-details">
                        <div class="task-detail">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span>${task.name}</span>
                        </div>
                        <div class="task-detail">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 01118 0z" />
                            </svg>
                            <span>Deadline: ${formattedDeadline}</span>
                        </div>
                        ${task.notes ? `
                        <div class="task-detail">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span>${task.notes}</span>
                        </div>
                        ` : ''}
                    </div>
                    <div class="task-actions">
                        ${task.status !== 'done' ? `
                        <button class="btn-icon btn-done" data-id="${task.id}" data-action="complete">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                            </svg>
                        </button>
                        ` : ''}
                        <button class="btn-icon btn-edit" data-id="${task.id}" data-action="edit">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </button>
                        <button class="btn-icon btn-delete" data-id="${task.id}" data-action="delete">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
                `;
                
                tasksContainer.appendChild(taskCard);
            });
        }
        
        // Add event listeners to action buttons
        document.querySelectorAll('.btn-icon').forEach(btn => {
            btn.addEventListener('click', function() {
                const taskId = parseInt(this.dataset.id);
                const action = this.dataset.action;
                
                handleTaskAction(taskId, action);
            });
        });
        
        // Add click event to mark as opened
        document.querySelectorAll('.task-card').forEach(card => {
            card.addEventListener('click', function(e) {
                if (!e.target.closest('.task-actions')) {
                    const taskId = parseInt(this.querySelector('.btn-icon').dataset.id);
                    const task = tasks.find(t => t.id === taskId);
                    
                    if (task && task.status === 'new') {
                        task.status = 'opened';
                        saveTasks();
                        updateBadge();
                        renderTasks();
                    }
                }
            });
        });
    }
    
    function handleTaskAction(taskId, action) {
        const taskIndex = tasks.findIndex(t => t.id === taskId);
        
        if (taskIndex === -1) return;
        
        switch (action) {
            case 'complete':
                tasks[taskIndex].status = 'done';
                break;
            case 'edit':
                // For simplicity, we'll just delete and re-add
                const task = tasks[taskIndex];
                document.getElementById('taskSubject').value = task.subject;
                document.getElementById('taskName').value = task.name;
                document.getElementById('taskDeadline').value = task.deadline;
                document.getElementById('taskNotes').value = task.notes || '';
                
                tasks.splice(taskIndex, 1);
                taskForm.style.display = 'grid';
                window.scrollTo(0, 0);
                break;
            case 'delete':
                if (confirm('Apakah Anda yakin ingin menghapus tugas ini?')) {
                    tasks.splice(taskIndex, 1);
                }
                break;
        }
        
        saveTasks();
        updateBadge();
        renderTasks();
    }
});