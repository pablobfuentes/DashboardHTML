import { state, saveState } from './state.js';
import { showNotification } from './ui.js';
import { resolveTemplateRecipients, previewTemplate } from './email-templates.js';

// ==================== EMAIL ACTION SYSTEM ==================== //

// INHERITANCE SYSTEM OVERVIEW:
// 1. Main Template serves as the configuration hub for all actions
// 2. Each row in Main Template can have different action configurations
// 3. When "Accept" is clicked, settings are propagated to all projects
// 4. Project dropdowns only show actions enabled for that specific row type
// 5. If no actions are enabled, a helpful message is shown instead

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
    console.log('Initializing Project Actions System');
    
    // Clean up any stuck modals from previous sessions
    cleanupStuckModals();
    
    // Add the required CSS
    addProjectActionsCSS();
    
    // Initialize the EMAIL_ACTIONS configuration
    console.log('Email Actions configured:', Object.keys(EMAIL_ACTIONS));
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
    
    // Get project-specific configuration for this row
    const rowConfig = getProjectRowActionConfig(projectId, rowIndex);
    
    // Check if email actions are enabled for this row
    if (!rowConfig.emailEnabled) {
        dropdown.innerHTML = `
            <div class="actions-dropdown-header">
                <span class="actions-title">📧 Send Email</span>
            </div>
            <div class="actions-dropdown-content">
                <div class="no-actions-message">
                    <p>Email actions are disabled for this row type.</p>
                    <p>Configure actions in the Main Template to enable them.</p>
                </div>
            </div>
        `;
        
        // Add to document (temporarily hidden)
        document.body.appendChild(dropdown);
        
        // Position dropdown
        positionDropdownIntelligently(dropdown, buttonElement);
        
        // Auto-close after 3 seconds
        setTimeout(() => {
            if (dropdown.parentNode) {
                dropdown.style.opacity = '0';
                dropdown.style.transform = 'scale(0.95)';
                setTimeout(() => dropdown.remove(), 150);
            }
        }, 3000);
        
        return;
    }
    
    // Filter actions based on configuration
    const enabledActions = Object.entries(EMAIL_ACTIONS).filter(([actionType, action]) => {
        return rowConfig[`action_${actionType}`] !== false;
    });
    
    // Check if any actions are enabled
    if (enabledActions.length === 0) {
        dropdown.innerHTML = `
            <div class="actions-dropdown-header">
                <span class="actions-title">📧 Send Email</span>
            </div>
            <div class="actions-dropdown-content">
                <div class="no-actions-message">
                    <p>No email actions are enabled for this row type.</p>
                    <p>Configure actions in the Main Template to enable them.</p>
                </div>
            </div>
        `;
        
        // Add to document (temporarily hidden)
        document.body.appendChild(dropdown);
        
        // Position dropdown
        positionDropdownIntelligently(dropdown, buttonElement);
        
        // Auto-close after 3 seconds
        setTimeout(() => {
            if (dropdown.parentNode) {
                dropdown.style.opacity = '0';
                dropdown.style.transform = 'scale(0.95)';
                setTimeout(() => dropdown.remove(), 150);
            }
        }, 3000);
        
        return;
    }
    
    // Create dropdown content with only enabled actions
    dropdown.innerHTML = `
        <div class="actions-dropdown-header">
            <span class="actions-title">📧 Send Email</span>
        </div>
        <div class="actions-dropdown-content">
            ${enabledActions.map(([actionType, action]) => `
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
    
    // Get current configuration for this row
    const currentConfig = getRowActionConfig(rowIndex);
    
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
                        <input type="checkbox" ${currentConfig.emailEnabled ? 'checked' : ''}>
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
                            <input type="checkbox" ${currentConfig[`action_${actionType}`] !== false ? 'checked' : ''}>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <div class="config-modal-footer">
            <button type="button" class="btn-secondary config-cancel">Cancel</button>
            <button type="button" class="btn-primary config-accept">Accept</button>
        </div>
    `;
    
    // Add event listeners for configuration items
    dropdown.querySelectorAll('.config-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            
            // Handle checkbox clicks specially
            if (e.target.type === 'checkbox') {
                // Let the checkbox handle its own state change
                setTimeout(() => {
                    const configType = item.getAttribute('data-config-type');
                    const actionType = item.getAttribute('data-action-type');
                    handleMainTemplateConfig(rowIndex, configType, actionType, item);
                }, 0);
            } else {
                // For non-checkbox clicks, toggle the checkbox if it exists
                const checkbox = item.querySelector('input[type="checkbox"]');
                if (checkbox) {
                    checkbox.checked = !checkbox.checked;
                }
                
                const configType = item.getAttribute('data-config-type');
                const actionType = item.getAttribute('data-action-type');
                handleMainTemplateConfig(rowIndex, configType, actionType, item);
            }
        });
    });
    
    // Add event listeners for Accept and Cancel buttons
    dropdown.querySelector('.config-cancel').addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.style.opacity = '0';
        dropdown.style.transform = 'scale(0.95)';
        setTimeout(() => dropdown.remove(), 150);
    });
    
    dropdown.querySelector('.config-accept').addEventListener('click', (e) => {
        e.stopPropagation();
        // Propagate settings to all projects
        propagateRowSettingsFromConfig(rowIndex);
        
        // Close dropdown
        dropdown.style.opacity = '0';
        dropdown.style.transform = 'scale(0.95)';
        setTimeout(() => dropdown.remove(), 150);
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
            saveRowActionConfig(rowIndex, 'emailEnabled', isEnabled);
            showNotification(`Email actions ${isEnabled ? 'enabled' : 'disabled'} for row ${rowIndex + 1}`, 'success');
            break;
            
        case 'default-template':
            showDefaultTemplateSelector(rowIndex);
            break;
            
        case 'action-rules':
            showActionRulesConfig(rowIndex);
            break;
            
        default:
            if (actionType) {
                // Handle action type toggle
                const checkbox = itemElement.querySelector('input[type="checkbox"]');
                const action = EMAIL_ACTIONS[actionType];
                const isEnabled = checkbox.checked;
                saveRowActionConfig(rowIndex, `action_${actionType}`, isEnabled);
                showNotification(`${action.label} ${isEnabled ? 'enabled' : 'disabled'} for row ${rowIndex + 1}`, 'success');
            }
            break;
    }
}

// ==================== CONFIGURATION PERSISTENCE ==================== //

// Save row action configuration
function saveRowActionConfig(rowIndex, configKey, value) {
    if (!state.mainTemplateActions[rowIndex]) {
        state.mainTemplateActions[rowIndex] = getDefaultRowConfig();
    }
    
    state.mainTemplateActions[rowIndex][configKey] = value;
    saveState();
    console.log(`Saved config for row ${rowIndex}:`, state.mainTemplateActions[rowIndex]);
}

// Get row action configuration
function getRowActionConfig(rowIndex) {
    return state.mainTemplateActions[rowIndex] || getDefaultRowConfig();
}

// Get project-specific row action configuration (inherited from main template)
function getProjectRowActionConfig(projectId, rowIndex) {
    const project = state.projectsData[projectId];
    if (!project) return getDefaultRowConfig();
    
    // Check if project has inherited configuration for this row
    if (project.actionConfigs && project.actionConfigs[rowIndex]) {
        return project.actionConfigs[rowIndex];
    }
    
    // Fall back to main template configuration
    return getRowActionConfig(rowIndex);
}

// Get default configuration for a row
function getDefaultRowConfig() {
    const defaultConfig = {
        emailEnabled: true,
        defaultTemplate: null,
        actionRules: {},
    };
    
    // Enable all actions by default
    Object.keys(EMAIL_ACTIONS).forEach(actionType => {
        defaultConfig[`action_${actionType}`] = true;
    });
    
    return defaultConfig;
}

// Reset row configuration to defaults
function resetRowActionConfig(rowIndex) {
    state.mainTemplateActions[rowIndex] = getDefaultRowConfig();
    saveState();
    console.log(`Reset config for row ${rowIndex} to defaults`);
}

// ==================== TEMPLATE SELECTION ==================== //

// Show default template selector
function showDefaultTemplateSelector(rowIndex) {
    const currentConfig = getRowActionConfig(rowIndex);
    const currentTemplate = currentConfig.defaultTemplate;
    
    // Remove any existing modal
    const existingModal = document.getElementById('template-selector-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modal = document.createElement('div');
    modal.id = 'template-selector-modal';
    modal.className = 'template-modal';
    
    modal.innerHTML = `
        <div class="template-modal-content">
            <div class="template-modal-header">
                <h3>📝 Select Default Template for Row ${rowIndex + 1}</h3>
                <button class="template-modal-close" onclick="document.getElementById('template-selector-modal').remove()">&times;</button>
            </div>
            
            <div class="template-selector-body">
                <div class="current-template-info">
                    <h4>Current Default Template</h4>
                    <div class="current-template-display">
                        ${currentTemplate ? `
                            <div class="template-preview-card selected-template">
                                <div class="template-name">${currentTemplate.name}</div>
                                <div class="template-subject">${currentTemplate.subject}</div>
                                <button class="remove-default-btn" onclick="removeDefaultTemplate(${rowIndex})">Remove Default</button>
                            </div>
                        ` : `
                            <div class="no-template-selected">
                                <p>No default template selected</p>
                                <p>Actions will show all available templates</p>
                            </div>
                        `}
                    </div>
                </div>
                
                <div class="template-selection-list">
                    <h4>Available Templates</h4>
                    <div class="templates-list">
                        ${state.emailTemplates.map(template => `
                            <div class="template-preview-card ${currentTemplate?.id === template.id ? 'current-default' : ''}" 
                                 data-template-id="${template.id}">
                                <div class="template-name">${template.name}</div>
                                <div class="template-subject">${template.subject}</div>
                                <div class="template-tags">
                                    ${template.tags ? template.tags.map(tag => `<span class="tag">${tag}</span>`).join('') : ''}
                                </div>
                                <button class="select-template-btn" onclick="selectDefaultTemplate(${rowIndex}, '${template.id}')">
                                    ${currentTemplate?.id === template.id ? 'Current Default' : 'Set as Default'}
                                </button>
                            </div>
                        `).join('')}
                        
                        ${state.emailTemplates.length === 0 ? `
                            <div class="no-templates">
                                <p>No email templates available</p>
                                <p>Create templates in the Email Templates section first</p>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
            
            <div class="template-modal-footer">
                <button type="button" class="btn-secondary" onclick="document.getElementById('template-selector-modal').remove()">Close</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Select default template for row
window.selectDefaultTemplate = function(rowIndex, templateId) {
    const template = state.emailTemplates.find(t => t.id === templateId);
    if (!template) {
        showNotification('Template not found', 'error');
        return;
    }
    
    saveRowActionConfig(rowIndex, 'defaultTemplate', template);
    showNotification(`"${template.name}" set as default template for row ${rowIndex + 1}`, 'success');
    
    // Refresh the modal
    document.getElementById('template-selector-modal').remove();
    showDefaultTemplateSelector(rowIndex);
};

// Remove default template for row
window.removeDefaultTemplate = function(rowIndex) {
    saveRowActionConfig(rowIndex, 'defaultTemplate', null);
    showNotification(`Default template removed for row ${rowIndex + 1}`, 'success');
    
    // Refresh the modal
    document.getElementById('template-selector-modal').remove();
    showDefaultTemplateSelector(rowIndex);
};

// ==================== ACTION RULES CONFIGURATION ==================== //

// Show action rules configuration
function showActionRulesConfig(rowIndex) {
    const currentConfig = getRowActionConfig(rowIndex);
    
    // Remove any existing modal
    const existingModal = document.getElementById('action-rules-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modal = document.createElement('div');
    modal.id = 'action-rules-modal';
    modal.className = 'template-modal';
    
    modal.innerHTML = `
        <div class="template-modal-content">
            <div class="template-modal-header">
                <h3>🔄 Configure Action Rules for Row ${rowIndex + 1}</h3>
                <button class="template-modal-close" onclick="document.getElementById('action-rules-modal').remove()">&times;</button>
            </div>
            
            <div class="action-rules-body">
                <div class="rules-explanation">
                    <h4>Automated Action Triggers</h4>
                    <p>Set up rules to automatically suggest or trigger email actions based on task status changes.</p>
                </div>
                
                <div class="rule-categories">
                    <div class="rule-category">
                        <h5>📊 Status Change Triggers</h5>
                        <div class="rule-item">
                            <label>
                                <input type="checkbox" ${currentConfig.actionRules?.onStatusComplete ? 'checked' : ''}>
                                <span>Suggest "Thank Team" when status changes to "completo"</span>
                            </label>
                        </div>
                        <div class="rule-item">
                            <label>
                                <input type="checkbox" ${currentConfig.actionRules?.onStatusBlocked ? 'checked' : ''}>
                                <span>Suggest "Issue Alert" when task becomes blocked</span>
                            </label>
                        </div>
                        <div class="rule-item">
                            <label>
                                <input type="checkbox" ${currentConfig.actionRules?.onStatusProgress ? 'checked' : ''}>
                                <span>Suggest "Status Update" when status changes to "en proceso"</span>
                            </label>
                        </div>
                    </div>
                    
                    <div class="rule-category">
                        <h5>📅 Time-Based Triggers</h5>
                        <div class="rule-item">
                            <label>
                                <input type="checkbox" ${currentConfig.actionRules?.onDeadlineApproach ? 'checked' : ''}>
                                <span>Suggest "Follow Up" 2 days before deadline</span>
                            </label>
                        </div>
                        <div class="rule-item">
                            <label>
                                <input type="checkbox" ${currentConfig.actionRules?.onDeadlineOverdue ? 'checked' : ''}>
                                <span>Suggest "Issue Alert" when deadline is overdue</span>
                            </label>
                        </div>
                    </div>
                    
                    <div class="rule-category">
                        <h5>🎯 Milestone Triggers</h5>
                        <div class="rule-item">
                            <label>
                                <input type="checkbox" ${currentConfig.actionRules?.onMilestoneComplete ? 'checked' : ''}>
                                <span>Suggest "Milestone Reached" when milestone is completed</span>
                            </label>
                        </div>
                        <div class="rule-item">
                            <label>
                                <input type="checkbox" ${currentConfig.actionRules?.onProjectStart ? 'checked' : ''}>
                                <span>Suggest "Schedule Meeting" at project start</span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="template-modal-footer">
                <button type="button" class="btn-secondary" onclick="document.getElementById('action-rules-modal').remove()">Cancel</button>
                <button type="button" class="btn-primary" onclick="saveActionRules(${rowIndex})">Save Rules</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Save action rules
window.saveActionRules = function(rowIndex) {
    const modal = document.getElementById('action-rules-modal');
    const checkboxes = modal.querySelectorAll('input[type="checkbox"]');
    
    const rules = {};
    checkboxes.forEach((checkbox, index) => {
        const ruleNames = [
            'onStatusComplete', 'onStatusBlocked', 'onStatusProgress',
            'onDeadlineApproach', 'onDeadlineOverdue',
            'onMilestoneComplete', 'onProjectStart'
        ];
        
        if (ruleNames[index]) {
            rules[ruleNames[index]] = checkbox.checked;
        }
    });
    
    saveRowActionConfig(rowIndex, 'actionRules', rules);
    showNotification(`Action rules saved for row ${rowIndex + 1}`, 'success');
    modal.remove();
};

// ==================== INHERITANCE AND PROPAGATION ==================== //

// Show inherit settings modal
function showInheritSettingsModal(rowIndex) {
    const modal = document.createElement('div');
    modal.id = 'inherit-settings-modal';
    modal.className = 'template-modal';
    
    const projectCount = Object.keys(state.projectsData).length;
    const currentConfig = getRowActionConfig(rowIndex);
    
    modal.innerHTML = `
        <div class="template-modal-content">
            <div class="template-modal-header">
                <h3>📋 Propagate Settings to Projects</h3>
                <button class="template-modal-close" onclick="document.getElementById('inherit-settings-modal').remove()">&times;</button>
            </div>
            
            <div class="inherit-settings-body">
                <div class="inherit-explanation">
                    <h4>Apply Row ${rowIndex + 1} Settings to All Projects</h4>
                    <p>This will apply the current configuration for row ${rowIndex + 1} to the corresponding row in all ${projectCount} existing projects.</p>
                </div>
                
                <div class="settings-preview">
                    <h5>Settings to Apply:</h5>
                    <ul>
                        <li>Email Actions: ${currentConfig.emailEnabled ? '✅ Enabled' : '❌ Disabled'}</li>
                        <li>Default Template: ${currentConfig.defaultTemplate ? currentConfig.defaultTemplate.name : 'None'}</li>
                        <li>Action Rules: ${Object.keys(currentConfig.actionRules || {}).length} rules configured</li>
                        <li>Available Actions: ${Object.keys(EMAIL_ACTIONS).filter(action => 
                            currentConfig[`action_${action}`] !== false
                        ).length} of ${Object.keys(EMAIL_ACTIONS).length} enabled</li>
                    </ul>
                </div>
                
                <div class="inheritance-options">
                    <h5>Propagation Options:</h5>
                    <label>
                        <input type="checkbox" id="propagate-existing" checked>
                        <span>Apply to existing projects (${projectCount} projects)</span>
                    </label>
                    <label>
                        <input type="checkbox" id="propagate-future" checked>
                        <span>Apply to future projects automatically</span>
                    </label>
                    <label>
                        <input type="checkbox" id="overwrite-existing">
                        <span>Overwrite existing project-specific configurations</span>
                    </label>
                </div>
                
                ${projectCount === 0 ? `
                    <div class="no-projects-warning">
                        <p>⚠️ No projects found. Settings will be applied to future projects.</p>
                    </div>
                ` : ''}
            </div>
            
            <div class="template-modal-footer">
                <button type="button" class="btn-secondary" onclick="document.getElementById('inherit-settings-modal').remove()">Cancel</button>
                <button type="button" class="btn-primary" onclick="propagateRowSettings(${rowIndex})">Apply Settings</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Propagate row settings to projects
window.propagateRowSettings = function(rowIndex) {
    const modal = document.getElementById('inherit-settings-modal');
    const propagateExisting = modal.querySelector('#propagate-existing').checked;
    const propagateFuture = modal.querySelector('#propagate-future').checked;
    const overwriteExisting = modal.querySelector('#overwrite-existing').checked;
    
    const sourceConfig = getRowActionConfig(rowIndex);
    let appliedCount = 0;
    
    if (propagateExisting) {
        Object.keys(state.projectsData).forEach(projectId => {
            // Apply settings to each project
            if (!state.projectsData[projectId].actionConfigs) {
                state.projectsData[projectId].actionConfigs = {};
            }
            
            if (overwriteExisting || !state.projectsData[projectId].actionConfigs[rowIndex]) {
                state.projectsData[projectId].actionConfigs[rowIndex] = { ...sourceConfig };
                appliedCount++;
            }
        });
    }
    
    if (propagateFuture) {
        // Set as default for future projects
        saveRowActionConfig(rowIndex, '_isDefaultForNewProjects', true);
    }
    
    saveState();
    showNotification(`Settings applied to ${appliedCount} projects${propagateFuture ? ' and set as default for future projects' : ''}`, 'success');
    modal.remove();
};

// Propagate row settings from config dropdown (simplified version)
function propagateRowSettingsFromConfig(rowIndex) {
    const sourceConfig = getRowActionConfig(rowIndex);
    let appliedCount = 0;
    
    // Apply to all existing projects
    Object.keys(state.projectsData).forEach(projectId => {
        // Apply settings to each project
        if (!state.projectsData[projectId].actionConfigs) {
            state.projectsData[projectId].actionConfigs = {};
        }
        
        // Always apply/overwrite the configuration
        state.projectsData[projectId].actionConfigs[rowIndex] = { ...sourceConfig };
        appliedCount++;
    });
    
    // Set as default for future projects
    saveRowActionConfig(rowIndex, '_isDefaultForNewProjects', true);
    
    saveState();
    showNotification(`Settings applied to ${appliedCount} projects and set as default for future projects`, 'success');
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
    
    // Check if there's a predefined template for this action
    const mainConfig = getRowActionConfig(rowIndex);
    const projectConfig = getProjectRowActionConfig(projectId, rowIndex);
    const predefinedTemplate = projectConfig.defaultTemplate || mainConfig.defaultTemplate;
    
    if (predefinedTemplate) {
        // Use predefined template directly
        showEmailPreviewModal(projectId, rowIndex, actionType, action, predefinedTemplate);
    } else {
        // Show context-aware email modal for template selection
        showContextAwareEmailModal(projectId, rowIndex, actionType, action);
    }
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
    modal.setAttribute('data-action-type', actionType);
    
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
                    <h4>📝 Select Template</h4>
                    <p>Choose a template to use for this email action:</p>
                    
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
                                                <div class="template-tags">
                                                    ${template.tags ? template.tags.map(tag => `<span class="tag">${tag}</span>`).join('') : ''}
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>
                                ` : `
                                    <div class="no-suggestions">
                                        <p>No templates found for this action type.</p>
                                        <p>Try browsing all templates or create a new one.</p>
                                        <button class="create-action-template-btn" onclick="createActionSpecificTemplate('${actionType}')">
                                            ✨ Create ${action.label} Template
                                        </button>
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
                                            <div class="template-tags">
                                                ${template.tags ? template.tags.map(tag => `<span class="tag">${tag}</span>`).join('') : ''}
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="template-modal-footer">
                <button type="button" class="btn-secondary" onclick="document.getElementById('context-email-modal').remove()">Cancel</button>
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
            
            // Get template and show preview modal
            const templateId = option.getAttribute('data-template-id');
            selectContextTemplate(templateId, projectId, rowIndex);
        });
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
    if (!action) return [];
    
    // Import the quality scoring function from email-templates.js
    const getTemplateQualityScore = window.getTemplateQualityScore || function(template, actionType) {
        // Fallback scoring if not available
        let score = 0;
        if (template.tags && action.suggestedTags) {
            const matchingTags = action.suggestedTags.filter(tag => 
                template.tags.includes(tag) || 
                template.name.toLowerCase().includes(tag.toLowerCase()) ||
                template.subject.toLowerCase().includes(tag.toLowerCase())
            );
            score = matchingTags.length * 10;
        }
        return score;
    };
    
    // Score all templates for this action
    const scoredTemplates = state.emailTemplates.map(template => ({
        ...template,
        score: getTemplateQualityScore(template, actionType)
    }));
    
    // Filter templates with score > 0 (some relevance)
    const relevantTemplates = scoredTemplates.filter(template => template.score > 0);
    
    // Sort by score (highest first)
    relevantTemplates.sort((a, b) => b.score - a.score);
    
    // Return top 5 suggestions
    return relevantTemplates.slice(0, 5);
}

// Select template and update preview
function selectContextTemplate(templateId, projectId, rowIndex) {
    const template = state.emailTemplates.find(t => t.id === templateId);
    if (!template) return;
    
    // Get action type from modal
    const modal = document.getElementById('context-email-modal');
    const actionType = modal.getAttribute('data-action-type');
    const action = EMAIL_ACTIONS[actionType];
    
    // Close the context modal
    modal.remove();
    
    // Show the email preview modal
    showEmailPreviewModal(projectId, rowIndex, actionType, action, template);
}

// Clear context preview (legacy - no longer needed)
function clearContextPreview() {
    // This function is deprecated as we use the preview modal
    console.log('Clear context preview called - no longer needed');
}

// ==================== EMAIL SENDING ==================== //

// Handle context email send (legacy - now handled by preview modal)
function handleContextEmailSend(projectId, rowIndex, actionType) {
    // This function is now deprecated as we use the preview modal
    console.log('Context email send called - should use preview modal instead');
}

// Show email preview modal with template resolved
function showEmailPreviewModal(projectId, rowIndex, actionType, action, template) {
    // Remove any existing modal
    const existingModal = document.getElementById('email-preview-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Get project and task context
    const project = state.projectsData[projectId];
    const task = project.content[rowIndex];
    const taskName = getTaskName(task, project.headers);
    
    // Resolve template with context
    const resolvedTemplate = previewTemplate(template, projectId, rowIndex);
    
    // Create modal
    const modal = document.createElement('div');
    modal.id = 'email-preview-modal';
    modal.className = 'template-modal';
    
    modal.innerHTML = `
        <div class="template-modal-content email-preview-modal-content">
            <div class="template-modal-header">
                <h3>📧 ${action.icon} ${action.label}</h3>
                <button class="template-modal-close" onclick="document.getElementById('email-preview-modal').remove()">&times;</button>
            </div>
            
            <div class="email-preview-body">
                <div class="email-preview-header">
                    <div class="email-preview-info">
                        <div class="preview-item">
                            <strong>Project:</strong> ${project.name}
                        </div>
                        <div class="preview-item">
                            <strong>Task:</strong> ${taskName}
                        </div>
                        <div class="preview-item">
                            <strong>Template:</strong> ${template.name}
                        </div>
                        <div class="preview-item">
                            <strong>Action:</strong> ${action.description}
                        </div>
                    </div>
                </div>
                
                <div class="email-preview-content">
                    <div class="email-field">
                        <label>To:</label>
                        <div class="email-recipients">
                            ${resolvedTemplate.to ? (() => {
                                // Handle both string and array formats
                                if (Array.isArray(resolvedTemplate.to)) {
                                    return resolvedTemplate.to.map(recipient => 
                                        `<div class="recipient-item">
                                            <span class="recipient-name">${recipient.name || recipient.email}</span>
                                            <span class="recipient-email">${recipient.email}</span>
                                        </div>`
                                    ).join('');
                                } else {
                                    // String format - split by comma and display each email
                                    const emails = resolvedTemplate.to.split(',').map(email => email.trim()).filter(email => email);
                                    if (emails.length > 0) {
                                        return emails.map(email => 
                                            `<div class="recipient-item">
                                                <span class="recipient-email">${email}</span>
                                            </div>`
                                        ).join('');
                                    } else {
                                        return '<span class="no-recipients">No recipients specified</span>';
                                    }
                                }
                            })() : '<span class="no-recipients">No recipients specified</span>'}
                        </div>
                    </div>
                    
                    <div class="email-field">
                        <label>Subject:</label>
                        <div class="email-subject">${resolvedTemplate.subject || 'No subject'}</div>
                    </div>
                    
                    <div class="email-field">
                        <label>Body:</label>
                        <div class="email-body">${resolvedTemplate.body || 'No content'}</div>
                    </div>
                </div>
                
                <div class="email-preview-footer">
                    <div class="email-service-info">
                        <p><strong>📧 Email Service:</strong> This email would be sent via your default email client (Outlook/Gmail)</p>
                        <p><strong>🔗 Integration:</strong> Click "Send Email" to open your email client with this content pre-filled</p>
                    </div>
                </div>
            </div>
            
            <div class="template-modal-footer">
                <button type="button" class="btn-secondary" onclick="document.getElementById('email-preview-modal').remove()">Cancel</button>
                <button type="button" class="btn-primary" onclick="sendEmailViaClient('${projectId}', ${rowIndex}, '${actionType}')">
                    📧 Send Email
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Send email via client (simulates opening email client)
window.sendEmailViaClient = function(projectId, rowIndex, actionType) {
    const action = EMAIL_ACTIONS[actionType];
    const project = state.projectsData[projectId];
    const task = project.content[rowIndex];
    const taskName = getTaskName(task, project.headers);
    
    // Get the template
    const mainConfig = getRowActionConfig(rowIndex);
    const projectConfig = getProjectRowActionConfig(projectId, rowIndex);
    const template = projectConfig.defaultTemplate || mainConfig.defaultTemplate;
    
    if (!template) {
        showNotification('No template found', 'error');
        return;
    }
    
    // Resolve template with context
    const resolvedTemplate = previewTemplate(template, projectId, rowIndex);
    
    // Create mailto link
    let recipients = '';
    if (resolvedTemplate.to) {
        if (Array.isArray(resolvedTemplate.to)) {
            recipients = resolvedTemplate.to.map(r => r.email).join(',');
        } else {
            // String format - use as is
            recipients = resolvedTemplate.to;
        }
    }
    const subject = encodeURIComponent(resolvedTemplate.subject || '');
    const body = encodeURIComponent(resolvedTemplate.body || '');
    
    const mailtoLink = `mailto:${recipients}?subject=${subject}&body=${body}`;
    
    // Open email client
    window.open(mailtoLink, '_blank');
    
    // Show success notification
    showNotification(`${action.icon} Email client opened with ${action.label} content!`, 'success');
    
    // Close modal
    const modal = document.getElementById('email-preview-modal');
    if (modal) {
        modal.remove();
    }
    
    // Log the action
    console.log('📧 Email Action Executed:', {
        projectId,
        rowIndex,
        actionType,
        template: template.name,
        recipients: resolvedTemplate.to,
        subject: resolvedTemplate.subject,
        mailtoLink: mailtoLink
    });
};

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
        
        /* Template Modal */
        .template-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            opacity: 1;
            visibility: visible;
        }
        
        .template-modal-content {
            background: white;
            border-radius: 8px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            max-width: 600px;
            width: 90vw;
            max-height: 90vh;
            overflow: hidden;
            transform: scale(1);
            transition: transform 0.3s ease;
        }
        
        .template-modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px;
            border-bottom: 1px solid #e9ecef;
            background: #f8f9fa;
        }
        
        .template-modal-header h3 {
            margin: 0;
            color: #333;
            font-size: 18px;
        }
        
        .template-modal-close {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #666;
            padding: 0;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: all 0.2s;
        }
        
        .template-modal-close:hover {
            background: #e9ecef;
            color: #333;
        }
        
        .template-modal-footer {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            padding: 20px;
            border-top: 1px solid #e9ecef;
            background: #f8f9fa;
        }
        
        .template-selector-body {
            padding: 20px;
            max-height: 60vh;
            overflow-y: auto;
        }
        
        .current-template-info {
            margin-bottom: 25px;
        }
        
        .current-template-info h4 {
            margin: 0 0 15px 0;
            color: #333;
            font-size: 16px;
        }
        
        .current-template-display {
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
            border: 1px solid #e9ecef;
        }
        
        .template-preview-card {
            padding: 15px;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            margin-bottom: 12px;
            background: white;
            transition: all 0.2s;
        }
        
        .template-preview-card:hover {
            border-color: #007bff;
            box-shadow: 0 2px 8px rgba(0, 123, 255, 0.15);
        }
        
        .template-preview-card.selected-template {
            border-color: #28a745;
            background: #f8fff9;
        }
        
        .template-preview-card.current-default {
            border-color: #007bff;
            background: #f0f8ff;
        }
        
        .template-name {
            font-weight: 600;
            color: #333;
            margin-bottom: 8px;
            font-size: 16px;
        }
        
        .template-subject {
            color: #666;
            font-size: 14px;
            margin-bottom: 10px;
        }
        
        .template-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            margin-bottom: 12px;
        }
        
        .template-tags .tag {
            background: #e9ecef;
            color: #495057;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 500;
        }
        
        .select-template-btn,
        .remove-default-btn {
            background: #007bff;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: background-color 0.2s;
        }
        
        .select-template-btn:hover,
        .remove-default-btn:hover {
            background: #0056b3;
        }
        
        .remove-default-btn {
            background: #dc3545;
        }
        
        .remove-default-btn:hover {
            background: #c82333;
        }
        
        .template-selection-list h4 {
            margin: 0 0 15px 0;
            color: #333;
            font-size: 16px;
        }
        
        .templates-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        
        .no-template-selected {
            text-align: center;
            color: #666;
            font-style: italic;
        }
        
        .no-templates {
            text-align: center;
            color: #666;
            font-style: italic;
            padding: 20px;
        }
        
        /* Email Preview Modal */
        .email-preview-modal-content {
            max-width: 700px;
            max-height: 90vh;
            width: 90vw;
        }
        
        .email-preview-body {
            padding: 20px;
            max-height: 70vh;
            overflow-y: auto;
        }
        
        .email-preview-header {
            margin-bottom: 25px;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
            border-left: 4px solid #007bff;
        }
        
        .email-preview-info {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        
        .preview-item {
            font-size: 14px;
            color: #555;
        }
        
        .email-preview-content {
            margin-bottom: 25px;
        }
        
        .email-field {
            margin-bottom: 20px;
        }
        
        .email-field label {
            display: block;
            font-weight: 600;
            color: #333;
            margin-bottom: 8px;
            font-size: 14px;
        }
        
        .email-recipients {
            padding: 12px;
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 6px;
            min-height: 20px;
        }
        
        .recipient-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 6px 0;
            border-bottom: 1px solid #e9ecef;
        }
        
        .recipient-item:last-child {
            border-bottom: none;
        }
        
        .recipient-name {
            font-weight: 500;
            color: #333;
        }
        
        .recipient-email {
            color: #007bff;
            font-size: 13px;
        }
        
        .no-recipients {
            color: #666;
            font-style: italic;
        }
        
        .email-subject {
            padding: 12px;
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 6px;
            font-weight: 500;
            color: #333;
        }
        
        .email-body {
            padding: 12px;
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 6px;
            min-height: 100px;
            white-space: pre-wrap;
            line-height: 1.5;
            color: #333;
        }
        
        .email-preview-footer {
            padding: 15px;
            background: #e3f2fd;
            border-radius: 8px;
            border-left: 4px solid #2196f3;
        }
        
        .email-service-info p {
            margin: 0 0 8px 0;
            font-size: 13px;
            color: #1976d2;
        }
        
        .email-service-info p:last-child {
            margin-bottom: 0;
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
        
        /* Template Selector Modal Styles */
        .template-selector-body {
            padding: 20px;
            max-height: 70vh;
            overflow-y: auto;
        }
        
        .current-template-info {
            margin-bottom: 25px;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
            border-left: 4px solid #28a745;
        }
        
        .current-template-info h4 {
            margin: 0 0 10px 0;
            color: #333;
            font-size: 16px;
        }
        
        .template-preview-card {
            background: white;
            border: 1px solid #e9ecef;
            border-radius: 6px;
            padding: 15px;
            margin-bottom: 10px;
            transition: all 0.2s;
        }
        
        .template-preview-card:hover {
            border-color: #007bff;
            box-shadow: 0 2px 8px rgba(0,123,255,0.1);
        }
        
        .template-preview-card.current-default {
            border-color: #28a745;
            background: #f8fff9;
        }
        
        .template-preview-card.selected-template {
            border-color: #28a745;
            background: #e8f5e8;
        }
        
        .template-preview-card .template-name {
            font-weight: 600;
            color: #333;
            margin-bottom: 5px;
        }
        
        .template-preview-card .template-subject {
            color: #666;
            font-size: 14px;
            margin-bottom: 10px;
        }
        
        .template-tags {
            margin-bottom: 10px;
        }
        
        .template-tags .tag {
            background: #e9ecef;
            color: #495057;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 11px;
            margin-right: 5px;
            display: inline-block;
        }
        
        .select-template-btn,
        .remove-default-btn {
            background: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 8px 12px;
            cursor: pointer;
            font-size: 12px;
            transition: background-color 0.2s;
        }
        
        .select-template-btn:hover {
            background: #0056b3;
        }
        
        .remove-default-btn {
            background: #dc3545;
        }
        
        .remove-default-btn:hover {
            background: #c82333;
        }
        
        .no-template-selected,
        .no-templates {
            text-align: center;
            color: #666;
            padding: 20px;
        }
        
        .no-template-selected p,
        .no-templates p {
            margin: 0 0 5px 0;
        }
        
        /* Action Rules Modal Styles */
        .action-rules-body {
            padding: 20px;
            max-height: 70vh;
            overflow-y: auto;
        }
        
        .rules-explanation {
            margin-bottom: 25px;
            padding: 15px;
            background: #e3f2fd;
            border-radius: 8px;
            border-left: 4px solid #2196f3;
        }
        
        .rules-explanation h4 {
            margin: 0 0 10px 0;
            color: #1976d2;
        }
        
        .rules-explanation p {
            margin: 0;
            color: #1565c0;
        }
        
        .rule-category {
            margin-bottom: 20px;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 15px;
        }
        
        .rule-category h5 {
            margin: 0 0 15px 0;
            color: #333;
            font-size: 14px;
            font-weight: 600;
        }
        
        .rule-item {
            margin-bottom: 10px;
        }
        
        .rule-item:last-child {
            margin-bottom: 0;
        }
        
        .rule-item label {
            display: flex;
            align-items: center;
            cursor: pointer;
            font-size: 14px;
            color: #555;
        }
        
        .rule-item input[type="checkbox"] {
            margin-right: 10px;
        }
        
        /* Inherit Settings Modal Styles */
        .inherit-settings-body {
            padding: 20px;
            max-height: 70vh;
            overflow-y: auto;
        }
        
        .inherit-explanation {
            margin-bottom: 25px;
            padding: 15px;
            background: #fff3cd;
            border-radius: 8px;
            border-left: 4px solid #ffc107;
        }
        
        .inherit-explanation h4 {
            margin: 0 0 10px 0;
            color: #856404;
        }
        
        .inherit-explanation p {
            margin: 0;
            color: #856404;
        }
        
        .settings-preview {
            margin-bottom: 25px;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
        }
        
        .settings-preview h5 {
            margin: 0 0 10px 0;
            color: #333;
        }
        
        .settings-preview ul {
            margin: 0;
            padding-left: 20px;
        }
        
        .settings-preview li {
            margin-bottom: 5px;
            color: #555;
        }
        
        .inheritance-options {
            margin-bottom: 20px;
        }
        
        .inheritance-options h5 {
            margin: 0 0 15px 0;
            color: #333;
        }
        
        .inheritance-options label {
            display: flex;
            align-items: center;
            margin-bottom: 10px;
            cursor: pointer;
            font-size: 14px;
            color: #555;
        }
        
        .inheritance-options input[type="checkbox"] {
            margin-right: 10px;
        }
        
        .no-projects-warning {
            background: #f8d7da;
            border: 1px solid #f5c6cb;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 15px;
        }
        
        .no-projects-warning p {
            margin: 0;
            color: #721c24;
        }
        
        /* Configuration Modal Footer */
        .config-modal-footer {
            border-top: 1px solid #e9ecef;
            padding: 12px 16px;
            background: #f8f9fa;
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            border-radius: 0 0 8px 8px;
        }
        
        .config-modal-footer .btn-secondary {
            background: #6c757d;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: background-color 0.2s;
        }
        
        .config-modal-footer .btn-secondary:hover {
            background: #5a6268;
        }
        
        .config-modal-footer .btn-primary {
            background: #007bff;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: background-color 0.2s;
        }
        
        .config-modal-footer .btn-primary:hover {
            background: #0056b3;
        }
        
        /* No Actions Message */
        .no-actions-message {
            padding: 20px;
            text-align: center;
            color: #666;
            background: #f8f9fa;
            border-radius: 6px;
            margin: 8px;
        }
        
        .no-actions-message p {
            margin: 5px 0;
        }
        
        .no-actions-message p:first-child {
            font-weight: 500;
            color: #495057;
        }
        
        .no-actions-message p:last-child {
            font-size: 13px;
            color: #868e96;
        }
        
        /* Action-Specific Template Creation */
        .create-action-template-btn {
            background: #28a745;
            color: white;
            border: none;
            border-radius: 6px;
            padding: 10px 16px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            margin-top: 15px;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 8px;
            justify-content: center;
        }
        
        .create-action-template-btn:hover {
            background: #218838;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(40, 167, 69, 0.25);
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

// Test function for configuration persistence
window.testConfigPersistence = function() {
    console.log('=== Testing Configuration Persistence ===');
    
    // Test saving and loading row configuration
    const testRowIndex = 0;
    const testConfig = {
        emailEnabled: false,
        defaultTemplate: state.emailTemplates[0] || null,
        actionRules: {
            onStatusComplete: true,
            onDeadlineApproach: true
        },
        action_schedule_meeting: false,
        action_thank_team: true
    };
    
    console.log('Saving test configuration for row', testRowIndex);
    Object.entries(testConfig).forEach(([key, value]) => {
        saveRowActionConfig(testRowIndex, key, value);
    });
    
    // Verify saved configuration
    const retrievedConfig = getRowActionConfig(testRowIndex);
    console.log('Retrieved configuration:', retrievedConfig);
    
    // Test with default configuration
    const defaultConfig = getRowActionConfig(999); // Non-existent row
    console.log('Default configuration for new row:', defaultConfig);
    
    // Show current state
    console.log('All main template actions:', state.mainTemplateActions);
    
    return {
        testConfig,
        retrievedConfig,
        defaultConfig,
        allConfigs: state.mainTemplateActions
    };
};

// Test function for full configuration workflow
window.testFullConfigWorkflow = function() {
    console.log('=== Testing Full Configuration Workflow ===');
    
    if (!document.querySelector('[data-tab="main-template"]')?.classList.contains('active')) {
        console.log('❌ Switch to Main Template tab first');
        return { error: 'Not on main template tab' };
    }
    
    const results = {};
    
    // Test 1: Check initial state
    results.initialState = {
        mainTemplateActions: Object.keys(state.mainTemplateActions).length,
        emailTemplates: state.emailTemplates.length,
        projects: Object.keys(state.projectsData).length
    };
    
    // Test 2: Configuration for first row
    const testRowIndex = 0;
    const currentConfig = getRowActionConfig(testRowIndex);
    results.row0Config = currentConfig;
    
    // Test 3: Save some test configurations
    saveRowActionConfig(testRowIndex, 'emailEnabled', true);
    saveRowActionConfig(testRowIndex, 'action_schedule_meeting', true);
    saveRowActionConfig(testRowIndex, 'action_issue_alert', false);
    
    if (state.emailTemplates.length > 0) {
        saveRowActionConfig(testRowIndex, 'defaultTemplate', state.emailTemplates[0]);
    }
    
    const updatedConfig = getRowActionConfig(testRowIndex);
    results.updatedConfig = updatedConfig;
    
    // Test 4: Check persistence
    const savedData = localStorage.getItem('dashboardState');
    const parsed = JSON.parse(savedData);
    results.persistedData = parsed.mainTemplateActions;
    
    console.log('Workflow test results:', results);
    
    return results;
};

// Debug function to check for stuck modals and clean them up
window.checkAndCleanStuckModals = function() {
    console.log('=== Checking for Stuck Modals ===');
    
    const modalSelectors = [
        '.template-modal',
        '.actions-dropdown',
        '#context-email-modal',
        '#template-selector-modal',
        '#inherit-settings-modal',
        '.main-template-config'
    ];
    
    let foundModals = [];
    
    modalSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
            elements.forEach((element, index) => {
                const rect = element.getBoundingClientRect();
                const isVisible = window.getComputedStyle(element).display !== 'none' && 
                                 window.getComputedStyle(element).visibility !== 'hidden';
                
                foundModals.push({
                    selector: selector,
                    index: index,
                    id: element.id,
                    className: element.className,
                    isVisible: isVisible,
                    position: {
                        top: rect.top,
                        left: rect.left,
                        width: rect.width,
                        height: rect.height
                    },
                    display: window.getComputedStyle(element).display,
                    visibility: window.getComputedStyle(element).visibility,
                    zIndex: window.getComputedStyle(element).zIndex
                });
            });
        }
    });
    
    console.log('Found modals:', foundModals);
    
    // Clean up any stuck modals
    const stuckModals = foundModals.filter(modal => 
        modal.isVisible && 
        (modal.position.top < 0 || modal.position.left < 0 || 
         modal.zIndex === 'auto' || modal.zIndex < 1000)
    );
    
    if (stuckModals.length > 0) {
        console.log('Found stuck modals:', stuckModals);
        
        stuckModals.forEach(modalInfo => {
            const elements = document.querySelectorAll(modalInfo.selector);
            if (elements[modalInfo.index]) {
                console.log(`Cleaning up stuck modal: ${modalInfo.selector}`);
                elements[modalInfo.index].remove();
            }
        });
        
        console.log('Stuck modals cleaned up');
        return { cleaned: stuckModals.length, modals: stuckModals };
    } else {
        console.log('No stuck modals found');
        return { cleaned: 0, allModals: foundModals };
    }
};

