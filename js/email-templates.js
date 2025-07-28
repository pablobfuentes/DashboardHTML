// Email Templates Module - Core CRUD Operations
import { state, saveState } from './state.js';
import { showNotification } from './ui.js';

// Available placeholders for templates
const TEMPLATE_PLACEHOLDERS = {
    project: [
        { placeholder: '{{ProjectName}}', description: 'Name of the project' },
        { placeholder: '{{ProjectPhase}}', description: 'Current project phase' },
        { placeholder: '{{ProjectCompletion}}', description: 'Project completion percentage' },
        { placeholder: '{{NextMilestone}}', description: 'Next milestone to be completed' },
        { placeholder: '{{CurrentActivity}}', description: 'Current active task/activity' }
    ],
    task: [
        { placeholder: '{{TaskID}}', description: 'Task/row ID number' },
        { placeholder: '{{TaskName}}', description: 'Task/activity name' },
        { placeholder: '{{TaskStatus}}', description: 'Current task status' },
        { placeholder: '{{TaskDuration}}', description: 'Task duration in days' },
        { placeholder: '{{ExpectedDate}}', description: 'Expected completion date' },
        { placeholder: '{{Responsible}}', description: 'Person responsible for task' },
        { placeholder: '{{Dependency}}', description: 'Task dependencies' }
    ],
    updates: [
        { placeholder: '{{LatestComment}}', description: 'Most recent comment on task' },
        { placeholder: '{{CommentHistory}}', description: 'Full comment history' },
        { placeholder: '{{LastUpdated}}', description: 'Last modification date' }
    ],
    general: [
        { placeholder: '{{CurrentDate}}', description: 'Current date' },
        { placeholder: '{{CurrentTime}}', description: 'Current time' },
        { placeholder: '{{UserName}}', description: 'Current user name' }
    ]
};

// Template categories
const TEMPLATE_CATEGORIES = [
    { value: 'project-kickoff', label: 'Project Kickoff', actionTypes: ['custom'] },
    { value: 'progress-update', label: 'Progress Update', actionTypes: ['status-update'] },
    { value: 'milestone-complete', label: 'Milestone Complete', actionTypes: ['milestone-notification', 'thank-team'] },
    { value: 'project-closure', label: 'Project Closure', actionTypes: ['thank-team', 'status-update'] },
    { value: 'meeting-request', label: 'Meeting Request', actionTypes: ['schedule-meeting'] },
    { value: 'status-request', label: 'Status Request', actionTypes: ['follow-up', 'status-update'] },
    { value: 'follow-up', label: 'Follow Up', actionTypes: ['follow-up'] },
    { value: 'reminder', label: 'Reminder', actionTypes: ['follow-up'] },
    { value: 'issue-alert', label: 'Issue Alert', actionTypes: ['issue-alert'] },
    { value: 'appreciation', label: 'Appreciation', actionTypes: ['thank-team'] },
    { value: 'coordination', label: 'Coordination', actionTypes: ['schedule-meeting', 'follow-up'] },
    { value: 'communication', label: 'Communication', actionTypes: ['custom'] }
];

// Selected template state
let selectedTemplate = null;

// Initialize email templates functionality
export function initializeEmailTemplates() {
    console.log('Initializing Email Templates...');
    
    // Initialize email templates array if it doesn't exist
    if (!state.emailTemplates) {
        state.emailTemplates = [];
    }
    
    // Add sample templates if none exist
    if (state.emailTemplates.length === 0) {
        createSampleTemplates();
    }
    
    // Add CSS styles
    addEmailTemplatesCSS();
    
    // Setup event listeners
    setupEmailTemplateEventListeners();
    
    // Render existing templates
    renderEmailTemplates();
    
    // Update category counts
    updateCategoryCounts();
    
    console.log('Email Templates initialized successfully');
}

// Create sample templates for demonstration
function createSampleTemplates() {
    const sampleTemplates = [
        {
            id: 'sample-meeting-request',
            name: 'Meeting Request',
            category: 'communication',
            to: '{{Client Contact}}, {{Project Manager}}',
            subject: 'Meeting Request for {{ProjectName}}',
            body: `Dear Team,

I hope this email finds you well. I would like to schedule a meeting to discuss the progress and next steps for {{ProjectName}}.

Current Status:
- Project Completion: {{ProjectCompletion}}
- Current Phase: {{ProjectPhase}}
- Next Milestone: {{NextMilestone}}

Please let me know your availability for next week.

Best regards,
{{UserName}}`,
            tags: ['meeting', 'scheduling', 'coordination', 'calendar'],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: 'sample-status-update',
            name: 'Weekly Status Update',
            category: 'update',
            to: '{{Client Contact}}',
            subject: '{{ProjectName}} - Weekly Status Update',
            body: `Hello,

Here's the weekly status update for {{ProjectName}}:

📊 Progress Overview:
- Overall Completion: {{ProjectCompletion}}
- Current Phase: {{ProjectPhase}}
- Latest Activity: {{CurrentActivity}}

📅 Upcoming Milestones:
- Next Milestone: {{NextMilestone}}

💬 Recent Updates:
- {{LatestComment}}

Please feel free to reach out if you have any questions or concerns.

Best regards,
{{UserName}}`,
            tags: ['update', 'progress', 'status', 'report', 'weekly'],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: 'sample-thank-you',
            name: 'Thank You Note',
            category: 'appreciation',
            to: '{{Project Manager}}, {{Client Contact}}',
            subject: 'Thank you for your cooperation - {{ProjectName}}',
            body: `Dear Team,

I wanted to take a moment to express my sincere gratitude for your excellent work and cooperation on {{ProjectName}}.

Your dedication and professionalism have been instrumental in achieving our current progress of {{ProjectCompletion}}.

Special recognition for:
- Timely responses and feedback
- Quality of work delivered
- Collaborative spirit throughout the project

Thank you for making this project a success!

Warm regards,
{{UserName}}`,
            tags: ['thank', 'appreciation', 'completion', 'milestone', 'gratitude'],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: 'sample-issue-alert',
            name: 'Issue Alert',
            category: 'urgent',
            to: '{{Project Manager}}',
            subject: 'URGENT: Issue with {{ProjectName}}',
            body: `Hello,

I need to bring to your attention an urgent issue with {{ProjectName}}.

Issue Details:
- Project: {{ProjectName}}
- Current Status: {{ProjectCompletion}}
- Task: {{TaskName}}
- Priority: HIGH

Description:
This issue requires immediate attention to avoid delays in our project timeline.

Please advise on the next steps.

Best regards,
{{UserName}}`,
            tags: ['issue', 'problem', 'urgent', 'blocker', 'alert'],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: 'sample-milestone-reached',
            name: 'Milestone Achievement',
            category: 'notification',
            to: '{{Client Contact}}, {{Project Manager}}',
            subject: '🎯 Milestone Reached - {{ProjectName}}',
            body: `Great news!

I'm pleased to inform you that we have successfully reached an important milestone for {{ProjectName}}.

Milestone Details:
- Project: {{ProjectName}}
- Current Progress: {{ProjectCompletion}}
- Phase Completed: {{ProjectPhase}}
- Achievement Date: {{CurrentDate}}

This achievement brings us one step closer to project completion. 

Next Steps:
- {{NextMilestone}}

Thank you for your continued support and collaboration.

Best regards,
{{UserName}}`,
            tags: ['milestone', 'achievement', 'completion', 'progress', 'success'],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }
    ];
    
    // Add sample templates to state
    state.emailTemplates.push(...sampleTemplates);
    saveState();
    
    console.log('Sample email templates created');
}

// Add CSS styles for email templates
function addEmailTemplatesCSS() {
    if (document.getElementById('email-templates-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'email-templates-styles';
    style.textContent = `
        /* Email Templates Core Styles */
        .email-templates-header {
            text-align: center;
            margin-bottom: 30px;
        }
        
        .email-templates-toolbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 30px;
            padding: 20px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .email-templates-toolbar .toolbar-left,
        .email-templates-toolbar .toolbar-right {
            display: flex;
            gap: 12px;
        }
        
        .email-templates-toolbar .toolbar-center {
            flex: 1;
            display: flex;
            justify-content: center;
            max-width: 400px;
            margin: 0 20px;
        }
        
        .template-search-container {
            position: relative;
            width: 100%;
            max-width: 350px;
        }
        
        .template-search-container input {
            width: 100%;
            padding: 12px 45px 12px 18px;
            border: 2px solid #e1e8ed;
            border-radius: 25px;
            font-size: 14px;
            outline: none;
            transition: all 0.2s ease;
        }
        
        .template-search-container input:focus {
            border-color: #007bff;
            box-shadow: 0 0 0 3px rgba(0,123,255,0.1);
        }
        
        .template-search-container .search-icon {
            position: absolute;
            right: 18px;
            top: 50%;
            transform: translateY(-50%);
            color: #6c757d;
            pointer-events: none;
        }
        
        .add-template-btn,
        .import-template-btn,
        .export-template-btn,
        .add-email-template-btn {
            background: #007bff;
            color: white;
            border: none;
            border-radius: 8px;
            padding: 12px 18px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .add-template-btn:hover,
        .add-email-template-btn:hover {
            background: #0056b3;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0,123,255,0.25);
        }
        
        .import-template-btn,
        .export-template-btn {
            background: #6c757d;
        }
        
        .import-template-btn:hover,
        .export-template-btn:hover {
            background: #5a6268;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(108,117,125,0.25);
        }
        
        .email-templates-content {
            display: flex;
            flex-direction: row;
            gap: 25px;
            background: white;
            border-radius: 12px;
            padding: 30px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            min-height: 500px;
        }
        
        .templates-main-container {
            flex: 1;
            background: #ffffff;
            border-radius: 8px;
            border: 1px solid #e9ecef;
            padding: 20px;
        }
        
        .templates-sidebar {
            flex: 0 0 300px;
            background: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            border: 1px solid #e9ecef;
        }
        
        .templates-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
        }
        
        .template-card {
            background: white;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 20px;
            cursor: pointer;
            transition: all 0.2s ease;
            position: relative;
        }
        
        .template-card:hover {
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            transform: translateY(-2px);
        }
        
        .template-card.active {
            border-color: #007bff;
            box-shadow: 0 0 0 3px rgba(0,123,255,0.1);
        }
        
        .template-card-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 15px;
        }
        
        .template-name {
            font-size: 16px;
            font-weight: 600;
            color: #333;
            margin-bottom: 5px;
        }
        
        .template-subject {
            font-size: 14px;
            color: #6c757d;
            margin-bottom: 10px;
        }
        
        .template-to {
            font-size: 12px;
            color: #28a745;
            margin-bottom: 10px;
            font-style: italic;
            max-width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        
        .template-category {
            display: inline-block;
            background: #e9ecef;
            color: #495057;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
            text-transform: capitalize;
        }
        
        .template-actions {
            display: flex;
            gap: 8px;
        }
        
        .template-action-btn {
            background: none;
            border: none;
            cursor: pointer;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 14px;
            transition: all 0.2s ease;
        }
        
        .template-action-btn:hover {
            background: #f8f9fa;
        }
        
        .template-action-btn.edit {
            color: #007bff;
        }
        
        .template-action-btn.delete {
            color: #dc3545;
        }
        
        .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: #6c757d;
        }
        
        .empty-state-icon {
            font-size: 48px;
            margin-bottom: 20px;
            opacity: 0.5;
        }
        
        .empty-state h3 {
            margin: 0 0 10px 0;
            font-size: 20px;
            color: #495057;
        }
        
        .empty-state p {
            margin: 0 0 20px 0;
            font-size: 16px;
        }
        
        .sidebar-section {
            margin-bottom: 30px;
        }
        
        .sidebar-section h4 {
            margin: 0 0 15px 0;
            font-size: 16px;
            color: #333;
            font-weight: 600;
        }
        
        .category-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 12px;
            border-radius: 6px;
            cursor: pointer;
            transition: background-color 0.2s ease;
            margin-bottom: 5px;
        }
        
        .category-item:hover {
            background: #e9ecef;
        }
        
        .category-item.active {
            background: #007bff;
            color: white;
        }
        
        .category-count {
            background: #e9ecef;
            color: #6c757d;
            padding: 2px 6px;
            border-radius: 10px;
            font-size: 12px;
            font-weight: 500;
        }
        
        .category-item.active .category-count {
            background: rgba(255,255,255,0.2);
            color: white;
        }
        
        .quick-actions {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        
        .quick-action-btn {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 6px;
            padding: 10px 12px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .quick-action-btn:hover {
            background: #e9ecef;
        }
        
        .quick-action-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
    `;
    
    document.head.appendChild(style);
}

// Setup event listeners for email templates
function setupEmailTemplateEventListeners() {
    // Add New Template button
    const addTemplateBtn = document.querySelector('.add-template-btn');
    if (addTemplateBtn) {
        addTemplateBtn.addEventListener('click', () => {
            showTemplateModal();
        });
    }
    
    // Create First Template button (for empty state)
    const createFirstBtn = document.querySelector('.create-first-template-btn');
    if (createFirstBtn) {
        createFirstBtn.addEventListener('click', () => {
            showTemplateModal();
        });
    }
    
    // Template search
    const searchInput = document.getElementById('template-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            filterTemplates(searchTerm);
        });
    }
    
    // Import/Export buttons
    const importBtn = document.querySelector('.import-template-btn');
    const exportBtn = document.querySelector('.export-template-btn');
    
    if (importBtn) {
        importBtn.addEventListener('click', () => {
            // Create hidden file input
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.json';
            fileInput.style.display = 'none';
            
            fileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    importEmailTemplates(e.target.files[0]);
                }
                document.body.removeChild(fileInput);
            });
            
            document.body.appendChild(fileInput);
            fileInput.click();
        });
    }
    
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            exportEmailTemplates();
        });
    }
    
    // Category filter
    const categoryItems = document.querySelectorAll('.category-item');
    categoryItems.forEach(item => {
        item.addEventListener('click', () => {
            const categoryName = item.querySelector('.category-name').textContent;
            filterTemplatesByCategory(categoryName);
            
            // Update active state
            categoryItems.forEach(cat => cat.classList.remove('active'));
            item.classList.add('active');
        });
    });
    
    // Sidebar quick actions
    const quickActionBtns = document.querySelectorAll('.quick-action-btn');
    quickActionBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.dataset.action;
            handleQuickAction(action);
        });
    });
}

