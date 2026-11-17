// ==========================================================================
// To-Do List Application
// ==========================================================================

const STORAGE_KEY = 'todo_app_tasks';

// DOM Elements
const addTaskForm = document.getElementById('add-task-form');
const taskTextInput = document.getElementById('task-text');
const taskDueDateInput = document.getElementById('task-due-date');
const taskStatusSelect = document.getElementById('task-status');

const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search-btn');

const taskList = document.getElementById('task-list');
const emptyState = document.getElementById('empty-state');
const emptyTitle = document.getElementById('empty-title');
const emptyMessage = document.getElementById('empty-message');

const totalCountEl = document.getElementById('total-count');
const pendingCountEl = document.getElementById('pending-count');
const completedCountEl = document.getElementById('completed-count');

// Edit Modal Elements
const editModal = document.getElementById('edit-modal');
const editTaskForm = document.getElementById('edit-task-form');
const editTaskIdInput = document.getElementById('edit-task-id');
const editTaskTextInput = document.getElementById('edit-task-text');
const editTaskDueDateInput = document.getElementById('edit-task-due-date');
const editTaskStatusSelect = document.getElementById('edit-task-status');
const closeEditModalBtn = document.getElementById('close-edit-modal-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');

// Delete Confirm Modal Elements
const confirmModal = document.getElementById('confirm-modal');
const deleteTaskPreview = document.getElementById('delete-task-preview');
const closeConfirmModalBtn = document.getElementById('close-confirm-modal-btn');
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');

// State
let tasks = [];
let taskToDeleteId = null;

// ==========================================================================
// Storage Helpers
// ==========================================================================
function loadTasks() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    tasks = stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading tasks from localStorage:', error);
    tasks = [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (error) {
    console.error('Error saving tasks to localStorage:', error);
  }
}

// ==========================================================================
// Date Formatting Helpers
// ==========================================================================
function getDateStatus(dueDateStr) {
  if (!dueDateStr) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Parse YYYY-MM-DD
  const parts = dueDateStr.split('-');
  if (parts.length !== 3) return null;

  const dueDate = new Date(parts[0], parts[1] - 1, parts[2]);
  dueDate.setHours(0, 0, 0, 0);

  const diffTime = dueDate.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  const options = { month: 'short', day: 'numeric', year: 'numeric' };
  const formattedDate = dueDate.toLocaleDateString(undefined, options);

  if (diffDays < 0) {
    return { type: 'overdue', text: `Overdue (${formattedDate})`, isOverdue: true };
  } else if (diffDays === 0) {
    return { type: 'today', text: 'Due Today', isDueToday: true };
  } else if (diffDays === 1) {
    return { type: 'tomorrow', text: 'Due Tomorrow' };
  } else {
    return { type: 'future', text: `Due: ${formattedDate}` };
  }
}

// Utility: Prevent HTML injection
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ==========================================================================
// Stats Update
// ==========================================================================
function updateStats() {
  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const pending = total - completed;

  totalCountEl.textContent = total;
  pendingCountEl.textContent = pending;
  completedCountEl.textContent = completed;
}

// ==========================================================================
// Render Function
// ==========================================================================
function renderTasks() {
  updateStats();

  const query = searchInput.value.trim().toLowerCase();
  clearSearchBtn.hidden = query.length === 0;

  // Filter tasks based on query
  const filteredTasks = tasks.filter(task => {
    if (!query) return true;
    const matchTitle = task.text.toLowerCase().includes(query);
    const matchDate = task.dueDate && task.dueDate.toLowerCase().includes(query);
    return matchTitle || matchDate;
  });

  taskList.innerHTML = '';

  if (tasks.length === 0) {
    // Empty state: No tasks at all
    emptyState.hidden = false;
    emptyTitle.textContent = 'No tasks yet!';
    emptyMessage.textContent = 'Your list is completely clear. Add your first task above to get organized!';
    return;
  }

  if (filteredTasks.length === 0) {
    // Empty state: No search results
    emptyState.hidden = false;
    emptyTitle.textContent = 'No matching tasks found';
    emptyMessage.textContent = `We couldn't find any task matching "${query}". Try searching for something else.`;
    return;
  }

  // Hide empty state
  emptyState.hidden = true;

  // Render list items
  filteredTasks.forEach(task => {
    const li = document.createElement('li');
    li.className = `task-item ${task.completed ? 'is-completed' : ''}`;
    li.dataset.id = task.id;

    // Due date info
    const dateInfo = getDateStatus(task.dueDate);
    let dateBadgeHtml = '';
    if (dateInfo) {
      let badgeClass = 'badge-date';
      if (!task.completed) {
        if (dateInfo.isOverdue) badgeClass = 'badge-overdue';
        else if (dateInfo.isDueToday) badgeClass = 'badge-due-today';
      }
      dateBadgeHtml = `<span class="badge ${badgeClass}">${escapeHtml(dateInfo.text)}</span>`;
    }

    const statusBadgeHtml = `
      <span class="badge badge-status ${task.completed ? 'done' : 'pending'}">
        ${task.completed ? 'Done' : 'Not Done'}
      </span>
    `;

    li.innerHTML = `
      <div class="task-main">
        <label class="task-checkbox-label" title="Toggle status">
          <input 
            type="checkbox" 
            class="task-checkbox" 
            ${task.completed ? 'checked' : ''} 
            aria-label="Mark task as ${task.completed ? 'not done' : 'done'}"
          >
        </label>
        <div class="task-details">
          <span class="task-title">${escapeHtml(task.text)}</span>
          <div class="task-meta">
            ${statusBadgeHtml}
            ${dateBadgeHtml}
          </div>
        </div>
      </div>
      <div class="task-actions">
        <button type="button" class="action-btn edit-btn" title="Edit task" aria-label="Edit task">
          <svg class="action-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
        <button type="button" class="action-btn delete-btn" title="Delete task" aria-label="Delete task">
          <svg class="action-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
        </button>
      </div>
    `;

    // Event Listeners for Item Actions
    const checkbox = li.querySelector('.task-checkbox');
    checkbox.addEventListener('change', () => toggleTaskCompletion(task.id));

    const editBtn = li.querySelector('.edit-btn');
    editBtn.addEventListener('click', () => openEditModal(task.id));

    const deleteBtn = li.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', () => promptDeleteTask(task.id));

    taskList.appendChild(li);
  });
}

