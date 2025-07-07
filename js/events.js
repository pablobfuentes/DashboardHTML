import { state, saveState } from './state.js';
import { createProjectTab, renderTable, renderContacts, renderStatusCell, renderCommentCell, renderNewCommentCell, updateProjectNameInUI, renderEmailTemplates, showEmailTemplateModal, renderMainTemplate, updateAllProjectTables, updateCurrentStatus, updateProjectCompletion } from './ui.js';
import { initializeKanban } from './kanban.js';
import { syncContactsWithProjects } from './contacts.js';
import * as utils from './utils.js';
import { createMilestonesTimeline, createGanttChart } from './milestones.js';
import { updateTime } from './timezone.js';
import { updateDatesBasedOnDependencies, formatCustomDate } from './dependencies.js';

// --- Main Initializer ---

export function initializeEventListeners() {
    initDelegatedEventListeners();
    initGlobalListeners();
}

// --- Event Listener Initializers ---

function initDelegatedEventListeners() {
    const appContainer = document.querySelector('.app-container');
    if (!appContainer) return;

    // Delegated click listener on the main app container to catch all relevant clicks
    appContainer.addEventListener('click', (e) => {
        const target = e.target;
        const closest = (selector) => target.closest(selector);

        if (closest('.nav-item')) handleMainNavigation(closest('.nav-item'));
        
        if (closest('.add-contact-btn')) document.getElementById('contact-modal').classList.add('active');
        if (closest('.calendar-icon')) handleCalendarIconClick(target);
        if (closest('.status-cell')) handleStatusCellClick(closest('td'));
        if (closest('.comment-add-btn')) handleCommentAddClick(target);
        if (closest('.comment-cell-new')) handleCommentCellClick(closest('.comment-cell-new'));
        if (closest('.timezone-select')) handleTimezoneButtonClick(closest('.timezone-select'));
        if (closest('.timezone-modal-close')) handleTimezoneModalClose(closest('.timezone-modal'));
        if (closest('.timezone-apply-btn')) handleTimezoneApply(closest('.timezone-modal'));
        if (target.matches('.timezone-modal')) handleTimezoneModalClose(target);
        if (closest('#comment-panel-close')) handleCommentPanelClose();
        if (closest('#comment-save-btn')) handleCommentSubmit();
        if (target.matches('.comment-panel-overlay')) handleCommentPanelClose();
        if (closest('.delete-tab-icon')) { e.stopPropagation(); handleProjectDelete(closest('.delete-tab-icon')); }
        if (closest('.project-tab')) handleTabSwitch(closest('.project-tab'), '.project-tab', '.project-pane');
        if (closest('#template-tabs .tab-button')) handleTabSwitch(closest('.tab-button'), '#template-tabs .tab-button', '#template-content .tab-pane');
        if (closest('#add-project-button')) handleAddProject();
        if (closest('#toggle-edit-mode')) handleToggleEditMode(target);
        if (closest('#refresh-projects-button')) updateAllProjectTables();
        if (closest('.pull-contacts-btn')) syncContactsWithProjects();
        if (closest('.seguimiento-tab')) handleSeguimientoViewSwitch(closest('.seguimiento-tab'));

        // --- Quick Info Panel Tabs ---
        const infoTab = closest('.info-tab-vertical');
        if (infoTab) {
            const parentPanel = closest('.quick-info-right');
            if (parentPanel) {
                // Handle tabs
                parentPanel.querySelector('.info-tab-vertical.active')?.classList.remove('active');
                infoTab.classList.add('active');
                
                // Handle content panes
                const contentContainer = parentPanel.querySelector('.info-content-container');
                contentContainer.querySelector('.info-content.active')?.classList.remove('active');
                const contentClass = infoTab.dataset.tabClass;
                const newContent = contentContainer.querySelector(`.${contentClass}`);
                if (newContent) newContent.classList.add('active');
            }
        }
        
        // --- Project Contacts Table Actions ---
        const addBtn = closest('.add-contact-row-btn');
        if (addBtn) {
            handleAddContactRow(addBtn);
        }

        const deleteContactBtn = closest('.delete-contact-row-btn');
        if (deleteContactBtn) {
            handleDeleteContactRow(deleteContactBtn);
        }

        // --- Project Analytics Toggle ---
        const analyticsHeader = closest('.analytics-header');
        if (analyticsHeader) {
            e.preventDefault();
            e.stopPropagation();
            
            const content = analyticsHeader.nextElementSibling;
            const icon = analyticsHeader.querySelector('.toggle-icon-analytics');
            
            // Check current state - prefer inline style, fallback to computed style
            const currentInlineDisplay = content.style.display;
            const computedStyle = window.getComputedStyle(content);
            const isCollapsed = currentInlineDisplay === 'none' || 
                               (currentInlineDisplay === '' && computedStyle.display === 'none');
            
            // Initialize timeline when opening
            if (isCollapsed) {
                const projectId = analyticsHeader.closest('.project-pane').id;
                const milestonesContainer = content.querySelector('.milestones-container');
                if (milestonesContainer) {
                    createMilestonesTimeline(milestonesContainer, projectId);
                }
            }

            content.style.setProperty('display', isCollapsed ? 'block' : 'none', 'important');
            
            // Change arrow direction
            if (isCollapsed) {
                icon.style.setProperty('transform', 'rotate(180deg)', 'important');
                icon.textContent = '▲';
            } else {
                icon.style.setProperty('transform', 'rotate(0deg)', 'important');
                icon.textContent = '▼';
            }
        }

        // --- Analytics Tabs Switching ---
        const analyticsTab = closest('.analytics-tab');
        if (analyticsTab) {
            const container = closest('.analytics-content');
            const viewType = analyticsTab.dataset.analyticsView;

            // Update tabs
            container.querySelector('.analytics-tab.active').classList.remove('active');
            analyticsTab.classList.add('active');

            // Update views
            const viewContainer = container.querySelector('.analytics-view-container');
            viewContainer.querySelector('.analytics-view.active').classList.remove('active');
            const targetView = viewContainer.querySelector(`#${viewType}-view-${closest('.project-pane').id}`);
            targetView.classList.add('active');

            // Lazy load gantt chart
            if (viewType === 'gantt' && targetView.innerHTML.trim() === '') {
                const projectId = closest('.project-pane').id;
                targetView.innerHTML = createGanttChart(projectId);
            }
        }

        // --- Email Template Actions ---
        if (closest('.add-email-template-btn')) {
            showEmailTemplateModal();
        }
        const editBtn = closest('.edit-template-btn');
        if (editBtn) {
            const templateIndex = parseInt(editBtn.dataset.index);
            showEmailTemplateModal(state.emailTemplates[templateIndex], templateIndex);
        }
        const deleteBtn = closest('.delete-template-btn');
        if (deleteBtn) {
            handleDeleteEmailTemplate(parseInt(deleteBtn.dataset.index));
        }
    });

    // Listeners that are truly specific to the main content area
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        // Delegated context menu listener for table headers
        mainContent.addEventListener('contextmenu', (e) => {
            const header = e.target.closest('.column-header, .row-header');
            if (state.isEditMode && header) {
                e.preventDefault();
                showContextMenu(e, header);
            }
        });

        // Delegated blur listener for editable cells
        mainContent.addEventListener('blur', (e) => {
            if (e.target.matches('[contenteditable="true"]')) {
                handleCellEdit(e.target);
            }
        }, true); // Use capturing to ensure blur event is caught

        mainContent.addEventListener('input', e => {
            const evidenceInput = e.target.closest('.evidence-input');
            if(evidenceInput) {
                handleEvidenceInput(evidenceInput);
            }
            
            const notesInput = e.target.closest('.additional-notes-input');
            if(notesInput) {
                handleAdditionalNotesInput(notesInput);
            }
        });

        // Keyboard shortcuts for comment panel
        mainContent.addEventListener('keydown', e => {
            const commentInput = e.target.closest('#comment-input');
            if (commentInput) {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    // Ctrl+Enter or Cmd+Enter to save
                    e.preventDefault();
                    handleCommentSubmit();
                } else if (e.key === 'Escape') {
                    // Escape to close panel
                    e.preventDefault();
                    handleCommentPanelClose();
                }
            }
        });
    }
}

