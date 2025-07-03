import { state, saveState } from './state.js';
import * as utils from './utils.js';
import { setupTimezoneHandlers } from './timezone.js';
import { createMilestonesTimeline } from './milestones.js';

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
        <div class="comment-cell-content ${hasComments ? '' : 'empty'}">
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
    if (!status || status.trim() === '') return '';
    const statusClass = utils.getStatusClass(status);
    return `<span class="status-tag ${statusClass}">${status}</span>`;
};

export function createProjectTab(project, projectId) {
    const projectName = project.name;
    const tabButton = document.createElement('button');
    tabButton.className = 'tab-button project-tab';
    tabButton.dataset.tab = projectId;
    
    const nameSpan = document.createElement('span');
    nameSpan.className = 'project-name-span';
    nameSpan.textContent = projectName;
    tabButton.appendChild(nameSpan);

    const deleteIcon = document.createElement('span');
    deleteIcon.className = 'delete-tab-icon';
    deleteIcon.innerHTML = '&#128465;';
    tabButton.appendChild(deleteIcon);

    const tabPane = document.createElement('div');
    tabPane.className = 'tab-pane project-pane';
    tabPane.id = projectId;
    tabPane.innerHTML = `
        <h2 class="project-name-editable" contenteditable="true" data-project-id="${projectId}">${projectName}</h2>
        <div class="quick-info-panel">
            <div class="quick-info-left">
                <div class="completion-ring-container">
                    <div class="completion-percentage">0%</div>
                    <div class="completion-label">Project Completion</div>
                </div>
                <div class="time-display">
                    <span class="current-time">--:--</span>
                    <span class="timezone-offset">UTC+0</span>
                    <button class="timezone-select" title="Select Timezone">🌐</button>
                </div>
            </div>
            <div class="quick-info-right">
                <div class="info-tabs-vertical">
                    <button class="info-tab-vertical active" data-tab-class="quick-info-content-pane">
                        <span class="info-icon">ⓘ</span>
                    </button>
                    <button class="info-tab-vertical" data-tab-class="contacts-content-pane">
                        <span class="contact-icon">👤</span>
                    </button>
                </div>
                <div class="info-content-container">
                    <div class="info-content quick-info-content-pane active">
                        <div class="info-column">
                            <h4>Evidence</h4>
                            <div class="evidence-section">
                                <div class="evidence-item">
                                    <label for="solicitud-inversion-${projectId}">Solicitud de Inversion</label>
                                    <input type="text" id="solicitud-inversion-${projectId}" class="evidence-input" data-field="solicitudInversion" value="${project.evidence?.solicitudInversion || ''}">
                                </div>
                                <div class="evidence-item">
                                    <label for="orden-compra-${projectId}">Orden de Compra</label>
                                    <input type="text" id="orden-compra-${projectId}" class="evidence-input" data-field="ordenCompra" value="${project.evidence?.ordenCompra || ''}">
                                </div>
                                <div class="evidence-item">
                                    <label for="fecha-implementacion-${projectId}">Fecha de Implementacion</label>
                                    <input type="text" id="fecha-implementacion-${projectId}" class="evidence-input" data-field="fechaImplementacion" value="${project.evidence?.fechaImplementacion || ''}">
                                </div>
                            </div>
                        </div>
                        <div class="info-column">
                            <h4>Current Status</h4>
                            <ul>
                                <li><span>Next Milestone</span><span></span></li>
                                <li><span>Current Activity</span><span></span></li>
                            </ul>
                            <h4>Additional Notes</h4>
                            <div class="additional-notes-section">
                                <textarea id="additional-notes-${projectId}" class="additional-notes-input" placeholder="Add project notes..." rows="3">${project.additionalNotes || ''}</textarea>
                            </div>
                        </div>
                    </div>
                    <div class="info-content contacts-content-pane">
                        <table class="project-contacts-table">
                            <tbody>
                                <tr class="address-row">
                                    <td colspan="5" contenteditable="true">${project.quickInfoContacts?.address ?? 'Address: --'}</td>
                                </tr>
                                <tr class="contacts-header-row">
                                    <th>Position</th>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Phone</th>
                                    <th></th>
                                </tr>
                                ${((project.quickInfoContacts?.contacts?.length > 0) ? project.quickInfoContacts.contacts : [{ position: '', name: '', email: '', phone: '' }]).map((contact, index, arr) => `
                                    <tr data-contact-index="${index}">
                                        <td contenteditable="true">${contact.position || ''}</td>
                                        <td contenteditable="true">${contact.name || ''}</td>
                                        <td contenteditable="true">${contact.email || ''}</td>
                                        <td contenteditable="true">${contact.phone || ''}</td>
                                        <td class="contact-actions">
                                            <button class="delete-contact-row-btn" data-contact-index="${index}">🗑️</button>
                                            ${index === arr.length - 1 ? '<button class="add-contact-row-btn">+</button>' : ''}
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
        <div class="analytics-header">
            <h3>Project Analytics</h3>
            <span class="toggle-icon-analytics">▼</span>
        </div>
        <div class="analytics-content" style="display: none;">
            <div class="analytics-tabs">
                <button class="analytics-tab active" data-analytics-view="timeline">Timeline</button>
                <button class="analytics-tab" data-analytics-view="gantt">Gantt</button>
            </div>
            <div class="analytics-view-container">
                <div class="analytics-view active" id="timeline-view-${projectId}">
                    <!-- Timeline content will be lazy-loaded -->
                    <div class="milestones-container"></div>
                </div>
                <div class="analytics-view" id="gantt-view-${projectId}">
                    <!-- Gantt content will be lazy-loaded -->
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
        <table class="project-table"></table>
    `;

    // Setup timezone handlers for this project
    setTimeout(() => {
        setupTimezoneHandlers(projectId);
    }, 100);

    return { tabButton, tabPane };
}

function createEvidenciaCell(isMain = false, rowData = null, colIndex = -1) {
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
    }
    
    return cell;
}

function applyColumnWidths(tableElement, headers, isMainTemplate) {
    const tableId = isMainTemplate ? 'main-template' : tableElement.closest('.tab-pane').id;
    const savedWidths = state.columnWidths[tableId];
    if (!savedWidths) return;

    const headerCells = tableElement.querySelectorAll('thead th');
    headerCells.forEach((th, index) => {
        const columnIndex = isMainTemplate ? index - 1 : index;
        if (columnIndex >= 0 && savedWidths[columnIndex]) {
            th.style.width = savedWidths[columnIndex] + 'px';
            th.style.minWidth = savedWidths[columnIndex] + 'px';
        }
    });
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

export function renderEmailTemplates() {
    const container = document.getElementById('email-templates-list');
    if (!container) return;

    if (state.emailTemplates.length === 0) {
        container.innerHTML = `
            <div class="empty-state-container">
                <div class="empty-state-icon">📧</div>
                <h3>No Email Templates Yet</h3>
                <p>Create your first email template to get started</p>
                <button class="add-email-template-btn btn btn-success">+ Create First Template</button>
            </div>
        `;
        return;
    }

    container.innerHTML = '';
    state.emailTemplates.forEach((template, index) => {
        const div = document.createElement('div');
        div.className = 'email-template-item';
        div.innerHTML = `
            <div class="template-header">
                <strong class="template-name">${template.name}</strong>
                <div class="template-actions">
                    <button class="edit-template-btn" data-index="${index}">Edit</button>
                    <button class="delete-template-btn" data-index="${index}">Delete</button>
                </div>
            </div>
            <div class="template-body">
                <p><strong>Subject:</strong> ${template.subject}</p>
                <pre>${template.body}</pre>
            </div>
        `;
        container.appendChild(div);
    });
}

export function showEmailTemplateModal(template = null, index = null) {
    const modal = document.getElementById('email-template-modal');
    const form = document.getElementById('email-template-form');
    const modalTitle = document.getElementById('template-modal-title');

    form.reset();
    delete form.dataset.index;

    if (template && index !== null) {
        modalTitle.textContent = 'Edit Email Template';
        form.elements['template-name'].value = template.name;
        form.elements['template-subject'].value = template.subject;
        form.elements['template-body'].value = template.body;
        form.dataset.index = index;
    } else {
        modalTitle.textContent = 'Add New Email Template';
    }

    modal.style.display = 'block';
}

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
    if (!projectId) return;

    const project = state.projectsData[projectId];
    if (!project || !project.headers || !project.content) return;

    const statusIndex = project.headers.indexOf('Status');
    if (statusIndex === -1) return;

    const totalTasks = project.content.length;
    if (totalTasks === 0) return;

    const completedTasks = project.content.filter(row => {
        const status = row[statusIndex]?.toLowerCase();
        return status === 'completo' || status === 'n/a';
    }).length;

    const percentage = Math.round((completedTasks / totalTasks) * 100);

    const tabPane = document.getElementById(projectId);
    if (tabPane) {
        const percentageElement = tabPane.querySelector('.completion-percentage');
        if (percentageElement) {
            percentageElement.textContent = `${percentage}%`;
        }
    }
}

export function updateCurrentStatus(projectId) {
    if (!projectId) return;

    const project = state.projectsData[projectId];
    if (!project || !project.headers || !project.content) return;

    const milestoneCol = project.headers.indexOf('Milestone');
    const statusCol = project.headers.indexOf('Status');
    const activityCol = project.headers.indexOf('Actividad');

    if (milestoneCol === -1 || statusCol === -1 || activityCol === -1) return;

    // Create a map of milestones with their tasks
    const milestones = {};
    project.content.forEach(row => {
        const milestoneName = row[milestoneCol];
        if (!milestoneName) return;
        if (!milestones[milestoneName]) {
            milestones[milestoneName] = [];
        }
        milestones[milestoneName].push({
            activity: row[activityCol],
            status: row[statusCol]
        });
    });

    let nextMilestone = 'Project Complete';
    let currentActivity = 'All tasks finished';

    // Get the unique order of milestones from the project content
    const milestoneOrder = [...new Set(project.content.map(row => row[milestoneCol]).filter(Boolean))];

    for (const milestoneName of milestoneOrder) {
        const tasks = milestones[milestoneName];
        const allComplete = tasks.every(task => task.status && task.status.toLowerCase() === 'completo');

        if (!allComplete) {
            nextMilestone = milestoneName;
            const incompleteTask = tasks.find(task => !task.status || task.status.toLowerCase() !== 'completo');
            currentActivity = incompleteTask ? incompleteTask.activity : 'No pending tasks in this milestone';
            break; 
        }
    }

    const tabPane = document.getElementById(projectId);
    if (tabPane) {
        const quickInfoRight = tabPane.querySelector('.quick-info-right');
        const nextMilestoneEl = quickInfoRight.querySelector('.info-column:last-child ul li:first-child span:last-child');
        const currentActivityEl = quickInfoRight.querySelector('.info-column:last-child ul li:last-child span:last-child');
        
        if (nextMilestoneEl) nextMilestoneEl.textContent = nextMilestone;
        if (currentActivityEl) currentActivityEl.textContent = currentActivity;
    }
}

// Supporting functions for Evidencia column
function handleFileUpload(file, content, cell) {
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

function updateEvidenciaContent(cell, isTextMode) {
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

function updateProjectCellsVisibility() {
    // Get all evidencia cells from the main template
    const mainCells = Array.from(document.querySelectorAll('#main-template-table .evidencia-cell'));
    
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
        
        // Update all corresponding project cells
        const projectCells = getCorrespondingProjectCells(mainCell);
        projectCells.forEach(cell => {
            if (!cell) return;
            
            // Update required state
            cell.classList.toggle('evidencia-required', evidenceState.required);
            
            // Update input mode
            cell.classList.toggle('text-mode', evidenceState.isText);
            
            // Update content visibility
            updateEvidenciaContent(cell, evidenceState.isText);
        });
    });
}