// Templates functionality module
import { state, saveState } from './state.js';
import { showNotification, createEvidenciaCell, updateProjectCellsVisibility } from './ui.js';

// Template state variables (use state object instead of local variables)
let selectedRowIndex = -1;
let selectedColIndex = -1;
let contextMenuType = null;
let contextMenuTargetIndex = -1;

// Default template data based on the reference implementation
const defaultTemplateData = [
    {"ID": 1, "Fase": "Requisitos Previos", "Milestone": "Contacto Inicial", "Actividad": "Integracion de equipo de trabajo/asignacion de recurso humano", "Duracion": 5, "Fecha Esperada": "19-Oct-24", "Dependencia": "", "Responsable": "Pablo", "Status": "completo", "Comentario": "", "Nuevo": "", "Evidencia": ""},
    {"ID": 2, "Fase": "Requisitos Previos", "Milestone": "Contacto Inicial", "Actividad": "Crear canales de comunicacion (grupo WA)", "Duracion": 1, "Fecha Esperada": "24-Oct-24", "Dependencia": 1, "Responsable": "Pablo", "Status": "completo", "Comentario": "", "Nuevo": "", "Evidencia": ""},
    {"ID": 3, "Fase": "Requisitos Previos", "Milestone": "Perfiles de Telefonia", "Actividad": "PT-Preparacion de presentacion", "Duracion": 1, "Fecha Esperada": "25-Oct-24", "Dependencia": 2, "Responsable": "Pablo", "Status": "completo", "Comentario": "", "Nuevo": "", "Evidencia": ""},
    {"ID": 4, "Fase": "Requisitos Previos", "Milestone": "Perfiles de Telefonia", "Actividad": "PT-Requerimiento de sesion", "Duracion": 1, "Fecha Esperada": "25-Oct-24", "Dependencia": 2, "Responsable": "Pablo", "Status": "completo", "Comentario": "", "Nuevo": "", "Evidencia": ""},
    {"ID": 5, "Fase": "Requisitos Previos", "Milestone": "Perfiles de Telefonia", "Actividad": "PT-Acuerdo de fecha y hora", "Duracion": 2, "Fecha Esperada": "26-Oct-24", "Dependencia": 4, "Responsable": "ATI", "Status": "completo", "Comentario": "", "Nuevo": "", "Evidencia": ""}
];

// Column type detection functions
const isDateColumn = (headerText) => /fecha|date/i.test(headerText);
const isStatusColumn = (headerText) => /status|estado/i.test(headerText);
const isCommentColumn = (headerText) => /^comentario$/i.test(headerText.trim());
const isNewCommentColumn = (headerText) => /nuevo\s*comentario/i.test(headerText) || headerText.trim().toLowerCase() === 'nuevo';
const isEvidenciaColumn = (headerText) => headerText.trim().toLowerCase() === 'evidencia';
const isDurationColumn = (headerText) => /^duracion$|^dias$/i.test(headerText.trim());
const isDependencyColumn = (headerText) => /^dependencia$|^dep\.?$/i.test(headerText.trim());
const isExpectedDateColumn = (headerText) => /^fecha\s*esperada$/i.test(headerText.trim());

// Non-editable columns in project tabs
const nonEditableColumns = ['ID', 'Fase', 'Milestone', 'Actividad'];

// Initialize templates system
export function initializeTemplates() {
    console.log('Initializing Templates...');
    
    // Initialize template data if not exists
    if (!state.currentTemplateHeaders) {
        state.currentTemplateHeaders = Object.keys(defaultTemplateData[0]);
        state.currentTemplateRows = defaultTemplateData.map(row => Object.values(row));
        saveState();
    }
    
    // Initialize edit mode state
    if (state.isEditMode === undefined) {
        state.isEditMode = false;
    }
    
    // Set up template navigation
    setupTemplateNavigation();
    
    // Set up template control buttons
    setupTemplateControls();
    
    // Render the main template table
    renderMainTemplateTable();
    
    // Set up context menu
    setupContextMenu();
    
    console.log('Templates initialized successfully');
}

// Setup template navigation between tabs
function setupTemplateNavigation() {
    const templateTabs = document.querySelectorAll('#template-tabs .tab-button');
    const templatePanes = document.querySelectorAll('#template-content .tab-pane');
    
    templateTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs and panes
            templateTabs.forEach(t => t.classList.remove('active'));
            templatePanes.forEach(p => p.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding pane
            tab.classList.add('active');
            const targetPane = document.getElementById(tab.dataset.tab);
            if (targetPane) {
                targetPane.classList.add('active');
            }
            
            // Re-render main template if switching to it
            if (tab.dataset.tab === 'main-template') {
                renderMainTemplateTable();
            }
        });
    });
}

