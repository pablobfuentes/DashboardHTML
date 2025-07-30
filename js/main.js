// This will be the main entry point for the application.
import { loadState } from './state.js';
import { renderMainTemplate, initializeUI } from './ui.js';
import { initializeEventListeners } from './events.js';
import { initializeTimezone } from './timezone.js';
import { initializeEmailTemplates } from './email-templates.js';
import { initializeProjectActions } from './project-actions.js';
import { initializeSummary } from './summary.js';
import { initializeTemplates } from './templates.js';

document.addEventListener('DOMContentLoaded', () => {
    loadState();

    // Initial render of the main template table MUST come first
    // as other modules depend on the main template data structure.
    renderMainTemplate();

    // Initialize UI to render all saved project tabs
    initializeUI();

    initializeEventListeners();
    initializeTimezone();
    initializeEmailTemplates();
    initializeProjectActions();
    initializeSummary();
    initializeTemplates();
});