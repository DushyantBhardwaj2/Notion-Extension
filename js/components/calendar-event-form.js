// Calendar Event Form Component
class CalendarEventForm {
    constructor(container, calendarService) {
        this.container = container;
        this.calendarService = calendarService;
        this.eventData = {};
        this.editMode = false;
        this.editEventId = null;
    }

    // Render the complete event form
    render(eventData = null) {
        this.editMode = !!eventData;
        this.editEventId = eventData?.id || null;
        this.eventData = eventData || {};

        const formHtml = `
            <div class="calendar-event-form">
                <div class="form-header">
                    <h3>${this.editMode ? 'Edit Event' : 'Create New Event'}</h3>
                    <button class="form-close" data-action="close">&times;</button>
                </div>
                
                <form class="event-form" data-form="calendar-event">
                    <!-- Basic Information -->
                    <div class="form-section">
                        <h4>Basic Information</h4>
                        
                        <div class="form-group">
                            <label for="event-title">Event Title *</label>
                            <input type="text" id="event-title" name="title" required 
                                   value="${this.eventData.title || ''}" 
                                   placeholder="Enter event title">
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="event-type">Event Type</label>
                                <select id="event-type" name="type">
                                    <option value="Meeting" ${this.eventData.type === 'Meeting' ? 'selected' : ''}>Meeting</option>
                                    <option value="Appointment" ${this.eventData.type === 'Appointment' ? 'selected' : ''}>Appointment</option>
                                    <option value="Deadline" ${this.eventData.type === 'Deadline' ? 'selected' : ''}>Deadline</option>
                                    <option value="Personal" ${this.eventData.type === 'Personal' ? 'selected' : ''}>Personal</option>
                                    <option value="Work" ${this.eventData.type === 'Work' ? 'selected' : ''}>Work</option>
                                    <option value="Break" ${this.eventData.type === 'Break' ? 'selected' : ''}>Break</option>
                                    <option value="Travel" ${this.eventData.type === 'Travel' ? 'selected' : ''}>Travel</option>
                                    <option value="Review" ${this.eventData.type === 'Review' ? 'selected' : ''}>Review</option>
                                </select>
                            </div>

                            <div class="form-group">
                                <label for="event-priority">Priority</label>
                                <select id="event-priority" name="priority">
                                    <option value="Low" ${this.eventData.priority === 'Low' ? 'selected' : ''}>Low</option>
                                    <option value="Medium" ${this.eventData.priority === 'Medium' ? 'selected' : ''}>Medium</option>
                                    <option value="High" ${this.eventData.priority === 'High' ? 'selected' : ''}>High</option>
                                </select>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="event-category">Category</label>
                                <select id="event-category" name="category">
                                    <option value="Work" ${this.eventData.category === 'Work' ? 'selected' : ''}>Work</option>
                                    <option value="Personal" ${this.eventData.category === 'Personal' ? 'selected' : ''}>Personal</option>
                                    <option value="Health" ${this.eventData.category === 'Health' ? 'selected' : ''}>Health</option>
                                    <option value="Learning" ${this.eventData.category === 'Learning' ? 'selected' : ''}>Learning</option>
                                    <option value="Social" ${this.eventData.category === 'Social' ? 'selected' : ''}>Social</option>
                                    <option value="Travel" ${this.eventData.category === 'Travel' ? 'selected' : ''}>Travel</option>
                                </select>
                            </div>

                            <div class="form-group">
                                <label for="event-status">Status</label>
                                <select id="event-status" name="status">
                                    <option value="Scheduled" ${this.eventData.status === 'Scheduled' ? 'selected' : ''}>Scheduled</option>
                                    <option value="Confirmed" ${this.eventData.status === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
                                    <option value="In Progress" ${this.eventData.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                                    <option value="Completed" ${this.eventData.status === 'Completed' ? 'selected' : ''}>Completed</option>
                                    <option value="Cancelled" ${this.eventData.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                                    <option value="Postponed" ${this.eventData.status === 'Postponed' ? 'selected' : ''}>Postponed</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- Date and Time -->
                    <div class="form-section">
                        <h4>Date & Time</h4>
                        
                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="all-day" name="allDay" 
                                       ${this.eventData.allDay ? 'checked' : ''}>
                                All Day Event
                            </label>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="start-date">Start Date *</label>
                                <input type="date" id="start-date" name="startDate" required
                                       value="${this.formatDateForInput(this.eventData.startTime || new Date())}">
                            </div>

                            <div class="form-group time-field" ${this.eventData.allDay ? 'style="display: none;"' : ''}>
                                <label for="start-time">Start Time</label>
                                <input type="time" id="start-time" name="startTime"
                                       value="${this.formatTimeForInput(this.eventData.startTime || new Date())}">
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="end-date">End Date</label>
                                <input type="date" id="end-date" name="endDate"
                                       value="${this.formatDateForInput(this.eventData.endTime || this.eventData.startTime || new Date())}">
                            </div>

                            <div class="form-group time-field" ${this.eventData.allDay ? 'style="display: none;"' : ''}>
                                <label for="end-time">End Time</label>
                                <input type="time" id="end-time" name="endTime"
                                       value="${this.formatTimeForInput(this.eventData.endTime || this.addMinutesToDate(this.eventData.startTime || new Date(), this.eventData.duration || 60))}">
                            </div>
                        </div>

                        <div class="form-group time-field" ${this.eventData.allDay ? 'style="display: none;"' : ''}>
                            <label for="duration">Duration (minutes)</label>
                            <input type="number" id="duration" name="duration" min="5" step="5"
                                   value="${this.eventData.duration || 60}"
                                   placeholder="60">
                        </div>
                    </div>

                    <!-- Location and Meeting -->
                    <div class="form-section">
                        <h4>Location & Meeting Details</h4>
                        
                        <div class="form-group">
                            <label for="location">Location</label>
                            <input type="text" id="location" name="location"
                                   value="${this.eventData.location || ''}"
                                   placeholder="Meeting room, address, or 'Online'">
                        </div>

                        <div class="form-group">
                            <label for="meeting-url">Meeting URL</label>
                            <input type="url" id="meeting-url" name="meetingUrl"
                                   value="${this.eventData.meetingUrl || ''}"
                                   placeholder="https://zoom.us/j/... or other meeting link">
                        </div>
                    </div>

                    <!-- Attendees and Reminders -->
                    <div class="form-section">
                        <h4>Attendees & Reminders</h4>
                        
                        <div class="form-group">
                            <label for="attendees">Attendees</label>
                            <div class="multi-select-container" id="attendees-container">
                                <!-- Multi-select for attendees will be inserted here -->
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="reminders">Reminders</label>
                            <div class="multi-select-container" id="reminders-container">
                                <!-- Multi-select for reminders will be inserted here -->
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="recurring">Recurring</label>
                            <select id="recurring" name="recurring">
                                <option value="None" ${this.eventData.recurring === 'None' ? 'selected' : ''}>None</option>
                                <option value="Daily" ${this.eventData.recurring === 'Daily' ? 'selected' : ''}>Daily</option>
                                <option value="Weekly" ${this.eventData.recurring === 'Weekly' ? 'selected' : ''}>Weekly</option>
                                <option value="Monthly" ${this.eventData.recurring === 'Monthly' ? 'selected' : ''}>Monthly</option>
                                <option value="Yearly" ${this.eventData.recurring === 'Yearly' ? 'selected' : ''}>Yearly</option>
                            </select>
                        </div>
                    </div>

                    <!-- Description and Notes -->
                    <div class="form-section">
                        <h4>Additional Information</h4>
                        
                        <div class="form-group">
                            <label for="description">Description</label>
                            <textarea id="description" name="description" rows="3"
                                      placeholder="Event description">${this.eventData.description || ''}</textarea>
                        </div>

                        <div class="form-group">
                            <label for="notes">Notes</label>
                            <textarea id="notes" name="notes" rows="3"
                                      placeholder="Additional notes">${this.eventData.notes || ''}</textarea>
                        </div>
                    </div>

                    <!-- Form Actions -->
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" data-action="cancel">Cancel</button>
                        ${this.editMode ? 
                            '<button type="button" class="btn btn-danger" data-action="delete">Delete Event</button>' : ''
                        }
                        <button type="submit" class="btn btn-primary">
                            ${this.editMode ? 'Update Event' : 'Create Event'}
                        </button>
                    </div>
                </form>
            </div>
        `;

        this.container.innerHTML = formHtml;
        this.setupEventListeners();
        this.setupMultiSelects();
    }