// Setup template control buttons
function setupTemplateControls() {
    const toggleEditModeBtn = document.getElementById('toggle-edit-mode');
    const refreshProjectsBtn = document.getElementById('refresh-projects-button');
    const resetStateBtn = document.getElementById('reset-state-button');
    
    if (toggleEditModeBtn) {
        // Set initial button state based on current isEditMode
        updateToggleButtonState();
        toggleEditModeBtn.addEventListener('click', toggleEditMode);
    }
    
    if (refreshProjectsBtn) {
        refreshProjectsBtn.addEventListener('click', refreshAllProjects);
    }
    
    if (resetStateBtn) {
        resetStateBtn.addEventListener('click', resetAllData);
    }
}

// Update toggle button state
function updateToggleButtonState() {
    const toggleBtn = document.getElementById('toggle-edit-mode');
    if (!toggleBtn) return;
    
    if (state.isEditMode) {
        toggleBtn.textContent = 'Disable Edit Mode';
        toggleBtn.classList.add('active');
    } else {
        toggleBtn.textContent = 'Enable Edit Mode';
        toggleBtn.classList.remove('active');
    }
}

// Toggle edit mode
function toggleEditMode() {
    state.isEditMode = !state.isEditMode;
    
    // Update button state
    updateToggleButtonState();
    
    // Update table container class
    const tableContainer = document.querySelector('.main-template-container');
    if (tableContainer) {
        if (state.isEditMode) {
            tableContainer.classList.add('edit-mode');
        } else {
            tableContainer.classList.remove('edit-mode');
        }
    }
    
    if (state.isEditMode) {
        showNotification('Edit mode enabled. Right-click on rows/columns to modify template.', 'success');
    } else {
        clearSelectionAndHideMenu();
        showNotification('Edit mode disabled.', 'info');
    }
    
    // Re-render table with new edit mode
    renderMainTemplateTable();
}

// Refresh all projects with current template
function refreshAllProjects() {
    // This will be implemented when we integrate with project tabs
    showNotification('All projects refreshed with current template.', 'success');
    console.log('Refreshing all projects with template:', state.currentTemplateHeaders);
}

// Reset all data to default
function resetAllData() {
    if (confirm('Are you sure you want to reset all data? This action cannot be undone.')) {
        state.currentTemplateHeaders = Object.keys(defaultTemplateData[0]);
        state.currentTemplateRows = defaultTemplateData.map(row => Object.values(row));
        saveState();
        renderMainTemplateTable();
        showNotification('All data has been reset to default.', 'warning');
    }
}

