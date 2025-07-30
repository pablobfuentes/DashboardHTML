import { state, saveState } from './state.js';

// Initialize the default summary configuration if it doesn't exist
if (!state.summaryViewConfig) {
    state.summaryViewConfig = {
        columns: [], // We'll populate this on first load
        displayMode: 'icon', // 'icon' or 'data'
        filters: {
            status: 'all',
            owner: 'all',
            dueDate: 'all'
        },
        savedViews: {
            'Default View': [],
            'Logistics View': ['plaza', 'localidad', 'material-en-almacen', 'material-en-sitio'],
            'Finance View': ['firma-sow', 'requisitos-previos', 'ventana', 'cierre']
        }
    };
}

export function initializeSummary() {
    // On first load, populate the default columns
    if (state.summaryViewConfig.columns.length === 0) {
        const availableColumns = getAvailableColumns();
        // Set default columns to include key identifiers and a few milestone activities
        const defaultColumns = availableColumns
            .filter(col => ['plaza', 'localidad', 'responsable'].includes(col.id))
            .map(col => col.id);
        
        // Add first 3 activity columns as examples
        const activityColumns = availableColumns
            .filter(col => col.type === 'activity')
            .slice(0, 3)
            .map(col => col.id);
        
        state.summaryViewConfig.columns = [...defaultColumns, ...activityColumns];
        saveState();
    }
}

export function renderSummaryView() {
    const summaryContainer = document.getElementById('summary-view');
    if (!summaryContainer) return;

    // Clear previous content
    summaryContainer.innerHTML = '';

    const executiveOverview = createExecutiveOverview();
    const projectMatrix = createProjectMatrix();

    summaryContainer.appendChild(executiveOverview);
    summaryContainer.appendChild(projectMatrix);

    const configureModal = createConfigureViewModal();
    summaryContainer.appendChild(configureModal);

    // Add event listeners
    setupEventListeners();

    renderProjectMatrixTable();
}

function setupEventListeners() {
    // Configure view button
    const configureBtn = document.getElementById('configure-view-btn');
    if (configureBtn) {
        configureBtn.addEventListener('click', () => {
            populateConfigureViewModal();
            document.getElementById('configure-view-modal').style.display = 'block';
        });
    }

    // Display mode toggle
    const displayModeToggle = document.getElementById('display-mode-toggle');
    if (displayModeToggle) {
        displayModeToggle.checked = state.summaryViewConfig.displayMode === 'data';
        displayModeToggle.addEventListener('change', (e) => {
            state.summaryViewConfig.displayMode = e.target.checked ? 'data' : 'icon';
            saveState();
            renderProjectMatrixTable();
        });
    }

    // Filter dropdowns
    const statusFilter = document.getElementById('status-filter');
    if (statusFilter) {
        statusFilter.value = state.summaryViewConfig.filters.status;
        statusFilter.addEventListener('change', (e) => {
            state.summaryViewConfig.filters.status = e.target.value;
            saveState();
            renderProjectMatrixTable();
        });
    }

    const ownerFilter = document.getElementById('owner-filter');
    if (ownerFilter) {
        ownerFilter.value = state.summaryViewConfig.filters.owner;
        ownerFilter.addEventListener('change', (e) => {
            state.summaryViewConfig.filters.owner = e.target.value;
            saveState();
            renderProjectMatrixTable();
        });
    }

    const dueDateFilter = document.getElementById('due-date-filter');
    if (dueDateFilter) {
        dueDateFilter.value = state.summaryViewConfig.filters.dueDate;
        dueDateFilter.addEventListener('change', (e) => {
            state.summaryViewConfig.filters.dueDate = e.target.value;
            saveState();
            renderProjectMatrixTable();
        });
    }
}

