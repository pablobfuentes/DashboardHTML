// Functions for saving and loading the application state. 

// --- State Management ---
export const state = {
    projectCount: 0,
    projectsData: {},
    activeDatepicker: null,
    currentDateCell: null,
    isResizing: false,
    currentTable: null,
    currentColumn: null,
    startX: 0,
    startWidth: 0,
    columnWidths: {},
    isEditMode: false,
    selectedRowIndex: -1,
    selectedColIndex: -1,
    contextMenuType: null,
    contextMenuTargetIndex: -1,
    contacts: [],
    csvData: [
        {"ID": 1, "Fase": "Requisitos Previos", "Unnamed: 2": "", "Unnamed: 3": 1, "Milestone": "Contacto Inicial", "Unnamed: 5": "", "Unnamed: 6": "", "Actividad": "Integracion de equipo de trabajo/asignacion de recurso humano", "Unnamed: 8": "", "Unnamed: 9": "", "Unnamed: 10": "", "Unnamed: 11": "", "Unnamed: 12": "", "Unnamed: 13": "", "Duracion": 5, "Fecha Esperada": "19-Oct-24", "Dependencia": "", "Responsable": "Pablo", "Unnamed: 18": "", "Status": "completo", "Unnamed: 20": "", "Comentario": "", "Unnamed: 22": "", "Unnamed: 23": "", "Unnamed: 24": "", "Unnamed: 25": "", "Nuevo": "", "Unnamed: 27": "", "Unnamed: 28": "", "Fecha": "", "Unnamed: 30": "", "Fecha Termino": "", "Evidencia": ""},
        {"ID": 2, "Fase": "Requisitos Previos", "Unnamed: 2": "", "Unnamed: 3": 1, "Milestone": "Contacto Inicial", "Unnamed: 5": "", "Unnamed: 6": "", "Actividad": "Crear canales de comunicacion (grupo WA)", "Unnamed: 8": "", "Unnamed: 9": "", "Unnamed: 10": "", "Unnamed: 11": "", "Unnamed: 12": "", "Unnamed: 13": "", "Duracion": 1, "Fecha Esperada": "24-Oct-24", "Dependencia": 1, "Responsable": "Pablo", "Unnamed: 18": "", "Status": "completo", "Unnamed: 20": "", "Comentario": "", "Unnamed: 22": "", "Unnamed: 23": "", "Unnamed: 24": "", "Unnamed: 25": "", "Nuevo": "", "Unnamed: 27": "", "Unnamed: 28": "", "Fecha": "", "Unnamed: 30": "", "Fecha Termino": "", "Evidencia": ""},
        {"ID": 3, "Fase": "Requisitos Previos", "Unnamed: 2": "", "Unnamed: 3": 0, "Milestone": "Perfiles de Telefonia", "Unnamed: 5": "", "Unnamed: 6": "", "Actividad": "PT-Preparacion de presentacion", "Unnamed: 8": "", "Unnamed: 9": "", "Unnamed: 10": "", "Unnamed: 11": "", "Unnamed: 12": "", "Unnamed: 13": "", "Duracion": 1, "Fecha Esperada": "25-Oct-24", "Dependencia": 2, "Responsable": "Pablo", "Unnamed: 18": "", "Status": "completo", "Unnamed: 20": "", "Comentario": "", "Unnamed: 22": "", "Unnamed: 23": "", "Unnamed: 24": "", "Unnamed: 25": "", "Nuevo": "", "Unnamed: 27": "", "Unnamed: 28": "", "Fecha": "", "Unnamed: 30": "", "Fecha Termino": "", "Evidencia": ""},
        {"ID": 4, "Fase": "Requisitos Previos", "Unnamed: 2": "", "Unnamed: 3": 1, "Milestone": "Perfiles de Telefonia", "Unnamed: 5": "", "Unnamed: 6": "", "Actividad": "PT-Requerimiento de sesion", "Unnamed: 8": "", "Unnamed: 9": "", "Unnamed: 10": "", "Unnamed: 11": "", "Unnamed: 12": "", "Unnamed: 13": "", "Duracion": 1, "Fecha Esperada": "25-Oct-24", "Dependencia": 2, "Responsable": "Pablo", "Unnamed: 18": "", "Status": "completo", "Unnamed: 20": "", "Comentario": "", "Unnamed: 22": "", "Unnamed: 23": "", "Unnamed: 24": "", "Unnamed: 25": "", "Nuevo": "", "Unnamed: 27": "", "Unnamed: 28": "", "Fecha": "", "Unnamed: 30": "", "Fecha Termino": "", "Evidencia": ""},
        {"ID": 5, "Fase": "Requisitos Previos", "Unnamed: 2": "", "Unnamed: 3": 0, "Milestone": "Perfiles de Telefonia", "Unnamed: 5": "", "Unnamed: 6": "", "Actividad": "PT-Acuerdo de fecha y hora", "Unnamed: 8": "", "Unnamed: 9": "", "Unnamed: 10": "", "Unnamed: 11": "", "Unnamed: 12": "", "Unnamed: 13": "", "Duracion": 2, "Fecha Esperada": "26-Oct-24", "Dependencia": 4, "Responsable": "ATI", "Unnamed: 18": "", "Status": "completo", "Unnamed: 20": "", "Comentario": "", "Unnamed: 22": "", "Unnamed: 23": "", "Unnamed: 24": "", "Unnamed: 25": "", "Nuevo": "", "Unnamed: 27": "", "Unnamed: 28": "", "Fecha": "", "Unnamed: 30": "", "Fecha Termino": "", "Evidencia": ""}
    ],
    currentTemplateHeaders: [],
    currentTemplateRows: [],
    nonEditableColumns: ['ID', 'Fase', 'Milestone', 'Actividad'],
};