// Render email templates
export function renderEmailTemplates() {
    const templatesGrid = document.querySelector('.templates-grid');
    if (!templatesGrid) return;
    
    templatesGrid.innerHTML = '';
    
    if (state.emailTemplates.length === 0) {
        templatesGrid.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📧</div>
                <h3>No Email Templates Yet</h3>
                <p>Create your first email template to get started</p>
                <button class="add-email-template-btn">
                    <i class="fas fa-plus"></i> Create First Template
                </button>
            </div>
        `;
        
        // Re-attach event listener
        const createFirstBtn = templatesGrid.querySelector('.add-email-template-btn');
        if (createFirstBtn) {
            createFirstBtn.addEventListener('click', () => {
                showTemplateModal();
            });
        }
    } else {
        state.emailTemplates.forEach(template => {
            const templateCard = createTemplateCard(template);
            templatesGrid.appendChild(templateCard);
        });
    }
    
    updateCategoryCounts();
}

// Create template card
function createTemplateCard(template) {
    const card = document.createElement('div');
    card.className = 'template-card';
    card.dataset.templateId = template.id;
    
    const categoryLabel = TEMPLATE_CATEGORIES.find(cat => cat.value === template.category)?.label || template.category;
    
    card.innerHTML = `
        <div class="template-card-header">
            <div class="template-info">
                <div class="template-name">${template.name}</div>
                <div class="template-subject">${template.subject}</div>
                ${template.to ? `<div class="template-to">To: ${template.to}</div>` : ''}
            </div>
            <div class="template-actions">
                <button class="template-action-btn edit" data-id="${template.id}">✏️</button>
                <button class="template-action-btn delete" data-id="${template.id}">🗑️</button>
            </div>
        </div>
        <div class="template-category">${categoryLabel}</div>
    `;
    
    // Add event listeners
    const editBtn = card.querySelector('.edit');
    const deleteBtn = card.querySelector('.delete');
    
    editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showTemplateModal(template);
    });
    
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteTemplate(template.id);
    });
    
    // Add card selection handler
    card.addEventListener('click', () => {
        selectTemplate(template, card);
    });
    
    return card;
}

// Select template and update UI
function selectTemplate(template, cardElement) {
    selectedTemplate = template;
    
    // Update card selection visual state
    document.querySelectorAll('.template-card').forEach(card => {
        card.classList.remove('active');
    });
    cardElement.classList.add('active');
    
    // Update sidebar quick actions
    updateSidebarQuickActions();
}

// Update sidebar quick actions based on selected template
function updateSidebarQuickActions() {
    const previewBtn = document.querySelector('.quick-action-btn[data-action="preview"]');
    const duplicateBtn = document.querySelector('.quick-action-btn[data-action="duplicate"]');
    const sendTestBtn = document.querySelector('.quick-action-btn[data-action="send-test"]');
    
    if (selectedTemplate) {
        // Enable all actions
        if (previewBtn) previewBtn.disabled = false;
        if (duplicateBtn) duplicateBtn.disabled = false;
        if (sendTestBtn) sendTestBtn.disabled = false;
    } else {
        // Disable all actions
        if (previewBtn) previewBtn.disabled = true;
        if (duplicateBtn) duplicateBtn.disabled = true;
        if (sendTestBtn) sendTestBtn.disabled = true;
    }
}

// Handle quick action buttons
function handleQuickAction(action) {
    if (!selectedTemplate) {
        showNotification('Please select a template first', 'warning');
        return;
    }
    
    switch (action) {
        case 'preview':
            showTemplatePreview(selectedTemplate);
            break;
        case 'duplicate':
            duplicateTemplate(selectedTemplate);
            break;
        case 'send-test':
            showSendTestModal(selectedTemplate);
            break;
        default:
            console.warn('Unknown quick action:', action);
    }
}

// Duplicate template
function duplicateTemplate(template) {
    const duplicatedTemplate = {
        id: `template-${Date.now()}`,
        name: `${template.name} (Copy)`,
        category: template.category,
        to: template.to,
        subject: template.subject,
        body: template.body,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    state.emailTemplates.push(duplicatedTemplate);
    saveState();
    renderEmailTemplates();
    
    showNotification(`Template "${duplicatedTemplate.name}" duplicated successfully!`, 'success');
}

// Show send test modal (placeholder for now)
function showSendTestModal(template) {
    // This would show a modal to send a test email
    // For now, just show a notification
    showNotification(`Send test email feature coming soon for "${template.name}"`, 'info');
}

// Show template modal
function showTemplateModal(template = null) {
    let modal = document.getElementById('email-template-modal');
    
    if (!modal) {
        modal = createTemplateModal();
        document.body.appendChild(modal);
    }
    
    // Populate form if editing
    if (template) {
        document.getElementById('template-name').value = template.name;
        document.getElementById('template-category').value = template.category;
        document.getElementById('template-to').value = template.to || '';
        document.getElementById('template-subject').value = template.subject;
        document.getElementById('template-body').value = template.body;
        document.getElementById('template-modal-title').textContent = 'Edit Email Template';
        modal.dataset.editingId = template.id;
    } else {
        // Clear form for new template
        document.getElementById('template-form').reset();
        document.getElementById('template-modal-title').textContent = 'Create New Email Template';
        delete modal.dataset.editingId;
    }
    
    modal.style.display = 'flex';
    
    // Focus on name field
    setTimeout(() => {
        document.getElementById('template-name').focus();
    }, 100);
}

// Create template modal
function createTemplateModal() {
    const modal = document.createElement('div');
    modal.id = 'email-template-modal';
    modal.className = 'template-modal';
    
    const categoryOptions = TEMPLATE_CATEGORIES.map(cat => 
        `<option value="${cat.value}">${cat.label}</option>`
    ).join('');
    
    // Generate placeholder groups HTML
    const placeholderGroupsHTML = Object.entries(TEMPLATE_PLACEHOLDERS).map(([groupName, placeholders]) => `
        <div class="placeholder-group">
            <h5>${groupName.charAt(0).toUpperCase() + groupName.slice(1)}</h5>
            <div class="placeholder-items">
                ${placeholders.map(item => `
                    <div class="placeholder-item" data-placeholder="${item.placeholder}" title="${item.description}">
                        <span class="placeholder-text">${item.placeholder}</span>
                        <span class="placeholder-description">${item.description}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
    
    modal.innerHTML = `
        <div class="template-modal-content">
            <div class="template-modal-header">
                <h3 id="template-modal-title">Create New Email Template</h3>
                <button class="template-modal-close">&times;</button>
            </div>
            <div class="template-modal-layout">
                <div class="template-form-section">
                    <form id="template-form" class="template-form">
                        <div class="form-group">
                            <label for="template-name">Template Name *</label>
                            <input type="text" id="template-name" name="name" required>
                        </div>
                        <div class="form-group">
                            <label for="template-category">Category *</label>
                            <select id="template-category" name="category" required>
                                <option value="">Select category...</option>
                                ${categoryOptions}
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="template-to">To:</label>
                            <div class="recipient-input-wrapper">
                                <input type="text" id="template-to" name="to" placeholder="Enter recipient emails, separated by commas">
                                <button type="button" class="add-group-btn" id="add-from-groups-btn">Add from Groups</button>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="template-subject">Subject *</label>
                            <input type="text" id="template-subject" name="subject" required>
                        </div>
                        <div class="form-group">
                            <label for="template-body">Body *</label>
                            <textarea id="template-body" name="body" required rows="12"></textarea>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn-secondary cancel-btn">Cancel</button>
                            <button type="submit" class="btn-primary">Save Template</button>
                            <button type="button" class="btn-preview" id="preview-template-btn">Preview</button>
                        </div>
                    </form>
                </div>
                <div class="placeholder-panel">
                    <h4>Available Placeholders</h4>
                    <p class="placeholder-info">Click any placeholder to copy it to your clipboard</p>
                    <div class="placeholder-groups">
                        ${placeholderGroupsHTML}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add modal styles
    addTemplateModalCSS();
    
    // Add event listeners
    const closeBtn = modal.querySelector('.template-modal-close');
    const cancelBtn = modal.querySelector('.cancel-btn');
    const form = modal.querySelector('#template-form');
    const previewBtn = modal.querySelector('#preview-template-btn');
    
    closeBtn.addEventListener('click', () => hideTemplateModal());
    cancelBtn.addEventListener('click', () => hideTemplateModal());
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            hideTemplateModal();
        }
    });
    
    form.addEventListener('submit', handleTemplateSubmit);
    
    // Add from Groups button handler
    const addGroupBtn = modal.querySelector('#add-from-groups-btn');
    if (addGroupBtn) {
        addGroupBtn.addEventListener('click', () => {
            showGroupSelectionModal();
        });
    }
    
    // Preview button handler
    if (previewBtn) {
        previewBtn.addEventListener('click', () => {
            const formData = new FormData(form);
            const templateData = {
                name: formData.get('name'),
                category: formData.get('category'),
                to: formData.get('to'),
                subject: formData.get('subject'),
                body: formData.get('body')
            };
            
            if (templateData.name && templateData.subject && templateData.body) {
                showTemplatePreview(templateData);
            } else {
                showNotification('Please fill in all required fields before previewing', 'warning');
            }
        });
    }
    
    // Placeholder click handlers
    const placeholderItems = modal.querySelectorAll('.placeholder-item');
    placeholderItems.forEach(item => {
        item.addEventListener('click', () => {
            const placeholder = item.dataset.placeholder;
            
            // Copy to clipboard
            navigator.clipboard.writeText(placeholder).then(() => {
                item.classList.add('copied');
                showNotification(`${placeholder} copied to clipboard!`, 'success', 2000);
                
                setTimeout(() => {
                    item.classList.remove('copied');
                }, 1000);
            }).catch(err => {
                console.error('Failed to copy:', err);
                showNotification('Failed to copy placeholder', 'error');
            });
        });
    });
    
    return modal;
}

// Show template preview modal
function showTemplatePreview(templateData) {
    let modal = document.getElementById('template-preview-modal');
    
    if (!modal) {
        modal = createTemplatePreviewModal();
        document.body.appendChild(modal);
    }
    
    // Get available projects for context selection
    const projects = Object.keys(state.projectsData);
    
    const projectOptions = projects.length > 0 ? 
        projects.map(projectId => {
            const project = state.projectsData[projectId];
            return `<option value="${projectId}">${project.name || projectId}</option>`;
        }).join('') : 
        '<option value="">No projects available</option>';
    
    // Update modal content
    modal.querySelector('#preview-project-select').innerHTML = `
        <option value="">Select project for context (optional)</option>
        ${projectOptions}
    `;
    
    // Initial preview without context
    updatePreviewContent(templateData);
    
    modal.style.display = 'flex';
}