function renderProjectMatrixTable() {
    const table = document.getElementById('summary-matrix-table');
    if (!table) return;

    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');

    // Get all available columns to map IDs back to names
    const allColumns = getAvailableColumns();
    const columnMap = new Map(allColumns.map(c => [c.id, c.name]));

    // Filter for selected columns
    const selectedColumns = state.summaryViewConfig.columns;

    // Render Header
    thead.innerHTML = `
        <tr>
            <th>Project Name</th>
            ${selectedColumns.map(colId => `<th>${columnMap.get(colId) || colId}</th>`).join('')}
        </tr>
    `;

    // Get filtered projects
    const projects = getFilteredProjects();

    // Render Body
    let tbodyHTML = '';
    
    projects.forEach(([projectId, project]) => {
        tbodyHTML += `<tr>`;
        tbodyHTML += `<td>${project.name}</td>`;

        selectedColumns.forEach(colId => {
            const cellData = findCellData(project, colId, allColumns);
            const cellContent = renderCellContent(cellData, colId, allColumns, project);
            const cellStatusClass = getCellStatusClass(cellData);
            tbodyHTML += `<td class="${cellStatusClass}">${cellContent}</td>`;
        });

        tbodyHTML += `</tr>`;
    });

    tbody.innerHTML = projects.length > 0 ? tbodyHTML : `
        <tr>
            <td colspan="${selectedColumns.length + 1}" class="placeholder-cell">No projects match the current filters.</td>
        </tr>
    `;
}

function getFilteredProjects() {
    const projects = Object.entries(state.projectsData).filter(([id, proj]) => id !== 'main-template');
    const filters = state.summaryViewConfig.filters;
    
    return projects.filter(([projectId, project]) => {
        // Status filter
        if (filters.status !== 'all') {
            const hasMatchingStatus = hasProjectStatus(project, filters.status);
            if (!hasMatchingStatus) return false;
        }
        
        // Owner filter
        if (filters.owner !== 'all') {
            const hasMatchingOwner = hasProjectOwner(project, filters.owner);
            if (!hasMatchingOwner) return false;
        }
        
        // Due date filter
        if (filters.dueDate !== 'all') {
            const hasMatchingDueDate = hasProjectDueDate(project, filters.dueDate);
            if (!hasMatchingDueDate) return false;
        }
        
        return true;
    });
}

function hasProjectStatus(project, statusFilter) {
    const statusIndex = project.headers.findIndex(h => h.toLowerCase() === 'status');
    if (statusIndex === -1) return true;
    
    const projectStatuses = project.content.map(row => row[statusIndex]).filter(s => s);
    
    switch (statusFilter) {
        case 'behind':
            return projectStatuses.some(s => s === 'pendiente' || s === 'atrasado');
        case 'at-risk':
            return projectStatuses.some(s => s === 'en proceso' || s === 'en progreso');
        case 'on-track':
            return projectStatuses.every(s => s === 'completo');
        default:
            return true;
    }
}

function hasProjectOwner(project, ownerFilter) {
    const responsableIndex = project.headers.findIndex(h => h.toLowerCase() === 'responsable');
    if (responsableIndex === -1) return true;
    
    const projectOwners = project.content.map(row => row[responsableIndex]).filter(o => o);
    return projectOwners.some(owner => owner.toLowerCase().includes(ownerFilter.toLowerCase()));
}

function hasProjectDueDate(project, dueDateFilter) {
    const fechaIndex = project.headers.findIndex(h => h.toLowerCase().includes('fecha esperada'));
    if (fechaIndex === -1) return true;
    
    const today = new Date();
    const thisWeekEnd = new Date(today);
    thisWeekEnd.setDate(today.getDate() + 7);
    
    const nextWeekEnd = new Date(today);
    nextWeekEnd.setDate(today.getDate() + 14);
    
    const projectDates = project.content.map(row => {
        const dateStr = row[fechaIndex];
        if (!dateStr) return null;
        return parseCustomDate(dateStr);
    }).filter(d => d);
    
    switch (dueDateFilter) {
        case 'this-week':
            return projectDates.some(date => date >= today && date <= thisWeekEnd);
        case 'next-week':
            return projectDates.some(date => date > thisWeekEnd && date <= nextWeekEnd);
        case 'overdue':
            return projectDates.some(date => date < today);
        default:
            return true;
    }
}

