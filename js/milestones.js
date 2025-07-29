import { state } from './state.js';



function calculateMilestoneProgress(project, milestones) {
    const milestoneIndex = project.headers.indexOf('Milestone');
    const statusIndex = project.headers.indexOf('Status');
    
    if (milestoneIndex === -1 || statusIndex === -1) {
        return {};
    }

    const progress = {};
    
    // Calculate progress for each milestone except "Completo"
    milestones.forEach(milestone => {
        if (milestone === 'Completo') {
            // For "Completo", calculate overall project completion
            const totalActivities = project.content.length;
            const completedActivities = project.content.filter(row => 
                row[statusIndex] === 'completo'
            ).length;
            progress[milestone] = totalActivities > 0 ? (completedActivities / totalActivities) * 100 : 0;
        } else {
            // For other milestones, calculate completion of activities within that milestone
            const milestoneActivities = project.content.filter(row => 
                row[milestoneIndex] === milestone
            );
            const completedMilestoneActivities = milestoneActivities.filter(row => 
                row[statusIndex] === 'completo'
            );
            
            progress[milestone] = milestoneActivities.length > 0 ? 
                (completedMilestoneActivities.length / milestoneActivities.length) * 100 : 0;
        }
    });

    return progress;
}

function createMilestoneProgressSegments(containerEl, diamonds, milestones, milestoneProgress, 
                                       lineLeft, lineWidth, lineTop, containerRect) {
    // Calculate segment progress between consecutive milestones
    for (let i = 0; i < milestones.length - 1; i++) {
        const currentMilestone = milestones[i];
        const nextMilestone = milestones[i + 1];
        
        // Get diamond positions
        const currentDiamond = diamonds[i].getBoundingClientRect();
        const nextDiamond = diamonds[i + 1].getBoundingClientRect();
        
        const segmentLeft = currentDiamond.left + currentDiamond.width/2 - containerRect.left;
        const segmentRight = nextDiamond.left + nextDiamond.width/2 - containerRect.left;
        const segmentWidth = segmentRight - segmentLeft;
        
        // Calculate progress for this segment
        let segmentProgress = 0;
        if (nextMilestone === 'Completo') {
            // Progress toward final completion
            segmentProgress = milestoneProgress[currentMilestone] || 0;
        } else {
            // Progress from current milestone to next milestone
            const currentProgress = milestoneProgress[currentMilestone] || 0;
            const nextProgress = milestoneProgress[nextMilestone] || 0;
            segmentProgress = currentProgress; // Show current milestone's completion
        }
        
        // Create progress bar for this segment
        const progressSegment = document.createElement('div');
        progressSegment.className = 'milestone-progress-segment';
        progressSegment.style.position = 'absolute';
        progressSegment.style.left = segmentLeft + 'px';
        progressSegment.style.width = segmentWidth + 'px';
        progressSegment.style.height = '4px';
        progressSegment.style.top = lineTop + 'px';
        progressSegment.style.transform = 'translateY(-2px)';
        progressSegment.style.zIndex = '2';
        progressSegment.style.background = 'transparent';
        
        // Create the actual progress fill
        const progressFill = document.createElement('div');
        progressFill.className = 'milestone-progress-fill';
        progressFill.style.height = '100%';
        progressFill.style.width = Math.min(100, Math.max(0, segmentProgress)) + '%';
        progressFill.style.background = getProgressColor(segmentProgress);
        progressFill.style.borderRadius = '2px';
        progressFill.style.transition = 'width 0.3s ease';
        
        progressSegment.appendChild(progressFill);
        containerEl.appendChild(progressSegment);
        
        // Add progress label
        const progressLabel = document.createElement('div');
        progressLabel.className = 'milestone-progress-label';
        progressLabel.style.position = 'absolute';
        progressLabel.style.left = (segmentLeft + segmentWidth/2) + 'px';
        progressLabel.style.top = (lineTop + 15) + 'px';
        progressLabel.style.transform = 'translateX(-50%)';
        progressLabel.style.fontSize = '12px';
        progressLabel.style.color = '#666';
        progressLabel.style.fontWeight = 'bold';
        progressLabel.style.background = 'rgba(255, 255, 255, 0.9)';
        progressLabel.style.padding = '2px 6px';
        progressLabel.style.borderRadius = '3px';
        progressLabel.style.zIndex = '3';
        progressLabel.textContent = Math.round(segmentProgress) + '%';
        
        containerEl.appendChild(progressLabel);
    }
}

