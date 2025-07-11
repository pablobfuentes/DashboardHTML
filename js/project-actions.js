import { state, saveState } from './state.js';
import { showNotification } from './ui.js';
import { resolveDynamicRecipients, previewTemplate } from './email-templates.js';

// ==================== EMAIL ACTION SYSTEM ==================== //

// Predefined email actions with smart template suggestions
export const EMAIL_ACTIONS = {
    'schedule-meeting': {
        label: 'Schedule Meeting',
        icon: '📅',
        description: 'Request a meeting or schedule coordination',
        suggestedTags: ['meeting', 'scheduling', 'coordination', 'calendar']
    },
    'thank-team': {
        label: 'Thank Team',
        icon: '🙏',
        description: 'Express gratitude for work completed',
        suggestedTags: ['thank', 'appreciation', 'completion', 'milestone']
    },
    'status-update': {
        label: 'Status Update',
        icon: '📊',
        description: 'Share project progress and updates',
        suggestedTags: ['update', 'progress', 'status', 'report']
    },
    'issue-alert': {
        label: 'Issue Alert',
        icon: '⚠️',
        description: 'Report problems or blockers',
        suggestedTags: ['issue', 'problem', 'urgent', 'blocker']
    },
    'milestone-notification': {
        label: 'Milestone Reached',
        icon: '🎯',
        description: 'Announce milestone completion',
        suggestedTags: ['milestone', 'achievement', 'completion', 'progress']
    },
    'follow-up': {
        label: 'Follow Up',
        icon: '🔄',
        description: 'Check on pending items or responses',
        suggestedTags: ['follow-up', 'reminder', 'pending', 'response']
    },
    'custom': {
        label: 'Custom Email',
        icon: '✉️',
        description: 'Send a custom email using any template',
        suggestedTags: []
    }
};

// Initialize project actions system
export function initializeProjectActions() {
    addProjectActionsCSS();
    console.log('Project Actions system initialized');
}

// ==================== ACTIONS COLUMN RENDERING ==================== //

// Create actions cell for project table rows
export function createActionsCell(projectId, rowIndex, isMainTemplate = false) {
    const td = document.createElement('td');
    td.classList.add('actions-cell');
    
    if (isMainTemplate) {
        // No actions for main template
        return td;
    }
    
    // Create actions dropdown button
    const actionsBtn = document.createElement('button');
    actionsBtn.classList.add('actions-btn');
    actionsBtn.innerHTML = '⚡';
    actionsBtn.title = 'Actions';
    actionsBtn.setAttribute('data-project-id', projectId);
    actionsBtn.setAttribute('data-row-index', rowIndex);
    
    // Add click event for actions dropdown
    actionsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showActionsDropdown(projectId, rowIndex, e.target);
    });
    
    td.appendChild(actionsBtn);
    return td;
}

// Show actions dropdown menu
function showActionsDropdown(projectId, rowIndex, buttonElement) {
    // Remove any existing dropdown
    const existingDropdown = document.querySelector('.actions-dropdown');
    if (existingDropdown) {
        existingDropdown.remove();
    }
    
    const dropdown = document.createElement('div');
    dropdown.classList.add('actions-dropdown');
    
    // Position dropdown relative to button
    const rect = buttonElement.getBoundingClientRect();
    dropdown.style.top = `${rect.bottom + 5}px`;
    dropdown.style.left = `${rect.left}px`;
    
    // Create dropdown content
    dropdown.innerHTML = `
        <div class="actions-dropdown-header">
            <span class="actions-title">📧 Send Email</span>
        </div>
        <div class="actions-dropdown-content">
            ${Object.entries(EMAIL_ACTIONS).map(([actionType, action]) => `
                <div class="action-item" data-action-type="${actionType}">
                    <span class="action-icon">${action.icon}</span>
                    <div class="action-content">
                        <div class="action-label">${action.label}</div>
                        <div class="action-description">${action.description}</div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    // Add event listeners for action items
    dropdown.querySelectorAll('.action-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const actionType = item.getAttribute('data-action-type');
            handleEmailAction(projectId, rowIndex, actionType);
            dropdown.remove();
        });
    });
    
    // Add to document
    document.body.appendChild(dropdown);
    
    // Remove dropdown when clicking outside
    setTimeout(() => {
        document.addEventListener('click', function closeDropdown(e) {
            if (!dropdown.contains(e.target)) {
                dropdown.remove();
                document.removeEventListener('click', closeDropdown);
            }
        });
    }, 0);
}

