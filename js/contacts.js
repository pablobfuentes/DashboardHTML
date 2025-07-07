// This module will handle all logic related to contacts.
import { state, saveState } from './state.js';
import { renderTable } from './ui.js';

/**
 * Comprehensive contact synchronization system
 * This function performs bidirectional sync between contacts directory and project tabs
 */
export function syncContactsWithProjects() {
    console.log('Starting comprehensive contact sync...');
    
    let importedCount = 0;
    let exportedCount = 0;
    let updatedCount = 0;
    
    // STEP 1: Import contacts from project tabs to directory
    const importResults = importContactsFromProjects();
    importedCount = importResults.imported;
    updatedCount = importResults.updated;
    
    // STEP 2: Export contacts from directory to project tabs
    const exportResults = exportContactsToProjects();
    exportedCount = exportResults.exported;
    
    // STEP 3: Save and refresh UI
    saveState();
    populateContactFilters();
    renderContactsTable();
    
    // STEP 4: Update all project tables to reflect changes
    updateAllProjectTables();
    
    // STEP 5: Show sync results
    showSyncResults(importedCount, exportedCount, updatedCount);
    
    console.log('Contact sync completed successfully');
}

/**
 * Import contacts from project tabs into the contacts directory
 */
function importContactsFromProjects() {
    console.log('Importing contacts from project tabs...');
    
    const contactsMap = new Map();
    let importedCount = 0;
    let updatedCount = 0;
    
    // First, index existing directory contacts by email
    state.contacts.forEach(contact => {
        if (contact.email && contact.email.trim() !== '') {
            contactsMap.set(contact.email.toLowerCase(), contact);
        }
    });
    
    // Then, process each project's contacts
    Object.entries(state.projectsData).forEach(([projectId, project]) => {
        if (!project.quickInfoContacts?.contacts) return;
        
        project.quickInfoContacts.contacts.forEach(projectContact => {
            const email = projectContact.email?.trim();
            if (!email) return;
            
            const emailKey = email.toLowerCase();
            
            if (contactsMap.has(emailKey)) {
                // Update existing contact
                const existingContact = contactsMap.get(emailKey);
                
                // Update fields if they're missing or different
                let wasUpdated = false;
                
                if (!existingContact.name && projectContact.name) {
                    existingContact.name = projectContact.name;
                    wasUpdated = true;
                }
                if (!existingContact.position && projectContact.position) {
                    existingContact.position = projectContact.position;
                    wasUpdated = true;
                }
                if (!existingContact.phone && projectContact.phone) {
                    existingContact.phone = projectContact.phone;
                    wasUpdated = true;
                }
                if (!existingContact.company && projectContact.company) {
                    existingContact.company = projectContact.company;
                    wasUpdated = true;
                }
                
                // Add project to projects array if not already there
                if (!existingContact.projects) existingContact.projects = [];
                if (!existingContact.projects.includes(project.name)) {
                    existingContact.projects.push(project.name);
                    wasUpdated = true;
                }
                
                if (wasUpdated) {
                    updatedCount++;
                    console.log(`Updated contact: ${existingContact.name} (${existingContact.email})`);
                }
            } else {
                // Create new contact
                const newContact = {
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                    name: projectContact.name || '',
                    position: projectContact.position || '',
                    email: projectContact.email,
                    phone: projectContact.phone || '',
                    company: projectContact.company || '',
                    projects: [project.name]
                };
                
                contactsMap.set(emailKey, newContact);
                importedCount++;
                console.log(`Imported new contact: ${newContact.name} (${newContact.email})`);
            }
        });
    });
    
    // Update the state with the merged contacts
    state.contacts = Array.from(contactsMap.values());
    
    return { imported: importedCount, updated: updatedCount };
}

/**
 * Export contacts from directory to project tabs
 */
