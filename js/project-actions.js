import { state, saveState } from './state.js';
import { showNotification } from './ui.js';
import { resolveTemplateRecipients, previewTemplate } from './email-templates.js';

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
    
    // Create actions dropdown button
    const actionsBtn = document.createElement('button');
    actionsBtn.classList.add('actions-btn');
    actionsBtn.setAttribute('data-project-id', projectId);
    actionsBtn.setAttribute('data-row-index', rowIndex);
    
    if (isMainTemplate) {
        // Different styling and functionality for main template
        actionsBtn.classList.add('main-template-actions-btn');
        actionsBtn.innerHTML = '⚙️';
        actionsBtn.title = 'Configure Actions (Main Template)';
        
        // Add click event for main template configuration
        actionsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showMainTemplateActionsConfig(rowIndex, e.target);
        });
    } else {
        // Regular project actions
        actionsBtn.innerHTML = '⚡';
        actionsBtn.title = 'Actions';
        
        // Add click event for actions dropdown
        actionsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showActionsDropdown(projectId, rowIndex, e.target);
        });
    }
    
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
    
    // Temporarily position dropdown off-screen to measure its dimensions
    dropdown.style.position = 'fixed';
    dropdown.style.top = '-9999px';
    dropdown.style.left = '-9999px';
    dropdown.style.visibility = 'hidden';
    
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
    
    // Add to document (temporarily hidden)
    document.body.appendChild(dropdown);
    
    // Use the same intelligent positioning as main template config
    positionDropdownIntelligently(dropdown, buttonElement);
    
    // Remove dropdown when clicking outside
    setTimeout(() => {
        document.addEventListener('click', function closeDropdown(e) {
            if (!dropdown.contains(e.target)) {
                dropdown.style.opacity = '0';
                dropdown.style.transform = 'scale(0.95)';
                setTimeout(() => dropdown.remove(), 150);
                document.removeEventListener('click', closeDropdown);
            }
        });
    }, 0);
}

// ==================== MAIN TEMPLATE ACTIONS CONFIGURATION ==================== //

// Show main template actions configuration
function showMainTemplateActionsConfig(rowIndex, buttonElement) {
    // Remove any existing dropdown
    const existingDropdown = document.querySelector('.actions-dropdown');
    if (existingDropdown) {
        existingDropdown.remove();
    }
    
    const dropdown = document.createElement('div');
    dropdown.classList.add('actions-dropdown', 'main-template-config');
    
    // Temporarily position dropdown off-screen to measure its dimensions
    dropdown.style.position = 'fixed';
    dropdown.style.top = '-9999px';
    dropdown.style.left = '-9999px';
    dropdown.style.visibility = 'hidden';
    
    // Create dropdown content for main template configuration
    dropdown.innerHTML = `
        <div class="actions-dropdown-header">
            <span class="actions-title">⚙️ Configure Actions (Row ${rowIndex + 1})</span>
        </div>
        <div class="actions-dropdown-content">
            <div class="config-section">
                <h4>📧 Email Actions Setup</h4>
                <div class="config-item" data-config-type="enable-email">
                    <span class="config-icon">✉️</span>
                    <div class="config-content">
                        <div class="config-label">Enable Email Actions</div>
                        <div class="config-description">Allow email actions for this row type</div>
                    </div>
                    <div class="config-toggle">
                        <input type="checkbox" checked>
                    </div>
                </div>
                <div class="config-item" data-config-type="default-template">
                    <span class="config-icon">📝</span>
                    <div class="config-content">
                        <div class="config-label">Set Default Template</div>
                        <div class="config-description">Choose default email template for this task type</div>
                    </div>
                </div>
                <div class="config-item" data-config-type="action-rules">
                    <span class="config-icon">🔄</span>
                    <div class="config-content">
                        <div class="config-label">Configure Action Rules</div>
                        <div class="config-description">Set up automated action triggers</div>
                    </div>
                </div>
            </div>
            
            <div class="config-section">
                <h4>🎯 Action Availability</h4>
                ${Object.entries(EMAIL_ACTIONS).map(([actionType, action]) => `
                    <div class="config-item action-toggle-item" data-action-type="${actionType}">
                        <span class="config-icon">${action.icon}</span>
                        <div class="config-content">
                            <div class="config-label">${action.label}</div>
                            <div class="config-description">${action.description}</div>
                        </div>
                        <div class="config-toggle">
                            <input type="checkbox" checked>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div class="config-section">
                <h4>🔧 Advanced Settings</h4>
                <div class="config-item" data-config-type="inherit-settings">
                    <span class="config-icon">📋</span>
                    <div class="config-content">
                        <div class="config-label">Propagate to Projects</div>
                        <div class="config-description">Apply these settings to all existing projects</div>
                    </div>
                </div>
                <div class="config-item" data-config-type="reset-defaults">
                    <span class="config-icon">🔄</span>
                    <div class="config-content">
                        <div class="config-label">Reset to Defaults</div>
                        <div class="config-description">Restore default action configuration</div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add event listeners for configuration items
    dropdown.querySelectorAll('.config-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const configType = item.getAttribute('data-config-type');
            const actionType = item.getAttribute('data-action-type');
            handleMainTemplateConfig(rowIndex, configType, actionType, item);
        });
    });
    
    // Add to document (temporarily hidden)
    document.body.appendChild(dropdown);
    
    // Use the same intelligent positioning as regular dropdowns
    positionDropdownIntelligently(dropdown, buttonElement);
    
    // Remove dropdown when clicking outside
    setTimeout(() => {
        document.addEventListener('click', function closeDropdown(e) {
            if (!dropdown.contains(e.target)) {
                dropdown.style.opacity = '0';
                dropdown.style.transform = 'scale(0.95)';
                setTimeout(() => dropdown.remove(), 150);
                document.removeEventListener('click', closeDropdown);
            }
        });
    }, 0);
}

