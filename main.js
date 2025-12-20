const App = {
    init: function() {
        this.setupTheme();
        if (document.querySelector('#records-table')) {
            this.renderDashboard();
            this.setupDashboardListeners();
        }
        if (document.querySelector('#save-btn')) {
            this.setupFormPage();
        }
    },

    setupTheme: function() {
        const themeToggle = document.getElementById('checkbox');
        if (themeToggle) {
            const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            const savedTheme = localStorage.getItem('darkMode');
            const shouldBeDark = savedTheme !== null ? savedTheme === 'true' : prefersDark;

            themeToggle.checked = shouldBeDark;
            document.body.classList.toggle('dark-mode', shouldBeDark);

            themeToggle.addEventListener('change', () => {
                document.body.classList.toggle('dark-mode', themeToggle.checked);
                localStorage.setItem('darkMode', themeToggle.checked);
            });
        }
    },
    
    // MSE Record Page Logic
    setupFormPage: function() {
        document.getElementById('save-btn').addEventListener('click', () => this.saveRecord());
        document.getElementById('clear-btn').addEventListener('click', () => this.clearForm());
        document.querySelector('.toggle-visibility').addEventListener('click', (event) => this.toggleNameVisibility(event)); // Pass event
        document.getElementById('add-custom-field-btn').addEventListener('click', () => this.addCustomField());
        
        const urlParams = new URLSearchParams(window.location.search);
        const recordId = urlParams.get('id');

        if (recordId) {
            document.querySelector('h1').textContent = `Edit MSE Record: ${recordId}`;
            this.loadRecordForEditing(recordId);
        } else {
            document.getElementById('date').value = new Date().toISOString().slice(0, 16); // Set current date/time for new records
        }
        
        const downloadBtn = document.querySelector('.download-btn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', function() {
                this.nextElementSibling.classList.toggle('show-download');
            });
        }
    },

    addCustomField: function(name = '', value = '') {
        const fieldName = name || prompt("Enter the name for the new custom field:");
        if (!fieldName) return;

        const fieldId = `custom-${fieldName.trim().toLowerCase().replace(/\s+/g, '-')}`;
        
        const container = document.getElementById('custom-fields-container');
        
        const formGroup = document.createElement('div');
        formGroup.className = 'form-group';

        const label = document.createElement('label');
        label.setAttribute('for', fieldId);
        label.textContent = fieldName;

        const input = document.createElement('input');
        input.type = 'text';
        input.id = fieldId;
        input.name = fieldId;
        input.value = value;

        formGroup.appendChild(label);
        formGroup.appendChild(input);
        container.appendChild(formGroup);
    },

    toggleNameVisibility: function(event) { // Receive event
        const input = document.getElementById('patient-name');
        input.type = input.type === 'text' ? 'password' : 'text';
        event.target.textContent = input.type === 'text' ? '🙈' : '👁️'; // Use event.target
    },
    
    generateMseId: function(name, age, sex) { // Renamed from generatePatientId
        if (!name || !age || !sex) return null;
        const nameParts = name.trim().split(/\s+/);
        let id = nameParts.length > 1 ? (nameParts[0][0] || '') + (nameParts[nameParts.length - 1][0] || '') : (name[0] || '') + (name[1] || '');
        return (id.toUpperCase() + age + (sex[0] || '')).toUpperCase();
    },

    saveRecord: function() {
        const name = document.getElementById('patient-name').value;
        const age = document.getElementById('age').value;
        const sex = document.getElementById('sex').value;
        
        let mseId = this.generateMseId(name, age, sex); // Using new function name
        const urlParams = new URLSearchParams(window.location.search);
        const existingRecordId = urlParams.get('id');

        if (!mseId) {
            alert('Patient Name, Age, and Sex are required to generate an MSE ID.');
            return;
        }
        
        if (existingRecordId) mseId = existingRecordId;

        const record = { mseId: mseId, data: { customFields: [] } }; // Changed id to mseId
        
        document.querySelectorAll('input, select, textarea').forEach(el => {
            if (el.id) {
                if (el.id.startsWith('custom-')) {
                    record.data.customFields.push({
                        id: el.id,
                        label: document.querySelector(`label[for=${el.id}]`).textContent,
                        value: el.value
                    });
                } else {
                    record.data[el.id] = el.type === 'checkbox' ? el.checked : el.value;
                }
            }
        });
        
        record.data['observation-datetime'] = record.data['observation-datetime'] || new Date().toISOString();

        let records = this.getMseRecords(); // Using new function name
        const existingIndex = records.findIndex(r => r.mseId === record.mseId);

        if (existingIndex > -1) records[existingIndex] = record;
        else records.push(record);

        localStorage.setItem('mseRecords', JSON.stringify(records));
        
        alert(`MSE Record ${record.mseId} saved successfully!\n\nThis record is saved locally in your browser. For permanent storage, it is strongly advised to download it as a PDF or DOCX file to your device, as clearing browser data will result in data loss.`);

        window.location.href = 'dashboard.html';
    },

    loadRecordForEditing: function(mseId) { // Changed id to mseId
        const record = this.getMseRecords().find(r => r.mseId === mseId);
        if (record) {
            Object.keys(record.data).forEach(key => {
                if (key === 'customFields') {
                    record.data.customFields.forEach(field => {
                        this.addCustomField(field.label, field.value);
                    });
                } else {
                    const el = document.getElementById(key);
                    if (el) {
                        if (el.type === 'checkbox') el.checked = record.data[key];
                        else el.value = record.data[key];
                    }
                }
            });
        }
    },

    getMseRecords: function() { // Renamed from getRecords
        return JSON.parse(localStorage.getItem('mseRecords') || '[]');
    },
    
    clearForm: () => document.querySelector('form').reset(),

    // MSE Dashboard Logic
    setupDashboardListeners: function() {
        const modal = document.getElementById('view-modal');
        const closeBtn = document.querySelector('.close-btn');
        closeBtn.onclick = () => modal.style.display = "none";
        window.onclick = (event) => {
            if (event.target == modal) {
                modal.style.display = "none";
            }
        };

        document.getElementById('records-table').addEventListener('click', function(e) {
            if (e.target.classList.contains('download-btn')) {
                e.target.nextElementSibling.classList.toggle('show-download');
            } else if (!e.target.closest('.download-btn-group')) {
                document.querySelectorAll('.download-options').forEach(o => o.classList.remove('show-download'));
            }
        });
    },

    renderDashboard: function() {
        const tableBody = document.querySelector('#records-table tbody');
        tableBody.innerHTML = '';
        this.getMseRecords().forEach(record => {
            const date = record.data['observation-datetime'] ? new Date(record.data['observation-datetime']).toLocaleString() : 'N/A';
            const row = document.createElement('tr');
            row.innerHTML = `
                <td data-label="MSE Record ID">${record.mseId}</td>
                <td data-label="Date of Observation">${date}</td>
                <td class="actions-cell" data-label="Actions">
                    <button class="view-btn" onclick="App.viewRecord('${record.mseId}')">View</button>
                    <button class="edit-btn" onclick="App.editRecord('${record.mseId}')">Edit</button>
                    <div class="download-btn-group">
                        <button class="download-btn">Download</button>
                        <div class="download-options">
                            <a href="#" onclick="App.generatePdf('${record.mseId}'); return false;">PDF</a>
                            <a href="#" onclick="App.generateDocx('${record.mseId}'); return false;">DOCX</a>
                        </div>
                    </div>
                    <button class="delete-btn" onclick="App.deleteRecord('${record.mseId}')">Delete</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    },

    viewRecord: function(mseId) { 
        const record = this.getMseRecords().find(r => r.mseId === mseId);
        if (!record) return;

        const modal = document.getElementById('view-modal');
        document.getElementById('modal-patient-id').textContent = `MSE Record: ${mseId}`;
        const bodyContent = document.getElementById('modal-body-content');
        
        let content = '';
        FormStructure.structure.forEach(section => {
            let hasContent = false;
            let sectionContent = `<table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">`;
            section.fields.forEach(fieldId => {
                if (record.data[fieldId]) {
                    hasContent = true;
                    let label = FormStructure.getLabel(fieldId);
                    let value = record.data[fieldId];
                    if (fieldId === 'patient-name') {
                        value = '********';
                    }
                    sectionContent += `<tr><td style="padding: 8px; border: 1px solid #ddd; width: 30%; font-weight: bold;">${label}</td><td style="padding: 8px; border: 1px solid #ddd;">${value.replace(/\n/g, '<br/>')}</td></tr>`;
                }
            });
            sectionContent += `</table>`;

            if(hasContent){
                content += `<h3 style="text-align: left; margin-top: 20px; font-family: 'Inter', sans-serif; border-bottom: 1px solid #ccc; padding-bottom: 5px;">${section.title}</h3>${sectionContent}`;
            }
        });

        if (record.data.customFields && record.data.customFields.length > 0) {
            let customFieldsContent = `<h3 style="text-align: left; margin-top: 20px; font-family: 'Inter', sans-serif; border-bottom: 1px solid #ccc; padding-bottom: 5px;">Custom Fields</h3>`;
            customFieldsContent += `<table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">`;
            record.data.customFields.forEach(field => {
                customFieldsContent += `<tr><td style="padding: 8px; border: 1px solid #ddd; width: 30%; font-weight: bold;">${field.label}</td><td style="padding: 8px; border: 1px solid #ddd;">${field.value.replace(/\n/g, '<br/>')}</td></tr>`;
            });
            customFieldsContent += `</table>`;
            content += customFieldsContent;
        }

        bodyContent.innerHTML = content;
        modal.style.display = "block";
    },

    editRecord: mseId => window.location.href = `index.html?id=${mseId}`,

    deleteRecord: function(mseId) {
        if (confirm(`Are you sure you want to delete the record ${mseId}?`)) {
            let records = this.getMseRecords().filter(r => r.mseId !== mseId);
            localStorage.setItem('mseRecords', JSON.stringify(records));
            if (document.querySelector('#records-table')) {
                this.renderDashboard();
            }
        }
    },
    
    // Report Generation (Existing, with minor updates to use new IDs)
    generatePdfFromForm: function() {
        const record = { data: { customFields: [] } };
        document.querySelectorAll('input, select, textarea').forEach(el => {
            if (el.id) {
                if (el.id.startsWith('custom-')) {
                    record.data.customFields.push({
                        id: el.id,
                        label: document.querySelector(`label[for=${el.id}]`).textContent,
                        value: el.value
                    });
                } else if (el.id !== 'patient-name') {
                    record.data[el.id] = el.type === 'checkbox' ? el.checked : el.value;
                }
            }
        });
        const name = document.getElementById('patient-name').value;
        const age = document.getElementById('age').value;
        const sex = document.getElementById('sex').value;
        record.mseId = this.generateMseId(name, age, sex);
        this.generatePdf(record);
    },

    generateDocxFromForm: function() {
        const record = { data: { customFields: [] } };
        document.querySelectorAll('input, select, textarea').forEach(el => {
            if (el.id) {
                if (el.id.startsWith('custom-')) {
                    record.data.customFields.push({
                        id: el.id,
                        label: document.querySelector(`label[for=${el.id}]`).textContent,
                        value: el.value
                    });
                } else if (el.id !== 'patient-name') {
                    record.data[el.id] = el.type === 'checkbox' ? el.checked : el.value;
                }
            }
        });
        const name = document.getElementById('patient-name').value;
        const age = document.getElementById('age').value;
        const sex = document.getElementById('sex').value;
        record.mseId = this.generateMseId(name, age, sex);
        this.generateDocx(record);
    },

    generatePdf: function(recordOrMseId) { // Updated to use mseId
        let record;
        if (typeof recordOrMseId === 'string') {
            record = this.getMseRecords().find(r => r.mseId === recordOrMseId);
        } else {
            record = recordOrMseId;
        }

        if (!record) { alert('MSE Record not found.'); return; }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // --- Data Extraction and Table Generation ---
        const generateTableBody = () => {
            let body = [];
            FormStructure.structure.forEach(section => {
                let hasContent = false;
                let sectionBody = [];
                section.fields.forEach(fieldId => {
                    if (record.data[fieldId]) { // Only add if data exists
                        hasContent = true;
                        let label = FormStructure.getLabel(fieldId);
                        let value = record.data[fieldId];
                        if (fieldId === 'patient-name') {
                            value = '********';
                        }
                        sectionBody.push([label, value]);
                    }
                });

                if(hasContent){
                    body.push([{ content: section.title, colSpan: 2, styles: { fontStyle: 'bold', fillColor: '#e9ecef', textColor: '#212529', halign: 'center' } }]);
                    body.push(...sectionBody);
                }
            });

            if (record.data.customFields && record.data.customFields.length > 0) {
                body.push([{ content: 'Custom Fields', colSpan: 2, styles: { fontStyle: 'bold', fillColor: '#e9ecef', textColor: '#212529', halign: 'center' } }]);
                record.data.customFields.forEach(field => {
                    body.push([field.label, field.value]);
                });
            }

            return body;
        };

        doc.autoTable({
            startY: 30,
            body: generateTableBody(),
            theme: 'grid',
            styles: { font: 'times', cellPadding: 2.5, fontSize: 10, overflow: 'linebreak' },
            columnStyles: {
                0: { cellWidth: 50 },
                1: { cellWidth: 'auto' }
            },
            showHead: 'never',
            addPageContent: function(data) {
                if (data.pageNumber === 1) {
                    doc.setFontSize(20);
                    doc.setFont('helvetica', 'bold');
                    doc.text('Mental Status Examination Report', doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
                    doc.setFontSize(14);
                    doc.setFont('helvetica', 'normal');
                    doc.text(`Record ID: ${record.mseId}`, doc.internal.pageSize.getWidth() / 2, 22, { align: 'center' });
                }

                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                var str = "Page " + data.pageNumber + " of " + data.doc.internal.getNumberOfPages();
                doc.text(str, doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
            }
        });

        doc.save(`${record.mseId || 'MSE'}-Report.pdf`);
    },

    generateDocx: function(recordOrMseId) { // Updated to use mseId
        let record;
        if (typeof recordOrMseId === 'string') {
            record = this.getMseRecords().find(r => r.mseId === recordOrMseId);
        } else {
            record = recordOrMseId;
        }

        if (!record) { alert('MSE Record not found.'); return; }
        
        let content = `
            <!DOCTYPE html><html><head><title>MSE Report</title></head>
            <body style="font-family: 'Times New Roman', Times, serif; font-size: 12pt;">
                <h1 style="text-align: center;">${record.mseId || 'Mental Status Examination Report'}</h1>
        `;

        FormStructure.structure.forEach(section => {
            let hasContent = false;
            let sectionContent = `<table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">`;
            section.fields.forEach(fieldId => {
                if (record.data[fieldId]) {
                    hasContent = true;
                    let label = FormStructure.getLabel(fieldId);
                    let value = record.data[fieldId];
                    if (fieldId === 'patient-name') {
                        value = '********';
                    }
                    sectionContent += `<tr><td style="padding: 8px; border: 1px solid #ddd; width: 30%; font-weight: bold;">${label}</td><td style="padding: 8px; border: 1px solid #ddd;">${value.replace(/\n/g, '<br/>')}</td></tr>`;
                }
            });
            sectionContent += `</table>`;

            if(hasContent){
                content += `<h3 style="text-align: left; margin-top: 20px; font-family: 'Inter', sans-serif; border-bottom: 1px solid #ccc; padding-bottom: 5px;">${section.title}</h3>${sectionContent}`;
            }
        });

        if (record.data.customFields && record.data.customFields.length > 0) {
            content += `<h3 style="text-align: left; margin-top: 20px; font-family: 'Inter', sans-serif; border-bottom: 1px solid #ccc; padding-bottom: 5px;">Custom Fields</h3>`;
            content += `<table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">`;
            record.data.customFields.forEach(field => {
                content += `<tr><td style="padding: 8px; border: 1px solid #ddd; width: 30%; font-weight: bold;">${field.label}</td><td style="padding: 8px; border: 1px solid #ddd;">${field.value.replace(/\n/g, '<br/>')}</td></tr>`;
            });
            content += `</table>`;
        }
        
        content += '<p style="text-align: center; margin-top: 40px;">This report is created using the Digital MSE Record by Agnivesh_Indian.</p></body></html>';

        var converted = htmlDocx.asBlob(content);
        var url = URL.createObjectURL(converted);
        var link = document.createElement('a');
        link.href = url;
        link.download = `${record.mseId || 'MSE'}-Report.docx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

};

document.addEventListener('DOMContentLoaded', () => App.init());