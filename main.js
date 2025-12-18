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
            themeToggle.addEventListener('change', () => {
                document.body.classList.toggle('dark-mode');
                localStorage.setItem('darkMode', themeToggle.checked);
            });
            if (localStorage.getItem('darkMode') === 'true') {
                themeToggle.checked = true;
                document.body.classList.add('dark-mode');
            }
        }
    },

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
        if (input.type === 'password') {
            input.type = 'text';
            this.textContent = '🙈';
        } else {
            input.type = 'password';
            this.textContent = '👁️';
        }
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
        
        // If we are editing, we keep the original ID.
        if (existingRecordId) {
            patientId = existingRecordId;
        }

        const record = {
            id: patientId,
            data: {}
        };
        
        document.querySelectorAll('input, select, textarea').forEach(el => {
            if (el.id) record.data[el.id] = el.type === 'checkbox' ? el.checked : el.value;
        });
        
        record.data['observation-datetime'] = record.data['observation-datetime'] || new Date().toISOString();


        let records = this.getRecords();
        const existingIndex = records.findIndex(r => r.id === record.id);

        if (existingIndex > -1) {
            records[existingIndex] = record;
        } else {
            records.push(record);
        }

        localStorage.setItem('mseRecords', JSON.stringify(records));
        alert(`Record ${record.id} saved successfully!`);
        window.location.href = 'dashboard.html';
    },

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
        for (const key in record.data) {
            const labelEl = document.querySelector(`label[for=${key}]`);
            const label = labelEl ? labelEl.innerText : key;
            content += `<p><strong>${label}:</strong> ${record.data[key]}</p>`;
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

    generatePdf: function(id) {
        const record = this.getRecords().find(r => r.id === id);
        if (!record) return;

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        doc.setFont('times', 'normal');
        doc.setFontSize(20);
        doc.text(`MSE Report: ${record.id}`, 105, 20, { align: 'center' });

        const observationDate = record.data['observation-datetime'] ? new Date(record.data['observation-datetime']).toLocaleString() : 'N/A';
        doc.setFontSize(12);
        doc.text(`Date of Observation: ${observationDate}`, 105, 30, { align: 'center' });

        let tableData = [];
        let currentSection = '';

        document.querySelectorAll('h2, h3').forEach(header => {
            const sectionName = header.innerText;
            if (header.tagName === 'H2') currentSection = sectionName;
            
            const fieldsContainer = header.nextElementSibling;
            if (fieldsContainer && fieldsContainer.classList.contains('form-grid') || fieldsContainer.classList.contains('form-group-full')) {
                fieldsContainer.querySelectorAll('input, select, textarea').forEach(el => {
                    if (el.id && record.data[el.id]) {
                        const labelEl = document.querySelector(`label[for=${el.id}]`);
                        const label = labelEl ? labelEl.innerText : el.id;
                        tableData.push([sectionName, label, record.data[el.id]]);
                    }
                });
            }
        });
        
        doc.autoTable({
            startY: 40,
            head: [['Section', 'Field', 'Value']],
            body: tableData,
            theme: 'grid',
            styles: { font: 'times', cellPadding: 2, fontSize: 10 },
            headStyles: { fillColor: [0, 95, 115] },
            didParseCell: function (data) {
                if (data.column.dataKey === 2) { // Value column
                    data.cell.styles.halign = 'left'; 
                }
            }
        });

        doc.save(`${record.id}-Report.pdf`);
    },

    generateDocx: function(id) {
        const record = this.getRecords().find(r => r.id === id);
        if (!record) return;
        
        let content = `
            <!DOCTYPE html>
            <html>
            <head><title>MSE Report</title></head>
            <body style="font-family: 'Times New Roman', Times, serif;">
                <h1 style="text-align: center;">MSE Report: ${record.id}</h1>
                <p style="text-align: center;">Date of Observation: ${new Date(record.data['observation-datetime']).toLocaleString()}</p>
        `;

        document.querySelectorAll('h2').forEach(h2 => {
            content += `<h2>${h2.innerText}</h2>`;
            let nextEl = h2.nextElementSibling;
            while(nextEl && nextEl.tagName !== 'H2') {
                if (nextEl.tagName === 'H3') {
                     content += `<h3>${nextEl.innerText}</h3>`;
                } else if (nextEl.classList.contains('form-grid') || nextEl.classList.contains('form-group-full')) {
                    nextEl.querySelectorAll('input, select, textarea').forEach(el => {
                        if (el.id && record.data[el.id]) {
                            const labelEl = document.querySelector(`label[for=${el.id}]`);
                            const label = labelEl ? labelEl.innerText : el.id;
                            content += `<p><strong>${label}:</strong><br>${record.data[el.id].replace(/\n/g, '<br>')}</p>`;
                        }
                    });
                }
                nextEl = nextEl.nextElementSibling;
            }
        });
        
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