// Handle main template configuration actions
function handleMainTemplateConfig(rowIndex, configType, actionType, itemElement) {
    console.log('Main Template Config:', { rowIndex, configType, actionType });
    
    switch (configType) {
        case 'enable-email':
            const checkbox = itemElement.querySelector('input[type="checkbox"]');
            const isEnabled = checkbox.checked;
            showNotification(`Email actions ${isEnabled ? 'enabled' : 'disabled'} for row ${rowIndex + 1}`, 'info');
            break;
            
        case 'default-template':
            showDefaultTemplateSelector(rowIndex);
            break;
            
        case 'action-rules':
            showActionRulesConfig(rowIndex);
            break;
            
        case 'inherit-settings':
            showInheritSettingsModal(rowIndex);
            break;
            
        case 'reset-defaults':
            showNotification(`Row ${rowIndex + 1} settings reset to defaults`, 'success');
            // Close dropdown
            document.querySelector('.actions-dropdown').remove();
            break;
            
        default:
            if (actionType) {
                // Handle action type toggle
                const checkbox = itemElement.querySelector('input[type="checkbox"]');
                const action = EMAIL_ACTIONS[actionType];
                const isEnabled = checkbox.checked;
                showNotification(`${action.label} ${isEnabled ? 'enabled' : 'disabled'} for row ${rowIndex + 1}`, 'info');
            }
            break;
    }
}

// Show default template selector
function showDefaultTemplateSelector(rowIndex) {
    showNotification('Default template selector would open here', 'info');
    // TODO: Implement template selection modal
}

// Show action rules configuration
function showActionRulesConfig(rowIndex) {
    showNotification('Action rules configuration would open here', 'info');
    // TODO: Implement action rules modal
}

// Show inherit settings modal
function showInheritSettingsModal(rowIndex) {
    showNotification('Settings would be applied to all projects', 'info');
    // TODO: Implement inheritance logic
}

