// This will be the main entry point for the application.
import { loadState } from './state.js';
import { initializeUI } from './ui.js';
import { initializeEventListeners } from './events.js';
import { initializeKanban } from './kanban.js';
import { initializeTimezone } from './timezone.js';
import { initializeContacts } from './contacts.js';
import { initializeTemplates } from './templates.js';
import { initializeEmailTemplates } from './email-templates.js';
import { initializeProjectActions } from './project-actions.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log("Main script loaded.");

    // Load saved state from localStorage
    loadState();

    // Initialize all parts of the application
    initializeUI(); // Renders tables, etc. based on loaded state FIRST
    initializeTimezone(); // Initialize timezone settings AFTER UI is created
    initializeEventListeners(); // Sets up all click/input handlers
    initializeContacts();
    initializeTemplates(); // Initialize the template system
    initializeProjectActions(); // Initialize project actions system
    // The Kanban view is now initialized on-demand when the user clicks the tab.
    // The Contacts view is now initialized on-demand when the user clicks the tab.

    console.log("Application initialized.");
});