// AI Chatbot Logic for TugasKu
class AIChatbot {
    constructor() {
        this.chatMessages = document.getElementById('chatMessages');
        this.userInput = document.getElementById('userInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.typingIndicator = document.getElementById('typingIndicator');
        this.voiceBtn = document.getElementById('voiceBtn');
        
        this.init();
    }

    init() {
        // Event listeners
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
        
        // Voice recognition (jika browser support)
        if ('webkitSpeechRecognition' in window) {
            this.setupVoiceRecognition();
        } else {
            this.voiceBtn.style.display = 'none';
        }

        // Auto-focus input
        this.userInput.focus();
    }

    setupVoiceRecognition() {
        const recognition = new webkitSpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'id-ID';

        this.voiceBtn.addEventListener('click', () => {
            recognition.start();
            this.voiceBtn.style.background = 'rgba(239, 68, 68, 0.2)';
        });

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            this.userInput.value = transcript;
            this.voiceBtn.style.background = 'rgba(255, 255, 255, 0.1)';
            this.sendMessage();
        };

        recognition.onerror = () => {
            this.voiceBtn.style.background = 'rgba(255, 255, 255, 0.1)';
            this.addMessage('Bot', 'Maaf, ada error dengan voice recognition.');
        };
    }

    async sendMessage() {
        const message = this.userInput.value.trim();
        if (!message) return;

        // Add user message
        this.addMessage('User', message);
        this.userInput.value = '';

        // Show typing indicator
        this.showTyping();

        // Process message after delay (simulate AI thinking)
        setTimeout(() => {
            this.hideTyping();
            this.processMessage(message);
        }, 1000 + Math.random() * 1000);
    }

