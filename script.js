document.addEventListener('DOMContentLoaded', () => {
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

    // --- State Management ---
    function saveState() {
        const state = {
            headers: currentTemplateHeaders,
            rows: currentTemplateRows,
            projects: projectsData,
            projectCount: projectCount
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

        renderTable(mainTemplateTable, currentTemplateHeaders, currentTemplateRows, true);

        Object.keys(projectsData).forEach(projectId => {
            const project = projectsData[projectId];
            if (!project) return;

            const tabButton = document.createElement('button');
            tabButton.classList.add('tab-button', 'project-tab');
            tabButton.dataset.tab = projectId;
            tabButton.textContent = project.name || `Project ${projectId.split('-')[1]}`;
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
                td.textContent = rowData[colIndex] !== undefined ? rowData[colIndex] : ''; // Handle missing data for new columns
                
                // Determine if the cell should be editable
                // Cells in the main template are editable only if isEditMode is true
                // In project tabs, the specified nonEditableColumns are not editable
                const isEditable = isMainTemplate ? isEditMode : !nonEditableColumns.includes(header);
                td.setAttribute('contenteditable', isEditable);
                
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });

        // This was the source of an infinite loop in certain scenarios.
        // It's not needed here as styles are applied via other calls.
        // applySelectionStyles();
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
        console.log("updateAllProjectTables triggered.");
        console.log("Main template headers (source):", currentTemplateHeaders);
        console.log("Main template rows (source):", currentTemplateRows);
        Object.keys(projectsData).forEach(projectId => {
            const project = projectsData[projectId];
            console.log(`  - Processing project: ${projectId}. Project's old content:`, project.content);
            const projectTable = document.getElementById(projectId).querySelector('.project-table');
            
            const newRows = currentTemplateRows.map((mainTemplateRow, rowIndex) => { // Iterate over main template rows
                const newRow = [];
                currentTemplateHeaders.forEach((header, colIndex) => {
                    if (nonEditableColumns.includes(header)) {
                        // For non-editable columns, always take data from the current main template.
                        newRow.push(mainTemplateRow[colIndex] !== undefined ? mainTemplateRow[colIndex] : '');
                    } else {
                        // For editable columns, preserve old project data if column and row existed
                        const oldRow = project.content[rowIndex];
                        const oldHeaderIndex = project.headers.indexOf(header);

                        if (oldRow && oldHeaderIndex !== -1 && oldRow[oldHeaderIndex] !== undefined) {
                            newRow.push(oldRow[oldHeaderIndex]);
                        } else {
                            // New editable column or new row, add empty data
                            newRow.push(''); 
                        }
                    }
                });
                return newRow;
            });
            project.content = newRows; // Update the project's stored content
            project.headers = [...currentTemplateHeaders]; // Update project's stored headers

            renderTable(projectTable, project.headers, project.content, false);
        });
        applySelectionStyles(); // Apply selection styles after all tables are updated
    }

    // Initial render of the main template table (initially not editable)
    loadAndRenderState();

    // --- Event Listeners ---

    // Tab switching logic
    tabsContainer.addEventListener('click', (event) => {
        if (event.target.classList.contains('tab-button') && !event.target.classList.contains('add-tab-button')) {
            document.querySelector('.tab-button.active')?.classList.remove('active');
            document.querySelector('.tab-pane.active')?.classList.remove('active');

            event.target.classList.add('active');
            const targetTabId = event.target.dataset.tab;
            document.getElementById(targetTabId).classList.add('active');
            clearSelectionAndHideMenu(); // Clear selection when switching tabs
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

            if (projectId === 'main-template' && isEditMode) { // Only update if in edit mode
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
});