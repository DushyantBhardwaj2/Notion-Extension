// UI Component Library for Enhanced Extension
class UIComponents {
    // Create loading spinner
    static createLoadingSpinner(size = 'medium') {
        const spinner = document.createElement('div');
        spinner.className = `loading-spinner loading-spinner-${size}`;
        spinner.innerHTML = `
            <div class="spinner-circle"></div>
            <div class="spinner-text">Loading...</div>
        `;
        return spinner;
    }

    // Create toast notification
    static showToast(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <div class="toast-icon">${this.getToastIcon(type)}</div>
                <div class="toast-message">${message}</div>
                <button class="toast-close">&times;</button>
            </div>
        `;

        document.body.appendChild(toast);

        // Auto-remove after duration
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, duration);

        // Manual close button
        toast.querySelector('.toast-close').onclick = () => {
            toast.remove();
        };

        return toast;
    }

    static getToastIcon(type) {
        const icons = {
            success: '✓',
            error: '✗',
            warning: '⚠',
            info: 'ℹ'
        };
        return icons[type] || icons.info;
    }

    // Create modal dialog
    static createModal(title, content, buttons = []) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        
        const buttonsHtml = buttons.map(btn => 
            `<button class="modal-btn modal-btn-${btn.type || 'default'}" data-action="${btn.action}">${btn.text}</button>`
        ).join('');

        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-header">
                    <h3 class="modal-title">${title}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
                <div class="modal-footer">
                    ${buttonsHtml}
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Event handlers
        modal.querySelector('.modal-close').onclick = () => modal.remove();
        modal.onclick = (e) => {
            if (e.target === modal) modal.remove();
        };

        buttons.forEach(btn => {
            if (btn.handler) {
                modal.querySelector(`[data-action="${btn.action}"]`).onclick = btn.handler;
            }
        });

        return modal;
    }

    // Create dropdown menu
    static createDropdown(options, selectedValue = null, placeholder = 'Select option...') {
        const dropdown = document.createElement('div');
        dropdown.className = 'custom-dropdown';
        
        const optionsHtml = options.map(opt => 
            `<div class="dropdown-option" data-value="${opt.value}" ${opt.value === selectedValue ? 'data-selected="true"' : ''}>
                ${opt.label}
            </div>`
        ).join('');

        dropdown.innerHTML = `
            <div class="dropdown-selected" tabindex="0">
                <span class="dropdown-text">${selectedValue ? options.find(o => o.value === selectedValue)?.label : placeholder}</span>
                <span class="dropdown-arrow">▼</span>
            </div>
            <div class="dropdown-options">
                ${optionsHtml}
            </div>
        `;

        let isOpen = false;
        const selected = dropdown.querySelector('.dropdown-selected');
        const optionsContainer = dropdown.querySelector('.dropdown-options');

        selected.onclick = () => {
            isOpen = !isOpen;
            dropdown.classList.toggle('dropdown-open', isOpen);
        };

        dropdown.querySelectorAll('.dropdown-option').forEach(option => {
            option.onclick = () => {
                const value = option.dataset.value;
                const label = option.textContent;
                
                // Update selected display
                dropdown.querySelector('.dropdown-text').textContent = label;
                
                // Update selected option
                dropdown.querySelectorAll('.dropdown-option').forEach(o => o.removeAttribute('data-selected'));
                option.setAttribute('data-selected', 'true');
                
                // Close dropdown
                isOpen = false;
                dropdown.classList.remove('dropdown-open');
                
                // Trigger change event
                dropdown.dispatchEvent(new CustomEvent('change', { detail: { value, label } }));
            };
        });

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target)) {
                isOpen = false;
                dropdown.classList.remove('dropdown-open');
            }
        });

        return dropdown;
    }

    // Create progress bar
    static createProgressBar(progress = 0, showPercentage = true) {
        const progressBar = document.createElement('div');
        progressBar.className = 'progress-bar-container';
        
        progressBar.innerHTML = `
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${progress}%"></div>
            </div>
            ${showPercentage ? `<span class="progress-text">${progress}%</span>` : ''}
        `;

        progressBar.updateProgress = (newProgress) => {
            const fill = progressBar.querySelector('.progress-fill');
            const text = progressBar.querySelector('.progress-text');
            
            fill.style.width = `${newProgress}%`;
            if (text) text.textContent = `${newProgress}%`;
        };

        return progressBar;
    }

    // Create date picker
    static createDatePicker(initialDate = null, placeholder = 'Select date...') {
        const datePicker = document.createElement('div');
        datePicker.className = 'custom-date-picker';
        
        const today = new Date();
        const displayValue = initialDate ? this.formatDate(initialDate) : placeholder;
        
        datePicker.innerHTML = `
            <input type="text" class="date-input" value="${displayValue}" readonly placeholder="${placeholder}">
            <div class="date-picker-calendar" style="display: none;">
                <div class="calendar-header">
                    <button class="calendar-nav" data-nav="prev">‹</button>
                    <span class="calendar-month-year"></span>
                    <button class="calendar-nav" data-nav="next">›</button>
                </div>
                <div class="calendar-grid">
                    <div class="calendar-days-header">
                        <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
                    </div>
                    <div class="calendar-days"></div>
                </div>
                <div class="calendar-footer">
                    <button class="calendar-today">Today</button>
                    <button class="calendar-clear">Clear</button>
                </div>
            </div>
        `;

        let currentDate = initialDate || today;
        let viewDate = new Date(currentDate);
        let selectedDate = initialDate;

        const input = datePicker.querySelector('.date-input');
        const calendar = datePicker.querySelector('.date-picker-calendar');
        const monthYear = datePicker.querySelector('.calendar-month-year');
        const daysContainer = datePicker.querySelector('.calendar-days');

        // Show/hide calendar
        input.onclick = () => {
            calendar.style.display = calendar.style.display === 'none' ? 'block' : 'none';
            if (calendar.style.display === 'block') {
                this.renderCalendarMonth(daysContainer, monthYear, viewDate, selectedDate);
            }
        };

        // Navigation
        datePicker.querySelectorAll('.calendar-nav').forEach(nav => {
            nav.onclick = () => {
                const direction = nav.dataset.nav;
                if (direction === 'prev') {
                    viewDate.setMonth(viewDate.getMonth() - 1);
                } else {
                    viewDate.setMonth(viewDate.getMonth() + 1);
                }
                this.renderCalendarMonth(daysContainer, monthYear, viewDate, selectedDate);
            };
        });

        // Today button
        datePicker.querySelector('.calendar-today').onclick = () => {
            selectedDate = new Date();
            input.value = this.formatDate(selectedDate);
            calendar.style.display = 'none';
            datePicker.dispatchEvent(new CustomEvent('datechange', { detail: { date: selectedDate } }));
        };

        // Clear button
        datePicker.querySelector('.calendar-clear').onclick = () => {
            selectedDate = null;
            input.value = placeholder;
            calendar.style.display = 'none';
            datePicker.dispatchEvent(new CustomEvent('datechange', { detail: { date: null } }));
        };

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!datePicker.contains(e.target)) {
                calendar.style.display = 'none';
            }
        });

        datePicker.getValue = () => selectedDate;
        datePicker.setValue = (date) => {
            selectedDate = date;
            input.value = date ? this.formatDate(date) : placeholder;
        };

        return datePicker;
    }

    static renderCalendarMonth(daysContainer, monthYear, viewDate, selectedDate) {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        
        monthYear.textContent = `${viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
        
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());
        
        daysContainer.innerHTML = '';
        
        for (let i = 0; i < 42; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            dayElement.textContent = date.getDate();
            
            if (date.getMonth() !== month) {
                dayElement.classList.add('calendar-day-other-month');
            }
            
            if (selectedDate && this.isSameDay(date, selectedDate)) {
                dayElement.classList.add('calendar-day-selected');
            }
            
            if (this.isSameDay(date, new Date())) {
                dayElement.classList.add('calendar-day-today');
            }
            
            dayElement.onclick = () => {
                selectedDate = new Date(date);
                const input = daysContainer.closest('.custom-date-picker').querySelector('.date-input');
                const calendar = daysContainer.closest('.date-picker-calendar');
                const datePicker = daysContainer.closest('.custom-date-picker');
                
                input.value = this.formatDate(selectedDate);
                calendar.style.display = 'none';
                datePicker.dispatchEvent(new CustomEvent('datechange', { detail: { date: selectedDate } }));
            };
            
            daysContainer.appendChild(dayElement);
        }
    }