function parseCustomDate(dateStr) {
    // Parse date in format "dd-Mon-yy" or "dd-Mmm-yy"
    const match = dateStr.match(/(\d{1,2})-([A-Za-z]{3})-(\d{2})/);
    if (!match) return null;
    
    const [, day, month, year] = match;
    const monthMap = {
        'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
        'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
    };
    
    const monthIndex = monthMap[month];
    if (monthIndex === undefined) return null;
    
    const fullYear = 2000 + parseInt(year);
    return new Date(fullYear, monthIndex, parseInt(day));
}

function getCellStatusClass(cellData) {
    if (!cellData || typeof cellData !== 'string') return '';
    
    const status = cellData.toLowerCase();
    if (status === 'pendiente' || status === 'atrasado') {
        return 'status-behind';
    } else if (status === 'en proceso' || status === 'en progreso') {
        return 'status-at-risk';
    }
    return '';
}

function renderCellContent(cellData, columnId, allColumns, project) {
    const column = allColumns.find(c => c.id === columnId);
    const displayMode = state.summaryViewConfig.displayMode;
    
    if (!cellData || cellData === '') return '';
    
    if (displayMode === 'icon' && column && column.type === 'activity') {
        return renderStatusIcon(cellData);
    } else if (displayMode === 'data' && column && column.type === 'activity') {
        // In data view, check if there's evidence text for this activity
        const evidenceText = getEvidenceTextForActivity(project, column.name);
        if (evidenceText && evidenceText.trim() !== '') {
            return escapeHtml(evidenceText);
        } else {
            return escapeHtml(String(cellData));
        }
    } else {
        return escapeHtml(String(cellData));
    }
}

function renderStatusIcon(status) {
    const statusLower = status.toLowerCase();
    let icon, color, tooltip;
    
    if (statusLower === 'completo') {
        icon = '✓';
        color = '#28a745';
        tooltip = `Completo | ${status}`;
    } else if (statusLower === 'en proceso' || statusLower === 'en progreso') {
        icon = '!';
        color = '#ffc107';
        tooltip = `En Proceso | ${status}`;
    } else if (statusLower === 'pendiente' || statusLower === 'atrasado') {
        icon = '✗';
        color = '#dc3545';
        tooltip = `Pendiente/Atrasado | ${status}`;
    } else {
        icon = '?';
        color = '#6c757d';
        tooltip = `Estado: ${status}`;
    }
    
    return `<span class="status-icon" style="color: ${color}; font-weight: bold;" title="${tooltip}">${icon}</span>`;
}

