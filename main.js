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
    
    // ... (rest of setup functions are the same)
    setupFormPage: function() {
        document.getElementById('save-btn').addEventListener('click', () => this.saveRecord());
        document.getElementById('clear-btn').addEventListener('click', () => this.clearForm());
        document.querySelector('.toggle-visibility').addEventListener('click', this.toggleNameVisibility);

        const urlParams = new URLSearchParams(window.location.search);
        const recordId = urlParams.get('id');
        if (recordId) {
            document.querySelector('h1').textContent = `Edit Record: ${recordId}`;
            this.loadRecordForEditing(recordId);
        }
    },

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

    toggleNameVisibility: function() {
        const input = document.getElementById('patient-name');
        input.type = input.type === 'text' ? 'password' : 'text';
        this.textContent = input.type === 'text' ? '🙈' : '👁️';
    },
    
    generatePatientId: function(name, age, sex) {
        if (!name || !age || !sex) return null;
        const nameParts = name.trim().split(/\s+/);
        let id = nameParts.length > 1 ? (nameParts[0][0] || '') + (nameParts[nameParts.length - 1][0] || '') : (name[0] || '') + (name[1] || '');
        return (id.toUpperCase() + age + (sex[0] || '')).toUpperCase();
    },

    saveRecord: function() {
        const name = document.getElementById('patient-name').value;
        const age = document.getElementById('age').value;
        const sex = document.getElementById('sex').value;
        
        let patientId = this.generatePatientId(name, age, sex);
        const urlParams = new URLSearchParams(window.location.search);
        const existingRecordId = urlParams.get('id');

        if (!patientId) {
            alert('Patient Name, Age, and Sex are required to generate an ID.');
            return;
        }
        
        if (existingRecordId) patientId = existingRecordId;

        const record = { id: patientId, data: {} };
        
        document.querySelectorAll('input, select, textarea').forEach(el => {
            if (el.id) record.data[el.id] = el.type === 'checkbox' ? el.checked : el.value;
        });
        
        record.data['observation-datetime'] = record.data['observation-datetime'] || new Date().toISOString();

        let records = this.getRecords();
        const existingIndex = records.findIndex(r => r.id === record.id);

        if (existingIndex > -1) records[existingIndex] = record;
        else records.push(record);

        localStorage.setItem('mseRecords', JSON.stringify(records));
        
        // **NEW: Confirmation message**
        alert(`Record ${record.id} saved successfully!\n\nIMPORTANT: This data is saved ONLY in your browser. For permanent storage, please download the record from the dashboard.`);

        window.location.href = 'dashboard.html';
    },
    
    // ... (load, get, render, edit, delete, clear functions are the same)
    loadRecordForEditing: function(id) {
        const record = this.getRecords().find(r => r.id === id);
        if (record) {
            Object.keys(record.data).forEach(key => {
                const el = document.getElementById(key);
                if (el) {
                    if (el.type === 'checkbox') el.checked = record.data[key];
                    else el.value = record.data[key];
                }
            });
        }
    },

    getRecords: function() {
        return JSON.parse(localStorage.getItem('mseRecords') || '[]');
    },

    renderDashboard: function() {
        const tableBody = document.querySelector('#records-table tbody');
        tableBody.innerHTML = ''; 
        this.getRecords().forEach(record => {
            const date = record.data['observation-datetime'] ? new Date(record.data['observation-datetime']).toLocaleString() : 'N/A';
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${record.id}</td>
                <td>${date}</td>
                <td class="actions-cell">
                    <button class="view-btn" onclick="App.viewRecord('${record.id}')">View</button>
                    <button class="edit-btn" onclick="App.editRecord('${record.id}')">Edit</button>
                    <div class="download-btn-group">
                        <button class="download-btn">Download</button>
                        <div class="download-options">
                            <a href="#" onclick="App.generatePdf('${record.id}'); return false;">PDF</a>
                            <a href="#" onclick="App.generateDocx('${record.id}'); return false;">DOCX</a>
                        </div>
                    </div>
                    <button class="delete-btn" onclick="App.deleteRecord('${record.id}')">Delete</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    },

    viewRecord: function(id) {
        const record = this.getRecords().find(r => r.id === id);
        if (!record) return;

        const modal = document.getElementById('view-modal');
        document.getElementById('modal-patient-id').textContent = `Record: ${id}`;
        const bodyContent = document.getElementById('modal-body-content');
        
        let content = '';
        // This is a simple view. The PDF/DOCX will be more structured.
        for (const key in record.data) {
             const labelEl = document.querySelector(`label[for=${key}]`);
             if (labelEl && record.data[key]) {
                const label = labelEl.innerText;
                content += `<p><strong>${label}:</strong> ${record.data[key]}</p>`;
             }
        }
        bodyContent.innerHTML = content;
        modal.style.display = "block";
    },

    editRecord: id => window.location.href = `index.html?id=${id}`,

    deleteRecord: function(id) {
        if (confirm(`Are you sure you want to delete record ${id}?`)) {
            let records = this.getRecords().filter(r => r.id !== id);
            localStorage.setItem('mseRecords', JSON.stringify(records));
            this.renderDashboard();
        }
    },
    
    clearForm: () => document.querySelector('form').reset(),


    // **REWRITTEN REPORT GENERATION**
    generatePdf: function(id) {
        const record = this.getRecords().find(r => r.id === id);
        if (!record) { alert('Record not found.'); return; }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Register the font
        // Note: jsPDF has built-in support for 'times'.
        doc.setFont('times', 'normal');

        const header = (pageNumber) => {
            doc.setFontSize(16);
            doc.setFont('times', 'bold');
            doc.text('Mental Status Examination Report', doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
            doc.setFontSize(12);
            doc.setFont('times', 'normal');
            doc.text(`Record ID: ${record.id}`, doc.internal.pageSize.getWidth() / 2, 22, { align: 'center' });
        };

        const footer = (pageNumber, pageCount) => {
            doc.setFontSize(10);
            doc.text(`Page ${pageNumber} of ${pageCount}`, doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
        };
        
        const sections = {
            '1. Administrative & Basic Details': ['patient-name', 'age', 'sex', 'observation-datetime', 'education', 'occupation', 'marital-status', 'informant', 'informant-relation'],
            '2. Clinical Background': ['chief-complaints'],
            'Developmental History': ['dev-birth-weight', 'dev-milestones', 'dev-birth-order', 'dev-childhood-disorders'],
            'Family History': ['family-type', 'family-ses', 'family-relationships'],
            'Premorbid Personality': ['pm-mood', 'pm-social', 'pm-leisure'],
            '3. Mental Status Examination (MSE)': [],
            'A. Appearance & Behavior': ['body-built', 'grooming', 'eye-contact', 'psychomotor-activity'],
            'B. Speech & Thought': ['speech-rate', 'relevance-coherence', 'risk-assessment'],
            'C. Perception & Cognition': ['orientation-time', 'orientation-place', 'orientation-person'],
            'Memory': ['memory-immediate', 'memory-recent', 'memory-remote'],
            'D. Clinical Summary': ['judgment', 'insight']
        };

        let tableData = [];
        for(const sectionTitle in sections) {
            tableData.push([{ content: sectionTitle, colSpan: 2, styles: { fontStyle: 'bold', fillColor: '#e9ecef', textColor: '#212529' } }]);
            const fields = sections[sectionTitle];
            if (fields.length > 0) {
                fields.forEach(fieldId => {
                    const labelEl = document.querySelector(`label[for=${fieldId}]`);
                    const label = labelEl ? labelEl.innerText : fieldId;
                    const value = record.data[fieldId] || 'N/A';
                    tableData.push([label, value]);
                });
            }
        }

        doc.autoTable({
            startY: 30,
            body: tableData,
            theme: 'grid',
            styles: { font: 'times', cellPadding: 2.5 },
            columnStyles: {
                0: { fontStyle: 'bold', cellWidth: 60 },
                1: { cellWidth: 'auto' }
            },
            didDrawPage: (data) => {
                header(data.pageNumber);
                footer(data.pageNumber, data.pageCount);
            }
        });

        doc.save(`${record.id}-Report.pdf`);
    },

    generateDocx: function(id) {
        const record = this.getRecords().find(r => r.id === id);
        if (!record) { alert('Record not found.'); return; }
        
        let content = `
            <!DOCTYPE html><html><head><title>MSE Report</title></head>
            <body style="font-family: 'Times New Roman', Times, serif; font-size: 12pt;">
                <div style="text-align: center;">
                    <h1>Mental Status Examination Report</h1>
                    <h2>Record ID: ${record.id}</h2>
                </div>
        `;

        const sections = {
            '<h2>1. Administrative & Basic Details</h2>': ['patient-name', 'age', 'sex', 'observation-datetime', 'education', 'occupation', 'marital-status', 'informant', 'informant-relation'],
            '<h2>2. Clinical Background</h2>': ['chief-complaints'],
            '<h3>Developmental History</h3>': ['dev-birth-weight', 'dev-milestones', 'dev-birth-order', 'dev-childhood-disorders'],
            '<h3>Family History</h3>': ['family-type', 'family-ses', 'family-relationships'],
            '<h3>Premorbid Personality</h3>': ['pm-mood', 'pm-social', 'pm-leisure'],
            '<h2>3. Mental Status Examination (MSE)</h2>': [],
            '<h3>A. Appearance & Behavior</h3>': ['body-built', 'grooming', 'eye-contact', 'psychomotor-activity'],
            '<h3>B. Speech & Thought</h3>': ['speech-rate', 'relevance-coherence', 'risk-assessment'],
            '<h3>C. Perception & Cognition</h3>': ['orientation-time', 'orientation-place', 'orientation-person'],
            '<h3>Memory</h3>': ['memory-immediate', 'memory-recent', 'memory-remote'],
            '<h3>D. Clinical Summary</h3>': ['judgment', 'insight']
        };

        for (const sectionTitle in sections) {
            content += sectionTitle;
            const fields = sections[sectionTitle];
            fields.forEach(fieldId => {
                const labelEl = document.querySelector(`label[for=${fieldId}]`);
                const label = labelEl ? labelEl.innerText : fieldId;
                const value = (record.data[fieldId] || 'N/A').replace(/\n/g, '<br/>');
                content += `<p style="text-align: justify;"><strong>${label}:</strong> ${value}</p>`;
            });
        }
        
        content += '</body></html>';

        var converted = htmlDocx.asBlob(content);
        var url = URL.createObjectURL(converted);
        var link = document.createElement('a');
        link.href = url;
        link.download = `${record.id}-Report.docx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
