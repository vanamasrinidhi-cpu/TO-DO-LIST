/**
 * ApexTask - Main Application Controller
 */
(function () {
  const { loadTasks, saveTasks, getStoredTheme, saveStoredTheme } = window.ApexStorage;
  const { generateId, escapeHtml, normalizeUrl, extractDomain, formatDate, toDatetimeLocal, evaluateDueStatus } = window.ApexUtils;
  const { show: showToast } = window.ApexToast;

  // Application State
  const state = {
    tasks: [],
    currentTab: 'all', // 'all' | 'active' | 'pending' | 'urgent_expiring' | 'overdue' | 'completed'
    searchQuery: '',
    priorityFilter: 'all', // 'all' | 'low' | 'medium' | 'high' | 'urgent'
    sortBy: 'due_asc', // 'due_asc' | 'due_desc' | 'created_desc' | 'created_asc' | 'priority_desc' | 'title_asc'
    editingTaskId: null,
    deletingTaskId: null
  };

  const PRIORITY_WEIGHTS = {
    urgent: 4,
    high: 3,
    medium: 2,
    low: 1
  };

  // DOM Elements Cache
  let DOM = {};

  function cacheDOM() {
    DOM = {
      themeToggleBtn: document.getElementById('themeToggleBtn'),
      themeToggleIcon: document.getElementById('themeToggleIcon'),
      themeToggleText: document.getElementById('themeToggleText'),
      
      mobileMenuBtn: document.getElementById('mobileMenuBtn'),
      sidebar: document.getElementById('appSidebar'),
      sidebarOverlay: document.getElementById('sidebarOverlay'),
      
      metricTotal: document.getElementById('metricTotal'),
      metricActive: document.getElementById('metricActive'),
      metricUrgent: document.getElementById('metricUrgent'),
      metricCompleted: document.getElementById('metricCompleted'),
      
      badgeAll: document.getElementById('badgeAll'),
      badgeActive: document.getElementById('badgeActive'),
      badgePending: document.getElementById('badgePending'),
      badgeExpiring: document.getElementById('badgeExpiring'),
      badgeOverdue: document.getElementById('badgeOverdue'),
      badgeCompleted: document.getElementById('badgeCompleted'),
      
      navBtns: document.querySelectorAll('.nav-item-btn'),
      viewTitle: document.getElementById('viewTitle'),
      viewSubtitle: document.getElementById('viewSubtitle'),
      
      searchInput: document.getElementById('searchInput'),
      searchClearBtn: document.getElementById('searchClearBtn'),
      prioritySelect: document.getElementById('prioritySelect'),
      sortSelect: document.getElementById('sortSelect'),
      
      taskList: document.getElementById('taskList'),
      emptyState: document.getElementById('emptyState'),
      
      taskModal: document.getElementById('taskModal'),
      taskModalTitle: document.getElementById('taskModalTitle'),
      taskForm: document.getElementById('taskForm'),
      taskIdInput: document.getElementById('taskIdInput'),
      taskTitleInput: document.getElementById('taskTitleInput'),
      titleErrorMsg: document.getElementById('titleErrorMsg'),
      taskDescInput: document.getElementById('taskDescInput'),
      taskDueDateInput: document.getElementById('taskDueDateInput'),
      taskPriorityInput: document.getElementById('taskPriorityInput'),
      taskWebLinkInput: document.getElementById('taskWebLinkInput'),
      modalCloseBtn: document.getElementById('modalCloseBtn'),
      modalCancelBtn: document.getElementById('modalCancelBtn'),
      openNewTaskBtn: document.getElementById('openNewTaskBtn'),
      
      confirmModal: document.getElementById('confirmModal'),
      confirmTaskPreview: document.getElementById('confirmTaskPreview'),
      cancelDeleteBtn: document.getElementById('cancelDeleteBtn'),
      confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),

      exportToggleBtn: document.getElementById('exportToggleBtn'),
      exportMenu: document.getElementById('exportMenu'),
      exportJsonBtn: document.getElementById('exportJsonBtn'),
      exportCsvBtn: document.getElementById('exportCsvBtn'),
      quickDateBtns: document.querySelectorAll('.quick-date-btn'),
      celebrationOverlay: document.getElementById('celebrationOverlay'),
      celebrationTaskName: document.getElementById('celebrationTaskName'),
      confettiContainer: document.getElementById('confettiContainer')
    };
  }

  function initApp() {
    cacheDOM();
    initTheme();
    state.tasks = loadTasks();
    setupEventListeners();
    render();
    setupDragAndDrop();

    // Auto-refresh task deadlines and timers every 60s
    setInterval(() => {
      updateMetrics();
      renderTasks();
    }, 60000);
  }

  // Theme Management
  function initTheme() {
    const savedTheme = getStoredTheme();
    setTheme(savedTheme, false);
  }

  function setTheme(theme, notify = true) {
    document.documentElement.setAttribute('data-theme', theme);
    saveStoredTheme(theme);
    
    if (DOM.themeToggleText) {
      DOM.themeToggleText.textContent = theme === 'dark' ? 'Light Mode' : 'Dark Mode';
    }
    if (DOM.themeToggleIcon) {
      DOM.themeToggleIcon.innerHTML = theme === 'dark' 
        ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`
        : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`;
    }

    if (notify) {
      showToast({
        type: 'info',
        title: 'Theme Switched',
        message: `Switched to ${theme === 'dark' ? 'Dark Obsidian' : 'Light Studio'} mode.`
      });
    }
  }

  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme, true);
  }

  // Setup Event Listeners
  function setupEventListeners() {
    if (DOM.themeToggleBtn) {
      DOM.themeToggleBtn.addEventListener('click', toggleTheme);
    }

    if (DOM.mobileMenuBtn && DOM.sidebar && DOM.sidebarOverlay) {
      DOM.mobileMenuBtn.addEventListener('click', () => {
        DOM.sidebar.classList.toggle('open');
        DOM.sidebarOverlay.classList.toggle('active');
      });

      DOM.sidebarOverlay.addEventListener('click', () => {
        DOM.sidebar.classList.remove('open');
        DOM.sidebarOverlay.classList.remove('active');
      });
    }

    DOM.navBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        if (targetTab) {
          state.currentTab = targetTab;
          DOM.navBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');

          if (DOM.sidebar) DOM.sidebar.classList.remove('open');
          if (DOM.sidebarOverlay) DOM.sidebarOverlay.classList.remove('active');

          updateViewHeader();
          render();
        }
      });
    });

    if (DOM.searchInput) {
      DOM.searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.trim().toLowerCase();
        if (DOM.searchClearBtn) {
          DOM.searchClearBtn.style.display = state.searchQuery ? 'flex' : 'none';
        }
        renderTasks();
      });
    }

    if (DOM.searchClearBtn) {
      DOM.searchClearBtn.addEventListener('click', () => {
        DOM.searchInput.value = '';
        state.searchQuery = '';
        DOM.searchClearBtn.style.display = 'none';
        DOM.searchInput.focus();
        renderTasks();
      });
    }

    if (DOM.prioritySelect) {
      DOM.prioritySelect.addEventListener('change', (e) => {
        state.priorityFilter = e.target.value;
        renderTasks();
      });
    }

    if (DOM.sortSelect) {
      DOM.sortSelect.addEventListener('change', (e) => {
        state.sortBy = e.target.value;
        renderTasks();
      });
    }

    if (DOM.openNewTaskBtn) {
      DOM.openNewTaskBtn.addEventListener('click', () => openTaskModal());
    }

    if (DOM.modalCloseBtn) {
      DOM.modalCloseBtn.addEventListener('click', closeTaskModal);
    }
    if (DOM.modalCancelBtn) {
      DOM.modalCancelBtn.addEventListener('click', closeTaskModal);
    }

    if (DOM.taskModal) {
      DOM.taskModal.addEventListener('click', (e) => {
        if (e.target === DOM.taskModal) closeTaskModal();
      });
    }

    if (DOM.taskForm) {
      DOM.taskForm.addEventListener('submit', handleTaskFormSubmit);
      DOM.taskTitleInput.addEventListener('input', clearTitleError);
    }

    if (DOM.cancelDeleteBtn) {
      DOM.cancelDeleteBtn.addEventListener('click', closeDeleteModal);
    }
    if (DOM.confirmDeleteBtn) {
      DOM.confirmDeleteBtn.addEventListener('click', handleConfirmDelete);
    }
    if (DOM.confirmModal) {
      DOM.confirmModal.addEventListener('click', (e) => {
        if (e.target === DOM.confirmModal) closeDeleteModal();
      });
    }

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeTaskModal();
        closeDeleteModal();
        if (DOM.exportMenu) DOM.exportMenu.classList.remove('open');
      }
    });

    // Export dropdown toggle
    if (DOM.exportToggleBtn) {
      DOM.exportToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        DOM.exportMenu.classList.toggle('open');
      });
    }
    if (DOM.exportJsonBtn) DOM.exportJsonBtn.addEventListener('click', exportJSON);
    if (DOM.exportCsvBtn) DOM.exportCsvBtn.addEventListener('click', exportCSV);
    document.addEventListener('click', () => {
      if (DOM.exportMenu) DOM.exportMenu.classList.remove('open');
    });

    // Quick date buttons
    if (DOM.quickDateBtns) {
      DOM.quickDateBtns.forEach(btn => {
        btn.addEventListener('click', () => handleQuickDate(btn.getAttribute('data-quick')));
      });
    }

    // Celebration overlay dismiss on click
    if (DOM.celebrationOverlay) {
      DOM.celebrationOverlay.addEventListener('click', () => {
        DOM.celebrationOverlay.classList.remove('active');
      });
    }
  }

  function updateViewHeader() {
    const titles = {
      all: { title: 'All Tasks', desc: 'Comprehensive overview of all items across your workflow' },
      active: { title: 'Active Tasks', desc: 'Tasks currently in progress awaiting completion' },
      pending: { title: 'Pending Tasks', desc: 'Scheduled upcoming items with comfortable deadlines' },
      urgent_expiring: { title: 'Expiring Soon (<24h Alert)', desc: 'High urgency tasks due within the next 24 hours' },
      overdue: { title: 'Overdue Tasks', desc: 'Tasks that have exceeded their target deadline' },
      completed: { title: 'Completed Tasks', desc: 'Archive of finished and resolved milestones' }
    };

    const current = titles[state.currentTab] || titles.all;
    if (DOM.viewTitle) DOM.viewTitle.textContent = current.title;
    if (DOM.viewSubtitle) DOM.viewSubtitle.textContent = current.desc;
  }

  function openTaskModal(taskId = null) {
    state.editingTaskId = taskId;
    clearTitleError();

    if (taskId) {
      const task = state.tasks.find(t => t.id === taskId);
      if (!task) return;

      DOM.taskModalTitle.textContent = 'Edit Task';
      DOM.taskIdInput.value = task.id;
      DOM.taskTitleInput.value = task.title;
      DOM.taskDescInput.value = task.description || '';
      DOM.taskDueDateInput.value = toDatetimeLocal(task.dueDate);
      DOM.taskPriorityInput.value = task.priority || 'medium';
      DOM.taskWebLinkInput.value = task.webLink || '';
    } else {
      DOM.taskModalTitle.textContent = 'Create New Task';
      DOM.taskForm.reset();
      DOM.taskIdInput.value = '';
      DOM.taskPriorityInput.value = 'medium';

      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      DOM.taskDueDateInput.value = toDatetimeLocal(tomorrow.toISOString());
    }

    DOM.taskModal.classList.add('active');
    setTimeout(() => DOM.taskTitleInput.focus(), 150);
  }

  function closeTaskModal() {
    DOM.taskModal.classList.remove('active');
    state.editingTaskId = null;
    clearTitleError();
  }

  function showTitleError(message) {
    DOM.taskTitleInput.classList.add('input-error');
    DOM.titleErrorMsg.querySelector('span').textContent = message;
    DOM.titleErrorMsg.classList.add('visible');
    DOM.taskTitleInput.focus();
  }

  function clearTitleError() {
    DOM.taskTitleInput.classList.remove('input-error');
    DOM.titleErrorMsg.classList.remove('visible');
  }

  function handleTaskFormSubmit(e) {
    e.preventDefault();

    const title = DOM.taskTitleInput.value.trim();
    const description = DOM.taskDescInput.value.trim();
    const dueDateVal = DOM.taskDueDateInput.value;
    const priority = DOM.taskPriorityInput.value;
    const rawWebLink = DOM.taskWebLinkInput.value.trim();
    const editingId = DOM.taskIdInput.value;

    // 1. Empty Check
    if (!title) {
      showTitleError('Task title cannot be empty.');
      showToast({
        type: 'warning',
        title: 'Validation Error',
        message: 'Please provide a title for your task.'
      });
      return;
    }

    // 2. Duplicate Title Check
    const isDuplicate = state.tasks.some(task => {
      if (editingId && task.id === editingId) return false;
      return task.title.toLowerCase().trim() === title.toLowerCase();
    });

    if (isDuplicate) {
      showTitleError('A task with this title already exists. Please choose a unique title.');
      showToast({
        type: 'danger',
        title: 'Duplicate Detected',
        message: 'A task with an identical title already exists in your list.'
      });
      return;
    }

    // 3. Web URL normalization
    let normalizedLink = null;
    if (rawWebLink) {
      normalizedLink = normalizeUrl(rawWebLink);
      if (!normalizedLink) {
        showToast({
          type: 'warning',
          title: 'Invalid URL Format',
          message: 'Please enter a valid web application URL (e.g. https://example.com).'
        });
        return;
      }
    }

    // 4. Due Date check
    let finalDueDate = null;
    if (dueDateVal) {
      const parsedDate = new Date(dueDateVal);
      if (!isNaN(parsedDate.getTime())) {
        finalDueDate = parsedDate.toISOString();
      }
    }

    if (editingId) {
      const taskIndex = state.tasks.findIndex(t => t.id === editingId);
      if (taskIndex !== -1) {
        state.tasks[taskIndex] = {
          ...state.tasks[taskIndex],
          title,
          description,
          dueDate: finalDueDate,
          priority,
          webLink: normalizedLink,
          updatedAt: new Date().toISOString()
        };
        saveTasks(state.tasks);
        closeTaskModal();
        render();
        showToast({
          type: 'success',
          title: 'Task Updated',
          message: `"${title}" was successfully updated.`
        });
      }
    } else {
      const newTask = {
        id: generateId(),
        title,
        description,
        createdAt: new Date().toISOString(),
        dueDate: finalDueDate,
        priority,
        webLink: normalizedLink,
        completed: false,
        completedAt: null
      };

      state.tasks.unshift(newTask);
      saveTasks(state.tasks);
      closeTaskModal();
      render();
      showToast({
        type: 'success',
        title: 'Task Created',
        message: `"${title}" added to your task list.`
      });
    }
  }

  function openDeleteModal(taskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;

    state.deletingTaskId = taskId;
    DOM.confirmTaskPreview.textContent = task.title;
    DOM.confirmModal.classList.add('active');
  }

  function closeDeleteModal() {
    DOM.confirmModal.classList.remove('active');
    state.deletingTaskId = null;
  }

  function handleConfirmDelete() {
    if (!state.deletingTaskId) return;

    const taskToDelete = state.tasks.find(t => t.id === state.deletingTaskId);
    const title = taskToDelete ? taskToDelete.title : 'Task';

    state.tasks = state.tasks.filter(t => t.id !== state.deletingTaskId);
    saveTasks(state.tasks);
    closeDeleteModal();
    render();

    showToast({
      type: 'danger',
      title: 'Task Permanently Deleted',
      message: `"${title}" has been permanently removed.`
    });
  }

  function toggleTaskCompletion(taskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;

    task.completed = !task.completed;
    task.completedAt = task.completed ? new Date().toISOString() : null;

    saveTasks(state.tasks);
    render();

    if (task.completed) {
      triggerCelebration(task.title);
      showToast({
        type: 'success',
        title: 'Task Completed! 🎉',
        message: `"${task.title}" has been marked as finished.`
      });
    } else {
      showToast({
        type: 'info',
        title: 'Task Reopened',
        message: `"${task.title}" is now back in active tasks.`
      });
    }
  }

  function updateMetrics() {
    const total = state.tasks.length;
    let active = 0;
    let completed = 0;
    let pending = 0;
    let expiringSoon = 0;
    let overdue = 0;

    state.tasks.forEach(task => {
      if (task.completed) {
        completed++;
      } else {
        active++;
        const status = evaluateDueStatus(task.dueDate, false);
        if (status.isOverdue) {
          overdue++;
        } else if (status.isNear) {
          expiringSoon++;
        } else {
          pending++;
        }
      }
    });

    if (DOM.metricTotal) DOM.metricTotal.textContent = total;
    if (DOM.metricActive) DOM.metricActive.textContent = active;
    if (DOM.metricUrgent) DOM.metricUrgent.textContent = expiringSoon + overdue;
    if (DOM.metricCompleted) DOM.metricCompleted.textContent = completed;

    if (DOM.badgeAll) DOM.badgeAll.textContent = total;
    if (DOM.badgeActive) DOM.badgeActive.textContent = active;
    if (DOM.badgePending) DOM.badgePending.textContent = pending;
    
    if (DOM.badgeExpiring) {
      DOM.badgeExpiring.textContent = expiringSoon;
      if (expiringSoon > 0) DOM.badgeExpiring.classList.add('alert-active');
      else DOM.badgeExpiring.classList.remove('alert-active');
    }

    if (DOM.badgeOverdue) {
      DOM.badgeOverdue.textContent = overdue;
      if (overdue > 0) DOM.badgeOverdue.classList.add('overdue-active');
      else DOM.badgeOverdue.classList.remove('overdue-active');
    }

    if (DOM.badgeCompleted) DOM.badgeCompleted.textContent = completed;
  }

  function getFilteredAndSortedTasks() {
    let list = [...state.tasks];

    // Filter by Section Tab
    list = list.filter(task => {
      const status = evaluateDueStatus(task.dueDate, task.completed);
      switch (state.currentTab) {
        case 'active':
          return !task.completed;
        case 'completed':
          return task.completed;
        case 'pending':
          return !task.completed && !status.isOverdue && !status.isNear;
        case 'urgent_expiring':
          return !task.completed && status.isNear;
        case 'overdue':
          return !task.completed && status.isOverdue;
        case 'all':
        default:
          return true;
      }
    });

    // Filter by Search Query
    if (state.searchQuery) {
      const q = state.searchQuery;
      list = list.filter(task => {
        const matchTitle = task.title.toLowerCase().includes(q);
        const matchDesc = (task.description || '').toLowerCase().includes(q);
        const matchLink = (task.webLink || '').toLowerCase().includes(q);
        return matchTitle || matchDesc || matchLink;
      });
    }

    // Filter by Priority
    if (state.priorityFilter !== 'all') {
      list = list.filter(task => task.priority === state.priorityFilter);
    }

    // Sort tasks
    list.sort((a, b) => {
      switch (state.sortBy) {
        case 'due_asc': {
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate) - new Date(b.dueDate);
        }
        case 'due_desc': {
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(b.dueDate) - new Date(a.dueDate);
        }
        case 'created_desc': {
          return new Date(b.createdAt) - new Date(a.createdAt);
        }
        case 'created_asc': {
          return new Date(a.createdAt) - new Date(b.createdAt);
        }
        case 'priority_desc': {
          const weightA = PRIORITY_WEIGHTS[a.priority] || 0;
          const weightB = PRIORITY_WEIGHTS[b.priority] || 0;
          return weightB - weightA;
        }
        case 'title_asc': {
          return a.title.localeCompare(b.title);
        }
        case 'manual': {
          // Preserve array order — set by drag & drop
          return 0;
        }
        default:
          return 0;
      }
    });

    return list;
  }

  function renderTasks() {
    const filteredTasks = getFilteredAndSortedTasks();
    DOM.taskList.innerHTML = '';

    if (filteredTasks.length === 0) {
      DOM.emptyState.style.display = 'flex';
      DOM.taskList.style.display = 'none';
      return;
    }

    DOM.emptyState.style.display = 'none';
    DOM.taskList.style.display = 'flex';

    filteredTasks.forEach(task => {
      const card = createTaskCardElement(task);
      DOM.taskList.appendChild(card);
    });
  }

  function createTaskCardElement(task) {
    const dueStatus = evaluateDueStatus(task.dueDate, task.completed);
    const card = document.createElement('div');
    
    let cardClasses = `task-card priority-${task.priority}`;
    if (task.completed) cardClasses += ' is-completed';
    else if (dueStatus.isOverdue) cardClasses += ' is-overdue';
    else if (dueStatus.isNear) cardClasses += ' is-expiring-soon';

    card.className = cardClasses;
    card.setAttribute('data-id', task.id);
    card.setAttribute('draggable', 'true');

    // Alert Banner (for expiring within 24 hours or overdue)
    let alertBannerHtml = '';
    if (!task.completed) {
      if (dueStatus.isOverdue) {
        alertBannerHtml = `
          <div class="task-alert-banner overdue">
            <span class="alert-pulse-dot"></span>
            <span>🚨 OVERDUE: ${escapeHtml(dueStatus.humanRemaining)}</span>
          </div>
        `;
      } else if (dueStatus.isNear) {
        alertBannerHtml = `
          <div class="task-alert-banner expiring">
            <span class="alert-pulse-dot"></span>
            <span>⚡ EXPIRING SOON: ${escapeHtml(dueStatus.humanRemaining)}</span>
          </div>
        `;
      }
    }

    // Attached Web Application Link Pill
    let linkBadgeHtml = '';
    if (task.webLink) {
      const domain = extractDomain(task.webLink);
      linkBadgeHtml = `
        <a href="${escapeHtml(task.webLink)}" target="_blank" rel="noopener noreferrer" class="task-link-badge" title="Open workspace: ${escapeHtml(task.webLink)}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          <span class="url-text">${escapeHtml(domain)}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        </a>
      `;
    }

    let dueDateClass = 'meta-date-item due-date';
    if (!task.completed) {
      if (dueStatus.isOverdue) dueDateClass += ' is-past';
      else if (dueStatus.isNear) dueDateClass += ' is-near';
    }

    card.innerHTML = `
      <div class="task-card-header">
        <div class="task-header-main">
          <div class="task-checkbox-wrap">
            <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} aria-label="Mark task complete" />
            <svg class="task-checkbox-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div class="task-text-content">
            <h3 class="task-title">${escapeHtml(task.title)}</h3>
            ${task.description ? `<p class="task-desc">${escapeHtml(task.description)}</p>` : ''}
          </div>
        </div>
        <div class="task-actions">
          <div class="drag-handle" title="Drag to reorder">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/></svg>
          </div>
          <button class="action-btn edit-btn" title="Edit task" aria-label="Edit task">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
          </button>
          <button class="action-btn delete-btn" title="Permanently delete task" aria-label="Delete task">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          </button>
        </div>
      </div>

      ${alertBannerHtml}
      ${linkBadgeHtml}

      <div class="task-meta-footer">
        <div class="task-meta-left">
          <span class="priority-badge ${escapeHtml(task.priority)}">
            ● ${escapeHtml(task.priority)}
          </span>
          <div class="meta-date-item" title="Created on">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <span>Created: ${formatDate(task.createdAt)}</span>
          </div>
          ${task.dueDate ? `
            <div class="${dueDateClass}" title="Due date">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <span>Due: ${formatDate(task.dueDate)}</span>
            </div>
          ` : ''}
        </div>
        <div class="task-meta-right">
          <span class="status-pill ${task.completed ? 'completed' : 'active'}">
            ${task.completed ? 'Completed' : 'In Progress'}
          </span>
        </div>
      </div>
    `;

    const checkbox = card.querySelector('.task-checkbox');
    checkbox.addEventListener('change', () => toggleTaskCompletion(task.id));

    const editBtn = card.querySelector('.edit-btn');
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openTaskModal(task.id);
    });

    const deleteBtn = card.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openDeleteModal(task.id);
    });

    return card;
  }

  function render() {
    updateMetrics();
    renderTasks();
  }

  document.addEventListener('DOMContentLoaded', initApp);

  // ============================================================
  // Drag & Drop Reordering
  // ============================================================
  function setupDragAndDrop() {
    let dragSrcId = null;

    DOM.taskList.addEventListener('dragstart', (e) => {
      const card = e.target.closest('.task-card');
      if (!card) return;
      dragSrcId = card.getAttribute('data-id');
      // Use rAF to avoid instant opacity flicker
      requestAnimationFrame(() => card.classList.add('dragging'));
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', dragSrcId);
    });

    DOM.taskList.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const card = e.target.closest('.task-card');
      if (!card || card.getAttribute('data-id') === dragSrcId) return;

      DOM.taskList.querySelectorAll('.drag-over-above, .drag-over-below').forEach(el => {
        el.classList.remove('drag-over-above', 'drag-over-below');
      });

      const rect = card.getBoundingClientRect();
      if (e.clientY < rect.top + rect.height / 2) {
        card.classList.add('drag-over-above');
      } else {
        card.classList.add('drag-over-below');
      }
    });

    DOM.taskList.addEventListener('dragleave', (e) => {
      if (!DOM.taskList.contains(e.relatedTarget)) {
        DOM.taskList.querySelectorAll('.drag-over-above, .drag-over-below').forEach(el => {
          el.classList.remove('drag-over-above', 'drag-over-below');
        });
      }
    });

    DOM.taskList.addEventListener('drop', (e) => {
      e.preventDefault();
      const targetCard = e.target.closest('.task-card');
      if (!targetCard || !dragSrcId) return;

      const targetId = targetCard.getAttribute('data-id');
      if (targetId === dragSrcId) return;

      const isAbove = targetCard.classList.contains('drag-over-above');

      const srcIdx = state.tasks.findIndex(t => t.id === dragSrcId);
      const [removed] = state.tasks.splice(srcIdx, 1);
      const newTgtIdx = state.tasks.findIndex(t => t.id === targetId);
      const insertAt = isAbove ? newTgtIdx : newTgtIdx + 1;
      state.tasks.splice(insertAt, 0, removed);

      // Switch to manual sort & update dropdown
      state.sortBy = 'manual';
      if (DOM.sortSelect) DOM.sortSelect.value = 'manual';

      saveTasks(state.tasks);

      DOM.taskList.querySelectorAll('.drag-over-above, .drag-over-below, .dragging').forEach(el => {
        el.classList.remove('drag-over-above', 'drag-over-below', 'dragging');
      });
      dragSrcId = null;
      renderTasks();

      showToast({ type: 'info', title: 'Order Updated', message: 'Task order saved. Sort set to Custom Order.' });
    });

    DOM.taskList.addEventListener('dragend', () => {
      DOM.taskList.querySelectorAll('.dragging, .drag-over-above, .drag-over-below').forEach(el => {
        el.classList.remove('dragging', 'drag-over-above', 'drag-over-below');
      });
      dragSrcId = null;
    });
  }

  // ============================================================
  // Export (JSON & CSV)
  // ============================================================
  function exportJSON() {
    if (DOM.exportMenu) DOM.exportMenu.classList.remove('open');
    if (state.tasks.length === 0) {
      showToast({ type: 'warning', title: 'Nothing to Export', message: 'You have no tasks to export.' });
      return;
    }
    const data = JSON.stringify(state.tasks, null, 2);
    downloadFile(data, 'apextask-tasks.json', 'application/json');
    showToast({ type: 'success', title: 'Exported as JSON', message: `${state.tasks.length} task(s) downloaded.` });
  }

  function exportCSV() {
    if (DOM.exportMenu) DOM.exportMenu.classList.remove('open');
    if (state.tasks.length === 0) {
      showToast({ type: 'warning', title: 'Nothing to Export', message: 'You have no tasks to export.' });
      return;
    }
    const headers = ['Title', 'Description', 'Priority', 'Status', 'Created At', 'Due Date', 'Completed At', 'Web Link'];
    const rows = state.tasks.map(task => [
      csvEscape(task.title),
      csvEscape(task.description || ''),
      task.priority,
      task.completed ? 'Completed' : 'Active',
      task.createdAt ? new Date(task.createdAt).toLocaleString() : '',
      task.dueDate   ? new Date(task.dueDate).toLocaleString()   : '',
      task.completedAt ? new Date(task.completedAt).toLocaleString() : '',
      task.webLink || ''
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadFile(csv, 'apextask-tasks.csv', 'text/csv;charset=utf-8;');
    showToast({ type: 'success', title: 'Exported as CSV', message: `${state.tasks.length} task(s) downloaded.` });
  }

  function csvEscape(value) {
    if (value === null || value === undefined) return '""';
    return '"' + String(value).replace(/"/g, '""') + '"';
  }

  function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ============================================================
  // Quick Date Presets
  // ============================================================
  function handleQuickDate(preset) {
    const now = new Date();
    let target;
    switch (preset) {
      case 'today':
        target = new Date(now);
        target.setHours(23, 59, 0, 0);
        break;
      case 'tomorrow':
        target = new Date(now);
        target.setDate(target.getDate() + 1);
        target.setHours(23, 59, 0, 0);
        break;
      case '3days':
        target = new Date(now);
        target.setDate(target.getDate() + 3);
        target.setHours(23, 59, 0, 0);
        break;
      case 'week':
        target = new Date(now);
        target.setDate(target.getDate() + 7);
        target.setHours(23, 59, 0, 0);
        break;
      default:
        return;
    }
    if (DOM.taskDueDateInput) {
      DOM.taskDueDateInput.value = toDatetimeLocal(target.toISOString());
    }
  }

  // ============================================================
  // Task Completion Celebration
  // ============================================================
  function triggerCelebration(taskTitle) {
    playCompletionSound();
    createConfetti();

    if (DOM.celebrationTaskName) {
      DOM.celebrationTaskName.textContent = `"${taskTitle}"`;
    }

    if (DOM.celebrationOverlay) {
      DOM.celebrationOverlay.classList.add('active');
      setTimeout(() => {
        DOM.celebrationOverlay.classList.remove('active');
      }, 3200);
    }
  }

  function playCompletionSound() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      // Ascending arpeggio: C5 → E5 → G5 → C6
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, i) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        const t = ctx.currentTime + i * 0.11;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.22, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.30);
        osc.start(t);
        osc.stop(t + 0.35);
      });

      // Final settling chord
      [523.25, 659.25, 783.99].forEach(freq => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        const t = ctx.currentTime + notes.length * 0.11 + 0.05;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.12, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.65);
        osc.start(t);
        osc.stop(t + 0.70);
      });
    } catch (e) {
      // AudioContext not available — fail silently
    }
  }

  function createConfetti() {
    if (!DOM.confettiContainer) return;
    DOM.confettiContainer.innerHTML = '';

    const colors = [
      '#f43f5e', '#fb923c', '#fbbf24', '#34d399',
      '#38bdf8', '#818cf8', '#e879f9', '#10b981', '#f59e0b'
    ];

    for (let i = 0; i < 72; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      const color    = colors[Math.floor(Math.random() * colors.length)];
      const size     = 6 + Math.random() * 10;
      const isCircle = Math.random() > 0.5;
      const duration = 1.8 + Math.random() * 1.5;
      const delay    = Math.random() * 0.7;

      piece.style.cssText = [
        `left: ${Math.random() * 100}%`,
        `width: ${size}px`,
        `height: ${size}px`,
        `background: ${color}`,
        `border-radius: ${isCircle ? '50%' : '2px'}`,
        `animation-duration: ${duration}s`,
        `animation-delay: ${delay}s`
      ].join(';');

      DOM.confettiContainer.appendChild(piece);
    }
  }
})();
