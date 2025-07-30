import { state, saveState } from './state.js';

// Initialize the default summary configuration if it doesn't exist
if (!state.summaryViewConfig) {
    state.summaryViewConfig = {
        columns: [], // We'll populate this on first load
        displayMode: 'icon' // 'icon' or 'data'
    };
}

export function initializeSummary() {
    // On first load, populate the default columns
    if (state.summaryViewConfig.columns.length === 0) {
        state.summaryViewConfig.columns = getAvailableColumns().map(c => c.id);
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

    // Add event listener for the button
    const configureBtn = document.getElementById('configure-view-btn');
    configureBtn.addEventListener('click', () => {
        populateConfigureViewModal();
        document.getElementById('configure-view-modal').style.display = 'block';
    });

    renderProjectMatrixTable();
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

    // Render Body
    let tbodyHTML = '';
    const projects = Object.entries(state.projectsData).filter(([id, proj]) => id !== 'main-template');

    projects.forEach(([projectId, project]) => {
        tbodyHTML += `<tr>`;
        tbodyHTML += `<td>${project.name}</td>`;

        selectedColumns.forEach(colId => {
            let cellData = findCellData(project, colId, allColumns);
            tbodyHTML += `<td>${cellData}</td>`;
        });

        tbodyHTML += `</tr>`;
    });

    tbody.innerHTML = projects.length > 0 ? tbodyHTML : `
        <tr>
            <td colspan="${selectedColumns.length + 1}" class="placeholder-cell">No projects to display.</td>
        </tr>
    `;
}

function findCellData(project, columnId, allColumns) {
    const column = allColumns.find(c => c.id === columnId);
    if (!column) return '';

    if (column.type === 'standard') {
        const headerIndex = project.headers.indexOf(column.name);
        if (headerIndex !== -1 && project.content.length > 0) {
            // For standard columns, we'll find the first non-empty value as a representative.
            // This might need refinement depending on the desired behavior for multi-value columns.
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

    return 'N/A'; // Return 'N/A' if no matching activity is found for this project
}

function populateConfigureViewModal() {
    const availableColumns = getAvailableColumns();
    const modalBody = document.querySelector('#configure-view-modal .modal-body');

    const columnSelectionHTML = `
        <div class="column-selection-container">
            <h4>Available Columns</h4>
            <div class="column-list">
                ${availableColumns.map(col => `
                    <div class="column-item">
                        <input type="checkbox" id="col-${col.id}" name="${col.id}" value="${col.name}" checked>
                        <label for="col-${col.id}">${col.name}</label>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    modalBody.innerHTML = columnSelectionHTML;
}

function getAvailableColumns() {
    const mainTemplateData = state.projectsData['main-template'];
    if (!mainTemplateData) {
        console.error("Main Template data not found in state.projectsData");
        return [];
    }

    // 1. Define a fixed set of identifier columns to always include.
    const identifierFields = ['Fase', 'ID', 'Responsable', 'Milestone'].map(header => ({
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

    container.innerHTML = `
        <div class="matrix-header">
            <h2>Project Matrix</h2>
            <div class="matrix-controls">
                <button id="configure-view-btn" class="btn">✏️ Configure View</button>
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

function createExecutiveOverview() {
    const container = document.createElement('div');
    container.className = 'executive-overview';

    // Placeholder data - we will make this dynamic later
    const totalProjects = Object.keys(state.projectsData).length - 1; // Exclude main template
    const onTrack = 3;
    const atRisk = 8;
    const behind = 1;
    const blocked = 5;
    const dueThisWeek = 7;

    container.innerHTML = `
        <div class="overview-header">
            <h2>Command Center</h2>
        </div>
        <div class="overview-grid">
            <div class="overview-card">
                <div class="card-value">${totalProjects}</div>
                <div class="card-label">Active Projects</div>
            </div>
            <div class="overview-card">
                <div class="card-value status-on-track">${onTrack}</div>
                <div class="card-label">On Track 🟢</div>
            </div>
            <div class="overview-card">
                <div class="card-value status-at-risk">${atRisk}</div>
                <div class="card-label">At Risk 🟡</div>
            </div>
            <div class="overview-card">
                <div class="card-value status-behind">${behind}</div>
                <div class="card-label">Behind 🔴</div>
            </div>
            <div class="overview-card critical">
                <div class="card-value">${blocked}</div>
                <div class="card-label">Blocked / Overdue</div>
            </div>
            <div class="overview-card">
                <div class="card-value">${dueThisWeek}</div>
                <div class="card-label">Due This Week</div>
            </div>
        </div>
    `;

    return container;
} 