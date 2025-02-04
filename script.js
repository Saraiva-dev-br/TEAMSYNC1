// DOM Elements
const sidebarCollapse = document.getElementById('sidebarCollapse');
const sidebar = document.getElementById('sidebar');
const addMemberBtn = document.getElementById('addMemberBtn');
const memberModal = new bootstrap.Modal(document.getElementById('memberModal'));
const evaluationModal = new bootstrap.Modal(document.getElementById('evaluationModal'));
const memberForm = document.getElementById('memberForm');
const evaluationForm = document.getElementById('evaluationForm');
const saveMemberBtn = document.getElementById('saveMemberBtn');
const saveEvaluationBtn = document.getElementById('saveEvaluationBtn');
const searchInput = document.getElementById('searchInput');
const membersList = document.getElementById('membersList');
const memberSelect = document.getElementById('memberSelect');
const addEvaluationBtn = document.getElementById('addEvaluationBtn');
const exportPDF = document.getElementById('exportPDF');
const exportExcel = document.getElementById('exportExcel');
const importExcel = document.getElementById('importExcel');

// State Management
let members = JSON.parse(localStorage.getItem('members')) || [];
let evaluations = JSON.parse(localStorage.getItem('evaluations')) || [];
let editingMemberId = null;
let currentView = 'members';

// Charts
let performanceChart = null;
let skillsChart = null;

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    renderMembers();
    setupImageUpload();
    setupNavigation();
    updateMemberSelect();
    initializeCharts();
});

function setupNavigation() {
    document.querySelectorAll('[data-view]').forEach(element => {
        element.addEventListener('click', (e) => {
            e.preventDefault();
            const view = e.currentTarget.getAttribute('data-view');
            showView(view);
        });
    });
}

function showView(view) {
    document.querySelectorAll('[id$="View"]').forEach(element => {
        element.classList.add('d-none');
    });
    document.getElementById(`${view}View`).classList.remove('d-none');
    currentView = view;

    if (view === 'stats') {
        updateCharts();
    }
}

// Member Management
sidebarCollapse.addEventListener('click', () => {
    sidebar.classList.toggle('active');
});

addMemberBtn.addEventListener('click', () => {
    editingMemberId = null;
    memberForm.reset();
    document.getElementById('imagePreview').style.backgroundImage = 'url(https://via.placeholder.com/150)';
    document.querySelector('.modal-title').textContent = 'Adicionar Membro';
    saveMemberBtn.textContent = 'Adicionar Membro';
    memberModal.show();
});

saveMemberBtn.addEventListener('click', () => {
    if (memberForm.checkValidity()) {
        const formData = new FormData(memberForm);
        const memberData = {
            id: editingMemberId || Date.now().toString(),
            fullName: formData.get('fullName'),
            position: formData.get('position'),
            experience: formData.get('experience'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            startDate: formData.get('startDate'),
            status: formData.get('status'),
            notes: formData.get('notes'),
            avatar: document.getElementById('imagePreview').style.backgroundImage.slice(5, -2),
            createdAt: editingMemberId ? members.find(m => m.id === editingMemberId).createdAt : new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (editingMemberId) {
            const index = members.findIndex(m => m.id === editingMemberId);
            members[index] = memberData;
        } else {
            members.push(memberData);
        }

        saveMembers();
        renderMembers();
        updateMemberSelect();
        memberModal.hide();
    } else {
        memberForm.classList.add('was-validated');
    }
});

// Evaluation Management
addEvaluationBtn.addEventListener('click', () => {
    const selectedMember = memberSelect.value;
    if (!selectedMember) {
        alert('Por favor, selecione um membro para avaliar.');
        return;
    }
    evaluationForm.reset();
    evaluationModal.show();
});

saveEvaluationBtn.addEventListener('click', () => {
    const selectedMember = memberSelect.value;
    const evaluationMonth = document.getElementById('evaluationMonth').value;

    if (!selectedMember || !evaluationMonth) {
        alert('Por favor, selecione um membro e um mês para a avaliação.');
        return;
    }

    const formData = new FormData(evaluationForm);
    const evaluationData = {
        id: Date.now().toString(),
        memberId: selectedMember,
        month: evaluationMonth,
        ratings: {
            mixerOperation: parseInt(formData.get('mixerOperation') || '0'),
            equalization: parseInt(formData.get('equalization') || '0'),
            feedback: parseInt(formData.get('feedback') || '0'),
            systemPrep: parseInt(formData.get('systemPrep') || '0'),
            problemSolving: parseInt(formData.get('problemSolving') || '0'),
            teamwork: parseInt(formData.get('teamwork') || '0'),
            punctuality: parseInt(formData.get('punctuality') || '0')
        },
        notes: formData.get('evaluationNotes'),
        createdAt: new Date().toISOString()
    };

    evaluations.push(evaluationData);
    localStorage.setItem('evaluations', JSON.stringify(evaluations));
    updateCharts();
    evaluationModal.hide();
});

// Search and Filter
searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filteredMembers = members.filter(member => 
        member.fullName.toLowerCase().includes(searchTerm) ||
        member.position.toLowerCase().includes(searchTerm) ||
        member.email.toLowerCase().includes(searchTerm)
    );
    renderMembers(filteredMembers);
});

