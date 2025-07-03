// Logic for the Kanban board feature. 

import { state, saveState } from './state.js';

let sessionCompletedTasks = new Set();

export function initializeKanban() {
    populateProjectFilter();
    addKanbanEventListeners();
    renderKanbanBoard();
}

function populateProjectFilter() {
    const select = document.getElementById('kanban-project-filter');
    if (!select) return;

    // Clear existing options except for 'All Projects'
    select.innerHTML = '<option value="all">All Projects</option>';

    Object.values(state.projectsData).forEach(project => {
        const option = document.createElement('option');
        option.value = project.name;
        option.textContent = project.name;
        select.appendChild(option);
    });
}

function addKanbanEventListeners() {
    const projectFilter = document.getElementById('kanban-project-filter');
    const dateFilter = document.getElementById('kanban-due-date-filter');
    const clearButton = document.getElementById('kanban-clear-date-filter');

    if (projectFilter) {
        projectFilter.onchange = renderKanbanBoard;
    }

    if (dateFilter) {
        new Datepicker(dateFilter, {
            format: 'dd-M-yy',
            autohide: true,
        });
        dateFilter.addEventListener('changeDate', renderKanbanBoard);
    }

    if (clearButton) {
        clearButton.onclick = () => {
            if (dateFilter) {
                dateFilter.value = '';
                new Datepicker(dateFilter).destroy();
                new Datepicker(dateFilter, {
                    format: 'dd-M-yy',
                    autohide: true,
                });
            }
            if (projectFilter) {
                projectFilter.value = 'all';
            }
            renderKanbanBoard();
        };
    }
    
    // Drag and Drop listeners
    const board = document.getElementById('kanban-board');
    if (board && !board.dataset.listenersAttached) {
        board.addEventListener('dragstart', handleDragStart);
        board.addEventListener('dragend', handleDragEnd);
        board.addEventListener('dragover', handleDragOver);
        board.addEventListener('dragleave', handleDragLeave);
        board.addEventListener('drop', handleDrop);
        board.addEventListener('change', handleCheckboxChange);
        board.dataset.listenersAttached = 'true';
    }
}

// --- Drag and Drop Handlers ---

function handleDragStart(e) {
    if (e.target.classList.contains('kanban-card')) {
        e.target.classList.add('dragging');
        e.dataTransfer.setData('text/plain', e.target.dataset.taskId);
        e.dataTransfer.effectAllowed = 'move';
    }
}

function handleDragEnd(e) {
    if (e.target.classList.contains('kanban-card')) {
        e.target.classList.remove('dragging');
    }
}

function handleDragOver(e) {
    e.preventDefault();
    const column = e.target.closest('.kanban-column');
    if (column) {
        column.classList.add('drag-over');
    }
}

function handleDragLeave(e) {
    const column = e.target.closest('.kanban-column');
    if (column) {
        column.classList.remove('drag-over');
    }
}

function handleDrop(e) {
    e.preventDefault();
    const column = e.target.closest('.kanban-column');
    if (column) {
        column.classList.remove('drag-over');
        
        const taskId = e.dataTransfer.getData('text/plain');
        const newStatus = column.dataset.status;

        const { project, taskIndex, statusIndex, currentStatus } = findTaskById(taskId);
        
        if (project && project.content[taskIndex]) {
            project.content[taskIndex][statusIndex] = newStatus;

            if (currentStatus !== 'completo' && newStatus === 'completo') {
                sessionCompletedTasks.add(taskId);
            } else if (currentStatus === 'completo' && newStatus !== 'completo') {
                sessionCompletedTasks.delete(taskId);
            }

            saveState();
            renderKanbanBoard();
        }
    }
}

function handleCheckboxChange(e) {
    if (!e.target.matches('.kanban-card-title input[type="checkbox"]')) return;

    const card = e.target.closest('.kanban-card');
    if (!card) return;

    const taskId = card.dataset.taskId;
    const { project, taskIndex, statusIndex, currentStatus } = findTaskById(taskId);

    if (project && project.content[taskIndex]) {
        let newStatus = currentStatus;

        if (currentStatus === 'pendiente') {
            newStatus = 'en proceso';
        } else if (currentStatus === 'en proceso') {
            newStatus = 'completo';
            sessionCompletedTasks.add(taskId);
        } else if (currentStatus === 'completo') {
            newStatus = 'pendiente';
            sessionCompletedTasks.delete(taskId);
        }

        project.content[taskIndex][statusIndex] = newStatus;
        saveState();
        renderKanbanBoard();
    }
}

