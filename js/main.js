// This will be the main entry point for the application.
import { loadState } from './state.js';
import { initializeUI } from './ui.js';
import { initializeEventListeners } from './events.js';
import { initializeKanban } from './kanban.js';
import { initializeTimezone } from './timezone.js';
// import { initializeTemplates } from './templates.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log("Main script loaded.");

    // Load saved state from localStorage
    loadState();

    // Initialize all parts of the application
    initializeTimezone(); // Initialize timezone settings
    initializeUI(); // Renders tables, etc. based on loaded state
    initializeEventListeners(); // Sets up all click/input handlers
    // The Kanban view is now initialized on-demand when the user clicks the tab.
    // The Contacts view is now initialized on-demand when the user clicks the tab.
    // initializeTemplates();

    console.log("Application initialized.");
});