// Create template preview modal
function createTemplatePreviewModal() {
    const modal = document.createElement('div');
    modal.id = 'template-preview-modal';
    modal.className = 'template-modal';
    
    modal.innerHTML = `
        <div class="template-modal-content">
            <div class="template-modal-header">
                <h3>Template Preview</h3>
                <button class="template-modal-close" onclick="hideTemplatePreviewModal()">&times;</button>
            </div>
            <div class="preview-modal-body">
                <div class="preview-controls">
                    <div class="form-group">
                        <label for="preview-project-select">Preview with project context:</label>
                        <select id="preview-project-select">
                            <option value="">Select project for context (optional)</option>
                        </select>
                    </div>
                </div>
                <div class="preview-content">
                    <div class="preview-section">
                        <h4>To:</h4>
                        <div class="preview-to" id="preview-to"></div>
                    </div>
                    <div class="preview-section">
                        <h4>Subject:</h4>
                        <div class="preview-subject" id="preview-subject"></div>
                    </div>
                    <div class="preview-section">
                        <h4>Body:</h4>
                        <div class="preview-body" id="preview-body"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add event listeners
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            hideTemplatePreviewModal();
        }
    });
    
    const projectSelect = modal.querySelector('#preview-project-select');
    projectSelect.addEventListener('change', (e) => {
        const selectedProjectId = e.target.value;
        const templateData = modal.templateData;
        

        
        if (templateData) {
            updatePreviewContent(templateData, selectedProjectId);
        }
    });
    
    // Add preview modal CSS
    addTemplatePreviewModalCSS();
    
    // Add base template modal CSS for proper positioning
    addTemplateModalCSS();
    
    return modal;
}

// Update preview content with dynamic recipient resolution
function updatePreviewContent(templateData, projectId = null) {
    const modal = document.getElementById('template-preview-modal');
    if (!modal) return;
    
    // Store template data for project context switching
    modal.templateData = templateData;
    
    // Get context and resolve dynamic recipients
    const context = projectId ? getContextFromProject(projectId) : {};
    const recipientPreview = previewDynamicRecipients(templateData.to, projectId);
    
    const toElement = modal.querySelector('#preview-to');
    const subjectElement = modal.querySelector('#preview-subject');
    const bodyElement = modal.querySelector('#preview-body');
    
    // Handle recipients with dynamic tag resolution
    if (recipientPreview.tags.length > 0) {
        const originalTo = recipientPreview.original || '(No recipients specified)';
        const resolvedTo = recipientPreview.resolved || '(No recipients resolved)';
        
        toElement.innerHTML = `
            <div class="recipient-preview">
                <div class="original-recipients">
                    <strong>Template:</strong> ${originalTo}
                </div>
                ${projectId ? `
                    <div class="resolved-recipients">
                        <strong>Resolved for ${state.projectsData[projectId]?.name || projectId}:</strong> 
                        <span class="${recipientPreview.hasUnresolved ? 'unresolved-warning' : 'resolved-success'}">${resolvedTo}</span>
                    </div>
                ` : `
                    <div class="context-needed">
                        <em>Select a project to see resolved recipients</em>
                    </div>
                `}
            </div>
        `;
    } else {
        toElement.textContent = templateData.to || '(No recipients specified)';
    }
    
    const processedSubject = replacePlaceholders(templateData.subject, context);
    const processedBody = replacePlaceholders(templateData.body, context);
    
    subjectElement.textContent = processedSubject;
    bodyElement.innerHTML = processedBody.replace(/\n/g, '<br>');
}

// Hide template preview modal
function hideTemplatePreviewModal() {
    const modal = document.getElementById('template-preview-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Make preview functions globally accessible
window.hideTemplatePreviewModal = hideTemplatePreviewModal;
window.showTemplatePreview = showTemplatePreview;

// Add template preview modal CSS
function addTemplatePreviewModalCSS() {
    if (document.getElementById('template-preview-modal-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'template-preview-modal-styles';
    style.textContent = `
        .preview-modal-body {
            padding: 20px 30px;
            max-height: calc(90vh - 120px);
            overflow-y: auto;
        }
        
        .preview-controls {
            margin-bottom: 20px;
            padding-bottom: 20px;
            border-bottom: 1px solid #e9ecef;
        }
        
        .preview-controls .form-group {
            margin-bottom: 0;
        }
        
        .preview-controls label {
            display: block;
            margin-bottom: 5px;
            font-weight: 500;
            color: #333;
        }
        
        .preview-controls select {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
        }
        
        .preview-content {
            display: flex;
            flex-direction: column;
            gap: 20px;
        }
        
        .preview-section {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 6px;
            padding: 15px;
        }
        
        .preview-section h4 {
            margin: 0 0 10px 0;
            color: #333;
            font-size: 14px;
            font-weight: 600;
        }
        
        .preview-to {
            font-size: 14px;
            color: #333;
            background: white;
            padding: 10px;
            border-radius: 4px;
            border: 1px solid #ddd;
            font-style: italic;
        }
        
        .preview-subject {
            font-size: 16px;
            font-weight: 500;
            color: #333;
            background: white;
            padding: 10px;
            border-radius: 4px;
            border: 1px solid #ddd;
        }
        
        .preview-body {
            font-size: 14px;
            line-height: 1.5;
            color: #333;
            background: white;
            padding: 15px;
            border-radius: 4px;
            border: 1px solid #ddd;
            white-space: pre-wrap;
        }
        
        .recipient-preview {
            background: #f8f9fa;
            padding: 10px;
            border-radius: 5px;
            border: 1px solid #e9ecef;
            margin-bottom: 10px;
        }
        
        .original-recipients {
            margin-bottom: 8px;
            color: #495057;
        }
        
        .resolved-recipients {
            margin-bottom: 5px;
            color: #495057;
        }
        
        .resolved-success {
            color: #28a745;
            font-weight: 500;
        }
        
        .unresolved-warning {
            color: #dc3545;
            font-weight: 500;
        }
        
        .context-needed {
            color: #6c757d;
            font-style: italic;
            font-size: 14px;
        }
    `;
    
    document.head.appendChild(style);
}

// ==================== GROUP SELECTION MODAL ==================== //

// Show group selection modal
function showGroupSelectionModal() {
    let modal = document.getElementById('group-selection-modal');
    if (!modal) {
        modal = createGroupSelectionModal();
        document.body.appendChild(modal);
    }
    
    modal.style.display = 'flex';
    
    // Clear any previous state
    clearSelectedFilters();
    
    // Initialize modal content
    initializeGroupSelectionModal();
    
    // Show notification for current step
    showNotification('Advanced filter builder with saved groups ready! Save, load, and manage filter combinations.', 'info');
}

// Hide group selection modal
function hideGroupSelectionModal() {
    const modal = document.getElementById('group-selection-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Create group selection modal
function createGroupSelectionModal() {
    const modal = document.createElement('div');
    modal.id = 'group-selection-modal';
    modal.className = 'template-modal';
    
    modal.innerHTML = `
        <div class="template-modal-content group-selection-modal-content">
            <div class="template-modal-header">
                <h3>Build Recipient List from Groups</h3>
                <button class="template-modal-close" onclick="hideGroupSelectionModal()">&times;</button>
            </div>
            <div class="group-modal-body">
                <div class="recipient-preview-container">
                    <h4>Recipients Preview</h4>
                    <div class="recipient-summary">
                        <div id="recipient-summary-tags" class="recipient-summary-tags">
                            <span class="summary-tag">No filters selected</span>
                        </div>
                        <div class="recipient-summary-count">
                            Current selection: <span id="recipient-count">0</span> recipients
                        </div>
                    </div>
                    <div id="recipient-email-list" class="recipient-email-list">
                        <div class="placeholder-content">
                            <p>📧 Select filter tags to view contacts</p>
                            <p>Click on tags in the right panel to filter contacts.</p>
                        </div>
                    </div>
                    <div class="staged-recipients-summary">
                        <h4>Staged for Adding</h4>
                        <div>Total unique recipients: <span id="staged-recipient-count">0</span></div>
                    </div>
                </div>
                <div class="filter-builder-container">
                    <div class="filter-dropzone-wrapper">
                        <div class="filter-logic-controls">
                            <label>Selected Filters (Contacts must match)</label>
                            <div class="logic-selector">
                                <label class="logic-option">
                                    <input type="radio" name="filter-logic" value="and" checked>
                                    <span>ALL</span>
                                </label>
                                <label class="logic-option">
                                    <input type="radio" name="filter-logic" value="or">
                                    <span>ANY</span>
                                </label>
                            </div>
                        </div>
                        <div id="selected-filters-dropzone" class="filter-dropzone">
                            <span class="dropzone-placeholder">Click or drag tags here</span>
                        </div>
                        <div class="filter-actions">
                            <button id="clear-filters-btn" class="btn-clear">Clear All</button>
                        </div>
                    </div>
                    <div class="available-tags-wrapper">
                        <div class="available-tags-header">
                            <label>Available Filter Tags</label>
                            <input type="text" id="filter-tag-search" placeholder="Search tags...">
                        </div>
                        <div id="available-filter-tags" class="available-filter-tags">
                            <div class="loading-message">Loading filter tags...</div>
                        </div>
                    </div>
                    <div class="saved-groups-wrapper">
                        <div class="saved-groups-header">
                            <label for="saved-groups-dropdown">Saved Filter Groups</label>
                            <div class="saved-groups-stats" id="saved-groups-stats">
                                <span id="groups-count">0 groups</span>
                            </div>
                        </div>
                        <div class="saved-groups-controls">
                            <select id="saved-groups-dropdown">
                                <option value="">Select a saved group...</option>
                            </select>
                            <button id="save-current-filters-btn" class="btn-secondary">Save Current</button>
                            <button id="delete-selected-group-btn" class="btn-danger" style="display:none;">Delete</button>
                        </div>
                        <div class="saved-groups-actions">
                            <button id="export-groups-btn" class="btn-tertiary">Export Groups</button>
                            <button id="import-groups-btn" class="btn-tertiary">Import Groups</button>
                            <input type="file" id="import-groups-file" accept=".json" style="display:none;">
                        </div>
                    </div>
                    <div class="apply-filters-wrapper">
                        <button id="stage-recipients-btn" class="btn-primary">Stage These Recipients</button>
                    </div>
                </div>
            </div>
            <div class="template-modal-footer">
                <button type="button" class="btn-secondary" id="cancel-group-modal-btn">Cancel</button>
                <button type="button" class="btn-primary" id="done-adding-recipients-btn">Done & Add Recipients</button>
            </div>
        </div>
    `;
    
    // Add CSS for the group modal
    addGroupModalCSS();
    
    // Add event listeners
    modal.querySelector('.template-modal-close').addEventListener('click', hideGroupSelectionModal);
    modal.querySelector('#cancel-group-modal-btn').addEventListener('click', hideGroupSelectionModal);
    modal.querySelector('#done-adding-recipients-btn').addEventListener('click', handleDoneAddingRecipients);
    modal.querySelector('#stage-recipients-btn').addEventListener('click', handleStageRecipients);
    modal.querySelector('#save-current-filters-btn').addEventListener('click', handleSaveCurrentFilters);
    modal.querySelector('#saved-groups-dropdown').addEventListener('change', handleLoadSavedGroup);
    modal.querySelector('#delete-selected-group-btn').addEventListener('click', handleDeleteSelectedGroup);
    modal.querySelector('#filter-tag-search').addEventListener('input', handleFilterTagSearch);
    modal.querySelector('#clear-filters-btn').addEventListener('click', clearSelectedFilters);
    
    // Export/Import handlers
    modal.querySelector('#export-groups-btn').addEventListener('click', exportFilterGroups);
    modal.querySelector('#import-groups-btn').addEventListener('click', () => {
        modal.querySelector('#import-groups-file').click();
    });
    modal.querySelector('#import-groups-file').addEventListener('change', handleImportFile);
    
    // Add logic selector handlers
    modal.querySelectorAll('input[name="filter-logic"]').forEach(radio => {
        radio.addEventListener('change', handleLogicChange);
    });
    
    // Setup drag and drop for the dropzone
    setupDropzone();
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            hideGroupSelectionModal();
        }
    });
    
    return modal;
}

// Initialize group selection modal content
function initializeGroupSelectionModal() {
    // Update recipient count
    document.getElementById('recipient-count').textContent = '0';
    document.getElementById('staged-recipient-count').textContent = '0';
    
    // Clear any existing filters
    const dropzone = document.getElementById('selected-filters-dropzone');
    if (dropzone) {
        dropzone.innerHTML = '<span class="dropzone-placeholder">Click or drag tags here</span>';
    }
    
    // Populate with real contact data
    populateAvailableFilterTags();
    
    // Initialize saved groups
    populateSavedGroupsDropdown();
    updateSavedGroupsInfo();
    
    // Load saved filter state
    loadFilterState();
    
    // Initialize radio button styling
    updateLogicRadioStyling();
    
    // Update recipient preview (if no saved state, this will show all contacts)
    updateRecipientPreview();
}

// Placeholder event handlers for Step 2
function handleDoneAddingRecipients() {
    const filteredContacts = getFilteredContacts();
    
    if (filteredContacts.length === 0 && selectedFilters.length === 0) {
        showNotification('No contacts or filters selected to add to template', 'warning');
        return;
    }
    
    // Check if we should create dynamic recipient tags
    const dynamicRecipients = createDynamicRecipientTags();
    
    if (dynamicRecipients.length > 0) {
        addDynamicRecipientsToTemplate(dynamicRecipients);
    } else if (filteredContacts.length > 0) {
        // Fallback to static recipients
        addStaticRecipientsToTemplate(filteredContacts);
    }
    
    hideGroupSelectionModal();
}

function handleStageRecipients() {
    const filteredContacts = getFilteredContacts();
    const dynamicTags = createDynamicRecipientTags();
    
    if (filteredContacts.length === 0 && dynamicTags.length === 0) {
        showNotification('No contacts or dynamic tags to stage', 'warning');
        return;
    }
    
    // Update staged count
    const stagedCount = document.getElementById('staged-recipient-count');
    if (stagedCount) {
        if (dynamicTags.length > 0) {
            stagedCount.textContent = `${dynamicTags.length} dynamic tag${dynamicTags.length > 1 ? 's' : ''}`;
        } else {
            stagedCount.textContent = filteredContacts.length;
        }
    }
    
    if (dynamicTags.length > 0) {
        const tagList = dynamicTags.map(tag => tag.tag).join(', ');
        showNotification(`Staged dynamic tags: ${tagList}`, 'success');
    } else {
        showNotification(`${filteredContacts.length} static recipients staged for adding.`, 'info');
    }
}

function handleSaveCurrentFilters() {
    if (selectedFilters.length === 0) {
        showNotification('No filters selected to save', 'warning');
        return;
    }
    
    const groupName = prompt('Enter name for this filter group:');
    if (!groupName) return;
    
    if (saveFilterGroup(groupName)) {
        // Update the UI to show the saved group count
        updateSavedGroupsInfo();
    }
}

function handleLoadSavedGroup(e) {
    const groupId = e.target.value;
    loadFilterGroup(groupId);
    
    // Update delete button visibility
    const deleteBtn = document.getElementById('delete-selected-group-btn');
    if (deleteBtn) {
        deleteBtn.style.display = groupId ? 'block' : 'none';
    }
}

function handleDeleteSelectedGroup() {
    const deleteBtn = document.getElementById('delete-selected-group-btn');
    const groupId = deleteBtn ? deleteBtn.dataset.groupId : '';
    
    if (groupId) {
        deleteFilterGroup(groupId);
        
        // Clear the selection
        clearSelectedFilters();
        
        // Update the UI
        updateSavedGroupsInfo();
    }
}

function handleFilterTagSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    const container = document.getElementById('available-filter-tags');
    
    if (!container) return;
    
    const allTags = container.querySelectorAll('.filter-tag');
    const allCategories = container.querySelectorAll('.filter-tag-category');
    
    if (searchTerm.trim() === '') {
        // Show all tags and categories
        allTags.forEach(tag => tag.style.display = 'block');
        allCategories.forEach(category => category.style.display = 'block');
        return;
    }
    
    // Filter tags based on search term
    allTags.forEach(tag => {
        const tagText = tag.textContent.toLowerCase();
        const shouldShow = tagText.includes(searchTerm);
        tag.style.display = shouldShow ? 'block' : 'none';
    });
    
    // Hide categories that have no visible tags
    allCategories.forEach(category => {
        const visibleTags = category.querySelectorAll('.filter-tag[style*="block"], .filter-tag:not([style*="none"])');
        const hasVisibleTags = Array.from(visibleTags).some(tag => tag.style.display !== 'none');
        category.style.display = hasVisibleTags ? 'block' : 'none';
    });
}

function handleFilterTagClick(e) {
    const tagText = e.target.textContent;
    const tagType = e.target.dataset.type;
    const tagValue = e.target.dataset.value;
    
    // Add this tag to the selected filters
    addFilterTag(tagType, tagValue);
    
    // Update recipient preview
    updateRecipientPreview();
}

// ==================== CONTACT INTEGRATION FUNCTIONS ==================== //

// Get unique values from contacts for filter tags
function getUniqueContactValues(field) {
    const values = new Set();
    
    if (!state.contacts || !Array.isArray(state.contacts)) {
        return Array.from(values);
    }
    
    state.contacts.forEach(contact => {
        if (field === 'projects' && contact.projects) {
            contact.projects.forEach(project => {
                if (project && project.trim()) {
                    values.add(project.trim());
                }
            });
        } else if (contact[field] && contact[field].trim()) {
            values.add(contact[field].trim());
        }
    });
    
    return Array.from(values).sort();
}

// Populate available filter tags with real contact data
function populateAvailableFilterTags() {
    const container = document.getElementById('available-filter-tags');
    if (!container) return;
    
    // Get unique values from contacts
    const projects = getUniqueContactValues('projects');
    const companies = getUniqueContactValues('company');
    const positions = getUniqueContactValues('position');
    
    // Create HTML for each category
    const createCategoryHtml = (title, tags, type) => {
        if (tags.length === 0) return '';
        
        const tagsHtml = tags.map(tag => 
            `<div class="filter-tag" data-type="${type}" data-value="${tag}">${tag}</div>`
        ).join('');
        
        return `
            <div class="filter-tag-category">
                <h5>${title}</h5>
                <div class="tags-container">
                    ${tagsHtml}
                </div>
            </div>
        `;
    };
    
    // Build the complete HTML
    container.innerHTML = `
        ${createCategoryHtml('Projects', projects, 'project')}
        ${createCategoryHtml('Companies', companies, 'company')}
        ${createCategoryHtml('Positions', positions, 'position')}
    `;
    
    // Add click and drag handlers to the new tags
    container.querySelectorAll('.filter-tag').forEach(tag => {
        tag.addEventListener('click', handleFilterTagClick);
        setupDragAndDrop(tag);
    });
}

// Track selected filters and filter logic
let selectedFilters = [];
let filterLogic = 'and'; // 'and' or 'or'

// Saved filter groups storage key
const SAVED_GROUPS_KEY = 'emailTemplateFilterGroups';

// Add filter tag to selected filters
function addFilterTag(type, value) {
    // Check if already selected
    const existingFilter = selectedFilters.find(f => f.type === type && f.value === value);
    if (existingFilter) {
        showNotification(`Filter "${value}" is already selected`, 'warning');
        return;
    }
    
    // Add to selected filters
    selectedFilters.push({ type, value });
    
    // Update the dropzone display
    updateSelectedFiltersDropzone();
    
    // Auto-save filter state
    autoSaveFilterState();
    
    showNotification(`Added filter: ${value}`, 'success');
}

// Update the selected filters dropzone
function updateSelectedFiltersDropzone() {
    const dropzone = document.getElementById('selected-filters-dropzone');
    if (!dropzone) return;
    
    if (selectedFilters.length === 0) {
        dropzone.innerHTML = '<span class="dropzone-placeholder">Click or drag tags here</span>';
        return;
    }
    
    const filtersHtml = selectedFilters.map((filter, index) => `
        <div class="selected-filter-tag" data-index="${index}">
            ${filter.value}
            <span class="remove-filter" data-index="${index}">×</span>
        </div>
    `).join('');
    
    dropzone.innerHTML = filtersHtml;
    
    // Add remove handlers
    dropzone.querySelectorAll('.remove-filter').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            selectedFilters.splice(index, 1);
            updateSelectedFiltersDropzone();
            updateRecipientPreview();
            autoSaveFilterState();
        });
    });
}



// Clear selected filters
function clearSelectedFilters() {
    selectedFilters = [];
    updateSelectedFiltersDropzone();
    updateRecipientPreview();
    showNotification('All filters cleared', 'info');
}

// ==================== DRAG AND DROP FUNCTIONALITY ==================== //

// Setup drag and drop for filter tags
function setupDragAndDrop(tag) {
    tag.draggable = true;
    tag.addEventListener('dragstart', handleDragStart);
    tag.addEventListener('dragend', handleDragEnd);
}

// Setup dropzone for drag and drop
function setupDropzone() {
    const dropzone = document.getElementById('selected-filters-dropzone');
    if (!dropzone) return;
    
    dropzone.addEventListener('dragover', handleDragOver);
    dropzone.addEventListener('drop', handleDrop);
    dropzone.addEventListener('dragleave', handleDragLeave);
}

// Drag start handler
function handleDragStart(e) {
    e.dataTransfer.setData('text/plain', JSON.stringify({
        type: e.target.dataset.type,
        value: e.target.dataset.value
    }));
    e.target.classList.add('dragging');
}

// Drag end handler
function handleDragEnd(e) {
    e.target.classList.remove('dragging');
}

// Drag over handler
function handleDragOver(e) {
    e.preventDefault();
    const dropzone = document.getElementById('selected-filters-dropzone');
    if (dropzone) {
        dropzone.classList.add('drag-over');
    }
}

// Drag leave handler
function handleDragLeave(e) {
    const dropzone = document.getElementById('selected-filters-dropzone');
    if (dropzone && !dropzone.contains(e.relatedTarget)) {
        dropzone.classList.remove('drag-over');
    }
}

// Drop handler
function handleDrop(e) {
    e.preventDefault();
    const dropzone = document.getElementById('selected-filters-dropzone');
    if (dropzone) {
        dropzone.classList.remove('drag-over');
    }
    
    try {
        const data = JSON.parse(e.dataTransfer.getData('text/plain'));
        addFilterTag(data.type, data.value);
    } catch (error) {
        console.error('Error parsing drag data:', error);
    }
}

// ==================== ENHANCED FILTER LOGIC ==================== //

// Handle filter logic change (AND/OR)
function handleLogicChange(e) {
    filterLogic = e.target.value;
    updateRecipientPreview();
    autoSaveFilterState();
    
    // Update visual styling for radio buttons
    updateLogicRadioStyling();
    
    showNotification(`Filter logic changed to: ${filterLogic.toUpperCase()}`, 'info');
}

// Update logic radio button styling
function updateLogicRadioStyling() {
    const radioButtons = document.querySelectorAll('input[name="filter-logic"]');
    radioButtons.forEach(radio => {
        const span = radio.parentElement.querySelector('span');
        if (span) {
            if (radio.checked) {
                span.style.backgroundColor = '#007bff';
                span.style.color = 'white';
            } else {
                span.style.backgroundColor = 'transparent';
                span.style.color = 'inherit';
            }
        }
    });
}

// Enhanced filter function with AND/OR logic
function getFilteredContacts() {
    if (!state.contacts || !Array.isArray(state.contacts)) {
        return [];
    }
    
    if (selectedFilters.length === 0) {
        return state.contacts.filter(contact => contact.email && contact.email.trim());
    }
    
    return state.contacts.filter(contact => {
        if (!contact.email || !contact.email.trim()) return false;
        
        if (filterLogic === 'and') {
            // Contact must match ALL selected filters
            return selectedFilters.every(filter => contactMatchesFilter(contact, filter));
        } else {
            // Contact must match ANY selected filter
            return selectedFilters.some(filter => contactMatchesFilter(contact, filter));
        }
    });
}

// Check if contact matches a specific filter
function contactMatchesFilter(contact, filter) {
    switch (filter.type) {
        case 'project':
            return contact.projects && contact.projects.includes(filter.value);
        case 'company':
            return contact.company === filter.value;
        case 'position':
            return contact.position === filter.value;
        default:
            return false;
    }
}

// Enhanced update recipient preview with logic indicator and dynamic tags
function updateRecipientPreview() {
    const recipientList = document.getElementById('recipient-email-list');
    const recipientCount = document.getElementById('recipient-count');
    const summaryTags = document.getElementById('recipient-summary-tags');
    
    if (!recipientList || !recipientCount || !summaryTags) return;
    
    // Check for dynamic tags first
    const dynamicTags = createDynamicRecipientTags();
    const filteredContacts = getFilteredContacts();
    
    // Update summary tags with logic indicator
    if (selectedFilters.length === 0) {
        summaryTags.innerHTML = '<span class="summary-tag">No filters selected</span>';
    } else {
        const logicIndicator = selectedFilters.length > 1 ? 
            `<span class="logic-indicator">${filterLogic.toUpperCase()}</span>` : '';
        
        const tagsHtml = selectedFilters.map((filter, index) => {
            const separator = index > 0 ? logicIndicator : '';
            return `${separator}<span class="summary-tag">${filter.value}</span>`;
        }).join('');
        
        summaryTags.innerHTML = tagsHtml;
    }
    
    // Show dynamic tags if available, otherwise show static contacts
    if (dynamicTags.length > 0) {
        // Update count for dynamic tags
        recipientCount.innerHTML = `<span class="dynamic-indicator">Dynamic</span> ${dynamicTags.length} tag${dynamicTags.length > 1 ? 's' : ''}`;
        
        // Show dynamic tags preview
        const dynamicTagsHtml = dynamicTags.map(tag => `
            <div class="recipient-item dynamic-recipient">
                <div class="recipient-info">
                    <div class="recipient-name dynamic-tag">${tag.tag}</div>
                    <div class="recipient-description">${tag.description}</div>
                    <div class="recipient-details">
                        <span class="dynamic-type">${tag.type}</span>
                        <span class="context-note">Resolves when template is used in project context</span>
                    </div>
                </div>
            </div>
        `).join('');
        
        recipientList.innerHTML = `
            <div class="dynamic-recipients-header">
                <h5>🏷️ Dynamic Recipient Tags</h5>
                <p>These tags will resolve to actual email addresses when the template is used in a project context.</p>
            </div>
            ${dynamicTagsHtml}
        `;
    } else {
        // Update count for static contacts
        recipientCount.textContent = filteredContacts.length;
        
        // Show static contacts
        if (filteredContacts.length === 0) {
            recipientList.innerHTML = `
                <div class="placeholder-content">
                    <p>📧 No contacts match the selected filters</p>
                    <p>Try adjusting your filter selection or changing the logic to "ANY".</p>
                    <p><strong>Tip:</strong> Select position-based filters to create dynamic recipient tags!</p>
                </div>
            `;
        } else {
            const contactsHtml = filteredContacts.map(contact => `
                <div class="recipient-item static-recipient">
                    <div class="recipient-info">
                        <div class="recipient-name">${contact.name}</div>
                        <div class="recipient-email">${contact.email}</div>
                        <div class="recipient-details">
                            ${contact.position ? `<span class="recipient-position">${contact.position}</span>` : ''}
                            ${contact.company ? `<span class="recipient-company">${contact.company}</span>` : ''}
                            ${contact.projects ? `<span class="recipient-projects">${contact.projects.join(', ')}</span>` : ''}
                        </div>
                    </div>
                </div>
            `).join('');
            
            recipientList.innerHTML = `
                <div class="static-recipients-header">
                    <h5>📧 Static Recipients</h5>
                    <p>These specific email addresses will be added to the template.</p>
                </div>
                ${contactsHtml}
            `;
        }
    }
}

// ==================== FILTER PERSISTENCE ==================== //

// Save current filter state
function saveFilterState() {
    const filterState = {
        selectedFilters: selectedFilters,
        filterLogic: filterLogic,
        timestamp: new Date().toISOString()
    };
    
    localStorage.setItem('emailTemplateFilterState', JSON.stringify(filterState));
}

// Load saved filter state
function loadFilterState() {
    try {
        const savedState = localStorage.getItem('emailTemplateFilterState');
        if (savedState) {
            const filterState = JSON.parse(savedState);
            
            // Check if state is recent (within 1 hour)
            const stateAge = Date.now() - new Date(filterState.timestamp).getTime();
            if (stateAge < 3600000) { // 1 hour in milliseconds
                selectedFilters = filterState.selectedFilters || [];
                filterLogic = filterState.filterLogic || 'and';
                
                // Update UI
                updateSelectedFiltersDropzone();
                updateRecipientPreview();
                
                // Set logic radio button
                const logicRadio = document.querySelector(`input[name="filter-logic"][value="${filterLogic}"]`);
                if (logicRadio) {
                    logicRadio.checked = true;
                    updateLogicRadioStyling();
                }
            }
        }
    } catch (error) {
        console.error('Error loading filter state:', error);
    }
}

// Auto-save filter state when it changes
function autoSaveFilterState() {
    saveFilterState();
}

// ==================== SAVED FILTER GROUPS ==================== //

// Get saved filter groups from localStorage
function getSavedFilterGroups() {
    try {
        const groups = localStorage.getItem(SAVED_GROUPS_KEY);
        return groups ? JSON.parse(groups) : {};
    } catch (error) {
        console.error('Error loading saved filter groups:', error);
        return {};
    }
}

// Save filter groups to localStorage
function saveSavedFilterGroups(groups) {
    try {
        localStorage.setItem(SAVED_GROUPS_KEY, JSON.stringify(groups));
    } catch (error) {
        console.error('Error saving filter groups:', error);
    }
}

// Save current filter selection as a group
function saveFilterGroup(groupName) {
    if (!groupName || !groupName.trim()) {
        showNotification('Please enter a valid group name', 'warning');
        return false;
    }
    
    if (selectedFilters.length === 0) {
        showNotification('No filters selected to save', 'warning');
        return false;
    }
    
    const groups = getSavedFilterGroups();
    const groupId = `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    groups[groupId] = {
        id: groupId,
        name: groupName.trim(),
        filters: [...selectedFilters],
        logic: filterLogic,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    saveSavedFilterGroups(groups);
    populateSavedGroupsDropdown();
    showNotification(`Filter group "${groupName}" saved successfully!`, 'success');
    
    return true;
}

// Load a saved filter group
function loadFilterGroup(groupId) {
    if (!groupId) {
        clearSelectedFilters();
        return;
    }
    
    const groups = getSavedFilterGroups();
    const group = groups[groupId];
    
    if (!group) {
        showNotification('Filter group not found', 'error');
        return;
    }
    
    // Load filters and logic
    selectedFilters = [...group.filters];
    filterLogic = group.logic || 'and';
    
    // Update UI
    updateSelectedFiltersDropzone();
    updateRecipientPreview();
    
    // Set logic radio button
    const logicRadio = document.querySelector(`input[name="filter-logic"][value="${filterLogic}"]`);
    if (logicRadio) {
        logicRadio.checked = true;
        updateLogicRadioStyling();
    }
    
    // Show delete button
    const deleteBtn = document.getElementById('delete-selected-group-btn');
    if (deleteBtn) {
        deleteBtn.style.display = 'block';
        deleteBtn.dataset.groupId = groupId;
    }
    
    showNotification(`Loaded filter group "${group.name}"`, 'success');
}

// Delete a saved filter group
function deleteFilterGroup(groupId) {
    if (!groupId) return;
    
    const groups = getSavedFilterGroups();
    const group = groups[groupId];
    
    if (!group) {
        showNotification('Filter group not found', 'error');
        return;
    }
    
    if (confirm(`Are you sure you want to delete the filter group "${group.name}"?`)) {
        delete groups[groupId];
        saveSavedFilterGroups(groups);
        populateSavedGroupsDropdown();
        
        // Hide delete button and reset dropdown
        const deleteBtn = document.getElementById('delete-selected-group-btn');
        const dropdown = document.getElementById('saved-groups-dropdown');
        if (deleteBtn) {
            deleteBtn.style.display = 'none';
            deleteBtn.dataset.groupId = '';
        }
        if (dropdown) {
            dropdown.value = '';
        }
        
        showNotification(`Filter group "${group.name}" deleted`, 'success');
    }
}

// Populate the saved groups dropdown
function populateSavedGroupsDropdown() {
    const dropdown = document.getElementById('saved-groups-dropdown');
    if (!dropdown) return;
    
    const groups = getSavedFilterGroups();
    const groupIds = Object.keys(groups);
    
    // Clear existing options (except the default)
    dropdown.innerHTML = '<option value="">Select a saved group...</option>';
    
    if (groupIds.length === 0) {
        dropdown.innerHTML += '<option value="" disabled>No saved groups</option>';
        return;
    }
    
    // Add options for each group
    groupIds.forEach(groupId => {
        const group = groups[groupId];
        const option = document.createElement('option');
        option.value = groupId;
        option.textContent = `${group.name} (${group.filters.length} filters)`;
        dropdown.appendChild(option);
    });
}

// Export filter groups to JSON file
function exportFilterGroups() {
    const groups = getSavedFilterGroups();
    const groupIds = Object.keys(groups);
    
    if (groupIds.length === 0) {
        showNotification('No filter groups to export', 'warning');
        return;
    }
    
    const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        groups: groups
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `email-template-filter-groups-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    showNotification(`Exported ${groupIds.length} filter groups`, 'success');
}

// Import filter groups from JSON file
function importFilterGroups(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importData = JSON.parse(e.target.result);
            
            // Validate import data
            if (!importData.groups || typeof importData.groups !== 'object') {
                throw new Error('Invalid file format');
            }
            
            const existingGroups = getSavedFilterGroups();
            const importedGroups = importData.groups;
            const importedGroupIds = Object.keys(importedGroups);
            
            let importedCount = 0;
            let skippedCount = 0;
            
            // Process each imported group
            importedGroupIds.forEach(groupId => {
                const group = importedGroups[groupId];
                
                // Check if group with same name already exists
                const existingGroup = Object.values(existingGroups).find(g => g.name === group.name);
                
                if (existingGroup) {
                    // Skip if exact same filters and logic
                    if (JSON.stringify(existingGroup.filters) === JSON.stringify(group.filters) &&
                        existingGroup.logic === group.logic) {
                        skippedCount++;
                        return;
                    }
                    
                    // Otherwise, create with modified name
                    const timestamp = new Date().toISOString().split('T')[0];
                    group.name = `${group.name} (imported ${timestamp})`;
                }
                
                // Generate new ID to avoid conflicts
                const newId = `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                existingGroups[newId] = {
                    ...group,
                    id: newId,
                    updatedAt: new Date().toISOString()
                };
                
                importedCount++;
            });
            
            // Save updated groups
            saveSavedFilterGroups(existingGroups);
            populateSavedGroupsDropdown();
            
            const message = `Import complete: ${importedCount} groups imported${skippedCount > 0 ? `, ${skippedCount} skipped` : ''}`;
            showNotification(message, 'success');
            
        } catch (error) {
            console.error('Import error:', error);
            showNotification('Error importing filter groups. Please check the file format.', 'error');
        }
    };
    
    reader.readAsText(file);
}

