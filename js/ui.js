import { state, saveState } from './state.js';
import * as utils from './utils.js';
import { setupTimezoneHandlers, getTimezoneOffset } from './timezone.js';
import { createMilestonesTimeline } from './milestones.js';
import { createActionsCell } from './project-actions.js';

export function initializeUI() {
    // Clear any existing project tabs and panes before loading
    document.querySelectorAll('#tabs .project-tab').forEach(btn => btn.remove());
    document.querySelectorAll('#tab-content .project-pane').forEach(pane => pane.remove());

    const addProjectButton = document.getElementById('add-project-button');
    const tabsContainer = document.getElementById('tabs');
    const tabContentContainer = document.getElementById('tab-content');

    Object.keys(state.projectsData).forEach(projectId => {
        const project = state.projectsData[projectId];
        if (!project) return;
        
        const { tabButton, tabPane } = createProjectTab(project, projectId);
        tabsContainer.insertBefore(tabButton, addProjectButton);
        tabContentContainer.appendChild(tabPane);
        
        const projectTable = tabPane.querySelector('.project-table');
        if (projectTable) {
            renderTable(projectTable, project.headers, project.content, false);
        }
        updateProjectCompletion(projectId);
        updateCurrentStatus(projectId);
    });
    
    // Check if the first tab should be activated
    const firstTab = document.querySelector('#tabs .project-tab');
    if (firstTab) {
        firstTab.classList.add('active');
        const firstPaneId = firstTab.dataset.tab;
        const firstPane = document.getElementById(firstPaneId);
        if (firstPane) {
            firstPane.classList.add('active');
        }
    }
}

export function renderMainTemplate() {
    const mainTemplateTable = document.getElementById('main-template-table');
    if (mainTemplateTable) {
        renderTable(mainTemplateTable, state.currentTemplateHeaders, state.currentTemplateRows, true);
    }
}