function exportContactsToProjects() {
    console.log('Exporting contacts to project tabs...');
    
    let exportedCount = 0;
    
    // Clear existing project contacts first
    Object.values(state.projectsData).forEach(project => {
        if (project.quickInfoContacts) {
            project.quickInfoContacts.contacts = [];
        }
    });
    
    // Export directory contacts to their assigned projects
    state.contacts.forEach(contact => {
        if (!contact.projects || contact.projects.length === 0) return;
        
        contact.projects.forEach(projectName => {
            const projectEntry = Object.entries(state.projectsData).find(([_, p]) => p.name === projectName);
            if (!projectEntry) return;
            
            const [projectId, project] = projectEntry;
            
            // Ensure project has contacts structure
            if (!project.quickInfoContacts) {
                project.quickInfoContacts = {
                    address: '',
                    contacts: []
                };
            }
            
            // Add contact to project (only fields that exist in project tabs)
            const projectContact = {
                name: contact.name || '',
                position: contact.position || '',
                email: contact.email || '',
                phone: contact.phone || '',
                company: contact.company || ''
            };
            
            project.quickInfoContacts.contacts.push(projectContact);
            exportedCount++;
            console.log(`Exported contact ${contact.name} to project ${projectName}`);
        });
    });
    
    return { exported: exportedCount };
}

/**
 * Update all project tables to reflect contact changes
 */
function updateAllProjectTables() {
    Object.entries(state.projectsData).forEach(([projectId, project]) => {
        const projectTable = document.querySelector(`#${projectId} .project-table`);
        if (projectTable) {
            renderTable(projectTable, project.headers, project.content, false);
        }
    });
}

/**
 * Show sync results to user
 */
function showSyncResults(importedCount, exportedCount, updatedCount) {
    const messages = [];
    
    if (importedCount > 0) {
        messages.push(`${importedCount} new contact${importedCount > 1 ? 's' : ''} imported from project tabs`);
    }
    
    if (updatedCount > 0) {
        messages.push(`${updatedCount} existing contact${updatedCount > 1 ? 's' : ''} updated with project data`);
    }
    
    if (exportedCount > 0) {
        messages.push(`${exportedCount} contact assignment${exportedCount > 1 ? 's' : ''} synced to project tabs`);
    }
    
    if (messages.length === 0) {
        messages.push('No changes needed - contacts are already synchronized');
    }
    
    const resultMessage = '✅ Sync Complete!\n\n' + messages.join('\n');
    alert(resultMessage);
}

/**
 * Legacy sync function - now redirects to comprehensive sync
 * @deprecated Use syncContactsWithProjects() instead
 */
export function syncAndRenderContacts() {
    console.log('Legacy sync called - redirecting to comprehensive sync');
    syncContactsWithProjects();
}

/**
 * Renders the contacts from the state into the contacts table,
 * applying all active filters.
 */
export function renderContactsTable() {
    const tbody = document.querySelector('.contacts-table tbody');
    console.log('Rendering contacts table, tbody found:', !!tbody);
    if (!tbody) return;

    const searchInput = document.getElementById('contact-search');
    const projectFilter = document.getElementById('contact-project-filter');
    const companyFilter = document.getElementById('contact-company-filter');
    const positionFilter = document.getElementById('contact-position-filter');

    const filters = {
        search: searchInput ? searchInput.value.toLowerCase() : '',
        project: projectFilter ? projectFilter.value : 'all',
        company: companyFilter ? companyFilter.value : 'all',
        position: positionFilter ? positionFilter.value : 'all',
    };

    const filteredContacts = state.contacts.filter(contact => {
        const searchMatch = !filters.search ||
            (contact.name || '').toLowerCase().includes(filters.search) ||
            (contact.email || '').toLowerCase().includes(filters.search);
        
        const projectMatch = filters.project === 'all' || (contact.projects || []).includes(filters.project);
        const companyMatch = filters.company === 'all' || contact.company === filters.company;
        const positionMatch = filters.position === 'all' || contact.position === filters.position;

        return searchMatch && projectMatch && companyMatch && positionMatch;
    });

    console.log('Filtered contacts:', filteredContacts.length);

    if (filteredContacts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state-cell">No contacts match the current filters.</td></tr>';
        return;
    }

    tbody.innerHTML = filteredContacts.map(createContactRow).join('');
    console.log('Contact rows rendered');
}

