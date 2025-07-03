import { state } from './state.js';

function parseProjectDate(dateStr) {
    if (!dateStr || dateStr.trim() === '') return null;
    
    // Handle format like "15-Dec-24" or "15-Dec-2024"
    const match = dateStr.match(/(\d{1,2})-([A-Za-z]{3})-(\d{2,4})/);
    if (match) {
        const [, day, monthStr, year] = match;
        const monthMap = {
            'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
            'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
        };
        const month = monthMap[monthStr];
        const fullYear = year.length === 2 ? 2000 + parseInt(year) : parseInt(year);
        return new Date(fullYear, month, parseInt(day));
    }
    
    // Fallback to standard date parsing
    try {
        return new Date(dateStr);
    } catch {
        return null;
    }
}

export function createMilestonesTimeline(container, projectId) {
    if (!container || !projectId) return;

    const project = state.projectsData[projectId];
    if (!project || !project.headers || !project.content) {
        container.innerHTML = '<div class="timeline-container-empty">Project data is not available.</div>';
        return;
    }

    const headers = project.headers;
    const milestoneCol = headers.indexOf('Milestone');
    const statusCol = headers.indexOf('Status');
    const fechaEsperadaCol = headers.indexOf('Fecha Esperada');
    const activityCol = headers.indexOf('Actividad');

    if (milestoneCol === -1 || statusCol === -1) {
        container.innerHTML = '<div class="timeline-container-empty">Required columns (Milestone, Status) not found.</div>';
        return;
    }

    const milestones = {};
    const allActivities = [];
    
    project.content.forEach((row, index) => {
        const milestoneName = row[milestoneCol];
        if (!milestoneName) return;
        
        if (!milestones[milestoneName]) {
            milestones[milestoneName] = { total: 0, completed: 0, dates: [] };
        }
        milestones[milestoneName].total++;
        
        const status = String(row[statusCol]).toLowerCase();
        if (status === 'completo') {
            milestones[milestoneName].completed++;
        }
        
        if (fechaEsperadaCol !== -1 && row[fechaEsperadaCol]) {
            const date = parseProjectDate(row[fechaEsperadaCol]);
            if (date) {
                milestones[milestoneName].dates.push(date);
            }
        }
        
        // Track all activities for progress calculation
        allActivities.push({
            index,
            milestone: milestoneName,
            activity: row[activityCol] || `Activity ${index + 1}`,
            status: status,
            date: fechaEsperadaCol !== -1 ? parseProjectDate(row[fechaEsperadaCol]) : null
        });
    });

    const milestoneNames = Object.keys(milestones);
    if (milestoneNames.length === 0) {
        container.innerHTML = '<div class="timeline-container-empty">No milestones found.</div>';
        return;
    }

    // --- PIN CALCULATION ---
    const today = new Date();
    
    // 1. Expected Progress Pin - based on dates
    let expectedProgressPercent = 0;
    const allDates = allActivities
        .map(activity => activity.date)
        .filter(date => date !== null)
        .sort((a, b) => a - b);
    
    if (allDates.length > 0) {
        const startDate = allDates[0];
        const endDate = allDates[allDates.length - 1];
        const totalDuration = endDate.getTime() - startDate.getTime();
        
        if (totalDuration > 0) {
            const progressDuration = today.getTime() - startDate.getTime();
            expectedProgressPercent = Math.min(100, Math.max(0, (progressDuration / totalDuration) * 100));
        } else if (today >= startDate) {
            expectedProgressPercent = 100;
        }
    }

    // 2. Actual Progress Pin - based on completed activities
    let actualProgressPercent = 0;
    const completedActivities = allActivities.filter(activity => activity.status === 'completo').length;
    if (allActivities.length > 0) {
        actualProgressPercent = (completedActivities / allActivities.length) * 100;
    }

    // Constrain pins to stay within the timeline bounds (between first and last diamond)
    const timelineStart = 10; // percentage where timeline starts
    const timelineEnd = 90;   // percentage where timeline ends
    const timelineWidth = timelineEnd - timelineStart;
    
    const pinExpectedPosition = timelineStart + (expectedProgressPercent / 100) * timelineWidth;
    const pinActualPosition = timelineStart + (actualProgressPercent / 100) * timelineWidth;

    let timelineHtml = `
        <div class="milestone-timeline-container">
            <div class="milestones-wrapper">
    `;

    milestoneNames.forEach((name) => {
        const data = milestones[name];
        const percentage = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;
        
        timelineHtml += `
            <div class="milestone-node">
                <div class="milestone-diamond">
                    <div class="milestone-diamond-inner">${percentage}%</div>
                </div>
                <div class="milestone-label">${name}</div>
            </div>
        `;
    });

    timelineHtml += `
            </div>
        </div>
    `;

    container.innerHTML = timelineHtml;
    
    // After DOM is updated, calculate actual positions
    setTimeout(() => {
        const containerEl = container.querySelector('.milestone-timeline-container');
        const wrapperEl = container.querySelector('.milestones-wrapper');
        const diamonds = container.querySelectorAll('.milestone-diamond');
        
        if (diamonds.length >= 2 && containerEl && wrapperEl) {
            const containerRect = containerEl.getBoundingClientRect();
            const firstDiamond = diamonds[0].getBoundingClientRect();
            const lastDiamond = diamonds[diamonds.length - 1].getBoundingClientRect();
            
            // Calculate line position relative to container (center of diamonds)
            const lineLeft = firstDiamond.left + firstDiamond.width/2 - containerRect.left;
            const lineRight = lastDiamond.left + lastDiamond.width/2 - containerRect.left;
            const lineWidth = lineRight - lineLeft;
            const lineTop = firstDiamond.top + firstDiamond.height/2 - containerRect.top;
            
            // Create and position the timeline line
            let timelineLineEl = container.querySelector('.timeline-line');
            if (!timelineLineEl) {
                timelineLineEl = document.createElement('div');
                timelineLineEl.className = 'timeline-line';
                containerEl.appendChild(timelineLineEl);
            }
            
            timelineLineEl.style.left = lineLeft + 'px';
            timelineLineEl.style.width = lineWidth + 'px';
            timelineLineEl.style.top = lineTop + 'px';
            timelineLineEl.style.transform = 'translateY(-2px)';
            
            // Calculate pin positions along the timeline
            const expectedPinPosition = lineLeft + (expectedProgressPercent / 100) * lineWidth;
            const actualPinPosition = lineLeft + (actualProgressPercent / 100) * lineWidth;
            
            // Remove existing pins
            container.querySelectorAll('.timeline-pin').forEach(pin => pin.remove());
            
            // Create expected pin (above the line)
            const expectedPin = document.createElement('div');
            expectedPin.className = 'timeline-pin expected-pin';
            expectedPin.style.left = expectedPinPosition + 'px';
            expectedPin.style.top = (lineTop - 25) + 'px';
            expectedPin.innerHTML = `
                <div class="pin-label">Expected</div>
                <div class="pin-stem"></div>
                <div class="pin-head"></div>
            `;
            containerEl.appendChild(expectedPin);
            
            // Create actual pin (below the line)
            const actualPin = document.createElement('div');
            actualPin.className = 'timeline-pin actual-pin';
            actualPin.style.left = actualPinPosition + 'px';
            actualPin.style.top = (lineTop + 8) + 'px';
            actualPin.innerHTML = `
                <div class="pin-head"></div>
                <div class="pin-stem"></div>
                <div class="pin-label">Actual</div>
            `;
            containerEl.appendChild(actualPin);
        }
    }, 10);
}

