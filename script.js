document.addEventListener('DOMContentLoaded', () => {
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
    // Check for either "Nuevo Comentario" or "Nuevo" (in case the header is split)
    const result = /nuevo\s*comentario/i.test(headerText) || headerText.trim().toLowerCase() === 'nuevo';
    console.log('Checking if column is nuevo comentario:', headerText, result);
    return result;
};

const isEvidenciaColumn = (headerText) => headerText.trim().toLowerCase() === 'evidencia';

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
        document.querySelectorAll('.project-tab').forEach(btn => btn.remove());
        document.querySelectorAll('.project-pane').forEach(pane => pane.remove());

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

        renderTable(mainTemplateTable, currentTemplateHeaders, currentTemplateRows, true);

        Object.keys(projectsData).forEach(projectId => {
            const project = projectsData[projectId];
            if (!project) return;

            const tabButton = document.createElement('button');
            tabButton.classList.add('tab-button', 'project-tab');
            tabButton.dataset.tab = projectId;
            tabButton.textContent = project.name || `Project ${projectId.split('-')[1]}`;
            
            // Add delete icon
            const deleteIcon = document.createElement('span');
            deleteIcon.classList.add('delete-tab-icon');
            deleteIcon.innerHTML = '&#128465;'; // Trash can emoji
            tabButton.appendChild(deleteIcon);

            tabsContainer.insertBefore(tabButton, addProjectButton);

            const tabPane = document.createElement('div');
            tabPane.id = projectId;
            tabPane.classList.add('tab-pane', 'project-pane');
            tabPane.innerHTML = `
                <h2 class="project-name-editable" contenteditable="true" data-project-id="${projectId}">${project.name || `Project ${projectId.split('-')[1]}`}</h2>
                <table class="project-table">
                    <thead></thead>
                    <tbody></tbody>
                </table>
            `;
            tabContentContainer.appendChild(tabPane);

            const projectTable = tabPane.querySelector('.project-table');
            if (project.headers && project.content) {
                renderTable(projectTable, project.headers, project.content, false);
            }
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
                } else if (isMainTemplate && isEvidenciaColumn(header)) {
                    // Evidencia column in main template - add checkbox
                    td.classList.add('evidencia-cell');
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.className = 'evidencia-checkbox';
                    checkbox.checked = rowData[colIndex] === 'true';
                    
                    // Store the current row index directly from the rows iteration
                    const currentRowIndex = rows.indexOf(rowData);
                    
                    checkbox.addEventListener('change', (e) => {
                        const rowIdx = parseInt(td.dataset.rowIndex);
                        if (rowIdx >= 0 && rowIdx < currentTemplateRows.length) {
                            // Update the data model
                            currentTemplateRows[rowIdx][colIndex] = e.target.checked.toString();
                            saveState();
                            
                            // Update all project tables to reflect the change
                            updateAllProjectTables();
                        }
                    });
                    
                    td.appendChild(checkbox);
                } else if (isEvidenciaColumn(header) && !isMainTemplate) {
                    // Evidencia column in project tabs
                    td.classList.add('evidencia-cell');
                    
                    // Get the current row index directly from the rows iteration
                    const currentRowIndex = rows.indexOf(rowData);
                    
                    // Get the corresponding value from main template safely
                    let mainTemplateValue = '';
                    if (currentRowIndex >= 0 && currentRowIndex < currentTemplateRows.length) {
                        mainTemplateValue = currentTemplateRows[currentRowIndex][colIndex];
                    }
                    
                    // Create container for content
                    const contentDiv = document.createElement('div');
                    contentDiv.className = 'evidencia-content';

                    // Function to update the cell's appearance based on attachment status
                    const updateCellAppearance = (hasAttachment) => {
                        if (mainTemplateValue === 'true') {
                            td.classList.add('evidencia-required');
                            if (hasAttachment) {
                                td.classList.add('has-attachment');
                            } else {
                                td.classList.remove('has-attachment');
                            }
                        }
                        
                        // Toggle between attach and delete icons
                        if (hasAttachment) {
                            attachButton.style.display = 'none';
                            deleteButton.style.display = '';
                        } else {
                            attachButton.style.display = '';
                            deleteButton.style.display = 'none';
                        }
                    };

                    // Create attach button (clip icon)
                    const attachButton = document.createElement('button');
                    attachButton.className = 'attach-file-icon';
                    attachButton.title = 'Attach file';
                    attachButton.textContent = '📎';

                    // Create delete button (X icon)
                    const deleteButton = document.createElement('button');
                    deleteButton.className = 'delete-file-icon';
                    deleteButton.title = 'Remove file';
                    deleteButton.textContent = '❌';
                    deleteButton.style.display = 'none';

                    // Function to upload file to server
                    const uploadFile = async (file) => {
                        const formData = new FormData();
                        formData.append('file', file);
                        
                        try {
                            const response = await fetch('http://localhost:3000/upload', {
                                method: 'POST',
                                body: formData
                            });
                            
                            if (!response.ok) {
                                throw new Error('Upload failed');
                            }
                            
                            return await response.json();
                        } catch (error) {
                            console.error('Error uploading file:', error);
                            alert('Failed to upload file. Please try again.');
                            return null;
                        }
                    };

                    // Function to open file using server
                    const openFile = async (filePath) => {
                        try {
                            const response = await fetch('http://localhost:3000/open-file', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({ path: filePath })
                            });
                            
                            if (!response.ok) {
                                throw new Error('Failed to open file');
                            }
                        } catch (error) {
                            console.error('Error opening file:', error);
                            alert('Failed to open file. Please check if the file exists.');
                        }
                    };

                    // Function to create a file link
                    const createFileLink = (fileName, filePath) => {
                        const fileLink = document.createElement('a');
                        fileLink.textContent = fileName;
                        fileLink.title = `Click to open: ${filePath}`;
                        fileLink.href = '#';
                        fileLink.onclick = (e) => {
                            e.preventDefault();
                            openFile(filePath);
                        };
                        return fileLink;
                    };

                    // Set up file input
                    const fileInput = document.createElement('input');
                    fileInput.type = 'file';
                    fileInput.style.display = 'none';
                    
                    fileInput.addEventListener('change', async (event) => {
                        if (event.target.files && event.target.files[0]) {
                            const file = event.target.files[0];
                            const uploadResult = await uploadFile(file);
                            
                            if (uploadResult) {
                                // Store the file information in the data model
                                rowData[colIndex] = JSON.stringify({
                                    name: uploadResult.name,
                                    path: uploadResult.path
                                });
                                saveState();
                                
                                // Update the display
                                const pathDiv = contentDiv.querySelector('.file-path') || document.createElement('div');
                                pathDiv.className = 'file-path';
                                const fileLink = createFileLink(uploadResult.name, uploadResult.path);
                                pathDiv.innerHTML = '';
                                pathDiv.appendChild(fileLink);
                                if (!contentDiv.contains(pathDiv)) {
                                    contentDiv.appendChild(pathDiv);
                                }
                                
                                // Update cell appearance
                                updateCellAppearance(true);
                            }
                        }
                    });

                    // Set up drag and drop
                    contentDiv.addEventListener('dragover', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        contentDiv.style.backgroundColor = 'rgba(0, 123, 255, 0.1)';
                    });

                    contentDiv.addEventListener('dragleave', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        contentDiv.style.backgroundColor = '';
                    });

                    contentDiv.addEventListener('drop', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        contentDiv.style.backgroundColor = '';
                        
                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                            fileInput.files = e.dataTransfer.files;
                        }
                    });

                    attachButton.addEventListener('click', () => {
                        fileInput.click();
                    });

                    // Handle file deletion
                    deleteButton.addEventListener('click', () => {
                        // Clear the file data
                        rowData[colIndex] = '';
                        saveState();
                        
                        // Clear the display
                        const pathDiv = contentDiv.querySelector('.file-path');
                        if (pathDiv) {
                            pathDiv.remove();
                        }
                        
                        // Update cell appearance
                        updateCellAppearance(false);
                    });

                    // Check if we have stored file data and update initial state
                    let hasExistingFile = false;
                    if (rowData[colIndex]) {
                        try {
                            const fileData = JSON.parse(rowData[colIndex]);
                            if (fileData && fileData.name) {
                                const pathDiv = document.createElement('div');
                                pathDiv.className = 'file-path';
                                const fileLink = createFileLink(fileData.name, fileData.path || fileData.name);
                                pathDiv.appendChild(fileLink);
                                contentDiv.appendChild(pathDiv);
                                hasExistingFile = true;
                            }
                        } catch (e) {
                            // Handle legacy format (plain string)
                            if (typeof rowData[colIndex] === 'string' && rowData[colIndex].trim()) {
                                const pathDiv = document.createElement('div');
                                pathDiv.className = 'file-path';
                                const fileLink = createFileLink(rowData[colIndex], rowData[colIndex]);
                                pathDiv.appendChild(fileLink);
                                contentDiv.appendChild(pathDiv);
                                hasExistingFile = true;
                            }
                        }
                    }
                    
                    // Update initial cell appearance
                    updateCellAppearance(hasExistingFile);

                    td.appendChild(contentDiv);
                    td.appendChild(attachButton);
                    td.appendChild(deleteButton);
                    td.appendChild(fileInput);
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
                { id: 'edit-col-header', text: '✏️', title: 'Edit Column Header' } // <<< NEW ICON
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

        contextMenu.style.left = `${x}px`;
        contextMenu.style.top = `${y}px`;
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
            case 'edit-col-header': // <<< NEW CASE
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
                break; // End of NEW CASE
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
        });
        applySelectionStyles();
    }

    // Initial render of the main template table (initially not editable)
    loadAndRenderState();

    // --- Event Listeners ---

    // Tab switching logic
    tabsContainer.addEventListener('click', (event) => {
        const deleteIcon = event.target.closest('.delete-tab-icon');
        const tabButton = event.target.closest('.tab-button');

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
                
                // If the deleted tab was active, switch to the main template
                if (tabButton.classList.contains('active')) {
                    document.querySelector('.tab-button[data-tab="main-template"]').click();
                }
                
                saveState();
                console.log(`Project ${projectIdToDelete} deleted.`);
            }
            return; // Stop further processing
        }

        if (tabButton && !tabButton.classList.contains('add-tab-button')) {
            document.querySelector('.tab-button.active')?.classList.remove('active');
            document.querySelector('.tab-pane.active')?.classList.remove('active');

            tabButton.classList.add('active');
            const targetTabId = tabButton.dataset.tab;
            document.getElementById(targetTabId).classList.add('active');
            clearSelectionAndHideMenu();
        }
    });

    // Add Project button logic
    addProjectButton.addEventListener('click', () => {
        projectCount++;
        const projectId = `project-${projectCount}`;
        const initialProjectName = `Project ${projectCount}`;

        const newTabButton = document.createElement('button');
        newTabButton.classList.add('tab-button', 'project-tab');
        newTabButton.dataset.tab = projectId;
        newTabButton.textContent = initialProjectName;

        // Add delete icon
        const deleteIcon = document.createElement('span');
        deleteIcon.classList.add('delete-tab-icon');
        deleteIcon.innerHTML = '&#128465;'; // Trash can emoji
        newTabButton.appendChild(deleteIcon);

        tabsContainer.insertBefore(newTabButton, addProjectButton);

        const newTabPane = document.createElement('div');
        newTabPane.id = projectId;
        newTabPane.classList.add('tab-pane', 'project-pane');
        newTabPane.innerHTML = `
            <h2 class="project-name-editable" contenteditable="true" data-project-id="${projectId}">${initialProjectName}</h2>
            <table class="project-table">
                <thead><tr></tr></thead>
                <tbody></tbody>
            </table>
        `;
        tabContentContainer.appendChild(newTabPane);

        // Initialize project data with a complete copy of the main template's current state
        const newProjectContent = currentTemplateRows.map(row => [...row]);

        projectsData[projectId] = {
            headers: [...currentTemplateHeaders],
            content: newProjectContent,
            name: initialProjectName // Store the name
        };
        
        // Render the new project table
        const newProjectTable = newTabPane.querySelector('.project-table');
        renderTable(newProjectTable, projectsData[projectId].headers, projectsData[projectId].content, false);

        // Automatically switch to the newly created tab
        newTabButton.click();
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
    // This listener correctly updates currentTemplateRows.
    document.addEventListener('input', (event) => {
        if (event.target.tagName === 'TD' && event.target.closest('.project-table')) {
            const table = event.target.closest('.project-table');
            const tabPane = event.target.closest('.tab-pane');
            const projectId = tabPane.id;
            
            const rowIndex = Array.from(event.target.parentNode.parentNode.children).indexOf(event.target.parentNode);
            // If it's the main template, account for the row header TH (first child)
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
            } else if (projectId !== 'main-template' && projectsData[projectId]) {
                // Update the stored data for this specific project (independent content)
                if (projectsData[projectId].content[rowIndex] && projectsData[projectId].content[rowIndex][colIndex] !== undefined) {
                    projectsData[projectId].content[rowIndex][colIndex] = event.target.textContent;
                    console.log(`Project ${projectId} cell [${rowIndex}][${colIndex}] updated. Project Data:`, projectsData[projectId].content);
                    saveState();
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

        let dataModel;
        if (projectId === 'main-template') {
            dataModel = currentTemplateRows;
        } else if (projectsData[projectId]) {
            dataModel = projectsData[projectId].content;
        }

        if (dataModel && dataModel[rowIndex] && dataModel[rowIndex][colIndex] !== undefined) {
            dataModel[rowIndex][colIndex] = dateString;
            contentDiv.textContent = dateString;
            console.log(`Date updated for [${projectId}, R${rowIndex}, C${colIndex}] to: ${dateString}`);
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

        let dataModel;
        if (projectId === 'main-template') {
            dataModel = currentTemplateRows;
        } else if (projectsData[projectId]) {
            dataModel = projectsData[projectId].content;
        }

        if (dataModel && dataModel[rowIndex] && dataModel[rowIndex][colIndex] !== undefined) {
            dataModel[rowIndex][colIndex] = newStatus;
            statusCell.innerHTML = renderStatusCell(newStatus);
            statusCell.setAttribute('data-status', newStatus);
            console.log(`Status updated for [${projectId}, R${rowIndex}, C${colIndex}] to: ${newStatus}`);
            saveState();
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
        if (event.target.closest('.status-option')) {
            const statusOption = event.target.closest('.status-option');
            const newStatus = statusOption.getAttribute('data-status');
            
            if (currentStatusCell) {
                updateStatusCell(currentStatusCell, newStatus);
                hideStatusSelectorModal();
            }
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

    function createEvidenciaCell(isMain = false) {
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
                toggleContainer.classList.toggle('visible', this.checked);
                updateProjectCellsVisibility();
            });
            
            toggleInput.addEventListener('change', function() {
                const projectCells = getCorrespondingProjectCells(cell);
                projectCells.forEach(projectCell => {
                    projectCell.classList.toggle('text-mode', this.checked);
                    updateEvidenciaContent(projectCell, this.checked);
                });
            });
            
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
            
            const attachButton = document.createElement('button');
            attachButton.innerHTML = '📎';
            attachButton.classList.add('attach-button');
            
            const fileNameDisplay = document.createElement('span');
            fileNameDisplay.classList.add('file-name');
            
            const deleteButton = document.createElement('button');
            deleteButton.innerHTML = '✕';
            deleteButton.classList.add('delete-button');
            deleteButton.style.display = 'none';
            
            // Text input element
            const textInput = document.createElement('input');
            textInput.type = 'text';
            textInput.classList.add('evidence-text');
            textInput.style.display = 'none';
            
            content.appendChild(fileInput);
            content.appendChild(attachButton);
            content.appendChild(fileNameDisplay);
            content.appendChild(deleteButton);
            content.appendChild(textInput);
            
            // Event listeners for file attachment
            attachButton.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', handleFileSelection);
            deleteButton.addEventListener('click', handleFileDelete);
            
            // Event listener for text input
            textInput.addEventListener('input', function() {
                const hasText = this.value.trim() !== '';
                cell.classList.toggle('has-text', hasText);
            });
            
            cell.appendChild(content);
            
            // Add drag and drop handlers
            cell.addEventListener('dragover', handleDragOver);
            cell.addEventListener('drop', handleFileDrop);
        }
        
        return cell;
    }

    function updateEvidenciaContent(cell, isTextMode) {
        const content = cell.querySelector('.evidencia-content');
        if (!content) return;
        
        const fileElements = [
            content.querySelector('.attach-button'),
            content.querySelector('.file-name'),
            content.querySelector('.delete-button')
        ];
        
        const textInput = content.querySelector('.evidence-text');
        
        fileElements.forEach(el => {
            if (el) el.style.display = isTextMode ? 'none' : '';
        });
        
        if (textInput) {
            textInput.style.display = isTextMode ? '' : 'none';
        }
    }

    function getCorrespondingProjectCells(mainCell) {
        const mainRow = mainCell.parentElement;
        const mainTable = mainRow.parentElement;
        const rowIndex = Array.from(mainTable.children).indexOf(mainRow);
        
        return Array.from(document.querySelectorAll('.project-table'))
            .map(table => table.rows[rowIndex]?.querySelector('.evidencia-cell'))
            .filter(cell => cell);
    }

    function updateProjectCellsVisibility() {
        const mainCells = document.querySelectorAll('.main-table .evidencia-cell');
        mainCells.forEach(mainCell => {
            const checkbox = mainCell.querySelector('.evidencia-checkbox');
            const isRequired = checkbox.checked;
            
            const projectCells = getCorrespondingProjectCells(mainCell);
            projectCells.forEach(cell => {
                cell.classList.toggle('evidencia-required', isRequired);
            });
        });
    }
});