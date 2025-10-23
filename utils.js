// Utilities (ES module)
export function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function generateId() {
  return Date.now().toString(36) + Math.floor(Math.random() * 10000).toString(36);
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  if (d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()) {
    return 'Hari Ini';
  }
  if (d.getDate() === tomorrow.getDate() && d.getMonth() === tomorrow.getMonth() && d.getFullYear() === tomorrow.getFullYear()) {
    return 'Besok';
  }
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function getRelativeTime(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffTime = d - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (isNaN(diffDays)) return '';
  if (diffDays < 0) return 'Terlambat';
  if (diffDays === 0) return 'Hari Ini';
  if (diffDays === 1) return 'Besok';
  return `${diffDays} hari lagi`;
}

export function isToday(dateStr) {
  const d = new Date(dateStr);
  const today = new Date();
  return d.getDate() === today.getDate() &&
         d.getMonth() === today.getMonth() &&
         d.getFullYear() === today.getFullYear();
}

export function isTomorrow(dateStr) {
  const d = new Date(dateStr);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return d.getDate() === tomorrow.getDate() &&
         d.getMonth() === tomorrow.getMonth() &&
         d.getFullYear() === tomorrow.getFullYear();
}

export function isThisWeek(dateStr) {
  const d = new Date(dateStr);
  const today = new Date();
  // Set Monday as first day
  const day = (today.getDay() + 6) % 7;
  const firstDayOfWeek = new Date(today);
  firstDayOfWeek.setDate(today.getDate() - day);
  firstDayOfWeek.setHours(0,0,0,0);
  const lastDayOfWeek = new Date(firstDayOfWeek);
  lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6);
  lastDayOfWeek.setHours(23,59,59,999);
  return d >= firstDayOfWeek && d <= lastDayOfWeek;
}

export function isOverdue(dateStr) {
  const d = new Date(dateStr);
  const today = new Date();
  today.setHours(0,0,0,0);
  return d < today;
}

export function formatTimestamp(ts) {
  const d = new Date(ts);
  return d.toLocaleString('id-ID', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}