    // Setup event listeners
    setupEventListeners() {
        const form = this.container.querySelector('.event-form');
        const allDayCheckbox = this.container.querySelector('#all-day');
        const timeFields = this.container.querySelectorAll('.time-field');

        // Form submission
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSubmit();
        });

        // All day toggle
        allDayCheckbox.addEventListener('change', (e) => {
            timeFields.forEach(field => {
                field.style.display = e.target.checked ? 'none' : 'block';
            });
        });

        // Action buttons
        this.container.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            
            switch (action) {
                case 'close':
                case 'cancel':
                    this.handleCancel();
                    break;
                case 'delete':
                    this.handleDelete();
                    break;
            }
        });

        // Duration calculation
        const startTimeInput = this.container.querySelector('#start-time');
        const endTimeInput = this.container.querySelector('#end-time');
        const durationInput = this.container.querySelector('#duration');

        const updateDuration = () => {
            if (startTimeInput.value && endTimeInput.value) {
                const start = new Date(`2000-01-01T${startTimeInput.value}`);
                const end = new Date(`2000-01-01T${endTimeInput.value}`);
                const diffMinutes = (end - start) / (1000 * 60);
                
                if (diffMinutes > 0) {
                    durationInput.value = diffMinutes;
                }
            }
        };

        startTimeInput.addEventListener('change', updateDuration);
        endTimeInput.addEventListener('change', updateDuration);

        // Update end time when duration changes
        durationInput.addEventListener('change', () => {
            if (startTimeInput.value && durationInput.value) {
                const start = new Date(`2000-01-01T${startTimeInput.value}`);
                const end = new Date(start.getTime() + parseInt(durationInput.value) * 60000);
                endTimeInput.value = end.toTimeString().slice(0, 5);
            }
        });
    }

    // Setup multi-select components
    setupMultiSelects() {
        // Attendees multi-select
        const attendeesOptions = [
            { value: 'Team Lead', label: 'Team Lead' },
            { value: 'Project Manager', label: 'Project Manager' },
            { value: 'Developer', label: 'Developer' },
            { value: 'Designer', label: 'Designer' },
            { value: 'Client', label: 'Client' },
            { value: 'Stakeholder', label: 'Stakeholder' }
        ];

        const attendeesContainer = this.container.querySelector('#attendees-container');
        const attendeesMultiSelect = UIComponents.createMultiSelect(
            attendeesOptions,
            this.eventData.attendees || [],
            'Select attendees...'
        );
        attendeesContainer.appendChild(attendeesMultiSelect);

        // Reminders multi-select
        const remindersOptions = [
            { value: '5 minutes', label: '5 minutes before' },
            { value: '15 minutes', label: '15 minutes before' },
            { value: '30 minutes', label: '30 minutes before' },
            { value: '1 hour', label: '1 hour before' },
            { value: '1 day', label: '1 day before' },
            { value: '1 week', label: '1 week before' }
        ];

        const remindersContainer = this.container.querySelector('#reminders-container');
        const remindersMultiSelect = UIComponents.createMultiSelect(
            remindersOptions,
            this.eventData.reminders || [],
            'Select reminders...'
        );
        remindersContainer.appendChild(remindersMultiSelect);
    }

    // Handle form submission
    async handleSubmit() {
        try {
            const formData = this.getFormData();
            
            if (this.editMode) {
                await this.calendarService.updateCalendarEvent(this.editEventId, formData);
                UIComponents.showToast('Event updated successfully!', 'success');
            } else {
                await this.calendarService.createCalendarEvent(formData);
                UIComponents.showToast('Event created successfully!', 'success');
            }

            // Trigger refresh event
            this.container.dispatchEvent(new CustomEvent('eventSaved', {
                detail: { eventData: formData, editMode: this.editMode }
            }));

            this.handleCancel();
        } catch (error) {
            console.error('Failed to save event:', error);
            UIComponents.showToast(`Failed to save event: ${error.message}`, 'error');
        }
    }

    // Handle form cancellation
    handleCancel() {
        this.container.dispatchEvent(new CustomEvent('formCancelled'));
    }

    // Handle event deletion
    async handleDelete() {
        const confirmed = await UIComponents.showConfirmation(
            'Are you sure you want to delete this event? This action cannot be undone.',
            'Delete Event'
        );

        if (confirmed) {
            try {
                await this.calendarService.deleteCalendarEvent(this.editEventId);
                UIComponents.showToast('Event deleted successfully!', 'success');
                
                this.container.dispatchEvent(new CustomEvent('eventDeleted', {
                    detail: { eventId: this.editEventId }
                }));

                this.handleCancel();
            } catch (error) {
                console.error('Failed to delete event:', error);
                UIComponents.showToast(`Failed to delete event: ${error.message}`, 'error');
            }
        }
    }

    // Extract form data
    getFormData() {
        const form = this.container.querySelector('.event-form');
        const formData = new FormData(form);
        
        const data = {};
        
        // Basic fields
        data.title = formData.get('title');
        data.type = formData.get('type');
        data.priority = formData.get('priority');
        data.category = formData.get('category');
        data.status = formData.get('status');
        data.allDay = formData.has('allDay');
        data.location = formData.get('location');
        data.meetingUrl = formData.get('meetingUrl');
        data.recurring = formData.get('recurring');
        data.description = formData.get('description');
        data.notes = formData.get('notes');
        data.duration = parseInt(formData.get('duration')) || 60;

        // Date and time processing
        const startDate = formData.get('startDate');
        const startTime = formData.get('startTime');
        const endDate = formData.get('endDate');
        const endTime = formData.get('endTime');

        if (data.allDay) {
            data.startTime = new Date(`${startDate}T00:00:00`);
            data.endTime = endDate ? new Date(`${endDate}T23:59:59`) : data.startTime;
        } else {
            data.startTime = new Date(`${startDate}T${startTime || '09:00'}`);
            if (endDate && endTime) {
                data.endTime = new Date(`${endDate}T${endTime}`);
            } else {
                data.endTime = new Date(data.startTime.getTime() + data.duration * 60000);
            }
        }

        // Multi-select fields
        const attendeesSelect = this.container.querySelector('#attendees-container .multi-select-container');
        const remindersSelect = this.container.querySelector('#reminders-container .multi-select-container');
        
        if (attendeesSelect) {
            data.attendees = attendeesSelect.getValues ? attendeesSelect.getValues() : [];
        }
        
        if (remindersSelect) {
            data.reminders = remindersSelect.getValues ? remindersSelect.getValues() : [];
        }

        return data;
    }

    // Utility methods
    formatDateForInput(date) {
        if (!date) return '';
        const d = new Date(date);
        return d.toISOString().split('T')[0];
    }

    formatTimeForInput(date) {
        if (!date) return '';
        const d = new Date(date);
        return d.toTimeString().slice(0, 5);
    }

    addMinutesToDate(date, minutes) {
        if (!date) return new Date();
        return new Date(new Date(date).getTime() + minutes * 60000);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CalendarEventForm;
}
