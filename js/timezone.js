// Timezone functionality module
import { state, saveState } from './state.js';

let timezoneOffset = 0; // Default to UTC
let timeUpdateInterval = null;

// Update time display for a specific project
export function updateTime(projectId) {
    const timeDisplay = document.querySelector(`#${projectId} .current-time`);
    if (!timeDisplay) return;

    const now = new Date();
    now.setMinutes(now.getMinutes() + now.getTimezoneOffset() + (timezoneOffset * 60));
    
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    timeDisplay.textContent = `${hours}:${minutes}`;
}

// Setup timezone handlers for a specific project
export function setupTimezoneHandlers(projectId) {
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

    // Update timezone display with current offset
    if (timezoneOffsetDisplay) {
        timezoneOffsetDisplay.textContent = `UTC${timezoneOffset >= 0 ? '+' : ''}${timezoneOffset}`;
    }

    // Start time updates
    updateTime(projectId);
    if (timeUpdateInterval) clearInterval(timeUpdateInterval);
    timeUpdateInterval = setInterval(() => updateAllTimeDisplays(), 60000); // Update every minute

    if (!timezoneSelect || !timezoneModal) {
        console.warn('Timezone elements not found for project:', projectId);
        return;
    }

    // Show modal
    timezoneSelect.addEventListener('click', (e) => {
        e.stopPropagation();
        timezoneModal.classList.add('active');
        if (timezoneInput) {
            timezoneInput.value = timezoneOffset;
        }
    });

    // Hide modal
    if (timezoneClose) {
        timezoneClose.addEventListener('click', (e) => {
            e.stopPropagation();
            timezoneModal.classList.remove('active');
        });
    }

    // Apply new timezone
    if (timezoneApply && timezoneInput && timezoneOffsetDisplay) {
        timezoneApply.addEventListener('click', () => {
            const newOffset = parseInt(timezoneInput.value);
            if (!isNaN(newOffset) && newOffset >= -12 && newOffset <= 14) {
                timezoneOffset = newOffset;
                timezoneOffsetDisplay.textContent = `UTC${newOffset >= 0 ? '+' : ''}${newOffset}`;
                updateTime(projectId);
                timezoneModal.classList.remove('active');
                
                // Save timezone to state
                state.timezoneOffset = timezoneOffset;
                saveState();
            } else {
                alert('Please enter a valid timezone offset between -12 and +14');
            }
        });
    }

    // Close modal when clicking outside
    timezoneModal.addEventListener('click', (e) => {
        if (e.target === timezoneModal) {
            timezoneModal.classList.remove('active');
        }
    });

    // Handle Enter key in input
    if (timezoneInput) {
        timezoneInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                if (timezoneApply) timezoneApply.click();
            }
        });
    }
}

// Initialize timezone from saved state
export function initializeTimezone() {
    if (state.timezoneOffset !== undefined) {
        timezoneOffset = state.timezoneOffset;
        // Update all timezone displays
        updateAllTimezoneDisplays();
    }
}

// Update all timezone displays when timezone changes
function updateAllTimezoneDisplays() {
    const timezoneOffsetDisplays = document.querySelectorAll('.timezone-offset');
    timezoneOffsetDisplays.forEach(display => {
        display.textContent = `UTC${timezoneOffset >= 0 ? '+' : ''}${timezoneOffset}`;
    });
}

// Update all time displays
function updateAllTimeDisplays() {
    const timeDisplays = document.querySelectorAll('.current-time');
    timeDisplays.forEach(timeDisplay => {
        const now = new Date();
        now.setMinutes(now.getMinutes() + now.getTimezoneOffset() + (timezoneOffset * 60));
        
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        timeDisplay.textContent = `${hours}:${minutes}`;
    });
}

// Get current timezone offset
export function getTimezoneOffset() {
    return timezoneOffset;
} 