// Get filter group statistics
function getFilterGroupStats() {
    const groups = getSavedFilterGroups();
    const groupIds = Object.keys(groups);
    
    if (groupIds.length === 0) {
        return { total: 0, summary: 'No saved groups' };
    }
    
    const stats = {
        total: groupIds.length,
        byLogic: { and: 0, or: 0 },
        byFilterCount: {},
        mostRecent: null
    };
    
    groupIds.forEach(groupId => {
        const group = groups[groupId];
        
        // Count by logic
        stats.byLogic[group.logic]++;
        
        // Count by filter count
        const filterCount = group.filters.length;
        stats.byFilterCount[filterCount] = (stats.byFilterCount[filterCount] || 0) + 1;
        
        // Find most recent
        if (!stats.mostRecent || new Date(group.updatedAt) > new Date(stats.mostRecent.updatedAt)) {
            stats.mostRecent = group;
        }
    });
    
    return stats;
}

// Handle file import
function handleImportFile(e) {
    const file = e.target.files[0];
    if (file) {
        importFilterGroups(file);
        // Reset the file input
        e.target.value = '';
    }
}

// Update saved groups info display
function updateSavedGroupsInfo() {
    const stats = getFilterGroupStats();
    const groupsCount = document.getElementById('groups-count');
    
    if (groupsCount) {
        groupsCount.textContent = `${stats.total} groups`;
    }
    
    // Update export button state
    const exportBtn = document.getElementById('export-groups-btn');
    if (exportBtn) {
        exportBtn.disabled = stats.total === 0;
    }
}

