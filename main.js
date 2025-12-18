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
        document.getElementById('observation-datetime').value = new Date().toISOString().slice(0, 16); // Set current date/time
        

        const urlParams = new URLSearchParams(window.location.search);
        const recordId = urlParams.get('id');
        if (recordId) {
            document.querySelector('h1').textContent = `Edit MSE Record: ${recordId}`;
            this.loadRecordForEditing(recordId);
        }
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

        const record = { mseId: mseId, data: {} }; // Changed id to mseId
        
        document.querySelectorAll('input, select, textarea').forEach(el => {
            if (el.id) record.data[el.id] = el.type === 'checkbox' ? el.checked : el.value;
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
                const el = document.getElementById(key);
                if (el) {
                    if (el.type === 'checkbox') el.checked = record.data[key];
                    else el.value = record.data[key];
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
        this.getMseRecords().forEach(record => { // Using new function name
            const date = record.data['observation-datetime'] ? new Date(record.data['observation-datetime']).toLocaleString() : 'N/A';
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${record.mseId}</td> <!-- Changed id to mseId -->
                <td>${date}</td>
                <td class="actions-cell">
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

    viewRecord: function(mseId) { // Changed id to mseId
        const record = this.getMseRecords().find(r => r.mseId === mseId); // Using new function name
        if (!record) return;

        const modal = document.getElementById('view-modal');
        document.getElementById('modal-patient-id').textContent = `MSE Record: ${mseId}`; // Changed to mseId and added prefix
        const bodyContent = document.getElementById('modal-body-content');
        
        let content = '';
        // This is a simple view. The PDF/DOCX will be more structured.
        const formStructure = [ // Re-using form structure for consistent display
            { title: '1. Administrative & Basic Details', fields: ['patient-name', 'age', 'sex', 'observation-datetime', 'education', 'occupation', 'marital-status', 'informant', 'informant-relation'] },
            { title: '2. Clinical Background', fields: ['chief-complaints'] },
            { title: 'Developmental History', fields: ['dev-birth-weight', 'dev-milestones', 'dev-birth-order', 'dev-childhood-disorders'] },
            { title: 'Family History', fields: ['family-type', 'family-ses', 'family-relationships'] },
            { title: 'Premorbid Personality', fields: ['pm-mood', 'pm-social', 'pm-leisure'] },
            { title: '3. Mental Status Examination (MSE)', fields: [] }, // Placeholder
            { title: 'A. Appearance & Behavior', fields: ['body-built', 'grooming', 'eye-contact', 'psychomotor-activity'] },
            { title: 'B. Speech & Thought', fields: ['speech-rate', 'relevance-coherence', 'risk-assessment'] },
            { title: 'C. Perception & Cognition', fields: ['orientation-time', 'orientation-place', 'orientation-person'] },
            { title: 'Memory', fields: ['memory-immediate', 'memory-recent', 'memory-remote'] },
            { title: 'D. Clinical Summary', fields: ['judgment', 'insight'] }
        ];

        formStructure.forEach(section => {
            let sectionContent = '';
            section.fields.forEach(fieldId => {
                const labelEl = document.querySelector(`label[for=${fieldId}]`);
                const label = labelEl ? labelEl.innerText : fieldId;
                const value = record.data[fieldId] || 'N/A';
                if (value !== 'N/A') { // Only show fields with values
                    sectionContent += `<p><strong>${label}:</strong> ${value.replace(/\n/g, '<br>')}</p>`;
                }
            });
            if (sectionContent) {
                content += `<h3>${section.title}</h3>${sectionContent}`;
            }
        });

        bodyContent.innerHTML = content;
        modal.style.display = "block";
    },

    editRecord: mseId => window.location.href = `index.html?id=${mseId}`, // Changed id to mseId

    deleteRecord: function(mseId) { // Changed id to mseId
        if (confirm(`Are you sure you want to delete MSE record ${mseId}?`)) {
            let records = this.getMseRecords().filter(r => r.mseId !== mseId); // Using new function name
            localStorage.setItem('mseRecords', JSON.stringify(records));
            if (document.querySelector('#records-table')) {
                this.renderDashboard();
            }
        }
    },
    
    // Report Generation (Existing, with minor updates to use new IDs)
    generatePdf: function(mseId) { // Updated to use mseId
        const record = this.getMseRecords().find(r => r.mseId === mseId); // Using new function name
        if (!record) { alert('MSE Record not found.'); return; }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // --- Data Extraction and Table Generation ---
        const mapHtmlIdToLabel = (htmlId) => {
            const el = document.getElementById(htmlId);
            if (el) {
                const label = document.querySelector(`label[for=${htmlId}]`);
                return label ? label.innerText : el.placeholder || htmlId;
            }
            return htmlId; // Fallback
        };

        const generateTableBody = () => {
            let body = [];
            const formStructure = [
                { title: '1. Administrative & Basic Details', fields: ['patient-name', 'age', 'sex', 'observation-datetime', 'education', 'occupation', 'marital-status', 'informant', 'informant-relation'] },
                { title: '2. Clinical Background', fields: ['chief-complaints'] },
                { title: 'Developmental History', fields: ['dev-birth-weight', 'dev-milestones', 'dev-birth-order', 'dev-childhood-disorders'] },
                { title: 'Family History', fields: ['family-type', 'family-ses', 'family-relationships'] },
                { title: 'Premorbid Personality', fields: ['pm-mood', 'pm-social', 'pm-leisure'] },
                { title: '3. Mental Status Examination (MSE)', fields: [] }, // Placeholder
                { title: 'A. Appearance & Behavior', fields: ['body-built', 'grooming', 'eye-contact', 'psychomotor-activity'] },
                { title: 'B. Speech & Thought', fields: ['speech-rate', 'relevance-coherence', 'risk-assessment'] },
                { title: 'C. Perception & Cognition', fields: ['orientation-time', 'orientation-place', 'orientation-person'] },
                { title: 'Memory', fields: ['memory-immediate', 'memory-recent', 'memory-remote'] },
                { title: 'D. Clinical Summary', fields: ['judgment', 'insight'] }
            ];

            formStructure.forEach(section => {
                body.push([{ content: section.title, colSpan: 1, styles: { fontStyle: 'bold', fillColor: '#e9ecef', textColor: '#212529', halign: 'center' } }]);
                section.fields.forEach(fieldId => {
                    if (record.data[fieldId]) { // Only add if data exists
                        let label = mapHtmlIdToLabel(fieldId);
                        let value = record.data[fieldId];
                        body.push([`${label}: ${value}`]);
                    }
                });
            });
            return body;
        };

        doc.autoTable({
            startY: 15,
            head: [['Description']],
            body: generateTableBody(),
            theme: 'grid',
            styles: { font: 'times', cellPadding: 2.5, fontSize: 10, overflow: 'linebreak' },
            headStyles: { fillColor: [0, 95, 115], textColor: '#ffffff' },
        });

        doc.save(`${record.mseId}-Report.pdf`);
    },

    generateDocx: function(mseId) { // Updated to use mseId
        const record = this.getMseRecords().find(r => r.mseId === mseId); // Using new function name
        if (!record) { alert('MSE Record not found.'); return; }
        
        // --- Data Extraction and HTML Generation ---
        const mapHtmlIdToLabel = (htmlId) => {
            const el = document.getElementById(htmlId); // This might not work correctly if element is not in current DOM
            if (el) {
                const label = document.querySelector(`label[for=${htmlId}]`);
                return label ? label.innerText : el.placeholder || htmlId;
            }
            return htmlId; // Fallback
        };

        let content = `
            <!DOCTYPE html><html><head><title>MSE Report</title></head>
            <body style="font-family: 'Times New Roman', Times, serif; font-size: 12pt;">
        `;

        const formStructure = [
            { title: '1. Administrative & Basic Details', fields: ['patient-name', 'age', 'sex', 'observation-datetime', 'education', 'occupation', 'marital-status', 'informant', 'informant-relation'] },
            { title: '2. Clinical Background', fields: ['chief-complaints'] },
            { title: 'Developmental History', fields: ['dev-birth-weight', 'dev-milestones', 'dev-birth-order', 'dev-childhood-disorders'] },
            { title: 'Family History', fields: ['family-type', 'family-ses', 'family-relationships'] },
            { title: 'Premorbid Personality', fields: ['pm-mood', 'pm-social', 'pm-leisure'] },
            { title: '3. Mental Status Examination (MSE)', fields: [] }, // Placeholder
            { title: 'A. Appearance & Behavior', fields: ['body-built', 'grooming', 'eye-contact', 'psychomotor-activity'] },
            { title: 'B. Speech & Thought', fields: ['speech-rate', 'relevance-coherence', 'risk-assessment'] },
            { title: 'C. Perception & Cognition', fields: ['orientation-time', 'orientation-place', 'orientation-person'] },
            { title: 'Memory', fields: ['memory-immediate', 'memory-recent', 'memory-remote'] },
            { title: 'D. Clinical Summary', fields: ['judgment', 'insight'] }
        ];

        formStructure.forEach(section => {
            content += `<h3 style="text-align: left; margin-top: 20px;">${section.title}</h3>`;
            section.fields.forEach(fieldId => {
                if (record.data[fieldId]) { // Only add if data exists
                    let label = mapHtmlIdToLabel(fieldId);
                    let value = record.data[fieldId];
                    content += `<p style="text-align: justify; margin-left: 20px;"><strong>${label}:</strong> ${value.replace(/\n/g, '<br/>')}</p>`;
                }
            });
        });
        
        content += '</body></html>';

        var converted = htmlDocx.asBlob(content);
        var url = URL.createObjectURL(converted);
        var link = document.createElement('a');
        link.href = url;
        link.download = `${record.mseId}-Report.docx`; // Changed to mseId
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

};

document.addEventListener('DOMContentLoaded', () => App.init());