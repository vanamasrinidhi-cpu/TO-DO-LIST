/**
 * ApexTask - Utility Module
 */
window.ApexUtils = (function () {
  // Generate a unique ID
  function generateId() {
    return 'task_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
  }

  // Escape HTML to prevent XSS
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Normalize and validate URL
  function normalizeUrl(url) {
    if (!url || typeof url !== 'string') return null;
    let trimmed = url.trim();
    if (!trimmed) return null;
    if (!/^https?:\/\//i.test(trimmed)) {
      trimmed = 'https://' + trimmed;
    }
    try {
      const parsed = new URL(trimmed);
      return parsed.href;
    } catch (e) {
      return null;
    }
  }

  // Extract domain hostname from URL
  function extractDomain(url) {
    try {
      const parsed = new URL(url);
      return parsed.hostname.replace(/^www\./i, '');
    } catch (e) {
      return 'Web App';
    }
  }

  // Format date into human readable string
  function formatDate(isoString) {
    if (!isoString) return 'No date';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return 'Invalid date';

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date);
  }

  // Format date for datetime-local input
  function toDatetimeLocal(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';
    
    const pad = (n) => String(n).padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  /**
   * Check due date status:
   * - isOverdue: true if due date < now
   * - isNear: true if due within 24 hours (86,400,000 ms) and not overdue
   * - humanRemaining: text like "Due in 3h 15m" or "Overdue by 2h"
   */
  function evaluateDueStatus(dueDateIso, isCompleted) {
    if (!dueDateIso || isCompleted) {
      return { isOverdue: false, isNear: false, label: '', humanRemaining: '' };
    }

    const now = Date.now();
    const due = new Date(dueDateIso).getTime();
    if (isNaN(due)) {
      return { isOverdue: false, isNear: false, label: '', humanRemaining: '' };
    }

    const diffMs = due - now;
    const isOverdue = diffMs < 0;
    const isNear = diffMs > 0 && diffMs <= 24 * 60 * 60 * 1000; // 24 hours threshold

    const absDiff = Math.abs(diffMs);
    const hours = Math.floor(absDiff / (1000 * 60 * 60));
    const minutes = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));
    const days = Math.floor(hours / 24);

    let humanRemaining = '';
    if (isOverdue) {
      if (days > 0) humanRemaining = `Overdue by ${days}d ${hours % 24}h`;
      else if (hours > 0) humanRemaining = `Overdue by ${hours}h ${minutes}m`;
      else humanRemaining = `Overdue by ${Math.max(1, minutes)}m`;
    } else if (isNear) {
      if (hours > 0) humanRemaining = `Expiring in ${hours}h ${minutes}m`;
      else humanRemaining = `Expiring in ${Math.max(1, minutes)}m`;
    } else {
      if (days > 0) humanRemaining = `Due in ${days}d ${hours % 24}h`;
      else humanRemaining = `Due in ${hours}h`;
    }

    return {
      isOverdue,
      isNear,
      label: isOverdue ? 'Overdue' : (isNear ? 'Expiring Soon' : 'Upcoming'),
      humanRemaining
    };
  }

  return {
    generateId,
    escapeHtml,
    normalizeUrl,
    extractDomain,
    formatDate,
    toDatetimeLocal,
    evaluateDueStatus
  };
})();