// ==================== DYNAMIC RECIPIENT SYSTEM ==================== //

// Create dynamic recipient tags based on selected filters
function createDynamicRecipientTags() {
    const dynamicTags = [];
    
    // Check if we have position filters that should become dynamic tags
    const positionFilters = selectedFilters.filter(f => f.type === 'position');
    const projectFilters = selectedFilters.filter(f => f.type === 'project');
    const companyFilters = selectedFilters.filter(f => f.type === 'company');
    
    if (positionFilters.length > 0) {
        // Create position-based dynamic tags
        positionFilters.forEach(filter => {
            dynamicTags.push({
                type: 'position',
                value: filter.value,
                tag: `{{${filter.value}}}`,
                description: `All contacts with position "${filter.value}" in the current project`
            });
        });
        
        // If we also have project filters, create project-specific position tags
        if (projectFilters.length > 0) {
            positionFilters.forEach(positionFilter => {
                projectFilters.forEach(projectFilter => {
                    dynamicTags.push({
                        type: 'project-position',
                        position: positionFilter.value,
                        project: projectFilter.value,
                        tag: `{{${positionFilter.value} - ${projectFilter.value}}}`,
                        description: `All contacts with position "${positionFilter.value}" in project "${projectFilter.value}"`
                    });
                });
            });
        }
    } else if (projectFilters.length > 0) {
        // Create project-based dynamic tags (all contacts from project)
        projectFilters.forEach(filter => {
            dynamicTags.push({
                type: 'project',
                value: filter.value,
                tag: `{{Project: ${filter.value}}}`,
                description: `All contacts from project "${filter.value}"`
            });
        });
    } else if (companyFilters.length > 0) {
        // Create company-based dynamic tags
        companyFilters.forEach(filter => {
            dynamicTags.push({
                type: 'company',
                value: filter.value,
                tag: `{{Company: ${filter.value}}}`,
                description: `All contacts from company "${filter.value}"`
            });
        });
    }
    
    return dynamicTags;
}

// Add dynamic recipient tags to the template
function addDynamicRecipientsToTemplate(dynamicTags) {
    // Get the current template modal
    const modal = document.getElementById('email-template-modal');
    if (!modal) {
        showNotification('Template modal not found', 'error');
        return;
    }
    
    const toField = modal.querySelector('#template-to');
    if (!toField) {
        showNotification('Template "To" field not found', 'error');
        return;
    }
    
    // Get existing recipients
    const existingRecipients = toField.value.trim();
    const newTags = dynamicTags.map(tag => tag.tag);
    
    // Combine existing and new recipients
    const allRecipients = existingRecipients ? 
        [existingRecipients, ...newTags].join(', ') : 
        newTags.join(', ');
    
    toField.value = allRecipients;
    
    // Show success message with details
    const tagDescriptions = dynamicTags.map(tag => `${tag.tag}: ${tag.description}`).join('\n');
    const message = `Added ${dynamicTags.length} dynamic recipient tag${dynamicTags.length > 1 ? 's' : ''}:\n${tagDescriptions}`;
    
    showNotification(`Dynamic recipient tags added successfully!`, 'success');
    console.log(message); // For detailed info in console
    console.log('Updated To field value:', allRecipients); // Debug log
}