export function renderTable(tableElement, headers, rows, isMainTemplate = false) {
    if (!tableElement) return; // Guard clause
    
    let thead = tableElement.querySelector('thead');
    let tbody = tableElement.querySelector('tbody');

    // Create thead and tbody if they don't exist
    if (!thead) {
        thead = document.createElement('thead');
        tableElement.appendChild(thead);
    }
    if (!tbody) {
        tbody = document.createElement('tbody');
        tableElement.appendChild(tbody);
    }

    // Clear existing content
    thead.innerHTML = '';
    tbody.innerHTML = '';

    // Create header row
    const headerRow = document.createElement('tr');
    if (isMainTemplate) { // Add empty corner for main template row headers
        const cornerTh = document.createElement('th');
        cornerTh.classList.add('corner-header'); // For future styling/use
        headerRow.appendChild(cornerTh);
    }
    headers.forEach((headerText, colIdx) => {
        const th = document.createElement('th');
        th.textContent = headerText;
        if (isMainTemplate) {
            th.dataset.colIndex = colIdx;
            th.classList.add('column-header');
            th.setAttribute('contenteditable', state.isEditMode);
        }
        headerRow.appendChild(th);
    });
    
    // Add Actions column for project tables
    if (!isMainTemplate) {
        const actionsTh = document.createElement('th');
        actionsTh.textContent = 'Actions';
        actionsTh.classList.add('actions-header');
        headerRow.appendChild(actionsTh);
    }
    
    thead.appendChild(headerRow);

    // Create rows
    rows.forEach((rowData, rowIdx) => {
        const tr = document.createElement('tr');
        tr.dataset.rowIndex = rowIdx; // Ensure all rows have an index

        if (isMainTemplate) {
            // Add row number header
            const rowHeaderTh = document.createElement('th');
            rowHeaderTh.textContent = rowIdx + 1; // 1-based numbering
            rowHeaderTh.dataset.rowIndex = rowIdx; // Store index for row actions
            rowHeaderTh.classList.add('row-header'); // Make row headers clickable in main template
            tr.appendChild(rowHeaderTh);
        }
        headers.forEach((header, colIndex) => {
            const td = document.createElement('td');
            td.dataset.colIndex = colIndex; // Add column index to all cells
            const isEditable = isMainTemplate ? state.isEditMode : !state.nonEditableColumns.includes(header);

            if (isEditable && (utils.isDateColumn(header) || utils.isExpectedDateColumn(header))) {
                td.classList.add('date-cell-td');
                td.innerHTML = `
                    <div class="date-cell-wrapper">
                        <div class="cell-content" contenteditable="true">${rowData[colIndex] !== undefined ? rowData[colIndex] : ''}</div>
                        <span class="calendar-icon">&#128197;</span>
                    </div>
                `;
            } else if (isEditable && utils.isDurationColumn(header)) {
                td.classList.add('duration-cell');
                td.textContent = rowData[colIndex] !== undefined ? rowData[colIndex] : '';
                td.setAttribute('contenteditable', 'true');
                td.setAttribute('data-column-type', 'duration');
            } else if (isEditable && utils.isDependencyColumn(header)) {
                td.classList.add('dependency-cell');
                td.textContent = rowData[colIndex] !== undefined ? rowData[colIndex] : '';
                td.setAttribute('contenteditable', 'true');
                td.setAttribute('data-column-type', 'dependency');
            } else if (isEditable && utils.isStatusColumn(header)) {
                td.classList.add('status-cell');
                const statusValue = rowData[colIndex] !== undefined ? rowData[colIndex] : '';
                td.innerHTML = renderStatusCell(statusValue);
                td.setAttribute('data-status', statusValue);
                td.setAttribute('contenteditable', 'false');
            } else if (utils.isCommentColumn(header)) {
                td.classList.add('comment-cell-new');
                const commentHistory = rowData[colIndex] !== undefined ? rowData[colIndex] : '';
                td.innerHTML = renderNewCommentCell(commentHistory);
                td.setAttribute('data-full-history', commentHistory);
                td.setAttribute('contenteditable', 'false');
            } else if (utils.isEvidenciaColumn(header)) {
                const evidenciaCell = createEvidenciaCell(isMainTemplate, rowData, colIndex);
                tr.appendChild(evidenciaCell);
                return; 
            } else if (isEditable && utils.isNewCommentColumn(header)) {
                td.className = 'new-comment-cell';
                td.innerHTML = `
                    <div class="new-comment-wrapper">
                        <div class="comment-content" contenteditable="true" placeholder="Add a comment...">${rowData[colIndex] !== undefined ? rowData[colIndex] : ''}</div>
                        <button type="button" class="submit-comment-icon" title="Save comment">💾</button>
                    </div>
                `;
                td.setAttribute('contenteditable', 'false');
            } else {
                td.textContent = rowData[colIndex] !== undefined ? rowData[colIndex] : '';
                td.setAttribute('contenteditable', isEditable);
            }
            
            tr.appendChild(td);
        });
        
        // Add Actions cell for project tables
        if (!isMainTemplate) {
            const projectId = tableElement.closest('.project-pane')?.id;
            const actionsCell = createActionsCell(projectId, rowIdx, isMainTemplate);
            tr.appendChild(actionsCell);
        }
        
        tbody.appendChild(tr);
    });
    applyColumnWidths(tableElement, headers, isMainTemplate);
    const projectId = tableElement.closest('.project-pane')?.id;
    updateProjectCompletion(projectId);
    updateCurrentStatus(projectId);
}

export function renderCommentCell(commentHistory, isExpanded = false) {
    if (!commentHistory || commentHistory.trim() === '') return '';
    const lines = commentHistory.split('\n').map(line => utils.formatCommentLine(line));
    return isExpanded ? lines.join('\n') : (lines[0] || '');
};

export function renderNewCommentCell(commentHistory) {
    const latestComment = getLatestComment(commentHistory);
    const hasComments = latestComment && latestComment.trim() !== '';
    
    return `
        <div class="comment-cell-content ${hasComments ? '' : 'empty'}" title="Click to view and edit comments">
            ${hasComments ? latestComment : 'No comments'}
        </div>
        <button class="comment-add-btn" title="Add comment">+</button>
    `;
}

function getLatestComment(commentHistory) {
    if (!commentHistory || commentHistory.trim() === '') return '';
    
    // Parse comment history to get the latest comment
    const lines = commentHistory.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) return '';
    
    // Look for the most recent comment (should be at the top after our format)
    const latestLine = lines[0];
    
    // Extract just the comment text (remove date if present)
    // Format should be: "dd-mmm: comment text"
    const match = latestLine.match(/^\d{1,2}-[A-Za-z]{3}:\s*(.+)$/);
    return match ? match[1] : latestLine;
}

export function renderStatusCell(status) {
    if (!status || status.trim() === '') {
        return '<span class="status-tag status-empty"></span>';
    }
    const statusClass = utils.getStatusClass(status);
    return `<span class="status-tag ${statusClass}">${status}</span>`;
};