function initGlobalListeners() {
    // Note: initDelegatedEventListeners() is already called in initializeEventListeners()
    // Don't call it again here to avoid duplicate event handlers

    // --- Contact Modal ---
    const contactModal = document.getElementById('contact-modal');
    const contactForm = document.getElementById('contact-form');
    const editContactForm = document.getElementById('edit-contact-form');
    const editContactModal = document.getElementById('edit-contact-modal');
    const contactsTableBody = document.querySelector('.contacts-table tbody');

    // Contact form and modal handlers
    if (contactModal) {
        contactModal.addEventListener('click', (e) => {
            if (e.target.matches('.close-modal, .cancel-btn, .modal')) {
                contactModal.classList.remove('active');
            }
        });
    }

    // Edit contact form handlers are handled in contacts.js module

    // Edit contact modal handlers are now handled in contacts.js module to avoid conflicts

    // --- Email Template Modal ---
    const templateModal = document.getElementById('email-template-modal');
    if (templateModal) {
        const templateForm = document.getElementById('email-template-form');
        templateModal.addEventListener('click', (e) => {
            if (e.target.matches('.close-modal, .cancel-btn, .modal')) {
                templateModal.style.display = 'none';
            }
        });

        templateForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = templateForm.elements['template-name'].value;
            const subject = templateForm.elements['template-subject'].value;
            const body = templateForm.elements['template-body'].value;
            const index = templateForm.dataset.index;

            if (index) {
                // Editing existing template
                state.emailTemplates[index] = { name, subject, body };
            } else {
                // Adding new template
                state.emailTemplates.push({ name, subject, body });
            }
            saveState();
            renderEmailTemplates();
            templateModal.style.display = 'none';
        });
    }

    // --- Date Picker Modal ---
    const datePickerModal = document.getElementById('date-picker-modal');
    if(datePickerModal) {
        const datePickerContainer = document.getElementById('date-picker-container');
        let activeDatepicker = null;

        datePickerModal.addEventListener('click', (e) => {
            if (e.target.matches('.date-picker-close, .date-picker-overlay')) {
                datePickerModal.style.display = 'none';
                if (activeDatepicker) {
                    activeDatepicker.destroy();
                    activeDatepicker = null;
                }
            }
            if (e.target.matches('#date-picker-tbd')) {
                 if (state.currentDateCell) {
                    const dateText = state.currentDateCell.querySelector('.cell-content');
                    if(dateText) {
                        dateText.textContent = 'TBD';
                        handleCellEdit(dateText);
                    }
                }
                datePickerModal.style.display = 'none';
                if (activeDatepicker) {
                    activeDatepicker.destroy();
                    activeDatepicker = null;
                }
            }
            if (e.target.matches('#date-picker-clear')) {
                 if (state.currentDateCell) {
                    const dateText = state.currentDateCell.querySelector('.cell-content');
                    if(dateText) {
                        dateText.textContent = '';
                        handleCellEdit(dateText);
                    }
                }
                datePickerModal.style.display = 'none';
                if (activeDatepicker) {
                    activeDatepicker.destroy();
                    activeDatepicker = null;
                }
            }
        });

        // Function to show date picker modal
        window.showDatePickerModal = () => {
            datePickerModal.style.display = 'flex';
            
            // Clear any existing datepicker
            if (activeDatepicker) {
                activeDatepicker.destroy();
                activeDatepicker = null;
            }
            
            // Clear the container and create a temporary input
            datePickerContainer.innerHTML = '<input type="text" id="temp-date-input" style="opacity: 0; position: absolute; pointer-events: none;">';
            
            // Create datepicker on the temporary input
            const tempInput = document.getElementById('temp-date-input');
            const datepicker = new Datepicker(tempInput, {
                format: 'dd-M-yy',
                autohide: false,
                todayHighlight: true,
                container: datePickerContainer
            });
            
            activeDatepicker = datepicker;
            
            // Handle date selection
            tempInput.addEventListener('changeDate', (e) => {
                if (state.currentDateCell) {
                    const dateText = state.currentDateCell.querySelector('.cell-content');
                    if(dateText) {
                        // Format the date in the custom format (dd-Mon-yy)
                        const selectedDate = e.detail.date;
                        const formattedDate = formatCustomDate(selectedDate);
                        dateText.textContent = formattedDate;
                        handleCellEdit(dateText);
                    }
                }
                datePickerModal.style.display = 'none';
                if (activeDatepicker) {
                    activeDatepicker.destroy();
                    activeDatepicker = null;
                }
            });
            
            // Show the datepicker
            datepicker.show();
        };
    }

    // --- Status Selector Modal ---
    const statusSelectorModal = document.getElementById('status-selector-modal');
    if (statusSelectorModal) {
        statusSelectorModal.addEventListener('click', (e) => {
            const statusOption = e.target.closest('.status-option');

            if (statusOption) {
                if (state.currentStatusCell) {
                    const newStatus = statusOption.dataset.status;
                    const cell = state.currentStatusCell;

                    cell.innerHTML = renderStatusCell(newStatus);
                    cell.dataset.status = newStatus;

                    const rowIndex = cell.parentElement.dataset.rowIndex;
                    const colIndex = cell.dataset.colIndex;
                    const projectId = cell.closest('.project-pane').id;

                    if (state.projectsData[projectId] && state.projectsData[projectId].content[rowIndex]) {
                        state.projectsData[projectId].content[rowIndex][colIndex] = newStatus;
                        saveState();
                        updateCurrentStatus(projectId);
                        updateProjectCompletion(projectId);
                        
                        // Update milestone timeline when status changes
                        const milestonesContainer = document.querySelector(`#${projectId} .milestones-container`);
                        if (milestonesContainer) {
                            import('./milestones.js').then(module => {
                                module.createMilestonesTimeline(milestonesContainer, projectId);
                            });
                        }
                    }
                }
                
                statusSelectorModal.style.display = 'none';
                state.currentStatusCell = null;
            } else if (!e.target.closest('.modal-content')) {
                // Clicked outside the modal content, so just close it
                statusSelectorModal.style.display = 'none';
                state.currentStatusCell = null;
            }
        });
    }

    // --- Context Menu ---
    const contextMenu = document.getElementById('context-menu');
    if (contextMenu) {
        contextMenu.addEventListener('click', (e) => {
            const item = e.target.closest('.context-menu-item');
            if (item) {
                handleContextMenuAction(item.dataset.action);
                contextMenu.style.display = 'none';
            }
        });
    }

    // --- Comment Panel ---
    const commentPanel = document.getElementById('comment-panel');
    if (commentPanel) {
        const commentSubmitBtn = document.getElementById('comment-save-btn');
        const commentInput = document.getElementById('comment-input');
        
        commentPanel.addEventListener('click', (e) => {
            if (e.target.matches('.comment-panel-close, .comment-panel-overlay')) {
                handleCommentPanelClose();
            }
        });
        
        if (commentSubmitBtn) {
            commentSubmitBtn.addEventListener('click', () => {
                handleCommentSubmit();
            });
        }
        
        if (commentInput) {
            commentInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                    handleCommentSubmit();
                }
                if (e.key === 'Escape') {
                    handleCommentPanelClose();
                }
            });
        }
    }

    // --- Timezone Modal (delegated to handle multiple project modals) ---
    document.addEventListener('click', (e) => {
        if (e.target.matches('.timezone-modal-close')) {
            const modal = e.target.closest('.timezone-modal');
            if (modal) modal.classList.remove('active');
        }
        
        if (e.target.matches('.timezone-apply-btn')) {
            const modal = e.target.closest('.timezone-modal');
            const input = modal.querySelector('.timezone-input');
            const projectPane = modal.closest('.project-pane');
            const offsetDisplay = projectPane.querySelector('.timezone-offset');
            
            if (input && offsetDisplay) {
                const newOffset = parseInt(input.value);
                if (!isNaN(newOffset) && newOffset >= -12 && newOffset <= 14) {
                    offsetDisplay.textContent = `UTC${newOffset >= 0 ? '+' : ''}${newOffset}`;
                    modal.classList.remove('active');
                    
                    // Save timezone to state
                    state.timezoneOffset = newOffset;
                    saveState();
                    
                    // Update all time displays
                    const timeDisplays = document.querySelectorAll('.current-time');
                    timeDisplays.forEach(timeDisplay => {
                        const now = new Date();
                        now.setMinutes(now.getMinutes() + now.getTimezoneOffset() + (newOffset * 60));
                        const hours = String(now.getHours()).padStart(2, '0');
                        const minutes = String(now.getMinutes()).padStart(2, '0');
                        timeDisplay.textContent = `${hours}:${minutes}`;
                    });
                    
                    // Update all timezone displays
                    const timezoneOffsetDisplays = document.querySelectorAll('.timezone-offset');
                    timezoneOffsetDisplays.forEach(display => {
                        display.textContent = `UTC${newOffset >= 0 ? '+' : ''}${newOffset}`;
                    });
                } else {
                    alert('Please enter a valid timezone offset between -12 and +14');
                }
            }
        }
        
        if (e.target.matches('.timezone-modal') && !e.target.closest('.timezone-modal-content')) {
            e.target.classList.remove('active');
        }
    });

    // --- Timezone Input Enter Key ---
    document.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && e.target.matches('.timezone-input')) {
            const applyBtn = e.target.closest('.timezone-modal').querySelector('.timezone-apply-btn');
            if (applyBtn) applyBtn.click();
        }
    });

    // --- Global Click Listener (to hide context menu) ---
    document.addEventListener('click', (e) => {
        const contextMenu = document.getElementById('context-menu');
        if (contextMenu && !contextMenu.contains(e.target)) {
            contextMenu.remove();
        }
    });

    // --- Nav Toggle ---
    const navToggle = document.querySelector('.nav-toggle');
    if (navToggle) {
        navToggle.addEventListener('click', () => {
            document.querySelector('.nav-menu').classList.toggle('collapsed');
        });
    }
}