// Add static recipients to the template (fallback)
function addStaticRecipientsToTemplate(contacts) {
    const modal = document.getElementById('email-template-modal');
    if (!modal) {
        showNotification('Template modal not found', 'error');
        return;
    }
    
    const toField = modal.querySelector('#template-to');
    if (!toField) {
        showNotification('Template "To" field not found', 'error');
        return;
    }
    
    // Get existing recipients
    const existingRecipients = toField.value.trim();
    const newEmails = contacts.map(contact => contact.email);
    
    // Combine existing and new recipients
    const allRecipients = existingRecipients ? 
        [existingRecipients, ...newEmails].join(', ') : 
        newEmails.join(', ');
    
    toField.value = allRecipients;
    
    const preview = allRecipients.length > 100 ? allRecipients.substring(0, 100) + '...' : allRecipients;
    showNotification(`Added ${contacts.length} static recipients: ${preview}`, 'success');
}

// Resolve dynamic recipient tags for a specific project context
function resolveDynamicRecipients(recipientString, projectId) {
    if (!recipientString || !projectId) {
        return recipientString;
    }
    
    let resolvedRecipients = recipientString;
    
    // Find all dynamic tags in the recipient string
    const dynamicTagPattern = /\{\{([^}]+)\}\}/g;
    const matches = [...recipientString.matchAll(dynamicTagPattern)];
    
    if (matches.length === 0) {
        return recipientString; // No dynamic tags found
    }
    
    // Get project data
    const project = state.projectsData[projectId];
    if (!project || !project.quickInfoContacts?.contacts) {
        console.warn(`No contacts found for project ${projectId}`);
        return recipientString;
    }
    
    const projectContacts = project.quickInfoContacts.contacts;
    
    matches.forEach(match => {
        const fullTag = match[0]; // e.g., "{{Client Contact}}"
        const tagContent = match[1]; // e.g., "Client Contact"
        
        let resolvedEmails = [];
        
        if (tagContent.startsWith('Project:')) {
            // Project-based tag: {{Project: ProjectName}}
            const projectName = tagContent.replace('Project:', '').trim();
            if (project.name === projectName) {
                resolvedEmails = projectContacts.map(contact => contact.email).filter(email => email);
            }
        } else if (tagContent.includes(' - ')) {
            // Project-position tag: {{Client Contact - Project Name}}
            const [position, projectName] = tagContent.split(' - ').map(s => s.trim());
            if (project.name === projectName) {
                resolvedEmails = projectContacts
                    .filter(contact => contact.position === position)
                    .map(contact => contact.email)
                    .filter(email => email);
            }
        } else if (tagContent.startsWith('Company:')) {
            // Company-based tag: {{Company: CompanyName}}
            const companyName = tagContent.replace('Company:', '').trim();
            resolvedEmails = projectContacts
                .filter(contact => contact.company === companyName)
                .map(contact => contact.email)
                .filter(email => email);
        } else {
            // Position-based tag: {{Client Contact}}
            const position = tagContent;
            resolvedEmails = projectContacts
                .filter(contact => contact.position === position)
                .map(contact => contact.email)
                .filter(email => email);
        }
        
        // Replace the tag with resolved emails
        const replacement = resolvedEmails.length > 0 ? resolvedEmails.join(', ') : `[No ${tagContent} found]`;
        resolvedRecipients = resolvedRecipients.replace(fullTag, replacement);
    });
    
    return resolvedRecipients;
}

// Preview dynamic recipient resolution for current project
function previewDynamicRecipients(recipientString, projectId = null) {
    if (!recipientString) {
        return { original: '', resolved: '', tags: [] };
    }
    
    // If no project specified, try to get current project context
    if (!projectId) {
        // You could implement logic to detect current project context here
        // For now, we'll just show the original string
        return { 
            original: recipientString, 
            resolved: recipientString, 
            tags: [],
            hasUnresolved: recipientString.includes('{{')
        };
    }
    
    const resolved = resolveDynamicRecipients(recipientString, projectId);
    const dynamicTagPattern = /\{\{([^}]+)\}\}/g;
    const tags = [...recipientString.matchAll(dynamicTagPattern)].map(match => match[1]);
    
    return {
        original: recipientString,
        resolved: resolved,
        tags: tags,
        hasUnresolved: resolved.includes('{{')
    };
}