export function createProjectTab(projectData, projectId) {
    const tabButton = document.createElement('button');
    tabButton.className = 'project-tab';
    tabButton.setAttribute('data-tab', projectId);
    tabButton.innerHTML = `
        <span class="project-name-editable" contenteditable="true">${projectData.name}</span>
        <span class="delete-tab-icon">&times;</span>
    `;
    
    const tabPane = document.createElement('div');
    tabPane.id = projectId;
    tabPane.className = 'project-pane';
    
    // Create dashboard structure
    const dashboardHTML = `
        <h2 class="project-name-editable" contenteditable="true" data-project-id="${projectId}">${projectData.name}</h2>
        <div class="project-dashboard">
            <div class="dashboard-top">
                <div class="completion-percentage">
                    <div class="percentage-number">0%</div>
                    <div class="percentage-label">Project Completion</div>
                    <div class="time-display">
                        <span class="current-time">--:--</span>
                        <span class="timezone-offset">UTC+0</span>
                        <button class="timezone-select" title="Select Timezone">🌐</button>
                    </div>
                </div>
                <div class="quick-info-right">
                    <div class="info-tabs-vertical">
                        <button class="info-tab-vertical active" data-tab-class="info-content-pane">
                            <i class="info-icon">ⓘ</i>
                        </button>
                        <button class="info-tab-vertical" data-tab-class="contacts-content-pane">
                            <i class="contact-icon">👤</i>
                        </button>
                    </div>
                    <div class="info-content-container">
                        <div class="info-content active info-content-pane">
                            <div class="info-tables-container">
                                <div class="info-table-section">
                                    <h3>Evidence</h3>
                                    <div class="evidence-fields">
                                        <div class="evidence-field">
                                            <label>Solicitud de Inversion:</label>
                                            <input type="text" class="evidence-input" data-field="solicitudInversion" value="${projectData.evidence?.solicitudInversion || ''}">
                                        </div>
                                        <div class="evidence-field">
                                            <label>Orden de Compra:</label>
                                            <input type="text" class="evidence-input" data-field="ordenCompra" value="${projectData.evidence?.ordenCompra || ''}">
                                        </div>
                                        <div class="evidence-field">
                                            <label>Fecha de Implementacion:</label>
                                            <input type="text" class="evidence-input" data-field="fechaImplementacion" value="${projectData.evidence?.fechaImplementacion || ''}">
                                        </div>
                                    </div>
                                </div>
                                <div class="info-table-section">
                                    <div class="status-and-notes">
                                        <div class="status-section">
                                            <h3>Current Status</h3>
                                            <table>
                                                <tr>
                                                    <th>Next Milestone</th>
                                                    <td>--</td>
                                                </tr>
                                                <tr>
                                                    <th>Current Activity</th>
                                                    <td>--</td>
                                                </tr>
                                            </table>
                                        </div>
                                        <div class="notes-section">
                                            <h3>Notes</h3>
                                            <div class="additional-notes">
                                                <textarea class="additional-notes-input" placeholder="Add notes here...">${projectData.additionalNotes || ''}</textarea>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="info-content contacts-content-pane">
                            <table class="project-contacts-table">
                                <tr>
                                    <td colspan="5" class="address-row" contenteditable="true">
                                        ${projectData.quickInfoContacts?.address || 'Address: --'}
                                    </td>
                                </tr>
                                <tr>
                                    <th>Position</th>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Phone</th>
                                    <th class="action-column"></th>
                                </tr>
                                ${(projectData.quickInfoContacts?.contacts || []).map((contact, index, arr) => `
                                    <tr data-contact-index="${index}" ${index === arr.length - 1 ? 'class="last-contact-row"' : ''}>
                                        <td contenteditable="true">${contact.position || ''}</td>
                                        <td contenteditable="true">${contact.name || ''}</td>
                                        <td contenteditable="true">${contact.email || ''}</td>
                                        <td contenteditable="true">${contact.phone || ''}</td>
                                        <td class="action-column">
                                            <button class="delete-contact-row-btn" data-contact-index="${index}" title="Delete row">🗑️</button>
                                            ${index === arr.length - 1 ? '<button class="add-contact-row-btn" title="Add new row">➕</button>' : ''}
                                        </td>
                                    </tr>
                                `).join('')}
                            </table>
                        </div>
                    </div>
                </div>
            </div>
            <div class="analytics-section">
                <div class="analytics-header">
                    <span>Project Analytics</span>
                    <span class="toggle-icon-analytics">▼</span>
                </div>
                <div class="analytics-content" style="display: none;">
                    <div class="analytics-tabs">
                        <button class="analytics-tab active" data-analytics-view="milestones">Timeline</button>
                        <button class="analytics-tab" data-analytics-view="gantt">Gantt Chart</button>
                    </div>
                    <div class="analytics-view-container">
                        <div class="analytics-view active" id="milestones-view-${projectId}">
                            <div class="milestones-container">
                                <!-- Timeline will be rendered here -->
                            </div>
                        </div>
                        <div class="analytics-view" id="gantt-view-${projectId}">
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="timezone-modal">
            <div class="timezone-modal-content">
                <div class="timezone-modal-header">
                    <div class="timezone-modal-title">Select Timezone Offset</div>
                    <button class="timezone-modal-close">&times;</button>
                </div>
                <div class="timezone-input-group">
                    <input type="number" class="timezone-input" min="-12" max="14" step="1" placeholder="Enter offset (e.g. 2 for UTC+2)">
                    <button class="timezone-apply-btn">Apply</button>
                </div>
            </div>
        </div>
        <table class="project-table">
            <thead>
                <tr>
                </tr>
            </thead>
            <tbody>
            </tbody>
        </table>
    `;
    
    tabPane.innerHTML = dashboardHTML;
    
    // Initialize the project table
    const projectTable = tabPane.querySelector('.project-table');
    renderTable(projectTable, projectData.headers, projectData.content, false);
    
    // Initialize timezone functionality
    updateTime(projectId);
    
    // Initialize current status
    updateCurrentStatus(projectId);
    
    // Initialize project completion
    updateProjectCompletion(projectId);
    
    return { tabButton, tabPane };
}