function getEvidenceTextForActivity(project, activityName) {
    const actividadIndex = project.headers.findIndex(h => h.toLowerCase() === 'actividad');
    const evidenciaIndex = project.headers.findIndex(h => h.toLowerCase() === 'evidencia');
    
    if (actividadIndex === -1 || evidenciaIndex === -1) return '';
    
    console.log(`Looking for evidence text for activity: ${activityName} in project: ${project.name || 'unknown'}`);
    
    // Find the row that matches this activity
    for (const row of project.content) {
        if (row[actividadIndex] && row[actividadIndex].trim() === activityName) {
            const evidenceData = row[evidenciaIndex];
            
            console.log(`Found matching row, evidence data:`, evidenceData);
            
            // Handle different evidence data formats
            if (!evidenceData) return '';
            
            try {
                // Try to parse as JSON (for evidence state)
                const parsed = JSON.parse(evidenceData);
                if (parsed && typeof parsed === 'object') {
                    console.log(`Parsed evidence state:`, parsed);
                    // Check if this evidence state has text content
                    if (parsed.textContent && typeof parsed.textContent === 'string') {
                        console.log(`Found text content: ${parsed.textContent}`);
                        return parsed.textContent;
                    }
                    // This is evidence state without text content
                    console.log(`No text content found in evidence state`);
                    return '';
                }
            } catch (e) {
                // Not JSON, treat as text content
                console.log(`Not JSON, treating as text: ${evidenceData}`);
                return evidenceData;
            }
            
            // If it's a string but not JSON, return it as text
            if (typeof evidenceData === 'string') {
                console.log(`String evidence data: ${evidenceData}`);
                return evidenceData;
            }
        }
    }
    
    console.log(`No matching activity found for: ${activityName}`);
    return '';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function findCellData(project, columnId, allColumns) {
    const column = allColumns.find(c => c.id === columnId);
    if (!column) return '';

    if (column.type === 'standard') {
        const headerIndex = project.headers.findIndex(h => h.toLowerCase() === column.name.toLowerCase());
        if (headerIndex !== -1 && project.content.length > 0) {
            // For standard columns, find the first non-empty value
            for (let i = 0; i < project.content.length; i++) {
                const cellValue = project.content[i][headerIndex];
                if (cellValue !== null && cellValue !== undefined && String(cellValue).trim() !== '') {
                    return cellValue;
                }
            }
            return '';
        }
    } else if (column.type === 'activity') {
        const activityIndex = project.headers.findIndex(h => h.toLowerCase() === 'actividad');
        const statusIndex = project.headers.findIndex(h => h.toLowerCase() === 'status');
        
        if (activityIndex !== -1 && statusIndex !== -1) {
            for (const row of project.content) {
                // Find the row that matches this activity column
                if (row[activityIndex] && row[activityIndex].trim() === column.name) {
                    return row[statusIndex] || ''; // Return the status from that row
                }
            }
        }
    }

    return '';
}

function populateConfigureViewModal() {
    const availableColumns = getAvailableColumns();
    const modalBody = document.querySelector('#configure-view-modal .modal-body');
    const selectedColumns = state.summaryViewConfig.columns;

    const columnSelectionHTML = `
        <div class="column-selection-container">
            <h4>Available Columns</h4>
            <div class="column-list">
                ${availableColumns.map(col => `
                    <div class="column-item">
                        <input type="checkbox" id="col-${col.id}" name="${col.id}" value="${col.name}" 
                               ${selectedColumns.includes(col.id) ? 'checked' : ''}>
                        <label for="col-${col.id}">${col.name}</label>
                    </div>
                `).join('')}
            </div>
        </div>
        <div class="saved-views-container">
            <h4>Saved Views</h4>
            <div class="saved-views-list">
                ${Object.keys(state.summaryViewConfig.savedViews).map(viewName => `
                    <button class="saved-view-btn" data-view="${viewName}">${viewName}</button>
                `).join('')}
            </div>
            <div class="save-view-section">
                <input type="text" id="new-view-name" placeholder="Enter view name">
                <button id="save-current-view">Save Current View</button>
            </div>
        </div>
    `;

    modalBody.innerHTML = columnSelectionHTML;
    
    // Add event listeners for saved views
    document.querySelectorAll('.saved-view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const viewName = btn.dataset.view;
            const viewColumns = state.summaryViewConfig.savedViews[viewName];
            
            // Update checkboxes
            document.querySelectorAll('#configure-view-modal .column-list input[type="checkbox"]').forEach(checkbox => {
                checkbox.checked = viewColumns.includes(checkbox.name);
            });
        });
    });
    
    // Add event listener for save view button
    const saveViewBtn = document.getElementById('save-current-view');
    if (saveViewBtn) {
        saveViewBtn.addEventListener('click', () => {
            const viewName = document.getElementById('new-view-name').value.trim();
            if (viewName) {
                const selectedColumns = [];
                document.querySelectorAll('#configure-view-modal .column-list input[type="checkbox"]:checked').forEach(checkbox => {
                    selectedColumns.push(checkbox.name);
                });
                
                state.summaryViewConfig.savedViews[viewName] = selectedColumns;
                saveState();
                
                // Refresh the modal
                populateConfigureViewModal();
            }
        });
    }
}