// --- Event Handlers ---

function handleCellEdit(element) {
    const isProjectName = element.matches('.project-name-editable');
    const isContactCell = element.closest('.project-contacts-table');

    if (isProjectName) {
        const newName = element.textContent.trim();
        const projectId = element.dataset.projectId;
        if (state.projectsData[projectId]) {
            state.projectsData[projectId].name = newName;
            updateProjectNameInUI(projectId, newName); // Update tab and other UI elements
            saveState();
        }
    } else if (isContactCell) {
        const tr = element.closest('tr');
        const projectId = tr.closest('.project-pane').id;
        const project = state.projectsData[projectId];
        if (!project.quickInfoContacts) project.quickInfoContacts = { address: '', contacts: [] };

        if (tr.classList.contains('address-row')) {
            project.quickInfoContacts.address = element.textContent;
        } else {
            const index = parseInt(tr.dataset.contactIndex);
            const key = ['position', 'name', 'email', 'phone'][element.cellIndex];
            if (project.quickInfoContacts.contacts[index]) {
                project.quickInfoContacts.contacts[index][key] = element.textContent;
            }
        }
        saveState();

    } else {
        const td = element.closest('td');
        if (!td) return; // Not a table cell

        const tr = td.parentElement;
        const colIndex = td.dataset.colIndex;
        const rowIndex = tr.dataset.rowIndex;
        const projectId = tr.closest('.project-pane').id;
        
        const project = state.projectsData[projectId];
        if (project && project.content[rowIndex]) {
            const newValue = element.textContent.trim();
            project.content[rowIndex][colIndex] = newValue;
            saveState();
            
            // Check if this is a duration or expected date change that should trigger dependency updates
            const header = project.headers[colIndex];
            if (utils.isDurationColumn(header) || utils.isExpectedDateColumn(header)) {
                updateDatesBasedOnDependencies(rowIndex, projectId);
            }
            
            // After saving, also update the status panel
            updateCurrentStatus(projectId);
        }
    }
}