function createContactRow(contact) {
    return `
        <tr>
            <td>${contact.name || '-'}</td>
            <td>${contact.position || '-'}</td>
            <td>${contact.email || '-'}</td>
            <td>${contact.phone || '-'}</td>
            <td>${contact.company || '-'}</td>
            <td>
                <div class="project-tags">
                    ${(contact.projects || []).map(p => `<span class="project-tag">${p}</span>`).join('')}
                </div>
            </td>
            <td class="actions">
                <button title="Edit" class="edit-btn" data-id="${contact.id}">✏️</button>
                <button title="Delete" class="delete-btn" data-id="${contact.id}">🗑️</button>
            </td>
        </tr>
    `;
}

function populateContactFilters() {
    const projectFilter = document.getElementById('contact-project-filter');
    const companyFilter = document.getElementById('contact-company-filter');
    const positionFilter = document.getElementById('contact-position-filter');

    // Skip if filter elements don't exist
    if (!projectFilter || !companyFilter || !positionFilter) {
        return;
    }

    const projects = new Set();
    const companies = new Set();
    const positions = new Set();

    state.contacts.forEach(contact => {
        (contact.projects || []).forEach(p => projects.add(p));
        if (contact.company && contact.company !== 'N/A') companies.add(contact.company);
        if (contact.position) positions.add(contact.position);
    });

    populateSelect(projectFilter, projects);
    populateSelect(companyFilter, companies);
    populateSelect(positionFilter, positions);
}

function populateSelect(selectElement, items) {
    const currentValue = selectElement.value;
    selectElement.innerHTML = `<option value="all">${selectElement.firstElementChild.textContent}</option>`; // Keep "All"
    items.forEach(item => {
        const option = document.createElement('option');
        option.value = item;
        option.textContent = item;
        selectElement.appendChild(option);
    });
    selectElement.value = currentValue;
}

// Attach event listeners for the filters
['contact-search', 'contact-project-filter', 'contact-company-filter', 'contact-position-filter'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
        const eventType = el.tagName === 'SELECT' ? 'change' : 'input';
        el.addEventListener(eventType, renderContactsTable);
    }
});

document.getElementById('clear-contact-filters')?.addEventListener('click', () => {
    document.getElementById('contact-search').value = '';
    document.getElementById('contact-project-filter').value = 'all';
    document.getElementById('contact-company-filter').value = 'all';
    document.getElementById('contact-position-filter').value = 'all';
    renderContactsTable();
});

// Contact Management Functions
export function initializeContacts() {
    loadContacts();
    setupContactListeners();
    setupContactFilters();
    renderContactsTable();
}

function loadContacts() {
    if (!state.contacts) {
        state.contacts = [];
    }
}

function setupContactListeners() {
    // Add Contact Modal
    const addModal = document.getElementById('contact-modal');
    const addBtn = document.querySelector('.add-contact-btn');
    const addForm = document.getElementById('contact-form');
    const copyEmailsBtn = document.getElementById('copy-emails-btn');

    if (copyEmailsBtn) {
        copyEmailsBtn.addEventListener('click', handleCopyEmails);
    }

    if (addBtn) {
        addBtn.addEventListener('click', showContactForm);
    }

    if (addModal) {
        addModal.querySelector('.close-modal')?.addEventListener('click', hideContactForm);
        addModal.querySelector('.cancel-btn')?.addEventListener('click', hideContactForm);
        
        // Close on outside click
        addModal.addEventListener('click', (e) => {
            if (e.target === addModal) hideContactForm();
        });
    }

    if (addForm) {
        addForm.addEventListener('submit', handleAddContact);
    }

    // Edit Contact Modal
    const editModal = document.getElementById('edit-contact-modal');
    const editForm = document.getElementById('edit-contact-form');

    if (editModal) {
        const closeBtn = editModal.querySelector('.close-modal');
        const cancelBtn = editModal.querySelector('.cancel-btn');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                hideEditContactForm();
            });
        }
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                hideEditContactForm();
            });
        }
        
        // Close on outside click
        editModal.addEventListener('click', (e) => {
            if (e.target === editModal) {
                hideEditContactForm();
            }
        });
    }

    if (editForm) {
        editForm.addEventListener('submit', handleEditContact);
    }
}