// Charts Management
function initializeCharts() {
    const performanceCtx = document.getElementById('performanceChart').getContext('2d');
    const skillsCtx = document.getElementById('skillsChart').getContext('2d');

    performanceChart = new Chart(performanceCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Desempenho Geral',
                data: [],
                borderColor: '#3498db',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 5
                }
            }
        }
    });

    skillsChart = new Chart(skillsCtx, {
        type: 'radar',
        data: {
            labels: [
                'Operação da Mesa',
                'Equalização',
                'Microfonia',
                'Preparação',
                'Resolução de Problemas',
                'Trabalho em Equipe',
                'Pontualidade'
            ],
            datasets: [{
                label: 'Habilidades',
                data: [],
                backgroundColor: 'rgba(52, 152, 219, 0.2)',
                borderColor: '#3498db',
                pointBackgroundColor: '#3498db'
            }]
        },
        options: {
            scales: {
                r: {
                    beginAtZero: true,
                    max: 5
                }
            }
        }
    });
}

function updateCharts() {
    const selectedMember = memberSelect.value;
    if (!selectedMember) return;

    const memberEvaluations = evaluations.filter(e => e.memberId === selectedMember);
    
    // Performance Chart
    const sortedEvaluations = memberEvaluations.sort((a, b) => a.month.localeCompare(b.month));
    performanceChart.data.labels = sortedEvaluations.map(e => e.month);
    performanceChart.data.datasets[0].data = sortedEvaluations.map(e => {
        const ratings = Object.values(e.ratings);
        return ratings.reduce((sum, val) => sum + val, 0) / ratings.length;
    });
    performanceChart.update();

    // Skills Chart
    if (memberEvaluations.length > 0) {
        const latestEvaluation = memberEvaluations[memberEvaluations.length - 1];
        skillsChart.data.datasets[0].data = [
            latestEvaluation.ratings.mixerOperation,
            latestEvaluation.ratings.equalization,
            latestEvaluation.ratings.feedback,
            latestEvaluation.ratings.systemPrep,
            latestEvaluation.ratings.problemSolving,
            latestEvaluation.ratings.teamwork,
            latestEvaluation.ratings.punctuality
        ];
        skillsChart.update();
    }
}

// Export/Import Functions
// Função para calcular a média das avaliações de um membro
function calculateAverageRating(memberEvaluations) {
    if (!memberEvaluations || memberEvaluations.length === 0) return "Não avaliado";

    const latestEvaluation = memberEvaluations[memberEvaluations.length - 1];
    const ratings = Object.values(latestEvaluation.ratings);

    if (ratings.length === 0) return "Não avaliado";

    const sum = ratings.reduce((acc, val) => acc + val, 0);
    return (sum / ratings.length).toFixed(1);
}