// Manual cleanup function for users
window.fixStuckModals = function() {
    console.log('=== Manual Modal Cleanup ===');
    cleanupStuckModals();
    console.log('All modals cleaned up. The interface should now be clear.');
    showNotification('Modal cleanup complete', 'success');
};

// Clean up any stuck modals (simpler version for initialization)
function cleanupStuckModals() {
    const modalSelectors = [
        '.template-modal',
        '.actions-dropdown',
        '#context-email-modal',
        '#template-selector-modal',
        '#inherit-settings-modal',
        '.main-template-config'
    ];
    
    let cleanedCount = 0;
    
    modalSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
            element.remove();
            cleanedCount++;
        });
    });
    
    if (cleanedCount > 0) {
        console.log(`Cleaned up ${cleanedCount} stuck modal elements`);
    }
}

// Make cleanup function available globally
window.cleanupStuckModals = cleanupStuckModals; 

// Test function to verify email action functionality
window.testEmailActions = function() {
    console.log('=== Testing Email Action System ===');
    
    // Test 1: Check if we have projects
    const projectCount = Object.keys(state.projectsData).length;
    if (projectCount === 0) {
        console.log('❌ No projects found to test with');
        return;
    }
    
    const firstProjectId = Object.keys(state.projectsData)[0];
    const project = state.projectsData[firstProjectId];
    console.log(`✅ Testing with project: ${project.name}`);
    
    // Test 2: Check if we have email templates
    if (state.emailTemplates.length === 0) {
        console.log('❌ No email templates found. Create some templates first.');
        return;
    }
    
    console.log(`✅ Found ${state.emailTemplates.length} email templates`);
    
    // Test 3: Test predefined template functionality
    console.log('Testing predefined template system...');
    const testRowIndex = 0;
    const testActionType = 'schedule-meeting';
    
    // Set a default template for testing
    const testTemplate = state.emailTemplates[0];
    saveRowActionConfig(testRowIndex, 'defaultTemplate', testTemplate);
    console.log(`✅ Set "${testTemplate.name}" as default template for row ${testRowIndex + 1}`);
    
    // Test 4: Test the email action
    console.log('Testing email action execution...');
    handleEmailAction(firstProjectId, testRowIndex, testActionType);
    
    console.log('✅ Email action test completed. Check for modal popup.');
};

