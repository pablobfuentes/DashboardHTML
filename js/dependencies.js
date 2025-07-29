import { state, saveState } from './state.js';
import { renderTable } from './ui.js';
import * as utils from './utils.js';

// Date parsing and formatting functions
export function parseCustomDate(dateStr) {
    if (!dateStr || dateStr.trim() === '') return null;
    
    // Handle format like "15-Dec-24" or "15-Dec-2024"
    const match = dateStr.match(/(\d{1,2})-([A-Za-z]{3})-(\d{2,4})/);
    if (match) {
        const [, day, monthStr, year] = match;
        const monthMap = {
            'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
            'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
        };
        const month = monthMap[monthStr];
        const fullYear = year.length === 2 ? 2000 + parseInt(year) : parseInt(year);
        return new Date(fullYear, month, parseInt(day));
    }
    
    // Fallback to standard date parsing
    try {
        return new Date(dateStr);
    } catch {
        return null;
    }
}

export function formatCustomDate(date) {
    if (!date) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[date.getMonth()];
    const year = String(date.getFullYear()).slice(-2);
    return `${day}-${month}-${year}`;
}

export function addDays(date, days) {
    if (!date) return null;
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

export function subtractDays(date, days) {
    if (!date) return null;
    const result = new Date(date);
    result.setDate(result.getDate() - days);
    return result;
}

// Get column indices for dependency calculations
export function getColumnIndices(headers) {
    const indices = {};
    
    headers.forEach((header, index) => {
        if (header === 'ID') {
            indices.id = index;
        } else if (utils.isDurationColumn(header)) {
            indices.duration = index;
        } else if (utils.isDependencyColumn(header)) {
            indices.dependency = index;
        } else if (utils.isExpectedDateColumn(header)) {
            indices.expectedDate = index;
        }
    });
    
    return indices;
}

// Main dependency update function
export function updateDatesBasedOnDependencies(updatedRowIndex, projectId) {
    const project = state.projectsData[projectId];
    if (!project) return;
    
    console.log('Project headers:', JSON.stringify(project.headers, null, 2));
    const indices = getColumnIndices(project.headers);
    console.log('Column indices found:', JSON.stringify(indices, null, 2));
    
    if (indices.id === undefined || indices.duration === undefined || 
        indices.dependency === undefined || indices.expectedDate === undefined) {
        console.error('Required columns not found in project data. Looking for:');
        console.error('- ID column (exact match)');
        console.error('- Duration column (matches /^duracion$|^dias$/i)');
        console.error('- Dependency column (matches /^dependencia$|^dep\\.?$/i)');
        console.error('- Expected Date column (matches /^fecha\\s*esperada$/i)');
        console.error('Found headers:', JSON.stringify(project.headers, null, 2));
        
        // Add debug logging for each column check
        project.headers.forEach((header, index) => {
            console.log(`Checking header[${index}]: "${header}"`);
            console.log(`  isDurationColumn: ${utils.isDurationColumn(header)}`);
            console.log(`  isDependencyColumn: ${utils.isDependencyColumn(header)}`);
            console.log(`  isExpectedDateColumn: ${utils.isExpectedDateColumn(header)}`);
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
    
    // Update timeline since dates have changed
    const milestonesContainer = document.querySelector(`#${projectId} .milestones-container`);
    if (milestonesContainer) {
        import('./milestones.js').then(module => {
            module.createMilestonesTimeline(milestonesContainer, projectId);
        });
    }
} 