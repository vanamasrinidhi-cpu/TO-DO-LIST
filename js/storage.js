/**
 * ApexTask - Storage Module
 */
window.ApexStorage = (function () {
  const STORAGE_KEY = 'todo_pro_tasks_v1';
  const THEME_KEY = 'todo_pro_theme';

  function getInitialSampleTasks() {
    const now = new Date();
    
    // Task 1: Expiring in 6 hours (triggers <24h near alert with animated ember pulse)
    const expiringDate = new Date(now.getTime() + 6 * 60 * 60 * 1000);
    
    // Task 2: Due in 3 days
    const upcomingDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    // Task 3: Overdue by 4 hours
    const pastDate = new Date(now.getTime() - 4 * 60 * 60 * 1000);

    // Task 4: Completed
    const completedDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    return [
      {
        id: 'task_sample_1',
        title: 'Review pull request & deploy staging build',
        description: 'Check regression tests on backend API endpoints and merge PR #429. Validate cloud database connection strings.',
        createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
        dueDate: expiringDate.toISOString(),
        priority: 'urgent',
        webLink: 'https://github.com/features/actions',
        completed: false,
        completedAt: null
      },
      {
        id: 'task_sample_2',
        title: 'Finalize UX wireframes for client dashboard',
        description: 'Incorporate client feedback regarding dark mode contrast ratios and interactive charts layout.',
        createdAt: new Date(now.getTime() - 20 * 60 * 60 * 1000).toISOString(),
        dueDate: upcomingDate.toISOString(),
        priority: 'high',
        webLink: 'https://figma.com',
        completed: false,
        completedAt: null
      },
      {
        id: 'task_sample_3',
        title: 'Renew cloud SSL certificates and DNS verification',
        description: 'Production wildcard certificate rotation and CDN edge caching invalidation.',
        createdAt: new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString(),
        dueDate: pastDate.toISOString(),
        priority: 'urgent',
        webLink: 'https://cloudflare.com',
        completed: false,
        completedAt: null
      },
      {
        id: 'task_sample_4',
        title: 'Setup continuous integration pipeline',
        description: 'Automated linter, build validation, and end-to-end browser test suites.',
        createdAt: new Date(now.getTime() - 72 * 60 * 60 * 1000).toISOString(),
        dueDate: completedDate.toISOString(),
        priority: 'medium',
        webLink: 'https://linear.app',
        completed: true,
        completedAt: new Date(now.getTime() - 10 * 60 * 60 * 1000).toISOString()
      }
    ];
  }

  function loadTasks() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const initial = getInitialSampleTasks();
        saveTasks(initial);
        return initial;
      }
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('Failed to load tasks from localStorage', error);
      return [];
    }
  }

  function saveTasks(tasks) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (error) {
      console.error('Failed to save tasks to localStorage', error);
    }
  }

  function getStoredTheme() {
    try {
      return localStorage.getItem(THEME_KEY) || 'dark';
    } catch (e) {
      return 'dark';
    }
  }

  function saveStoredTheme(theme) {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (e) {
      console.error('Failed to save theme', e);
    }
  }

  return {
    loadTasks,
    saveTasks,
    getStoredTheme,
    saveStoredTheme
  };
})();