function showContactForm() {
    const modal = document.getElementById('contact-modal');
    const form = document.getElementById('contact-form');
    if (!modal || !form) return;

    form.reset();
    updateProjectTags('contact-project-tags');
    modal.classList.add('active');
}

function hideContactForm() {
    const modal = document.getElementById('contact-modal');
    if (modal) modal.classList.remove('active');
}

export function showEditContactForm(contactId) {
    const contact = state.contacts.find(c => c.id === contactId);
    if (!contact) return;

    const modal = document.getElementById('edit-contact-modal');
    const form = document.getElementById('edit-contact-form');
    if (!modal || !form) return;

    // Fill form with contact data
    form.elements['id'].value = contact.id;
    form.elements['name'].value = contact.name;
    form.elements['position'].value = contact.position;
    form.elements['email'].value = contact.email;
    form.elements['phone'].value = contact.phone || '';
    form.elements['company'].value = contact.company;

    // Update and mark selected project tags
    updateProjectTags('edit-contact-project-tags', contact.projects);
    
    modal.classList.add('active');
}

function hideEditContactForm() {
    console.log('hideEditContactForm called');
    const modal = document.getElementById('edit-contact-modal');
    console.log('Modal found:', !!modal);
    if (modal) {
        console.log('Modal classes before removal:', modal.className);
        modal.classList.remove('active');
        console.log('Modal classes after removal:', modal.className);
    }
}

function handleAddContact(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const contactData = Object.fromEntries(formData);
    
    // Get selected projects
    const projectTags = document.querySelectorAll('#contact-project-tags .project-tag.selected');
    contactData.projects = Array.from(projectTags).map(tag => tag.dataset.project);
    
    // Add unique ID
    contactData.id = Date.now().toString();
    
    // Add to contacts array
    state.contacts.push(contactData);
    
    // Update project data tables
    contactData.projects.forEach(projectName => {
        const project = Object.entries(state.projectsData).find(([_, p]) => p.name === projectName);
        if (project) {
            const [projectId, projectData] = project;
            if (!projectData.quickInfoContacts) {
                projectData.quickInfoContacts = {
                    address: '',
                    contacts: []
                };
            }
            
            // Add contact to project's contacts
            projectData.quickInfoContacts.contacts.push({
                position: contactData.position,
                name: contactData.name,
                email: contactData.email,
                phone: contactData.phone || '',
                company: contactData.company
            });

            // Update project table
            const projectTable = document.querySelector(`#${projectId} .project-table`);
            if (projectTable) {
                renderTable(projectTable, projectData.headers, projectData.content, false);
            }
        }
    });
    
    saveState();
    renderContactsTable();
    hideContactForm();
    
    // Show success message
    alert('Contact added successfully!');
}

