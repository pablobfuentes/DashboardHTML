// This module will handle all logic related to contacts.
import { state, saveState } from './state.js';
import { renderTable } from './ui.js';

/**
 * Syncs contacts from all projects into a master list in the state,
 * then renders them to the UI.
 */
export function syncAndRenderContacts() {
    const allContactsMap = new Map();

    // First, preserve existing contacts from state
    state.contacts.forEach(contact => {
        if (contact.email && contact.email.trim() !== '') {
            allContactsMap.set(contact.email, {
                ...contact,
                id: contact.id || Date.now().toString() + Math.random().toString(36).substr(2, 9),
                projects: contact.projects || []
            });
        }
    });

    // Then sync with project contacts
    Object.entries(state.projectsData).forEach(([projectId, project]) => {
        if (project.quickInfoContacts && project.quickInfoContacts.contacts) {
            project.quickInfoContacts.contacts.forEach(contact => {
                if (contact.email && contact.email.trim() !== '') {
                    if (allContactsMap.has(contact.email)) {
                        const existingContact = allContactsMap.get(contact.email);
                        if (!existingContact.projects.includes(project.name)) {
                            existingContact.projects.push(project.name);
                        }
                    } else {
                        allContactsMap.set(contact.email, {
                            ...contact,
                            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                            projects: [project.name]
                        });
                    }
                }
            });
        }
    });
    
    state.contacts = Array.from(allContactsMap.values());
    saveState();
    
    populateContactFilters();
    renderContactsTable();
}

/**
 * Renders the contacts from the state into the contacts table,
 * applying all active filters.
 */
export function renderContactsTable() {
    const tbody = document.querySelector('.contacts-table tbody');
    console.log('Rendering contacts table, tbody found:', !!tbody);
    if (!tbody) return;

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
        editModal.querySelector('.close-modal')?.addEventListener('click', hideEditContactForm);
        editModal.querySelector('.cancel-btn')?.addEventListener('click', hideEditContactForm);
        
        // Close on outside click
        editModal.addEventListener('click', (e) => {
            if (e.target === editModal) hideEditContactForm();
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

function showEditContactForm(contactId) {
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
    const modal = document.getElementById('edit-contact-modal');
    if (modal) modal.classList.remove('active');
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
        hideEditContactForm();
        
        // Show success message
        alert('Contact updated successfully!');
    }
}

function deleteContact(contactId) {
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