// Render the main template table
function renderMainTemplateTable() {
    const table = document.getElementById('main-template-table');
    if (!table) return;
    
    // Update table container class based on edit mode
    const tableContainer = document.querySelector('.main-template-container');
    if (tableContainer) {
        if (state.isEditMode) {
            tableContainer.classList.add('edit-mode');
        } else {
            tableContainer.classList.remove('edit-mode');
        }
    }
    
    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');
    
    // Clear existing content
    thead.innerHTML = '';
    tbody.innerHTML = '';
    
    // Create header row
    const headerRow = document.createElement('tr');
    
    // Add empty corner cell
    const cornerTh = document.createElement('th');
    cornerTh.classList.add('corner-header');
    headerRow.appendChild(cornerTh);
    
    // Add column headers
    state.currentTemplateHeaders.forEach((headerText, colIdx) => {
        const th = document.createElement('th');
        th.textContent = headerText;
        th.dataset.colIndex = colIdx;
        th.classList.add('column-header');
        
        if (state.isEditMode) {
            th.classList.add('editable');
            th.addEventListener('click', () => selectColumn(colIdx));
            th.addEventListener('contextmenu', (e) => showTemplateContextMenu(e, 'column', colIdx));
        }
        
        headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    
    // Create data rows
    state.currentTemplateRows.forEach((rowData, rowIdx) => {
        const tr = document.createElement('tr');
        
        // Add row header
        const rowHeaderTh = document.createElement('th');
        rowHeaderTh.textContent = rowIdx + 1;
        rowHeaderTh.dataset.rowIndex = rowIdx;
        rowHeaderTh.classList.add('row-header');
        
        if (state.isEditMode) {
            rowHeaderTh.classList.add('editable');
            rowHeaderTh.addEventListener('click', () => selectRow(rowIdx));
            rowHeaderTh.addEventListener('contextmenu', (e) => showTemplateContextMenu(e, 'row', rowIdx));
        }
        
        tr.appendChild(rowHeaderTh);
        
        // Add data cells
        state.currentTemplateHeaders.forEach((header, colIndex) => {
            let cellElement;
            
            // Handle different cell types
            if (isEvidenciaColumn(header)) {
                // Use the proper evidence cell from ui.js
                cellElement = createEvidenciaCell(true, rowData, colIndex);
            } else {
                const td = document.createElement('td');
                const cellValue = rowData[colIndex] !== undefined ? rowData[colIndex] : '';
                
                if (isDateColumn(header)) {
                    td.classList.add('date-cell');
                    td.innerHTML = `<div class="cell-content">${cellValue}</div>`;
                } else if (isStatusColumn(header)) {
                    td.classList.add('status-cell');
                    td.innerHTML = `<div class="status-badge status-${cellValue}">${cellValue}</div>`;
                } else if (isCommentColumn(header)) {
                    td.classList.add('comment-cell');
                    td.textContent = cellValue;
                } else if (isNewCommentColumn(header)) {
                    td.classList.add('new-comment-cell');
                    td.innerHTML = `<div class="comment-input-wrapper">
                        <input type="text" placeholder="Add comment..." value="${cellValue}">
                        <button class="comment-submit-btn">💾</button>
                    </div>`;
                } else {
                    td.textContent = cellValue;
                }
                
                // Make cells editable in edit mode (except for comment columns)
                if (state.isEditMode && !isCommentColumn(header)) {
                    td.classList.add('editable');
                    td.addEventListener('click', () => editCell(td, rowIdx, colIndex));
                }
                
                cellElement = td;
            }
            
            tr.appendChild(cellElement);
        });
        
        tbody.appendChild(tr);
    });
    
    // Apply selection styles
    applySelectionStyles();
    
    // Update project cells visibility after rendering main template
    updateProjectCellsVisibility();
}

// Select a row
function selectRow(rowIndex) {
    if (!state.isEditMode) return;
    
    selectedRowIndex = rowIndex;
    selectedColIndex = -1;
    applySelectionStyles();
}

// Select a column
function selectColumn(colIndex) {
    if (!state.isEditMode) return;
    
    selectedColIndex = colIndex;
    selectedRowIndex = -1;
    applySelectionStyles();
}

// Apply selection styles
function applySelectionStyles() {
    const table = document.getElementById('main-template-table');
    if (!table) return;
    
    // Clear existing selection
    table.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
    
    if (selectedRowIndex >= 0) {
        // Highlight selected row
        const row = table.querySelector(`tbody tr:nth-child(${selectedRowIndex + 1})`);
        if (row) {
            row.classList.add('selected');
        }
    }
    
    if (selectedColIndex >= 0) {
        // Highlight selected column
        const headerCell = table.querySelector(`thead th:nth-child(${selectedColIndex + 2})`);
        if (headerCell) {
            headerCell.classList.add('selected');
        }
        
        // Highlight column cells
        const columnCells = table.querySelectorAll(`tbody td:nth-child(${selectedColIndex + 2})`);
        columnCells.forEach(cell => cell.classList.add('selected'));
    }
}

// Clear selection and hide context menu
function clearSelectionAndHideMenu() {
    selectedRowIndex = -1;
    selectedColIndex = -1;
    contextMenuType = null;
    contextMenuTargetIndex = -1;
    
    applySelectionStyles();
    hideContextMenu();
}

// Setup context menu
function setupContextMenu() {
    const contextMenu = document.getElementById('context-menu');
    if (!contextMenu) return;
    
    // Hide context menu when clicking elsewhere
    document.addEventListener('click', (e) => {
        if (!contextMenu.contains(e.target)) {
            hideContextMenu();
        }
    });
    
    // The context menu event handling is done inline in renderMainTemplateTable
    // to avoid conflicts with events.js
}

// Show template context menu
function showTemplateContextMenu(event, type, index) {
    console.log('showTemplateContextMenu called with:', { type, index, editMode: state.isEditMode });
    
    if (!state.isEditMode) {
        console.log('Not in edit mode, returning');
        return;
    }
    
    event.preventDefault();
    event.stopPropagation();
    
    contextMenuType = type;
    contextMenuTargetIndex = index;
    
    let contextMenu = document.getElementById('context-menu');
    
    if (!contextMenu) {
        contextMenu = document.createElement('div');
        contextMenu.id = 'context-menu';
        contextMenu.className = 'context-menu';
        contextMenu.style.display = 'none';
        document.body.appendChild(contextMenu);
    }
    
    let menuItems = [];
    
    if (type === 'column') {
        menuItems = [
            { text: 'Add Column Before', action: () => addColumnBefore(index) },
            { text: 'Add Column After', action: () => addColumnAfter(index) },
            { text: 'Edit Column Name', action: () => editColumnName(index) },
            { text: 'Delete Column', action: () => deleteColumn(index) }
        ];
    } else if (type === 'row') {
        menuItems = [
            { text: 'Add Row Above', action: () => addRowAbove(index) },
            { text: 'Add Row Below', action: () => addRowBelow(index) },
            { text: 'Delete Row', action: () => deleteRow(index) }
        ];
    }
    
    // Build menu HTML
    contextMenu.innerHTML = menuItems.map(item => 
        `<div class="context-menu-item" data-action="${item.text}">${item.text}</div>`
    ).join('');
    
    // Add event listeners
    contextMenu.querySelectorAll('.context-menu-item').forEach((item, idx) => {
        item.addEventListener('click', () => {
            menuItems[idx].action();
            hideContextMenu();
        });
    });
    
    // Position and show menu
    contextMenu.style.left = event.pageX + 'px';
    contextMenu.style.top = event.pageY + 'px';
    contextMenu.style.display = 'block';
}

// Hide context menu
function hideContextMenu() {
    const contextMenu = document.getElementById('context-menu');
    if (contextMenu) {
        contextMenu.style.display = 'none';
    }
}

// Column operations
function addColumnBefore(index) {
    const newColumnName = prompt('Enter new column name:');
    if (!newColumnName) return;
    
    // Add header
    state.currentTemplateHeaders.splice(index, 0, newColumnName);
    
    // Add empty cells to all rows
    state.currentTemplateRows.forEach(row => {
        row.splice(index, 0, '');
    });
    
    saveState();
    renderMainTemplateTable();
    showNotification(`Column "${newColumnName}" added before column ${index + 1}.`, 'success');
}

function addColumnAfter(index) {
    const newColumnName = prompt('Enter new column name:');
    if (!newColumnName) return;
    
    // Add header
    state.currentTemplateHeaders.splice(index + 1, 0, newColumnName);
    
    // Add empty cells to all rows
    state.currentTemplateRows.forEach(row => {
        row.splice(index + 1, 0, '');
    });
    
    saveState();
    renderMainTemplateTable();
    showNotification(`Column "${newColumnName}" added after column ${index + 1}.`, 'success');
}

function editColumnName(index) {
    const currentName = state.currentTemplateHeaders[index];
    const newName = prompt('Enter new column name:', currentName);
    if (!newName || newName === currentName) return;
    
    state.currentTemplateHeaders[index] = newName;
    
    saveState();
    renderMainTemplateTable();
    showNotification(`Column renamed from "${currentName}" to "${newName}".`, 'success');
}

function deleteColumn(index) {
    const columnName = state.currentTemplateHeaders[index];
    if (!confirm(`Are you sure you want to delete column "${columnName}"?`)) return;
    
    // Remove header
    state.currentTemplateHeaders.splice(index, 1);
    
    // Remove cells from all rows
    state.currentTemplateRows.forEach(row => {
        row.splice(index, 1);
    });
    
    saveState();
    renderMainTemplateTable();
    showNotification(`Column "${columnName}" deleted.`, 'warning');
}

// Row operations
function addRowAbove(index) {
    const newRow = new Array(state.currentTemplateHeaders.length).fill('');
    state.currentTemplateRows.splice(index, 0, newRow);
    
    saveState();
    renderMainTemplateTable();
    showNotification(`Row added above row ${index + 1}.`, 'success');
}

function addRowBelow(index) {
    const newRow = new Array(state.currentTemplateHeaders.length).fill('');
    state.currentTemplateRows.splice(index + 1, 0, newRow);
    
    saveState();
    renderMainTemplateTable();
    showNotification(`Row added below row ${index + 1}.`, 'success');
}

function deleteRow(index) {
    if (!confirm(`Are you sure you want to delete row ${index + 1}?`)) return;
    
    state.currentTemplateRows.splice(index, 1);
    
    saveState();
    renderMainTemplateTable();
    showNotification(`Row ${index + 1} deleted.`, 'warning');
}

// Edit cell content
function editCell(cell, rowIndex, colIndex) {
    if (!state.isEditMode) return;
    
    const currentValue = state.currentTemplateRows[rowIndex][colIndex];
    const newValue = prompt('Enter new value:', currentValue);
    
    if (newValue !== null && newValue !== currentValue) {
        state.currentTemplateRows[rowIndex][colIndex] = newValue;
        saveState();
        renderMainTemplateTable();
        showNotification('Cell updated.', 'success');
    }
}

// Export template functions for use in other modules
export {
    isDateColumn,
    isStatusColumn,
    isCommentColumn,
    isNewCommentColumn,
    isEvidenciaColumn,
    isDurationColumn,
    isDependencyColumn,
    isExpectedDateColumn,
    nonEditableColumns
}; 