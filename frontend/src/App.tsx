import React, { useState, useEffect, useCallback } from 'react';
import { api } from './services/api';

// Interface definitions
interface User {
  id: string;
  email: string;
  role: string;
  createdAt: string;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string;
  userId: string;
  user?: {
    email: string;
  };
  createdAt: string;
}

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
}

export default function App() {
  // Authentication State
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  // Auth Form State
  const [isLoginView, setIsLoginView] = useState<boolean>(true);
  const [authEmail, setAuthEmail] = useState<string>('');
  const [authPassword, setAuthPassword] = useState<string>('');
  const [authRole, setAuthRole] = useState<string>('USER');
  const [authLoading, setAuthLoading] = useState<boolean>(false);

  // Core App Views/Tabs
  const [dashboardTab, setDashboardTab] = useState<'tasks' | 'admin'>('tasks');

  // Task Data State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState<boolean>(false);

  // Admin Data State
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState<boolean>(false);

  // Filters State
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [adminUserFilter, setAdminUserFilter] = useState<string>('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskTitle, setTaskTitle] = useState<string>('');
  const [taskDescription, setTaskDescription] = useState<string>('');
  const [taskStatus, setTaskStatus] = useState<string>('TODO');
  const [taskPriority, setTaskPriority] = useState<string>('MEDIUM');
  const [taskDueDate, setTaskDueDate] = useState<string>('');
  const [modalLoading, setModalLoading] = useState<boolean>(false);

  // Feedback Notifications (Toasts) State
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Helper: Toast Dispatcher
  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  // Sync custom expired authentication events
  useEffect(() => {
    const handleAuthExpired = () => {
      setToken(null);
      setUser(null);
      showToast('Session expired. Please log in again.', 'error');
    };

    window.addEventListener('auth-expired', handleAuthExpired);
    return () => {
      window.removeEventListener('auth-expired', handleAuthExpired);
    };
  }, [showToast]);

  // Fetch Tasks from API
  const fetchTasks = useCallback(async () => {
    if (!token) return;
    setTasksLoading(true);
    try {
      const params: any = {};
      if (searchFilter) params.search = searchFilter;
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (user?.role === 'ADMIN' && adminUserFilter) {
        params.userId = adminUserFilter;
      }

      const res = await api.get('/tasks', { params });
      setTasks(res.data.data.tasks);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to fetch tasks';
      showToast(msg, 'error');
    } finally {
      setTasksLoading(false);
    }
  }, [token, user?.role, searchFilter, statusFilter, priorityFilter, adminUserFilter, showToast]);

  // Fetch Users from API (Admin Only)
  const fetchUsers = useCallback(async () => {
    if (!token || user?.role !== 'ADMIN') return;
    setUsersLoading(true);
    try {
      const res = await api.get('/users');
      setUsers(res.data.data.users);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to fetch users';
      showToast(msg, 'error');
    } finally {
      setUsersLoading(false);
    }
  }, [token, user?.role, showToast]);

  // Load Initial Data on Login
  useEffect(() => {
    if (token) {
      fetchTasks();
      if (user?.role === 'ADMIN') {
        fetchUsers();
      }
    } else {
      setTasks([]);
      setUsers([]);
    }
  }, [token, user?.role, fetchTasks, fetchUsers]);

  // Trigger tasks search on debounced/filter updates
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (token) {
        fetchTasks();
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchFilter, statusFilter, priorityFilter, adminUserFilter, token, fetchTasks]);

  // Auth Form Handlers
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPassword) {
      showToast('Please enter both email and password', 'error');
      return;
    }
    setAuthLoading(true);
    try {
      if (isLoginView) {
        // Login Request
        const res = await api.post('/auth/login', {
          email: authEmail,
          password: authPassword,
        });
        const { token: receivedToken, user: receivedUser } = res.data.data;
        localStorage.setItem('token', receivedToken);
        localStorage.setItem('user', JSON.stringify(receivedUser));
        setToken(receivedToken);
        setUser(receivedUser);
        showToast('Welcome back! Logged in successfully.', 'success');
      } else {
        // Register Request
        await api.post('/auth/register', {
          email: authEmail,
          password: authPassword,
          role: authRole,
        });
        showToast('Registration successful! Please log in.', 'success');
        setIsLoginView(true);
        setAuthPassword('');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Authentication failed';
      showToast(msg, 'error');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setDashboardTab('tasks');
    setAuthEmail('');
    setAuthPassword('');
    showToast('Logged out successfully', 'success');
  };

  // Open/Close Modal Utilities
  const openCreateModal = () => {
    setEditingTask(null);
    setTaskTitle('');
    setTaskDescription('');
    setTaskStatus('TODO');
    setTaskPriority('MEDIUM');
    setTaskDueDate('');
    setIsModalOpen(true);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setTaskTitle(task.title);
    setTaskDescription(task.description || '');
    setTaskStatus(task.status);
    setTaskPriority(task.priority);
    // Format date for datetime-local input (YYYY-MM-DDThh:mm)
    if (task.dueDate) {
      const d = new Date(task.dueDate);
      const iso = d.toISOString(); // e.g. 2026-05-23T00:52:37.000Z
      setTaskDueDate(iso.substring(0, 16));
    } else {
      setTaskDueDate('');
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTask(null);
  };

  // Task Creation & Editing Actions
  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) {
      showToast('Task title is required', 'error');
      return;
    }
    setModalLoading(true);
    try {
      const payload = {
        title: taskTitle,
        description: taskDescription || null,
        status: taskStatus,
        priority: taskPriority,
        dueDate: taskDueDate ? new Date(taskDueDate).toISOString() : null,
      };

      if (editingTask) {
        // Edit Mode
        await api.put(`/tasks/${editingTask.id}`, payload);
        showToast('Task updated successfully!', 'success');
      } else {
        // Create Mode
        await api.post('/tasks', payload);
        showToast('Task created successfully!', 'success');
      }
      closeModal();
      fetchTasks();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to save task';
      showToast(msg, 'error');
    } finally {
      setModalLoading(false);
    }
  };

  // Cycle Status Fast Toggle (TODO -> IN_PROGRESS -> DONE -> TODO)
  const handleStatusCycle = async (task: Task) => {
    const statusCycle: Record<string, string> = {
      TODO: 'IN_PROGRESS',
      IN_PROGRESS: 'DONE',
      DONE: 'TODO',
    };
    const nextStatus = statusCycle[task.status] || 'TODO';
    try {
      await api.put(`/tasks/${task.id}`, { status: nextStatus });
      showToast(`Task status updated to ${nextStatus.replace('_', ' ')}`, 'success');
      fetchTasks();
    } catch (err: any) {
      showToast('Failed to update status', 'error');
    }
  };

  const handleTaskDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await api.delete(`/tasks/${id}`);
      showToast('Task deleted successfully', 'success');
      fetchTasks();
    } catch (err: any) {
      showToast('Failed to delete task', 'error');
    }
  };

  // Admin Actions
  const handleToggleUserRole = async (targetUser: User) => {
    if (targetUser.id === user?.id) {
      showToast('You cannot modify your own administrative role', 'error');
      return;
    }
    const nextRole = targetUser.role === 'ADMIN' ? 'USER' : 'ADMIN';
    if (!window.confirm(`Are you sure you want to change role of ${targetUser.email} to ${nextRole}?`)) return;

    try {
      await api.patch(`/users/${targetUser.id}/role`, { role: nextRole });
      showToast(`User role updated to ${nextRole} successfully`, 'success');
      fetchUsers();
      // If we filtered by user, trigger refetch of tasks too
      if (adminUserFilter === targetUser.id) {
        fetchTasks();
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to update user role';
      showToast(msg, 'error');
    }
  };

  // Metric calculation helpers
  const getMetrics = () => {
    const total = tasks.length;
    const todo = tasks.filter((t) => t.status === 'TODO').length;
    const inProgress = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
    const done = tasks.filter((t) => t.status === 'DONE').length;
    return { total, todo, inProgress, done };
  };

  const metrics = getMetrics();

  // If token or user not available, show Authentication view
  if (!token || !user) {
    return (
      <div className="auth-wrapper">
        <div className="toast-container">
          {toasts.map((toast) => (
            <div key={toast.id} className={`toast ${toast.type}`}>
              <span>{toast.message}</span>
              <button className="toast-close" onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}>×</button>
            </div>
          ))}
        </div>

        <div className="glass-panel auth-card">
          <div className="auth-header">
            <h1>PrimeTrade</h1>
            <p>Task Manager Workspace Portal</p>
          </div>

          <div className="auth-tabs">
            <button
              className={`auth-tab-btn ${isLoginView ? 'active' : ''}`}
              onClick={() => setIsLoginView(true)}
            >
              Sign In
            </button>
            <button
              className={`auth-tab-btn ${!isLoginView ? 'active' : ''}`}
              onClick={() => setIsLoginView(false)}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleAuthSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="input-field"
                placeholder="name@domain.com"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="input-field"
                placeholder="••••••••"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                required
              />
            </div>

            {!isLoginView && (
              <div className="form-group">
                <label className="form-label">Registration Role</label>
                <select
                  className="select-dropdown"
                  style={{ width: '100%' }}
                  value={authRole}
                  onChange={(e) => setAuthRole(e.target.value)}
                >
                  <option value="USER">User (Standard Access)</option>
                  <option value="ADMIN">Admin (Root Management)</option>
                </select>
              </div>
            )}

            <button type="submit" className="btn btn-primary" style={{ marginTop: '10px' }} disabled={authLoading}>
              {authLoading ? 'Please wait...' : isLoginView ? 'Sign In to Dashboard' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Dashboard View
  return (
    <div className="app-container">
      {/* Toast Notification HUD */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.type}`}>
            <span>{toast.message}</span>
            <button className="toast-close" onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}>×</button>
          </div>
        ))}
      </div>

      {/* Header Panel */}
      <header className="dashboard-header">
        <div className="logo-section">
          <h2>PrimeTrade Workspace</h2>
        </div>
        <div className="user-profile">
          <div className="user-info">
            <div className="user-email">{user.email}</div>
            <span className={`role-badge ${user.role.toLowerCase()}`}>{user.role}</span>
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="dashboard-main">
        {/* Navigation Tabs (Dashboard vs Admin Panel) */}
        {user.role === 'ADMIN' && (
          <div className="dashboard-tabs">
            <button
              className={`nav-tab-btn ${dashboardTab === 'tasks' ? 'active' : ''}`}
              onClick={() => setDashboardTab('tasks')}
            >
              My Tasks & Operations
            </button>
            <button
              className={`nav-tab-btn ${dashboardTab === 'admin' ? 'active' : ''}`}
              onClick={() => setDashboardTab('admin')}
            >
              Admin Control Centre
            </button>
          </div>
        )}

        {dashboardTab === 'tasks' ? (
          <>
            {/* Quick Metrics Bar */}
            <section className="metrics-grid">
              <div className="glass-panel metric-card" style={{ borderLeft: '4px solid var(--primary)' }}>
                <span className="metric-title">Total Tasks</span>
                <div className="metric-value">{metrics.total}</div>
              </div>
              <div className="glass-panel metric-card" style={{ borderLeft: '4px solid var(--text-secondary)' }}>
                <span className="metric-title">To Do</span>
                <div className="metric-value">{metrics.todo}</div>
              </div>
              <div className="glass-panel metric-card" style={{ borderLeft: '4px solid var(--warning)' }}>
                <span className="metric-title">In Progress</span>
                <div className="metric-value">{metrics.inProgress}</div>
              </div>
              <div className="glass-panel metric-card" style={{ borderLeft: '4px solid var(--success)' }}>
                <span className="metric-title">Completed</span>
                <div className="metric-value">{metrics.done}</div>
              </div>
            </section>

            {/* Filter controls and add tasks */}
            <div className="toolbar-section">
              <div className="filters-group">
                <div className="search-wrapper">
                  <input
                    type="text"
                    className="input-field"
                    placeholder="🔍 Search tasks by title or details..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                  />
                </div>
                <select
                  className="select-dropdown"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="TODO">To Do</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="DONE">Completed</option>
                </select>
                <select
                  className="select-dropdown"
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                >
                  <option value="">All Priorities</option>
                  <option value="LOW">Low Priority</option>
                  <option value="MEDIUM">Medium Priority</option>
                  <option value="HIGH">High Priority</option>
                </select>

                {/* Admins can filter all tasks by specific user */}
                {user.role === 'ADMIN' && (
                  <select
                    className="select-dropdown"
                    value={adminUserFilter}
                    onChange={(e) => setAdminUserFilter(e.target.value)}
                  >
                    <option value="">All Users' Tasks</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        Tasks of {u.email}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <button className="add-task-btn" onClick={openCreateModal}>
                <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>+</span> Add New Task
              </button>
            </div>

            {/* Tasks listing grid */}
            {tasksLoading ? (
              <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>
                Loading operational tasks...
              </div>
            ) : (
              <section className="tasks-grid">
                {tasks.length === 0 ? (
                  <div className="glass-panel empty-state">
                    <h3>No tasks found</h3>
                    <p>There are no tasks matching your current search/filter settings.</p>
                    <button className="btn btn-secondary" style={{ width: 'auto' }} onClick={openCreateModal}>
                      Create Your First Task
                    </button>
                  </div>
                ) : (
                  tasks.map((task) => (
                    <div key={task.id} className="glass-panel task-card">
                      <div className="task-card-header">
                        <h4 className="task-title" title={task.title}>
                          {task.title}
                        </h4>
                        <button
                          className={`badge badge-status-${task.status.toLowerCase()}`}
                          style={{ cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)' }}
                          title="Click to toggle status"
                          onClick={() => handleStatusCycle(task)}
                        >
                          {task.status.replace('_', ' ')}
                        </button>
                      </div>

                      <p className="task-description">
                        {task.description || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No description provided.</span>}
                      </p>

                      {user.role === 'ADMIN' && task.user && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--accent)', marginBottom: '12px', fontWeight: 500 }}>
                          👤 Owner: {task.user.email}
                        </div>
                      )}

                      <div className="task-meta">
                        <div className="task-badges">
                          <span className={`badge badge-priority-${task.priority.toLowerCase()}`}>
                            {task.priority}
                          </span>
                        </div>

                        {task.dueDate && (
                          <div className="task-date" title="Due Date">
                            📅 {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}

                        <div className="task-actions">
                          <button className="action-btn edit" onClick={() => openEditModal(task)} title="Edit Task">
                            ✏️
                          </button>
                          <button className="action-btn delete" onClick={() => handleTaskDelete(task.id)} title="Delete Task">
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </section>
            )}
          </>
        ) : (
          /* Admin Control Centre Tab */
          <section className="glass-panel" style={{ padding: '30px' }}>
            <h3 style={{ marginBottom: '20px', fontWeight: 700 }}>Workspace Users & Access Controls</h3>
            {usersLoading ? (
              <div style={{ color: 'var(--text-secondary)' }}>Querying registered accounts...</div>
            ) : (
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Account Email</th>
                      <th>Account ID</th>
                      <th>Access Privilege</th>
                      <th>Created Date</th>
                      <th style={{ textAlign: 'right' }}>Administrative Operations</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td style={{ fontWeight: 600 }}>{u.email}</td>
                        <td style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.85rem' }}>{u.id}</td>
                        <td>
                          <span className={`role-badge ${u.role.toLowerCase()}`}>{u.role}</span>
                        </td>
                        <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="btn btn-secondary"
                            style={{ width: 'auto', padding: '6px 12px', fontSize: '0.8rem' }}
                            onClick={() => handleToggleUserRole(u)}
                            disabled={u.id === user.id}
                            title={u.id === user.id ? 'You cannot alter your own admin permissions' : `Switch user role to ${u.role === 'ADMIN' ? 'USER' : 'ADMIN'}`}
                          >
                            🔄 Switch Privilege
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </main>

      {/* Task Creation & Editing Modal Dialog */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="glass-panel modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingTask ? 'Edit Task Details' : 'Add New Workspace Task'}</h3>
              <button className="modal-close-btn" onClick={closeModal}>×</button>
            </div>

            <form onSubmit={handleTaskSubmit}>
              <div className="form-group">
                <label className="form-label">Task Title</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Task title (e.g. Audit database records)"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  maxLength={100}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Task Description</label>
                <textarea
                  className="input-field"
                  placeholder="Provide structured details of what needs to be accomplished..."
                  style={{ minHeight: '100px', resize: 'vertical' }}
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  maxLength={500}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="select-dropdown"
                    style={{ width: '100%' }}
                    value={taskStatus}
                    onChange={(e) => setTaskStatus(e.target.value)}
                  >
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="DONE">Completed</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select
                    className="select-dropdown"
                    style={{ width: '100%' }}
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value)}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Due Date & Time (Optional)</label>
                <input
                  type="datetime-local"
                  className="input-field"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={modalLoading}>
                  {modalLoading ? 'Saving...' : editingTask ? 'Save Updates' : 'Add Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