function getAvailableColumns() {
    const mainTemplateData = state.projectsData['main-template'];
    if (!mainTemplateData) {
        console.error("Main Template data not found in state.projectsData");
        return [];
    }

    // 1. Define identifier columns from the main template headers
    const identifierFields = mainTemplateData.headers
        .filter(header => ['Plaza', 'Localidad', 'Responsable', 'Fase', 'ID', 'Milestone'].includes(header))
        .map(header => ({
            id: header.toLowerCase().replace(/\s+/g, '-'),
            name: header,
            type: 'standard'
        }));

    // 2. Get unique "Actividad" values from all projects to use as columns.
    const activitySet = new Set();
    const activityIndex = mainTemplateData.headers.findIndex(h => h.toLowerCase() === 'actividad');
    
    if (activityIndex !== -1) {
        Object.values(state.projectsData).forEach(project => {
            if (project.name === 'Main Template') return; // Skip template project
            project.content.forEach(row => {
                const activity = row[activityIndex];
                if (activity && activity.trim() !== '') {
                    activitySet.add(activity.trim());
                }
            });
        });
    }

    const activityFields = Array.from(activitySet).map(activity => ({
        id: `activity-${activity.toLowerCase().replace(/\s+/g, '-')}`,
        name: activity,
        type: 'activity'
    }));

    return [...identifierFields, ...activityFields];
}

