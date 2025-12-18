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
        if (document.querySelector('#patients-table')) {
            this.renderPatientsDashboard();
            this.setupPatientsDashboardListeners();
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

        // Auto-add patient if not already in the list
        let patients = this.getPatients();
        let patient = patients.find(p => p.name.toLowerCase() === name.toLowerCase());
        if (!patient) {
            const patientId = this.generatePatientUniqueId();
            patient = { id: patientId, name: name, age: age, sex: sex, dob: '', contact: '' };
            patients.push(patient);
            localStorage.setItem('patients', JSON.stringify(patients));
        }
        record.patientId = patient.id; // Associate MSE record with patient
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
            this.renderDashboard();
        }
    },
    
    // Patient Management Logic
    setupPatientsDashboardListeners: function() {
        const modal = document.getElementById('patient-modal');
        const closeBtn = modal.querySelector('.close-btn');
        closeBtn.onclick = () => modal.style.display = "none";
        window.onclick = (event) => {
            if (event.target == modal) {
                modal.style.display = "none";
            }
        };
        document.getElementById('modal-save-patient-btn').addEventListener('click', () => this.savePatient());
        document.querySelector('.new-btn').addEventListener('click', () => this.createPatient()); // Listen for new patient button

        const notesModal = document.getElementById('notes-modal');
        const notesCloseBtn = notesModal.querySelector('.close-btn');
        notesCloseBtn.onclick = () => notesModal.style.display = "none";
        window.onclick = (event) => {
            if (event.target == notesModal) {
                notesModal.style.display = "none";
            }
        };
        document.getElementById('modal-save-note-btn').addEventListener('click', () => this.saveSessionNote());
    },

    viewPatientNotes: function(patientId) {
        const patient = this.getPatients().find(p => p.id === patientId);
        if (!patient) return;

        const modal = document.getElementById('notes-modal');
        modal.dataset.patientId = patientId;
        document.getElementById('notes-modal-title').textContent = `Session Notes for ${patient.name}`;

        const notesList = document.getElementById('notes-list');
        notesList.innerHTML = '';
        if (patient.notes && patient.notes.length > 0) {
            patient.notes.forEach(note => {
                const noteEl = document.createElement('div');
                noteEl.classList.add('note-item');
                noteEl.innerHTML = `<strong>${note.date}:</strong><p>${note.text}</p>`;
                notesList.appendChild(noteEl);
            });
        } else {
            notesList.innerHTML = '<p>No notes for this patient yet.</p>';
        }

        document.getElementById('note-date').value = new Date().toISOString().slice(0, 10);
        document.getElementById('note-text').value = '';

        modal.style.display = 'block';
    },

    saveSessionNote: function() {
        const modal = document.getElementById('notes-modal');
        const patientId = modal.dataset.patientId;
        const date = document.getElementById('note-date').value;
        const text = document.getElementById('note-text').value;

        if (!date || !text) {
            alert('Date and note text are required.');
            return;
        }

        let patients = this.getPatients();
        const patientIndex = patients.findIndex(p => p.id === patientId);
        if (patientIndex > -1) {
            if (!patients[patientIndex].notes) {
                patients[patientIndex].notes = [];
            }
            patients[patientIndex].notes.push({ date, text });
            localStorage.setItem('patients', JSON.stringify(patients));
            modal.style.display = 'none';
        }
    },

    renderPatientsDashboard: function() {
        const tableBody = document.querySelector('#patients-table tbody');
        tableBody.innerHTML = ''; 
        this.getPatients().forEach(patient => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${patient.id}</td>
                <td>${patient.name}</td>
                <td>${patient.dob || 'N/A'}</td>
                <td class="actions-cell">
                    <button class="view-btn" onclick="App.viewPatientMSEs('${patient.id}')">View MSEs</button>
                    <button class="edit-btn" onclick="App.editPatient('${patient.id}')">Edit</button>
                    <button class="notes-btn" onclick="App.viewPatientNotes('${patient.id}')">Notes</button>
                    <button class="delete-btn" onclick="App.deletePatient('${patient.id}')">Delete</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    },

    getPatients: function() {
        return JSON.parse(localStorage.getItem('patients') || '[]');
    },

    generatePatientUniqueId: function() { // New function to generate unique patient ID
        return 'PAT-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5).toUpperCase();
    },

    createPatient: function() {
        const modal = document.getElementById('patient-modal');
        document.getElementById('patient-modal-title').textContent = 'Add New Patient';
        document.getElementById('modal-patient-name').value = '';
        document.getElementById('modal-patient-dob').value = '';
        document.getElementById('modal-patient-sex').value = 'Male'; // Default
        document.getElementById('modal-patient-contact').value = '';
        modal.dataset.patientId = ''; // Clear for new patient
        modal.style.display = 'block';
    },

    savePatient: function() {
        const modal = document.getElementById('patient-modal');
        let patientId = modal.dataset.patientId;
        const name = document.getElementById('modal-patient-name').value;
        const dob = document.getElementById('modal-patient-dob').value;
        const sex = document.getElementById('modal-patient-sex').value;
        const contact = document.getElementById('modal-patient-contact').value;

        if (!name) {
            alert('Patient Name is required.');
            return;
        }

        let patients = this.getPatients();
        let patient;

        if (patientId) { // Editing existing patient
            patient = patients.find(p => p.id === patientId);
            if (patient) {
                patient.name = name;
                patient.dob = dob;
                patient.sex = sex;
                patient.contact = contact;
            }
        } else { // New patient
            patientId = this.generatePatientUniqueId();
            patient = { id: patientId, name: name, dob: dob, sex: sex, contact: contact };
            patients.push(patient);
        }

        localStorage.setItem('patients', JSON.stringify(patients));
        modal.style.display = 'none';
        this.renderPatientsDashboard();
        alert(`Patient ${name} saved successfully!`);
    },

    editPatient: function(id) {
        const patient = this.getPatients().find(p => p.id === id);
        if (patient) {
            const modal = document.getElementById('patient-modal');
            document.getElementById('patient-modal-title').textContent = `Edit Patient: ${patient.name}`;
            document.getElementById('modal-patient-name').value = patient.name;
            document.getElementById('modal-patient-dob').value = patient.dob || '';
            document.getElementById('modal-patient-sex').value = patient.sex || 'Male';
            document.getElementById('modal-patient-contact').value = patient.contact || '';
            modal.dataset.patientId = patient.id; // Store ID for saving
            modal.style.display = 'block';
        }
    },

    deletePatient: function(id) {
        if (confirm(`Are you sure you want to delete patient ${id} and all their associated MSE records?`)) {
            let patients = this.getPatients().filter(p => p.id !== id);
            localStorage.setItem('patients', JSON.stringify(patients));
            
            // Also delete associated MSE records
            let mseRecords = this.getMseRecords().filter(r => r.patientId !== id);
            localStorage.setItem('mseRecords', JSON.stringify(mseRecords));

            this.renderPatientsDashboard();
        }
    },
    
    viewPatientMSEs: function(patientId) {
        // This will navigate to the MSE dashboard, possibly with a filter applied
        window.location.href = `dashboard.html?patientId=${patientId}`;
    },

    // Report Generation (Existing, with minor updates to use new IDs)
    generatePdf: function(mseId) { // Updated to use mseId
        const record = this.getMseRecords().find(r => r.mseId === mseId); // Using new function name
        if (!record) { alert('MSE Record not found.'); return; }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        doc.setFont('times', 'normal');
        doc.setFontSize(16);
        doc.setFont('times', 'bold');
        doc.text('Mental Status Examination Report', doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
        doc.setFontSize(12);
        doc.setFont('times', 'normal');
        doc.text(`Record ID: ${record.mseId}`, doc.internal.pageSize.getWidth() / 2, 22, { align: 'center' }); // Changed to mseId
        
        const observationDate = record.data['observation-datetime'] ? new Date(record.data['observation-datetime']).toLocaleString() : 'N/A';
        doc.text(`Date of Observation: ${observationDate}`, doc.internal.pageSize.getWidth() / 2, 29, { align: 'center' });

        const header = (pageNumber) => {
            doc.setFontSize(10);
            doc.setFont('times', 'normal');
            doc.text(`Record ID: ${record.mseId}`, 10, 10); // Changed to mseId
            doc.text(`Page ${pageNumber}`, doc.internal.pageSize.getWidth() - 20, 10, { align: 'right' });
        };

        const footer = (pageNumber, pageCount) => {
            doc.setFontSize(10);
            doc.text(`Page ${pageNumber} of ${pageCount}`, doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
        };
        
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
                body.push([{ content: section.title, colSpan: 2, styles: { fontStyle: 'bold', fillColor: '#e9ecef', textColor: '#212529', halign: 'center' } }]);
                section.fields.forEach(fieldId => {
                    if (record.data[fieldId]) { // Only add if data exists
                        let label = mapHtmlIdToLabel(fieldId);
                        let value = record.data[fieldId];
                        body.push([label, value]);
                    }
                });
            });
            return body;
        };

        doc.autoTable({
            startY: 40,
            head: [['Field', 'Value']],
            body: generateTableBody(),
            theme: 'grid',
            styles: { font: 'times', cellPadding: 2.5, fontSize: 10, overflow: 'linebreak' },
            headStyles: { fillColor: [0, 95, 115], textColor: '#ffffff' },
            didDrawPage: (data) => {
                doc.setFont('times', 'normal'); // Reset font after autoTable's font setting
                doc.setFontSize(16);
                doc.setFont('times', 'bold');
                doc.text('Mental Status Examination Report', doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
                doc.setFontSize(12);
                doc.setFont('times', 'normal');
                doc.text(`Record ID: ${record.mseId}`, doc.internal.pageSize.getWidth() / 2, 22, { align: 'center' });
                
                const observationDate = record.data['observation-datetime'] ? new Date(record.data['observation-datetime']).toLocaleString() : 'N/A';
                doc.text(`Date of Observation: ${observationDate}`, doc.internal.pageSize.getWidth() / 2, 29, { align: 'center' });

                doc.setFontSize(10);
                doc.text(`Page ${data.pageNumber} of ${data.pageCount}`, doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
            },
            margin: { top: 35 } // Adjust top margin to leave space for header
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
                <h1 style="text-align: center;">Mental Status Examination Report</h1>
                <h2 style="text-align: center;">Record ID: ${record.mseId}</h2>
                <p style="text-align: center;">Date of Observation: ${record.data['observation-datetime'] ? new Date(record.data['observation-datetime']).toLocaleString() : 'N/A'}</p>
                <br>
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
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());