export function createEvidenciaCell(isMain = false, rowData = null, colIndex = -1) {
    const cell = document.createElement('td');
    cell.classList.add('evidencia-cell');
    
    if (isMain) {
        // Create checkbox for main template
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.classList.add('evidencia-checkbox');
        
        // Create toggle switch
        const toggleContainer = document.createElement('label');
        toggleContainer.classList.add('evidence-type-toggle');
        
        const toggleInput = document.createElement('input');
        toggleInput.type = 'checkbox';
        
        const slider = document.createElement('span');
        slider.classList.add('toggle-slider');
        
        const labels = document.createElement('div');
        labels.classList.add('toggle-labels');
        labels.innerHTML = '<span>File</span><span>Text</span>';
        
        toggleContainer.appendChild(toggleInput);
        toggleContainer.appendChild(slider);
        toggleContainer.appendChild(labels);
        
        // Event listeners
        checkbox.addEventListener('change', function() {
            const rowIdx = parseInt(cell.closest('tr').querySelector('.row-header').dataset.rowIndex);
            if (rowIdx >= 0 && rowIdx < state.currentTemplateRows.length) {
                // Store both checkbox and toggle state
                const toggleState = {
                    required: this.checked,
                    isText: toggleInput.checked
                };
                state.currentTemplateRows[rowIdx][colIndex] = JSON.stringify(toggleState);
                saveState();
                
                // Update visibility of toggle
                toggleContainer.classList.toggle('visible', this.checked);
                
                // Update project cells
                updateProjectCellsVisibility();
            }
        });
        
        toggleInput.addEventListener('change', function() {
            const rowIdx = parseInt(cell.closest('tr').querySelector('.row-header').dataset.rowIndex);
            if (rowIdx >= 0 && rowIdx < state.currentTemplateRows.length) {
                // Update the stored state with new toggle value
                const currentState = JSON.parse(state.currentTemplateRows[rowIdx][colIndex] || '{"required":false,"isText":false}');
                currentState.isText = this.checked;
                state.currentTemplateRows[rowIdx][colIndex] = JSON.stringify(currentState);
                saveState();
                
                // Update project cells
                updateProjectCellsVisibility();
            }
        });
        
        // Set initial states from data
        if (rowData && colIndex >= 0) {
            try {
                const savedState = JSON.parse(rowData[colIndex] || '{"required":false,"isText":false}');
                checkbox.checked = savedState.required;
                toggleInput.checked = savedState.isText;
                toggleContainer.classList.toggle('visible', savedState.required);
            } catch (e) {
                // Handle legacy format where only checkbox state was stored
                checkbox.checked = rowData[colIndex] === 'true';
                toggleContainer.classList.toggle('visible', checkbox.checked);
            }
        }
        
        cell.appendChild(checkbox);
        cell.appendChild(toggleContainer);
    } else {
        // Project template cell content
        const content = document.createElement('div');
        content.classList.add('evidencia-content');
        
        // File attachment elements
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.style.display = 'none';
        fileInput.classList.add('file-input');
        
        const attachButton = document.createElement('button');
        attachButton.innerHTML = '📁';
        attachButton.classList.add('attach-button');
        attachButton.title = 'Attach file';
        attachButton.style.display = 'none'; // Hide by default, show on hover
        
        const fileNameDisplay = document.createElement('span');
        fileNameDisplay.classList.add('file-name');
        
        const deleteButton = document.createElement('button');
        deleteButton.innerHTML = '✕';
        deleteButton.classList.add('delete-button');
        deleteButton.title = 'Remove';
        deleteButton.style.display = 'none';
        
        // Text input element
        const textInput = document.createElement('input');
        textInput.type = 'text';
        textInput.classList.add('evidence-text');
        textInput.placeholder = 'Enter text evidence...';
        textInput.style.display = 'none'; // Initially hidden
        
        content.appendChild(fileInput);
        content.appendChild(attachButton);
        content.appendChild(fileNameDisplay);
        content.appendChild(deleteButton);
        content.appendChild(textInput);
        
        // Event listener for text input
        textInput.addEventListener('input', function() {
            const hasText = this.value.trim() !== '';
            cell.classList.toggle('has-text', hasText);
            cell.classList.toggle('has-attachment', hasText);
            
            // Show/hide delete button based on text content
            deleteButton.style.display = hasText ? '' : 'none';
            deleteButton.classList.toggle('visible', hasText);
        });
        
        // Event listener for attach button
        attachButton.addEventListener('click', () => {
            if (!cell.classList.contains('text-mode')) {
                fileInput.click();
            }
        });
        
        // Event listener for file input change
        fileInput.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                const file = this.files[0];
                handleFileUpload(file, content, cell);
            }
        });
        
        // Event listener for delete button
        deleteButton.addEventListener('click', () => {
            if (cell.classList.contains('text-mode')) {
                textInput.value = '';
                textInput.dispatchEvent(new Event('input'));
            } else {
                const pathDiv = content.querySelector('.file-path');
                if (pathDiv) {
                    pathDiv.remove();
                }
                cell.classList.remove('has-attachment');
                deleteButton.style.display = 'none';
                deleteButton.classList.remove('visible');
                attachButton.style.display = 'none';
            }
        });
        
        // Add hover effect for file mode
        cell.addEventListener('mouseenter', () => {
            if (!cell.classList.contains('text-mode')) {
                attachButton.style.display = '';
            }
        });
        
        cell.addEventListener('mouseleave', () => {
            if (!cell.classList.contains('text-mode') && !cell.classList.contains('has-attachment')) {
                attachButton.style.display = 'none';
            }
        });
        
        cell.appendChild(content);
        
        // Add drag and drop handlers
        cell.addEventListener('dragover', (e) => {
            if (!cell.classList.contains('text-mode')) {
                e.preventDefault();
                e.stopPropagation();
                content.style.backgroundColor = 'rgba(0, 123, 255, 0.1)';
            }
        });
        
        cell.addEventListener('dragleave', (e) => {
            if (!cell.classList.contains('text-mode')) {
                e.preventDefault();
                e.stopPropagation();
                content.style.backgroundColor = '';
            }
        });
        
        cell.addEventListener('drop', (e) => {
            if (!cell.classList.contains('text-mode')) {
                e.preventDefault();
                e.stopPropagation();
                content.style.backgroundColor = '';
                
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    fileInput.files = e.dataTransfer.files;
                    const event = new Event('change');
                    fileInput.dispatchEvent(event);
                }
            }
        });
        
        // Set initial visibility based on cell mode (default to file mode)
        updateEvidenciaContent(cell, cell.classList.contains('text-mode'));
    }
    
    return cell;
}