function handleEditContact(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const contactData = Object.fromEntries(formData);
    
    // Get selected projects
    const projectTags = document.querySelectorAll('#edit-contact-project-tags .project-tag.selected');
    contactData.projects = Array.from(projectTags).map(tag => tag.dataset.project);
    
    const index = state.contacts.findIndex(c => c.id === contactData.id);
    if (index !== -1) {
        const oldContact = state.contacts[index];
        state.contacts[index] = contactData;

        // Update project data tables
        // First, remove contact from projects they were removed from
        oldContact.projects.forEach(projectName => {
            if (!contactData.projects.includes(projectName)) {
                const project = Object.entries(state.projectsData).find(([_, p]) => p.name === projectName);
                if (project) {
                    const [projectId, projectData] = project;
                    if (projectData.quickInfoContacts && projectData.quickInfoContacts.contacts) {
                        projectData.quickInfoContacts.contacts = projectData.quickInfoContacts.contacts.filter(
                            c => c.email !== oldContact.email
                        );
                        
                        // Update project table
                        const projectTable = document.querySelector(`#${projectId} .project-table`);
                        if (projectTable) {
                            renderTable(projectTable, projectData.headers, projectData.content, false);
                        }
                    }
                }
            }
        });

        // Then, add/update contact in current projects
        contactData.projects.forEach(projectName => {
            const project = Object.entries(state.projectsData).find(([_, p]) => p.name === projectName);
            if (project) {
                const [projectId, projectData] = project;
                if (!projectData.quickInfoContacts) {
                    projectData.quickInfoContacts = {
                        address: '',
                        contacts: []
                    };
                }

                // Update or add contact
                const contactIndex = projectData.quickInfoContacts.contacts.findIndex(
                    c => c.email === oldContact.email
                );
                const updatedContact = {
                    position: contactData.position,
                    name: contactData.name,
                    email: contactData.email,
                    phone: contactData.phone || '',
                    company: contactData.company
                };

                if (contactIndex !== -1) {
                    projectData.quickInfoContacts.contacts[contactIndex] = updatedContact;
                } else {
                    projectData.quickInfoContacts.contacts.push(updatedContact);
                }

                // Update project table
                const projectTable = document.querySelector(`#${projectId} .project-table`);
                if (projectTable) {
                    renderTable(projectTable, projectData.headers, projectData.content, false);
                }
            }
        });

        saveState();
        renderContactsTable();
        console.log('About to call hideEditContactForm');
        hideEditContactForm();
        console.log('hideEditContactForm called');
        
        // Show success message
        alert('Contact updated successfully!');
    }
}

export function deleteContact(contactId) {
    if (confirm('Are you sure you want to delete this contact?')) {
        const contact = state.contacts.find(c => c.id === contactId);
        if (contact) {
            // Remove contact from all associated projects
            contact.projects.forEach(projectName => {
                const project = Object.entries(state.projectsData).find(([_, p]) => p.name === projectName);
                if (project) {
                    const [projectId, projectData] = project;
                    if (projectData.quickInfoContacts && projectData.quickInfoContacts.contacts) {
                        projectData.quickInfoContacts.contacts = projectData.quickInfoContacts.contacts.filter(
                            c => c.email !== contact.email
                        );
                        
                        // Update project table
                        const projectTable = document.querySelector(`#${projectId} .project-table`);
                        if (projectTable) {
                            renderTable(projectTable, projectData.headers, projectData.content, false);
                        }
                    }
                }
            });

            // Remove from contacts array
            state.contacts = state.contacts.filter(c => c.id !== contactId);
            saveState();
            renderContactsTable();
            
            // Show success message
            alert('Contact deleted successfully!');
        }
    }
}

// UI Rendering Functions
export function renderContacts() {
    const container = document.querySelector('.contacts-container');
    if (!container) return;

    const filteredContacts = filterContacts(state.contacts);
    
    container.innerHTML = filteredContacts.map(contact => `
        <div class="contact-card">
            <div class="contact-card-header">
                <h3>${contact.name}</h3>
                <div class="contact-actions">
                    <button class="edit-btn" data-id="${contact.id}">✏️</button>
                    <button class="delete-btn" data-id="${contact.id}">🗑️</button>
                </div>
            </div>
            <div class="contact-info">
                <p><strong>Position:</strong> ${contact.position}</p>
                <p><strong>Email:</strong> ${contact.email}</p>
                <p><strong>Phone:</strong> ${contact.phone || 'N/A'}</p>
                <p><strong>Company:</strong> ${contact.company}</p>
                <p><strong>Projects:</strong> ${contact.projects?.join(', ') || 'None'}</p>
            </div>
        </div>
    `).join('');

    // Add event listeners to the new elements
    container.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => showEditContactForm(btn.dataset.id));
    });

    container.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteContact(btn.dataset.id));
    });
}

