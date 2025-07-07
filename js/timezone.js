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
    console.log('Initializing timezone...');
    
    // Load timezone offset from saved state
    if (state.timezoneOffset !== undefined) {
        timezoneOffset = state.timezoneOffset;
        console.log('Loaded timezone offset from state:', timezoneOffset);
    } else {
        console.log('No timezone offset found in state, using default:', timezoneOffset);
    }
    
    // Initialize the main world clock element
    initializeWorldClock();
    
    // Update all timezone displays
    updateAllTimezoneDisplays();
    
    // Update all time displays immediately
    updateAllTimeDisplays();
    
    // Update all project time displays immediately
    updateAllProjectTimeDisplays();
    
    // Start the time update interval
    startTimeUpdateInterval();
    
    console.log('Timezone initialization complete');
}

// Initialize the world clock element
function initializeWorldClock() {
    const worldClockElement = document.querySelector('#world-clock');
    const timezoneSelect = document.querySelector('.timezone-select');
    const timezoneModal = document.querySelector('.timezone-modal');
    const timezoneClose = document.querySelector('.timezone-modal-close');
    const timezoneInput = document.querySelector('.timezone-input');
    const timezoneApply = document.querySelector('.timezone-apply-btn');
    const timezoneCancel = document.querySelector('.timezone-cancel-btn');
    
    if (!worldClockElement) {
        console.warn('World clock element not found');
        return;
    }

    // Update the world clock immediately
    updateWorldClock();

    // Setup timezone selector if available
    if (timezoneSelect && timezoneModal) {
        timezoneSelect.addEventListener('click', (e) => {
            e.stopPropagation();
            showTimezoneModal();
        });
    }

    // Setup modal handlers
    if (timezoneModal) {
        // Close modal handlers
        if (timezoneClose) {
            timezoneClose.addEventListener('click', (e) => {
                e.stopPropagation();
                hideTimezoneModal();
            });
        }

        if (timezoneCancel) {
            timezoneCancel.addEventListener('click', (e) => {
                e.stopPropagation();
                hideTimezoneModal();
            });
        }

        // Apply timezone handler
        if (timezoneApply && timezoneInput) {
            timezoneApply.addEventListener('click', () => {
                const newOffset = parseInt(timezoneInput.value);
                if (!isNaN(newOffset) && newOffset >= -12 && newOffset <= 14) {
                    setTimezoneOffset(newOffset);
                    hideTimezoneModal();
                } else {
                    alert('Please enter a valid timezone offset between -12 and +14');
                }
            });
        }

        // Handle Enter key in input
        if (timezoneInput) {
            timezoneInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    if (timezoneApply) timezoneApply.click();
                }
            });
        }

        // Close modal when clicking outside
        timezoneModal.addEventListener('click', (e) => {
            if (e.target === timezoneModal) {
                hideTimezoneModal();
            }
        });
    }
}

// Show timezone modal
function showTimezoneModal() {
    const timezoneModal = document.querySelector('.timezone-modal');
    const timezoneInput = document.querySelector('.timezone-input');
    
    if (timezoneModal) {
        timezoneModal.classList.add('active');
        if (timezoneInput) {
            timezoneInput.value = timezoneOffset;
        }
    }
}

// Hide timezone modal
function hideTimezoneModal() {
    const timezoneModal = document.querySelector('.timezone-modal');
    if (timezoneModal) {
        timezoneModal.classList.remove('active');
    }
}

// Start the time update interval
function startTimeUpdateInterval() {
    // Clear any existing interval
    if (timeUpdateInterval) {
        clearInterval(timeUpdateInterval);
    }
    
    // Start new interval that updates every minute
    timeUpdateInterval = setInterval(() => {
        updateAllTimeDisplays();
        updateWorldClock();
        updateAllProjectTimeDisplays();
    }, 60000);
    
    console.log('Time update interval started');
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
        const timeString = `${hours}:${minutes}`;
        
        timeDisplay.textContent = timeString;
    });
}

// Update the world clock specifically
function updateWorldClock() {
    const worldClockElement = document.querySelector('#world-clock');
    
    if (!worldClockElement) {
        console.warn('World clock element not found in updateWorldClock');
        return;
    }

    const now = new Date();
    now.setMinutes(now.getMinutes() + now.getTimezoneOffset() + (timezoneOffset * 60));
    
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const timeString = `${hours}:${minutes}`;
    
    worldClockElement.textContent = timeString;
    
    // Save the current time to localStorage
    localStorage.setItem('worldClockTime', timeString);
    localStorage.setItem('worldClockTimestamp', Date.now().toString());
}

// Get current timezone offset
export function getTimezoneOffset() {
    return timezoneOffset;
}

// Set timezone offset
export function setTimezoneOffset(newOffset) {
    timezoneOffset = newOffset;
    state.timezoneOffset = timezoneOffset;
    saveState();
    updateAllTimezoneDisplays();
    updateAllTimeDisplays();
    updateWorldClock();
    
    // Also update individual project time displays
    updateAllProjectTimeDisplays();
    
    console.log('Timezone offset updated to:', newOffset);
}

// Update all project time displays
function updateAllProjectTimeDisplays() {
    // Find all project panes and update their time displays
    const projectPanes = document.querySelectorAll('.project-pane');
    projectPanes.forEach(pane => {
        const projectId = pane.id;
        if (projectId) {
            updateProjectTime(projectId);
        }
    });
}

// Update time for a specific project (similar to ui.js updateTime function)
function updateProjectTime(projectId) {
    const tabPane = document.getElementById(projectId);
    if (!tabPane) return;

    const timeDisplay = tabPane.querySelector('.current-time');
    if (!timeDisplay) return;

    const now = new Date();
    now.setMinutes(now.getMinutes() + now.getTimezoneOffset() + (timezoneOffset * 60));
    
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const timeString = `${hours}:${minutes}`;
    
    timeDisplay.textContent = timeString;
}

// Test function to force update the time display (for debugging)
window.testTimeUpdate = function() {
    console.log('=== Manual Time Update Test ===');
    const worldClockElement = document.querySelector('#world-clock');
    console.log('World clock element found:', !!worldClockElement);
    
    if (worldClockElement) {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const timeString = `${hours}:${minutes}`;
        
        console.log('Setting time to:', timeString);
        worldClockElement.textContent = timeString;
        console.log('Current display:', worldClockElement.textContent);
    }
    
    // Also test timezone offset update
    console.log('Current timezone offset:', timezoneOffset);
    updateAllTimeDisplays();
    updateWorldClock();
    console.log('=== Test Complete ===');
};

// Also expose the timezone functions for testing
window.setTestTimezone = function(offset) {
    console.log('Setting test timezone offset to:', offset);
    setTimezoneOffset(offset);
};