// Test function to verify inheritance functionality
window.testActionInheritance = function() {
    console.log('=== Testing Action Inheritance System ===');
    
    const results = {
        mainTemplateTest: false,
        configurationTest: false,
        propagationTest: false,
        projectFilterTest: false,
        errors: []
    };
    
    // Test 1: Check if we can access main template
    const mainTemplateTab = document.querySelector('[data-tab="main-template"]');
    if (!mainTemplateTab) {
        results.errors.push('Main template tab not found');
        return results;
    }
    
    console.log('✅ Main template tab found');
    results.mainTemplateTest = true;
    
    // Test 2: Check if we have projects to test with
    const projectCount = Object.keys(state.projectsData).length;
    console.log(`Found ${projectCount} projects`);
    
    if (projectCount === 0) {
        results.errors.push('No projects found to test inheritance');
        return results;
    }
    
    const firstProjectId = Object.keys(state.projectsData)[0];
    console.log(`Testing with project: ${firstProjectId}`);
    
    // Test 3: Test configuration retrieval
    const testRowIndex = 0;
    const mainConfig = getRowActionConfig(testRowIndex);
    const projectConfig = getProjectRowActionConfig(firstProjectId, testRowIndex);
    
    console.log('Main template config:', mainConfig);
    console.log('Project config:', projectConfig);
    
    results.configurationTest = true;
    
    // Test 4: Test selective action disabling
    console.log('Testing selective action disabling...');
    
    // Temporarily disable some actions in main template
    const originalScheduleMeetingState = mainConfig.action_schedule_meeting;
    const originalThankTeamState = mainConfig.action_thank_team;
    
    // Disable schedule-meeting and thank-team actions
    saveRowActionConfig(testRowIndex, 'action_schedule-meeting', false);
    saveRowActionConfig(testRowIndex, 'action_thank-team', false);
    
    // Test 5: Propagate settings
    console.log('Propagating settings to projects...');
    propagateRowSettingsFromConfig(testRowIndex);
    
    // Test 6: Check if project received the configuration
    const updatedProjectConfig = getProjectRowActionConfig(firstProjectId, testRowIndex);
    console.log('Updated project config:', updatedProjectConfig);
    
    const scheduleMeetingDisabled = updatedProjectConfig.action_schedule_meeting === false;
    const thankTeamDisabled = updatedProjectConfig.action_thank_team === false;
    
    if (scheduleMeetingDisabled && thankTeamDisabled) {
        console.log('✅ Settings successfully propagated to project');
        results.propagationTest = true;
    } else {
        results.errors.push('Settings not properly propagated to project');
    }
    
    // Test 7: Check filtered actions in project dropdown
    console.log('Testing action filtering in project dropdown...');
    
    // Count enabled actions
    const enabledActions = Object.entries(EMAIL_ACTIONS).filter(([actionType, action]) => {
        return updatedProjectConfig[`action_${actionType}`] !== false;
    });
    
    console.log(`Project should show ${enabledActions.length} enabled actions:`);
    enabledActions.forEach(([actionType, action]) => {
        console.log(`  - ${action.label} (${actionType})`);
    });
    
    const disabledActions = Object.entries(EMAIL_ACTIONS).filter(([actionType, action]) => {
        return updatedProjectConfig[`action_${actionType}`] === false;
    });
    
    console.log(`Project should hide ${disabledActions.length} disabled actions:`);
    disabledActions.forEach(([actionType, action]) => {
        console.log(`  - ${action.label} (${actionType})`);
    });
    
    if (enabledActions.length === Object.keys(EMAIL_ACTIONS).length - 2) {
        console.log('✅ Action filtering working correctly');
        results.projectFilterTest = true;
    } else {
        results.errors.push('Action filtering not working correctly');
    }
    
    // Test 8: Restore original configuration
    console.log('Restoring original configuration...');
    saveRowActionConfig(testRowIndex, 'action_schedule-meeting', originalScheduleMeetingState);
    saveRowActionConfig(testRowIndex, 'action_thank-team', originalThankTeamState);
    propagateRowSettingsFromConfig(testRowIndex);
    
    // Summary
    console.log('\n=== Test Results ===');
    console.log(`Main Template Access: ${results.mainTemplateTest ? '✅' : '❌'}`);
    console.log(`Configuration Retrieval: ${results.configurationTest ? '✅' : '❌'}`);
    console.log(`Settings Propagation: ${results.propagationTest ? '✅' : '❌'}`);
    console.log(`Action Filtering: ${results.projectFilterTest ? '✅' : '❌'}`);
    
    if (results.errors.length > 0) {
        console.log('\n❌ Errors encountered:');
        results.errors.forEach(error => console.log(`  - ${error}`));
    } else {
        console.log('\n🎉 All tests passed! Action inheritance is working correctly.');
    }
    
    return results;
};