function findTaskById(taskId) {
    const parts = taskId.split('-');
    const taskIndex = parts.pop();
    const projectId = parts.join('-');
    const project = state.projectsData[projectId];
    if (project && project.content[taskIndex]) {
        const statusIndex = project.headers.indexOf('Status');
        const currentStatus = project.content[taskIndex][statusIndex].toLowerCase();
        return { project, taskIndex, projectId, statusIndex, currentStatus };
    }
    return {};
}

function renderKanbanBoard() {
    const board = document.getElementById('kanban-board');
    if (!board) return;

    const projectFilter = document.getElementById('kanban-project-filter').value;
    const dateFilter = document.getElementById('kanban-due-date-filter').value;

    const allTasks = getAllTasks();
    // Exclude completed tasks from the Kanban board unless they were completed in this session
    const activeTasks = allTasks.filter(task => {
        return task.status.toLowerCase() !== 'completo' || sessionCompletedTasks.has(task.id);
    });

    // Separate tasks. Filters only apply to 'pendiente' (To Do).
    const todoTasks = activeTasks.filter(task => task.status === 'pendiente');
    const otherTasks = activeTasks.filter(task => task.status !== 'pendiente');

    const filteredTodoTasks = todoTasks.filter(task => {
        const projectMatch = projectFilter === 'all' || task.projectName === projectFilter;
        let dateMatch = true;
        if (dateFilter && task.dueDate) {
            try {
                const filterDate = new Date(dateFilter.replace(/(\d{2})-([A-Za-z]{3})-(\d{2})/, '$2 $1, 20$3'));
                const taskDate = new Date(task.dueDate.replace(/(\d{2})-([A-Za-z]{3})-(\d{2})/, '$2 $1, 20$3'));
                dateMatch = filterDate.toDateString() === taskDate.toDateString();
            } catch(e) {
                dateMatch = false; // Invalid date format
            }
        } else if (dateFilter) {
            dateMatch = false; // If date filter is set, but task has no due date
        }
        return projectMatch && dateMatch;
    });
    
    const finalTasks = [...filteredTodoTasks, ...otherTasks];

    const columns = {
        'pendiente': { title: 'To Do', tasks: [] },
        'en proceso': { title: 'In Progress', tasks: [] },
        'completo': { title: 'Completed', tasks: [] },
    };

    finalTasks.forEach(task => {
        const status = task.status.toLowerCase();
        if (columns[status]) {
            columns[status].tasks.push(task);
        }
    });

    board.innerHTML = Object.entries(columns).map(([status, columnData]) => 
        createKanbanColumn(status, columnData.title, columnData.tasks)
    ).join('');
}

function getAllTasks() {
    const tasks = [];
    Object.entries(state.projectsData).forEach(([projectId, project]) => {
        if (!project.headers || !project.content) return;
        const headers = project.headers;
        const statusIndex = headers.indexOf('Status');
        const activityIndex = headers.indexOf('Actividad');
        const dateIndex = headers.indexOf('Fecha Esperada');
        const notesIndex = headers.indexOf('Comentario');

        if (statusIndex === -1 || activityIndex === -1) return;

        project.content.forEach((row, rowIndex) => {
            tasks.push({
                id: `${projectId}-${rowIndex}`,
                projectName: project.name,
                status: row[statusIndex] || 'pendiente',
                activity: row[activityIndex],
                dueDate: row[dateIndex] || '',
                notes: row[notesIndex] || '',
            });
        });
    });
    return tasks;
}

function createKanbanColumn(status, title, tasks) {
    return `
        <div class="kanban-column" data-status="${status}">
            <div class="kanban-column-header">
                <h3>${title}</h3>
            </div>
            ${tasks.map(createKanbanCard).join('')}
        </div>
    `;
}

function createKanbanCard(task) {
    return `
        <div class="kanban-card" draggable="true" data-task-id="${task.id}">
            <div class="kanban-card-header">
                <div class="kanban-card-title">
                    <input type="checkbox" ${task.status === 'completo' ? 'checked' : ''}>
                    <span class="kanban-card-project">${task.projectName}</span>
                </div>
                <span class="kanban-card-date">${task.dueDate}</span>
            </div>
            <div class="kanban-card-activity">${task.activity}</div>
            <textarea class="kanban-card-notes" placeholder="Add notes...">${task.notes}</textarea>
        </div>
    `;
} 