export function createGanttChart(projectId) {
    const project = state.projectsData[projectId];
    if (!project || !project.content || project.content.length === 0) {
        return '<div class="timeline-container-empty">No data available for timeline.</div>';
    }

    const tasks = project.content.map((row, index) => {
        const headers = project.headers;
        return {
            id: row[headers.indexOf('ID')] || index + 1,
            name: row[headers.indexOf('Actividad')] || `Task ${index + 1}`,
            start: row[headers.indexOf('Fecha Esperada')],
            duration: parseInt(row[headers.indexOf('Duracion')], 10) || 1,
            dependencies: row[headers.indexOf('Dependencia')]
        };
    }).filter(task => task.start && !isNaN(new Date(task.start.replace(/(\d{2})-([A-Za-z]{3})-(\d{2})/, '$2 $1, 20$3'))));

    if (tasks.length === 0) {
        return '<div class="timeline-container-empty">No valid tasks to display in timeline.</div>';
    }

    // Calculate task positions
    const taskPositions = calculateTaskPositions(tasks);

    // Find overall date range
    let minDate = new Date(Math.min(...taskPositions.map(t => t.startDate.getTime())));
    let maxDate = new Date(Math.max(...taskPositions.map(t => t.endDate.getTime())));

    // Add some padding to the dates
    minDate.setDate(minDate.getDate() - 2);
    maxDate.setDate(maxDate.getDate() + 2);

    const totalDays = (maxDate.getTime() - minDate.getTime()) / (1000 * 3600 * 24);

    return `
        <div class="timeline-container">
            <div class="timeline-header">
                ${generateDateHeaders(minDate, maxDate)}
            </div>
            <div class="timeline-body">
                ${generateTimelineBars(taskPositions, minDate, totalDays)}
            </div>
        </div>
    `;
}

function calculateTaskPositions(tasks) {
    const taskMap = new Map(tasks.map(task => [task.id, task]));
    const positions = [];

    for (const task of tasks) {
        const startDate = new Date(task.start.replace(/(\d{2})-([A-Za-z]{3})-(\d{2})/, '$2 $1, 20$3'));
        
        if (task.dependencies) {
            const depIds = String(task.dependencies).split(',').map(id => id.trim());
            let latestDepEndDate = new Date(0);
            
            for (const depId of depIds) {
                const depTask = positions.find(p => p.id == depId); // Find already positioned tasks
                if (depTask && depTask.endDate > latestDepEndDate) {
                    latestDepEndDate = depTask.endDate;
                }
            }

            if (latestDepEndDate > startDate) {
                startDate.setTime(latestDepEndDate.getTime());
                startDate.setDate(startDate.getDate() + 1); // Start the day after dependency ends
            }
        }
        
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + (task.duration -1));

        positions.push({ ...task, startDate, endDate });
    }
    return positions;
}

function generateDateHeaders(minDate, maxDate) {
    let headers = '';
    let currentDate = new Date(minDate);
    
    while (currentDate <= maxDate) {
        headers += `<div class="timeline-date-header">${currentDate.getDate()}</div>`;
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return headers;
}

function generateTimelineBars(tasks, minDate, totalDays) {
    return tasks.map(task => {
        const offset = (task.startDate.getTime() - minDate.getTime()) / (1000 * 3600 * 24);
        const width = task.duration;

        const left = (offset / totalDays) * 100;
        const barWidth = (width / totalDays) * 100;

        return `
            <div class="timeline-bar-row">
                <div class="timeline-bar-label">${task.name}</div>
                <div class="timeline-bar-container">
                    <div class="timeline-bar" style="left: ${left}%; width: ${barWidth}%;" title="${task.name} | ${task.startDate.toDateString()} - ${task.endDate.toDateString()}"></div>
                </div>
            </div>
        `;
    }).join('');
} 