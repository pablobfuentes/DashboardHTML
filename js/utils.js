// Utility and helper functions.

export const isDateColumn = (headerText) => /fecha|date/i.test(headerText);
export const isStatusColumn = (headerText) => /status|estado/i.test(headerText);
export const isCommentColumn = (headerText) => /^comentario$/i.test(headerText.trim());
export const isNewCommentColumn = (headerText) => {
    const result = /nuevo\s*comentario/i.test(headerText) || headerText.trim().toLowerCase() === 'nuevo';
    console.log('Checking if column is nuevo comentario:', headerText, result);
    return result;
};
export const isEvidenciaColumn = (headerText) => headerText.trim().toLowerCase() === 'evidencia';
export const isDurationColumn = (headerText) => /^duracion$|^dias$/i.test(headerText.trim());
export const isDependencyColumn = (headerText) => /^dependencia$|^dep\.?$/i.test(headerText.trim());
export const isExpectedDateColumn = (headerText) => /^fecha\s*esperada$/i.test(headerText.trim());

// Function to get current timestamp in short format
export const getCurrentTimestamp = () => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = now.toLocaleString('en-US', { month: 'short' });
    return `${day}-${month}`;
};

// Function to extract the latest comment from history
export const getLatestComment = (commentHistory) => {
    if (!commentHistory || commentHistory.trim() === '') {
        return '';
    }
    
    // Get first line since comments are now single-line with date at the end
    const lines = commentHistory.split('\n');
    return lines[0] || '';
};

// Function to format a comment line to ensure consistent format
export const formatCommentLine = (line) => {
    // Remove any existing date format
    let cleanLine = line.replace(/\[\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}\]|\d{2}-[A-Za-z]{3}-\d{4}/g, '').trim();
    // Extract any date in the new format if it exists
    const dateMatch = line.match(/\[\d{2}-[A-Za-z]{3}\]/g);
    const date = dateMatch ? dateMatch[0] : '';
    // Remove the new format date if it exists
    cleanLine = cleanLine.replace(/\[\d{2}-[A-Za-z]{3}\]/g, '').trim();
    return date ? `${cleanLine} ${date}` : cleanLine;
};


// Function to format existing comment history to new format
export const reformatCommentHistory = (history) => {
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
export const addCommentToHistory = (currentHistory, newComment) => {
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

// Date calculation helper functions
export function parseCustomDate(dateStr) {
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

export function formatCustomDate(date) {
    if (!date) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = date.toLocaleString('en-US', { month: 'short' });
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}

export function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

export function subtractDays(date, days) {
    return addDays(date, -days);
}

export function getStatusClass(status) {
    if (!status) return 'status-na';
    const s = status.toLowerCase().trim();
    
    // Generate class name from status
    const className = `status-${s.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;
    
    // Legacy fallback for hardcoded statuses
    if (s === 'completo') return 'status-completo';
    if (s === 'en proceso') return 'status-en-proceso';
    if (s === 'pendiente') return 'status-pendiente';
    if (s === 'n/a') return 'status-na';
    
    return className;
}

export function getNextStatus(currentStatus) {
    // Import state to get dynamic status tags
    import('./state.js').then(({ state }) => {
        const statuses = state.statusTags.map(tag => tag.name);
        const currentIndex = statuses.indexOf(currentStatus.toLowerCase());
        const nextIndex = (currentIndex + 1) % statuses.length;
        return statuses[nextIndex];
    });
    
    // Legacy fallback
    const statuses = ['pendiente', 'en proceso', 'completo', 'n/a'];
    const currentIndex = statuses.indexOf(currentStatus.toLowerCase());
    const nextIndex = (currentIndex + 1) % statuses.length;
    return statuses[nextIndex];
}