function handleCalendarIconClick(target) {
    state.currentDateCell = target.closest('.date-cell-td');
    if (window.showDatePickerModal) {
        window.showDatePickerModal();
    }
}

function handleStatusCellClick(cell) {
    const statusSelector = document.getElementById('status-selector-modal');
    state.currentStatusCell = cell;
    statusSelector.style.display = 'flex';
}

function handleCommentCellClick(cell) {
    // For the new comment system, clicking the cell also opens the panel
    handleCommentAddClick(cell.querySelector('.comment-add-btn'));
}

function handleTimezoneButtonClick(button) {
    const projectPane = button.closest('.project-pane');
    const modal = projectPane.querySelector('.timezone-modal');
    if (modal) {
        modal.classList.add('active');
        const input = modal.querySelector('.timezone-input');
        if (input) {
            // Get current timezone offset from display
            const offsetDisplay = projectPane.querySelector('.timezone-offset');
            if (offsetDisplay) {
                const currentOffset = offsetDisplay.textContent.replace('UTC', '').replace('+', '');
                input.value = currentOffset;
            }
        }
    }
}

function handleTimezoneModalClose(modal) {
    modal.classList.remove('active');
}

function handleTimezoneApply(modal) {
    const input = modal.querySelector('.timezone-input');
    const projectPane = modal.closest('.project-pane');
    
    if (input && projectPane) {
        const newOffset = parseInt(input.value) || 0;
        
        // Update timezone offset display
        const offsetDisplay = projectPane.querySelector('.timezone-offset');
        if (offsetDisplay) {
            offsetDisplay.textContent = `UTC${newOffset >= 0 ? '+' : ''}${newOffset}`;
        }
        
        // Update the timezone in the timezone module
        import('./timezone.js').then(module => {
            module.setTimezoneOffset(newOffset);
        });
        
        // Update time display for this project
        const projectId = projectPane.id;
        updateTime(projectId);
        
        // Close modal
        modal.classList.remove('active');
    }
}