    addMessage(sender, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender.toLowerCase()}-message`;
        
        const avatar = sender === 'User' ? '👤' : '🤖';
        
        messageDiv.innerHTML = `
            <div class="message-avatar">${avatar}</div>
            <div class="message-content">
                <p>${this.formatMessage(content)}</p>
            </div>
        `;

        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
    }

    formatMessage(content) {
        // Convert line breaks and basic formatting
        return content
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>');
    }

    showTyping() {
        this.typingIndicator.classList.add('show');
        this.scrollToBottom();
    }

    hideTyping() {
        this.typingIndicator.classList.remove('show');
    }

    scrollToBottom() {
        setTimeout(() => {
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }, 100);
    }

    processMessage(message) {
        const lowerMessage = message.toLowerCase();
        
        // Determine intent
        if (this.isTaskIntent(lowerMessage)) {
            this.processTask(message);
        } else if (this.isScheduleIntent(lowerMessage)) {
            this.processSchedule(message);
        } else if (this.isNoteIntent(lowerMessage)) {
            this.processNote(message);
        } else if (this.isHelpIntent(lowerMessage)) {
            this.showHelp();
        } else {
            this.showUnrecognized();
        }
    }

    isTaskIntent(message) {
        const taskKeywords = ['tugas', 'pr', 'pekerjaan rumah', 'deadline', 'halaman', 'hal.'];
        return taskKeywords.some(keyword => message.includes(keyword));
    }

    isScheduleIntent(message) {
        const scheduleKeywords = ['jadwal', 'jam', 'waktu', 'hari', 'kelas', 'pelajaran'];
        return scheduleKeywords.some(keyword => message.includes(keyword));
    }

    isNoteIntent(message) {
        const noteKeywords = ['catat', 'ingat', 'catatan', 'note', 'tulis'];
        return noteKeywords.some(keyword => message.includes(keyword));
    }

    isHelpIntent(message) {
        const helpKeywords = ['bantuan', 'help', 'tolong', 'cara', 'contoh'];
        return helpKeywords.some(keyword => message.includes(keyword));
    }

    processTask(message) {
        const parsedData = this.parseTask(message);
        
        if (parsedData.subject === 'tidak diketahui') {
            this.addMessage('Bot', 
                'Saya mendeteksi ini tentang tugas, tapi tidak bisa mengenali mata pelajarannya. ' +
                'Coba sebutkan lebih jelas, contoh: "PR Matematika halaman 20 untuk besok"'
            );
            return;
        }

        // Save to localStorage
        const tasks = StorageManager.getTasks();
        const newTask = {
            id: Date.now(),
            subject: parsedData.subject,
            name: parsedData.name,
            deadline: parsedData.deadline,
            notes: parsedData.notes,
            priority: parsedData.priority,
            status: 'new',
            createdAt: Date.now()
        };
        
        tasks.push(newTask);
        StorageManager.saveTasks(tasks);

        this.addMessage('Bot', 
            `✅ **Tugas berhasil dicatat!**\n\n` +
            `📚 **Mata Pelajaran:** ${parsedData.subject}\n` +
            `📝 **Tugas:** ${parsedData.name}\n` +
            `📅 **Deadline:** ${this.formatDateDisplay(parsedData.deadline)}\n` +
            `🏷️ **Prioritas:** ${parsedData.priority}\n` +
            (parsedData.notes ? `📋 **Catatan:** ${parsedData.notes}\n` : '') +
            `\nTugas sudah tersimpan di aplikasi utama.`
        );
    }

    parseTask(message) {
        // Extract subject
        const subjects = {
            'matematika': 'Matematika',
            'fisika': 'Fisika', 
            'kimia': 'Kimia',
            'biologi': 'Biologi',
            'bahasa indonesia': 'Bahasa Indonesia',
            'bahasa inggris': 'Bahasa Inggris',
            'sejarah': 'Sejarah',
            'geografi': 'Geografi',
            'ekonomi': 'Ekonomi',
            'sosiologi': 'Sosiologi',
            'seni': 'Seni Budaya',
            'penjas': 'Penjaskes',
            'pkn': 'PKN',
            'agama': 'Pendidikan Agama'
        };

        let subject = 'tidak diketahui';
        for (const [key, value] of Object.entries(subjects)) {
            if (message.toLowerCase().includes(key)) {
                subject = value;
                break;
            }
        }

        // Extract page number
        const pageMatch = message.match(/(halaman|hal\.?|hlm\.?)\s*(\d+)/i);
        const page = pageMatch ? `Halaman ${pageMatch[2]}` : 'Tugas';

        // Extract deadline
        const deadline = this.parseDeadline(message);

        // Extract notes
        const notes = this.extractNotes(message);

        // Determine priority based on keywords
        let priority = 'medium';
        if (message.includes('penting') || message.includes('urgent') || message.includes('segera')) {
            priority = 'high';
        } else if (message.includes('biasa') || message.includes('bebas')) {
            priority = 'low';
        }

        return {
            subject,
            name: `${subject} - ${page}`,
            deadline: deadline.toISOString().split('T')[0],
            notes,
            priority
        };
    }

    parseDeadline(message) {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);

        if (message.includes('besok')) {
            return tomorrow;
        } else if (message.includes('lusa')) {
            const dayAfterTomorrow = new Date(today);
            dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
            return dayAfterTomorrow;
        } else if (message.includes('minggu depan')) {
            return nextWeek;
        } else {
            // Default to tomorrow if no specific date mentioned
            return tomorrow;
        }
    }

    extractNotes(message) {
        const notePatterns = [
            /(bawa|membawa)\s+(.+?)(?=,\s|\.|$)/i,
            /(catatan|note)\s*:\s*(.+?)(?=,\s|\.|$)/i,
            /(wajib|harus)\s+(.+?)(?=,\s|\.|$)/i
        ];

        for (const pattern of notePatterns) {
            const match = message.match(pattern);
            if (match) {
                return match[2] || match[1];
            }
        }

        return '';
    }

    processSchedule(message) {
        const parsedData = this.parseSchedule(message);
        
        if (!parsedData.day || !parsedData.time) {
            this.addMessage('Bot',
                'Saya mendeteksi ini tentang jadwal, tapi perlu informasi hari dan jam. ' +
                'Contoh: "Jadwal Matematika hari Senin jam 08:00"'
            );
            return;
        }

        // Save to localStorage
        const schedules = StorageManager.getSchedules();
        const newSchedule = {
            id: Date.now(),
            subject: parsedData.subject,
            day: parsedData.day,
            time: parsedData.time
        };
        
        schedules.push(newSchedule);
        StorageManager.saveSchedules(schedules);

        this.addMessage('Bot',
            `✅ **Jadwal berhasil dicatat!**\n\n` +
            `📚 **Mata Pelajaran:** ${parsedData.subject}\n` +
            `📅 **Hari:** ${parsedData.day}\n` +
            `⏰ **Waktu:** ${parsedData.time}\n` +
            `\nJadwal sudah tersimpan di aplikasi utama.`
        );
    }

    parseSchedule(message) {
        // Extract day
        const days = {
            'senin': 'senin',
            'selasa': 'selasa', 
            'rabu': 'rabu',
            'kamis': 'kamis',
            'jumat': 'jumat',
            'sabtu': 'sabtu'
        };

        let day = '';
        for (const [key, value] of Object.entries(days)) {
            if (message.toLowerCase().includes(key)) {
                day = value;
                break;
            }
        }

        // Extract time
        const timeMatch = message.match(/(\d{1,2})[:.]?(\d{2})?\s*(pag[i]|siang|sore|malam)?/i);
        let time = '08:00'; // default
        if (timeMatch) {
            let hours = parseInt(timeMatch[1]);
            const minutes = timeMatch[2] ? timeMatch[2] : '00';
            const period = timeMatch[3] ? timeMatch[3].toLowerCase() : '';
            
            // Convert to 24-hour format
            if (period.includes('sore') || period.includes('malam')) {
                if (hours < 12) hours += 12;
            } else if (period.includes('pag') && hours === 12) {
                hours = 0;
            }
            
            time = `${hours.toString().padStart(2, '0')}:${minutes}`;
        }

        // Extract subject (same as task parsing)
        const subjects = {
            'matematika': 'Matematika',
            'fisika': 'Fisika',
            // ... same as previous
        };

        let subject = 'Mata Pelajaran';
        for (const [key, value] of Object.entries(subjects)) {
            if (message.toLowerCase().includes(key)) {
                subject = value;
                break;
            }
        }

        return { day, time, subject };
    }

    processNote(message) {
        const noteContent = this.extractNoteContent(message);
        
        if (!noteContent) {
            this.addMessage('Bot',
                'Saya mendeteksi ini tentang catatan, tapi tidak menemukan kontennya. ' +
                'Contoh: "Catat: besok bawa buku gambar untuk seni"'
            );
            return;
        }

        // Save to localStorage
        const notes = StorageManager.getNotes();
        const newNote = {
            id: Date.now(),
            title: `Catatan - ${new Date().toLocaleDateString('id-ID')}`,
            content: noteContent,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        
        notes.push(newNote);
        StorageManager.saveNotes(notes);

        this.addMessage('Bot',
            `✅ **Catatan berhasil disimpan!**\n\n` +
            `📝 **Isi:** ${noteContent}\n` +
            `\nCatatan sudah tersimpan di aplikasi utama.`
        );
    }

    extractNoteContent(message) {
        // Remove command words and extract the actual content
        const cleaned = message.replace(/(catat|ingat|tulis|note)\s*(:| bahwa)?\s*/i, '');
        return cleaned.trim();
    }

    showHelp() {
        this.addMessage('Bot',
            `🤖 **Cara menggunakan AI Assistant:**\n\n` +
            `**📝 Untuk menambah tugas:**\n` +
            `"PR Matematika halaman 20 deadline besok"\n` +
            `"Tugas Fisika bab 3 untuk lusa, bawa kalkulator"\n\n` +
            
            `**📅 Untuk menambah jadwal:**\n` +
            `"Jadwal Kimia hari Rabu jam 10:00"\n` +
            `"Kelas Bahasa Inggris hari Jumat sore"\n\n` +
            
            `**🗒️ Untuk mencatat:**\n` +
            `"Catat: besok bawa buku gambar"\n` +
            `"Ingat: wawancara dengan guru BK"\n\n` +
            
            `**🎤 Tips:** Gunakan tombol microphone untuk input suara!`
        );
    }

    showUnrecognized() {
        this.addMessage('Bot',
            `🤔 Maaf, saya tidak memahami permintaan Anda.\n\n` +
            `Saya bisa membantu dengan:\n` +
            `• Menambah tugas sekolah\n` +
            `• Mengatur jadwal pelajaran\n` +
            `• Mencatat catatan penting\n\n` +
            `Ketik "bantuan" untuk melihat contoh penggunaan.`
        );
    }

    formatDateDisplay(dateString) {
        const date = new Date(dateString);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        if (date.toDateString() === today.toDateString()) {
            return 'Hari Ini';
        } else if (date.toDateString() === tomorrow.toDateString()) {
            return 'Besok';
        } else {
            return date.toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        }
    }
}

// Initialize chatbot when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AIChatbot();
});