// Função para exportar relatório em PDF
exportPDF.addEventListener('click', () => {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // PDF Header
        const currentDate = new Date().toLocaleString('pt-BR');
        doc.setFillColor(52, 152, 219);
        doc.rect(0, 0, 210, 30, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(20);
        doc.text('Relatório de Sonoplastas - IASD', 20, 20);
        doc.setFontSize(10);
        doc.text(`Exportado em: ${currentDate}`, 20, 27);

        let yPos = 50;

        // Content
        members.forEach((member, index) => {
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            doc.text(`${index + 1}. ${member.fullName || 'Não informado'}`, 20, yPos);
            
            doc.setFontSize(12);
            doc.setFont(undefined, 'normal');
            doc.text(`Função: ${getPositionLabel(member.position)}`, 30, yPos + 7);
            doc.text(`Status: ${getStatusLabel(member.status)}`, 30, yPos + 14);

            const memberEvaluations = evaluations.filter(e => e.memberId === member.id);
            const avgRating = calculateAverageRating(memberEvaluations);

            // Rating box
            doc.setFillColor(240, 240, 240);
            doc.roundedRect(150, yPos - 5, 40, 20, 3, 3, 'F');
            doc.setFontSize(14);
            doc.text(`★ ${avgRating}`, 160, yPos + 7);

            // Separator line
            doc.setDrawColor(200, 200, 200);
            doc.line(20, yPos + 25, 190, yPos + 25);

            yPos += 35;

            if (yPos > 250) {
                doc.addPage();
                yPos = 20;
            }
        });

        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(10);
            doc.setTextColor(150, 150, 150);
            doc.text(`Página ${i} de ${pageCount}`, 20, 290);
        }

        doc.save(`sonoplastas-relatorio-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
        console.error("Erro ao gerar PDF:", error);
        alert("Ocorreu um erro ao gerar o PDF. Por favor, tente novamente.");
    }
});

// Excel Export with improved structure
exportExcel.addEventListener('click', async () => {
    try {
        // Check if XLSX is available
        if (typeof XLSX === 'undefined') {
            await loadXLSX();
        }
        const wb = XLSX.utils.book_new();
        
        // Summary Sheet
        const summaryData = [
            ["Relatório de Sonoplastas - IASD"],
            ["Exportado em:", new Date().toLocaleString('pt-BR')],
            [],
            ["Nome", "Função", "Status", "Avaliação Média", "Email", "Telefone"]
        ];

        members.forEach(member => {
            const memberEvaluations = evaluations.filter(e => e.memberId === member.id);
            const avgRating = calculateAverageRating(memberEvaluations);

            summaryData.push([
                member.fullName,
                getPositionLabel(member.position),
                getStatusLabel(member.status),
                avgRating,
                member.email,
                member.phone
            ]);
        });

        const ws = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, ws, "Resumo");

        // Members Detail Sheet
        const membersData = members.map(m => ({
            Nome: m.fullName,
            Função: getPositionLabel(m.position),
            Email: m.email,
            Telefone: m.phone,
            Status: getStatusLabel(m.status),
            'Data de Início': m.startDate,
            'Última Atualização': new Date(m.updatedAt).toLocaleString('pt-BR')
        }));
        const memberWs = XLSX.utils.json_to_sheet(membersData);
        XLSX.utils.book_append_sheet(wb, memberWs, 'Membros');

        // Evaluations Sheet
        const evaluationsData = evaluations.map(e => {
            const member = members.find(m => m.id === e.memberId);
            return {
                Membro: member?.fullName || '',
                Mês: e.month,
                'Operação da Mesa': e.ratings.mixerOperation,
                Equalização: e.ratings.equalization,
                Microfonia: e.ratings.feedback,
                'Preparação do Sistema': e.ratings.systemPrep,
                'Resolução de Problemas': e.ratings.problemSolving,
                'Trabalho em Equipe': e.ratings.teamwork,
                Pontualidade: e.ratings.punctuality,
                Observações: e.notes,
                'Data da Avaliação': new Date(e.createdAt).toLocaleString('pt-BR')
            };
        });
        const evaluationWs = XLSX.utils.json_to_sheet(evaluationsData);
        XLSX.utils.book_append_sheet(wb, evaluationWs, 'Avaliações');

        XLSX.writeFile(wb, `sonoplastas-relatorio-${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
        console.error("Erro ao gerar Excel:", error);
        alert("Ocorreu um erro ao gerar o Excel. Por favor, tente novamente.");
    }
});

importExcel.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check if XLSX is available
    if (typeof XLSX === 'undefined') {
        await loadXLSX();
    }

    const reader = new FileReader();
    if (!file) return;
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        // Import Members
        const membersSheet = workbook.Sheets['Membros'];
        if (membersSheet) {
            const importedMembers = XLSX.utils.sheet_to_json(membersSheet);
            importedMembers.forEach(importedMember => {
                const newMember = {
                    id: Date.now().toString(),
                    fullName: importedMember.Nome,
                    position: importedMember.Função,
                    email: importedMember.Email,
                    phone: importedMember.Telefone,
                    status: importedMember.Status,
                    startDate: importedMember['Data de Início'],
                    avatar: 'https://via.placeholder.com/150',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                members.push(newMember);
            });
        }
        
        // Import Evaluations
        const evaluationsSheet = workbook.Sheets['Avaliações'];
        if (evaluationsSheet) {
            const importedEvaluations = XLSX.utils.sheet_to_json(evaluationsSheet);
            importedEvaluations.forEach(importedEval => {
                const member = members.find(m => m.fullName === importedEval.Membro);
                if (member) {
                    const newEvaluation = {
                        id: Date.now().toString(),
                        memberId: member.id,
                        month: importedEval.Mês,
                        ratings: {
                            mixerOperation: importedEval['Operação da Mesa'],
                            equalization: importedEval.Equalização,
                            feedback: importedEval.Microfonia,
                            systemPrep: importedEval['Preparação do Sistema'],
                            problemSolving: importedEval['Resolução de Problemas'],
                            teamwork: importedEval['Trabalho em Equipe'],
                            punctuality: importedEval.Pontualidade
                        },
                        notes: importedEval.Observações,
                        createdAt: new Date().toISOString()
                    };
                    evaluations.push(newEvaluation);
                }
            });
        }
        
        saveMembers();
        localStorage.setItem('evaluations', JSON.stringify(evaluations));
        renderMembers();
        updateMemberSelect();
        updateCharts();
        alert('Importação concluída com sucesso!');
    };
    reader.readAsArrayBuffer(file);
});