function handleCommentAddClick(button) {
    const cell = button.closest('.comment-cell-new');
    const tr = cell.closest('tr');
    const projectId = tr.closest('.project-pane').id;
    const rowIndex = tr.dataset.rowIndex;
    const colIndex = cell.dataset.colIndex;
    
    // Store current comment context
    state.currentCommentCell = {
        projectId,
        rowIndex: parseInt(rowIndex),
        colIndex: parseInt(colIndex),
        cell: cell
    };
    
    // Get activity name from the Activity column
    const project = state.projectsData[projectId];
    const activityColumnIndex = project.headers.findIndex(header => 
        /^actividad$|^activity$/i.test(header.trim())
    );
    const activityName = activityColumnIndex >= 0 
        ? project.content[rowIndex][activityColumnIndex] || 'Unknown Activity'
        : project.content[rowIndex][0] || 'Unknown Activity';
    
    // Open comment panel
    openCommentPanel(activityName, cell.dataset.fullHistory || '');
}

function openCommentPanel(activityName, commentHistory) {
    const commentPanel = document.getElementById('comment-panel');
    const activityNameElement = document.getElementById('comment-activity-name');
    const commentInput = document.getElementById('comment-input');
    const historyList = document.getElementById('comment-history-list');
    
    // Set activity name
    activityNameElement.textContent = activityName;
    
    // Clear input
    commentInput.value = '';
    
    // Render comment history
    renderCommentHistory(historyList, commentHistory);
    
    // Show panel
    commentPanel.classList.add('active');
    
    // Focus on input
    setTimeout(() => commentInput.focus(), 100);
}

function handleCommentPanelClose() {
    const commentPanel = document.getElementById('comment-panel');
    if (commentPanel) {
        commentPanel.classList.remove('active');
        
        // Clear the input
        const commentInput = document.getElementById('comment-input');
        if (commentInput) {
            commentInput.value = '';
        }
        
        // Clear current comment context
        state.currentCommentCell = null;
    }
}

function renderCommentHistory(container, commentHistory) {
    if (!commentHistory || commentHistory.trim() === '') {
        container.innerHTML = '<div class="no-comments">No comments yet</div>';
        return;
    }
    
    const lines = commentHistory.split('\n').filter(line => line.trim() !== '');
    const comments = [];
    
    for (const line of lines) {
        // Parse format: "dd-mmm: comment text"
        const match = line.match(/^(\d{1,2}-[A-Za-z]{3}):\s*(.+)$/);
        if (match) {
            comments.push({
                date: match[1],
                text: match[2]
            });
        }
    }
    
    if (comments.length === 0) {
        container.innerHTML = '<div class="no-comments">No comments yet</div>';
        return;
    }
    
    // Sort comments by date (newest first) - for now just reverse the order
    comments.reverse();
    
    container.innerHTML = comments.map(comment => `
        <div class="comment-history-item">
            <div class="comment-date">${comment.date}</div>
            <div class="comment-text">${comment.text}</div>
        </div>
    `).join('');
}

function handleCommentSubmit() {
    const commentInput = document.getElementById('comment-input');
    const commentText = commentInput ? commentInput.value.trim() : '';
    
    if (!commentText || !state.currentCommentCell) {
        return;
    }
    
    // Format current date as dd-mmm
    const now = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dateStr = `${now.getDate()}-${months[now.getMonth()]}`;
    
    // Create new comment line
    const newCommentLine = `${dateStr}: ${commentText}`;
    
    // Get current comment history
    const { projectId, rowIndex, colIndex, cell } = state.currentCommentCell;
    
    const project = state.projectsData[projectId];
    if (!project) {
        console.error('Project not found:', projectId);
        return;
    }
    
    const currentHistory = project.content[rowIndex][colIndex] || '';
    
    // Add new comment to the beginning (newest first)
    const updatedHistory = currentHistory.trim() === '' 
        ? newCommentLine 
        : newCommentLine + '\n' + currentHistory;
    
    // Update project data
    project.content[rowIndex][colIndex] = updatedHistory;
    saveState();
    
    // Update cell display
    cell.innerHTML = renderNewCommentCell(updatedHistory);
    cell.setAttribute('data-full-history', updatedHistory);
    
    // Update comment history in panel
    const historyList = document.getElementById('comment-history-list');
    renderCommentHistory(historyList, updatedHistory);
    
    // Clear input
    commentInput.value = '';
}

