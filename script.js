document.addEventListener('DOMContentLoaded', () => {
    // Seguimiento tab switching logic
    const seguimientoTabs = document.querySelectorAll('.seguimiento-tab');
    seguimientoTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Update active tab
            seguimientoTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Update active view
            const targetView = tab.getAttribute('data-view');
            document.querySelectorAll('.seguimiento-view').forEach(view => {
                view.classList.remove('active');
            });
            document.getElementById(`${targetView}-view`).classList.add('active');

            // Initialize Kanban if switching to Kanban view
            if (targetView === 'kanban') {
                initializeKanban();
            }
        });
    });

    // Navigation Menu Functionality
    const navMenu = document.querySelector('.nav-menu');
    const navToggle = document.querySelector('.nav-toggle');
    const navItems = document.querySelectorAll('.nav-item');
    const contentSections = document.querySelectorAll('.content-section');

    // Toggle navigation menu
    navToggle.addEventListener('click', () => {
        navMenu.classList.toggle('collapsed');
    });

    // Handle navigation item clicks
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // Update active navigation item
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            // Show corresponding content section
            const targetSection = item.dataset.section;
            contentSections.forEach(section => {
                section.classList.remove('active');
                if (section.id === targetSection) {
                    section.classList.add('active');
                }
            });

            // If switching to Templates section, ensure main template is visible
            if (targetSection === 'templates') {
                const mainTemplateButton = document.querySelector('.tab-button[data-tab="main-template"]');
                const mainTemplatePane = document.getElementById('main-template');
                if (mainTemplateButton && mainTemplatePane) {
                    mainTemplateButton.classList.add('active');
                    mainTemplatePane.classList.add('active');
                }
            }
        });
    });

    // Function to execute PowerShell commands
    const executePowerShellCommand = async (command) => {
        try {
            const response = await fetch('/execute-powershell', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ command })
            });
            
            if (!response.ok) {
                throw new Error('Failed to execute PowerShell command');
            }
            
            const result = await response.text();
            return result.trim();
        } catch (error) {
            console.error('Error executing PowerShell command:', error);
            return null;
        }
    };

    // Function to open file picker and get path
    const getFilePathFromPicker = async () => {
        const command = `
            Add-Type -AssemblyName System.Windows.Forms
            $f = New-Object System.Windows.Forms.OpenFileDialog
            $f.ShowDialog() | Out-Null
            $f.FileName
        `;
        return await executePowerShellCommand(command);
    };

    // Add event listener for executing PowerShell commands
    document.addEventListener('executeCommand', async (event) => {
        const { command } = event.detail;
        
        try {
            // Use the Windows shell to execute the command
            const process = new ActiveXObject('WScript.Shell');
            process.Run(command, 0, true);
            document.dispatchEvent(new CustomEvent('commandResult', { detail: { success: true } }));
        } catch (error) {
            console.error('Error executing command:', error);
            document.dispatchEvent(new CustomEvent('commandResult', { detail: { error } }));
        }
    });

    const tabsContainer = document.getElementById('tabs');
    const tabContentContainer = document.getElementById('tab-content');
    const addProjectButton = document.getElementById('add-project-button');
    const mainTemplateTable = document.getElementById('main-template-table');
    const toggleEditModeButton = document.getElementById('toggle-edit-mode'); // New: Edit Mode button
    const refreshProjectsButton = document.getElementById('refresh-projects-button');
    const contextMenu = document.getElementById('context-menu'); // New: Context menu div
    const resetStateButton = document.getElementById('reset-state-button');

    // Debugging: Check if the button element is found
    console.log('toggleEditModeButton element:', toggleEditModeButton);
    console.log('refreshProjectsButton element:', refreshProjectsButton);
    console.log('contextMenu element:', contextMenu);

    let projectCount = 0;
    let projectsData = {};
    let activeDatepicker = null;
    let currentDateCell = null; // Track which cell we're editing

    // Column resizing variables
    let isResizing = false;
    let currentTable = null;
    let currentColumn = null;
    let startX = 0;
    let startWidth = 0;
    let columnWidths = {}; // Store column widths for each table

    let isEditMode = false; // New state: Tracks if edit mode is active
    let selectedRowIndex = -1; // New state: Index of currently selected row (-1 if none)
    let selectedColIndex = -1; // New state: Index of currently selected column (-1 if none)
    let contextMenuType = null; // 'row' or 'column'
    let contextMenuTargetIndex = -1; // Index of the row/column for context menu actions

    // --- CSV Data Emulation ---
    const csvData = [
        {"ID": 1, "Fase": "Requisitos Previos", "Unnamed: 2": "", "Unnamed: 3": 1, "Milestone": "Contacto Inicial", "Unnamed: 5": "", "Unnamed: 6": "", "Actividad": "Integracion de equipo de trabajo/asignacion de recurso humano", "Unnamed: 8": "", "Unnamed: 9": "", "Unnamed: 10": "", "Unnamed: 11": "", "Unnamed: 12": "", "Unnamed: 13": "", "Duracion": 5, "Fecha Esperada": "19-Oct-24", "Dependencia": "", "Responsable": "Pablo", "Unnamed: 18": "", "Status": "completo", "Unnamed: 20": "", "Comentario": "", "Unnamed: 22": "", "Unnamed: 23": "", "Unnamed: 24": "", "Unnamed: 25": "", "Nuevo": "", "Unnamed: 27": "", "Unnamed: 28": "", "Fecha": "", "Unnamed: 30": "", "Fecha Termino": "", "Evidencia": ""},
        {"ID": 2, "Fase": "Requisitos Previos", "Unnamed: 2": "", "Unnamed: 3": 1, "Milestone": "Contacto Inicial", "Unnamed: 5": "", "Unnamed: 6": "", "Actividad": "Crear canales de comunicacion (grupo WA)", "Unnamed: 8": "", "Unnamed: 9": "", "Unnamed: 10": "", "Unnamed: 11": "", "Unnamed: 12": "", "Unnamed: 13": "", "Duracion": 1, "Fecha Esperada": "24-Oct-24", "Dependencia": 1, "Responsable": "Pablo", "Unnamed: 18": "", "Status": "completo", "Unnamed: 20": "", "Comentario": "", "Unnamed: 22": "", "Unnamed: 23": "", "Unnamed: 24": "", "Unnamed: 25": "", "Nuevo": "", "Unnamed: 27": "", "Unnamed: 28": "", "Fecha": "", "Unnamed: 30": "", "Fecha Termino": "", "Evidencia": ""},
        {"ID": 3, "Fase": "Requisitos Previos", "Unnamed: 2": "", "Unnamed: 3": 0, "Milestone": "Perfiles de Telefonia", "Unnamed: 5": "", "Unnamed: 6": "", "Actividad": "PT-Preparacion de presentacion", "Unnamed: 8": "", "Unnamed: 9": "", "Unnamed: 10": "", "Unnamed: 11": "", "Unnamed: 12": "", "Unnamed: 13": "", "Duracion": 1, "Fecha Esperada": "25-Oct-24", "Dependencia": 2, "Responsable": "Pablo", "Unnamed: 18": "", "Status": "completo", "Unnamed: 20": "", "Comentario": "", "Unnamed: 22": "", "Unnamed: 23": "", "Unnamed: 24": "", "Unnamed: 25": "", "Nuevo": "", "Unnamed: 27": "", "Unnamed: 28": "", "Fecha": "", "Unnamed: 30": "", "Fecha Termino": "", "Evidencia": ""},
        {"ID": 4, "Fase": "Requisitos Previos", "Unnamed: 2": "", "Unnamed: 3": 1, "Milestone": "Perfiles de Telefonia", "Unnamed: 5": "", "Unnamed: 6": "", "Actividad": "PT-Requerimiento de sesion", "Unnamed: 8": "", "Unnamed: 9": "", "Unnamed: 10": "", "Unnamed: 11": "", "Unnamed: 12": "", "Unnamed: 13": "", "Duracion": 1, "Fecha Esperada": "25-Oct-24", "Dependencia": 2, "Responsable": "Pablo", "Unnamed: 18": "", "Status": "completo", "Unnamed: 20": "", "Comentario": "", "Unnamed: 22": "", "Unnamed: 23": "", "Unnamed: 24": "", "Unnamed: 25": "", "Nuevo": "", "Unnamed: 27": "", "Unnamed: 28": "", "Fecha": "", "Unnamed: 30": "", "Fecha Termino": "", "Evidencia": ""},
        {"ID": 5, "Fase": "Requisitos Previos", "Unnamed: 2": "", "Unnamed: 3": 0, "Milestone": "Perfiles de Telefonia", "Unnamed: 5": "", "Unnamed: 6": "", "Actividad": "PT-Acuerdo de fecha y hora", "Unnamed: 8": "", "Unnamed: 9": "", "Unnamed: 10": "", "Unnamed: 11": "", "Unnamed: 12": "", "Unnamed: 13": "", "Duracion": 2, "Fecha Esperada": "26-Oct-24", "Dependencia": 4, "Responsable": "ATI", "Unnamed: 18": "", "Status": "completo", "Unnamed: 20": "", "Comentario": "", "Unnamed: 22": "", "Unnamed: 23": "", "Unnamed: 24": "", "Unnamed: 25": "", "Nuevo": "", "Unnamed: 27": "", "Unnamed: 28": "", "Fecha": "", "Unnamed: 30": "", "Fecha Termino": "", "Evidencia": ""}
    ];

    let currentTemplateHeaders = Object.keys(csvData[0]); // Initial headers from CSV
    let currentTemplateRows = csvData.map(row => Object.values(row)); // Initial rows from CSV

    // Columns that should be non-editable in project tabs
    // 'Actividad' was added based on previous conversation
    const nonEditableColumns = ['ID', 'Fase', 'Milestone', 'Actividad'];

    // --- Helper functions ---
    const isDateColumn = (headerText) => /fecha|date/i.test(headerText);
    const isStatusColumn = (headerText) => /status|estado/i.test(headerText);
    const isCommentColumn = (headerText) => /^comentario$/i.test(headerText.trim());
    const isNewCommentColumn = (headerText) => {
        const result = /nuevo\s*comentario/i.test(headerText) || headerText.trim().toLowerCase() === 'nuevo';
        console.log('Checking if column is nuevo comentario:', headerText, result);
        return result;
    };
    const isEvidenciaColumn = (headerText) => headerText.trim().toLowerCase() === 'evidencia';
    const isDurationColumn = (headerText) => /^duracion$|^dias$/i.test(headerText.trim());
    const isDependencyColumn = (headerText) => /^dependencia$|^dep\.?$/i.test(headerText.trim());
    const isExpectedDateColumn = (headerText) => /^fecha\s*esperada$/i.test(headerText.trim());

    // Function to get current timestamp in short format
    const getCurrentTimestamp = () => {
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = now.toLocaleString('en-US', { month: 'short' });
        return `${day}-${month}`;
    };

    // Function to extract the latest comment from history
    const getLatestComment = (commentHistory) => {
        if (!commentHistory || commentHistory.trim() === '') {
            return '';
        }
        
        // Get first line since comments are now single-line with date at the end
        const lines = commentHistory.split('\n');
        return lines[0] || '';
    };

    // Function to format a comment line to ensure consistent format
    const formatCommentLine = (line) => {
        // Remove any existing date format
        let cleanLine = line.replace(/\[\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}\]/g, '').trim();
        // Extract any date in the new format if it exists
        const dateMatch = line.match(/\[\d{2}-[A-Za-z]{3}\]/g);
        const date = dateMatch ? dateMatch[0] : '';
        // Remove the new format date if it exists
        cleanLine = cleanLine.replace(/\[\d{2}-[A-Za-z]{3}\]/g, '').trim();
        return date ? `${cleanLine} ${date}` : cleanLine;
    };

    // Function to render comment cell (collapsed by default)
    const renderCommentCell = (commentHistory, isExpanded = false) => {
        if (!commentHistory || commentHistory.trim() === '') {
            return '';
        }
        
        const lines = commentHistory.split('\n').map(line => formatCommentLine(line));
        
        if (isExpanded) {
            return lines.join('\n');
        } else {
            return lines[0] || '';
        }
    };

    // Function to format existing comment history to new format
    const reformatCommentHistory = (history) => {
        if (!history || history.trim() === '') return '';
        
        return history.split('\n').map(line => {
            // Extract the comment and old timestamp
            const match = line.match(/(.*?)\s*\[(.*?)\]/);
            if (!match) return line;
            
            const comment = match[1].trim();
            // Convert the old timestamp to new format
            const date = new Date(match[2].replace(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/, '$3-$2-$1 $4:$5'));
            if (isNaN(date.getTime())) return line;
            
            const day = String(date.getDate()).padStart(2, '0');
            const month = date.toLocaleString('en-US', { month: 'short' });
            return `${comment} [${day}-${month}]`;
        }).join('\n');
    };

    // Function to add new comment to history
    const addCommentToHistory = (currentHistory, newComment) => {
        if (!newComment || newComment.trim() === '') {
            return currentHistory;
        }
        
        const timestamp = getCurrentTimestamp();
        const newEntry = `${newComment.trim()} [${timestamp}]`;
        
        // If there's no history, just return the new entry
        if (!currentHistory || currentHistory.trim() === '') {
            return newEntry;
        }
        
        // If the history is in old format, reformat it first
        const formattedHistory = reformatCommentHistory(currentHistory);
        return `${newEntry}\n${formattedHistory}`;
    };

    // Function to get status class based on status text
    const getStatusClass = (status) => {
        const statusLower = status.toLowerCase();
        switch (statusLower) {
            case 'completo': return 'status-completo';
            case 'en proceso': return 'status-en-proceso';
            case 'pendiente': return 'status-pendiente';
            case 'n/a': return 'status-na';
            default: return '';
        }
    };

    // Function to render status cell content
    const renderStatusCell = (status) => {
        if (!status || status.trim() === '') {
            return '';
        }
        const statusClass = getStatusClass(status);
        return `<span class="status-tag ${statusClass}">${status}</span>`;
    };

    // --- State Management ---
    function saveState() {
        // Save quick info contacts from DOM before saving
        Object.keys(projectsData).forEach(projectId => {
            const project = projectsData[projectId];
            if (project) {
                const tabPane = document.getElementById(projectId);
                if (tabPane) {
                    const contactsTable = tabPane.querySelector('.quick-info-table .contacts-table');
                    if (contactsTable) {
                        const address = contactsTable.querySelector('.address-row')?.textContent || '';
                        const contactRows = contactsTable.querySelectorAll('tr:not(:first-child):not(:nth-child(2))');
                        const contacts = Array.from(contactRows).map(row => ({
                            position: row.cells[0]?.textContent || '',
                            name: row.cells[1]?.textContent || '',
                            email: row.cells[2]?.textContent || '',
                            phone: row.cells[3]?.textContent || '',
                        }));
                        project.quickInfoContacts = { address, contacts };
                    }
                }
            }
        });

        const state = {
            headers: currentTemplateHeaders,
            rows: currentTemplateRows,
            projects: projectsData,
            projectCount: projectCount,
            columnWidths: columnWidths
        };
        localStorage.setItem('dashboardState', JSON.stringify(state));
        console.log("Dashboard state saved.");
    }

    function loadAndRenderState() {
        // Clear any existing project tabs and panes before loading
        document.querySelectorAll('#tabs .project-tab').forEach(btn => btn.remove());
        document.querySelectorAll('#tab-content .project-pane').forEach(pane => pane.remove());

        const savedState = localStorage.getItem('dashboardState');

        if (!savedState) {
            console.log('No saved state found. Rendering from default CSV data.');
            renderTable(mainTemplateTable, currentTemplateHeaders, currentTemplateRows, true);
            return;
        }

        console.log('Saved state found. Restoring dashboard...');
        const state = JSON.parse(savedState);

        currentTemplateHeaders = state.headers || Object.keys(csvData[0]);
        currentTemplateRows = state.rows || csvData.map(row => Object.values(row));
        projectsData = state.projects || {};
        projectCount = state.projectCount || 0;
        columnWidths = state.columnWidths || {};

        // Render main template table in the Templates section
        renderTable(mainTemplateTable, currentTemplateHeaders, currentTemplateRows, true);

        // Render project tabs in the Seguimiento section
        const tabsContainer = document.getElementById('tabs');
        const tabContentContainer = document.getElementById('tab-content');

        Object.keys(projectsData).forEach(projectId => {
            const project = projectsData[projectId];
            if (!project) return;

            // Create new project tab using createProjectTab function
            const { tabButton, tabPane } = createProjectTab(project.name || `Project ${projectId.split('-')[1]}`, projectId);
            
            // Add delete icon
            const deleteIcon = document.createElement('span');
            deleteIcon.classList.add('delete-tab-icon');
            deleteIcon.innerHTML = '&#128465;'; // Trash can emoji
            tabButton.appendChild(deleteIcon);

            // Insert the tab and pane
            tabsContainer.insertBefore(tabButton, addProjectButton);
            tabContentContainer.appendChild(tabPane);

            // Render the project table
            const projectTable = tabPane.querySelector('.project-table');
            renderTable(projectTable, project.headers, project.content, false);

            // Load quick info contacts
            renderProjectQuickInfo(projectId);
        });
    }

    // Function to render a table from data
    function renderTable(tableElement, headers, rows, isMainTemplate = false) {
        const thead = tableElement.querySelector('thead');
        const tbody = tableElement.querySelector('tbody');

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
                th.dataset.colIndex = colIdx; // Store index for column actions
                th.classList.add('column-header'); // Make column headers clickable in main template
            }
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);

        // Create rows
        rows.forEach((rowData, rowIdx) => {
            const tr = document.createElement('tr');
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
                const isEditable = isMainTemplate ? isEditMode : !nonEditableColumns.includes(header);

                if (isEditable && isDateColumn(header)) {
                    // Add a special class to the TD itself to remove padding
                    td.classList.add('date-cell-td');
                    // Use a wrapper for positioning context, this prevents the datepicker from being trapped
                    td.innerHTML = `
                        <div class="date-cell-wrapper">
                            <div class="cell-content" contenteditable="true">${rowData[colIndex] !== undefined ? rowData[colIndex] : ''}</div>
                            <span class="calendar-icon">&#128465;</span>
                        </div>
                    `;
                } else if (isEditable && isStatusColumn(header)) {
                    // Status cells
                    td.classList.add('status-cell');
                    const statusValue = rowData[colIndex] !== undefined ? rowData[colIndex] : '';
                    td.innerHTML = renderStatusCell(statusValue);
                    td.setAttribute('data-status', statusValue);
                    td.setAttribute('contenteditable', 'false'); // Status cells are not directly editable
                } else if (isCommentColumn(header)) {
                    // Comment history cells (read-only)
                    td.classList.add('comment-cell', 'collapsed');
                    const commentHistory = rowData[colIndex] !== undefined ? rowData[colIndex] : '';
                    td.textContent = renderCommentCell(commentHistory, false);
                    td.setAttribute('data-full-history', commentHistory);
                    td.setAttribute('contenteditable', 'false');
                } else if (isEvidenciaColumn(header)) {
                    // Replace the inline Evidencia cell creation with our function
                    const evidenciaCell = createEvidenciaCell(isMainTemplate, rowData, colIndex);
                    
                    if (!isMainTemplate) {
                        // Get the main template state
                        const mainTemplateValue = currentTemplateRows[rowIdx]?.[colIndex];
                        if (mainTemplateValue) {
                            try {
                                const state = JSON.parse(mainTemplateValue);
                                evidenciaCell.classList.toggle('evidencia-required', state.required);
                                evidenciaCell.classList.toggle('text-mode', state.isText);
                                updateEvidenciaContent(evidenciaCell, state.isText);
                            } catch (e) {
                                // Handle legacy format
                                evidenciaCell.classList.toggle('evidencia-required', mainTemplateValue === 'true');
                            }
                        }
                        
                        // Set up existing file/text data if it exists
                        if (rowData[colIndex]) {
                            try {
                                const fileData = JSON.parse(rowData[colIndex]);
                                if (fileData && fileData.name) {
                                    const pathDiv = document.createElement('div');
                                    pathDiv.className = 'file-path';
                                    const fileLink = createFileLink(fileData.name, fileData.path || fileData.name);
                                    pathDiv.appendChild(fileLink);
                                    evidenciaCell.querySelector('.evidencia-content').appendChild(pathDiv);
                                    
                                    // Update buttons visibility
                                    const attachButton = evidenciaCell.querySelector('.attach-button');
                                    const deleteButton = evidenciaCell.querySelector('.delete-button');
                                    if (attachButton) attachButton.style.display = 'none';
                                    if (deleteButton) {
                                        deleteButton.style.display = '';
                                        deleteButton.classList.add('visible');
                                    }
                                    evidenciaCell.classList.add('has-attachment');
                                }
                            } catch (e) {
                                // Check if it's text content
                                if (typeof rowData[colIndex] === 'string' && rowData[colIndex].trim()) {
                                    const textInput = evidenciaCell.querySelector('.evidence-text');
                                    if (textInput) {
                                        textInput.value = rowData[colIndex];
                                        evidenciaCell.classList.add('has-text', 'has-attachment');
                                        const deleteButton = evidenciaCell.querySelector('.delete-button');
                                        if (deleteButton) {
                                            deleteButton.style.display = '';
                                            deleteButton.classList.add('visible');
                                        }
                                    }
                                }
                            }
                        }
                    }
                    
                    // Replace td with our evidenciaCell
                    tr.appendChild(evidenciaCell);
                    return; // Skip the rest of the loop for this cell
                } else if (isEditable && isNewCommentColumn(header)) {
                    // New comment input cells
                    td.className = 'new-comment-cell';
                    
                    const wrapper = document.createElement('div');
                    wrapper.className = 'new-comment-wrapper';
                    
                    const content = document.createElement('div');
                    content.className = 'comment-content';
                    content.setAttribute('contenteditable', 'true');
                    content.setAttribute('placeholder', 'Add a comment...');
                    content.textContent = rowData[colIndex] !== undefined ? rowData[colIndex] : '';
                    
                    const button = document.createElement('button');
                    button.type = 'button';
                    button.className = 'submit-comment-icon';
                    button.title = 'Save comment';
                    button.textContent = '💾';
                    
                    // Add focus/blur handlers for the content div
                    content.addEventListener('focus', () => {
                        button.classList.add('visible');
                    });
                    
                    content.addEventListener('blur', (e) => {
                        // Don't hide if clicking the save button
                        if (!e.relatedTarget || !e.relatedTarget.classList.contains('submit-comment-icon')) {
                            button.classList.remove('visible');
                        }
                    });
                    
                    wrapper.appendChild(content);
                    wrapper.appendChild(button);
                    td.appendChild(wrapper);
                    
                    td.setAttribute('contenteditable', 'false');
                } else {
                    td.textContent = rowData[colIndex] !== undefined ? rowData[colIndex] : '';
                    td.setAttribute('contenteditable', isEditable);
                }
                
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });

        // This was the source of an infinite loop in certain scenarios.
        // It's not needed here as styles are applied via other calls.
        // applySelectionStyles();

        // Apply saved column widths
        applyColumnWidths(tableElement, headers, isMainTemplate);
    }

    // Function to apply saved column widths
    function applyColumnWidths(tableElement, headers, isMainTemplate) {
        const tableId = isMainTemplate ? 'main-template' : tableElement.closest('.tab-pane').id;
        const savedWidths = columnWidths[tableId];
        
        if (!savedWidths) return;

        const headerCells = tableElement.querySelectorAll('thead th');
        headerCells.forEach((th, index) => {
            const columnIndex = isMainTemplate ? index - 1 : index; // Account for row header in main template
            if (columnIndex >= 0 && savedWidths[columnIndex]) {
                th.style.width = savedWidths[columnIndex] + 'px';
                th.style.minWidth = savedWidths[columnIndex] + 'px';
            }
        });
    }

    // Function to save column widths
    function saveColumnWidths(tableElement, isMainTemplate) {
        const tableId = isMainTemplate ? 'main-template' : tableElement.closest('.tab-pane').id;
        const headerCells = tableElement.querySelectorAll('thead th');
        const widths = {};

        headerCells.forEach((th, index) => {
            const columnIndex = isMainTemplate ? index - 1 : index; // Account for row header in main template
            if (columnIndex >= 0) {
                widths[columnIndex] = th.offsetWidth;
            }
        });

        columnWidths[tableId] = widths;
        saveState();
    }

    // Function to apply/remove selection styles
    function applySelectionStyles() {
        // Clear all previous selections
        mainTemplateTable.querySelectorAll('.selected-row').forEach(el => el.classList.remove('selected-row'));
        mainTemplateTable.querySelectorAll('.selected-column-header').forEach(el => el.classList.remove('selected-column-header'));
        mainTemplateTable.querySelectorAll('.selected-column').forEach(el => el.classList.remove('selected-column'));

        if (selectedRowIndex !== -1) {
            const rowElement = mainTemplateTable.querySelector(`tbody tr:nth-child(${selectedRowIndex + 1})`);
            if (rowElement) {
                rowElement.classList.add('selected-row');
            }
        }
        if (selectedColIndex !== -1) {
            const colHeaderElement = mainTemplateTable.querySelector(`thead th[data-col-index="${selectedColIndex}"]`);
            if (colHeaderElement) {
                colHeaderElement.classList.add('selected-column-header');
            }
            // Select all cells in the column
            mainTemplateTable.querySelectorAll(`tbody tr`).forEach(rowEl => {
                const cell = rowEl.children[selectedColIndex + 1]; // +1 because of row header TH
                if (cell) {
                    cell.classList.add('selected-column');
                }
            });
        }
    }

    // Function to clear selections and hide context menu
    function clearSelectionAndHideMenu() {
        selectedRowIndex = -1;
        selectedColIndex = -1;
        hideContextMenu();
        applySelectionStyles(); // This will remove all 'selected' classes
    }

    // Function to show the context menu
    function showContextMenu(type, index, x, y) {
        hideContextMenu(); // Hide any existing menu
        contextMenu.innerHTML = ''; // Clear previous icons

        contextMenuType = type;
        contextMenuTargetIndex = index;

        let icons = [];
        if (type === 'row') {
            icons = [
                { id: 'insert-row-above', text: '⬆️', title: 'Insert Row Above' },
                { id: 'insert-row-below', text: '⬇️', title: 'Insert Row Below' },
                { id: 'delete-row', text: '🗑️', title: 'Delete Row' }
            ];
        } else if (type === 'column') {
            icons = [
                { id: 'insert-col-left', text: '⬅️', title: 'Insert Column Left' },
                { id: 'insert-col-right', text: '➡️', title: 'Insert Column Right' },
                { id: 'delete-col', text: '🗑️', title: 'Delete Column' },
                { id: 'edit-col-header', text: '✏️', title: 'Edit Column Header' }
            ];
        }

        icons.forEach(iconData => {
            const iconDiv = document.createElement('div');
            iconDiv.id = iconData.id;
            iconDiv.classList.add('context-menu-icon');
            iconDiv.textContent = iconData.text;
            iconDiv.title = iconData.title;
            iconDiv.addEventListener('click', handleContextMenuItemClick);
            contextMenu.appendChild(iconDiv);
        });

        // Get the template section's position and scroll offsets
        const templateSection = document.getElementById('templates');
        const sectionRect = templateSection.getBoundingClientRect();
        const scrollLeft = templateSection.scrollLeft || document.documentElement.scrollLeft;
        const scrollTop = templateSection.scrollTop || document.documentElement.scrollTop;

        // Calculate position relative to the viewport with specific offsets
        let menuX = sectionRect.left + x - scrollLeft;
        let menuY = sectionRect.top + y - scrollTop;

        // Apply specific offsets based on type
        if (type === 'column') {
            menuX -= 350; // Move 350px to the left for columns
            menuY += 23;  // Move 23px down for columns
        } else if (type === 'row') {
            menuX -= 300; // Move 300px to the left for rows
        }

        // Position the menu
        contextMenu.style.left = `${menuX}px`;
        contextMenu.style.top = `${menuY}px`;
        contextMenu.style.display = 'flex';
    }

    // Function to hide the context menu
    function hideContextMenu() {
        contextMenu.style.display = 'none';
        contextMenuType = null;
        contextMenuTargetIndex = -1;
    }

    // Handler for context menu item clicks
    function handleContextMenuItemClick(event) {
        event.stopPropagation(); // Prevent document click from immediately re-hiding
        const actionId = event.currentTarget.id;
        let newColumnName; // Declare here to be accessible in all cases

        switch (actionId) {
            case 'insert-row-above':
                currentTemplateRows.splice(contextMenuTargetIndex, 0, Array(currentTemplateHeaders.length).fill(''));
                break;
            case 'insert-row-below':
                currentTemplateRows.splice(contextMenuTargetIndex + 1, 0, Array(currentTemplateHeaders.length).fill(''));
                break;
            case 'delete-row':
                if (currentTemplateRows.length === 0) { alert("No rows to delete."); break; }
                if (!confirm(`Are you sure you want to delete row ${contextMenuTargetIndex + 1}?`)) { return; }
                currentTemplateRows.splice(contextMenuTargetIndex, 1);
                break;
            case 'insert-col-left':
                newColumnName = prompt("Enter new column name:");
                if (!newColumnName || newColumnName.trim() === '') { alert("Column name cannot be empty."); return; }
                newColumnName = newColumnName.trim();
                if (currentTemplateHeaders.includes(newColumnName)) { alert("Column name already exists."); return; }
                currentTemplateHeaders.splice(contextMenuTargetIndex, 0, newColumnName);
                currentTemplateRows.forEach(row => row.splice(contextMenuTargetIndex, 0, ''));
                break;
            case 'insert-col-right':
                newColumnName = prompt("Enter new column name:");
                if (!newColumnName || newColumnName.trim() === '') { alert("Column name cannot be empty."); return; }
                newColumnName = newColumnName.trim();
                if (currentTemplateHeaders.includes(newColumnName)) { alert("Column name already exists."); return; }
                currentTemplateHeaders.splice(contextMenuTargetIndex + 1, 0, newColumnName);
                currentTemplateRows.forEach(row => row.splice(contextMenuTargetIndex + 1, 0, ''));
                break;
            case 'delete-col':
                if (currentTemplateHeaders.length === 0) { alert("No columns to delete."); break; }
                const columnToDeleteName = currentTemplateHeaders[contextMenuTargetIndex];
                if (nonEditableColumns.includes(columnToDeleteName)) {
                    alert(`Cannot delete essential column '${columnToDeleteName}'.`);
                    return;
                }
                if (!confirm(`Are you sure you want to delete column '${columnToDeleteName}'?`)) { return; }
                currentTemplateHeaders.splice(contextMenuTargetIndex, 1);
                currentTemplateRows.forEach(row => row.splice(contextMenuTargetIndex, 1));
                break;
            case 'edit-col-header':
                const oldColumnName = currentTemplateHeaders[contextMenuTargetIndex];
                if (nonEditableColumns.includes(oldColumnName)) {
                    alert(`Cannot rename essential column '${oldColumnName}'.`);
                    return;
                }
                newColumnName = prompt(`Rename column '${oldColumnName}' to:`);
                if (!newColumnName || newColumnName.trim() === '') {
                    alert("Column name cannot be empty.");
                    return;
                }
                newColumnName = newColumnName.trim();
                if (newColumnName === oldColumnName) {
                    // No change, just dismiss
                    console.log("Column name not changed.");
                    clearSelectionAndHideMenu();
                    return;
                }
                if (currentTemplateHeaders.includes(newColumnName)) {
                    alert(`Column name '${newColumnName}' already exists.`);
                    return;
                }
                currentTemplateHeaders[contextMenuTargetIndex] = newColumnName; // Update the header
                // No need to change rows data, only the header name
                break;
        }
        
        // Re-render the main table, which is the source of truth
        renderTable(mainTemplateTable, currentTemplateHeaders, currentTemplateRows, true);
        
        // Update all project tables based on the new main template state
        updateAllProjectTables(); 
        
        // Clear any selections and hide the context menu
        clearSelectionAndHideMenu(); 
        
        // Save the new state to localStorage
        saveState();
    }


    // Function to update all project tables when main template changes
    function updateAllProjectTables() {
        Object.keys(projectsData).forEach(projectId => {
            const project = projectsData[projectId];
            const projectTable = document.getElementById(projectId).querySelector('.project-table');
            
            const newRows = currentTemplateRows.map((mainTemplateRow, rowIndex) => {
                const newRow = [];
                currentTemplateHeaders.forEach((header, colIndex) => {
                    if (nonEditableColumns.includes(header) || isEvidenciaColumn(header)) {
                        // For non-editable columns and evidencia column, take data from the main template
                        newRow.push(mainTemplateRow[colIndex] !== undefined ? mainTemplateRow[colIndex] : '');
                    } else {
                        // For editable columns, preserve old project data if it exists
                        const oldRow = project.content[rowIndex];
                        const oldHeaderIndex = project.headers.indexOf(header);

                        if (oldRow && oldHeaderIndex !== -1 && oldRow[oldHeaderIndex] !== undefined) {
                            newRow.push(oldRow[oldHeaderIndex]);
                        } else {
                            newRow.push('');
                        }
                    }
                });
                return newRow;
            });
            
            project.content = newRows;
            project.headers = [...currentTemplateHeaders];

            renderTable(projectTable, project.headers, project.content, false);

            // Update timeline if the analytics section is expanded
            const collapsibleContent = document.getElementById(projectId).querySelector('.collapsible-content');
            const timelineTab = document.getElementById(projectId).querySelector('.dashboard-tab[data-tab="timeline"]');
            
            if (collapsibleContent.classList.contains('expanded') && 
                timelineTab.classList.contains('active')) {
                updateProjectTimeline(projectId);
            }
        });
        
        // After rendering all tables, update the visibility and mode states
        updateProjectCellsVisibility();
    }

    // Initial render of the main template table (initially not editable)
    loadAndRenderState();

    // --- Event Listeners ---

    // Tab switching logic for both project and template tabs
    document.addEventListener('click', (event) => {
        const deleteIcon = event.target.closest('.delete-tab-icon');
        const tabButton = event.target.closest('.tab-button');
        const isTemplateTab = tabButton?.closest('#template-tabs');
        const isProjectTab = tabButton?.closest('#tabs');

        if (deleteIcon) {
            event.stopPropagation(); // Prevent tab switching when clicking the icon
            const projectIdToDelete = deleteIcon.parentElement.dataset.tab;
            
            if (confirm(`Are you sure you want to delete project '${projectsData[projectIdToDelete].name}'? This action cannot be undone.`)) {
                // Remove the tab and its content pane
                const tabPaneToDelete = document.getElementById(projectIdToDelete);
                deleteIcon.parentElement.remove();
                if (tabPaneToDelete) {
                    tabPaneToDelete.remove();
                }

                // Delete data from state
                delete projectsData[projectIdToDelete];
                
                // If the deleted tab was active, switch to the first available project tab
                if (tabButton.classList.contains('active')) {
                    const firstProjectTab = document.querySelector('#tabs .tab-button:not(.add-tab-button)');
                    if (firstProjectTab) {
                        firstProjectTab.click();
                    }
                }
                
                saveState();
                console.log(`Project ${projectIdToDelete} deleted.`);
            }
            return; // Stop further processing
        }

        if (tabButton && !tabButton.classList.contains('add-tab-button')) {
            // Handle template tabs
            if (isTemplateTab) {
                document.querySelector('#template-tabs .tab-button.active')?.classList.remove('active');
                document.querySelector('#template-content .tab-pane.active')?.classList.remove('active');
                
                tabButton.classList.add('active');
                const targetTabId = tabButton.dataset.tab;
                document.getElementById(targetTabId).classList.add('active');
            }
            // Handle project tabs
            else if (isProjectTab) {
                document.querySelector('#tabs .tab-button.active')?.classList.remove('active');
                document.querySelector('#tab-content .tab-pane.active')?.classList.remove('active');
                
                tabButton.classList.add('active');
                const targetTabId = tabButton.dataset.tab;
                document.getElementById(targetTabId).classList.add('active');
            }
            clearSelectionAndHideMenu();
        }
    });

    // Add Project button logic
    addProjectButton.addEventListener('click', () => {
        projectCount++;
        const projectId = `project-${projectCount}`;
        const initialProjectName = `Project ${projectCount}`;

        // Create new tab and pane using the createProjectTab function
        const { tabButton, tabPane } = createProjectTab(initialProjectName, projectId);
        
        // Add delete icon
        const deleteIcon = document.createElement('span');
        deleteIcon.classList.add('delete-tab-icon');
        deleteIcon.innerHTML = '&#128465;'; // Trash can emoji
        tabButton.appendChild(deleteIcon);

        // Insert the new tab and pane
        const tabsContainer = document.getElementById('tabs');
        const tabContentContainer = document.getElementById('tab-content');
        tabsContainer.insertBefore(tabButton, addProjectButton);
        tabContentContainer.appendChild(tabPane);

        // Initialize project data with a complete copy of the main template's current state
        const newProjectContent = currentTemplateRows.map(row => [...row]);

        projectsData[projectId] = {
            headers: [...currentTemplateHeaders],
            content: newProjectContent,
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
        
        // Render the new project table
        const newProjectTable = tabPane.querySelector('.project-table');
        renderTable(newProjectTable, projectsData[projectId].headers, projectsData[projectId].content, false);

        // Automatically switch to the newly created tab
        tabButton.click();
        saveState();
    });

    // Toggle Edit Mode button logic
    toggleEditModeButton.addEventListener('click', () => {
        isEditMode = !isEditMode;
        toggleEditModeButton.classList.toggle('active-edit-mode', isEditMode);
        toggleEditModeButton.textContent = isEditMode ? 'Disable Edit Mode' : 'Enable Edit Mode';
        
        // Re-render the main table to apply contenteditable changes
        renderTable(mainTemplateTable, currentTemplateHeaders, currentTemplateRows, true);
        applySelectionStyles(); // Explicitly apply styles here
        clearSelectionAndHideMenu(); // Clear any active selection/menu
    });

    // Refresh All Projects button logic
    refreshProjectsButton.addEventListener('click', () => {
        console.log("Refresh button clicked. Current Main Template Data (currentTemplateRows):", currentTemplateRows);
        
        // Update all project tables and their data
        Object.keys(projectsData).forEach(projectId => {
            const project = projectsData[projectId];
            project.headers = [...currentTemplateHeaders];
            
            // Update content while preserving editable fields
            project.content = currentTemplateRows.map((mainTemplateRow, rowIndex) => {
                const newRow = [];
                currentTemplateHeaders.forEach((header, colIndex) => {
                    if (nonEditableColumns.includes(header) || isEvidenciaColumn(header)) {
                        // For non-editable columns and evidencia column, take data from the main template
                        newRow.push(mainTemplateRow[colIndex] !== undefined ? mainTemplateRow[colIndex] : '');
                    } else {
                        // For editable columns, preserve old project data if it exists
                        const oldRow = project.content[rowIndex];
                        const oldHeaderIndex = project.headers.indexOf(header);

                        if (oldRow && oldHeaderIndex !== -1 && oldRow[oldHeaderIndex] !== undefined) {
                            newRow.push(oldRow[oldHeaderIndex]);
                        } else {
                            newRow.push('');
                        }
                    }
                });
                return newRow;
            });
        });
        
        updateAllProjectTables();
        alert("All project tabs have been refreshed with the latest template structure and fixed column data.");
        clearSelectionAndHideMenu(); // Clear any active selection/menu
        saveState();
    });

    // Main table (main-template-table) click listener for row/column selection and context menu
    mainTemplateTable.addEventListener('click', (event) => {
        if (!isEditMode) return; // Only allow selection/menu in edit mode

        const target = event.target;
        const isRowHeader = target.classList.contains('row-header');
        const isColumnHeader = target.classList.contains('column-header');
        
        // If clicking a header that is not currently selected, select it
        // If clicking a selected header, show context menu
        // If clicking anywhere else, clear selection/hide menu

        if (isRowHeader) {
            const clickedRowIndex = parseInt(target.dataset.rowIndex, 10);
            if (selectedRowIndex === clickedRowIndex) {
                // Clicked already selected row header: show context menu
                showContextMenu('row', clickedRowIndex, event.clientX, event.clientY);
            } else {
                // Clicked a new row header: select it
                clearSelectionAndHideMenu(); // Clear previous selections
                selectedRowIndex = clickedRowIndex;
                applySelectionStyles();
            }
        } else if (isColumnHeader) {
            const clickedColIndex = parseInt(target.dataset.colIndex, 10);
            if (selectedColIndex === clickedColIndex) {
                // Clicked already selected column header: show context menu
                showContextMenu('column', clickedColIndex, event.clientX, event.clientY);
            } else {
                // Clicked a new column header: select it
                clearSelectionAndHideMenu(); // Clear previous selections
                selectedColIndex = clickedColIndex;
                applySelectionStyles();
            }
        } else if (!contextMenu.contains(target)) { // Clicked inside table but not a header or context menu
            clearSelectionAndHideMenu();
        }
    });

    // Hide context menu and clear selection if clicked outside the menu or main table in edit mode
    document.addEventListener('click', (event) => {
        if (isEditMode && !mainTemplateTable.contains(event.target) && !contextMenu.contains(event.target)) {
            clearSelectionAndHideMenu();
        }
    });

    // Event listener for content changes in table cells (only if editable)
    document.addEventListener('input', (event) => {
        if (event.target.tagName === 'TD' && event.target.closest('.project-table')) {
            const table = event.target.closest('.project-table');
            const tabPane = event.target.closest('.tab-pane');
            const projectId = tabPane.id;
            
            const rowIndex = Array.from(event.target.parentNode.parentNode.children).indexOf(event.target.parentNode);
            const colIndex = projectId === 'main-template' 
                             ? Array.from(event.target.parentNode.children).indexOf(event.target) - 1 
                             : Array.from(event.target.parentNode.children).indexOf(event.target);

            // Do not update the model on 'input' for date cells, as this will be handled on 'blur' and datepicker change
            const header = (projectId === 'main-template' ? currentTemplateHeaders : projectsData[projectId].headers)[colIndex];
            if(isDateColumn(header) || isCommentColumn(header)) {
                return; // Date and comment cells have their own handling
            }

            if (projectId === 'main-template' && isEditMode) {
                if (currentTemplateRows[rowIndex] && currentTemplateRows[rowIndex][colIndex] !== undefined) {
                    currentTemplateRows[rowIndex][colIndex] = event.target.textContent;
                    console.log(`Main Template cell [${rowIndex}][${colIndex}] updated. New currentTemplateRows:`, currentTemplateRows);
                    saveState();
                }
            } else if (projectId !== 'main-template') {
                updateProjectData(projectId, rowIndex, colIndex, event.target.textContent);
                
                // If this is a duration change in a project tab, update dependencies
                if (isDurationColumn(header)) {
                    updateDatesBasedOnDependencies(rowIndex, projectId);
                }
            }
        }
    });

    // Event listener for project name changes (Enter key)
    tabContentContainer.addEventListener('keydown', (event) => {
        if (event.target.classList.contains('project-name-editable') && event.key === 'Enter') {
            event.preventDefault(); // Prevent adding a new line
            event.target.blur(); // Exit edit mode
        }
    });

    // Event listener to update tab name after editing is finished
    tabContentContainer.addEventListener('blur', (event) => {
        if (event.target.classList.contains('project-name-editable')) {
            const h2 = event.target;
            const projectId = h2.dataset.projectId;
            const newName = h2.textContent.trim();

            if (projectsData[projectId] && newName) {
                // Update project data
                projectsData[projectId].name = newName;

                // Update tab button text
                const tabButton = tabsContainer.querySelector(`.tab-button[data-tab="${projectId}"]`);
                if (tabButton) {
                    tabButton.textContent = newName;
                }
                console.log(`Project ${projectId} name updated to "${newName}"`);
                saveState();
            } else {
                // Restore old name if new name is empty
                h2.textContent = projectsData[projectId].name;
            }
        }
    }, true); // Use capture phase to ensure this runs

    resetStateButton.addEventListener('click', () => {
        if (confirm("Are you sure you want to reset all data? This will clear all projects and template modifications and cannot be undone.")) {
            localStorage.removeItem('dashboardState');
            location.reload();
        }
    });

    // --- Datepicker and Cell Validation Logic ---

    const handleDateUpdate = (contentDiv, dateString) => {
        const tabPane = contentDiv.closest('.tab-pane');
        const projectId = tabPane.id;
        const rowIndex = Array.from(contentDiv.closest('tr').parentNode.children).indexOf(contentDiv.closest('tr'));
        const colIndex = Array.from(contentDiv.closest('tr').children).indexOf(contentDiv.closest('td')) - (projectId === 'main-template' ? 1 : 0);

        let dataModel, headers;
        if (projectId === 'main-template') {
            dataModel = currentTemplateRows;
            headers = currentTemplateHeaders;
        } else if (projectsData[projectId]) {
            dataModel = projectsData[projectId].content;
            headers = projectsData[projectId].headers;
        }

        if (dataModel && dataModel[rowIndex] && dataModel[rowIndex][colIndex] !== undefined) {
            dataModel[rowIndex][colIndex] = dateString;
            contentDiv.textContent = dateString;
            console.log(`Date updated for [${projectId}, R${rowIndex}, C${colIndex}] to: ${dateString}`);
            
            // Only update dependencies in project tabs, not in main template
            if (projectId !== 'main-template' && isExpectedDateColumn(headers[colIndex])) {
                updateDatesBasedOnDependencies(rowIndex, projectId);
            }
            saveState();
        }
    };

    // Modal elements
    const datePickerModal = document.getElementById('date-picker-modal');
    const datePickerContainer = document.getElementById('date-picker-container');
    const datePickerClose = document.querySelector('.date-picker-close');
    const datePickerOverlay = document.querySelector('.date-picker-overlay');
    const datePickerTBD = document.getElementById('date-picker-tbd');
    const datePickerClear = document.getElementById('date-picker-clear');

    // Function to show the date picker modal
    const showDatePickerModal = (contentDiv) => {
        currentDateCell = contentDiv;
        datePickerModal.style.display = 'flex';
        
        // Clear any existing datepicker
        if (activeDatepicker) {
            activeDatepicker.destroy();
            activeDatepicker = null;
        }
        
        // Clear the container
        datePickerContainer.innerHTML = '<input type="text" id="temp-date-input" style="opacity: 0; position: absolute; pointer-events: none;">';
        
        // Create datepicker on a temporary input
        const tempInput = document.getElementById('temp-date-input');
        const datepicker = new Datepicker(tempInput, {
            format: 'dd-M-yyyy',
            autohide: false,
            todayHighlight: true,
            container: datePickerContainer
        });
        
        activeDatepicker = datepicker;
        
        // Handle date selection
        tempInput.addEventListener('changeDate', (e) => {
            const newDate = Datepicker.formatDate(e.detail.date, 'dd-M-yyyy');
            handleDateUpdate(currentDateCell, newDate);
            hideDatePickerModal();
        });
        
        // Show the datepicker
        datepicker.show();
    };

    // Function to hide the date picker modal
    const hideDatePickerModal = () => {
        datePickerModal.style.display = 'none';
        if (activeDatepicker) {
            activeDatepicker.destroy();
            activeDatepicker = null;
        }
        currentDateCell = null;
    };

    // Handle clicking the calendar icon
    document.addEventListener('click', (event) => {
        if (event.target.classList.contains('calendar-icon')) {
            const wrapper = event.target.parentElement;
            const contentDiv = wrapper.querySelector('.cell-content');
            showDatePickerModal(contentDiv);
        }
    });

    // Modal event listeners
    datePickerClose.addEventListener('click', hideDatePickerModal);
    datePickerOverlay.addEventListener('click', hideDatePickerModal);

    datePickerTBD.addEventListener('click', () => {
        if (currentDateCell) {
            handleDateUpdate(currentDateCell, 'TBD');
            hideDatePickerModal();
        }
    });

    datePickerClear.addEventListener('click', () => {
        if (currentDateCell) {
            handleDateUpdate(currentDateCell, '');
            hideDatePickerModal();
        }
    });

    // Handle ESC key to close modal
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && datePickerModal.style.display === 'flex') {
            hideDatePickerModal();
        }
    });

    // Handle validating manual cell entry
    document.addEventListener('focusout', (event) => {
        const contentDiv = event.target;
        if (contentDiv.classList.contains('cell-content') && contentDiv.parentElement.classList.contains('date-cell-wrapper')) {
            // Validate the content on blur
            const value = contentDiv.textContent.trim();
            const isValidTBD = value.toLowerCase() === 'tbd';
            const isValidDate = !isNaN(new Date(value).getTime()) && value.length > 4;
            
            if (value === '' || isValidTBD) {
                 handleDateUpdate(contentDiv, value);
            } else if (isValidDate) {
                 handleDateUpdate(contentDiv, Datepicker.formatDate(new Date(value), 'dd-M-yyyy'));
            } else {
                // Revert to old value if invalid
                const tabPane = contentDiv.closest('.tab-pane');
                const projectId = tabPane.id;
                const rowIndex = Array.from(contentDiv.closest('tr').parentNode.children).indexOf(contentDiv.closest('tr'));
                const colIndex = Array.from(contentDiv.closest('tr').children).indexOf(contentDiv.closest('td')) - (projectId === 'main-template' ? 1 : 0);
                
                const dataModel = (projectId === 'main-template') ? currentTemplateRows : projectsData[projectId].content;
                contentDiv.textContent = dataModel[rowIndex][colIndex] || '';
                console.log("Invalid date entry. Reverting to previous value.");
            }
        }
    });

    tabContentContainer.addEventListener('keydown', (event) => {
        if (event.target.classList.contains('project-name-editable') && event.key === 'Enter') {
            event.preventDefault(); // Prevent adding a new line
            event.target.blur(); // Exit edit mode
        }
    });

    // --- Status Selector Logic ---

    let currentStatusCell = null;

    // Modal elements for status selector
    const statusSelectorModal = document.getElementById('status-selector-modal');
    const statusSelectorClose = document.querySelector('.status-selector-close');
    const statusSelectorOverlay = document.querySelector('.status-selector-overlay');

    // Function to show the status selector modal
    const showStatusSelectorModal = (statusCell) => {
        currentStatusCell = statusCell;
        statusSelectorModal.style.display = 'flex';
    };

    // Function to hide the status selector modal
    const hideStatusSelectorModal = () => {
        statusSelectorModal.style.display = 'none';
        currentStatusCell = null;
    };

    // Function to update status cell
    const updateStatusCell = (statusCell, newStatus) => {
        const tabPane = statusCell.closest('.tab-pane');
        const projectId = tabPane.id;
        const rowIndex = Array.from(statusCell.closest('tr').parentNode.children).indexOf(statusCell.closest('tr'));
        const colIndex = Array.from(statusCell.closest('tr').children).indexOf(statusCell) - (projectId === 'main-template' ? 1 : 0);

        if (projectId === 'main-template') {
            if (currentTemplateRows[rowIndex] && currentTemplateRows[rowIndex][colIndex] !== undefined) {
                currentTemplateRows[rowIndex][colIndex] = newStatus;
                statusCell.innerHTML = renderStatusCell(newStatus);
                statusCell.setAttribute('data-status', newStatus);
                saveState();
                updateAllProjectTables();
            }
        } else {
            updateProjectData(projectId, rowIndex, colIndex, newStatus);
            statusCell.innerHTML = renderStatusCell(newStatus);
            statusCell.setAttribute('data-status', newStatus);
        }
    };

    // Handle clicking on status cells
    document.addEventListener('click', (event) => {
        if (event.target.closest('.status-cell')) {
            const statusCell = event.target.closest('.status-cell');
            showStatusSelectorModal(statusCell);
        }
    });

    // Handle status option selection
    document.addEventListener('click', (event) => {
        const statusOption = event.target.closest('.status-option');
        if (statusOption && currentStatusCell) {
            const newStatus = statusOption.getAttribute('data-status');
            updateStatusCell(currentStatusCell, newStatus);
            hideStatusSelectorModal();
        }
    });

    // Status selector modal event listeners
    statusSelectorClose.addEventListener('click', hideStatusSelectorModal);
    statusSelectorOverlay.addEventListener('click', hideStatusSelectorModal);

    // Handle ESC key to close status selector modal
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            if (statusSelectorModal.style.display === 'flex') {
                hideStatusSelectorModal();
            } else if (datePickerModal.style.display === 'flex') {
                hideDatePickerModal();
            }
        }
    });

    // --- Column Resizing Logic ---
    
    // Handle mouse down on column headers
    document.addEventListener('mousedown', (event) => {
        const th = event.target.closest('th');
        if (!th) return;

        const table = th.closest('.project-table');
        if (!table) return;

        const rect = th.getBoundingClientRect();
        const isNearRightEdge = event.clientX > rect.right - 10;

        if (isNearRightEdge) {
            event.preventDefault();
            isResizing = true;
            currentTable = table;
            currentColumn = th;
            startX = event.clientX;
            startWidth = th.offsetWidth;

            table.classList.add('resizing');
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        }
    });

    // Handle mouse move for resizing
    document.addEventListener('mousemove', (event) => {
        if (isResizing && currentColumn) {
            const deltaX = event.clientX - startX;
            const newWidth = Math.max(50, startWidth + deltaX); // Minimum width of 50px

            currentColumn.style.width = newWidth + 'px';
            currentColumn.style.minWidth = newWidth + 'px';

            // Also update corresponding cells in the column
            const columnIndex = Array.from(currentColumn.parentNode.children).indexOf(currentColumn);
            const rows = currentTable.querySelectorAll('tbody tr');
            rows.forEach(row => {
                const cell = row.children[columnIndex];
                if (cell) {
                    cell.style.width = newWidth + 'px';
                    cell.style.minWidth = newWidth + 'px';
                }
            });
        }
    });

    // Handle mouse up to end resizing
    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            
            if (currentTable) {
                currentTable.classList.remove('resizing');
                
                // Save the new column widths
                const isMainTemplate = currentTable.id === 'main-template-table';
                saveColumnWidths(currentTable, isMainTemplate);
            }

            currentTable = null;
            currentColumn = null;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }
    });

    // Update cursor when hovering over column edges
    document.addEventListener('mousemove', (event) => {
        if (isResizing) return; // Don't change cursor while resizing

        const th = event.target.closest('th');
        if (!th || !th.closest('.project-table')) return;

        const rect = th.getBoundingClientRect();
        const isNearRightEdge = event.clientX > rect.right - 10;

        if (isNearRightEdge) {
            th.style.cursor = 'col-resize';
        } else {
            th.style.cursor = '';
        }
    });

    // --- Comment System Logic ---

    // Function to submit a comment
    function submitComment(cell, commentText) {
        if (!commentText.trim()) return;

        const table = cell.closest('table');
        const row = cell.closest('tr');
        const rowIndex = Array.from(table.querySelectorAll('tbody tr')).indexOf(row);
        const cellIndex = Array.from(row.cells).indexOf(cell);
        const tabPane = cell.closest('.tab-pane');
        const projectId = tabPane ? tabPane.id : null;
        
        // Determine data model based on project or template
        let tableHeaders, tableRows;
        if (projectId === 'main-template') {
            tableHeaders = currentTemplateHeaders;
            tableRows = currentTemplateRows;
        } else if (projectsData[projectId]) {
            tableHeaders = projectsData[projectId].headers;
            tableRows = projectsData[projectId].content;
        } else {
            console.warn('Unknown project/table for comment submission');
            return;
        }
        
        if (!tableRows[rowIndex]) {
            console.warn('Invalid row index');
            return;
        }
        
        // Identify comment history column index
        const commentHistoryColIndex = tableHeaders.findIndex(h => isCommentColumn(h));
        if (commentHistoryColIndex === -1) {
            console.warn('No comment history column found');
            return;
        }
        
        // Get existing history and add new comment
        const existingHistory = tableRows[rowIndex][commentHistoryColIndex] || '';
        const updatedHistory = addCommentToHistory(existingHistory, commentText);
        tableRows[rowIndex][commentHistoryColIndex] = updatedHistory;
        
        // Update UI for comment history cell
        const commentHistoryCell = row.cells[commentHistoryColIndex];
        if (commentHistoryCell) {
            commentHistoryCell.setAttribute('data-full-history', updatedHistory);
            commentHistoryCell.textContent = renderCommentCell(updatedHistory, false);
            commentHistoryCell.classList.add('collapsed');
            commentHistoryCell.classList.remove('expanded');
        }
        
        saveState();
    }

    // Handle clicking on comment cells to expand/collapse
    document.addEventListener('click', (event) => {
        if (event.target.classList.contains('comment-cell')) {
            const commentCell = event.target;
            const isExpanded = commentCell.classList.contains('expanded');
            const fullHistory = commentCell.getAttribute('data-full-history') || '';
            
            if (isExpanded) {
                // Collapse
                commentCell.classList.remove('expanded');
                commentCell.classList.add('collapsed');
                commentCell.textContent = renderCommentCell(fullHistory, false);
            } else {
                // Expand
                commentCell.classList.remove('collapsed');
                commentCell.classList.add('expanded');
                commentCell.textContent = renderCommentCell(fullHistory, true);
            }
        }
    });

    // Handle clicking the submit icon inside new comment cells
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('submit-comment-icon')) {
            const cell = e.target.closest('td');
            const commentDiv = cell.querySelector('.comment-content');
            const newComment = commentDiv.textContent.trim();
            if (newComment) {
                submitComment(cell, newComment);
                commentDiv.textContent = ''; // Clear after submission
            }
        }
    });

    // Handle Enter key inside comment-content divs to submit
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && e.target.classList.contains('comment-content')) {
            e.preventDefault();
            const cell = e.target.closest('td');
            const newComment = e.target.textContent.trim();
            if (newComment) {
                submitComment(cell, newComment);
                e.target.textContent = '';
            }
        }
    });

    // Handle placeholder text for new comment fields (optional placeholder removal)
    document.addEventListener('focus', function(e) {
        if (e.target.classList.contains('comment-content')) {
            // No specific action for now
        }
    }, true);

    document.addEventListener('blur', function(e) {
        if (e.target.classList.contains('comment-content')) {
            // If you want a placeholder, you can set it here
        }
    }, true);

    // ... rest of the existing code ...

    // ... rest of the existing code ...

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
                if (rowIdx >= 0 && rowIdx < currentTemplateRows.length) {
                    // Store both checkbox and toggle state
                    const toggleState = {
                        required: this.checked,
                        isText: toggleInput.checked
                    };
                    currentTemplateRows[rowIdx][colIndex] = JSON.stringify(toggleState);
                    saveState();
                    
                    // Update visibility of toggle
                    toggleContainer.classList.toggle('visible', this.checked);
                    
                    // Update project cells
                    updateProjectCellsVisibility();
                }
            });
            
            toggleInput.addEventListener('change', function() {
                const rowIdx = parseInt(cell.closest('tr').querySelector('.row-header').dataset.rowIndex);
                if (rowIdx >= 0 && rowIdx < currentTemplateRows.length) {
                    // Update the stored state with new toggle value
                    const currentState = JSON.parse(currentTemplateRows[rowIdx][colIndex] || '{"required":false,"isText":false}');
                    currentState.isText = this.checked;
                    currentTemplateRows[rowIdx][colIndex] = JSON.stringify(currentState);
                    saveState();
                    
                    // Update project cells
                    const projectCells = getCorrespondingProjectCells(cell);
                    projectCells.forEach(cell => {
                        cell.classList.toggle('text-mode', this.checked);
                        updateEvidenciaContent(cell, this.checked);
                    });
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
            attachButton.innerHTML = '📎';
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
            .filter(table => !table.id.includes('main-template')) // Exclude main template table
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
            let state = { required: false, isText: false };
            try {
                if (currentTemplateRows[rowIndex] && currentTemplateRows[rowIndex][colIndex]) {
                    state = JSON.parse(currentTemplateRows[rowIndex][colIndex]);
                }
            } catch (e) {
                // Handle legacy format
                state.required = currentTemplateRows[rowIndex][colIndex] === 'true';
            }
            
            // Update all corresponding project cells
            const projectCells = getCorrespondingProjectCells(mainCell);
            projectCells.forEach(cell => {
                if (!cell) return;
                
                // Update required state
                cell.classList.toggle('evidencia-required', state.required);
                
                // Update input mode
                cell.classList.toggle('text-mode', state.isText);
                
                // Update content visibility
                const content = cell.querySelector('.evidencia-content');
                if (content) {
                    const fileElements = [
                        content.querySelector('.attach-button'),
                        content.querySelector('.file-name'),
                        content.querySelector('input[type="file"]')
                    ];
                    const textInput = content.querySelector('.evidence-text');
                    const deleteButton = content.querySelector('.delete-button');
                    
                    if (state.isText) {
                        // Text mode
                        fileElements.forEach(el => {
                            if (el) el.style.display = 'none';
                        });
                        if (textInput) {
                            textInput.style.display = '';
                            const hasText = textInput.value.trim() !== '';
                            cell.classList.toggle('has-text', hasText);
                            cell.classList.toggle('has-attachment', hasText);
                            if (deleteButton) {
                                deleteButton.style.display = hasText ? '' : 'none';
                                deleteButton.classList.toggle('visible', hasText);
                            }
                        }
                    } else {
                        // File mode
                        fileElements.forEach(el => {
                            if (el) el.style.display = '';
                        });
                        if (textInput) {
                            textInput.style.display = 'none';
                            textInput.value = '';
                        }
                        cell.classList.remove('has-text');
                        
                        const hasFile = content.querySelector('.file-path') !== null;
                        cell.classList.toggle('has-attachment', hasFile);
                        if (deleteButton) {
                            deleteButton.style.display = hasFile ? '' : 'none';
                            deleteButton.classList.toggle('visible', hasFile);
                        }
                    }
                }
            });
        });
    }

    // Add these functions before the renderTable function
    function uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);
        
        return fetch('http://localhost:3000/upload', {
            method: 'POST',
            body: formData
        }).then(response => {
            if (!response.ok) throw new Error('Upload failed');
            return response.json();
        }).catch(error => {
            console.error('Error uploading file:', error);
            alert('Failed to upload file. Please try again.');
            return null;
        });
    }

    function openFile(filePath) {
        return fetch('http://localhost:3000/open-file', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ path: filePath })
        }).then(response => {
            if (!response.ok) throw new Error('Failed to open file');
        }).catch(error => {
            console.error('Error opening file:', error);
            alert('Failed to open file. Please check if the file exists.');
        });
    }

    function createFileLink(fileName, filePath) {
        const fileLink = document.createElement('a');
        fileLink.textContent = fileName;
        fileLink.title = `Click to open: ${filePath}`;
        fileLink.href = '#';
        fileLink.onclick = (e) => {
            e.preventDefault();
            openFile(filePath);
        };
        return fileLink;
    }

    // Date calculation helper functions
    function parseCustomDate(dateStr) {
        if (!dateStr || dateStr.trim() === '') return null;
        const parts = dateStr.split('-');
        if (parts.length !== 3) return null;
        
        const day = parseInt(parts[0]);
        const month = parts[1];  // This is in 'MMM' format (e.g., 'Oct')
        const year = parseInt(parts[2]);
        
        const date = new Date(year, 0); // Start with January
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        date.setMonth(months.indexOf(month));
        date.setDate(day);
        
        return date;
    }

    function formatCustomDate(date) {
        if (!date) return '';
        const day = String(date.getDate()).padStart(2, '0');
        const month = date.toLocaleString('en-US', { month: 'short' });
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
    }

    function addDays(date, days) {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    }

    function subtractDays(date, days) {
        return addDays(date, -days);
    }

    // Function to get column indices
    function getColumnIndices(headers) {
        const indices = {};
        headers.forEach((header, index) => {
            const headerText = header.trim().toLowerCase();
            
            // Test duration column
            const isDuration = isDurationColumn(header);
            if (isDuration) {
                console.log(`Found duration column: "${header}" at index ${index}`);
                indices.duration = index;
            }
            
            // Test dependency column
            const isDependency = isDependencyColumn(header);
            if (isDependency) {
                console.log(`Found dependency column: "${header}" at index ${index}`);
                indices.dependency = index;
            }
            
            // Test expected date column
            const isExpectedDate = isExpectedDateColumn(header);
            if (isExpectedDate) {
                console.log(`Found expected date column: "${header}" at index ${index}`);
                indices.expectedDate = index;
            }
            
            // Test ID column
            if (headerText === 'id') {
                console.log(`Found ID column: "${header}" at index ${index}`);
                indices.id = index;
            }
        });
        
        // Log the final indices found
        console.log('Final indices found:', {
            id: indices.id,
            duration: indices.duration,
            dependency: indices.dependency,
            expectedDate: indices.expectedDate
        });
        
        return indices;
    }

    // Function to update dates based on dependencies
    function updateDatesBasedOnDependencies(updatedRowIndex, projectId) {
        const project = projectsData[projectId];
        if (!project) return;
        
        console.log('Project headers:', JSON.stringify(project.headers, null, 2));
        const indices = getColumnIndices(project.headers);
        console.log('Column indices found:', JSON.stringify(indices, null, 2));
        
        if (indices.id === undefined || indices.duration === undefined || 
            indices.dependency === undefined || indices.expectedDate === undefined) {
            console.error('Required columns not found in project data. Looking for:');
            console.error('- ID column (exact match)');
            console.error('- Duration column (matches /^duracion$|^dias$/i)');
            console.error('- Dependency column (matches /^dependencia$|^dep\.?$/i)');
            console.error('- Expected Date column (matches /^fecha\s*esperada$/i)');
            console.error('Found headers:', JSON.stringify(project.headers, null, 2));
            
            // Add debug logging for each column check
            project.headers.forEach((header, index) => {
                console.log(`Checking header[${index}]: "${header}"`);
                console.log(`  isDurationColumn: ${isDurationColumn(header)}`);
                console.log(`  isDependencyColumn: ${isDependencyColumn(header)}`);
                console.log(`  isExpectedDateColumn: ${isExpectedDateColumn(header)}`);
                console.log(`  isID: ${header === 'ID'}`);
            });
            return;
        }
        
        // Create a map of row data by ID for easy lookup
        const rowDataById = new Map();
        project.content.forEach((row, index) => {
            const id = row[indices.id];
            if (id) {
                rowDataById.set(id.toString(), {
                    index,
                    duration: parseInt(row[indices.duration]) || 0,
                    dependency: row[indices.dependency]?.toString() || '',
                    date: parseCustomDate(row[indices.expectedDate])
                });
            }
        });
        
        // Function to recursively update dates
        function updateDependentDates(rowId, isForward = true) {
            const row = rowDataById.get(rowId.toString());
            if (!row) return;
            
            if (isForward) {
                // Find all rows that EXPLICITLY depend on this one (where their Dep. column references this row's ID)
                const dependentRows = Array.from(rowDataById.entries())
                    .filter(([_, data]) => data.dependency === rowId.toString());
                
                for (const [depId, depRow] of dependentRows) {
                    // Forward calculation: Set dependent's date to dependency's date + dependent's duration
                    if (row.date) {
                        const newDate = addDays(row.date, depRow.duration);
                        const rowData = project.content[depRow.index];
                        rowData[indices.expectedDate] = formatCustomDate(newDate);
                        depRow.date = newDate;
                        console.log(`Forward update: Row ${depId} now depends on Row ${rowId}, new date: ${formatCustomDate(newDate)}`);
                    }
                    
                    // Recursively update dependent rows
                    updateDependentDates(depId, true);
                }
            } else {
                // Backward calculation: Update dependency chain recursively
                // Only update if this row has an explicit dependency
                if (row.dependency) {
                    const parentRow = rowDataById.get(row.dependency);
                    if (parentRow && row.date) {
                        const newParentDate = subtractDays(row.date, row.duration);
                        const parentRowData = project.content[parentRow.index];
                        parentRowData[indices.expectedDate] = formatCustomDate(newParentDate);
                        parentRow.date = newParentDate;
                        console.log(`Backward update: Row ${row.dependency} is dependency of Row ${rowId}, new date: ${formatCustomDate(newParentDate)}`);
                        
                        // Recursively update parent's dependencies
                        updateDependentDates(row.dependency, false);
                    }
                }
            }
        }
        
        // Function to find the root dependency (the row with no dependencies)
        function findRootDependency(startRowId) {
            let currentId = startRowId;
            let visited = new Set();
            
            while (true) {
                if (visited.has(currentId)) {
                    console.warn('Circular dependency detected!');
                    return currentId; // Return current ID in case of circular dependency
                }
                visited.add(currentId);
                
                const currentRow = rowDataById.get(currentId.toString());
                if (!currentRow || !currentRow.dependency) {
                    return currentId; // Found the root
                }
                currentId = currentRow.dependency;
            }
        }
        
        // Get the updated row's data
        const updatedRow = project.content[updatedRowIndex];
        const updatedRowId = updatedRow[indices.id];
        const updatedRowData = rowDataById.get(updatedRowId.toString());
        
        if (!updatedRowData) return;
        
        // First update backwards through all dependencies
        if (updatedRowData.dependency) {
            const depRow = rowDataById.get(updatedRowData.dependency);
            if (depRow && updatedRowData.date) {
                const newDepDate = subtractDays(updatedRowData.date, updatedRowData.duration);
                const rowData = project.content[depRow.index];
                rowData[indices.expectedDate] = formatCustomDate(newDepDate);
                depRow.date = newDepDate;
                console.log(`Initial backward update: Row ${updatedRowData.dependency} is dependency of Row ${updatedRowId}, new date: ${formatCustomDate(newDepDate)}`);
                // Start recursive backward update from this dependency
                updateDependentDates(updatedRowData.dependency, false);
            }
        }
        
        // Find the root dependency
        const rootId = findRootDependency(updatedRowId);
        console.log(`Found root dependency: Row ${rootId}`);
        
        // Start forward update from the root
        updateDependentDates(rootId, true);
        
        // Save state and update UI
        saveState();
        const projectTable = document.getElementById(projectId).querySelector('.project-table');
        renderTable(projectTable, project.headers, project.content, false);
    }

    // Add these functions before createProjectTab
    function createTimelineVisualization(projectId) {
        const project = projectsData[projectId];
        if (!project) return '';

        // Get milestone column index
        const milestoneColIndex = project.headers.findIndex(header => header.toLowerCase().includes('milestone'));
        if (milestoneColIndex === -1) return 'No milestone column found';

        // Get status column index for completion calculation
        const statusColIndex = project.headers.findIndex(header => header.toLowerCase().includes('status'));

        // Function to calculate completion percentage for a milestone
        function calculateMilestoneCompletion(milestone) {
            if (!project.content || statusColIndex === -1) return 0;
            
            // Get all rows for this milestone
            const milestoneRows = project.content.filter(row => row[milestoneColIndex] === milestone);
            if (milestoneRows.length === 0) return 0;

            // Count completed tasks (status is exactly "completo")
            const completedTasks = milestoneRows.filter(row => {
                const status = (row[statusColIndex] || '').toLowerCase().trim();
                return status === 'completo';
            }).length;

            return Math.round((completedTasks / milestoneRows.length) * 100);
        }

        // Get unique milestones (excluding empty ones)
        const milestones = project.content
            .map(row => row[milestoneColIndex])
            .filter(milestone => milestone && milestone.trim() !== '')
            .filter((value, index, self) => self.indexOf(value) === index);

        if (milestones.length === 0) return 'No milestones found';

        // Calculate dimensions
        const svgWidth = 900;
        const svgHeight = Math.max(200, milestones.length * 80);
        const margin = { top: 40, right: 100, bottom: 60, left: 100 };
        const lineY = svgHeight / 2;
        const diamondSize = 30; // Increased size to fit percentage text

        // Calculate spacing between milestones
        const timelineWidth = svgWidth - margin.left - margin.right;
        const spacing = timelineWidth / (Math.max(1, milestones.length - 1));

        // Create SVG content with a viewBox to ensure proper scaling
        let svgContent = `
            <svg width="${svgWidth}" height="${svgHeight}" class="timeline-svg" viewBox="0 0 ${svgWidth} ${svgHeight}" preserveAspectRatio="xMidYMid meet">
                <!-- Main horizontal line -->
                <line 
                    x1="${margin.left}" 
                    y1="${lineY}" 
                    x2="${svgWidth - margin.right}" 
                    y2="${lineY}" 
                    stroke="#007bff" 
                    stroke-width="2"
                />
        `;

        // Add milestones
        milestones.forEach((milestone, index) => {
            const x = margin.left + (index * spacing);
            const completion = calculateMilestoneCompletion(milestone);
            
            // Add diamond with transform-origin at center
            svgContent += `
                <g class="milestone-marker" data-milestone="${milestone}" style="transform-origin: ${x}px ${lineY}px;">
                    <!-- Diamond -->
                    <path 
                        d="M ${x} ${lineY - diamondSize} 
                           L ${x + diamondSize} ${lineY} 
                           L ${x} ${lineY + diamondSize} 
                           L ${x - diamondSize} ${lineY} Z" 
                        fill="${completion === 100 ? '#28a745' : '#007bff'}" 
                        stroke="#fff" 
                        stroke-width="2"
                    />
                    
                    <!-- Percentage text inside diamond -->
                    <text 
                        x="${x}" 
                        y="${lineY + 6}" 
                        text-anchor="middle" 
                        class="milestone-percentage"
                        fill="#fff"
                        font-size="14px"
                        font-weight="bold"
                    >${completion}%</text>
                    
                    <!-- Milestone label -->
                    <text 
                        x="${x}" 
                        y="${lineY + diamondSize + 25}" 
                        text-anchor="middle" 
                        class="milestone-label"
                    >${milestone}</text>
                </g>
            `;
        });

        svgContent += '</svg>';
        return svgContent;
    }

    function updateProjectTimeline(projectId) {
        const timelineContainer = document.querySelector(`#${projectId} .timeline-container`);
        if (!timelineContainer) return;

        const timelineContent = createTimelineVisualization(projectId);
        timelineContainer.innerHTML = timelineContent;

        // Add hover effects for milestone markers
        const milestoneMarkers = timelineContainer.querySelectorAll('.milestone-marker');
        milestoneMarkers.forEach(marker => {
            marker.addEventListener('mouseenter', () => {
                marker.querySelector('path').style.fill = '#0056b3';
            });
            marker.addEventListener('mouseleave', () => {
                marker.querySelector('path').style.fill = '#007bff';
            });
        });
    }

    // Modify the createProjectTab function to initialize the timeline
    function createProjectTab(projectName, projectId) {
        const tabButton = document.createElement('button');
        tabButton.className = 'tab-button';
        tabButton.setAttribute('data-tab', projectId);
        tabButton.innerHTML = `
            <span class="project-name-editable" contenteditable="true">${projectName}</span>
            <span class="close-tab">&times;</span>
        `;
        
        const tabPane = document.createElement('div');
        tabPane.id = projectId;
        tabPane.className = 'tab-pane';
        
        // Create dashboard structure
        const dashboardHTML = `
            <h2 class="project-name-editable" contenteditable="true" data-project-id="${projectId}">${projectName}</h2>
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
                    <div class="info-tabs-container">
                        <div class="info-tabs">
                            <button class="info-tab active" data-info-tab="general" title="General Info">
                                <i class="info-icon">ⓘ</i>
                            </button>
                            <button class="info-tab" data-info-tab="contacts" title="Contacts">
                                <i class="contact-icon">👤</i>
                            </button>
                        </div>
                    </div>
                    <div class="quick-info-table">
                        <div class="info-content active" data-info-content="general">
                            <div class="info-tables-container">
                                <div class="info-table-section">
                                    <h3>Evidence</h3>
                                    <table>
                                        <tr>
                                            <th>Required</th>
                                            <td contenteditable="true">--</td>
                                        </tr>
                                        <tr>
                                            <th>Submitted</th>
                                            <td contenteditable="true">--</td>
                                        </tr>
                                        <tr>
                                            <th>Pending</th>
                                            <td contenteditable="true">--</td>
                                        </tr>
                                    </table>
                                </div>
                                <div class="info-table-section">
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
                            </div>
                        </div>
                        <div class="info-content" data-info-content="contacts">
                            <table class="contacts-table">
                                <tr>
                                    <td colspan="5" class="address-row" contenteditable="true">
                                        Address: --
                                    </td>
                                </tr>
                                <tr>
                                    <th>Position</th>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Phone</th>
                                    <th class="action-column"></th>
                                </tr>
                                <tr>
                                    <td contenteditable="true">Project Manager</td>
                                    <td contenteditable="true">--</td>
                                    <td contenteditable="true">--</td>
                                    <td contenteditable="true">--</td>
                                    <td class="action-column">
                                        <button class="delete-row-btn" title="Delete row">🗑️</button>
                                    </td>
                                </tr>
                                <tr>
                                    <td contenteditable="true">Team Lead</td>
                                    <td contenteditable="true">--</td>
                                    <td contenteditable="true">--</td>
                                    <td contenteditable="true">--</td>
                                    <td class="action-column">
                                        <button class="delete-row-btn" title="Delete row">🗑️</button>
                                    </td>
                                </tr>
                                <tr class="last-contact-row">
                                    <td contenteditable="true">Client Contact</td>
                                    <td contenteditable="true">--</td>
                                    <td contenteditable="true">--</td>
                                    <td contenteditable="true">--</td>
                                    <td class="action-column">
                                        <button class="delete-row-btn" title="Delete row">🗑️</button>
                                        <button class="add-row-btn" title="Add new row">➕</button>
                                    </td>
                                </tr>
                            </table>
                        </div>
                    </div>
                </div>
                <div class="dashboard-collapsible">
                    <div class="collapsible-header">
                        <span>Project Analytics</span>
                        <span class="toggle-icon">▼</span>
                    </div>
                    <div class="collapsible-content">
                        <div class="dashboard-tabs">
                            <button class="dashboard-tab active" data-tab="timeline">Timeline</button>
                            <button class="dashboard-tab" data-tab="gantt">Gantt Chart</button>
                        </div>
                        <div class="dashboard-tab-content active" data-tab="timeline">
                            <div class="timeline-container">
                            </div>
                        </div>
                        <div class="dashboard-tab-content" data-tab="gantt">
                            <div class="gantt-container">
                                Gantt chart will be implemented here
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
        
        // Add direct click handlers for timezone functionality
        const timezoneButton = tabPane.querySelector('.timezone-select');
        const timezoneModal = tabPane.querySelector('.timezone-modal');
        const timezoneClose = tabPane.querySelector('.timezone-modal-close');
        const timezoneInput = tabPane.querySelector('.timezone-input');
        const timezoneApply = tabPane.querySelector('.timezone-apply-btn');
        const timezoneOffsetDisplay = tabPane.querySelector('.timezone-offset');
        
        console.log('Found timezone elements:', {
            button: !!timezoneButton,
            modal: !!timezoneModal,
            close: !!timezoneClose,
            input: !!timezoneInput,
            apply: !!timezoneApply,
            display: !!timezoneOffsetDisplay
        });

        if (timezoneButton && timezoneModal) {
            // Open modal handler
            timezoneButton.addEventListener('click', (e) => {
                console.log('Timezone button clicked - opening modal');
                timezoneModal.classList.add('active');
                if (timezoneInput) {
                    timezoneInput.value = timezoneOffset;
                }
            });

            // Close button handler
            if (timezoneClose) {
                timezoneClose.addEventListener('click', (e) => {
                    console.log('Close button clicked - closing modal');
                    timezoneModal.classList.remove('active');
                });
            }

            // Apply button handler
            if (timezoneApply && timezoneInput && timezoneOffsetDisplay) {
                timezoneApply.addEventListener('click', () => {
                    const newOffset = parseInt(timezoneInput.value);
                    if (!isNaN(newOffset) && newOffset >= -12 && newOffset <= 14) {
                        console.log('Applying new timezone offset:', newOffset);
                        timezoneOffset = newOffset;
                        timezoneOffsetDisplay.textContent = `UTC${newOffset >= 0 ? '+' : ''}${newOffset}`;
                        updateTime(projectId);
                        timezoneModal.classList.remove('active');
                    } else {
                        alert('Please enter a valid timezone offset between -12 and +14');
                    }
                });

                // Handle Enter key in input
                timezoneInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        timezoneApply.click();
                    }
                });
            }

            // Click outside modal to close
            timezoneModal.addEventListener('click', (e) => {
                if (e.target === timezoneModal) {
                    console.log('Clicked outside modal - closing');
                    timezoneModal.classList.remove('active');
                }
            });
        } else {
            console.warn('Required timezone elements not found in newly created tab');
        }

        // Initialize time display
        updateTime(projectId);
        
        // Add event listeners for the collapsible section
        const collapsibleHeader = tabPane.querySelector('.collapsible-header');
        const collapsibleContent = tabPane.querySelector('.collapsible-content');
        const toggleIcon = tabPane.querySelector('.toggle-icon');
        
        collapsibleHeader.addEventListener('click', () => {
            collapsibleContent.classList.toggle('expanded');
            toggleIcon.textContent = collapsibleContent.classList.contains('expanded') ? '▲' : '▼';
            
            // Update timeline when expanding
            if (collapsibleContent.classList.contains('expanded')) {
                updateProjectTimeline(projectId);
            }
        });

        // Add event listeners for info tabs
        const infoTabs = tabPane.querySelectorAll('.info-tab');
        const infoContents = tabPane.querySelectorAll('.info-content');
        
        console.log('Info tabs found:', infoTabs.length);
        console.log('Info contents found:', infoContents.length);
        
        infoTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                // Get the target tab from the clicked button
                const targetTab = e.currentTarget.dataset.infoTab;
                console.log('Switching to tab:', targetTab);
                
                // Update tab buttons
                infoTabs.forEach(t => t.classList.remove('active'));
                e.currentTarget.classList.add('active');
                
                // Update content sections
                infoContents.forEach(content => {
                    const isTargetContent = content.dataset.infoContent === targetTab;
                    console.log('Content section:', content.dataset.infoContent, 'Setting active:', isTargetContent);
                    if (isTargetContent) {
                        content.classList.add('active');
                    } else {
                        content.classList.remove('active');
                    }
                });
            });
        });

        // Initialize the first tab as active
        const initialTab = infoTabs[0].dataset.infoTab;
        infoContents.forEach(content => {
            if (content.dataset.infoContent === initialTab) {
                content.classList.add('active');
            } else {
                content.classList.remove('active');
            }
        });
        
        // Add event listeners for dashboard tabs
        const dashboardTabs = tabPane.querySelectorAll('.dashboard-tab');
        dashboardTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const targetTab = e.target.dataset.tab;
                
                // Update tab buttons
                dashboardTabs.forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                
                // Update tab contents
                const tabContents = tabPane.querySelectorAll('.dashboard-tab-content');
                tabContents.forEach(content => {
                    content.classList.toggle('active', content.dataset.tab === targetTab);
                });

                // Update timeline when switching to timeline tab
                if (targetTab === 'timeline' && collapsibleContent.classList.contains('expanded')) {
                    updateProjectTimeline(projectId);
                }
            });
        });
        
        // Add event listeners for contacts table actions
        const contactsTable = tabPane.querySelector('.contacts-table');
        if (contactsTable) {
            // Save state on any input in the table
            contactsTable.addEventListener('input', () => {
                saveState();
            });

            // Delete row handler
            contactsTable.addEventListener('click', (e) => {
                const deleteBtn = e.target.closest('.delete-row-btn');
                if (deleteBtn) {
                    const row = deleteBtn.closest('tr');
                    const position = row.cells[0].textContent;
                    
                    if (confirm(`Are you sure you want to delete the contact "${position}"?`)) {
                        // If this is the last row with content, clear it instead of deleting
                        const contentRows = contactsTable.querySelectorAll('tr:not(:first-child):not(:nth-child(2))');
                        if (contentRows.length <= 1) {
                            Array.from(row.cells).forEach(cell => {
                                if (cell.hasAttribute('contenteditable')) {
                                    cell.textContent = '--';
                                }
                            });
                        } else {
                            row.remove();
                            // Update the add button to the new last row
                            const lastRow = contactsTable.querySelector('tr:last-child');
                            if (lastRow) {
                                lastRow.classList.add('last-contact-row');
                                const actionCell = lastRow.querySelector('.action-column');
                                if (actionCell && !actionCell.querySelector('.add-row-btn')) {
                                    actionCell.innerHTML += '<button class="add-row-btn" title="Add new row">➕</button>';
                                }
                            }
                        }
                        saveState(); // Save state after modification
                    }
                }
            });

            // Add row handler
            contactsTable.addEventListener('click', (e) => {
                const addBtn = e.target.closest('.add-row-btn');
                if (addBtn) {
                    const currentLastRow = contactsTable.querySelector('.last-contact-row');
                    currentLastRow.classList.remove('last-contact-row');
                    const actionCell = currentLastRow.querySelector('.action-column');
                    actionCell.innerHTML = '<button class="delete-row-btn" title="Delete row">🗑️</button>';

                    const newRow = document.createElement('tr');
                    newRow.classList.add('last-contact-row');
                    newRow.innerHTML = `
                        <td contenteditable="true">New Position</td>
                        <td contenteditable="true">--</td>
                        <td contenteditable="true">--</td>
                        <td contenteditable="true">--</td>
                        <td class="action-column">
                            <button class="delete-row-btn" title="Delete row">🗑️</button>
                            <button class="add-row-btn" title="Add new row">➕</button>
                        </td>
                    `;
                    contactsTable.querySelector('tbody').appendChild(newRow);
                    saveState(); // Save state after modification
                }
            });
        }
        
        // Initialize contacts section
        const contactsSection = document.createElement('div');
        contactsSection.className = 'project-contacts';
        tabPane.appendChild(contactsSection);

        initializeProjectContacts(tabPane);
        
        return { tabButton, tabPane };
    }

    // Email Templates Functionality
    function initializeEmailTemplates() {
        console.log('=== Initializing Email Templates ===');
        console.log('Current page location:', window.location.href);
        console.log('Email templates pane exists:', !!document.getElementById('email-templates'));
        console.log('Email templates pane is active:', document.getElementById('email-templates')?.classList.contains('active'));
        
        // Add email templates CSS
        addEmailTemplatesCSS();
        
        // Set up basic event listeners for the email templates page
        setupEmailTemplateEventListeners();
        
        // Load saved email templates
        loadEmailTemplates();
        
        console.log('=== Email Templates Initialization Complete ===');
    }
    
    function addEmailTemplatesCSS() {
        console.log('addEmailTemplatesCSS called');
        
        // Check if CSS already added
        if (document.getElementById('email-templates-styles')) {
            console.log('Email templates CSS already exists');
            return;
        }
        
        console.log('Creating new email templates CSS');
        const style = document.createElement('style');
        style.id = 'email-templates-styles';
        style.textContent = `
            /* Email Templates Styling - Test */
            #email-templates {
                background-color: #f0f8ff !important;
                border: 2px solid #7c7c7c !important;
                border-radius: 12px !important;
                padding: 20px;
            }
            
            /* Email Templates Styling */
            .email-templates-header {
                text-align: center;
                margin-bottom: 30px;
            }
            .email-templates-header h2 {
                margin: 0 0 10px 0;
                font-size: 28px;
                color: #333;
                font-weight: 600;
            }
            .page-description {
                color: #6c757d;
                font-size: 16px;
                margin: 0;
            }
            .email-templates-toolbar {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 30px;
                padding: 20px;
                background: white;
                border-radius: 12px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            .email-templates-toolbar .toolbar-left,
            .email-templates-toolbar .toolbar-right {
                display: flex;
                gap: 12px;
            }
            .email-templates-toolbar .toolbar-center {
                flex: 1;
                display: flex;
                justify-content: center;
                max-width: 400px;
                margin: 0 20px;
            }
            .template-search-container {
                position: relative;
                width: 100%;
                max-width: 350px;
            }
            .template-search-container input {
                width: 100%;
                padding: 12px 45px 12px 18px;
                border: 2px solid #e1e8ed;
                border-radius: 25px;
                font-size: 14px;
                outline: none;
                transition: all 0.2s ease;
            }
            .template-search-container input:focus {
                border-color: #007bff;
                box-shadow: 0 0 0 3px rgba(0,123,255,0.1);
            }
            .template-search-container .search-icon {
                position: absolute;
                right: 18px;
                top: 50%;
                transform: translateY(-50%);
                color: #6c757d;
                pointer-events: none;
            }
            .add-template-btn,
            .import-template-btn,
            .export-template-btn,
            .create-first-template-btn {
                background: #007bff;
                color: white;
                border: none;
                border-radius: 8px;
                padding: 12px 18px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .add-template-btn:hover,
            .create-first-template-btn:hover {
                background: #0056b3;
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(0,123,255,0.25);
            }
            .import-template-btn,
            .export-template-btn {
                background: #6c757d;
            }
            .import-template-btn:hover,
            .export-template-btn:hover {
                background: #5a6268;
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(108,117,125,0.25);
            }
            .email-templates-content {
                display: flex;
                flex-direction: row;
                gap: 25px;
                background: white;
                border-radius: 12px;
                padding: 30px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                min-height: 500px;
                width: 100%;
                box-sizing: border-box;
            }
            .templates-main-container {
                flex: 1 1 70%;
                min-height: 400px;
                min-width: 0; /* Prevent overflow */
                background: #ffffff;
                border-radius: 8px;
                border: 1px solid #e9ecef;
                padding: 20px;
                box-sizing: border-box;
            }
            .templates-sidebar {
                flex: 0 0 30%;
                max-width: 30%;
                background: #f8f9fa;
                border-radius: 8px;
                padding: 20px;
                border: 1px solid #e9ecef;
                box-sizing: border-box;
                overflow: hidden;
            }
            .templates-grid {
                display: flex;
                flex-direction: column;
                gap: 15px;
                width: 100%;
                height: auto;
                box-sizing: border-box;
            }
            .empty-state {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                text-align: center;
                padding: 40px 20px;
                color: #6c757d;
                width: 100%;
                box-sizing: border-box;
            }
            .empty-state-icon {
                font-size: 64px;
                margin-bottom: 20px;
                opacity: 0.5;
            }
            .empty-state h3 {
                margin: 0 0 10px 0;
                font-size: 20px;
                color: #495057;
            }
            .empty-state p {
                margin: 0 0 25px 0;
                font-size: 16px;
            }
            .create-first-template-btn {
                background: #28a745;
            }
            .create-first-template-btn:hover {
                background: #218838;
            }
            
            /* Template Cards */
            .template-card {
                background: white;
                border: 2px solid #e9ecef;
                border-radius: 12px;
                padding: 18px 25px;
                transition: all 0.2s ease;
                cursor: pointer;
                width: 100%;
                box-sizing: border-box;
            }
            .template-card:hover {
                border-color: #007bff;
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(0,123,255,0.15);
            }
            .template-card-main {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            .template-card-top {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .template-card-left {
                display: flex;
                align-items: center;
                gap: 12px;
                flex: 1;
                min-width: 0;
            }
            .template-name {
                font-size: 16px;
                font-weight: 600;
                color: #333;
                white-space: nowrap;
                flex-shrink: 0;
            }
            .template-subject {
                font-size: 14px;
                color: #6c757d;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                flex: 1;
            }
            .template-card-actions {
                display: flex;
                gap: 8px;
                flex-shrink: 0;
            }
            .template-card-bottom {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .template-category {
                background: #e9ecef;
                color: #495057;
                padding: 4px 8px;
                border-radius: 12px;
                font-weight: 500;
                font-size: 12px;
            }
            .template-updated {
                color: #6c757d;
                font-size: 12px;
            }
            .edit-template-btn,
            .delete-template-btn {
                background: none;
                border: none;
                font-size: 16px;
                cursor: pointer;
                padding: 6px;
                border-radius: 4px;
                transition: background 0.2s ease;
            }
            .edit-template-btn:hover {
                background: rgba(0,123,255,0.1);
            }
            .delete-template-btn:hover {
                background: rgba(220,53,69,0.1);
            }
            
            /* Sidebar Styling */
            .sidebar-section {
                margin-bottom: 20px;
                width: 100%;
                box-sizing: border-box;
            }
            .sidebar-section:last-child {
                margin-bottom: 0;
            }
            .sidebar-section h4 {
                margin: 0 0 12px 0;
                font-size: 15px;
                font-weight: 600;
                color: #333;
                border-bottom: 2px solid #e9ecef;
                padding-bottom: 6px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            
            /* Quick Actions */
            .quick-actions {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            .quick-action-btn {
                background: white;
                border: 1px solid #dee2e6;
                border-radius: 6px;
                padding: 8px 10px;
                cursor: pointer;
                font-size: 12px;
                font-weight: 500;
                color: #495057;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                gap: 6px;
                width: 100%;
                text-align: left;
                box-sizing: border-box;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .quick-action-btn:hover {
                background: #007bff;
                color: white;
                border-color: #007bff;
                transform: translateX(2px);
            }
            
            /* Template Categories */
            .template-categories {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            .category-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 6px 10px;
                background: white;
                border-radius: 6px;
                border: 1px solid #dee2e6;
                cursor: pointer;
                transition: all 0.2s ease;
                width: 100%;
                box-sizing: border-box;
                min-width: 0;
            }
            .category-item:hover {
                background: #f8f9fa;
                border-color: #007bff;
            }
            .category-name {
                font-size: 12px;
                font-weight: 500;
                color: #495057;
                flex: 1;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                margin-right: 8px;
            }
            .category-count {
                background: #e9ecef;
                color: #6c757d;
                font-size: 11px;
                font-weight: 600;
                padding: 2px 6px;
                border-radius: 10px;
                min-width: 18px;
                text-align: center;
            }
            .category-item:hover .category-count {
                background: #007bff;
                color: white;
            }
            .category-item.active-category {
                background: #e3f2fd;
                border-color: #007bff;
            }
            .category-item.active-category .category-name {
                color: #0056b3;
                font-weight: 600;
            }
            .category-item.active-category .category-count {
                background: #007bff;
                color: white;
            }
            
            /* Recent Activity */
            .recent-activity {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            .activity-item {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 6px 10px;
                background: white;
                border-radius: 6px;
                border: 1px solid #dee2e6;
                width: 100%;
                box-sizing: border-box;
                min-width: 0;
            }
            .activity-icon {
                font-size: 16px;
                opacity: 0.7;
            }
            .activity-text {
                flex: 1;
                min-width: 0;
                overflow: hidden;
            }
            .activity-text span {
                font-size: 11px;
                color: #6c757d;
                font-style: italic;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                display: block;
            }
                 `;
        document.head.appendChild(style);
        console.log('Email templates CSS added to document head');
        console.log('Style element:', style);
    }
    
    function setupEmailTemplateEventListeners() {
        // Add Template button
        const addTemplateBtn = document.querySelector('.add-template-btn');
        const createFirstTemplateBtn = document.querySelector('.create-first-template-btn');
        
        if (addTemplateBtn) {
            addTemplateBtn.addEventListener('click', () => {
                console.log('Add Template clicked');
                showTemplateModal();
            });
        }
        
        if (createFirstTemplateBtn) {
            createFirstTemplateBtn.addEventListener('click', () => {
                console.log('Create First Template clicked');
                showTemplateModal();
            });
        }
        
        // Import Template button
        const importTemplateBtn = document.querySelector('.import-template-btn');
        if (importTemplateBtn) {
            importTemplateBtn.addEventListener('click', () => {
                console.log('Import Template clicked');
                alert('Template import feature will be implemented later!');
            });
        }
        
        // Export Template button
        const exportTemplateBtn = document.querySelector('.export-template-btn');
        if (exportTemplateBtn) {
            exportTemplateBtn.addEventListener('click', () => {
                console.log('Export Template clicked');
                alert('Template export feature will be implemented later!');
            });
        }
        
        // Search functionality
        const templateSearch = document.getElementById('template-search');
        if (templateSearch) {
            templateSearch.addEventListener('input', (e) => {
                const searchTerm = e.target.value.toLowerCase();
                console.log('Searching templates for:', searchTerm);
                // We'll implement search functionality later
            });
        }
        
        // Sidebar Quick Actions
        setupSidebarEventListeners();
    }
    
    function setupSidebarEventListeners() {
        // Quick Action buttons
        const quickActionButtons = document.querySelectorAll('.quick-action-btn');
        quickActionButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.textContent.trim();
                console.log('Quick action clicked:', action);
                
                if (action.includes('Preview')) {
                    alert('Template preview feature will be implemented!');
                } else if (action.includes('Duplicate')) {
                    alert('Template duplication feature will be implemented!');
                } else if (action.includes('Send Test')) {
                    alert('Test email feature will be implemented!');
                }
            });
        });
        
        // Category items
        const categoryItems = document.querySelectorAll('.category-item');
        categoryItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const categoryName = e.currentTarget.querySelector('.category-name').textContent;
                console.log('Category clicked:', categoryName);
                
                // Remove active class from all categories
                categoryItems.forEach(cat => cat.classList.remove('active-category'));
                
                // Add active class to clicked category
                e.currentTarget.classList.add('active-category');
                
                // Filter templates by category (will implement later)
                filterTemplatesByCategory(categoryName);
            });
        });
    }
    
    function filterTemplatesByCategory(categoryName) {
        console.log('Filtering templates by category:', categoryName);
        // This function will filter the templates grid based on the selected category
        // Implementation will come when we have actual templates
    }
    
    function updateCategoryCounts() {
        // Update the count badges next to each category
        const savedTemplates = localStorage.getItem('emailTemplates');
        if (savedTemplates) {
            const templates = JSON.parse(savedTemplates);
            
            // Count templates by category/stage
            const counts = {
                'Project Kickoff': 0,
                'Progress Updates': 0,
                'Milestone Complete': 0,
                'Project Closure': 0
            };
            
            templates.forEach(template => {
                if (counts.hasOwnProperty(template.stage)) {
                    counts[template.stage]++;
                }
            });
            
            // Update the DOM
            Object.keys(counts).forEach(category => {
                const categoryItem = Array.from(document.querySelectorAll('.category-name'))
                    .find(el => el.textContent === category);
                if (categoryItem) {
                    const countElement = categoryItem.parentElement.querySelector('.category-count');
                    if (countElement) {
                        countElement.textContent = counts[category];
                    }
                }
            });
        }
    }
    
    function loadEmailTemplates() {
        // Load saved email templates from localStorage
        const savedTemplates = localStorage.getItem('emailTemplates');
        if (savedTemplates) {
            const templates = JSON.parse(savedTemplates);
            console.log('Loaded templates:', templates);
            renderEmailTemplates(templates);
            updateCategoryCounts();
        } else {
            console.log('No saved templates found');
            // Keep the empty state visible
            updateCategoryCounts(); // Still update counts (will be 0)
        }
    }
    
    function renderEmailTemplates(templates) {
        const templatesGrid = document.querySelector('.templates-grid');
        if (!templatesGrid) return;
        
        // Clear current content
        templatesGrid.innerHTML = '';
        
        if (templates.length === 0) {
            // Show empty state
            templatesGrid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📧</div>
                    <h3>No Email Templates Yet</h3>
                    <p>Create your first email template to get started</p>
                    <button class="create-first-template-btn">
                        <i class="fas fa-plus"></i> Create First Template
                    </button>
                </div>
            `;
            
            // Re-attach event listener to the new button
            const createFirstTemplateBtn = templatesGrid.querySelector('.create-first-template-btn');
            if (createFirstTemplateBtn) {
                createFirstTemplateBtn.addEventListener('click', () => {
                    console.log('Create First Template clicked');
                    showTemplateModal();
                });
            }
        } else {
            // Render template cards
            templates.forEach(template => {
                const templateCard = createTemplateCard(template);
                templatesGrid.appendChild(templateCard);
            });
        }
    }
    
    function createTemplateCard(template) {
        const card = document.createElement('div');
        card.className = 'template-card';
        card.innerHTML = `
            <div class="template-card-main">
                <div class="template-card-top">
                    <div class="template-card-left">
                        <span class="template-name">${template.name}</span>
                        <span class="template-subject">${template.subject}</span>
                    </div>
                    <div class="template-card-actions">
                        <button class="edit-template-btn" data-id="${template.id}">✏️</button>
                        <button class="delete-template-btn" data-id="${template.id}">🗑️</button>
                    </div>
                </div>
                <div class="template-card-bottom">
                    <span class="template-category">${template.category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                    <span class="template-updated">Updated: ${new Date(template.updatedAt).toLocaleDateString()}</span>
                </div>
            </div>
        `;
        
        // Add event listeners to the card actions
        const editBtn = card.querySelector('.edit-template-btn');
        const deleteBtn = card.querySelector('.delete-template-btn');
        
        if (editBtn) {
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                showTemplateModal(template);
            });
        }
        
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`Are you sure you want to delete "${template.name}"?`)) {
                    deleteEmailTemplate(template.id);
                }
            });
        }
        
        return card;
    }
    
    function deleteEmailTemplate(templateId) {
        const savedTemplates = localStorage.getItem('emailTemplates');
        if (savedTemplates) {
            let templates = JSON.parse(savedTemplates);
            templates = templates.filter(t => t.id !== templateId);
            localStorage.setItem('emailTemplates', JSON.stringify(templates));
            renderEmailTemplates(templates);
            console.log('Template deleted:', templateId);
        }
    }

    // Make template modal functions global so they can be called from event handlers
    window.showTemplateModal = showTemplateModal;
    window.hideTemplateModal = hideTemplateModal;

    function setupTemplateTabSwitching() {
        // Get all template tab buttons
        const templateTabButtons = document.querySelectorAll('#template-tabs .tab-button');
        const templateTabPanes = document.querySelectorAll('#template-content .tab-pane');
        
        templateTabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.getAttribute('data-tab');
                
                // Remove active class from all buttons and panes
                templateTabButtons.forEach(btn => btn.classList.remove('active'));
                templateTabPanes.forEach(pane => pane.classList.remove('active'));
                
                // Add active class to clicked button and corresponding pane
                button.classList.add('active');
                const targetPane = document.getElementById(targetTab);
                if (targetPane) {
                    targetPane.classList.add('active');
                }
                
                // If switching to email templates tab, ensure proper initialization
                if (targetTab === 'email-templates') {
                    console.log('Switching to Email Templates tab');
                    // Re-initialize email templates to ensure CSS and functionality work
                    setTimeout(() => {
                        initializeEmailTemplates();
                    }, 100); // Small delay to ensure DOM is ready
                }
            });
        });
    }
    
    function updateProjectData(projectId, rowIndex, colIndex, newValue) {
        if (!projectsData[projectId]) return;
        
        // Update the project data
        if (projectsData[projectId].content[rowIndex]) {
            projectsData[projectId].content[rowIndex][colIndex] = newValue;
            
            // Get the header for this column
            const header = projectsData[projectId].headers[colIndex];
            
            // If this is a milestone change or a status change, update the timeline and current activity info
            if (header.toLowerCase().includes('milestone') || 
                header.toLowerCase().includes('status')) {
                const collapsibleContent = document.getElementById(projectId).querySelector('.collapsible-content');
                const timelineTab = document.getElementById(projectId).querySelector('.dashboard-tab[data-tab="timeline"]');
                
                if (collapsibleContent.classList.contains('expanded') && 
                    timelineTab.classList.contains('active')) {
                    updateProjectTimeline(projectId);
                }

                // Update current activity and next milestone
                updateCurrentActivityInfo(projectId);
            }
            
            saveState();
        }
    }

    function updateCurrentActivityInfo(projectId) {
        const project = projectsData[projectId];
        if (!project) return;

        // Get relevant column indices
        const statusColIndex = project.headers.findIndex(header => header.toLowerCase().includes('status'));
        const activityColIndex = project.headers.findIndex(header => header.toLowerCase() === 'actividad');
        const milestoneColIndex = project.headers.findIndex(header => header.toLowerCase().includes('milestone'));

        if (statusColIndex === -1 || activityColIndex === -1 || milestoneColIndex === -1) {
            console.warn('Required columns not found for current activity update');
            return;
        }

        // Find the first non-completed activity
        const currentActivityRow = project.content.find(row => {
            const status = (row[statusColIndex] || '').toLowerCase().trim();
            return status !== 'completo' && row[activityColIndex]; // Ensure there's an activity value
        });

        // Get the info table cells
        const infoContent = document.querySelector(`#${projectId} .info-content[data-info-content="general"]`);
        if (!infoContent) return;

        const currentActivityCell = infoContent.querySelector('.info-table-section:nth-child(2) table tr:nth-child(2) td');
        const nextMilestoneCell = infoContent.querySelector('.info-table-section:nth-child(2) table tr:nth-child(1) td');

        if (currentActivityCell && nextMilestoneCell) {
            if (currentActivityRow) {
                // Update current activity
                currentActivityCell.textContent = currentActivityRow[activityColIndex] || '--';
                // Update next milestone from the same row
                nextMilestoneCell.textContent = currentActivityRow[milestoneColIndex] || '--';
            } else {
                // No current activity found (all complete or no activities)
                currentActivityCell.textContent = '--';
                nextMilestoneCell.textContent = '--';
            }
        }
    }

    // Timezone functionality
    let timezoneOffset = 0; // Default to UTC
    let timeUpdateInterval = null;

    function updateTime(projectId) {
        const timeDisplay = document.querySelector(`#${projectId} .current-time`);
        if (!timeDisplay) return;

        const now = new Date();
        now.setMinutes(now.getMinutes() + now.getTimezoneOffset() + (timezoneOffset * 60));
        
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        timeDisplay.textContent = `${hours}:${minutes}`;
    }

    function setupTimezoneHandlers(projectId) {
        console.log('Setting up timezone handlers for project:', projectId);
        const tabPane = document.getElementById(projectId);
        if (!tabPane) {
            console.warn('Tab pane not found for project:', projectId);
            return;
        }

        const timezoneSelect = tabPane.querySelector('.timezone-select');
        const timezoneModal = tabPane.querySelector('.timezone-modal');
        const timezoneClose = tabPane.querySelector('.timezone-modal-close');
        const timezoneInput = tabPane.querySelector('.timezone-input');
        const timezoneApply = tabPane.querySelector('.timezone-apply-btn');
        const timezoneOffsetDisplay = tabPane.querySelector('.timezone-offset');

        console.log('Found timezone elements:', {
            select: !!timezoneSelect,
            modal: !!timezoneModal,
            close: !!timezoneClose,
            input: !!timezoneInput,
            apply: !!timezoneApply,
            display: !!timezoneOffsetDisplay
        });

        // Start time updates
        updateTime(projectId);
        if (timeUpdateInterval) clearInterval(timeUpdateInterval);
        timeUpdateInterval = setInterval(() => updateTime(projectId), 60000); // Update every minute

        // Show modal
        timezoneSelect.addEventListener('click', () => {
            console.log('Timezone icon clicked - opening modal');
            timezoneModal.classList.add('active');
            timezoneInput.value = timezoneOffset;
        });

        // Hide modal
        timezoneClose.addEventListener('click', () => {
            timezoneModal.classList.remove('active');
        });

        // Apply new timezone
        timezoneApply.addEventListener('click', () => {
            const newOffset = parseInt(timezoneInput.value);
            if (!isNaN(newOffset) && newOffset >= -12 && newOffset <= 14) {
                timezoneOffset = newOffset;
                timezoneOffsetDisplay.textContent = `UTC${newOffset >= 0 ? '+' : ''}${newOffset}`;
                updateTime(projectId);
                timezoneModal.classList.remove('active');
            } else {
                alert('Please enter a valid timezone offset between -12 and +14');
            }
        });

        // Close modal when clicking outside
        timezoneModal.addEventListener('click', (e) => {
            if (e.target === timezoneModal) {
                timezoneModal.classList.remove('active');
            }
        });

        // Handle Enter key in input
        timezoneInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                timezoneApply.click();
            }
        });
    }

    // Add timezone setup to createProjectTab
    const originalCreateProjectTab = createProjectTab;
    createProjectTab = function(projectName, projectId) {
        const result = originalCreateProjectTab(projectName, projectId);
        setupTimezoneHandlers(projectId);
        return result;
    };

    // Kanban board initialization and functionality
    function initializeKanban() {
        const kanbanBoard = document.getElementById('kanban-board');
        if (!kanbanBoard) return;

        // Clear existing content
        kanbanBoard.innerHTML = `
            <div class="kanban-filters">
                <div class="filter-group">
                    <label for="kanban-project-filter">Project:</label>
                    <select id="kanban-project-filter">
                        <option value="all">All Projects</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label for="kanban-date-filter">Due Date:</label>
                    <input type="date" id="kanban-date-filter">
                    <button id="kanban-clear-date-filter">Clear</button>
                </div>
            </div>
            <div class="kanban-columns">
                <div class="kanban-column" data-status="todo">
                    <h3>To Do</h3>
                    <div class="kanban-cards"></div>
                </div>
                <div class="kanban-column" data-status="in-progress">
                    <h3>In Progress</h3>
                    <div class="kanban-cards"></div>
                </div>
                <div class="kanban-column" data-status="completed">
                    <h3>Completed</h3>
                    <div class="kanban-cards"></div>
                </div>
            </div>
        `;

        // Initialize filters
        const projectFilter = document.getElementById('kanban-project-filter');
        const dateFilter = document.getElementById('kanban-date-filter');
        const clearDateFilter = document.getElementById('kanban-clear-date-filter');

        // Load saved Kanban state
        loadKanbanState();

        // Populate project filter
        Object.keys(projectsData).forEach(projectId => {
            const option = document.createElement('option');
            option.value = projectId;
            option.textContent = projectId;
            projectFilter.appendChild(option);
        });

        // Add event listeners for filters
        projectFilter.addEventListener('change', renderKanbanCards);
        dateFilter.addEventListener('change', renderKanbanCards);
        clearDateFilter.addEventListener('click', () => {
            dateFilter.value = '';
            renderKanbanCards();
        });

        // Initialize drag and drop
        const columns = document.querySelectorAll('.kanban-column');
        columns.forEach(column => {
            column.addEventListener('dragover', e => {
                e.preventDefault();
                const dragging = document.querySelector('.dragging');
                if (dragging) {
                    const cards = [...column.querySelectorAll('.kanban-card:not(.dragging)')];
                    const afterCard = cards.reduce((closest, card) => {
                        const box = card.getBoundingClientRect();
                        const offset = e.clientY - box.top - box.height / 2;
                        if (offset < 0 && offset > closest.offset) {
                            return { offset, element: card };
                        }
                        return closest;
                    }, { offset: Number.NEGATIVE_INFINITY }).element;

                    const cardsContainer = column.querySelector('.kanban-cards');
                    if (afterCard) {
                        cardsContainer.insertBefore(dragging, afterCard);
                    } else {
                        cardsContainer.appendChild(dragging);
                    }
                }
            });
        });

        // Initial render
        renderKanbanCards();
    }

    // Function to render Kanban cards based on filters
    function renderKanbanCards() {
        const projectFilter = document.getElementById('kanban-project-filter');
        const dateFilter = document.getElementById('kanban-date-filter');
        const selectedProject = projectFilter.value;
        const selectedDate = dateFilter.value;

        // Clear all columns
        document.querySelectorAll('.kanban-cards').forEach(column => {
            column.innerHTML = '';
        });

        // Get all tasks that are either "En proceso" or "Pendiente"
        const allTasks = [];
        Object.entries(projectsData).forEach(([projectId, data]) => {
            data.content.forEach((row, rowIndex) => {
                const statusIndex = data.headers.findIndex(h => isStatusColumn(h));
                const dateIndex = data.headers.findIndex(h => isDateColumn(h));
                const activityIndex = data.headers.findIndex(h => h.trim().toLowerCase() === 'actividad');
                const commentIndex = data.headers.findIndex(h => isCommentColumn(h));
                
                const status = row[statusIndex]?.toLowerCase() || '';
                const dueDate = row[dateIndex] || '';
                const activity = row[activityIndex] || 'Untitled Task';
                const comments = row[commentIndex] || '';

                // Only include tasks that are "En proceso" or "Pendiente"
                if (status !== 'en proceso' && status !== 'pendiente') return;

                // Get the saved Kanban status for this task
                const kanbanStatus = getKanbanStatus(projectId, rowIndex);
                const kanbanNotes = getKanbanNotes(projectId, rowIndex) || '';

                // Always include the task, we'll filter later
                allTasks.push({
                    projectId,
                    rowIndex,
                    status,
                    dueDate,
                    kanbanStatus,
                    activity,
                    comments,
                    notes: kanbanNotes
                });
            });
        });

        // Filter tasks: only apply filters to "todo" tasks, keep others as is
        const filteredTasks = allTasks.filter(task => {
            // If task is not in todo, always keep it
            if (task.kanbanStatus !== 'todo') {
                return true;
            }

            // Apply filters only to todo tasks
            if (selectedProject !== 'all' && selectedProject !== task.projectId) {
                return false;
            }
            if (selectedDate && task.dueDate !== selectedDate) {
                return false;
            }
            return true;
        });

        // Sort tasks by status to maintain column order
        const columnOrder = ['todo', 'in-progress', 'completed'];
        filteredTasks.sort((a, b) => {
            return columnOrder.indexOf(a.kanbanStatus) - columnOrder.indexOf(b.kanbanStatus);
        });

        // Create and append cards
        filteredTasks.forEach(task => {
            const card = createKanbanCard(task);
            const column = document.querySelector(`.kanban-column[data-status="${task.kanbanStatus}"] .kanban-cards`);
            if (column) {
                column.appendChild(card);
            }
        });
    }

    // Function to save/get Kanban notes
    function updateKanbanNotes(projectId, rowIndex, notes) {
        const kanbanState = JSON.parse(localStorage.getItem('kanbanState') || '{}');
        if (!kanbanState[projectId]) {
            kanbanState[projectId] = {};
        }
        if (!kanbanState[projectId][rowIndex]) {
            kanbanState[projectId][rowIndex] = {};
        }
        kanbanState[projectId][rowIndex].notes = notes;
        localStorage.setItem('kanbanState', JSON.stringify(kanbanState));
    }

    function getKanbanNotes(projectId, rowIndex) {
        const kanbanState = JSON.parse(localStorage.getItem('kanbanState') || '{}');
        return kanbanState[projectId]?.[rowIndex]?.notes || '';
    }

    // Update the Kanban status storage
    function updateKanbanStatus(projectId, rowIndex, newStatus) {
        const kanbanState = JSON.parse(localStorage.getItem('kanbanState') || '{}');
        if (!kanbanState[projectId]) {
            kanbanState[projectId] = {};
        }
        kanbanState[projectId][rowIndex] = {
            ...kanbanState[projectId][rowIndex],
            status: newStatus
        };
        localStorage.setItem('kanbanState', JSON.stringify(kanbanState));
    }

    function getKanbanStatus(projectId, rowIndex) {
        const kanbanState = JSON.parse(localStorage.getItem('kanbanState') || '{}');
        const status = kanbanState[projectId]?.[rowIndex]?.status;
        return status || 'todo';  // Default to 'todo' only if no status is found
    }

    // Function to load Kanban state
    function loadKanbanState() {
        if (!localStorage.getItem('kanbanState')) {
            localStorage.setItem('kanbanState', '{}');
        }
    }

    // Function to create a Kanban card
    function createKanbanCard(task) {
        const card = document.createElement('div');
        card.className = 'kanban-card';
        card.draggable = true;
        card.dataset.projectId = task.projectId;
        card.dataset.rowIndex = task.rowIndex;

        card.innerHTML = `
            <div class="kanban-card-header">
                <div class="kanban-card-title">
                    <input type="checkbox" class="kanban-card-checkbox">
                    <h4>${task.projectId}</h4>
                </div>
                ${task.dueDate ? `<span class="due-date">${task.dueDate}</span>` : ''}
            </div>
            <div class="kanban-card-content">
                <p class="activity-text">${task.activity}</p>
                <div class="kanban-card-notes">
                    <textarea placeholder="Add notes...">${task.notes}</textarea>
                </div>
            </div>
        `;

        // Add drag events
        card.addEventListener('dragstart', () => {
            card.classList.add('dragging');
        });

        card.addEventListener('dragend', () => {
            card.classList.remove('dragging');
            const newStatus = card.closest('.kanban-column').dataset.status;
            updateKanbanStatus(task.projectId, task.rowIndex, newStatus);
            task.kanbanStatus = newStatus; // Update the task object's status
        });

        // Add notes save functionality
        const textarea = card.querySelector('textarea');
        textarea.addEventListener('change', () => {
            updateKanbanNotes(task.projectId, task.rowIndex, textarea.value);
        });

        // Add checkbox functionality
        const checkbox = card.querySelector('.kanban-card-checkbox');
        
        // Set initial checkbox state based on kanban status
        checkbox.checked = task.kanbanStatus === 'completed';
        
        checkbox.addEventListener('change', () => {
            const currentStatus = task.kanbanStatus;
            let newStatus;
            
            // Determine new status based on current status
            if (currentStatus === 'todo') {
                newStatus = 'in-progress';
                checkbox.checked = false;  // Keep unchecked in In Progress
            } else if (currentStatus === 'in-progress') {
                newStatus = 'completed';
                checkbox.checked = true;   // Check when moving to Completed
            } else if (currentStatus === 'completed') {
                newStatus = 'todo';
                checkbox.checked = false;  // Uncheck when moving back to Todo
            }

            // Move the card to the new column
            const newColumn = document.querySelector(`.kanban-column[data-status="${newStatus}"] .kanban-cards`);
            if (newColumn) {
                newColumn.appendChild(card);
                updateKanbanStatus(task.projectId, task.rowIndex, newStatus);
                task.kanbanStatus = newStatus; // Update the task object's status
            }
        });

        return card;
    }

    // Contacts functionality
    function initializeContacts() {
        let contacts = [];
        let projectContacts = new Map();

        function loadContacts() {
            contacts = JSON.parse(localStorage.getItem('contacts') || '[]');
            renderContacts();
            updateProjectSelects(); // Add this line
        }

        function saveContacts() {
            localStorage.setItem('contacts', JSON.stringify(contacts));
            updateProjectSelects(); // Add this line
        }

        function renderContacts(filteredContacts = null) {
            const contactsToRender = filteredContacts || contacts;
            const tableBody = document.querySelector('#contactos-view .contacts-table tbody');
            if (!tableBody) return;

            tableBody.innerHTML = '';

            if (contactsToRender.length === 0) {
                const emptyRow = document.createElement('tr');
                emptyRow.innerHTML = `
                    <td colspan="7" class="empty-state">
                        No hay contactos disponibles
                    </td>
                `;
                tableBody.appendChild(emptyRow);
                return;
            }

            contactsToRender.forEach(contact => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${contact.name}</td>
                    <td>${contact.position}</td>
                    <td>${contact.email}</td>
                    <td>${contact.phone || '-'}</td>
                    <td>${contact.company}</td>
                    <td class="project-tags-cell">
                        ${renderProjectTags(contact.projects || [])}
                    </td>
                    <td class="actions">
                        <button class="edit-btn" data-id="${contact.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="delete-btn" data-id="${contact.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
            addContactCardListeners();
        }

        function renderProjectTags(projects) {
            return (projects || []).map(project => {
                const tagSpan = document.createElement('span');
                tagSpan.className = 'project-tag';
                tagSpan.textContent = project;
                return tagSpan.outerHTML;
            }).join('');
        }

        function updateProjectSelects() {
            // Get all unique project names from project tabs
            const projectNames = new Set();
            
            // Add projects from project tabs
            console.log('Looking for project tabs...');
            document.querySelectorAll('.tab-button').forEach(tab => {
                const projectName = tab.querySelector('.project-name-editable')?.textContent.trim();
                console.log('Found project:', projectName);
                if (projectName && projectName !== 'Main Template') projectNames.add(projectName);
            });

            console.log('All project names:', Array.from(projectNames));

            // Update both forms with project tags
            ['contact', 'edit-contact'].forEach(formId => {
                const tagsContainer = document.getElementById(`${formId}-project-tags`);
                console.log(`Looking for ${formId}-project-tags:`, tagsContainer);
                if (!tagsContainer) return;

                // Clear existing tags
                tagsContainer.innerHTML = '';

                // Add all project names as tags
                Array.from(projectNames).sort().forEach(project => {
                    console.log('Adding project tag:', project);
                    const tagElement = document.createElement('span');
                    tagElement.className = 'project-tag unselected';
                    tagElement.textContent = project;
                    tagElement.setAttribute('data-project', project);
                    
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
            });
        }

        function getProjectTagsFromForm(formId) {
            const tagsContainer = document.getElementById(`${formId}-project-tags`);
            if (!tagsContainer) return [];
            return Array.from(tagsContainer.querySelectorAll('.project-tag.selected'))
                .map(tag => tag.textContent.trim());
        }

        function pullContactsFromProjects() {
            // --- STAGE 1: Consolidate and Link (Project -> Directory) ---
            
            // Get existing contacts from localStorage (The Directory)
            let directoryContacts = JSON.parse(localStorage.getItem('contacts') || '[]');

            // Iterate over all projects in projectsData to find new contacts
            Object.values(projectsData).forEach(project => {
                if (!project || !project.name || !project.quickInfoContacts) return;

                const projectName = project.name;
                const projectQuickContacts = project.quickInfoContacts.contacts || [];

                projectQuickContacts.forEach(infoContact => {
                    const contactName = infoContact.name?.trim();
                    const contactEmail = infoContact.email?.trim();

                    if (!contactName || contactName === '--' || contactName === '') {
                        return; // Skip empty/placeholder contacts
                    }

                    // Find if contact already exists in the directory
                    let existingContact = null;
                    if (contactEmail && contactEmail !== '--' && contactEmail !== '') {
                        existingContact = directoryContacts.find(dirContact => dirContact.email === contactEmail);
                    }
                    if (!existingContact) {
                         existingContact = directoryContacts.find(dirContact => dirContact.name === contactName);
                    }

                    if (existingContact) {
                        // Contact exists: ensure it's linked to this project
                        if (!existingContact.projects) existingContact.projects = [];
                        if (!existingContact.projects.includes(projectName)) {
                            existingContact.projects.push(projectName);
                        }
                    } else {
                        // Contact doesn't exist: create a new one in the directory
                        const newContact = {
                            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                            name: infoContact.name,
                            position: infoContact.position,
                            email: infoContact.email,
                            phone: infoContact.phone,
                            company: '', // company is not in quick-info-table
                            projects: [projectName]
                        };
                        directoryContacts.push(newContact);
                    }
                });
            });
            
            // --- STAGE 2: Distribute and Update (Directory -> Project) ---
            
            // Iterate through the master list and update each project's data
            directoryContacts.forEach(dirContact => {
                if (!dirContact.projects) return;

                dirContact.projects.forEach(projectName => {
                    const projectToUpdate = Object.values(projectsData).find(p => p.name === projectName);
                    if (!projectToUpdate || !projectToUpdate.quickInfoContacts) return;

                    const contactsInProject = projectToUpdate.quickInfoContacts.contacts;
                    
                    // Find the contact in the project's quick info table
                    let contactToUpdate = null;
                    if (dirContact.email && dirContact.email !== '--' && dirContact.email !== '') {
                        contactToUpdate = contactsInProject.find(pContact => pContact.email === dirContact.email);
                    }
                    if (!contactToUpdate && dirContact.name) {
                        contactToUpdate = contactsInProject.find(pContact => pContact.name === dirContact.name);
                    }

                    if (contactToUpdate) {
                        // Update existing contact in the project
                        contactToUpdate.name = dirContact.name;
                        contactToUpdate.position = dirContact.position;
                        contactToUpdate.email = dirContact.email;
                        contactToUpdate.phone = dirContact.phone;
                    } else {
                        // Add new contact to the project if it was linked from the directory
                        contactsInProject.push({
                            name: dirContact.name,
                            position: dirContact.position,
                            email: dirContact.email,
                            phone: dirContact.phone,
                        });
                    }
                });
            });

            // --- FINAL STEP: Save and Re-render ---
            
            // Update the global contacts array for the directory view
            contacts = directoryContacts;
            
            // Save the updated directory
            saveContacts(); 
            
            // Manually save the dashboard state with the updated projectsData,
            // bypassing the DOM-reading part of saveState() which would overwrite our changes.
            const state = {
                headers: currentTemplateHeaders,
                rows: currentTemplateRows,
                projects: projectsData, // Use the projectsData that was just modified in memory
                projectCount: projectCount,
                columnWidths: columnWidths
            };
            localStorage.setItem('dashboardState', JSON.stringify(state));

            // Re-render the UI from the newly saved state
            renderContacts(); // Refreshes the directory view

            // Re-render all project quick-info tables to reflect changes
            Object.keys(projectsData).forEach(renderProjectQuickInfo);

            alert('Contacts have been synced between the directory and all projects.');
        }

        function showContactForm() {
            const modal = document.getElementById('contact-modal');
            const form = document.getElementById('contact-form');
            if (!modal || !form) return;

            form.reset();
            document.getElementById('contact-project-tags').innerHTML = '';
            updateProjectSelects();
            modal.style.display = 'flex';
        }

        function hideContactForm() {
            const modal = document.getElementById('contact-modal');
            if (modal) modal.style.display = 'none';
        }

        function showEditContactForm(contactId) {
            const contact = contacts.find(c => c.id === contactId);
            if (!contact) return;

            const modal = document.getElementById('edit-contact-modal');
            const form = document.getElementById('edit-contact-form');
            if (!modal || !form) return;

            form.elements['id'].value = contact.id;
            form.elements['name'].value = contact.name;
            form.elements['position'].value = contact.position;
            form.elements['email'].value = contact.email;
            form.elements['phone'].value = contact.phone || '';
            form.elements['company'].value = contact.company;

            // Update project tags
            updateProjectSelects();
            
            // Mark the contact's current projects as selected
            if (contact.projects) {
                const tagsContainer = document.getElementById('edit-contact-project-tags');
                contact.projects.forEach(project => {
                    const tagElement = tagsContainer.querySelector(`.project-tag[data-project="${project}"]`);
                    if (tagElement) {
                        tagElement.classList.remove('unselected');
                        tagElement.classList.add('selected');
                    }
                });
            }

            modal.style.display = 'flex';
        }

        function hideEditContactForm() {
            const modal = document.getElementById('edit-contact-modal');
            if (modal) modal.style.display = 'none';
        }

        function addContact(contactData) {
            const contacts = JSON.parse(localStorage.getItem('contacts') || '[]');
            const newContact = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                ...contactData,
                projects: getProjectTagsFromForm('contact')
            };
            contacts.push(newContact);
            localStorage.setItem('contacts', JSON.stringify(contacts));
            
            // Refresh all UI elements
            loadContacts(); // This will trigger a full refresh of contacts
            updateProjectSelects();
            hideContactForm();
        }

        function updateContact(contactData) {
            const contacts = JSON.parse(localStorage.getItem('contacts') || '[]');
            const index = contacts.findIndex(c => c.id === contactData.id);
            if (index === -1) return;

            contacts[index] = {
                ...contacts[index],
                ...contactData,
                projects: getProjectTagsFromForm('edit-contact')
            };

            localStorage.setItem('contacts', JSON.stringify(contacts));
            
            // Refresh all UI elements
            loadContacts(); // This will trigger a full refresh of contacts
            setupContactFilters();
            applyContactFilters();
            updateProjectSelects();
            hideEditContactForm();
        }

        function deleteContact(contactId) {
            if (!confirm('¿Estás seguro de que deseas eliminar este contacto?')) return;
            contacts = contacts.filter(c => c.id !== contactId);
            saveContacts();
            setupContactFilters();
            applyContactFilters();
        }

        function addContactCardListeners() {
            document.querySelectorAll('.edit-btn').forEach(btn => {
                btn.addEventListener('click', () => showEditContactForm(btn.dataset.id));
            });

            document.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', () => deleteContact(btn.dataset.id));
            });
        }

        function setupModalHandlers() {
            // Add Contact Modal
            const addModal = document.getElementById('contact-modal');
            const addBtn = document.querySelector('.add-contact-btn');
            const addCloseBtn = addModal?.querySelector('.close-modal');
            const addCancelBtn = addModal?.querySelector('.cancel-btn');

            if (addBtn) {
                addBtn.addEventListener('click', () => {
                    showContactForm();
                });
            }

            if (addCloseBtn) {
                addCloseBtn.addEventListener('click', hideContactForm);
            }

            if (addCancelBtn) {
                addCancelBtn.addEventListener('click', hideContactForm);
            }

            // Edit Contact Modal
            const editModal = document.getElementById('edit-contact-modal');
            const editCloseBtn = editModal?.querySelector('.close-modal');
            const editCancelBtn = editModal?.querySelector('.cancel-btn');

            if (editCloseBtn) {
                editCloseBtn.addEventListener('click', hideEditContactForm);
            }

            if (editCancelBtn) {
                editCancelBtn.addEventListener('click', hideEditContactForm);
            }

            // Close modals when clicking outside
            window.addEventListener('click', (e) => {
                if (e.target === addModal) hideContactForm();
                if (e.target === editModal) hideEditContactForm();
            });
        }

        // Initialize immediately instead of waiting for DOMContentLoaded
        addContactFilterUI();
        loadContacts();
        updateProjectSelects();
        setupContactFilters();
        setupModalHandlers();

        // Add event listeners for forms
        const contactForm = document.getElementById('contact-form');
        const editContactForm = document.getElementById('edit-contact-form');

        if (contactForm) {
            contactForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                addContact(Object.fromEntries(formData));
            });
        }

        if (editContactForm) {
            editContactForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                updateContact(Object.fromEntries(formData));
            });
        }

        // Add search functionality
        const searchInput = document.getElementById('contact-search');
        if (searchInput) {
            searchInput.addEventListener('input', applyContactFilters);
        }

        // Add pull contacts button event listener (button is now in HTML)
        const pullContactsBtn = document.querySelector('.pull-contacts-btn');
        if (pullContactsBtn && !pullContactsBtn.hasAttribute('data-event-added')) {
            pullContactsBtn.addEventListener('click', pullContactsFromProjects);
            pullContactsBtn.setAttribute('data-event-added', 'true');
        }

        function addContactFilterUI() {
            const contactsView = document.getElementById('contactos-view');
            const contactsToolbar = contactsView?.querySelector('.contacts-toolbar');

            if (!contactsView || !contactsToolbar || contactsView.querySelector('.filter-container')) {
                return; // Already exists or required elements are missing
            }

            const style = document.createElement('style');
            style.textContent = `
                .contacts-header {
                    text-align: center;
                    margin-bottom: 20px;
                }
                .contacts-header h2 {
                    margin: 0;
                    font-size: 24px;
                    color: #333;
                    font-weight: 600;
                }
                .contacts-toolbar {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 20px;
                    padding: 15px 20px;
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                .toolbar-left, .toolbar-right {
                    flex: 0 0 auto;
                }
                .toolbar-center {
                    flex: 1;
                    display: flex;
                    justify-content: center;
                    max-width: 400px;
                    margin: 0 20px;
                }
                .search-container {
                    position: relative;
                    width: 100%;
                    max-width: 350px;
                }
                .search-container input {
                    width: 100%;
                    padding: 10px 40px 10px 16px;
                    border: 2px solid #e1e8ed;
                    border-radius: 25px;
                    font-size: 14px;
                    outline: none;
                    transition: border-color 0.2s ease;
                }
                .search-container input:focus {
                    border-color: #007bff;
                }
                .search-icon {
                    position: absolute;
                    right: 15px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: #6c757d;
                    pointer-events: none;
                }
                .toolbar-left .add-contact-btn,
                .toolbar-right .pull-contacts-btn {
                    background: #007bff;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    padding: 10px 16px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .toolbar-left .add-contact-btn:hover,
                .toolbar-right .pull-contacts-btn:hover {
                    background: #0056b3;
                    transform: translateY(-1px);
                    box-shadow: 0 2px 8px rgba(0,123,255,0.25);
                }
                .toolbar-right .pull-contacts-btn {
                    background: #6c757d;
                }
                .toolbar-right .pull-contacts-btn:hover {
                    background: #5a6268;
                }
                .filter-container { 
                    padding: 20px 0; 
                    border-bottom: 2px solid #f0f2f5; 
                    margin-bottom: 20px; 
                    background: #fafbfc;
                    border-radius: 8px;
                    margin: 0 -20px 20px -20px;
                    padding: 20px;
                }
                .filter-bar { 
                    display: flex; 
                    gap: 15px; 
                    align-items: center; 
                    flex-wrap: wrap;
                }
                .filter-group { 
                    position: relative; 
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .filter-btn { 
                    background: white; 
                    border: 2px solid #e1e8ed; 
                    border-radius: 8px; 
                    padding: 10px 16px; 
                    cursor: pointer; 
                    font-size: 14px;
                    font-weight: 500;
                    color: #333;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    transition: all 0.2s ease;
                    min-width: 120px;
                    justify-content: space-between;
                }
                .filter-btn:hover { 
                    background: #f8f9fa; 
                    border-color: #007bff;
                    transform: translateY(-1px);
                    box-shadow: 0 2px 8px rgba(0,123,255,0.15);
                }
                .filter-btn.active { 
                    background: #007bff; 
                    color: white; 
                    border-color: #007bff;
                }
                .filter-btn .dropdown-arrow {
                    font-size: 12px;
                    transition: transform 0.2s ease;
                }
                .filter-btn.active .dropdown-arrow {
                    transform: rotate(180deg);
                }
                .filter-badge {
                    background: #dc3545;
                    color: white;
                    border-radius: 12px;
                    padding: 2px 8px;
                    font-size: 11px;
                    font-weight: bold;
                    margin-left: 4px;
                }
                .filter-btn.active .filter-badge {
                    background: rgba(255,255,255,0.3);
                }
                .filter-dropdown { 
                    display: none; 
                    position: absolute; 
                    top: 100%;
                    left: 0;
                    right: 0;
                    background: white; 
                    border: 2px solid #e1e8ed; 
                    border-radius: 12px; 
                    max-height: 280px; 
                    overflow-y: auto; 
                    z-index: 1000; 
                    box-shadow: 0 8px 25px rgba(0,0,0,0.15);
                    margin-top: 4px;
                    animation: filterDropdownSlide 0.2s ease;
                }
                @keyframes filterDropdownSlide {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .filter-dropdown.active { 
                    display: block; 
                }
                .filter-dropdown-header {
                    padding: 12px 16px;
                    border-bottom: 1px solid #f0f2f5;
                    background: #fafbfc;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-radius: 10px 10px 0 0;
                }
                .filter-dropdown-title {
                    font-weight: 600;
                    font-size: 14px;
                    color: #333;
                }
                .filter-clear-btn {
                    background: none;
                    border: none;
                    color: #007bff;
                    cursor: pointer;
                    font-size: 12px;
                    font-weight: 500;
                    padding: 4px 8px;
                    border-radius: 4px;
                    transition: background 0.2s ease;
                }
                .filter-clear-btn:hover {
                    background: rgba(0,123,255,0.1);
                }
                .filter-search {
                    padding: 8px 16px;
                    border-bottom: 1px solid #f0f2f5;
                }
                .filter-search input {
                    width: 100%;
                    border: 1px solid #e1e8ed;
                    border-radius: 6px;
                    padding: 8px 12px;
                    font-size: 13px;
                    outline: none;
                    transition: border-color 0.2s ease;
                }
                .filter-search input:focus {
                    border-color: #007bff;
                }
                .filter-options {
                    padding: 8px 0;
                    max-height: 180px;
                    overflow-y: auto;
                }
                .filter-option { 
                    display: flex;
                    align-items: center;
                    padding: 8px 16px; 
                    cursor: pointer;
                    transition: background 0.2s ease;
                    border: none;
                    margin: 0;
                }
                .filter-option:hover { 
                    background: #f8f9fa; 
                }
                .filter-option input {
                    margin: 0;
                    margin-right: 12px;
                    transform: scale(1.1);
                }
                .filter-option label {
                    cursor: pointer;
                    font-size: 14px;
                    color: #333;
                    margin: 0;
                    flex: 1;
                    display: flex;
                    align-items: center;
                }
                .clear-all-filters {
                    background: #6c757d;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    padding: 8px 16px;
                    cursor: pointer;
                    font-size: 13px;
                    font-weight: 500;
                    transition: background 0.2s ease;
                }
                                 .clear-all-filters:hover {
                     background: #5a6268;
                 }
                 .copy-emails-btn {
                     background: #28a745;
                     color: white;
                     border: none;
                     border-radius: 6px;
                     padding: 8px 16px;
                     cursor: pointer;
                     font-size: 13px;
                     font-weight: 500;
                     transition: all 0.2s ease;
                     display: flex;
                     align-items: center;
                     gap: 6px;
                     margin-left: auto;
                 }
                 .copy-emails-btn:hover {
                     background: #218838;
                     transform: translateY(-1px);
                     box-shadow: 0 2px 8px rgba(40,167,69,0.25);
                 }
                 .copy-emails-btn:active {
                     transform: translateY(0);
                 }
                 .copy-emails-btn.copied {
                     background: #17a2b8;
                     animation: copySuccess 0.3s ease;
                 }
                 @keyframes copySuccess {
                     0% { transform: scale(1); }
                     50% { transform: scale(1.05); }
                     100% { transform: scale(1); }
                 }
                 .copy-emails-btn .icon {
                     font-size: 14px;
                 }
                .filter-dropdown::-webkit-scrollbar {
                    width: 6px;
                }
                .filter-dropdown::-webkit-scrollbar-track {
                    background: #f1f1f1;
                    border-radius: 3px;
                }
                .filter-dropdown::-webkit-scrollbar-thumb {
                    background: #c1c1c1;
                    border-radius: 3px;
                }
                .filter-dropdown::-webkit-scrollbar-thumb:hover {
                    background: #a1a1a1;
                }
            `;
            document.head.appendChild(style);

            const filterContainer = document.createElement('div');
            filterContainer.className = 'filter-container';

            filterContainer.innerHTML = `
                <div class="filter-bar">
                    <div class="filter-group">
                        <button id="project-filter-btn" class="filter-btn">
                            <span class="filter-text">Proyecto</span>
                            <span class="dropdown-arrow">▼</span>
                        </button>
                        <div id="project-filter-dropdown" class="filter-dropdown">
                            <div class="filter-dropdown-header">
                                <span class="filter-dropdown-title">Filtrar por Proyecto</span>
                                <button class="filter-clear-btn" data-filter="project">Limpiar</button>
                            </div>
                            <div class="filter-search">
                                <input type="text" placeholder="Buscar proyecto..." class="filter-search-input">
                            </div>
                            <div class="filter-options"></div>
                        </div>
                    </div>
                    <div class="filter-group">
                        <button id="company-filter-btn" class="filter-btn">
                            <span class="filter-text">Empresa</span>
                            <span class="dropdown-arrow">▼</span>
                        </button>
                        <div id="company-filter-dropdown" class="filter-dropdown">
                            <div class="filter-dropdown-header">
                                <span class="filter-dropdown-title">Filtrar por Empresa</span>
                                <button class="filter-clear-btn" data-filter="company">Limpiar</button>
                            </div>
                            <div class="filter-search">
                                <input type="text" placeholder="Buscar empresa..." class="filter-search-input">
                            </div>
                            <div class="filter-options"></div>
                        </div>
                    </div>
                    <div class="filter-group">
                        <button id="position-filter-btn" class="filter-btn">
                            <span class="filter-text">Cargo</span>
                            <span class="dropdown-arrow">▼</span>
                        </button>
                        <div id="position-filter-dropdown" class="filter-dropdown">
                            <div class="filter-dropdown-header">
                                <span class="filter-dropdown-title">Filtrar por Cargo</span>
                                <button class="filter-clear-btn" data-filter="position">Limpiar</button>
                            </div>
                            <div class="filter-search">
                                <input type="text" placeholder="Buscar cargo..." class="filter-search-input">
                            </div>
                            <div class="filter-options"></div>
                        </div>
                    </div>
                    <button class="clear-all-filters">Limpiar Todo</button>
                    <button class="copy-emails-btn" id="copy-emails-btn">
                        <span class="icon">📧</span>
                        <span class="text">Copiar Emails</span>
                    </button>
                </div>
            `;
            
            // Insert the container after the toolbar element
            contactsToolbar.after(filterContainer);
            
            // Add global click handler to close dropdowns when clicking outside (only once)
            if (!document._contactFiltersClickHandlerAdded) {
                document.addEventListener('click', (e) => {
                    if (!e.target.closest('.filter-group')) {
                        document.querySelectorAll('.filter-dropdown.active').forEach(dropdown => {
                            dropdown.classList.remove('active');
                            dropdown.closest('.filter-group').querySelector('.filter-btn').classList.remove('active');
                        });
                    }
                });
                document._contactFiltersClickHandlerAdded = true;
            }
            
            // Add copy emails functionality
            setupCopyEmailsButton();
        }
        
        function setupCopyEmailsButton() {
            const copyEmailsBtn = document.getElementById('copy-emails-btn');
            if (!copyEmailsBtn) return;
            
            copyEmailsBtn.addEventListener('click', async () => {
                try {
                    const visibleEmails = getVisibleEmails();
                    
                    if (visibleEmails.length === 0) {
                        showCopyFeedback(copyEmailsBtn, 'No hay emails para copiar', 'warning');
                        return;
                    }
                    
                    // Format emails for email clients (comma-separated)
                    const emailString = visibleEmails.join(', ');
                    
                    // Copy to clipboard
                    await navigator.clipboard.writeText(emailString);
                    
                    // Show success feedback
                    showCopyFeedback(copyEmailsBtn, `${visibleEmails.length} email${visibleEmails.length > 1 ? 's' : ''} copiado${visibleEmails.length > 1 ? 's' : ''}`, 'success');
                    
                } catch (error) {
                    console.error('Error copying emails:', error);
                    showCopyFeedback(copyEmailsBtn, 'Error al copiar emails', 'error');
                }
            });
        }
        
        function getVisibleEmails() {
            const visibleEmails = [];
            const tableRows = document.querySelectorAll('#contactos-view .contacts-table tbody tr');
            
            tableRows.forEach(row => {
                // Skip empty state rows
                if (row.querySelector('.empty-state')) return;
                
                const emailCell = row.cells[2]; // Email is the 3rd column (index 2)
                if (emailCell) {
                    const email = emailCell.textContent.trim();
                    
                    // Only include valid email addresses
                    if (email && 
                        email !== '-' && 
                        email !== '--' && 
                        email !== '' && 
                        isValidEmail(email)) {
                        visibleEmails.push(email);
                    }
                }
            });
            
            // Remove duplicates
            return [...new Set(visibleEmails)];
        }
        
        function isValidEmail(email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email);
        }
        
        function showCopyFeedback(button, message, type) {
            const originalText = button.querySelector('.text').textContent;
            const originalIcon = button.querySelector('.icon').textContent;
            const textSpan = button.querySelector('.text');
            const iconSpan = button.querySelector('.icon');
            
            // Update button appearance based on type
            if (type === 'success') {
                button.classList.add('copied');
                iconSpan.textContent = '✅';
                textSpan.textContent = message;
            } else if (type === 'warning') {
                button.style.background = '#ffc107';
                iconSpan.textContent = '⚠️';
                textSpan.textContent = message;
            } else if (type === 'error') {
                button.style.background = '#dc3545';
                iconSpan.textContent = '❌';
                textSpan.textContent = message;
            }
            
            // Reset button after 2 seconds
            setTimeout(() => {
                button.classList.remove('copied');
                button.style.background = '';
                iconSpan.textContent = originalIcon;
                textSpan.textContent = originalText;
            }, 2000);
        }

        function setupContactFilters() {
            const projects = [...new Set(contacts.flatMap(c => c.projects || []))].sort();
            const companies = [...new Set(contacts.map(c => c.company).filter(Boolean))].sort();
            const positions = [...new Set(contacts.map(c => c.position).filter(Boolean))].sort();

            const setupDropdown = (btnId, dropdownId, items, filterType) => {
                const btn = document.getElementById(btnId);
                const dropdown = document.getElementById(dropdownId);
                const optionsContainer = dropdown.querySelector('.filter-options');
                const searchInput = dropdown.querySelector('.filter-search-input');
                const clearBtn = dropdown.querySelector('.filter-clear-btn');
                
                // Function to render options
                const renderOptions = (filteredItems = items) => {
                    optionsContainer.innerHTML = filteredItems.map(item => `
                        <div class="filter-option">
                            <input type="checkbox" value="${item}" id="${filterType}-${item.replace(/\s+/g, '-')}">
                            <label for="${filterType}-${item.replace(/\s+/g, '-')}">${item}</label>
                        </div>
                    `).join('');
                };

                // Initial render
                renderOptions();

                // Search functionality
                searchInput.addEventListener('input', (e) => {
                    const searchTerm = e.target.value.toLowerCase();
                    const filteredItems = items.filter(item => 
                        item.toLowerCase().includes(searchTerm)
                    );
                    renderOptions(filteredItems);
                    
                    // Restore checked states
                    const selectedValues = getSelected(`${dropdownId}`);
                    selectedValues.forEach(value => {
                        const checkbox = optionsContainer.querySelector(`input[value="${value}"]`);
                        if (checkbox) checkbox.checked = true;
                    });
                });

                // Button click handler
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    
                    // Hide other dropdowns
                    document.querySelectorAll('.filter-dropdown').forEach(d => {
                        if (d.id !== dropdownId) {
                            d.classList.remove('active');
                            d.closest('.filter-group').querySelector('.filter-btn').classList.remove('active');
                        }
                    });
                    
                    // Toggle current dropdown
                    const isActive = dropdown.classList.contains('active');
                    if (isActive) {
                        dropdown.classList.remove('active');
                        btn.classList.remove('active');
                    } else {
                        dropdown.classList.add('active');
                        btn.classList.add('active');
                        // Focus search input when opening
                        setTimeout(() => searchInput.focus(), 100);
                    }
                });

                // Clear individual filter
                clearBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    optionsContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                        cb.checked = false;
                    });
                    updateFilterBadge(btn, 0);
                    applyContactFilters();
                });

                // Handle checkbox changes
                optionsContainer.addEventListener('change', (e) => {
                    if (e.target.type === 'checkbox') {
                        const selectedCount = optionsContainer.querySelectorAll('input:checked').length;
                        updateFilterBadge(btn, selectedCount);
                        applyContactFilters();
                    }
                });

                // Prevent dropdown from closing when clicking inside
                dropdown.addEventListener('click', (e) => {
                    e.stopPropagation();
                });
            };

            // Function to update filter badge
            const updateFilterBadge = (btn, count) => {
                const existingBadge = btn.querySelector('.filter-badge');
                if (existingBadge) {
                    existingBadge.remove();
                }
                
                if (count > 0) {
                    const badge = document.createElement('span');
                    badge.className = 'filter-badge';
                    badge.textContent = count;
                    btn.querySelector('.filter-text').after(badge);
                }
            };

            // Function to get selected values
            const getSelected = (dropdownId) => {
                const dropdown = document.getElementById(dropdownId);
                return Array.from(dropdown.querySelectorAll('input:checked')).map(cb => cb.value);
            };

            // Setup all dropdowns
            setupDropdown('project-filter-btn', 'project-filter-dropdown', projects, 'project');
            setupDropdown('company-filter-btn', 'company-filter-dropdown', companies, 'company');
            setupDropdown('position-filter-btn', 'position-filter-dropdown', positions, 'position');

            // Clear all filters functionality
            const clearAllBtn = document.querySelector('.clear-all-filters');
            if (clearAllBtn) {
                clearAllBtn.addEventListener('click', () => {
                    // Clear all checkboxes
                    document.querySelectorAll('.filter-dropdown input[type="checkbox"]').forEach(cb => {
                        cb.checked = false;
                    });
                    
                    // Clear all badges
                    document.querySelectorAll('.filter-badge').forEach(badge => badge.remove());
                    
                    // Clear search inputs
                    document.querySelectorAll('.filter-search-input').forEach(input => {
                        input.value = '';
                    });
                    
                    // Close all dropdowns
                    document.querySelectorAll('.filter-dropdown.active').forEach(dropdown => {
                        dropdown.classList.remove('active');
                        dropdown.closest('.filter-group').querySelector('.filter-btn').classList.remove('active');
                    });
                    
                    // Re-render options to show all items
                    setupContactFilters();
                    
                    // Apply filters (will show all contacts)
                    applyContactFilters();
                });
            }
        }

        function applyContactFilters() {
            const getSelected = (dropdownId) => {
                const dropdown = document.getElementById(dropdownId);
                if (!dropdown) return [];
                return Array.from(dropdown.querySelectorAll('.filter-options input:checked')).map(cb => cb.value);
            };

            const selectedProjects = getSelected('project-filter-dropdown');
            const selectedCompanies = getSelected('company-filter-dropdown');
            const selectedPositions = getSelected('position-filter-dropdown');
            const searchInput = document.getElementById('contact-search');
            const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';

            let filteredContacts = contacts.filter(contact => {
                const projectMatch = selectedProjects.length === 0 || (contact.projects && contact.projects.some(p => selectedProjects.includes(p)));
                const companyMatch = selectedCompanies.length === 0 || selectedCompanies.includes(contact.company);
                const positionMatch = selectedPositions.length === 0 || selectedPositions.includes(contact.position);
                return projectMatch && companyMatch && positionMatch;
            });

            if (searchTerm) {
                filteredContacts = filteredContacts.filter(contact => 
                    contact.name.toLowerCase().includes(searchTerm) ||
                    (contact.company || '').toLowerCase().includes(searchTerm) ||
                    (contact.position || '').toLowerCase().includes(searchTerm) ||
                    (contact.projects || []).some(project => project.toLowerCase().includes(searchTerm))
                );
            }

            renderContacts(filteredContacts);
            
            // Update filter button states based on results
            updateFilterButtonStates(filteredContacts.length, contacts.length);
        }
        
        function updateFilterButtonStates(filteredCount, totalCount) {
            const filterButtons = document.querySelectorAll('.filter-btn');
            const isFiltered = filteredCount < totalCount;
            
            filterButtons.forEach(btn => {
                if (isFiltered && btn.querySelector('.filter-badge')) {
                    btn.style.fontWeight = '600';
                } else {
                    btn.style.fontWeight = '500';
                }
            });
            
            // Update clear all button state
            const clearAllBtn = document.querySelector('.clear-all-filters');
            if (clearAllBtn) {
                clearAllBtn.style.opacity = isFiltered ? '1' : '0.6';
                clearAllBtn.disabled = !isFiltered;
            }
        }

        function renderContacts(filteredContacts = null) {
            const contactsToRender = filteredContacts || contacts;
            const tableBody = document.querySelector('#contactos-view .contacts-table tbody');
            if (!tableBody) return;

            tableBody.innerHTML = '';

            if (contactsToRender.length === 0) {
                const emptyRow = document.createElement('tr');
                emptyRow.innerHTML = `
                    <td colspan="7" class="empty-state">
                        No hay contactos disponibles
                    </td>
                `;
                tableBody.appendChild(emptyRow);
                return;
            }

            contactsToRender.forEach(contact => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${contact.name}</td>
                    <td>${contact.position}</td>
                    <td>${contact.email}</td>
                    <td>${contact.phone || '-'}</td>
                    <td>${contact.company}</td>
                    <td class="project-tags-cell">
                        ${renderProjectTags(contact.projects || [])}
                    </td>
                    <td class="actions">
                        <button class="edit-btn" data-id="${contact.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="delete-btn" data-id="${contact.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
            addContactCardListeners();
        }
    }

    // Add initialization to the section change handler
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const section = item.dataset.section;
            if (section === 'consulta') {
                initializeContacts();
            } else if (section === 'templates') {
                console.log('Templates section clicked - initializing email templates');
                setTimeout(() => {
                    initializeEmailTemplates();
                }, 100);
            }
        });
    });

        // Force add CSS immediately when script loads
    function forceAddEmailTemplatesCSS() {
        console.log('Force adding email templates CSS at script load time');
        if (!document.getElementById('email-templates-styles')) {
            addEmailTemplatesCSS();
        }
    }

    document.addEventListener('DOMContentLoaded', function() {
        console.log('DOM Content Loaded - starting initialization');
        
        // Force add CSS first thing
        forceAddEmailTemplatesCSS();
        
        // Initialize navigation
        initializeNavigation();
       
        // Initialize projects
        initializeProjects();
        
            // Initialize contacts
    initializeContacts();
    
    // Initialize Kanban
    initializeKanban();
    
    // Initialize Email Templates
    initializeEmailTemplates();
    
    // Set up template tab switching
    setupTemplateTabSwitching();
    
    // Check if email templates tab is initially active and re-initialize if needed
    const emailTemplatesTab = document.querySelector('[data-tab="email-templates"]');
    const emailTemplatesPane = document.getElementById('email-templates');
    if (emailTemplatesTab && emailTemplatesPane && emailTemplatesPane.classList.contains('active')) {
        console.log('Email Templates tab is initially active - ensuring proper initialization');
        setTimeout(() => {
            initializeEmailTemplates();
        }, 200);
    }
    
    // Additional fallback - try to apply CSS again after a delay
    setTimeout(() => {
        console.log('Fallback CSS application after 1 second');
        forceAddEmailTemplatesCSS();
    }, 1000);
        
        // Load initial state
        loadAndRenderState();
    });

    function initializeNavigation() {
        const sidebarLinks = document.querySelectorAll('.sidebar-link');
        const contentSections = document.querySelectorAll('.content-section');
        const consultaViews = document.querySelectorAll('.consulta-view');

        function showSection(sectionId) {
            contentSections.forEach(section => {
                section.style.display = section.id === sectionId ? 'block' : 'none';
            });

            // If we're showing the consulta section, show the first view by default
            if (sectionId === 'consulta') {
                showConsultaView('contactos-view');
            }
        }

        function showConsultaView(viewId) {
            consultaViews.forEach(view => {
                view.classList.toggle('active', view.id === viewId);
            });

            // If showing contacts view, refresh the contacts list
            if (viewId === 'contactos-view') {
                const contactsTable = document.querySelector('.contacts-table tbody');
                if (contactsTable) {
                    const contacts = JSON.parse(localStorage.getItem('contacts') || '[]');
                    const tableBody = document.querySelector('.contacts-table tbody');
                    if (tableBody) {
                        tableBody.innerHTML = '';
                        if (contacts.length === 0) {
                            tableBody.innerHTML = `
                                <tr>
                                    <td colspan="7" class="empty-state">
                                        No hay contactos disponibles
                                    </td>
                                </tr>
                            `;
                        } else {
                            contacts.forEach(contact => {
                                const row = document.createElement('tr');
                                row.innerHTML = `
                                    <td>${contact.name}</td>
                                    <td>${contact.position}</td>
                                    <td>${contact.email}</td>
                                    <td>${contact.phone || '-'}</td>
                                    <td>${contact.company}</td>
                                    <td class="project-tags-cell">
                                        ${(contact.projects || []).map(project => `
                                            <span class="project-tag">
                                                ${project}
                                            </span>
                                        `).join('')}
                                    </td>
                                    <td class="actions">
                                        <button class="edit-btn" data-id="${contact.id}">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button class="delete-btn" data-id="${contact.id}">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </td>
                                `;
                                tableBody.appendChild(row);
                            });
                        }
                    }
                }
            }
        }

        sidebarLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href').substring(1);
                showSection(targetId);

                sidebarLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
            });
        });

        // Show default section
        showSection('dashboard');
    }

    function createContactBox() {
        const contactBox = document.createElement('div');
        contactBox.className = 'contact-box';
        contactBox.innerHTML = `
            <div class="contact-box-header">
                <div class="contact-fields">
                    <input type="text" class="contact-name" placeholder="Nombre">
                    <input type="text" class="contact-position" placeholder="Cargo">
                    <input type="email" class="contact-email" placeholder="Email">
                    <input type="tel" class="contact-phone" placeholder="Teléfono">
                    <input type="text" class="contact-company" placeholder="Empresa">
                </div>
                <button class="delete-contact" title="Eliminar contacto">×</button>
            </div>
        `;

        // Add delete functionality
        const deleteBtn = contactBox.querySelector('.delete-contact');
        deleteBtn.addEventListener('click', () => {
            if (confirm('¿Está seguro de que desea eliminar este contacto?')) {
                contactBox.remove();
            }
        });

        return contactBox;
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

    function initializeProjects() {
        // ... existing code ...

        function createProjectTab(projectName, projectId) {
            // ... existing code ...

            // Initialize contacts section
            const contactsSection = document.createElement('div');
            contactsSection.className = 'project-contacts';
            projectContent.appendChild(contactsSection);

            initializeProjectContacts(projectContent);

            // ... rest of the existing code ...
        }

        // ... rest of the existing code ...
    }

    function renderProjectQuickInfo(projectId) {
        const project = projectsData[projectId];
        const tabPane = document.getElementById(projectId);
        if (!project || !tabPane) return;

        const contactsTable = tabPane.querySelector('.quick-info-table .contacts-table');
        if (contactsTable) {
            const addressRow = contactsTable.querySelector('.address-row');
            if (addressRow) {
                addressRow.textContent = project.quickInfoContacts?.address || 'Address: --';
            }

            const tbody = contactsTable.querySelector('tbody');
            
            // Always clear existing contact rows from the template
            const existingRows = tbody.querySelectorAll('tr:not(:first-child):not(:nth-child(2))');
            existingRows.forEach(row => row.remove());

            const contactsToRender = project.quickInfoContacts?.contacts;

            if (contactsToRender && contactsToRender.length > 0) {
                // Render saved contacts
                contactsToRender.forEach((contact, index, arr) => {
                    const newRow = document.createElement('tr');
                    const isLastRow = index === arr.length - 1;
                    if(isLastRow) newRow.classList.add('last-contact-row');
                    
                    newRow.innerHTML = `
                        <td contenteditable="true">${contact.position || ''}</td>
                        <td contenteditable="true">${contact.name || ''}</td>
                        <td contenteditable="true">${contact.email || ''}</td>
                        <td contenteditable="true">${contact.phone || ''}</td>
                        <td class="action-column">
                            <button class="delete-row-btn" title="Delete row">🗑️</button>
                            ${isLastRow ? '<button class="add-row-btn" title="Add new row">➕</button>' : ''}
                        </td>
                    `;
                    tbody.appendChild(newRow);
                });
            } else {
                // If no contacts, create one empty row to start with
                const newRow = document.createElement('tr');
                newRow.classList.add('last-contact-row');
                newRow.innerHTML = `
                    <td contenteditable="true"></td>
                    <td contenteditable="true"></td>
                    <td contenteditable="true"></td>
                    <td contenteditable="true"></td>
                    <td class="action-column">
                        <button class="delete-row-btn" title="Delete row">🗑️</button>
                        <button class="add-row-btn" title="Add new row">➕</button>
                    </td>
                `;
                tbody.appendChild(newRow);
            }
        }
    }

    function pullContactsFromProjects() {
        // Get existing contacts from localStorage
        let directoryContacts = JSON.parse(localStorage.getItem('contacts') || '[]');

        // Iterate over all projects in projectsData
        Object.values(projectsData).forEach(project => {
            if (!project || !project.name) return; // Skip if project is invalid

            const projectName = project.name;
            const projectQuickContacts = project.quickInfoContacts?.contacts || [];

            projectQuickContacts.forEach(infoContact => {
                // Skip placeholder/empty contacts
                const contactName = infoContact.name?.trim();
                const contactEmail = infoContact.email?.trim();

                if (!contactName || contactName === '--' || contactName === '') {
                    return;
                }

                // Find if contact already exists in the directory (by email preferably)
                let existingContact = null;
                if (contactEmail && contactEmail !== '--' && contactEmail !== '') {
                    existingContact = directoryContacts.find(dirContact => dirContact.email === contactEmail);
                }
                
                // If not found by email, try by name (less reliable)
                if (!existingContact) {
                     existingContact = directoryContacts.find(dirContact => dirContact.name === contactName);
                }

                if (existingContact) {
                    // Contact exists, just ensure it's linked to this project
                    if (!existingContact.projects) {
                        existingContact.projects = [];
                    }
                    if (!existingContact.projects.includes(projectName)) {
                        existingContact.projects.push(projectName);
                    }
                } else {
                    // Contact doesn't exist, create a new one
                    const newContact = {
                        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                        name: infoContact.name,
                        position: infoContact.position,
                        email: infoContact.email,
                        phone: infoContact.phone,
                        company: '', // company is not in quick-info-table
                        projects: [projectName]
                    };
                    directoryContacts.push(newContact);
                }
            });
        });

        // Update the global contacts array, save, and refresh the view
        contacts = directoryContacts;
        saveContacts();
        renderContacts();
        alert('Contacts directory has been synced with project info.');
    }

    // Template Modal Functions
    function showTemplateModal(templateData = null) {
        console.log('Showing template modal', templateData ? 'for editing' : 'for creation');
        
        // Create modal if it doesn't exist
        let modal = document.getElementById('template-modal');
        if (!modal) {
            modal = createTemplateModal();
            document.body.appendChild(modal);
        }
        
        // Populate form if editing
        if (templateData) {
            populateTemplateForm(templateData);
            document.getElementById('template-modal-title').textContent = 'Edit Template';
            document.getElementById('template-submit-btn').textContent = 'Update Template';
            modal.setAttribute('data-editing', templateData.id);
        } else {
            clearTemplateForm();
            document.getElementById('template-modal-title').textContent = 'Create New Template';
            document.getElementById('template-submit-btn').textContent = 'Create Template';
            modal.removeAttribute('data-editing');
        }
        
        // Show modal
        modal.style.display = 'flex';
        
        // Focus on template name field
        setTimeout(() => {
            document.getElementById('template-name').focus();
        }, 100);
    }
    
    function hideTemplateModal() {
        const modal = document.getElementById('template-modal');
        if (modal) {
            modal.style.display = 'none';
            clearTemplateForm();
        }
    }
    
    function createTemplateModal() {
        const modal = document.createElement('div');
        modal.id = 'template-modal';
        modal.className = 'template-modal';
        
        modal.innerHTML = `
            <div class="template-modal-content">
                <div class="template-modal-header">
                    <h3 id="template-modal-title">Create New Template</h3>
                    <button class="template-modal-close" onclick="hideTemplateModal()">&times;</button>
                </div>
                <form class="template-form" id="template-form">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="template-name">Template Name *</label>
                            <input type="text" id="template-name" name="name" required placeholder="Enter template name">
                        </div>
                        <div class="form-group">
                            <label for="template-category">Category *</label>
                            <select id="template-category" name="category" required>
                                <option value="">Select category...</option>
                                <option value="meeting-request">Meeting Request</option>
                                <option value="meeting-minutes">Meeting Minutes</option>
                                <option value="availability-request">Availability Request</option>
                                <option value="project-kickoff">Project Kickoff</option>
                                <option value="progress-update">Progress Update</option>
                                <option value="milestone-complete">Milestone Complete</option>
                                <option value="project-closure">Project Closure</option>
                                <option value="follow-up">Follow Up</option>
                                <option value="status-request">Status Request</option>
                                <option value="reminder">Reminder</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="template-subject">Subject *</label>
                        <input type="text" id="template-subject" name="subject" required placeholder="Enter email subject">
                    </div>
                    <div class="form-group">
                        <label for="template-body">Body *</label>
                        <textarea id="template-body" name="body" required rows="12" placeholder="Enter email body content..."></textarea>
                    </div>
                    <div class="template-modal-footer">
                        <button type="button" class="btn-secondary" onclick="hideTemplateModal()">Cancel</button>
                        <button type="submit" id="template-submit-btn" class="btn-primary">Create Template</button>
                    </div>
                </form>
            </div>
        `;
        
        // Add event listeners
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                hideTemplateModal();
            }
        });
        
        const form = modal.querySelector('#template-form');
        form.addEventListener('submit', handleTemplateSubmit);
        
        // Add modal CSS
        addTemplateModalCSS();
        
        return modal;
    }
    
    function addTemplateModalCSS() {
        if (document.getElementById('template-modal-styles')) {
            return;
        }
        
        const style = document.createElement('style');
        style.id = 'template-modal-styles';
        style.textContent = `
            .template-modal {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.5);
                z-index: 1000;
                align-items: center;
                justify-content: center;
                backdrop-filter: blur(3px);
            }
            
            .template-modal-content {
                background: white;
                border-radius: 12px;
                width: 90%;
                max-width: 600px;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
                animation: modalSlideIn 0.3s ease-out;
            }
            
            @keyframes modalSlideIn {
                from {
                    opacity: 0;
                    transform: translateY(-20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            .template-modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 25px 30px 20px;
                border-bottom: 1px solid #e9ecef;
            }
            
            .template-modal-header h3 {
                margin: 0;
                font-size: 24px;
                font-weight: 600;
                color: #333;
            }
            
            .template-modal-close {
                background: none;
                border: none;
                font-size: 28px;
                color: #999;
                cursor: pointer;
                padding: 0;
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                transition: all 0.2s ease;
            }
            
            .template-modal-close:hover {
                background: #f8f9fa;
                color: #666;
            }
            
            .template-form {
                padding: 30px;
            }
            
            .form-row {
                display: flex;
                gap: 20px;
                margin-bottom: 20px;
            }
            
            .form-row .form-group {
                flex: 1;
            }
            
            .form-group {
                margin-bottom: 20px;
            }
            
            .form-group label {
                display: block;
                margin-bottom: 8px;
                font-weight: 600;
                color: #333;
                font-size: 14px;
            }
            
            .form-group input,
            .form-group select,
            .form-group textarea {
                width: 100%;
                padding: 12px 16px;
                border: 2px solid #e1e8ed;
                border-radius: 8px;
                font-size: 14px;
                transition: border-color 0.2s ease;
                font-family: inherit;
                box-sizing: border-box;
            }
            
            .form-group input:focus,
            .form-group select:focus,
            .form-group textarea:focus {
                outline: none;
                border-color: #007bff;
                box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
            }
            
            .form-group textarea {
                resize: vertical;
                min-height: 120px;
                line-height: 1.5;
            }
            
            .template-modal-footer {
                display: flex;
                gap: 12px;
                justify-content: flex-end;
                padding-top: 20px;
                border-top: 1px solid #e9ecef;
                margin-top: 20px;
            }
            
            .btn-primary, .btn-secondary {
                padding: 12px 24px;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
                border: none;
            }
            
            .btn-primary {
                background: #007bff;
                color: white;
            }
            
            .btn-primary:hover {
                background: #0056b3;
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(0, 123, 255, 0.25);
            }
            
            .btn-secondary {
                background: #6c757d;
                color: white;
            }
            
            .btn-secondary:hover {
                background: #5a6268;
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(108, 117, 125, 0.25);
            }
        `;
        document.head.appendChild(style);
    }
    
    function populateTemplateForm(templateData) {
        document.getElementById('template-name').value = templateData.name || '';
        document.getElementById('template-category').value = templateData.category || '';
        document.getElementById('template-subject').value = templateData.subject || '';
        document.getElementById('template-body').value = templateData.body || '';
    }
    
    function clearTemplateForm() {
        document.getElementById('template-form').reset();
    }
    
    function handleTemplateSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const templateData = {
            name: formData.get('name').trim(),
            category: formData.get('category'),
            subject: formData.get('subject').trim(),
            body: formData.get('body').trim()
        };
        
        // Validate required fields
        if (!templateData.name || !templateData.category || !templateData.subject || !templateData.body) {
            alert('Please fill in all required fields');
            return;
        }
        
        // Check if editing or creating
        const modal = document.getElementById('template-modal');
        const editingId = modal.getAttribute('data-editing');
        
        if (editingId) {
            updateEmailTemplate(editingId, templateData);
        } else {
            createEmailTemplate(templateData);
        }
        
        hideTemplateModal();
    }
    
    function createEmailTemplate(templateData) {
        // Generate unique ID
        const id = Date.now().toString();
        
        const template = {
            id: id,
            name: templateData.name,
            category: templateData.category,
            subject: templateData.subject,
            body: templateData.body,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Save to localStorage
        const savedTemplates = localStorage.getItem('emailTemplates');
        const templates = savedTemplates ? JSON.parse(savedTemplates) : [];
        templates.push(template);
        localStorage.setItem('emailTemplates', JSON.stringify(templates));
        
        // Re-render templates
        renderEmailTemplates(templates);
        updateCategoryCounts();
        
        console.log('Template created:', template);
    }
    
    function updateEmailTemplate(templateId, templateData) {
        const savedTemplates = localStorage.getItem('emailTemplates');
        if (!savedTemplates) return;
        
        const templates = JSON.parse(savedTemplates);
        const templateIndex = templates.findIndex(t => t.id === templateId);
        
        if (templateIndex !== -1) {
            templates[templateIndex] = {
                ...templates[templateIndex],
                name: templateData.name,
                category: templateData.category,
                subject: templateData.subject,
                body: templateData.body,
                updatedAt: new Date().toISOString()
            };
            
            localStorage.setItem('emailTemplates', JSON.stringify(templates));
            renderEmailTemplates(templates);
            updateCategoryCounts();
            
            console.log('Template updated:', templates[templateIndex]);
        }
    }
});