// Initialize headers and rows from csvData
state.currentTemplateHeaders = Object.keys(state.csvData[0]);
state.currentTemplateRows = state.csvData.map(row => Object.values(row));

export function syncContactsFromDOM() {
    Object.keys(state.projectsData).forEach(projectId => {
        const project = state.projectsData[projectId];
        if (project) {
            const tabPane = document.getElementById(projectId);
            if (tabPane) {
                const quickInfoTable = tabPane.querySelector('.quick-info-table');
                if (quickInfoTable) {
                    const address = quickInfoTable.querySelector('.address-row')?.textContent || '';
                    const contactRows = quickInfoTable.querySelectorAll('tbody tr:not(:first-child)');
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
}

export function saveState() {
    syncContactsFromDOM(); // Sync right before saving
    const dataToSave = {
        headers: state.currentTemplateHeaders,
        rows: state.currentTemplateRows,
        projects: state.projectsData,
        projectCount: state.projectCount,
        columnWidths: state.columnWidths,
        contacts: state.contacts,
        timezoneOffset: state.timezoneOffset,
    };
    localStorage.setItem('dashboardState', JSON.stringify(dataToSave));
    console.log("Dashboard state saved.");
}

export function loadState() {
    const saved = localStorage.getItem('dashboardState');
    if (!saved) {
        console.log('No saved state found. Using default data.');
        return;
    }
    console.log('Saved state found. Restoring dashboard...');
    const loadedData = JSON.parse(saved);
    state.currentTemplateHeaders = loadedData.headers || Object.keys(state.csvData[0]);
    state.currentTemplateRows = loadedData.rows || state.csvData.map(row => Object.values(row));
    state.projectsData = loadedData.projects || {};
    state.projectCount = loadedData.projectCount || 0;
    state.columnWidths = loadedData.columnWidths || {};
    state.contacts = loadedData.contacts || [];
    state.timezoneOffset = loadedData.timezoneOffset || 0;
}

export function loadAndRenderState(projectsData, currentTemplateHeaders, currentTemplateRows, projectCount, columnWidths, csvData) {
    // ... existing code ...
} 