function applyColumnWidths(tableElement, headers, isMainTemplate) {
    if (isMainTemplate) {
        const tableId = 'main-template';
        const savedWidths = state.columnWidths[tableId];
        if (!savedWidths) return;

        const headerCells = tableElement.querySelectorAll('thead th');
        headerCells.forEach((th, index) => {
            const columnIndex = index - 1;
            if (columnIndex >= 0 && savedWidths[columnIndex]) {
                th.style.width = savedWidths[columnIndex] + 'px';
                th.style.minWidth = savedWidths[columnIndex] + 'px';
            }
        });
    } else {
        const projectPane = tableElement.closest('.project-pane');
        if (!projectPane) return;
        
        const tableId = projectPane.id;
        const savedWidths = state.columnWidths[tableId];
        if (!savedWidths) return;

        const headerCells = tableElement.querySelectorAll('thead th');
        headerCells.forEach((th, index) => {
            if (savedWidths[index]) {
                th.style.width = savedWidths[index] + 'px';
                th.style.minWidth = savedWidths[index] + 'px';
            }
        });
    }
}

export function renderContacts() {
    const contactsTableBody = document.querySelector('#contactos-view .contacts-table tbody');
    if (!contactsTableBody) return;

    contactsTableBody.innerHTML = ''; // Clear existing rows
    if (!state.contacts || state.contacts.length === 0) {
        // Display an empty state message if no contacts are available
        contactsTableBody.innerHTML = '<tr><td colspan="7" class="empty-state-cell">No contacts found. Sync with projects or add a new contact.</td></tr>';
        return;
    }

    state.contacts.forEach(contact => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${contact.name}</td>
            <td>${contact.position}</td>
            <td>${contact.email}</td>
            <td>${contact.phone}</td>
            <td>${contact.company}</td>
            <td>${(contact.projects || []).join(', ')}</td>
            <td class="actions">
                <button class="edit-contact-btn" data-email="${contact.email}">Edit</button>
                <button class="delete-contact-btn" data-email="${contact.email}">Delete</button>
            </td>
        `;
        contactsTableBody.appendChild(row);
    });
}

export function updateProjectNameInUI(projectId, newName) {
    const tab = document.querySelector(`.project-tab[data-tab="${projectId}"]`);
    if (tab) {
        const nameSpan = tab.querySelector('.project-name-span');
        if (nameSpan) {
            nameSpan.textContent = newName;
        }
    }
}

// Email templates functions moved to email-templates.js module

export function updateAllProjectTables() {
    const templateHeaders = state.currentTemplateHeaders;

    Object.keys(state.projectsData).forEach(projectId => {
        const project = state.projectsData[projectId];
        const oldHeaders = project.headers;
        const newContent = [];

        // Create a map of old header index to new header index
        const headerMap = templateHeaders.map(h => oldHeaders.indexOf(h));

        project.content.forEach(oldRow => {
            const newRow = new Array(templateHeaders.length).fill('');
            headerMap.forEach((oldIndex, newIndex) => {
                if (oldIndex !== -1) {
                    newRow[newIndex] = oldRow[oldIndex];
                }
            });
            newContent.push(newRow);
        });

        project.headers = [...templateHeaders];
        project.content = newContent;
        
        const projectTable = document.querySelector(`#${projectId} .project-table`);
        if (projectTable) {
            renderTable(projectTable, project.headers, project.content, false);
        }
    });

    saveState();
    alert('All projects have been updated to match the main template.');
}