function handleProjectDelete(deleteIcon) {
    const tabToDelete = deleteIcon.closest('.project-tab');
    const projectId = tabToDelete.dataset.tab;

    if (confirm(`Are you sure you want to delete project "${state.projectsData[projectId].name}"?`)) {
        delete state.projectsData[projectId];
        
        const paneToDelete = document.getElementById(projectId);
        tabToDelete.remove();
        if (paneToDelete) paneToDelete.remove();
        
        const firstTab = document.querySelector('#tabs .project-tab');
        if (firstTab) {
            handleTabSwitch(firstTab, '.project-tab', '.project-pane');
        } else {
            // Handle case where no projects are left
            document.getElementById('tab-content').innerHTML = '<div class="no-projects-message">No projects yet. Add one to get started!</div>';
        }
        
        saveState();
    }
}

function handleTabSwitch(targetTab, tabSelector, paneSelector) {
    const tabId = targetTab.dataset.tab;
    const targetPane = document.getElementById(tabId);
    
    document.querySelectorAll(tabSelector).forEach(t => t.classList.remove('active'));
    
    // Find the correct container for the panes
    const paneContainer = targetTab.closest('.tab-buttons')?.nextElementSibling ?? document.getElementById('tab-content') ?? document.getElementById('template-content');

    if (paneContainer) {
        // Hide all panes within that container
        const panes = paneContainer.querySelectorAll(paneSelector);
        panes.forEach(p => p.classList.remove('active'));
    }

    targetTab.classList.add('active');
    if (targetPane) targetPane.classList.add('active');
}

function handleMainNavigation(navItem) {
    // Deactivate all nav items and content sections
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });

    // Activate the clicked nav item and its corresponding content section
    navItem.classList.add('active');
    const targetSectionId = navItem.dataset.section;
    const targetSection = document.getElementById(targetSectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    // Run specific initializers for sections
    if (targetSectionId === 'consulta') {
        // Just render the existing contacts, don't sync automatically
        import('./contacts.js').then(module => {
            module.renderContactsTable();
        });
    } else if (targetSectionId === 'seguimiento') {
        // This will default to showing the projects view
        initializeKanban(); // Still useful to run to prep filters if user switches
    } else if (targetSectionId === 'templates') {
        renderMainTemplate();
        renderEmailTemplates();
    }
}