function getProgressColor(progress) {
    if (progress >= 80) return '#28a745'; // Green
    if (progress >= 60) return '#ffc107'; // Yellow
    if (progress >= 40) return '#fd7e14'; // Orange
    return '#dc3545'; // Red
}

function createProgressPins(containerEl, projectId, milestones, lineLeft, lineWidth, lineTop, containerRect) {
    const project = state.projectsData[projectId];
    if (!project) return;

    // Create planned progress pin
    const plannedPosition = calculatePlannedProgressPosition(project, milestones, lineWidth);
    console.log('🎯 Planned Progress Position:', plannedPosition, 'px');
    if (plannedPosition !== null) {
        const finalPosition = plannedPosition + lineLeft;
        console.log('🎯 Final Planned Position:', finalPosition, 'px (lineLeft:', lineLeft, 'px)');
        createProgressPin(containerEl, 'planned', finalPosition, lineTop, '#FF9800', 'Planned Progress');
    }

    // Create actual progress pin
    const actualPosition = calculateActualProgressPosition(project, milestones, lineWidth);
    if (actualPosition !== null) {
        createProgressPin(containerEl, 'actual', actualPosition + lineLeft, lineTop, '#4CAF50', 'Actual Progress');
    }
}

function createProgressPin(containerEl, type, xPosition, lineTop, color, label) {
    // Create pin container
    const pinContainer = document.createElement('div');
    pinContainer.className = `progress-pin ${type}-progress-pin`;
    pinContainer.style.position = 'absolute';
    pinContainer.style.left = xPosition + 'px';
    pinContainer.style.zIndex = '10';
    pinContainer.style.textAlign = 'center';
    pinContainer.style.transform = 'translateX(-50%)';

    // Create pin marker
    const pinMarker = document.createElement('div');
    pinMarker.style.width = '12px';
    pinMarker.style.height = '12px';
    pinMarker.style.borderRadius = '50%';
    pinMarker.style.backgroundColor = color;
    pinMarker.style.border = '2px solid white';
    pinMarker.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
    pinMarker.style.margin = '0 auto';

    // Create pin line
    const pinLine = document.createElement('div');
    pinLine.style.width = '2px';
    pinLine.style.height = '35px';
    pinLine.style.backgroundColor = color;
    pinLine.style.margin = '0 auto';
    pinLine.style.borderRadius = '1px';

    // Create pin label
    const pinLabel = document.createElement('div');
    pinLabel.textContent = label;
    pinLabel.style.fontSize = '10px';
    pinLabel.style.color = '#666';
    pinLabel.style.fontWeight = '500';
    pinLabel.style.whiteSpace = 'nowrap';
    pinLabel.style.background = 'rgba(255, 255, 255, 0.9)';
    pinLabel.style.padding = '2px 4px';
    pinLabel.style.borderRadius = '3px';
    pinLabel.style.boxShadow = '0 1px 2px rgba(0,0,0,0.1)';

    // Position elements based on pin type
    if (type === 'actual') {
        // Actual Progress: Everything above timeline (label -> circle -> line -> timeline)
        pinContainer.style.top = (lineTop - 80) + 'px';
        pinLabel.style.marginBottom = '5px';
        pinMarker.style.marginBottom = '5px';
        
        // Assemble pin: label -> circle -> line
        pinContainer.appendChild(pinLabel);
        pinContainer.appendChild(pinMarker);
        pinContainer.appendChild(pinLine);
    } else {
        // Planned Progress: Everything below timeline (timeline -> line -> circle -> label)
        pinContainer.style.top = (lineTop + 10) + 'px';
        pinLine.style.marginBottom = '5px';
        pinMarker.style.marginBottom = '5px';
        
        // Assemble pin: line -> circle -> label
        pinContainer.appendChild(pinLine);
        pinContainer.appendChild(pinMarker);
        pinContainer.appendChild(pinLabel);
    }

    // Add to container
    containerEl.appendChild(pinContainer);
}