// ==========================================================================
// Task Operations
// ==========================================================================
function addTask(text, dueDate, completed) {
  const newTask = {
    id: 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    text: text.trim(),
    dueDate: dueDate || '',
    completed: Boolean(completed),
    createdAt: Date.now()
  };

  // Prepend to top of list
  tasks.unshift(newTask);
  saveTasks();
  renderTasks();
}

function toggleTaskCompletion(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  task.completed = !task.completed;
  saveTasks();
  renderTasks();
}

function updateTask(id, text, dueDate, completed) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  task.text = text.trim();
  task.dueDate = dueDate || '';
  task.completed = Boolean(completed);

  saveTasks();
  renderTasks();
}

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  saveTasks();
  renderTasks();
}

// ==========================================================================
// Edit Modal Logic
// ==========================================================================
function openEditModal(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  editTaskIdInput.value = task.id;
  editTaskTextInput.value = task.text;
  editTaskDueDateInput.value = task.dueDate || '';
  editTaskStatusSelect.value = task.completed ? 'completed' : 'pending';

  editModal.hidden = false;
  editTaskTextInput.focus();
}

function closeEditModal() {
  editModal.hidden = true;
  editTaskForm.reset();
}

// ==========================================================================
// Delete Confirmation Modal Logic
// ==========================================================================
function promptDeleteTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  taskToDeleteId = id;
  deleteTaskPreview.textContent = `"${task.text}"`;
  confirmModal.hidden = false;
  confirmDeleteBtn.focus();
}

function closeConfirmModal() {
  confirmModal.hidden = true;
  taskToDeleteId = null;
}

function handleConfirmDelete() {
  if (taskToDeleteId) {
    deleteTask(taskToDeleteId);
  }
  closeConfirmModal();
}

// ==========================================================================
// Event Listeners
// ==========================================================================

// Add Task Form Submit
addTaskForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = taskTextInput.value;
  const dueDate = taskDueDateInput.value;
  const isCompleted = taskStatusSelect.value === 'completed';

  if (!text.trim()) return;

  addTask(text, dueDate, isCompleted);

  // Reset form
  addTaskForm.reset();
  taskStatusSelect.value = 'pending';
  taskTextInput.focus();
});

// Edit Task Form Submit
editTaskForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const id = editTaskIdInput.value;
  const text = editTaskTextInput.value;
  const dueDate = editTaskDueDateInput.value;
  const isCompleted = editTaskStatusSelect.value === 'completed';

  if (!text.trim()) return;

  updateTask(id, text, dueDate, isCompleted);
  closeEditModal();
});

// Edit Modal Close Buttons
closeEditModalBtn.addEventListener('click', closeEditModal);
cancelEditBtn.addEventListener('click', closeEditModal);

// Confirm Modal Buttons
closeConfirmModalBtn.addEventListener('click', closeConfirmModal);
cancelDeleteBtn.addEventListener('click', closeConfirmModal);
confirmDeleteBtn.addEventListener('click', handleConfirmDelete);

// Search & Clear Search
searchInput.addEventListener('input', renderTasks);
clearSearchBtn.addEventListener('click', () => {
  searchInput.value = '';
  renderTasks();
  searchInput.focus();
});

// Close modals when clicking outside or pressing Escape
window.addEventListener('click', (e) => {
  if (e.target === editModal) closeEditModal();
  if (e.target === confirmModal) closeConfirmModal();
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (!editModal.hidden) closeEditModal();
    if (!confirmModal.hidden) closeConfirmModal();
  }
});

// ==========================================================================
// Initialization
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  loadTasks();
  renderTasks();
});