// Utility Functions
function setupImageUpload() {
    const imageUpload = document.getElementById('imageUpload');
    const imagePreview = document.getElementById('imagePreview');

    imageUpload.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                imagePreview.style.backgroundImage = `url(${e.target.result})`;
            }
            reader.readAsDataURL(file);
        }
    });
}

function renderMembers(membersToRender = members) {
    membersList.innerHTML = membersToRender.map(member => {
        const memberEvaluations = evaluations.filter(e => e.memberId === member.id);
        let averageRating = 'Não avaliado';
        
        if (memberEvaluations.length > 0) {
            const latestEval = memberEvaluations[memberEvaluations.length - 1];
            const ratings = Object.values(latestEval.ratings);
            averageRating = (ratings.reduce((sum, val) => sum + val, 0) / ratings.length).toFixed(1) + ' ★';
        }

        return `
            <tr>
                <td>
                    <img src="${member.avatar}" alt="${member.fullName}" class="member-avatar">
                </td>
                <td>${member.fullName}</td>
                <td>${getPositionLabel(member.position)}</td>
                <td>${member.experience}</td>
                <td>${member.email}</td>
                <td>
                    <span class="badge badge-${member.status}">${getStatusLabel(member.status)}</span>
                </td>
                <td>${averageRating}</td>
                <td>
                    <button class="btn btn-sm btn-primary me-1" onclick="editMember('${member.id}')">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteMember('${member.id}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function updateMemberSelect() {
    memberSelect.innerHTML = '<option value="">Selecione um membro...</option>' +
        members.map(member => `
            <option value="${member.id}">${member.fullName}</option>
        `).join('');
}

function editMember(id) {
    const member = members.find(m => m.id === id);
    if (member) {
        editingMemberId = id;
        Object.keys(member).forEach(key => {
            const input = memberForm.elements[key];
            if (input) {
                input.value = member[key];
            }
        });
        document.getElementById('imagePreview').style.backgroundImage = `url(${member.avatar})`;
        document.querySelector('.modal-title').textContent = 'Editar Membro';
        saveMemberBtn.textContent = 'Salvar Alterações';
        memberModal.show();
    }
}

document.addEventListener("DOMContentLoaded", function() {
    const selectExperience = document.querySelector('select[name="experience"]');
    const colors = {
        trainee: "blue",
        junior: "green",
        senior: "red"
    };

    // Restaurar valor salvo no Local Storage
    const savedExperience = localStorage.getItem("selectedExperience");
    if (savedExperience) {
        selectExperience.value = savedExperience;
        selectExperience.style.color = colors[savedExperience] || "black";
    }

    // Alterar cor ao mudar a seleção e salvar no Local Storage
    selectExperience.addEventListener('change', function() {
        const selectedValue = this.value;
        this.style.color = colors[selectedValue] || "black";
        localStorage.setItem("selectedExperience", selectedValue); // Salvar no Local Storage
    });
});


function deleteMember(id) {
    if (confirm('Tem certeza que deseja excluir este membro?')) {
        members = members.filter(m => m.id !== id);
function saveMembers() {
    localStorage.setItem('members', JSON.stringify(members));
}

// Function to load XLSX library dynamically
async function loadXLSX() {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js';
        script.onload = resolve;
        script.onerror = () => reject(new Error('Failed to load XLSX library'));
        document.head.appendChild(script);
    });
}
        renderMembers();
        updateMemberSelect();
        updateCharts();
    }
}

function saveMembers() {
    localStorage.setItem('members', JSON.stringify(members));
}

function getStatusLabel(status) {
    const labels = {
        active: 'Ativo',
        inactive: 'Inativo',
        training: 'Em Treinamento'
    };
    return labels[status] || status;
}

function getPositionLabel(position) {
    const labels = {
        mixer: 'Operador de Mesa',
        monitor: 'Monitor de Palco',
        microphone: 'Microfonista',
        multimedia: 'Multimídia'
    };
    return labels[position] || position;
}

// Auto-save feature
let autoSaveTimeout;
const inputs = memberForm.querySelectorAll('input, select, textarea');
inputs.forEach(input => {
    input.addEventListener('input', () => {
        clearTimeout(autoSaveTimeout);
        autoSaveTimeout = setTimeout(() => {
            const formData = new FormData(memberForm);
            localStorage.setItem('memberFormDraft', JSON.stringify(Object.fromEntries(formData)));
        }, 1000);
    });
});