function handleSeguimientoViewSwitch(tab) {
    document.querySelectorAll('.seguimiento-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    const targetViewId = tab.dataset.view;
    document.querySelectorAll('.seguimiento-view').forEach(view => view.classList.remove('active'));
    
    const targetView = document.getElementById(`${targetViewId}-view`);
    if (targetView) targetView.classList.add('active');

    if (targetViewId === 'kanban') {
        initializeKanban();
    }
}

function handleAddProject() {
    state.projectCount++;
    const projectId = `project-${state.projectCount}`;
    const initialProjectName = `Project ${state.projectCount}`;

    state.projectsData[projectId] = {
        headers: JSON.parse(JSON.stringify(state.currentTemplateHeaders)),
        content: JSON.parse(JSON.stringify(state.currentTemplateRows)),
        name: initialProjectName,
        quickInfoContacts: {
            address: 'Address: --',
            contacts: [
                { position: 'Project Manager', name: '--', email: '--', phone: '--' },
                { position: 'Team Lead', name: '--', email: '--', phone: '--' },
                { position: 'Client Contact', name: '--', email: '--', phone: '--' },
            ]
        }
    };
    
    const { tabButton, tabPane } = createProjectTab(state.projectsData[projectId], projectId);
    
    const tabsContainer = document.getElementById('tabs');
    const addProjectButton = document.getElementById('add-project-button');
    tabsContainer.insertBefore(tabButton, addProjectButton);
    
    const tabContentContainer = document.getElementById('tab-content');
    const noProjectMessage = tabContentContainer.querySelector('.no-projects-message');
    if(noProjectMessage) noProjectMessage.remove();
    tabContentContainer.appendChild(tabPane);
    
    const projectTable = tabPane.querySelector('.project-table');
    renderTable(projectTable, state.projectsData[projectId].headers, state.projectsData[projectId].content, false);

    handleTabSwitch(tabButton, '.project-tab', '.project-pane');

    saveState();
}

function handleToggleEditMode(button) {
    state.isEditMode = !state.isEditMode;
    button.textContent = state.isEditMode ? 'Disable Edit Mode' : 'Enable Edit Mode';
    button.classList.toggle('active', state.isEditMode);
    
    const mainTemplateTable = document.getElementById('main-template-table');
    renderTable(mainTemplateTable, state.currentTemplateHeaders, state.currentTemplateRows, true);
}


// --- Context Menu Specific Handlers ---

function showContextMenu(e, header) {
    const contextMenu = document.getElementById('context-menu');
    
    state.contextMenuType = header.classList.contains('column-header') ? 'column' : 'row';
    state.contextMenuTargetIndex = parseInt(header.dataset.colIndex ?? header.dataset.rowIndex);

    contextMenu.innerHTML = state.contextMenuType === 'column' ? `
        <div class="context-menu-item" data-action="insert-col-left">Insert Column Left</div>
        <div class="context-menu-item" data-action="insert-col-right">Insert Column Right</div>
        <div class="context-menu-item" data-action="delete-col">Delete Column</div>
    ` : `
        <div class="context-menu-item" data-action="insert-row-above">Insert Row Above</div>
        <div class="context-menu-item" data-action="insert-row-below">Insert Row Below</div>
        <div class="context-menu-item" data-action="delete-row">Delete Row</div>
    `;

    contextMenu.style.top = `${e.pageY}px`;
    contextMenu.style.left = `${e.pageX}px`;
    contextMenu.style.display = 'block';
}

function handleContextMenuAction(action) {
    const { contextMenuType, contextMenuTargetIndex } = state;

    if (contextMenuType === 'column') {
        if (action === 'insert-col-left') {
            state.currentTemplateHeaders.splice(contextMenuTargetIndex, 0, 'New Column');
            state.currentTemplateRows.forEach(row => row.splice(contextMenuTargetIndex, 0, ''));
        } else if (action === 'insert-col-right') {
            state.currentTemplateHeaders.splice(contextMenuTargetIndex + 1, 0, 'New Column');
            state.currentTemplateRows.forEach(row => row.splice(contextMenuTargetIndex + 1, 0, ''));
        } else if (action === 'delete-col') {
            state.currentTemplateHeaders.splice(contextMenuTargetIndex, 1);
            state.currentTemplateRows.forEach(row => row.splice(contextMenuTargetIndex, 1));
        }
    } else if (contextMenuType === 'row') {
        const newRow = new Array(state.currentTemplateHeaders.length).fill('');
        if (action === 'insert-row-above') {
            state.currentTemplateRows.splice(contextMenuTargetIndex, 0, newRow);
        } else if (action === 'insert-row-below') {
            state.currentTemplateRows.splice(contextMenuTargetIndex + 1, 0, newRow);
        } else if (action === 'delete-row') {
            state.currentTemplateRows.splice(contextMenuTargetIndex, 1);
        }
    }

    // After modification, re-render the main template table and save state
    renderMainTemplate();
    saveState();
}

function handleDeleteEmailTemplate(index) {
    if (confirm(`Are you sure you want to delete the template: "${state.emailTemplates[index].name}"?`)) {
        state.emailTemplates.splice(index, 1);
        saveState();
        renderEmailTemplates();
    }
}

function handleAddContactRow(button) {
    const projectId = button.closest('.project-pane').id;
    const projectContacts = state.projectsData[projectId].quickInfoContacts.contacts;
    
    projectContacts.push({ position: 'New Position', name: '', email: '', phone: '' });
    
    // Re-render the tab content
    const project = state.projectsData[projectId];
    const { tabPane } = createProjectTab(project, projectId);
    const oldPane = document.getElementById(projectId);
    oldPane.innerHTML = tabPane.innerHTML;
    
    // Make sure the correct tab is visible
    const quickInfoRight = document.querySelector(`#${projectId} .quick-info-right`);
    quickInfoRight.querySelector('.info-tab-vertical[data-tab-class="contacts-content-pane"]').click();
}

function handleDeleteContactRow(button) {
    const projectId = button.closest('.project-pane').id;
    const contactIndex = parseInt(button.dataset.contactIndex);
    const projectContacts = state.projectsData[projectId].quickInfoContacts.contacts;

    projectContacts.splice(contactIndex, 1);
    
    // Re-render the tab content
    const project = state.projectsData[projectId];
    const { tabPane } = createProjectTab(project, projectId);
    document.getElementById(projectId).innerHTML = tabPane.innerHTML;

    // Make sure the correct tab is visible
    const quickInfoRight = document.querySelector(`#${projectId} .quick-info-right`);
    quickInfoRight.querySelector('.info-tab-vertical[data-tab-class="contacts-content-pane"]').click();
}

function handleEvidenceInput(input) {
    const projectId = input.closest('.project-pane').id;
    const field = input.dataset.field;
    const value = input.value;

    if (!state.projectsData[projectId].evidence) {
        state.projectsData[projectId].evidence = {};
    }
    state.projectsData[projectId].evidence[field] = value;
    saveState();
}

function handleAdditionalNotesInput(input) {
    const projectId = input.closest('.project-pane').id;
    const value = input.value;

    state.projectsData[projectId].additionalNotes = value;
    saveState();
}

function handleEditContact(contactId) {
    const contact = state.contacts.find(c => c.id === contactId);
    if (!contact) return;

    const editModal = document.getElementById('edit-contact-modal');
    const editForm = document.getElementById('edit-contact-form');
    
    // Fill form with contact data
    editForm.elements['id'].value = contact.id;
    editForm.elements['name'].value = contact.name;
    editForm.elements['position'].value = contact.position;
    editForm.elements['email'].value = contact.email;
    editForm.elements['phone'].value = contact.phone || '';
    editForm.elements['company'].value = contact.company;

    // Update project tags
    const tagsContainer = document.getElementById('edit-contact-project-tags');
    tagsContainer.innerHTML = '';
    
    // Add all project names as tags
    Object.values(state.projectsData).forEach(project => {
        if (project.name === 'Main Template') return;
        
        const tagElement = document.createElement('span');
        tagElement.className = `project-tag ${contact.projects.includes(project.name) ? 'selected' : 'unselected'}`;
        tagElement.textContent = project.name;
        tagElement.setAttribute('data-project', project.name);
        
        // Add click handler for selection
        tagElement.addEventListener('click', () => {
            if (tagElement.classList.contains('selected')) {
                tagElement.classList.remove('selected');
                tagElement.classList.add('unselected');
            } else {
                tagElement.classList.remove('unselected');
                tagElement.classList.add('selected');
            }
        });
        
        tagsContainer.appendChild(tagElement);
    });

    editModal.style.display = 'block';
}

function handleDeleteContact(contactId) {
    const contact = state.contacts.find(c => c.id === contactId);
    if (!contact) return;

    if (confirm(`Are you sure you want to delete contact "${contact.name}"?`)) {
        // Remove contact from all associated projects
        contact.projects.forEach(projectName => {
            const project = Object.entries(state.projectsData)
                .find(([_, p]) => p.name === projectName);
            if (project) {
                const [_, projectData] = project;
                if (projectData.quickInfoContacts && projectData.quickInfoContacts.contacts) {
                    projectData.quickInfoContacts.contacts = projectData.quickInfoContacts.contacts
                        .filter(c => c.email !== contact.email);
                }
            }
        });

        // Remove from contacts array
        state.contacts = state.contacts.filter(c => c.id !== contactId);
        saveState();
        import('./contacts.js').then(module => {
            module.syncContactsWithProjects();
        });
    }
}

// handleEditContactSubmit function moved to contacts.js to avoid conflicts

function setupProjectTabHandlers() {
    document.addEventListener('click', (e) => {
        // Info tab switching
        if (e.target.matches('.info-tab-vertical')) {
            const tabPane = e.target.closest('.project-pane');
            if (!tabPane) return;

            const tabClass = e.target.dataset.tabClass;
            if (!tabClass) return;

            // Update active tab
            tabPane.querySelectorAll('.info-tab-vertical').forEach(tab => {
                tab.classList.remove('active');
            });
            e.target.classList.add('active');

            // Show corresponding content
            tabPane.querySelectorAll('.info-content').forEach(content => {
                content.classList.remove('active');
            });
            tabPane.querySelector(`.${tabClass}`).classList.add('active');
        }

        // Analytics section toggle
        if (e.target.closest('.analytics-header')) {
            const content = e.target.closest('.analytics-section').querySelector('.analytics-content');
            const toggleIcon = e.target.closest('.analytics-section').querySelector('.toggle-icon-analytics');
            
            if (content.style.display === 'none') {
                content.style.display = 'block';
                toggleIcon.style.transform = 'rotate(180deg)';
            } else {
                content.style.display = 'none';
                toggleIcon.style.transform = 'rotate(0deg)';
            }
        }

        // Analytics tab switching
        if (e.target.matches('.analytics-tab')) {
            const tabPane = e.target.closest('.project-pane');
            if (!tabPane) return;

            const viewType = e.target.dataset.analyticsView;
            if (!viewType) return;

            // Update active tab
            tabPane.querySelectorAll('.analytics-tab').forEach(tab => {
                tab.classList.remove('active');
            });
            e.target.classList.add('active');

            // Show corresponding view
            tabPane.querySelectorAll('.analytics-view').forEach(view => {
                view.classList.remove('active');
            });
            tabPane.querySelector(`#${viewType}-view-${tabPane.id}`).classList.add('active');
        }

        // Contact row actions
        if (e.target.matches('.delete-contact-row-btn')) {
            const row = e.target.closest('tr');
            if (row) {
                // If this is the last row, don't delete it
                const tbody = row.closest('tbody');
                if (tbody.querySelectorAll('tr').length <= 3) {
                    alert('Cannot delete the last contact row');
                    return;
                }
                row.remove();
                updateLastContactRow(tbody);
            }
        }

        if (e.target.matches('.add-contact-row-btn')) {
            const tbody = e.target.closest('tbody');
            if (tbody) {
                const newRow = document.createElement('tr');
                newRow.classList.add('last-contact-row');
                newRow.innerHTML = `
                    <td contenteditable="true"></td>
                    <td contenteditable="true"></td>
                    <td contenteditable="true"></td>
                    <td contenteditable="true"></td>
                    <td class="action-column">
                        <button class="delete-contact-row-btn" title="Delete row">🗑️</button>
                        <button class="add-contact-row-btn" title="Add new row">➕</button>
                    </td>
                `;
                tbody.appendChild(newRow);
                updateLastContactRow(tbody);
            }
        }
    });
}

function updateLastContactRow(tbody) {
    // Remove last-contact-row class from all rows
    tbody.querySelectorAll('tr').forEach(row => {
        row.classList.remove('last-contact-row');
    });

    // Add last-contact-row class to the last data row
    const rows = tbody.querySelectorAll('tr:not(:first-child):not(:nth-child(2))');
    if (rows.length > 0) {
        rows[rows.length - 1].classList.add('last-contact-row');
    }
}