function createConfigureViewModal() {
    const modal = document.createElement('div');
    modal.id = 'configure-view-modal';
    modal.className = 'modal';
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Configure Project Matrix View</h3>
                <button class="close-modal">&times;</button>
            </div>
            <div class="modal-body">
                <p>Select and reorder columns to display in the matrix.</p>
                <!-- Configuration options will go here -->
            </div>
            <div class="modal-footer">
                <button id="cancel-view-config" class="btn btn-secondary">Cancel</button>
                <button id="apply-view-config" class="btn btn-primary">Apply</button>
            </div>
        </div>
    `;

    // Add event listener to close modal
    modal.addEventListener('click', (e) => {
        if (e.target.matches('.close-modal, #cancel-view-config, .modal')) {
            modal.style.display = 'none';
        } else if (e.target.matches('#apply-view-config')) {
            handleApplyViewConfig();
            modal.style.display = 'none';
        }
    });

    return modal;
}

function handleApplyViewConfig() {
    const selectedColumns = [];
    const checkboxes = document.querySelectorAll('#configure-view-modal .column-list input[type="checkbox"]:checked');
    checkboxes.forEach(checkbox => {
        selectedColumns.push(checkbox.name);
    });

    // Save to state
    state.summaryViewConfig.columns = selectedColumns;
    saveState();

    // Re-render the table with the new configuration
    renderProjectMatrixTable();
}

function createProjectMatrix() {
    const container = document.createElement('div');
    container.className = 'project-matrix-container';

    // Get unique owners from project data
    const owners = getUniqueOwners();

    container.innerHTML = `
        <div class="matrix-header">
            <h2>Deep Dive - Customizable Project Matrix</h2>
            <div class="matrix-controls">
                <div class="display-mode-toggle">
                    <label for="display-mode-toggle">
                        <input type="checkbox" id="display-mode-toggle" ${state.summaryViewConfig.displayMode === 'data' ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                        <span class="toggle-label">Data View</span>
                    </label>
                </div>
                <button id="configure-view-btn" class="btn">✏️ Configure View</button>
            </div>
        </div>
        <div class="matrix-filters">
            <div class="filter-group">
                <label for="status-filter">Status:</label>
                <select id="status-filter">
                    <option value="all">All Projects</option>
                    <option value="behind">Behind 🔴</option>
                    <option value="at-risk">At Risk 🟡</option>
                    <option value="on-track">On Track 🟢</option>
                </select>
            </div>
            <div class="filter-group">
                <label for="owner-filter">Owner:</label>
                <select id="owner-filter">
                    <option value="all">All</option>
                    ${owners.map(owner => `<option value="${owner.toLowerCase()}">${owner}</option>`).join('')}
                </select>
            </div>
            <div class="filter-group">
                <label for="due-date-filter">Due Date:</label>
                <select id="due-date-filter">
                    <option value="all">All</option>
                    <option value="this-week">This Week</option>
                    <option value="next-week">Next Week</option>
                    <option value="overdue">Overdue</option>
                </select>
            </div>
        </div>
        <div class="matrix-table-wrapper">
            <table id="summary-matrix-table" class="project-table">
                <!-- Table headers and body will be dynamically generated -->
                <thead></thead>
                <tbody>
                    <tr>
                        <td colspan="10" class="placeholder-cell">Configure view to select columns and display project data.</td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;

    return container;
}

function getUniqueOwners() {
    const owners = new Set();
    const projects = Object.entries(state.projectsData).filter(([id, proj]) => id !== 'main-template');
    
    projects.forEach(([projectId, project]) => {
        const responsableIndex = project.headers.findIndex(h => h.toLowerCase() === 'responsable');
        if (responsableIndex !== -1) {
            project.content.forEach(row => {
                const owner = row[responsableIndex];
                if (owner && owner.trim() !== '') {
                    owners.add(owner.trim());
                }
            });
        }
    });
    
    return Array.from(owners).sort();
}

function createExecutiveOverview() {
    const container = document.createElement('div');
    container.className = 'executive-overview';

    // Calculate real statistics from project data
    const projects = Object.entries(state.projectsData).filter(([id, proj]) => id !== 'main-template');
    const stats = calculateProjectStatistics(projects);

    container.innerHTML = `
        <div class="overview-header">
            <h2>Command Center - Executive Overview</h2>
        </div>
        <div class="overview-grid">
            <div class="overview-card program-progress">
                <div class="card-value">${stats.programCompletion}%</div>
                <div class="card-label">Program Completion</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${stats.programCompletion}%"></div>
                </div>
            </div>
            <div class="overview-card">
                <div class="card-value">${stats.totalProjects}</div>
                <div class="card-label">Active Projects</div>
            </div>
            <div class="overview-card">
                <div class="card-value status-on-track">${stats.onTrack}</div>
                <div class="card-label">On Track 🟢</div>
            </div>
            <div class="overview-card">
                <div class="card-value status-at-risk">${stats.atRisk}</div>
                <div class="card-label">At Risk 🟡</div>
            </div>
            <div class="overview-card">
                <div class="card-value status-behind">${stats.behind}</div>
                <div class="card-label">Behind 🔴</div>
            </div>
        </div>
    `;

    return container;
}

function calculateProjectStatistics(projects) {
    let onTrack = 0;
    let atRisk = 0;
    let behind = 0;
    let totalActivities = 0;
    let completedActivities = 0;
    
    projects.forEach(([projectId, project]) => {
        const statusIndex = project.headers.findIndex(h => h.toLowerCase() === 'status');
        
        let projectStatus = 'unknown';
        let projectActivities = 0;
        let projectCompleted = 0;
        
        if (statusIndex !== -1) {
            const statuses = project.content.map(row => row[statusIndex]).filter(s => s);
            projectActivities = statuses.length;
            totalActivities += projectActivities;
            
            if (statuses.length > 0) {
                const hasPendiente = statuses.some(s => s.toLowerCase() === 'pendiente');
                const hasEnProceso = statuses.some(s => s.toLowerCase().includes('proceso'));
                const allCompleto = statuses.every(s => s.toLowerCase() === 'completo');
                
                // Count completed activities for program completion
                const completed = statuses.filter(s => s.toLowerCase() === 'completo').length;
                completedActivities += completed;
                
                if (hasPendiente) {
                    projectStatus = 'behind';
                    behind++;
                } else if (hasEnProceso) {
                    projectStatus = 'at-risk';
                    atRisk++;
                } else if (allCompleto) {
                    projectStatus = 'on-track';
                    onTrack++;
                }
            }
        }
    });
    
    // Calculate program completion percentage
    const programCompletion = totalActivities > 0 ? Math.round((completedActivities / totalActivities) * 100) : 0;
    
    return {
        totalProjects: projects.length,
        onTrack,
        atRisk,
        behind,
        programCompletion
    };
} 