// Extract positioning logic into reusable function
function positionDropdownIntelligently(dropdown, buttonElement) {
    // Calculate intelligent positioning
    const rect = buttonElement.getBoundingClientRect();
    const dropdownRect = dropdown.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;
    
    // Calculate optimal position
    let top = rect.bottom + 5;
    let left = rect.left;
    
    // Check if dropdown would extend beyond right edge
    if (left + dropdownRect.width > viewportWidth - 20) {
        // Position to the left of the button
        left = rect.right - dropdownRect.width;
        
        // If still extending beyond left edge, center it
        if (left < 20) {
            left = Math.max(20, (viewportWidth - dropdownRect.width) / 2);
        }
    }
    
    // Check if dropdown would extend beyond bottom edge
    if (top + dropdownRect.height > viewportHeight - 20) {
        // Position above the button
        top = rect.top - dropdownRect.height - 5;
        
        // If still extending beyond top edge, center it vertically
        if (top < 20) {
            top = Math.max(20, (viewportHeight - dropdownRect.height) / 2);
        }
    }
    
    // Apply final positioning and make visible
    dropdown.style.top = `${top}px`;
    dropdown.style.left = `${left}px`;
    dropdown.style.visibility = 'visible';
    
    // Set transform origin based on position relative to button
    const isPositionedAbove = top < rect.top;
    const isPositionedToLeft = left < rect.left;
    
    if (isPositionedAbove && isPositionedToLeft) {
        dropdown.style.transformOrigin = 'bottom right';
    } else if (isPositionedAbove) {
        dropdown.style.transformOrigin = 'bottom left';
    } else if (isPositionedToLeft) {
        dropdown.style.transformOrigin = 'top right';
    } else {
        dropdown.style.transformOrigin = 'top left';
    }
    
    // Add smooth entrance animation
    dropdown.style.opacity = '0';
    dropdown.style.transform = 'scale(0.95)';
    
    // Trigger animation
    requestAnimationFrame(() => {
        dropdown.style.transition = 'opacity 0.15s ease-out, transform 0.15s ease-out';
        dropdown.style.opacity = '1';
        dropdown.style.transform = 'scale(1)';
    });
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
            box-shadow: 0 2px 8px rgba(0,123,255,0.3);
        }
        
        .actions-btn:active {
            transform: scale(1.05);
        }
        
        .main-template-actions-btn {
            background: #6c757d;
            border: 2px solid #5a6268;
        }
        
        .main-template-actions-btn:hover {
            background: #5a6268;
            border-color: #495057;
            transform: scale(1.1);
            box-shadow: 0 2px 8px rgba(108,117,125,0.3);
        }
        
        /* Actions Dropdown */
        .actions-dropdown {
            position: fixed;
            background: white;
            border: 1px solid #ddd;
            border-radius: 8px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.2);
            z-index: 1000;
            min-width: 280px;
            max-width: 320px;
            transform-origin: top left;
            transition: opacity 0.15s ease-out, transform 0.15s ease-out;
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
        
        /* Main Template Configuration Styles */
        .main-template-config {
            min-width: 350px;
            max-width: 400px;
            max-height: 80vh;
            overflow-y: auto;
        }
        
        .main-template-config .actions-dropdown-content {
            max-height: none;
        }
        
        .config-section {
            border-bottom: 1px solid #e9ecef;
            padding-bottom: 12px;
            margin-bottom: 12px;
        }
        
        .config-section:last-child {
            border-bottom: none;
            margin-bottom: 0;
        }
        
        .config-section h4 {
            margin: 0 0 12px 0;
            font-size: 13px;
            font-weight: 600;
            color: #495057;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .config-item {
            display: flex;
            align-items: center;
            padding: 12px 8px;
            cursor: pointer;
            transition: background-color 0.2s;
            border-radius: 6px;
            margin-bottom: 4px;
        }
        
        .config-item:hover {
            background-color: #f8f9fa;
        }
        
        .config-item:last-child {
            margin-bottom: 0;
        }
        
        .config-icon {
            font-size: 16px;
            margin-right: 12px;
            flex-shrink: 0;
            width: 20px;
            text-align: center;
        }
        
        .config-content {
            flex: 1;
            margin-right: 12px;
        }
        
        .config-label {
            font-weight: 500;
            color: #333;
            margin-bottom: 2px;
            font-size: 14px;
        }
        
        .config-description {
            font-size: 12px;
            color: #666;
            line-height: 1.3;
        }
        
        .config-toggle {
            flex-shrink: 0;
        }
        
        .config-toggle input[type="checkbox"] {
            width: 16px;
            height: 16px;
            cursor: pointer;
        }
        
        .action-toggle-item {
            border-left: 3px solid transparent;
        }
        
        .action-toggle-item:hover {
            border-left-color: #007bff;
            background-color: #f0f8ff;
        }
        
        .main-template-actions-header {
            background: linear-gradient(135deg, #6c757d 0%, #5a6268 100%);
            color: white;
            border-left: 3px solid #495057;
            position: relative;
        }
        
        .main-template-actions-header::after {
            content: '⚙️';
            position: absolute;
            right: 8px;
            top: 50%;
            transform: translateY(-50%);
            opacity: 0.7;
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

// Test function for dropdown positioning
window.testDropdownPositioning = function() {
    console.log('=== Testing Dropdown Positioning ===');
    
    const actionsButtons = document.querySelectorAll('.actions-btn');
    console.log(`Found ${actionsButtons.length} action buttons`);
    
    if (actionsButtons.length > 0) {
        // Test with the last button (likely to be near bottom/edge)
        const lastButton = actionsButtons[actionsButtons.length - 1];
        console.log('Testing positioning with last action button...');
        
        // Simulate click to test positioning
        lastButton.click();
        
        setTimeout(() => {
            const dropdown = document.querySelector('.actions-dropdown');
            if (dropdown) {
                const rect = dropdown.getBoundingClientRect();
                console.log('Dropdown positioned at:', {
                    top: rect.top,
                    left: rect.left,
                    bottom: rect.bottom,
                    right: rect.right,
                    fullyVisible: {
                        top: rect.top >= 0,
                        left: rect.left >= 0,
                        bottom: rect.bottom <= window.innerHeight,
                        right: rect.right <= window.innerWidth
                    }
                });
                
                // Close dropdown
                dropdown.click();
            } else {
                console.log('No dropdown found');
            }
        }, 100);
    } else {
        console.log('No action buttons found. Make sure you\'re on a project tab.');
    }
};

// Test function for main template actions
window.testMainTemplateActions = function() {
    console.log('=== Testing Main Template Actions ===');
    
    // Check if we're on the main template tab
    const mainTemplateTab = document.querySelector('[data-tab="main-template"]');
    const isMainTemplateActive = mainTemplateTab?.classList.contains('active');
    
    console.log('Main template tab active:', isMainTemplateActive);
    
    if (!isMainTemplateActive) {
        console.log('Switch to the Main Template tab to see the configuration actions.');
        return { onMainTemplate: false };
    }
    
    // Look for main template action buttons
    const mainTemplateButtons = document.querySelectorAll('.main-template-actions-btn');
    console.log(`Found ${mainTemplateButtons.length} main template action buttons`);
    
    if (mainTemplateButtons.length > 0) {
        // Test with the first button
        const firstButton = mainTemplateButtons[0];
        console.log('Testing configuration with first action button...');
        
        // Simulate click to test configuration
        firstButton.click();
        
        setTimeout(() => {
            const configDropdown = document.querySelector('.main-template-config');
            if (configDropdown) {
                console.log('Configuration dropdown opened successfully');
                console.log('Available config sections:', 
                    Array.from(configDropdown.querySelectorAll('.config-section h4'))
                         .map(h => h.textContent)
                );
                
                // Close dropdown
                configDropdown.click();
            } else {
                console.log('No configuration dropdown found');
            }
        }, 100);
    }
    
    return {
        onMainTemplate: isMainTemplateActive,
        configButtonsFound: mainTemplateButtons.length,
        regularButtonsFound: document.querySelectorAll('.actions-btn:not(.main-template-actions-btn)').length
    };
}; 