    static formatDate(date) {
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    static isSameDay(date1, date2) {
        return date1.toDateString() === date2.toDateString();
    }

    // Create multi-select component
    static createMultiSelect(options, selectedValues = [], placeholder = 'Select options...') {
        const multiSelect = document.createElement('div');
        multiSelect.className = 'multi-select-container';
        
        const selectedTags = selectedValues.map(value => {
            const option = options.find(o => o.value === value);
            return option ? `<span class="selected-tag" data-value="${value}">${option.label} <span class="tag-remove">×</span></span>` : '';
        }).join('');
        
        const optionsHtml = options.map(opt => 
            `<div class="multi-option" data-value="${opt.value}" ${selectedValues.includes(opt.value) ? 'data-selected="true"' : ''}>
                <input type="checkbox" ${selectedValues.includes(opt.value) ? 'checked' : ''}>
                <span>${opt.label}</span>
            </div>`
        ).join('');

        multiSelect.innerHTML = `
            <div class="multi-select-input" tabindex="0">
                <div class="selected-tags">${selectedTags}</div>
                <input type="text" class="multi-input" placeholder="${placeholder}" readonly>
                <span class="multi-arrow">▼</span>
            </div>
            <div class="multi-options">
                ${optionsHtml}
            </div>
        `;

        let isOpen = false;
        let selected = [...selectedValues];
        
        const inputContainer = multiSelect.querySelector('.multi-select-input');
        const optionsContainer = multiSelect.querySelector('.multi-options');
        const tagsContainer = multiSelect.querySelector('.selected-tags');

        inputContainer.onclick = () => {
            isOpen = !isOpen;
            multiSelect.classList.toggle('multi-open', isOpen);
        };

        // Handle option selection
        multiSelect.querySelectorAll('.multi-option').forEach(option => {
            option.onclick = (e) => {
                e.stopPropagation();
                const value = option.dataset.value;
                const checkbox = option.querySelector('input');
                
                if (selected.includes(value)) {
                    selected = selected.filter(v => v !== value);
                    checkbox.checked = false;
                    option.removeAttribute('data-selected');
                } else {
                    selected.push(value);
                    checkbox.checked = true;
                    option.setAttribute('data-selected', 'true');
                }
                
                this.updateMultiSelectTags(multiSelect, options, selected);
                multiSelect.dispatchEvent(new CustomEvent('change', { detail: { values: selected } }));
            };
        });

        // Handle tag removal
        multiSelect.addEventListener('click', (e) => {
            if (e.target.classList.contains('tag-remove')) {
                const value = e.target.closest('.selected-tag').dataset.value;
                selected = selected.filter(v => v !== value);
                
                const option = multiSelect.querySelector(`[data-value="${value}"]`);
                option.querySelector('input').checked = false;
                option.removeAttribute('data-selected');
                
                this.updateMultiSelectTags(multiSelect, options, selected);
                multiSelect.dispatchEvent(new CustomEvent('change', { detail: { values: selected } }));
            }
        });

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!multiSelect.contains(e.target)) {
                isOpen = false;
                multiSelect.classList.remove('multi-open');
            }
        });

        multiSelect.getValues = () => selected;
        multiSelect.setValues = (values) => {
            selected = [...values];
            this.updateMultiSelectTags(multiSelect, options, selected);
            
            multiSelect.querySelectorAll('.multi-option').forEach(option => {
                const value = option.dataset.value;
                const checkbox = option.querySelector('input');
                
                if (selected.includes(value)) {
                    checkbox.checked = true;
                    option.setAttribute('data-selected', 'true');
                } else {
                    checkbox.checked = false;
                    option.removeAttribute('data-selected');
                }
            });
        };

        return multiSelect;
    }

    static updateMultiSelectTags(multiSelect, options, selected) {
        const tagsContainer = multiSelect.querySelector('.selected-tags');
        const selectedTags = selected.map(value => {
            const option = options.find(o => o.value === value);
            return option ? `<span class="selected-tag" data-value="${value}">${option.label} <span class="tag-remove">×</span></span>` : '';
        }).join('');
        
        tagsContainer.innerHTML = selectedTags;
    }

    // Create confirmation dialog
    static showConfirmation(message, title = 'Confirm Action') {
        return new Promise((resolve) => {
            const modal = this.createModal(title, `<p>${message}</p>`, [
                {
                    text: 'Cancel',
                    type: 'secondary',
                    action: 'cancel',
                    handler: () => {
                        modal.remove();
                        resolve(false);
                    }
                },
                {
                    text: 'Confirm',
                    type: 'primary',
                    action: 'confirm',
                    handler: () => {
                        modal.remove();
                        resolve(true);
                    }
                }
            ]);
        });
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIComponents;
}
