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
        
        const downloadBtn = document.querySelector('.download-btn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', function() {
                this.nextElementSibling.classList.toggle('show-download');
            });
        }

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
        let records = this.getMseRecords().filter(r => r.mseId !== mseId); // Using new function name
        localStorage.setItem('mseRecords', JSON.stringify(records));
        if (document.querySelector('#records-table')) {
            this.renderDashboard();
        }
    },
    
    // Report Generation (Existing, with minor updates to use new IDs)
    generatePdfFromForm: function() {
        const record = { data: {} };
        document.querySelectorAll('input, select, textarea').forEach(el => {
            if (el.id) {
                if (el.id !== 'patient-name') {
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
        const record = { data: {} };
        document.querySelectorAll('input, select, textarea').forEach(el => {
            if (el.id) {
                if (el.id !== 'patient-name') {
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

    generatePdf: function(record) { // Updated to use mseId
        if (!record) { alert('MSE Record not found.'); return; }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // --- Data Extraction and Table Generation ---
        const mapHtmlIdToLabel = (htmlId) => {
            const el = document.getElementById(htmlId);
            if (el) {
                const label = document.querySelector(`label[for=${htmlId}]`);
                return label ? label.innerText.replace(':', '') : el.placeholder || htmlId;
            }
            return htmlId; // Fallback
        };

        const generateTableBody = () => {
            let body = [];
            const formStructure = [
                { title: 'PSYCHIATRIC HISTORY AND MENTAL STATUS EXAMINATION', fields: ['examined-by', 'date', 'age', 'sex', 'place', 'education', 'occupation', 'religion', 'marital-status', 'informant', 'informant-relation'] },
                { title: '2. Clinical Background', fields: ['chief-complaints', 'mode-of-onset', 'precipitating-factors', 'reason-for-consultation', 'history-of-present-illness'] },
                { title: 'History', fields: [] },
                { title: 'A) Early Development and Childhood', fields: ['dev-birth-weight', 'dev-milestones', 'dev-birth-order', 'dev-childhood-disorders'] },
                { title: 'B) Educational History', fields: ['educational-history'] },
                { title: 'C) Occupational History', fields: ['occupational-history'] },
                { title: 'D) Sleep', fields: ['sleep'] },
                { title: 'E) Eating', fields: ['eating'] },
                { title: 'F) Bowels', fields: ['bowels'] },
                { title: 'G) Personal care', fields: ['personal-care'] },
                { title: 'H) Treatment History', fields: ['treatment-history'] },
                { title: 'I) Past History of Mental Illness', fields: ['past-history-of-mental-illness'] },
                { title: 'J) Family History', fields: ['family-type', 'family-ses', 'family-relationships'] },
                { title: 'Genogram', fields: ['genogram'] },
                { title: 'Premorbid Personality', fields: ['pm-mood', 'pm-social', 'pm-leisure'] },
                { title: 'MENTAL STATUS EXAMINATION', fields: [] },
                { title: 'General Appearance', fields: ['general-appearance', 'body-built', 'dressing', 'grooming', 'rapport', 'psychomotor-activity', 'eye-contact', 'attitude-toward-examiner', 'facial-expressions', 'level-of-distress', 'abnormal-movements-or-postures'] },
                { title: 'Speech', fields: ['speech-rate', 'reaction-time', 'articulation-and-fluency', 'relevance', 'coherence', 'speech-latency', 'prosody-of-speech', 'tone', 'tempo', 'volume', 'quantity'] },
                { title: 'Mood', fields: ['mood'] },
                { title: 'Affect', fields: ['quality', 'congruency', 'range', 'mobility', 'appropriateness-to-situation'] },
                { title: 'Thought', fields: ['thought-process', 'delusions', 'depressive-ideations', 'risk-assessment', 'obsessions-and-compulsions', 'phobias'] },
                { title: 'Perception', fields: ['hallucination', 'illusion', 'dissociation', 'agnosia'] },
                { title: 'Sensorium and Cognition', fields: ['orientation', 'level-of-consciousness', 'attention', 'concentration'] },
                { title: 'Memory', fields: ['memory-immediate', 'memory-recent', 'memory-remote', 'general-knowledge'] },
                { title: 'Comprehension', fields: ['comprehension'] },
                { title: 'Arithematic Ability', fields: ['arithematic-ability'] },
                { title: 'Abstract Ability', fields: ['abstract-ability'] },
                { title: 'Judgement', fields: ['personal-judgement', 'social-judgement'] },
                { title: 'Insight', fields: ['insight'] }
            ];

            formStructure.forEach(section => {
                let hasContent = false;
                let sectionBody = [];
                section.fields.forEach(fieldId => {
                    if (record.data[fieldId]) { // Only add if data exists
                        hasContent = true;
                        let label = mapHtmlIdToLabel(fieldId);
                        let value = record.data[fieldId];
                        sectionBody.push([label, value]);
                    }
                });

                if(hasContent){
                    body.push([{ content: section.title, colSpan: 2, styles: { fontStyle: 'bold', fillColor: '#e9ecef', textColor: '#212529', halign: 'center' } }]);
                    body.push(...sectionBody);
                }
            });
            return body;
        };

        doc.autoTable({
            startY: 15,
            head: [['Field', 'Value']],
            body: generateTableBody(),
            theme: 'grid',
            styles: { font: 'times', cellPadding: 2.5, fontSize: 10, overflow: 'linebreak' },
            headStyles: { fillColor: [0, 95, 115], textColor: '#ffffff' },
            addPageContent: function(data) {
                // Header
                doc.setFontSize(20);
                doc.setFont('helvetica', 'bold');
                doc.text(record.mseId || 'Mental Status Examination Report', doc.internal.pageSize.getWidth() / 2, 10, { align: 'center' });

                // Footer
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                doc.text('This report is created using the Digital MSE Record by Agnivesh_Indian.', doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
            }
        });

        doc.save(`${record.mseId || 'MSE'}-Report.pdf`);
    },

    generateDocx: function(record) { // Updated to use mseId
        if (!record) { alert('MSE Record not found.'); return; }
        
        // --- Data Extraction and HTML Generation ---
        const mapHtmlIdToLabel = (htmlId) => {
            const el = document.getElementById(htmlId); // This might not work correctly if element is not in current DOM
            if (el) {
                const label = document.querySelector(`label[for=${htmlId}]`);
                return label ? label.innerText.replace(':', '') : el.placeholder || htmlId;
            }
            return htmlId; // Fallback
        };

        let content = `
            <!DOCTYPE html><html><head><title>MSE Report</title></head>
            <body style="font-family: 'Times New Roman', Times, serif; font-size: 12pt;">
                <h1 style="text-align: center;">${record.mseId || 'Mental Status Examination Report'}</h1>
        `;

        const formStructure = [
            { title: 'PSYCHIATRIC HISTORY AND MENTAL STATUS EXAMINATION', fields: ['examined-by', 'date', 'age', 'sex', 'place', 'education', 'occupation', 'religion', 'marital-status', 'informant', 'informant-relation'] },
            { title: '2. Clinical Background', fields: ['chief-complaints', 'mode-of-onset', 'precipitating-factors', 'reason-for-consultation', 'history-of-present-illness'] },
            { title: 'History', fields: [] },
            { title: 'A) Early Development and Childhood', fields: ['dev-birth-weight', 'dev-milestones', 'dev-birth-order', 'dev-childhood-disorders'] },
            { title: 'B) Educational History', fields: ['educational-history'] },
            { title: 'C) Occupational History', fields: ['occupational-history'] },
            { title: 'D) Sleep', fields: ['sleep'] },
            { title: 'E) Eating', fields: ['eating'] },
            { title: 'F) Bowels', fields: ['bowels'] },
            { title: 'G) Personal care', fields: ['personal-care'] },
            { title: 'H) Treatment History', fields: ['treatment-history'] },
            { title: 'I) Past History of Mental Illness', fields: ['past-history-of-mental-illness'] },
            { title: 'J) Family History', fields: ['family-type', 'family-ses', 'family-relationships'] },
            { title: 'Genogram', fields: ['genogram'] },
            { title: 'Premorbid Personality', fields: ['pm-mood', 'pm-social', 'pm-leisure'] },
            { title: 'MENTAL STATUS EXAMINATION', fields: [] },
            { title: 'General Appearance', fields: ['general-appearance', 'body-built', 'dressing', 'grooming', 'rapport', 'psychomotor-activity', 'eye-contact', 'attitude-toward-examiner', 'facial-expressions', 'level-of-distress', 'abnormal-movements-or-postures'] },
            { title: 'Speech', fields: ['speech-rate', 'reaction-time', 'articulation-and-fluency', 'relevance', 'coherence', 'speech-latency', 'prosody-of-speech', 'tone', 'tempo', 'volume', 'quantity'] },
            { title: 'Mood', fields: ['mood'] },
            { title: 'Affect', fields: ['quality', 'congruency', 'range', 'mobility', 'appropriateness-to-situation'] },
            { title: 'Thought', fields: ['thought-process', 'delusions', 'depressive-ideations', 'risk-assessment', 'obsessions-and-compulsions', 'phobias'] },
            { title: 'Perception', fields: ['hallucination', 'illusion', 'dissociation', 'agnosia'] },
            { title: 'Sensorium and Cognition', fields: ['orientation', 'level-of-consciousness', 'attention', 'concentration'] },
            { title: 'Memory', fields: ['memory-immediate', 'memory-recent', 'memory-remote', 'general-knowledge'] },
            { title: 'Comprehension', fields: ['comprehension'] },
            { title: 'Arithematic Ability', fields: ['arithematic-ability'] },
            { title: 'Abstract Ability', fields: ['abstract-ability'] },
            { title: 'Judgement', fields: ['personal-judgement', 'social-judgement'] },
            { title: 'Insight', fields: ['insight'] }
        ];

        formStructure.forEach(section => {
            let hasContent = false;
            let sectionContent = ``;
            section.fields.forEach(fieldId => {
                if (record.data[fieldId]) { // Only add if data exists
                    hasContent = true;
                    let label = mapHtmlIdToLabel(fieldId);
                    let value = record.data[fieldId];
                    sectionContent += `<tr><td style="padding: 5px; border: 1px solid #ddd;"><strong>${label}</strong></td><td style="padding: 5px; border: 1px solid #ddd;">${value.replace(/\n/g, '<br/>')}</td></tr>`;
                }
            });

            if(hasContent){
                content += `<h3 style="text-align: left; margin-top: 20px;">${section.title}</h3><table style="width: 100%; border-collapse: collapse;"><tbody>${sectionContent}</tbody></table>`;
            }
        });
        
        content += '<p style="text-align: center; margin-top: 40px;">This report is created using the Digital MSE Record by Agnivesh_Indian.</p></body></html>';

        var converted = htmlDocx.asBlob(content);
        var url = URL.createObjectURL(converted);
        var link = document.createElement('a');
        link.href = url;
        link.download = `${record.mseId || 'MSE'}-Report.docx`; // Changed to mseId
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

};

document.addEventListener('DOMContentLoaded', () => App.init());