function calculatePlannedProgressPosition(project, milestones, lineWidth) {
    // Find expected date column
    const expectedDateIndex = project.headers.findIndex(header => 
        header.toLowerCase().includes('fecha esperada') || 
        header.toLowerCase().includes('expected date') ||
        header.toLowerCase().includes('due date')
    );
    
    if (expectedDateIndex === -1) return null;

    const milestoneIndex = project.headers.indexOf('Milestone');
    if (milestoneIndex === -1) return null;

    const today = new Date();
    console.log('🕐 Today:', today.toDateString());
    
    // Calculate total activities for weighted scale (same as timeline)
    const totalActivities = project.content.length;
    if (totalActivities === 0) return null;
    
    // Calculate cumulative activities up to each milestone (same as timeline)
    const milestonePositions = [];
    let cumulativeActivities = 0;
    
    const milestonesExcludingCompleto = milestones.slice(0, -1); // Exclude "Completo"
    
    for (let i = 0; i < milestonesExcludingCompleto.length; i++) {
        const milestone = milestonesExcludingCompleto[i];
        const milestoneActivities = project.content.filter(row => row[milestoneIndex] === milestone).length;
        
        milestonePositions.push({
            milestone,
            index: i,
            startPosition: cumulativeActivities,
            endPosition: cumulativeActivities + milestoneActivities,
            activities: milestoneActivities
        });
        
        cumulativeActivities += milestoneActivities;
    }
    
    // Calculate time-weighted positions for each milestone segment
    const milestoneTimePositions = [];
    let cumulativeDays = 0;
    let totalProjectDays = 0;
    
    // First pass: calculate total project days
    for (let i = 0; i < milestonePositions.length; i++) {
        const milestonePos = milestonePositions[i];
        const milestoneRows = project.content.filter(row => row[milestoneIndex] === milestonePos.milestone);
        
        if (milestoneRows.length === 0) continue;
        
        const milestoneDates = milestoneRows
            .map(row => parseProjectDate(row[expectedDateIndex]))
            .filter(date => date !== null)
            .sort((a, b) => a - b);
        
        if (milestoneDates.length === 0) continue;
        
        const milestoneStartDate = milestoneDates[0];
        const milestoneEndDate = milestoneDates[milestoneDates.length - 1];
        const milestoneDays = milestoneEndDate - milestoneStartDate;
        
        totalProjectDays += milestoneDays;
    }
    
    // Second pass: calculate time-weighted positions
    for (let i = 0; i < milestonePositions.length; i++) {
        const milestonePos = milestonePositions[i];
        const milestoneRows = project.content.filter(row => row[milestoneIndex] === milestonePos.milestone);
        
        if (milestoneRows.length === 0) continue;
        
        const milestoneDates = milestoneRows
            .map(row => parseProjectDate(row[expectedDateIndex]))
            .filter(date => date !== null)
            .sort((a, b) => a - b);
        
        if (milestoneDates.length === 0) continue;
        
        const milestoneStartDate = milestoneDates[0];
        const milestoneEndDate = milestoneDates[milestoneDates.length - 1];
        const milestoneDays = milestoneEndDate - milestoneStartDate;
        
        milestoneTimePositions.push({
            milestone: milestonePos.milestone,
            startDate: milestoneStartDate,
            endDate: milestoneEndDate,
            days: milestoneDays,
            startPosition: cumulativeDays,
            endPosition: cumulativeDays + milestoneDays,
            timelineStartPos: (cumulativeDays / totalProjectDays) * lineWidth,
            timelineEndPos: ((cumulativeDays + milestoneDays) / totalProjectDays) * lineWidth
        });
        
        cumulativeDays += milestoneDays;
        
        console.log(`📅 ${milestonePos.milestone}: ${milestoneStartDate.toDateString()} to ${milestoneEndDate.toDateString()} (${milestoneDays} days)`);
        console.log(`📊 Timeline position: ${((cumulativeDays - milestoneDays) / totalProjectDays * 100).toFixed(1)}% to ${(cumulativeDays / totalProjectDays * 100).toFixed(1)}%`);
    }
    
    // Find which milestone segment today falls into
    let plannedPosition = 0;
    
    for (let i = 0; i < milestoneTimePositions.length; i++) {
        const timePos = milestoneTimePositions[i];
        
        // Check if today falls within this milestone's date range
        if (today >= timePos.startDate && today <= timePos.endDate) {
            // Calculate progress within this milestone segment based on days
            const daysFromStart = today - timePos.startDate;
            const progressWithinMilestone = timePos.days > 0 ? daysFromStart / timePos.days : 0;
            
            // Calculate position using time-weighted scale
            const segmentWidth = timePos.timelineEndPos - timePos.timelineStartPos;
            plannedPosition = timePos.timelineStartPos + (segmentWidth * progressWithinMilestone);
            
            console.log(`📊 Today falls in ${timePos.milestone} segment`);
            console.log(`📊 Days from milestone start: ${daysFromStart} days`);
            console.log(`📊 Progress within milestone: ${(progressWithinMilestone * 100).toFixed(1)}%`);
            console.log(`📊 Segment timeline position: ${timePos.timelineStartPos.toFixed(1)} to ${timePos.timelineEndPos.toFixed(1)} px`);
            console.log(`📍 Final planned position: ${plannedPosition.toFixed(1)} px`);
            
            return plannedPosition;
        }
        
        // If today is after this milestone, continue to next
        if (today > timePos.endDate) {
            plannedPosition = timePos.timelineEndPos;
        }
    }
    
    // If we get here, today is after all milestones or before the first one
    if (milestoneTimePositions.length > 0 && today < milestoneTimePositions[0].startDate) {
        plannedPosition = 0;
    } else {
        // Today is after all milestones, position at the end
        plannedPosition = lineWidth;
    }
    
    console.log(`📍 Final planned position: ${plannedPosition.toFixed(1)} px`);
    return plannedPosition;
}

