// This module will handle all logic related to contacts.
import { state, saveState } from './state.js';

/**
 * Syncs contacts from all projects into a master list in the state,
 * then renders them to the UI.
 */
export function syncAndRenderContacts() {
    const allContactsMap = new Map();

    Object.values(state.projectsData).forEach(project => {
        if (project.quickInfoContacts && project.quickInfoContacts.contacts) {
            project.quickInfoContacts.contacts.forEach(contact => {
                if (contact.email && contact.email.trim() !== '') {
                    if (allContactsMap.has(contact.email)) {
                        const existingContact = allContactsMap.get(contact.email);
                        existingContact.projects.push(project.name);
                    } else {
                        allContactsMap.set(contact.email, {
                            ...contact,
                            projects: [project.name],
                            company: contact.company || 'N/A'
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

    if (filteredContacts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state-cell">No contacts match the current filters.</td></tr>';
        return;
    }

    tbody.innerHTML = filteredContacts.map(createContactRow).join('');
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
                <button title="Edit" class="edit-contact-btn" data-email="${contact.email}">✏️</button>
                <button title="Delete" class="delete-contact-btn" data-email="${contact.email}">🗑️</button>
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