// ==================== EMAIL ACTION HANDLING ==================== //

// Handle email action selection
function handleEmailAction(projectId, rowIndex, actionType) {
    const action = EMAIL_ACTIONS[actionType];
    if (!action) {
        showNotification('Invalid action type', 'error');
        return;
    }
    
    // Get project and task context
    const project = state.projectsData[projectId];
    if (!project) {
        showNotification('Project not found', 'error');
        return;
    }
    
    const task = project.content[rowIndex];
    if (!task) {
        showNotification('Task not found', 'error');
        return;
    }
    
    // Show context-aware email modal
    showContextAwareEmailModal(projectId, rowIndex, actionType, action);
}

// Show context-aware email modal
function showContextAwareEmailModal(projectId, rowIndex, actionType, action) {
    // Remove any existing modal
    const existingModal = document.getElementById('context-email-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Create modal
    const modal = document.createElement('div');
    modal.id = 'context-email-modal';
    modal.className = 'template-modal';
    
    // Get template suggestions
    const suggestedTemplates = getTemplateSuggestions(actionType, projectId);
    const defaultTemplate = suggestedTemplates[0] || null;
    
    // Get project context
    const project = state.projectsData[projectId];
    const task = project.content[rowIndex];
    const taskName = getTaskName(task, project.headers);
    
    modal.innerHTML = `
        <div class="template-modal-content context-email-modal-content">
            <div class="template-modal-header">
                <h3>${action.icon} ${action.label}</h3>
                <button class="template-modal-close" onclick="document.getElementById('context-email-modal').remove()">&times;</button>
            </div>
            
            <div class="context-email-body">
                <div class="context-info">
                    <h4>📋 Context</h4>
                    <div class="context-details">
                        <div class="context-item">
                            <strong>Project:</strong> ${project.name}
                        </div>
                        <div class="context-item">
                            <strong>Task:</strong> ${taskName}
                        </div>
                        <div class="context-item">
                            <strong>Action:</strong> ${action.description}
                        </div>
                    </div>
                </div>
                
                <div class="template-selection">
                    <h4>📝 Template Selection</h4>
                    <div class="template-selection-methods">
                        <div class="selection-method ${defaultTemplate ? 'active' : ''}">
                            <div class="method-header">
                                <input type="radio" name="template-method" value="suggested" id="suggested-method" ${defaultTemplate ? 'checked' : ''}>
                                <label for="suggested-method">🎯 Suggested Templates</label>
                            </div>
                            <div class="method-content">
                                ${suggestedTemplates.length > 0 ? `
                                    <div class="suggested-templates">
                                        ${suggestedTemplates.map((template, index) => `
                                            <div class="template-option ${index === 0 ? 'selected' : ''}" data-template-id="${template.id}">
                                                <div class="template-name">${template.name}</div>
                                                <div class="template-subject">${template.subject}</div>
                                            </div>
                                        `).join('')}
                                    </div>
                                ` : `
                                    <div class="no-suggestions">
                                        <p>No templates found for this action type.</p>
                                        <p>Try browsing all templates or create a new one.</p>
                                    </div>
                                `}
                            </div>
                        </div>
                        
                        <div class="selection-method">
                            <div class="method-header">
                                <input type="radio" name="template-method" value="browse" id="browse-method">
                                <label for="browse-method">📚 Browse All Templates</label>
                            </div>
                            <div class="method-content">
                                <div class="all-templates">
                                    ${state.emailTemplates.map(template => `
                                        <div class="template-option" data-template-id="${template.id}">
                                            <div class="template-name">${template.name}</div>
                                            <div class="template-subject">${template.subject}</div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="template-preview">
                    <h4>👀 Preview</h4>
                    <div class="preview-content">
                        <div class="preview-field">
                            <strong>To:</strong>
                            <div class="preview-to" id="context-preview-to">(Select a template to preview)</div>
                        </div>
                        <div class="preview-field">
                            <strong>Subject:</strong>
                            <div class="preview-subject" id="context-preview-subject">(Select a template to preview)</div>
                        </div>
                        <div class="preview-field">
                            <strong>Body:</strong>
                            <div class="preview-body" id="context-preview-body">(Select a template to preview)</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="template-modal-footer">
                <button type="button" class="btn-secondary" onclick="document.getElementById('context-email-modal').remove()">Cancel</button>
                <button type="button" class="btn-primary" id="send-context-email-btn" disabled>Send Email</button>
            </div>
        </div>
    `;
    
    // Add to document
    document.body.appendChild(modal);
    
    // Initialize modal functionality
    initializeContextEmailModal(projectId, rowIndex, actionType);
    
    // Auto-select default template if available
    if (defaultTemplate) {
        selectContextTemplate(defaultTemplate.id, projectId, rowIndex);
    }
}

// Initialize context email modal functionality
function initializeContextEmailModal(projectId, rowIndex, actionType) {
    const modal = document.getElementById('context-email-modal');
    
    // Template method selection
    modal.querySelectorAll('input[name="template-method"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            // Update active selection method
            modal.querySelectorAll('.selection-method').forEach(method => {
                method.classList.remove('active');
            });
            e.target.closest('.selection-method').classList.add('active');
            
            // Clear any selected templates
            modal.querySelectorAll('.template-option').forEach(option => {
                option.classList.remove('selected');
            });
            
            // Disable send button
            modal.querySelector('#send-context-email-btn').disabled = true;
            
            // Clear preview
            clearContextPreview();
        });
    });
    
    // Template selection
    modal.querySelectorAll('.template-option').forEach(option => {
        option.addEventListener('click', (e) => {
            // Remove previous selection
            modal.querySelectorAll('.template-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            
            // Select current template
            option.classList.add('selected');
            
            // Update preview
            const templateId = option.getAttribute('data-template-id');
            selectContextTemplate(templateId, projectId, rowIndex);
        });
    });
    
    // Send button
    modal.querySelector('#send-context-email-btn').addEventListener('click', () => {
        handleContextEmailSend(projectId, rowIndex, actionType);
    });
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// ==================== TEMPLATE SUGGESTIONS ==================== //

// Get template suggestions for action type
function getTemplateSuggestions(actionType, projectId) {
    const action = EMAIL_ACTIONS[actionType];
    if (!action || !action.suggestedTags) return [];
    
    // Filter templates by suggested tags
    const suggestions = state.emailTemplates.filter(template => {
        if (!template.tags) return false;
        
        // Check if template has any of the suggested tags
        return action.suggestedTags.some(tag => 
            template.tags.includes(tag) || 
            template.name.toLowerCase().includes(tag.toLowerCase()) ||
            template.subject.toLowerCase().includes(tag.toLowerCase())
        );
    });
    
    // Sort by relevance (templates with more matching tags first)
    suggestions.sort((a, b) => {
        const aMatches = action.suggestedTags.filter(tag => 
            a.tags?.includes(tag) || 
            a.name.toLowerCase().includes(tag.toLowerCase()) ||
            a.subject.toLowerCase().includes(tag.toLowerCase())
        ).length;
        
        const bMatches = action.suggestedTags.filter(tag => 
            b.tags?.includes(tag) || 
            b.name.toLowerCase().includes(tag.toLowerCase()) ||
            b.subject.toLowerCase().includes(tag.toLowerCase())
        ).length;
        
        return bMatches - aMatches;
    });
    
    return suggestions;
}

// Select template and update preview
function selectContextTemplate(templateId, projectId, rowIndex) {
    const template = state.emailTemplates.find(t => t.id === templateId);
    if (!template) return;
    
    // Preview template with project context
    const previewedTemplate = previewTemplate(template, projectId, rowIndex);
    
    // Update preview
    document.getElementById('context-preview-to').textContent = previewedTemplate.to;
    document.getElementById('context-preview-subject').textContent = previewedTemplate.subject;
    document.getElementById('context-preview-body').innerHTML = previewedTemplate.body.replace(/\n/g, '<br>');
    
    // Enable send button
    document.getElementById('send-context-email-btn').disabled = false;
    
    // Store selected template
    const modal = document.getElementById('context-email-modal');
    modal.setAttribute('data-selected-template', templateId);
}

// Clear context preview
function clearContextPreview() {
    document.getElementById('context-preview-to').textContent = '(Select a template to preview)';
    document.getElementById('context-preview-subject').textContent = '(Select a template to preview)';
    document.getElementById('context-preview-body').textContent = '(Select a template to preview)';
}

// ==================== EMAIL SENDING ==================== //

// Handle context email send
function handleContextEmailSend(projectId, rowIndex, actionType) {
    const modal = document.getElementById('context-email-modal');
    const selectedTemplateId = modal.getAttribute('data-selected-template');
    
    if (!selectedTemplateId) {
        showNotification('Please select a template', 'warning');
        return;
    }
    
    const template = state.emailTemplates.find(t => t.id === selectedTemplateId);
    if (!template) {
        showNotification('Template not found', 'error');
        return;
    }
    
    // Preview template with context
    const previewedTemplate = previewTemplate(template, projectId, rowIndex);
    
    // Log the email action (in real app, this would send the email)
    console.log('Email Action:', {
        projectId,
        rowIndex,
        actionType,
        template: template.name,
        resolvedTemplate: previewedTemplate
    });
    
    // Show success notification
    const action = EMAIL_ACTIONS[actionType];
    showNotification(`${action.icon} ${action.label} email sent successfully!`, 'success');
    
    // Close modal
    modal.remove();
    
    // TODO: In real implementation, integrate with actual email service
    // For now, we'll just show a detailed log
    showEmailSendDetails(previewedTemplate, actionType);
}

// Show email send details (for demonstration)
function showEmailSendDetails(emailData, actionType) {
    console.log('📧 Email Details:', {
        action: EMAIL_ACTIONS[actionType].label,
        to: emailData.to,
        subject: emailData.subject,
        body: emailData.body,
        hasDynamicRecipients: emailData.hasDynamicRecipients
    });
}

// ==================== HELPER FUNCTIONS ==================== //

// Get task name from row data
function getTaskName(task, headers) {
    const nameIndex = headers.findIndex(h => 
        h.toLowerCase().includes('actividad') || 
        h.toLowerCase().includes('task') || 
        h.toLowerCase().includes('name')
    );
    
    return nameIndex >= 0 ? task[nameIndex] || 'Unnamed Task' : 'Unnamed Task';
}

// Add CSS for project actions
function addProjectActionsCSS() {
    if (document.getElementById('project-actions-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'project-actions-styles';
    style.textContent = `
        /* Actions Column */
        .actions-cell {
            width: 50px;
            text-align: center;
            background-color: #f8f9fa;
            border-left: 2px solid #e9ecef;
        }
        
        .actions-btn {
            background: #007bff;
            color: white;
            border: none;
            border-radius: 50%;
            width: 32px;
            height: 32px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .actions-btn:hover {
            background: #0056b3;
            transform: scale(1.1);
        }
        
        /* Actions Dropdown */
        .actions-dropdown {
            position: fixed;
            background: white;
            border: 1px solid #ddd;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
            min-width: 280px;
            max-width: 320px;
        }
        
        .actions-dropdown-header {
            padding: 12px 16px;
            border-bottom: 1px solid #e9ecef;
            background: #f8f9fa;
            border-radius: 8px 8px 0 0;
        }
        
        .actions-title {
            font-weight: 600;
            font-size: 14px;
            color: #333;
        }
        
        .actions-dropdown-content {
            padding: 8px 0;
            max-height: 400px;
            overflow-y: auto;
        }
        
        .action-item {
            display: flex;
            align-items: center;
            padding: 12px 16px;
            cursor: pointer;
            transition: background-color 0.2s;
        }
        
        .action-item:hover {
            background-color: #f8f9fa;
        }
        
        .action-icon {
            font-size: 16px;
            margin-right: 12px;
            flex-shrink: 0;
        }
        
        .action-content {
            flex: 1;
        }
        
        .action-label {
            font-weight: 500;
            color: #333;
            margin-bottom: 2px;
        }
        
        .action-description {
            font-size: 12px;
            color: #666;
            line-height: 1.3;
        }
        
        /* Context Email Modal */
        .context-email-modal-content {
            max-width: 800px;
            max-height: 90vh;
            width: 90vw;
        }
        
        .context-email-body {
            padding: 20px;
            max-height: 70vh;
            overflow-y: auto;
        }
        
        .context-info {
            margin-bottom: 25px;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
            border-left: 4px solid #007bff;
        }
        
        .context-info h4 {
            margin: 0 0 10px 0;
            color: #333;
            font-size: 16px;
        }
        
        .context-details {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        
        .context-item {
            font-size: 14px;
            color: #555;
        }
        
        .template-selection {
            margin-bottom: 25px;
        }
        
        .template-selection h4 {
            margin: 0 0 15px 0;
            color: #333;
            font-size: 16px;
        }
        
        .template-selection-methods {
            border: 1px solid #e9ecef;
            border-radius: 8px;
            overflow: hidden;
        }
        
        .selection-method {
            border-bottom: 1px solid #e9ecef;
        }
        
        .selection-method:last-child {
            border-bottom: none;
        }
        
        .method-header {
            display: flex;
            align-items: center;
            padding: 12px 16px;
            background: #f8f9fa;
            cursor: pointer;
            transition: background-color 0.2s;
        }
        
        .method-header:hover {
            background: #e9ecef;
        }
        
        .method-header input[type="radio"] {
            margin-right: 10px;
        }
        
        .method-header label {
            font-weight: 500;
            color: #333;
            cursor: pointer;
            flex: 1;
        }
        
        .method-content {
            padding: 16px;
            background: white;
            max-height: 200px;
            overflow-y: auto;
        }
        
        .selection-method:not(.active) .method-content {
            display: none;
        }
        
        .suggested-templates,
        .all-templates {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        
        .template-option {
            padding: 12px;
            border: 1px solid #e9ecef;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .template-option:hover {
            border-color: #007bff;
            background: #f8f9ff;
        }
        
        .template-option.selected {
            border-color: #007bff;
            background: #e3f2fd;
        }
        
        .template-name {
            font-weight: 500;
            color: #333;
            margin-bottom: 4px;
        }
        
        .template-subject {
            font-size: 12px;
            color: #666;
        }
        
        .no-suggestions {
            text-align: center;
            padding: 20px;
            color: #666;
        }
        
        .no-suggestions p {
            margin: 0 0 8px 0;
        }
        
        .template-preview {
            margin-bottom: 20px;
        }
        
        .template-preview h4 {
            margin: 0 0 15px 0;
            color: #333;
            font-size: 16px;
        }
        
        .preview-content {
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 16px;
            background: #f8f9fa;
        }
        
        .preview-field {
            margin-bottom: 15px;
        }
        
        .preview-field:last-child {
            margin-bottom: 0;
        }
        
        .preview-field strong {
            display: block;
            margin-bottom: 5px;
            color: #333;
        }
        
        .preview-to,
        .preview-subject,
        .preview-body {
            background: white;
            padding: 10px;
            border-radius: 4px;
            border: 1px solid #ddd;
            font-size: 14px;
            color: #555;
            line-height: 1.4;
        }
        
        .preview-body {
            white-space: pre-wrap;
            max-height: 150px;
            overflow-y: auto;
        }
    `;
    
    document.head.appendChild(style);
}

// Test function for project actions
window.testProjectActions = function() {
    console.log('=== Testing Project Actions System ===');
    
    // Test email actions configuration
    console.log('Available email actions:', Object.keys(EMAIL_ACTIONS));
    
    // Test template suggestions
    const testActionType = 'schedule-meeting';
    console.log(`Testing template suggestions for "${testActionType}"`);
    
    if (state.emailTemplates && state.emailTemplates.length > 0) {
        const suggestions = getTemplateSuggestions(testActionType, 'project-1');
        console.log('Suggested templates:', suggestions.map(t => t.name));
        
        // Test context-aware template preview
        if (suggestions.length > 0) {
            const testTemplate = suggestions[0];
            console.log('Testing template preview:', testTemplate.name);
            
            // Test with first available project
            const projectIds = Object.keys(state.projectsData);
            if (projectIds.length > 0) {
                const projectId = projectIds[0];
                const preview = previewTemplate(testTemplate, projectId, 0);
                console.log('Preview result:', preview);
            }
        }
    } else {
        console.log('No email templates found');
    }
    
    return {
        actionsAvailable: Object.keys(EMAIL_ACTIONS),
        templatesCount: state.emailTemplates?.length || 0,
        projectsCount: Object.keys(state.projectsData).length
    };
}; 