export function updateProjectCompletion(projectId) {
    const project = state.projectsData[projectId];
    const tabPane = document.getElementById(projectId);
    if (!project || !tabPane) return;

    const percentageNumber = tabPane.querySelector('.percentage-number');
    if (percentageNumber) {
        // Calculate completion based on project table data
        let completion = 0;
        if (project.content && project.content.length > 0) {
            const statusColumnIndex = project.headers.findIndex(header => 
                header.toLowerCase().includes('status') || header.toLowerCase().includes('estado')
            );
            
            if (statusColumnIndex >= 0) {
                const completedTasks = project.content.filter(row => 
                    row[statusColumnIndex] && row[statusColumnIndex].toLowerCase() === 'completo'
                ).length;
                completion = Math.round((completedTasks / project.content.length) * 100);
            }
        }
        
        // Store calculated completion in project data
        project.completion = completion;
        percentageNumber.textContent = `${completion}%`;
    }
}

export function updateCurrentStatus(projectId) {
    const project = state.projectsData[projectId];
    const tabPane = document.getElementById(projectId);
    if (!project || !tabPane) return;

    const nextMilestoneCell = tabPane.querySelector('.info-table-section table tr:first-child td');
    const currentActivityCell = tabPane.querySelector('.info-table-section table tr:nth-child(2) td');

    if (nextMilestoneCell && currentActivityCell && project.content && project.content.length > 0) {
        // Find status and activity columns
        const statusColumnIndex = project.headers.findIndex(header => 
            header.toLowerCase().includes('status') || header.toLowerCase().includes('estado')
        );
        const activityColumnIndex = project.headers.findIndex(header => 
            header.toLowerCase().includes('actividad') || header.toLowerCase().includes('activity')
        );
        const milestoneColumnIndex = project.headers.findIndex(header => 
            header.toLowerCase().includes('milestone') || header.toLowerCase().includes('hito')
        );

        // Find next milestone (first incomplete task)
        let nextMilestone = '--';
        let currentActivity = '--';
        
        if (statusColumnIndex >= 0 && activityColumnIndex >= 0) {
            const nextTask = project.content.find(row => 
                row[statusColumnIndex] && row[statusColumnIndex].toLowerCase() !== 'completo'
            );
            
            if (nextTask) {
                currentActivity = nextTask[activityColumnIndex] || '--';
                if (milestoneColumnIndex >= 0) {
                    nextMilestone = nextTask[milestoneColumnIndex] || '--';
                }
            } else {
                // All tasks completed
                currentActivity = 'Proyecto Completado';
                nextMilestone = 'Finalizado';
            }
        }

        nextMilestoneCell.textContent = nextMilestone;
        currentActivityCell.textContent = currentActivity;
        
        // Store in project data
        project.nextMilestone = nextMilestone;
        project.currentActivity = currentActivity;
    }
}