// Project Tags Functions
function updateProjectTags(containerId, selectedProjects = []) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const projectNames = Object.values(state.projectsData).map(p => p.name);
    
    container.innerHTML = projectNames.map(project => `
        <div class="project-tag ${selectedProjects.includes(project) ? 'selected' : 'unselected'}"
             data-project="${project}">
            ${project}
        </div>
    `).join('');

    // Add click handlers to toggle selection
    container.querySelectorAll('.project-tag').forEach(tag => {
        tag.addEventListener('click', () => {
            tag.classList.toggle('selected');
            tag.classList.toggle('unselected');
        });
    });
}

// Filter Functions
function setupContactFilters() {
    const searchInput = document.getElementById('contact-search');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            renderContacts();
        });
    }
}

function filterContacts(contacts) {
    const searchTerm = document.getElementById('contact-search')?.value.toLowerCase() || '';
    
    return contacts.filter(contact => {
        const searchString = `
            ${contact.name}
            ${contact.position}
            ${contact.email}
            ${contact.phone}
            ${contact.company}
            ${contact.projects?.join(' ')}
        `.toLowerCase();
        
        return searchString.includes(searchTerm);
    });
}

function handleCopyEmails() {
    const filters = {
        search: document.getElementById('contact-search').value.toLowerCase(),
        project: document.getElementById('contact-project-filter').value,
        company: document.getElementById('contact-company-filter').value,
        position: document.getElementById('contact-position-filter').value,
    };

    const filteredContacts = state.contacts.filter(contact => {
        const searchMatch = !filters.search ||
            (contact.name || '').toLowerCase().includes(filters.search) ||
            (contact.email || '').toLowerCase().includes(filters.search);
        
        const projectMatch = filters.project === 'all' || (contact.projects || []).includes(filters.project);
        const companyMatch = filters.company === 'all' || contact.company === filters.company;
        const positionMatch = filters.position === 'all' || contact.position === filters.position;

        return searchMatch && projectMatch && companyMatch && positionMatch;
    });

    const emails = filteredContacts
        .map(contact => contact.email)
        .filter(email => email && email.trim() !== '')
        .join(', ');

    if (emails) {
        navigator.clipboard.writeText(emails).then(() => {
            // Visual feedback
            const copyBtn = document.getElementById('copy-emails-btn');
            const originalText = copyBtn.innerHTML;
            copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
            setTimeout(() => {
                copyBtn.innerHTML = originalText;
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy emails:', err);
            alert('Failed to copy emails to clipboard');
        });
    } else {
        alert('No email addresses to copy');
    }
}

// Set up event delegation for dynamically created contact buttons
function setupDynamicEventListeners() {
    // Use event delegation to handle edit/delete buttons in the contacts table
    document.addEventListener('click', (e) => {
        if (e.target.matches('.contacts-table .edit-btn')) {
            showEditContactForm(e.target.dataset.id);
        } else if (e.target.matches('.edit-btn') && e.target.closest('.contacts-table')) {
            showEditContactForm(e.target.dataset.id);
        }
        
        if (e.target.matches('.contacts-table .delete-btn')) {
            deleteContact(e.target.dataset.id);
        } else if (e.target.matches('.delete-btn') && e.target.closest('.contacts-table')) {
            deleteContact(e.target.dataset.id);
        }
    });
}

// Initialize event delegation when the module loads
setupDynamicEventListeners(); 