// Add CSS for group selection modal
function addGroupModalCSS() {
    if (document.getElementById('group-modal-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'group-modal-styles';
    style.textContent = `
        .group-selection-modal-content {
            max-width: 900px;
            max-height: 85vh;
            width: 90vw;
        }
        
        .group-modal-body {
            display: flex;
            min-height: 60vh;
            padding: 20px 30px;
            gap: 30px;
        }
        
        .recipient-preview-container {
            flex: 1;
            border-right: 1px solid #e9ecef;
            padding-right: 30px;
            display: flex;
            flex-direction: column;
        }
        
        .recipient-preview-container h4 {
            margin: 0 0 15px 0;
            font-weight: 600;
            font-size: 16px;
        }
        
        .recipient-summary {
            background-color: #f8f9fa;
            border-radius: 8px;
            padding: 10px;
            margin-bottom: 15px;
        }
        
        .recipient-summary-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            padding-bottom: 8px;
            margin-bottom: 8px;
            border-bottom: 1px solid #e9ecef;
        }
        
        .summary-tag {
            background-color: #007bff;
            color: white;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 500;
        }
        
        .recipient-summary-count {
            font-size: 14px;
            font-weight: 600;
            color: #333;
        }
        
        .recipient-email-list {
            flex-grow: 1;
            overflow-y: auto;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 10px;
            background-color: #fdfdfd;
        }
        
        .placeholder-content {
            text-align: center;
            color: #6c757d;
            padding: 20px;
        }
        
        .placeholder-content p {
            margin: 10px 0;
        }
        
        .staged-recipients-summary {
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid #e9ecef;
            font-size: 14px;
        }
        
        .staged-recipients-summary h4 {
            margin: 0 0 8px 0;
            font-size: 14px;
            font-weight: 600;
        }
        
        #staged-recipient-count {
            font-weight: bold;
            color: #007bff;
        }
        
        .filter-builder-container {
            flex: 1.5;
            display: flex;
            flex-direction: column;
            gap: 20px;
        }
        
        .filter-dropzone-wrapper, 
        .available-tags-wrapper, 
        .saved-groups-wrapper {
            display: flex;
            flex-direction: column;
        }
        
        .filter-logic-controls {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        }
        
        .filter-logic-controls label {
            font-weight: 600;
            font-size: 14px;
            margin: 0;
        }
        
        .logic-selector {
            display: flex;
            gap: 10px;
        }
        
        .logic-option {
            display: flex;
            align-items: center;
            gap: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
        }
        
        .logic-option input[type="radio"] {
            margin: 0;
        }
        
        .logic-option span {
            padding: 4px 8px;
            border-radius: 4px;
            transition: background-color 0.2s;
        }
        
        .logic-option:has(input:checked) span {
            background-color: #007bff;
            color: white;
        }
        
        .available-tags-wrapper label, 
        .saved-groups-wrapper label {
            font-weight: 600;
            font-size: 14px;
            margin-bottom: 8px;
        }
        
        .filter-dropzone {
            border: 2px dashed #d1d9e0;
            border-radius: 8px;
            padding: 10px;
            min-height: 50px;
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            align-items: center;
            background-color: #fdfdfd;
            transition: border-color 0.2s, background-color 0.2s;
        }
        
        .filter-dropzone.drag-over {
            border-color: #007bff;
            background-color: #e7f3ff;
        }
        
        .filter-actions {
            margin-top: 8px;
            display: flex;
            justify-content: flex-end;
        }
        
        .dropzone-placeholder {
            color: #6c757d;
            font-style: italic;
            font-size: 14px;
        }
        
        .available-tags-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        }
        
        #filter-tag-search {
            border: 1px solid #d1d9e0;
            border-radius: 6px;
            padding: 6px 10px;
            font-size: 13px;
            width: 150px;
        }
        
        .available-filter-tags {
            border: 1px solid #e1e8ed;
            border-radius: 8px;
            padding: 10px;
            height: 200px;
            overflow-y: auto;
            background: #fdfdfd;
        }
        
        .filter-tag-category {
            margin-bottom: 15px;
        }
        
        .filter-tag-category h5 {
            font-size: 13px;
            color: #6c757d;
            text-transform: uppercase;
            margin: 0 0 8px 0;
            border-bottom: 1px solid #e9ecef;
            padding-bottom: 4px;
        }
        
        .tags-container {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }
        
        .filter-tag {
            background-color: #e9ecef;
            color: #495057;
            padding: 5px 10px;
            border-radius: 15px;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: background-color 0.2s, color 0.2s;
        }
        
        .filter-tag:hover {
            background-color: #007bff;
            color: white;
        }
        
        .filter-tag.dragging {
            opacity: 0.5;
            transform: scale(0.95);
        }
        
        .filter-tag[draggable="true"] {
            cursor: grab;
        }
        
        .filter-tag[draggable="true"]:active {
            cursor: grabbing;
        }
        
        .selected-filter-tag {
            background-color: #007bff;
            color: white;
            padding: 5px 10px;
            border-radius: 15px;
            font-size: 13px;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 5px;
        }
        
        .remove-filter {
            cursor: pointer;
            font-weight: bold;
            font-size: 16px;
            line-height: 1;
            background-color: rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            width: 18px;
            height: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .remove-filter:hover {
            background-color: rgba(255, 255, 255, 0.5);
        }
        
        .recipient-item {
            border-bottom: 1px solid #e9ecef;
            padding: 10px 0;
        }
        
        .recipient-item:last-child {
            border-bottom: none;
        }
        
        .recipient-name {
            font-weight: 600;
            color: #333;
            margin-bottom: 4px;
        }
        
        .recipient-email {
            color: #007bff;
            font-size: 14px;
            margin-bottom: 6px;
        }
        
        .recipient-details {
            display: flex;
            gap: 10px;
            font-size: 12px;
        }
        
        .recipient-position {
            background-color: #e9ecef;
            color: #495057;
            padding: 2px 6px;
            border-radius: 10px;
        }
        
        .recipient-company {
            background-color: #d1ecf1;
            color: #0c5460;
            padding: 2px 6px;
            border-radius: 10px;
        }
        
        .recipient-projects {
            background-color: #f8d7da;
            color: #721c24;
            padding: 2px 6px;
            border-radius: 10px;
            font-size: 11px;
        }
        
        .logic-indicator {
            background-color: #6c757d;
            color: white;
            padding: 2px 6px;
            border-radius: 10px;
            font-size: 11px;
            font-weight: 600;
            margin: 0 4px;
        }
        
        .btn-clear {
            background-color: #dc3545;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 6px 12px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
        }
        
        .btn-clear:hover {
            background-color: #c82333;
        }
        
        .btn-clear:disabled {
            background-color: #6c757d;
            cursor: not-allowed;
        }
        
        .btn-tertiary {
            background-color: #e9ecef;
            color: #495057;
            border: none;
            border-radius: 4px;
            padding: 6px 10px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
            transition: background-color 0.2s;
        }
        
        .btn-tertiary:hover {
            background-color: #d1d9e0;
        }
        
        .btn-tertiary:disabled {
            background-color: #f8f9fa;
            color: #6c757d;
            cursor: not-allowed;
        }
        
        .loading-message {
            text-align: center;
            color: #6c757d;
            padding: 20px;
            font-style: italic;
        }
        
        /* Dynamic Recipient Styles */
        .dynamic-indicator {
            background-color: #28a745;
            color: white;
            padding: 2px 6px;
            border-radius: 10px;
            font-size: 11px;
            font-weight: 600;
            margin-right: 6px;
        }
        
        .dynamic-recipients-header, 
        .static-recipients-header {
            border-bottom: 1px solid #e9ecef;
            padding-bottom: 10px;
            margin-bottom: 15px;
        }
        
        .dynamic-recipients-header h5, 
        .static-recipients-header h5 {
            margin: 0 0 5px 0;
            font-size: 14px;
            font-weight: 600;
        }
        
        .dynamic-recipients-header p, 
        .static-recipients-header p {
            margin: 0;
            font-size: 12px;
            color: #6c757d;
        }
        
        .dynamic-recipient {
            border-left: 3px solid #28a745;
            background-color: #f8fff9;
        }
        
        .static-recipient {
            border-left: 3px solid #007bff;
            background-color: #f8f9ff;
        }
        
        .dynamic-tag {
            color: #28a745;
            font-weight: 600;
            font-family: 'Courier New', monospace;
        }
        
        .recipient-description {
            color: #6c757d;
            font-size: 13px;
            margin: 4px 0;
            font-style: italic;
        }
        
        .dynamic-type {
            background-color: #28a745;
            color: white;
            padding: 2px 6px;
            border-radius: 10px;
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
        }
        
        .context-note {
            background-color: #fff3cd;
            color: #856404;
            padding: 2px 6px;
            border-radius: 10px;
            font-size: 10px;
            font-weight: 500;
        }
        
        .saved-groups-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        }
        
        .saved-groups-header label {
            font-weight: 600;
            font-size: 14px;
            margin: 0;
        }
        
        .saved-groups-stats {
            font-size: 12px;
            color: #6c757d;
        }
        
        .saved-groups-controls {
            display: flex;
            gap: 8px;
            align-items: center;
            margin-bottom: 8px;
        }
        
        .saved-groups-controls select {
            flex: 1;
            padding: 8px;
            border: 1px solid #d1d9e0;
            border-radius: 4px;
            font-size: 13px;
        }
        
        .saved-groups-actions {
            display: flex;
            gap: 8px;
            justify-content: space-between;
        }
        
        .apply-filters-wrapper {
            margin-top: auto;
            padding-top: 20px;
            border-top: 1px solid #e9ecef;
        }
        
        #stage-recipients-btn {
            width: 100%;
            padding: 12px;
            font-size: 16px;
            font-weight: 600;
        }
        
        .btn-secondary {
            background-color: #6c757d;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 8px 12px;
            cursor: pointer;
            font-size: 14px;
        }
        
        .btn-secondary:hover {
            background-color: #5a6268;
        }
        
        .btn-primary {
            background-color: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 8px 12px;
            cursor: pointer;
            font-size: 14px;
        }
        
        .btn-primary:hover {
            background-color: #0056b3;
        }
        
        .btn-danger {
            background-color: #dc3545;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 8px 12px;
            cursor: pointer;
            font-size: 14px;
        }
        
        .btn-danger:hover {
            background-color: #c82333;
        }
        
        /* Responsive adjustments */
        @media (max-width: 768px) {
            .group-modal-body {
                flex-direction: column;
                gap: 20px;
            }
            
            .recipient-preview-container {
                border-right: none;
                border-bottom: 1px solid #e9ecef;
                padding-right: 0;
                padding-bottom: 20px;
            }
            
            .group-selection-modal-content {
                width: 95vw;
                max-height: 90vh;
            }
            
            .saved-groups-controls {
                flex-direction: column;
                align-items: stretch;
            }
        }
    `;
    
    document.head.appendChild(style);
}

// Make functions globally accessible
window.hideGroupSelectionModal = hideGroupSelectionModal;
window.showGroupSelectionModal = showGroupSelectionModal;

// Add template modal CSS
function addTemplateModalCSS() {
    if (document.getElementById('template-modal-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'template-modal-styles';
    style.textContent = `
        .template-modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 1000;
            justify-content: center;
            align-items: center;
        }
        
        .template-modal-content {
            background: white;
            border-radius: 8px;
            width: 95%;
            max-width: 1200px;
            max-height: 90vh;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        }
        
        .template-modal-layout {
            display: flex;
            height: calc(90vh - 80px);
        }
        
        .template-form-section {
            flex: 1;
            padding: 30px;
            overflow-y: auto;
        }
        
        .placeholder-panel {
            flex: 0 0 350px;
            background: #f8f9fa;
            border-left: 1px solid #e9ecef;
            padding: 20px;
            overflow-y: auto;
        }
        
        .placeholder-panel h4 {
            margin: 0 0 10px 0;
            color: #333;
            font-size: 16px;
        }
        
        .placeholder-info {
            color: #6c757d;
            font-size: 14px;
            margin: 0 0 20px 0;
        }
        
        .placeholder-groups {
            display: flex;
            flex-direction: column;
            gap: 20px;
        }
        
        .placeholder-group {
            background: white;
            border-radius: 6px;
            padding: 15px;
            border: 1px solid #e9ecef;
        }
        
        .placeholder-group h5 {
            margin: 0 0 10px 0;
            color: #333;
            font-size: 14px;
            font-weight: 600;
            text-transform: capitalize;
        }
        
        .placeholder-items {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        
        .placeholder-item {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 4px;
            padding: 8px 10px;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        
        .placeholder-item:hover {
            background: #e9ecef;
            border-color: #007bff;
        }
        
        .placeholder-item.copied {
            background: #d4edda;
            border-color: #28a745;
            color: #155724;
        }
        
        .placeholder-text {
            display: block;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            font-weight: 600;
            color: #007bff;
            margin-bottom: 2px;
        }
        
        .placeholder-description {
            display: block;
            font-size: 11px;
            color: #6c757d;
            line-height: 1.2;
        }
        
        .template-modal-header {
            padding: 20px 30px;
            border-bottom: 1px solid #e9ecef;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .template-modal-header h3 {
            margin: 0;
            font-size: 18px;
            color: #333;
        }
        
        .template-modal-close {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #6c757d;
            padding: 0;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .template-modal-close:hover {
            color: #333;
        }
        
        .template-form {
            padding: 30px;
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 5px;
            font-weight: 500;
            color: #333;
        }
        
        .form-group input,
        .form-group select,
        .form-group textarea {
            width: 100%;
            padding: 10px 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
            box-sizing: border-box;
        }
        
        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
            outline: none;
            border-color: #007bff;
            box-shadow: 0 0 0 2px rgba(0,123,255,0.25);
        }
        
        .form-group textarea {
            resize: vertical;
            min-height: 120px;
        }
        
        .form-actions {
            display: flex;
            gap: 12px;
            justify-content: flex-end;
            margin-top: 30px;
        }
        
        .btn-primary,
        .btn-secondary,
        .btn-preview {
            padding: 10px 20px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s ease;
        }
        
        .btn-primary {
            background: #007bff;
            color: white;
        }
        
        .btn-primary:hover {
            background: #0056b3;
        }
        
        .btn-secondary {
            background: #6c757d;
            color: white;
        }
        
        .btn-secondary:hover {
            background: #5a6268;
        }
        
        .btn-preview {
            background: #17a2b8;
            color: white;
        }
        
        .btn-preview:hover {
            background: #138496;
        }
        
        .recipient-input-wrapper {
            display: flex;
            gap: 10px;
            align-items: center;
        }
        
        .recipient-input-wrapper input {
            flex: 1;
        }
        
        .add-group-btn {
            flex-shrink: 0;
            padding: 8px 16px;
            background: #6c757d;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            white-space: nowrap;
            transition: background 0.2s ease;
        }
        
        .add-group-btn:hover {
            background: #5a6268;
        }
    `;
    
    document.head.appendChild(style);
}

// Hide template modal
function hideTemplateModal() {
    const modal = document.getElementById('email-template-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Handle template form submission
function handleTemplateSubmit(e) {
    e.preventDefault();
    
    const modal = document.getElementById('email-template-modal');
    const form = e.target;
    
    const templateData = {
        name: form.name.value.trim(),
        category: form.category.value,
        to: form.to.value.trim(),
        subject: form.subject.value.trim(),
        body: form.body.value.trim()
    };
    
    console.log('Template data being saved:', templateData); // Debug log
    
    if (modal.dataset.editingId) {
        // Edit existing template
        updateTemplate(modal.dataset.editingId, templateData);
    } else {
        // Create new template
        createTemplate(templateData);
    }
    
    hideTemplateModal();
}

// Create new template
function createTemplate(templateData) {
    const template = {
        id: `template-${Date.now()}`,
        ...templateData,
        tags: templateData.tags || [], // Add support for tags
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    state.emailTemplates.push(template);
    saveState();
    renderEmailTemplates();
    
    showNotification(`Template "${template.name}" created successfully!`, 'success');
}

// Update existing template
function updateTemplate(templateId, templateData) {
    const templateIndex = state.emailTemplates.findIndex(t => t.id === templateId);
    if (templateIndex !== -1) {
        state.emailTemplates[templateIndex] = {
            ...state.emailTemplates[templateIndex],
            ...templateData,
            updatedAt: new Date().toISOString()
        };
        
        saveState();
        renderEmailTemplates();
        
        showNotification(`Template "${templateData.name}" updated successfully!`, 'success');
    }
}

// Delete template
function deleteTemplate(templateId) {
    const template = state.emailTemplates.find(t => t.id === templateId);
    if (template && confirm(`Are you sure you want to delete "${template.name}"?`)) {
        state.emailTemplates = state.emailTemplates.filter(t => t.id !== templateId);
        saveState();
        renderEmailTemplates();
        
        showNotification(`Template "${template.name}" deleted successfully!`, 'success');
    }
}

// Filter templates by search term
function filterTemplates(searchTerm) {
    const templateCards = document.querySelectorAll('.template-card');
    
    templateCards.forEach(card => {
        const name = card.querySelector('.template-name').textContent.toLowerCase();
        const subject = card.querySelector('.template-subject').textContent.toLowerCase();
        const category = card.querySelector('.template-category').textContent.toLowerCase();
        
        const matches = name.includes(searchTerm) || 
                       subject.includes(searchTerm) || 
                       category.includes(searchTerm);
        
        card.style.display = matches ? 'block' : 'none';
    });
}

// Filter templates by category
function filterTemplatesByCategory(categoryName) {
    const templateCards = document.querySelectorAll('.template-card');
    
    templateCards.forEach(card => {
        const cardCategory = card.querySelector('.template-category').textContent;
        card.style.display = cardCategory === categoryName ? 'block' : 'none';
    });
}

// Update category counts
function updateCategoryCounts() {
    const categoryItems = document.querySelectorAll('.category-item');
    
    categoryItems.forEach(item => {
        const categoryName = item.querySelector('.category-name').textContent;
        const count = state.emailTemplates.filter(template => {
            const templateCategory = TEMPLATE_CATEGORIES.find(cat => cat.value === template.category)?.label;
            return templateCategory === categoryName;
        }).length;
        
        const countElement = item.querySelector('.category-count');
        if (countElement) {
            countElement.textContent = count;
        }
    });
}

// Export templates functionality
export function exportEmailTemplates() {
    const dataStr = JSON.stringify(state.emailTemplates, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `email-templates-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    showNotification('Templates exported successfully!', 'success');
}

// Import templates functionality
export function importEmailTemplates(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedTemplates = JSON.parse(e.target.result);
            
            if (Array.isArray(importedTemplates)) {
                // Add imported templates to existing ones
                const newTemplates = importedTemplates.map(template => ({
                    ...template,
                    id: `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }));
                
                state.emailTemplates.push(...newTemplates);
                saveState();
                renderEmailTemplates();
                
                showNotification(`${newTemplates.length} templates imported successfully!`, 'success');
            } else {
                throw new Error('Invalid template format');
            }
        } catch (error) {
            showNotification('Error importing templates. Please check the file format.', 'error');
            console.error('Import error:', error);
        }
    };
    
    reader.readAsText(file);
}

// Placeholder replacement engine
export function replacePlaceholders(content, context = {}) {
    let processedContent = content;
    
    // Replace project placeholders
    processedContent = processedContent.replace(/\{\{ProjectName\}\}/g, context.projectName || '[Project Name]');
    processedContent = processedContent.replace(/\{\{ProjectPhase\}\}/g, context.projectPhase || '[Project Phase]');
    processedContent = processedContent.replace(/\{\{ProjectCompletion\}\}/g, context.projectCompletion || '[Project Completion]');
    processedContent = processedContent.replace(/\{\{NextMilestone\}\}/g, context.nextMilestone || '[Next Milestone]');
    processedContent = processedContent.replace(/\{\{CurrentActivity\}\}/g, context.currentActivity || '[Current Activity]');
    
    // Replace task placeholders
    processedContent = processedContent.replace(/\{\{TaskID\}\}/g, context.taskId || '[Task ID]');
    processedContent = processedContent.replace(/\{\{TaskName\}\}/g, context.taskName || '[Task Name]');
    processedContent = processedContent.replace(/\{\{TaskStatus\}\}/g, context.taskStatus || '[Task Status]');
    processedContent = processedContent.replace(/\{\{TaskDuration\}\}/g, context.taskDuration || '[Task Duration]');
    processedContent = processedContent.replace(/\{\{ExpectedDate\}\}/g, context.expectedDate || '[Expected Date]');
    processedContent = processedContent.replace(/\{\{Responsible\}\}/g, context.responsible || '[Responsible]');
    processedContent = processedContent.replace(/\{\{Dependency\}\}/g, context.dependency || '[Dependency]');
    
    // Replace update placeholders
    processedContent = processedContent.replace(/\{\{LatestComment\}\}/g, context.latestComment || '[Latest Comment]');
    processedContent = processedContent.replace(/\{\{CommentHistory\}\}/g, context.commentHistory || '[Comment History]');
    processedContent = processedContent.replace(/\{\{LastUpdated\}\}/g, context.lastUpdated || '[Last Updated]');
    
    // Replace general placeholders
    processedContent = processedContent.replace(/\{\{CurrentDate\}\}/g, new Date().toLocaleDateString());
    processedContent = processedContent.replace(/\{\{CurrentTime\}\}/g, new Date().toLocaleTimeString());
    processedContent = processedContent.replace(/\{\{UserName\}\}/g, context.userName || 'User');
    return processedContent;
}

// Get context data from project and task
export function getContextFromProject(projectId, taskIndex = null) {
    const project = state.projectsData[projectId];
    if (!project) {
        return {};
    }
    
    const context = {
        projectName: project.name || projectId,
        projectPhase: getProjectPhase(project),
        projectCompletion: calculateProjectCompletion(project),
        nextMilestone: project.nextMilestone || 'N/A',
        currentActivity: project.currentActivity || 'N/A',
        userName: 'Project Manager' // Could be made dynamic
    };
    
    // If specific task is requested, add task context
    if (taskIndex !== null && project.content && project.content[taskIndex]) {
        const task = project.content[taskIndex];
        const headers = project.headers;
        
        context.taskId = getColumnValue(task, headers, 'id') || (taskIndex + 1);
        context.taskName = getColumnValue(task, headers, 'actividad') || 'N/A';
        context.taskStatus = getColumnValue(task, headers, 'status') || 'N/A';
        context.taskDuration = getColumnValue(task, headers, 'duracion') || 'N/A';
        context.expectedDate = getColumnValue(task, headers, 'fecha esperada') || 'N/A';
        context.responsible = getColumnValue(task, headers, 'responsable') || 'N/A';
        context.dependency = getColumnValue(task, headers, 'dependencia') || 'N/A';
        context.latestComment = getColumnValue(task, headers, 'comentario') || 'No comments';
        context.commentHistory = getColumnValue(task, headers, 'comentario') || 'No comment history';
        context.lastUpdated = new Date().toLocaleDateString();
    }
    
    return context;
}

// Helper functions for context extraction
function getProjectPhase(project) {
    if (!project.content || project.content.length === 0) return 'N/A';
    
    const phaseColumnIndex = project.headers.findIndex(header => 
        header.toLowerCase().includes('fase') || header.toLowerCase().includes('phase')
    );
    
    if (phaseColumnIndex >= 0) {
        // Get the phase from the first task
        return project.content[0][phaseColumnIndex] || 'N/A';
    }
    
    return 'N/A';
}

function calculateProjectCompletion(project) {
    if (!project.content || project.content.length === 0) return '0%';
    
    const statusColumnIndex = project.headers.findIndex(header => 
        header.toLowerCase().includes('status') || header.toLowerCase().includes('estado')
    );
    
    if (statusColumnIndex >= 0) {
        const completedTasks = project.content.filter(row => 
            row[statusColumnIndex] && row[statusColumnIndex].toLowerCase() === 'completo'
        ).length;
        
        const completion = Math.round((completedTasks / project.content.length) * 100);
        return `${completion}%`;
    }
    
    return '0%';
}

function getColumnValue(row, headers, columnName) {
    const columnIndex = headers.findIndex(header => 
        header.toLowerCase().includes(columnName.toLowerCase())
    );
    
    return columnIndex >= 0 ? row[columnIndex] : null;
}

// Preview template with placeholders replaced
export function previewTemplate(template, projectId = null, taskIndex = null) {
    const context = projectId ? getContextFromProject(projectId, taskIndex) : {};
    
    // Resolve dynamic recipients if project context is available
    const resolvedRecipients = projectId ? 
        resolveDynamicRecipients(template.to, projectId) : 
        template.to;
    
    return {
        name: template.name,
        to: resolvedRecipients,
        subject: replacePlaceholders(template.subject, context),
        body: replacePlaceholders(template.body, context),
        context: context,
        hasDynamicRecipients: template.to?.includes('{{') || false
    };
}

// Export dynamic recipient resolution for use in other modules
export function resolveTemplateRecipients(templateRecipients, projectId) {
    return resolveDynamicRecipients(templateRecipients, projectId);
}

// Export for creating dynamic recipient tags during template creation
export function createDynamicRecipientsFromFilters(filters) {
    // Temporarily set selectedFilters to match the provided filters
    const originalFilters = selectedFilters;
    selectedFilters = filters;
    
    const dynamicTags = createDynamicRecipientTags();
    
    // Restore original filters
    selectedFilters = originalFilters;
    
    return dynamicTags;
}

// Test function for debugging placeholder replacement
window.testPlaceholderReplacement = function() {
    console.log('=== Testing Placeholder Replacement ===');
    
    const testTemplate = {
        subject: 'Project Update: {{ProjectName}}',
        body: 'Hello {{UserName}},\n\nProject {{ProjectName}} is now {{ProjectCompletion}} complete.\nCurrent phase: {{ProjectPhase}}\n\nBest regards'
    };
    
    console.log('Test template:', testTemplate);
    
    const availableProjects = Object.keys(state.projectsData);
    console.log('Available projects:', availableProjects);
    
    if (availableProjects.length > 0) {
        const testProjectId = availableProjects[0];
        console.log('Testing with project:', testProjectId);
        
        const context = getContextFromProject(testProjectId);
        console.log('Generated context:', context);
        
        const processedSubject = replacePlaceholders(testTemplate.subject, context);
        const processedBody = replacePlaceholders(testTemplate.body, context);
        
        console.log('Processed subject:', processedSubject);
        console.log('Processed body:', processedBody);
        
        return {
            template: testTemplate,
            context: context,
            processedSubject: processedSubject,
            processedBody: processedBody
        };
    } else {
        console.log('No projects available for testing');
        return null;
    }
};

// Test function for dynamic recipient resolution
window.testDynamicRecipients = function() {
    console.log('=== Testing Dynamic Recipient Resolution ===');
    
    const testTemplate = {
        name: 'Test Template',
        to: '{{Client Contact}}, {{Project Manager}}',
        subject: 'Update for {{ProjectName}}',
        body: 'Hello,\n\nThis is an update for {{ProjectName}}.\n\nBest regards'
    };
    
    console.log('Test template:', testTemplate);
    
    const availableProjects = Object.keys(state.projectsData);
    console.log('Available projects:', availableProjects);
    
    if (availableProjects.length > 0) {
        const testProjectId = availableProjects[0];
        console.log('Testing with project:', testProjectId);
        
        const previewedTemplate = previewTemplate(testTemplate, testProjectId);
        console.log('Previewed template:', previewedTemplate);
        
        console.log('Original recipients:', testTemplate.to);
        console.log('Resolved recipients:', previewedTemplate.to);
        console.log('Has dynamic recipients:', previewedTemplate.hasDynamicRecipients);
        
        return {
            original: testTemplate,
            resolved: previewedTemplate
        };
    } else {
        console.log('No projects available for testing');
        return null;
    }
};

// Test function for template modal field updating
window.testTemplateFieldUpdate = function() {
    console.log('=== Testing Template Field Update ===');
    
    const modal = document.getElementById('email-template-modal');
    console.log('Template modal found:', !!modal);
    
    if (modal) {
        const toField = modal.querySelector('#template-to');
        console.log('To field found:', !!toField);
        
        if (toField) {
            console.log('Current to field value:', toField.value);
            
            // Test adding a dynamic tag
            const testTag = '{{Client Contact}}';
            toField.value = testTag;
            console.log('Updated to field value:', toField.value);
            
            return {
                modalFound: true,
                fieldFound: true,
                fieldValue: toField.value
            };
        }
    }
    
    return {
        modalFound: !!modal,
        fieldFound: false,
        fieldValue: null
    };
};

// Test function to verify template preview modal displays correctly
window.testTemplatePreviewModal = function() {
    console.log('=== Testing Template Preview Modal ===');
    
    // Check if there are any templates to preview
    if (!state.emailTemplates || state.emailTemplates.length === 0) {
        console.log('❌ No email templates found. Create some templates first.');
        return { error: 'No templates available' };
    }
    
    // Use the first template for testing
    const testTemplate = state.emailTemplates[0];
    console.log(`Testing with template: "${testTemplate.name}"`);
    
    // Show the preview modal
    showTemplatePreview(testTemplate);
    
    // Check if modal was created and positioned correctly
    setTimeout(() => {
        const modal = document.getElementById('template-preview-modal');
        if (!modal) {
            console.log('❌ Preview modal was not created');
            return { error: 'Modal not created' };
        }
        
        const modalStyles = window.getComputedStyle(modal);
        const isVisible = modalStyles.display === 'flex';
        const isFixed = modalStyles.position === 'fixed';
        const hasOverlay = modalStyles.backgroundColor.includes('rgba');
        const isOnTop = parseInt(modalStyles.zIndex) >= 1000;
        
        console.log('Modal positioning check:');
        console.log(`- Visible (display: flex): ${isVisible}`);
        console.log(`- Fixed positioning: ${isFixed}`);
        console.log(`- Has overlay background: ${hasOverlay}`);
        console.log(`- High z-index: ${isOnTop} (${modalStyles.zIndex})`);
        
        const result = {
            modalExists: true,
            isVisible,
            isFixed,
            hasOverlay,
            isOnTop,
            styles: {
                display: modalStyles.display,
                position: modalStyles.position,
                backgroundColor: modalStyles.backgroundColor,
                zIndex: modalStyles.zIndex
            }
        };
        
        if (isVisible && isFixed && hasOverlay && isOnTop) {
            console.log('✅ Preview modal is displaying correctly as a centered overlay!');
            result.success = true;
        } else {
            console.log('❌ Preview modal has positioning issues');
            result.success = false;
        }
        
        // Auto-close the modal after testing
        setTimeout(() => {
            hideTemplatePreviewModal();
            console.log('Test modal closed automatically');
        }, 3000);
        
        return result;
    }, 100);
    
    return { testing: 'Modal positioning check in progress...' };
};

// Test function to verify duplicate button only creates one copy
window.testDuplicateButton = function() {
    console.log('=== Testing Duplicate Button (Single Copy) ===');
    
    // Check if we're on email templates tab
    const emailTemplatesTab = document.querySelector('[data-tab="email-templates"]');
    if (!emailTemplatesTab?.classList.contains('active')) {
        console.log('❌ Switch to Email Templates tab first');
        return { error: 'Not on email templates tab' };
    }
    
    // Count templates before duplication
    const initialCount = state.emailTemplates.length;
    console.log(`Initial template count: ${initialCount}`);
    
    if (initialCount === 0) {
        console.log('❌ No templates to duplicate. Create a template first.');
        return { error: 'No templates available' };
    }
    
    // Select first template
    const firstTemplate = state.emailTemplates[0];
    const firstCard = document.querySelector(`[data-template-id="${firstTemplate.id}"]`);
    
    if (!firstCard) {
        console.log('❌ Template card not found');
        return { error: 'Template card not found' };
    }
    
    // Simulate selecting the template
    firstCard.click();
    
    // Wait a moment then click duplicate
    setTimeout(() => {
        const duplicateBtn = document.querySelector('.quick-action-btn[data-action="duplicate"]');
        if (!duplicateBtn) {
            console.log('❌ Duplicate button not found');
            return;
        }
        
        console.log('Clicking duplicate button...');
        duplicateBtn.click();
        
        // Check count after duplication
        setTimeout(() => {
            const finalCount = state.emailTemplates.length;
            const expectedCount = initialCount + 1;
            
            console.log(`Final template count: ${finalCount}`);
            console.log(`Expected count: ${expectedCount}`);
            
            if (finalCount === expectedCount) {
                console.log('✅ SUCCESS: Duplicate button creates exactly 1 copy');
                
                // Check if the duplicated template has correct name
                const duplicatedTemplate = state.emailTemplates.find(t => 
                    t.name === `${firstTemplate.name} (Copy)` && t.id !== firstTemplate.id
                );
                
                if (duplicatedTemplate) {
                    console.log(`✅ Duplicated template found: "${duplicatedTemplate.name}"`);
                } else {
                    console.log('⚠️ Duplicated template not found with expected name');
                }
                
                return { 
                    success: true, 
                    initialCount, 
                    finalCount,
                    duplicatedTemplate: duplicatedTemplate?.name 
                };
            } else {
                console.log(`❌ FAIL: Expected ${expectedCount} templates, got ${finalCount}`);
                return { 
                    error: 'Duplicate created wrong number of copies',
                    initialCount,
                    finalCount,
                    expectedCount
                };
            }
        }, 100);
    }, 100);
};

// Enhanced template quality scoring system
function getTemplateQualityScore(template, actionType) {
    const action = EMAIL_ACTIONS[actionType];
    if (!action) return 0;
    
    let score = 0;
    
    // 1. Category matching (highest priority)
    const matchingCategories = TEMPLATE_CATEGORIES.filter(cat => 
        cat.value === template.category && cat.actionTypes.includes(actionType)
    );
    if (matchingCategories.length > 0) {
        score += 50;
    }
    
    // 2. Tag matching (high priority)
    if (template.tags && action.suggestedTags) {
        const matchingTags = action.suggestedTags.filter(tag => 
            template.tags.includes(tag)
        );
        score += matchingTags.length * 10;
    }
    
    // 3. Name/subject keyword matching (medium priority)
    if (action.suggestedTags) {
        const nameMatches = action.suggestedTags.filter(tag => 
            template.name.toLowerCase().includes(tag.toLowerCase())
        );
        const subjectMatches = action.suggestedTags.filter(tag => 
            template.subject.toLowerCase().includes(tag.toLowerCase())
        );
        score += nameMatches.length * 5;
        score += subjectMatches.length * 3;
    }
    
    // 4. Dynamic recipient compatibility (bonus)
    if (template.to && template.to.includes('{{')) {
        score += 5;
    }
    
    // 5. Recent usage bonus (if we track usage)
    if (template.lastUsed) {
        const daysSinceUsed = (Date.now() - new Date(template.lastUsed).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceUsed < 7) score += 3;
    }
    
    return score;
}

// Make the quality scoring function available globally
window.getTemplateQualityScore = getTemplateQualityScore;