// ==================== ACTION-SPECIFIC TEMPLATE CREATION ==================== //

// Create an action-specific template with pre-filled content
window.createActionSpecificTemplate = function(actionType) {
    const action = EMAIL_ACTIONS[actionType];
    if (!action) return;
    
    // Generate action-specific template content
    const templateContent = generateActionTemplateContent(actionType, action);
    
    // Get appropriate category for this action
    const category = getActionCategory(actionType);
    
    // Create the template with pre-filled content
    const template = {
        id: `template-${actionType}-${Date.now()}`,
        name: templateContent.name,
        category: category,
        to: templateContent.to,
        subject: templateContent.subject,
        body: templateContent.body,
        tags: action.suggestedTags || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    // Add to templates
    state.emailTemplates.push(template);
    saveState();
    
    // Show success message
    showNotification(`${action.label} template created! You can edit it in the Email Templates section.`, 'success');
    
    // Close the context modal
    const modal = document.getElementById('context-email-modal');
    if (modal) {
        modal.remove();
    }
    
    // Refresh the action modal with new template
    setTimeout(() => {
        const actionBtn = document.querySelector(`[data-action-type="${actionType}"]`);
        if (actionBtn) {
            actionBtn.click();
        }
    }, 500);
};

// Generate action-specific template content
function generateActionTemplateContent(actionType, action) {
    const templates = {
        'schedule-meeting': {
            name: 'Schedule Meeting - Project Discussion',
            to: '{{Client Contact}}, {{Project Manager}}',
            subject: 'Meeting Request - {{ProjectName}}',
            body: `Dear Team,

I hope this message finds you well. I would like to schedule a meeting to discuss the current status and next steps for {{ProjectName}}.

📋 Meeting Purpose:
- Review current progress ({{ProjectCompletion}} complete)
- Discuss upcoming milestones
- Address any questions or concerns

📅 Current Project Status:
- Phase: {{ProjectPhase}}
- Current Activity: {{CurrentActivity}}
- Next Milestone: {{NextMilestone}}

Please let me know your availability for the coming week so we can coordinate a suitable time for everyone.

Best regards,
{{UserName}}`
        },
        'thank-team': {
            name: 'Thank Team - Milestone Achievement',
            to: '{{Project Manager}}, {{Client Contact}}',
            subject: 'Thank You - {{ProjectName}} Milestone Completed',
            body: `Dear Team,

I wanted to take a moment to express my sincere gratitude for the excellent work completed on {{ProjectName}}.

🎉 Achievement:
- Successfully completed: {{CurrentActivity}}
- Project is now {{ProjectCompletion}} complete
- Current phase: {{ProjectPhase}}

Your dedication and professionalism have been instrumental in reaching this milestone. The quality of work and attention to detail have exceeded expectations.

Thank you for your continued commitment to excellence.

Best regards,
{{UserName}}`
        },
        'status-update': {
            name: 'Status Update - Project Progress',
            to: '{{Client Contact}}',
            subject: '{{ProjectName}} - Status Update',
            body: `Hello,

Here's the current status update for {{ProjectName}}:

📊 Progress Overview:
- Overall Completion: {{ProjectCompletion}}
- Current Phase: {{ProjectPhase}}
- Active Task: {{CurrentActivity}}
- Task Status: {{TaskStatus}}

📅 Timeline:
- Next Milestone: {{NextMilestone}}
- Expected Completion: {{ExpectedDate}}

💬 Recent Updates:
{{LatestComment}}

Please feel free to reach out if you have any questions or need additional information.

Best regards,
{{UserName}}`
        },
        'issue-alert': {
            name: 'Issue Alert - Project Blocker',
            to: '{{Project Manager}}, {{Client Contact}}',
            subject: 'URGENT: Issue with {{ProjectName}} - {{TaskName}}',
            body: `Dear Team,

I need to bring to your attention an urgent issue that has arisen with {{ProjectName}}.

⚠️ Issue Details:
- Task: {{TaskName}}
- Current Status: {{TaskStatus}}
- Project Phase: {{ProjectPhase}}

🔍 Issue Description:
[Please describe the specific issue, its impact, and any immediate actions taken]

📋 Immediate Actions Required:
- [Action 1]
- [Action 2]
- [Action 3]

This issue may impact our timeline for {{NextMilestone}}. I recommend we schedule a brief call to discuss resolution options.

Please confirm receipt of this message and let me know your availability for a discussion.

Best regards,
{{UserName}}`
        },
        'milestone-notification': {
            name: 'Milestone Notification - Achievement',
            to: '{{Client Contact}}, {{Project Manager}}',
            subject: '🎯 Milestone Achieved - {{ProjectName}}',
            body: `Dear Team,

I'm pleased to announce that we have successfully reached an important milestone for {{ProjectName}}.

🎯 Milestone Achieved:
- Milestone: {{NextMilestone}}
- Completed Activity: {{CurrentActivity}}
- Overall Progress: {{ProjectCompletion}}

📈 Current Status:
- Phase: {{ProjectPhase}}
- Status: {{TaskStatus}}
- Next Steps: [Briefly outline next steps]

This achievement brings us closer to our project goals and demonstrates the team's dedication to excellence.

Thank you for your continued support and collaboration.

Best regards,
{{UserName}}`
        },
        'follow-up': {
            name: 'Follow Up - Pending Items',
            to: '{{Project Manager}}, {{Client Contact}}',
            subject: 'Follow Up - {{ProjectName}}',
            body: `Dear Team,

I wanted to follow up on some pending items related to {{ProjectName}}.

📋 Current Status:
- Project Phase: {{ProjectPhase}}
- Completion: {{ProjectCompletion}}
- Current Activity: {{CurrentActivity}}

🔄 Items Requiring Follow-up:
- [Item 1 - brief description]
- [Item 2 - brief description]
- [Item 3 - brief description]

📅 Next Steps:
- Expected action by: {{ExpectedDate}}
- Responsible party: {{Responsible}}

Please let me know if you need any additional information or if there are any concerns that need to be addressed.

Looking forward to your response.

Best regards,
{{UserName}}`
        },
        'custom': {
            name: 'Custom Email Template',
            to: '{{Client Contact}}',
            subject: '{{ProjectName}} - [Your Subject Here]',
            body: `Hello,

[Your message content here]

Project: {{ProjectName}}
Current Status: {{ProjectCompletion}} complete
Phase: {{ProjectPhase}}

Best regards,
{{UserName}}`
        }
    };
    
    return templates[actionType] || templates['custom'];
}

// Get appropriate category for action type
function getActionCategory(actionType) {
    const actionCategoryMap = {
        'schedule-meeting': 'meeting-request',
        'thank-team': 'appreciation',
        'status-update': 'progress-update',
        'issue-alert': 'issue-alert',
        'milestone-notification': 'milestone-complete',
        'follow-up': 'follow-up',
        'custom': 'communication'
    };
    
    return actionCategoryMap[actionType] || 'communication';
}

// Test function to demonstrate the inheritance workflow
window.testInheritanceWorkflow = function() {
    console.log('=== Testing Inheritance Workflow ===');
    console.log('This test demonstrates the complete workflow:');
    console.log('1. Configure actions in Main Template');
    console.log('2. Accept changes to propagate to projects');
    console.log('3. See filtered actions in project dropdowns');
    console.log('');
    console.log('Instructions:');
    console.log('1. Go to Main Template tab');
    console.log('2. Click the ⚙️ button on any row');
    console.log('3. Disable some actions (e.g., uncheck "Schedule Meeting")');
    console.log('4. Click "Accept" to apply changes');
    console.log('5. Go to a project tab');
    console.log('6. Click the ⚡ button on corresponding row');
    console.log('7. Verify disabled actions are not shown');
    console.log('');
    console.log('Run testActionInheritance() to verify programmatically.');
};