// Supporting functions for Evidencia column
export function handleFileUpload(file, content, cell) {
    // For now, we'll create a simple file display without actual upload
    // In a full implementation, this would upload to a server
    
    const fileName = file.name;
    const filePath = `uploads/${fileName}`; // Mock path
    
    // Create file path display
    const pathDiv = document.createElement('div');
    pathDiv.classList.add('file-path');
    
    const fileLink = createFileLink(fileName, filePath);
    pathDiv.appendChild(fileLink);
    
    // Remove any existing file path
    const existingPath = content.querySelector('.file-path');
    if (existingPath) {
        existingPath.remove();
    }
    
    content.appendChild(pathDiv);
    
    cell.classList.add('has-attachment');
    const deleteButton = content.querySelector('.delete-button');
    deleteButton.style.display = '';
    deleteButton.classList.add('visible');
    
    // Show attach button
    const attachButton = content.querySelector('.attach-button');
    attachButton.style.display = '';
}

function createFileLink(fileName, filePath) {
    const fileLink = document.createElement('a');
    fileLink.textContent = fileName;
    fileLink.title = `Click to open: ${filePath}`;
    fileLink.href = '#';
    fileLink.onclick = (e) => {
        e.preventDefault();
        // For now, just show an alert. In full implementation, this would open the file
        alert(`Would open file: ${filePath}`);
    };
    return fileLink;
}

export function updateEvidenciaContent(cell, isTextMode) {
    const content = cell.querySelector('.evidencia-content');
    if (!content) return;
    
    // Toggle text-mode class on the cell
    cell.classList.toggle('text-mode', isTextMode);
    
    const fileElements = [
        content.querySelector('.attach-button'),
        content.querySelector('.file-name'),
        content.querySelector('.file-path')
    ];
    
    const textInput = content.querySelector('.evidence-text');
    const deleteButton = content.querySelector('.delete-button');
    
    if (isTextMode) {
        // Switch to text mode
        fileElements.forEach(el => {
            if (el) el.style.display = 'none';
        });
        textInput.style.display = '';
        
        // Clear file data
        const filePathDiv = content.querySelector('.file-path');
        if (filePathDiv) {
            filePathDiv.remove();
        }
        cell.classList.remove('has-attachment');
        
        // Check if there's text content
        const hasText = textInput.value.trim() !== '';
        cell.classList.toggle('has-text', hasText);
        cell.classList.toggle('has-attachment', hasText);
        deleteButton.classList.toggle('visible', hasText);
    } else {
        // Switch to file mode
        fileElements.forEach(el => {
            if (el) el.style.display = '';
        });
        textInput.style.display = 'none';
        
        // Clear text content
        textInput.value = '';
        cell.classList.remove('has-text');
        
        // Check if there's a file attached
        const hasFile = content.querySelector('.file-path') !== null;
        deleteButton.classList.toggle('visible', hasFile);
    }
}

function getCorrespondingProjectCells(mainCell) {
    const mainRow = mainCell.closest('tr');
    const rowIndex = parseInt(mainRow.querySelector('.row-header').dataset.rowIndex);
    
    return Array.from(document.querySelectorAll('.project-table'))
        .filter(table => !table.closest('#main-template-pane')) // Exclude main template table
        .map(table => {
            const row = table.querySelector(`tbody tr:nth-child(${rowIndex + 1})`);
            return row ? row.querySelector('.evidencia-cell') : null;
        })
        .filter(cell => cell);
}