function calculateActualProgressPosition(project, milestones, lineWidth) {
    const milestoneIndex = project.headers.indexOf('Milestone');
    const statusIndex = project.headers.findIndex(header => 
        header.toLowerCase().includes('status') || 
        header.toLowerCase().includes('estado')
    );
    
    if (milestoneIndex === -1 || statusIndex === -1) return null;

    // Calculate total activities for weighted scale
    const totalActivities = project.content.length;
    if (totalActivities === 0) return null;
    
    // Calculate cumulative activities up to each milestone
    const milestonePositions = [];
    let cumulativeActivities = 0;
    
    const milestonesExcludingCompleto = milestones.slice(0, -1); // Exclude "Completo"
    
    for (let i = 0; i < milestonesExcludingCompleto.length; i++) {
        const milestone = milestonesExcludingCompleto[i];
        const milestoneActivities = project.content.filter(row => row[milestoneIndex] === milestone).length;
        
        milestonePositions.push({
            milestone,
            index: i,
            startPosition: cumulativeActivities,
            endPosition: cumulativeActivities + milestoneActivities,
            activities: milestoneActivities
        });
        
        cumulativeActivities += milestoneActivities;
    }
    let actualPosition = 0;
    let lastCompletedIndex = -1;

    // Find the last completed milestone and calculate progress
    
    for (let i = 0; i < milestonesExcludingCompleto.length; i++) {
        const milestone = milestonesExcludingCompleto[i];
        const milestoneRows = project.content.filter(row => row[milestoneIndex] === milestone);
        
        if (milestoneRows.length === 0) continue;

        const completedTasks = milestoneRows.filter(row => {
            const status = (row[statusIndex] || '').toLowerCase().trim();
            return status === 'completo';
        }).length;

        const completionPercentage = (completedTasks / milestoneRows.length) * 100;

        if (completionPercentage === 100) {
            lastCompletedIndex = i;
            const milestonePos = milestonePositions.find(pos => pos.milestone === milestone);
            if (milestonePos) {
                actualPosition = (milestonePos.endPosition / totalActivities) * lineWidth;
            }
        } else if (lastCompletedIndex !== -1 && i === lastCompletedIndex + 1) {
            // Add partial progress of the next milestone
            const milestonePos = milestonePositions.find(pos => pos.milestone === milestone);
            if (milestonePos) {
                const startPos = (milestonePos.startPosition / totalActivities) * lineWidth;
                const endPos = (milestonePos.endPosition / totalActivities) * lineWidth;
                const segmentWidth = endPos - startPos;
                actualPosition = startPos + (segmentWidth * (completionPercentage / 100));
            }
            break;
        } else if (lastCompletedIndex === -1 && completionPercentage > 0) {
            // First milestone with partial progress
            const milestonePos = milestonePositions.find(pos => pos.milestone === milestone);
            if (milestonePos) {
                const startPos = (milestonePos.startPosition / totalActivities) * lineWidth;
                const endPos = (milestonePos.endPosition / totalActivities) * lineWidth;
                const segmentWidth = endPos - startPos;
                actualPosition = startPos + (segmentWidth * (completionPercentage / 100));
            }
            break;
        }
    }

    return actualPosition;
}

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

