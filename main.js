const App = {
    init: function() {
        if (document.querySelector('#records-table')) {
            this.renderDashboard();
        }
        if (document.querySelector('#save-btn')) {
            this.setupFormPage();
        }
    },

    setupFormPage: function() {
        document.getElementById('save-btn').addEventListener('click', () => this.saveRecord());
        document.getElementById('clear-btn').addEventListener('click', () => this.clearForm());
        document.getElementById('pdf-btn').addEventListener('click', () => this.generatePdf());
        document.getElementById('docx-btn').addEventListener('click', () => this.generateDocx());
        
        const urlParams = new URLSearchParams(window.location.search);
        const recordId = urlParams.get('id');
        if (recordId) {
            this.loadRecordForEditing(recordId);
        }
    },

    generatePatientId: function(name, age, sex) {
        if (!name || !age || !sex) return '';
        const nameParts = name.trim().split(' ');
        let id = '';
        if (nameParts.length > 1) {
            id = (nameParts[0][0] || '') + (nameParts[1][0] || '');
        } else {
            id = (name[0] || '') + (name[1] || '');
        }
        return id.toUpperCase() + age + (sex[0] || '').toUpperCase();
    },

    saveRecord: function() {
        const name = document.getElementById('patient-name').value;
        const age = document.getElementById('age').value;
        const sex = document.getElementById('sex').value;
        
        const patientId = this.generatePatientId(name, age, sex);
        if (!patientId) {
            alert('Patient Name, Age, and Sex are required to generate an ID.');
            return;
        }

        const record = {
            id: patientId,
            date: new Date().toISOString(),
            data: {}
        };
        
        document.querySelectorAll('input, select, textarea').forEach(el => {
            if (el.id) {
                 if (el.type === 'checkbox') {
                    record.data[el.id] = el.checked;
                } else {
                    record.data[el.id] = el.value;
                }
            }
        });

        let records = this.getRecords();
        const existingIndex = records.findIndex(r => r.id === patientId);

        if (existingIndex > -1) {
            records[existingIndex] = record;
        } else {
            records.push(record);
        }

        localStorage.setItem('mseRecords', JSON.stringify(records));
        alert('Record saved successfully!');
        window.location.href = 'dashboard.html';
    },

    loadRecordForEditing: function(id) {
        let records = this.getRecords();
        const record = records.find(r => r.id === id);
        if (record) {
            Object.keys(record.data).forEach(key => {
                const el = document.getElementById(key);
                if (el) {
                    if (el.type === 'checkbox') {
                        el.checked = record.data[key];
                    } else {
                        el.value = record.data[key];
                    }
                }
            });
        }
    },

    getRecords: function() {
        return JSON.parse(localStorage.getItem('mseRecords') || '[]');
    },

    renderDashboard: function() {
        const records = this.getRecords();
        const tableBody = document.querySelector('#records-table tbody');
        tableBody.innerHTML = ''; 

        records.forEach(record => {
            const row = `
                <tr>
                    <td>${record.id}</td>
                    <td>${new Date(record.date).toLocaleDateString()}</td>
                    <td class="action-buttons">
                        <button class="edit-btn" onclick="App.editRecord('${record.id}')">Edit</button>
                        <button class="delete-btn" onclick="App.deleteRecord('${record.id}')">Delete</button>
                    </td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });
    },

    editRecord: function(id) {
        window.location.href = `index.html?id=${id}`;
    },

    deleteRecord: function(id) {
        if (confirm(`Are you sure you want to delete record ${id}?`)) {
            let records = this.getRecords();
            records = records.filter(r => r.id !== id);
            localStorage.setItem('mseRecords', JSON.stringify(records));
            this.renderDashboard();
        }
    },
    
    clearForm: function() {
        if (confirm('Are you sure you want to clear all fields? This will not delete a saved record.')) {
            document.querySelectorAll('input, select, textarea').forEach(el => {
                if (el.type === 'checkbox') {
                    el.checked = false;
                } else if(el.id !== 'examined-by') {
                    el.value = '';
                }
            });
        }
    },

    generatePdf: function() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        let y = 10;
        const addSection = (title, content) => {
            if (y > 280) { doc.addPage(); y = 10; }
            doc.setFont(undefined, 'bold');
            doc.text(title, 10, y);
            y += 7;
            doc.setFont(undefined, 'normal');
            const splitContent = doc.splitTextToSize(content, 180);
            doc.text(splitContent, 10, y);
            y += (splitContent.length * 5) + 5;
        };

        document.querySelectorAll('h2, h3').forEach(header => {
            const container = header.nextElementSibling;
            let content = '';
            container.querySelectorAll('input, select, textarea').forEach(el => {
                if (el.id) {
                    const label = document.querySelector(`label[for=${el.id}]`);
                    let value = el.type === 'checkbox' ? (el.checked ? 'Yes' : 'No') : el.value;
                    if (label && value) {
                        content += `${label.innerText}: ${value}\n`;
                    }
                }
            });
            if(content){
                 addSection(header.innerText, content);
            }
        });

        const name = document.getElementById('patient-name').value;
        const age = document.getElementById('age').value;
        const sex = document.getElementById('sex').value;
        const patientId = this.generatePatientId(name, age, sex);

        doc.save(`${patientId || 'MSE'}-Report.pdf`);
    },

    generateDocx: function() {
        let content = '<!DOCTYPE html><html><head><title>MSE Report</title></head><body>';
        document.querySelectorAll('h2, h3').forEach(header => {
            content += `<h2>${header.innerText}</h2>`;
            const container = header.nextElementSibling;
             let sectionContent = '';
            container.querySelectorAll('input, select, textarea').forEach(el => {
                if (el.id) {
                    const label = document.querySelector(`label[for=${el.id}]`);
                     let value = el.type === 'checkbox' ? (el.checked ? 'Yes' : 'No') : el.value;
                    if (label && value) {
                        sectionContent += `<p><strong>${label.innerText}:</strong> ${value.replace(/\n/g, '<br>')}</p>`;
                    }
                }
            });
            content += sectionContent;
        });
        content += '</body></html>';

        const name = document.getElementById('patient-name').value;
        const age = document.getElementById('age').value;
        const sex = document.getElementById('sex').value;
        const patientId = this.generatePatientId(name, age, sex);

        var converted = htmlDocx.asBlob(content);
        var url = URL.createObjectURL(converted);
        var link = document.createElement('a');
        link.href = url;
        link.download = `${patientId || 'MSE'}-Report.docx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

App.init();