export function updateProjectCellsVisibility() {
    console.log('updateProjectCellsVisibility called');
    // Get all evidencia cells from the main template
    const mainCells = Array.from(document.querySelectorAll('#main-template-table .evidencia-cell'));
    console.log('Found main template evidence cells:', mainCells.length);
    
    mainCells.forEach(mainCell => {
        const rowIndex = parseInt(mainCell.closest('tr').querySelector('.row-header').dataset.rowIndex);
        const colIndex = Array.from(mainCell.closest('tr').children).indexOf(mainCell) - 1; // Account for row header
        
        if (rowIndex < 0 || colIndex < 0) return;
        
        // Get the state from the main template
        let evidenceState = { required: false, isText: false };
        try {
            if (state.currentTemplateRows[rowIndex] && state.currentTemplateRows[rowIndex][colIndex]) {
                evidenceState = JSON.parse(state.currentTemplateRows[rowIndex][colIndex]);
            }
        } catch (e) {
            // Handle legacy format
            evidenceState.required = state.currentTemplateRows[rowIndex][colIndex] === 'true';
        }
        
        console.log(`Evidence state for row ${rowIndex}, col ${colIndex}:`, evidenceState);
        
        // Update all corresponding project cells
        const projectCells = getCorrespondingProjectCells(mainCell);
        console.log(`Found ${projectCells.length} project cells to update`);
        
        projectCells.forEach(cell => {
            if (!cell) return;
            
            // Update required state
            cell.classList.toggle('evidencia-required', evidenceState.required);
            
            // Update input mode
            cell.classList.toggle('text-mode', evidenceState.isText);
            
            // Update content visibility
            updateEvidenciaContent(cell, evidenceState.isText);
        });
        
        // Also update the project data to keep it synchronized
        Object.keys(state.projectsData).forEach(projectId => {
            const project = state.projectsData[projectId];
            if (project.content && project.content[rowIndex] && project.content[rowIndex][colIndex] !== undefined) {
                // Update the project data with the evidence state
                project.content[rowIndex][colIndex] = JSON.stringify(evidenceState);
            }
        });
    });
    
    // Save the updated state
    saveState();
}

function updateTime(projectId) {
    const tabPane = document.getElementById(projectId);
    if (!tabPane) return;

    const timeDisplay = tabPane.querySelector('.current-time');
    if (!timeDisplay) return;

    const now = new Date();
    const timezoneOffset = getTimezoneOffset();
    
    // Use the same calculation logic as the timezone module
    now.setMinutes(now.getMinutes() + now.getTimezoneOffset() + (timezoneOffset * 60));
    
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const timeString = `${hours}:${minutes}`;
    
    timeDisplay.textContent = timeString;
}

function initializeProjectContacts(projectContent) {
    const contactsSection = projectContent.querySelector('.project-contacts');
    if (!contactsSection) return;

    // Add "Add Contact" button if it doesn't exist
    if (!contactsSection.querySelector('.add-contact')) {
        const addContactBtn = document.createElement('button');
        addContactBtn.className = 'add-contact';
        addContactBtn.innerHTML = '<i class="fas fa-plus"></i> Agregar Contacto';
        contactsSection.insertBefore(addContactBtn, contactsSection.firstChild);

        addContactBtn.addEventListener('click', () => {
            const contactBox = createContactBox();
            contactsSection.appendChild(contactBox);
        });
    }
}

function createContactBox() {
    const contactBox = document.createElement('div');
    contactBox.className = 'contact-box';
    contactBox.innerHTML = `
        <div class="contact-box-header">
            <div class="contact-fields">
                <input type="text" placeholder="Position" class="contact-position">
                <input type="text" placeholder="Name" class="contact-name">
                <input type="text" placeholder="Email" class="contact-email">
                <input type="text" placeholder="Phone" class="contact-phone">
            </div>
            <button class="delete-contact" title="Delete contact">&times;</button>
        </div>
    `;

    const deleteBtn = contactBox.querySelector('.delete-contact');
    deleteBtn.addEventListener('click', () => {
        contactBox.remove();
    });

    return contactBox;
}

// Show notification function
export function showNotification(message, type = 'info', duration = 4000) {
    // Remove existing notification if any
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-message">${message}</span>
            <button class="notification-close" title="Close">&times;</button>
        </div>
    `;
    
    // Add to DOM
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    // Auto-hide after duration
    const hideTimeout = setTimeout(() => {
        hideNotification(notification);
    }, duration);
    
    // Add close button functionality
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        clearTimeout(hideTimeout);
        hideNotification(notification);
    });
    
    // Hide on click outside
    notification.addEventListener('click', (e) => {
        if (e.target === notification) {
            clearTimeout(hideTimeout);
            hideNotification(notification);
        }
    });
}

function hideNotification(notification) {
    if (notification && notification.parentNode) {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }
}