// Helper function to refresh timeline for a project
export function refreshProjectTimeline(projectId) {
    console.log(`🔄 Refreshing timeline for project: ${projectId}`);
    
    // Smart timeline container detection
    let milestonesContainer = document.querySelector(`#${projectId} .milestones-container`);
    
    if (!milestonesContainer) {
        // Try to find the milestones view (timeline tab content)
        const milestonesView = document.querySelector(`#milestones-view-${projectId}`);
        if (milestonesView) {
            // Find or create the milestones container
            milestonesContainer = milestonesView.querySelector('.milestones-container');
            if (!milestonesContainer) {
                // Create the container if milestones view exists but container doesn't
                milestonesContainer = document.createElement('div');
                milestonesContainer.className = 'milestones-container';
                milestonesView.appendChild(milestonesContainer);
                console.log('🏗️ Created missing milestones container');
            }
        } else {
            console.log('💡 Milestones view not found - timeline tab may not be initialized yet');
        }
    }
    
    if (milestonesContainer) {
        console.log('✅ Milestones container found, refreshing timeline...');
        createMilestonesTimeline(milestonesContainer, projectId);
    } else {
        console.log('⚠️ Timeline container not found - you may need to visit the Timeline tab first');
    }
}

export function createMilestonesTimeline(container, projectId) {
    if (!container || !projectId) return;

    const project = state.projectsData[projectId];
    if (!project || !project.content || project.content.length === 0) {
        container.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">No milestone data available</div>';
        return;
    }

    // Extract unique milestones from project data
    const milestoneIndex = project.headers.indexOf('Milestone');
    if (milestoneIndex === -1) {
        container.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">No milestone data available</div>';
        return;
    }

    // Get unique milestones in order
    const milestones = [];
    const seen = new Set();
    
    project.content.forEach(row => {
        const milestone = row[milestoneIndex];
        if (milestone && milestone.trim() !== '' && !seen.has(milestone)) {
            seen.add(milestone);
            milestones.push(milestone);
        }
    });

    // Add "Completo" milestone at the end
    milestones.push('Completo');

    // Calculate progress for each milestone
    const milestoneProgress = calculateMilestoneProgress(project, milestones);

    // Generate milestone nodes HTML
    const milestoneNodes = milestones.map((milestone, index) => {
        const progress = milestoneProgress[milestone] || 0;
        const isComplete = milestone === 'Completo';
        
        return `
            <div class="milestone-node" data-milestone="${milestone}">
                <div class="milestone-diamond ${isComplete ? 'complete-diamond' : ''}">
                    <div class="milestone-diamond-inner">${Math.round(progress)}%</div>
                </div>
                <div class="milestone-label">${milestone}</div>
            </div>
        `;
    }).join('');

    container.innerHTML = `
        <div style="background: white; padding: 20px; border-radius: 8px; min-height: 200px; display: flex; flex-direction: column; justify-content: center;">
            <h3 style="color: #333; margin: 0 0 20px 0; text-align: center;">Project Timeline</h3>
            <div class="milestone-timeline-container" style="width: 100%; min-height: 150px; position: relative; display: flex; align-items: center;">
                <div class="milestones-wrapper" style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
                    ${milestoneNodes}
                </div>
            </div>
        </div>
    `;

    // Check if we already have a styled container to prevent duplication
    let targetContainer = container;
    const parentContainer = container.parentElement;
    
    // Look for existing styled container
    const existingStyledContainer = parentContainer?.querySelector('.new-milestones-container');
    
    if (existingStyledContainer) {
        // Use existing styled container
        targetContainer = existingStyledContainer;
        // Clear its content
        targetContainer.innerHTML = '';
    } else {
        // Create new styled container
        const newContainer = document.createElement('div');
        newContainer.className = 'new-milestones-container';
        newContainer.style.marginTop = '20px';
        newContainer.style.padding = '0';
        newContainer.style.background = '#f0f0f0';
        newContainer.style.borderRadius = '8px';
        newContainer.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
        newContainer.style.display = 'flex';
        newContainer.style.justifyContent = 'center';
        
        // Append to parent and use as target
        if (parentContainer) {
            parentContainer.appendChild(newContainer);
        }
        targetContainer = newContainer;
    }
    
    // Move the timeline content to the target container
    const milestonesTimeline = container.querySelector('.milestone-timeline-container');
    if (milestonesTimeline && targetContainer !== container) {
        targetContainer.appendChild(milestonesTimeline);
    }

    // Add timeline line and progress segments after DOM is ready
    setTimeout(() => {
        const containerEl = targetContainer.querySelector('.milestone-timeline-container');
        const diamonds = targetContainer.querySelectorAll('.milestone-diamond');

        if (diamonds.length >= 2 && containerEl) {
            const containerRect = containerEl.getBoundingClientRect();
            const firstDiamond = diamonds[0].getBoundingClientRect();
            const lastDiamond = diamonds[diamonds.length - 1].getBoundingClientRect();

            const lineLeft = firstDiamond.left + firstDiamond.width/2 - containerRect.left;
            const lineRight = lastDiamond.left + lastDiamond.width/2 - containerRect.left;
            const lineWidth = lineRight - lineLeft;
            const lineTop = firstDiamond.top + firstDiamond.height/2 - containerRect.top;

            // Create main timeline line (background)
            const timelineLineEl = document.createElement('div');
            timelineLineEl.className = 'timeline-line';
            timelineLineEl.style.left = lineLeft + 'px';
            timelineLineEl.style.width = lineWidth + 'px';
            timelineLineEl.style.top = lineTop + 'px';
            timelineLineEl.style.transform = 'translateY(-2px)';
            timelineLineEl.style.background = '#e0e0e0';
            timelineLineEl.style.height = '4px';
            timelineLineEl.style.position = 'absolute';
            timelineLineEl.style.zIndex = '1';
            containerEl.appendChild(timelineLineEl);

            // Create progress segments between milestones
            createMilestoneProgressSegments(containerEl, diamonds, milestones, milestoneProgress, 
                                           lineLeft, lineWidth, lineTop, containerRect);

            // Add progress pins
            createProgressPins(containerEl, projectId, milestones, lineLeft, lineWidth, lineTop, containerRect);
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

// Function to update project completion percentage
function updateProjectCompletion(projectId) {
    const project = state.projectsData[projectId];
    if (!project) return;

    const completedActivities = project.content.filter(row => row[project.headers.indexOf('Estado')] === 'completo').length;
    const totalActivities = project.content.length;
    const completionPercentage = (completedActivities / totalActivities) * 100;

    const completionElement = document.querySelector(`#completion-percentage-${projectId}`);
    if (completionElement) {
        completionElement.textContent = `${completionPercentage.toFixed(2)}%`;
    }
}

// Add event listener to update completion percentage on status change
function addStatusChangeListener(projectId) {
    const projectTable = document.querySelector(`#project-table-${projectId}`);
    if (projectTable) {
        projectTable.addEventListener('change', (event) => {
            if (event.target.classList.contains('status-cell')) {
                updateProjectCompletion(projectId);
            }
        });
    }
}

// Test function to verify pin functionality
window.testTimelinePins = function() {
    console.log('=== Testing Timeline Pin Functionality ===');
    
    // Check if we have projects
    const projectIds = Object.keys(state.projectsData);
    if (projectIds.length === 0) {
        console.log('❌ No projects found to test pins with');
        return;
    }
    
    const testProjectId = projectIds[0];
    const project = state.projectsData[testProjectId];
    console.log(`✅ Testing pins with project: ${project.name}`);
    
    // Check for required columns
    const milestoneIndex = project.headers.indexOf('Milestone');
    const expectedDateIndex = project.headers.findIndex(header => 
        header.toLowerCase().includes('fecha esperada') || 
        header.toLowerCase().includes('expected date')
    );
    const statusIndex = project.headers.findIndex(header => 
        header.toLowerCase().includes('status') || 
        header.toLowerCase().includes('estado')
    );
    
    console.log('Column indices:', {
        milestone: milestoneIndex,
        expectedDate: expectedDateIndex,
        status: statusIndex
    });
    
    if (milestoneIndex === -1) {
        console.log('❌ No Milestone column found');
        return;
    }
    
    if (expectedDateIndex === -1) {
        console.log('⚠️ No Expected Date column found - planned progress pin won\'t work');
    } else {
        console.log('✅ Expected Date column found - planned progress pin should work');
    }
    
    if (statusIndex === -1) {
        console.log('⚠️ No Status column found - actual progress pin won\'t work');
    } else {
        console.log('✅ Status column found - actual progress pin should work');
    }
    
    // Test pin position calculations
    const milestones = [...new Set(project.content.map(row => row[milestoneIndex]))].filter(Boolean);
    milestones.push('Completo');
    
    const plannedPosition = calculatePlannedProgressPosition(project, milestones, 400);
    const actualPosition = calculateActualProgressPosition(project, milestones, 400);
    
    console.log('Pin positions:', {
        planned: plannedPosition,
        actual: actualPosition
    });
    
    // Refresh timeline to show pins
    const timelineContainer = document.querySelector(`#${testProjectId} .milestones-container`);
    if (timelineContainer) {
        console.log('✅ Refreshing timeline to show pins...');
        createMilestonesTimeline(timelineContainer, testProjectId);
    } else {
        console.log('❌ Timeline container not found');
    }
    
    console.log('✅ Pin test completed');
};

// Ensure projectId is defined and available
window.addEventListener('load', () => {
    const projectId = 'your_project_id_here'; // Replace with actual logic to get projectId
        addStatusChangeListener(projectId);
});

// Test function to verify pin functionality
window.testTimelinePins = function() {
    console.log('=== Testing Timeline Pin Functionality ===');
    
    // Check if we have projects
    const projectIds = Object.keys(state.projectsData);
    if (projectIds.length === 0) {
        console.log('❌ No projects found to test pins with');
        return;
    }
    
    const testProjectId = projectIds[0];
    const project = state.projectsData[testProjectId];
    console.log(`✅ Testing pins with project: ${project.name}`);
    
    // Check for required columns
    const milestoneIndex = project.headers.indexOf('Milestone');
    const expectedDateIndex = project.headers.findIndex(header => 
        header.toLowerCase().includes('fecha esperada') || 
        header.toLowerCase().includes('expected date')
    );
    const statusIndex = project.headers.findIndex(header => 
        header.toLowerCase().includes('status') || 
        header.toLowerCase().includes('estado')
    );
    
    console.log('Column indices:', {
        milestone: milestoneIndex,
        expectedDate: expectedDateIndex,
        status: statusIndex
    });
    
    if (milestoneIndex === -1) {
        console.log('❌ No Milestone column found');
        return;
    }
    
    if (expectedDateIndex === -1) {
        console.log('⚠️ No Expected Date column found - planned progress pin won\'t work');
    } else {
        console.log('✅ Expected Date column found - planned progress pin should work');
    }
    
    if (statusIndex === -1) {
        console.log('⚠️ No Status column found - actual progress pin won\'t work');
    } else {
        console.log('✅ Status column found - actual progress pin should work');
    }
    
    // Test pin position calculations
    const milestones = [...new Set(project.content.map(row => row[milestoneIndex]))].filter(Boolean);
    milestones.push('Completo');
    
    const plannedPosition = calculatePlannedProgressPosition(project, milestones, 400);
    const actualPosition = calculateActualProgressPosition(project, milestones, 400);
    
    console.log('Pin positions:', {
        planned: plannedPosition,
        actual: actualPosition
    });
    
    // Refresh timeline to show pins
    const timelineContainer = document.querySelector(`#${testProjectId} .milestones-container`);
    if (timelineContainer) {
        console.log('✅ Refreshing timeline to show pins...');
        createMilestonesTimeline(timelineContainer, testProjectId);
    } else {
        console.log('❌ Timeline container not found');
    }
    
    console.log('✅ Pin test completed');
};

// Test function to verify pin functionality
window.testTimelinePins = function() {
    console.log('=== Testing Timeline Pin Functionality ===');
    
    // Check if we have projects
    const projectIds = Object.keys(state.projectsData);
    if (projectIds.length === 0) {
        console.log('❌ No projects found to test pins with');
        return;
    }
    
    const testProjectId = projectIds[0];
    const project = state.projectsData[testProjectId];
    console.log(`✅ Testing pins with project: ${project.name}`);
    
    // Check for required columns
    const milestoneIndex = project.headers.indexOf('Milestone');
    const expectedDateIndex = project.headers.findIndex(header => 
        header.toLowerCase().includes('fecha esperada') || 
        header.toLowerCase().includes('expected date')
    );
    const statusIndex = project.headers.findIndex(header => 
        header.toLowerCase().includes('status') || 
        header.toLowerCase().includes('estado')
    );
    
    console.log('Column indices:', {
        milestone: milestoneIndex,
        expectedDate: expectedDateIndex,
        status: statusIndex
    });
    
    if (milestoneIndex === -1) {
        console.log('❌ No Milestone column found');
        return;
    }
    
    if (expectedDateIndex === -1) {
        console.log('⚠️ No Expected Date column found - planned progress pin won\'t work');
    } else {
        console.log('✅ Expected Date column found - planned progress pin should work');
    }
    
    if (statusIndex === -1) {
        console.log('⚠️ No Status column found - actual progress pin won\'t work');
    } else {
        console.log('✅ Status column found - actual progress pin should work');
    }
    
    // Test pin position calculations
    const milestones = [...new Set(project.content.map(row => row[milestoneIndex]))].filter(Boolean);
    milestones.push('Completo');
    
    const plannedPosition = calculatePlannedProgressPosition(project, milestones, 400);
    const actualPosition = calculateActualProgressPosition(project, milestones, 400);
    
    console.log('Pin positions:', {
        planned: plannedPosition,
        actual: actualPosition
    });
    
    // Refresh timeline to show pins
    const timelineContainer = document.querySelector(`#${testProjectId} .milestones-container`);
    if (timelineContainer) {
        console.log('✅ Refreshing timeline to show pins...');
        createMilestonesTimeline(timelineContainer, testProjectId);
    } else {
        console.log('❌ Timeline container not found');
    }
    
    console.log('✅ Pin test completed');
};

// Simple function to test if timeline refresh works
window.testTimelineRefresh = function() {
    console.log('=== Testing Timeline Refresh ===');
    
    const projectIds = Object.keys(state.projectsData);
    if (projectIds.length === 0) {
        console.log('❌ No projects found');
        return;
    }
    
    const testProjectId = projectIds[0];
    console.log(`🎯 Testing refresh for project: ${testProjectId}`);
    
    // Check if timeline is visible
    const milestonesContainer = document.querySelector(`#${testProjectId} .milestones-container`);
    if (milestonesContainer) {
        console.log('✅ Timeline container found');
        
        // Check if we're on the timeline tab
        const timelineTab = document.querySelector(`#${testProjectId} [data-analytics-view="milestones"]`);
        const milestonesView = document.querySelector(`#milestones-view-${testProjectId}`);
        
        if (timelineContent && timelineContent.classList.contains('active')) {
            console.log('✅ Timeline tab is active');
        } else {
            console.log('⚠️ Timeline tab is not active - you need to switch to the Timeline tab first');
            
            // Try to activate the timeline tab
            if (timelineTab) {
                console.log('🔄 Activating timeline tab...');
                timelineTab.click();
            }
        }
        
        // Force refresh
        console.log('🔄 Force refreshing timeline...');
        createMilestonesTimeline(milestonesContainer, testProjectId);
        console.log('✅ Timeline refresh completed');
        
    } else {
        console.log('❌ Timeline container not found');
        console.log('💡 Make sure you have switched to a project tab and clicked on the Timeline tab');
    }
};

// Comprehensive debug function
window.debugPinUpdates = function() {
    console.log('=== Pin Update Debugging Guide ===');
    console.log('');
    console.log('🔍 **To test automatic pin updates:**');
    console.log('1. Make sure you are on a project tab (not Main Template)');
    console.log('2. Click on the "Timeline" tab within the project');
    console.log('3. Open the browser console (F12)');
    console.log('4. Edit a cell in the project table:');
    console.log('   - Change a status value');
    console.log('   - Edit an expected date');
    console.log('   - Modify a milestone');
    console.log('5. Watch the console for debug messages');
    console.log('');
    console.log('🧪 **Available test functions:**');
    console.log('- testTimelineRefresh() - Test if timeline can be refreshed');
    console.log('- testTimelinePins() - Test pin calculation and display');
    console.log('- testAutomaticPinUpdates() - Enable event monitoring');
    console.log('');
    console.log('✅ Debugging is now enabled - try editing some values!');
};