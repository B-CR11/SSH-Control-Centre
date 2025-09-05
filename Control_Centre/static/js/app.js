// static/js/app.js
const socket = io();

// --- DOM References ---
const machineForm = document.getElementById('machine-form');
const machineList = document.getElementById('machine-list');
const machineDetailsContainer = document.getElementById('machine-details-container');
const machineSummary = document.getElementById('machine-summary');
const saveMachineBtn = document.getElementById('save-machine-btn');
const originalHostnameInput = document.getElementById('original-hostname');
const editMachineBtn = document.getElementById('edit-machine-btn');
const deleteMachineBtn = document.getElementById('delete-machine-btn');
const useGlobalKeyCheckbox = document.getElementById('use-global-key-checkbox');
const sshKeyTextarea = document.getElementById('ssh-key');

const globalKeyForm = document.getElementById('global-key-form');
const globalKeyInput = document.getElementById('global-ssh-key-input');

const scriptForm = document.getElementById('script-form');
const scriptList = document.getElementById('script-list');
const scriptDetailsContainer = document.getElementById('script-details-container');
const scriptSummary = document.getElementById('script-summary');
const saveScriptBtn = document.getElementById('save-script-btn');
const originalScriptNameInput = document.getElementById('original-script-name');
const scriptNameInput = document.getElementById('script-name');
const scriptContentInput = document.getElementById('script-content');
const editScriptBtn = document.getElementById('edit-script-btn');
const deleteScriptBtn = document.getElementById('delete-script-btn');

const runScriptBtn = document.getElementById('run-script-btn');
const commandForm = document.getElementById('command-form');
const commandInput = document.getElementById('command-input');
const terminalOutput = document.getElementById('terminal-output');
const lastCommandOutput = document.getElementById('last-command-output');

const deleteModal = document.getElementById('delete-modal');
const deleteModalTitle = document.getElementById('delete-modal-title');
const deleteModalText = document.getElementById('delete-modal-text');
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');

let selectedMachines = new Set();
let selectedScripts = new Set();
let itemToDelete = null;
let activeMachines = {};
let activeScripts = {};

// --- UI Helper ---
const renderRawTerminal = (target, html) => {
    const isScrolledToBottom = target.scrollHeight - target.clientHeight <= target.scrollTop + 5;
    target.innerHTML += html;
    if (isScrolledToBottom) {
        target.scrollTop = target.scrollHeight;
    }
};

const updateTerminal = (message) => {
    const escapedMessage = message.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    renderRawTerminal(terminalOutput, `<span>${escapedMessage}</span>\n`);
};

// --- Event Listeners ---
machineForm.addEventListener('submit', e => {
    e.preventDefault();
    const alias = document.getElementById('alias').value;
    const hostname = document.getElementById('hostname').value;
    const username = document.getElementById('username').value;
    const port = document.getElementById('port').value;
    const useGlobal = useGlobalKeyCheckbox.checked;
    const sshKey = sshKeyTextarea.value;

    if (!hostname || !username || (!useGlobal && !sshKey)) {
        updateTerminal('[CLIENT-ERROR] Hostname, Username, and an SSH Key method are required.');
        return;
    }
    socket.emit('save_machine', { 
        alias, hostname, username, port, 
        ssh_key: useGlobal ? null : sshKey, 
        use_global_key: useGlobal,
        original_hostname: originalHostnameInput.value
    });
    resetMachineForm();
});

useGlobalKeyCheckbox.addEventListener('change', () => {
    sshKeyTextarea.style.display = useGlobalKeyCheckbox.checked ? 'none' : 'block';
});

globalKeyForm.addEventListener('submit', e => {
    e.preventDefault();
    socket.emit('save_global_key', { key: globalKeyInput.value });
});

editMachineBtn.addEventListener('click', () => {
    if (selectedMachines.size !== 1) {
        updateTerminal('[SYSTEM] Please select exactly one machine to edit.');
        return;
    }
    const hostnameToEdit = selectedMachines.values().next().value;
    const machineData = activeMachines[hostnameToEdit];
    
    originalHostnameInput.value = hostnameToEdit;
    document.getElementById('alias').value = machineData.alias || '';
    document.getElementById('hostname').value = machineData.hostname;
    document.getElementById('username').value = machineData.username;
    document.getElementById('port').value = machineData.port;
    useGlobalKeyCheckbox.checked = machineData.use_global_key;
    sshKeyTextarea.value = machineData.ssh_key || '';
    sshKeyTextarea.style.display = machineData.use_global_key ? 'none' : 'block';

    machineSummary.textContent = 'Update Machine Details';
    saveMachineBtn.textContent = 'Update Machine';
    machineDetailsContainer.open = true;
});

deleteMachineBtn.addEventListener('click', () => {
    if (selectedMachines.size !== 1) {
        updateTerminal('[SYSTEM] Please select exactly one machine to delete.');
        return;
    }
    const hostnameToDelete = selectedMachines.values().next().value;
    const alias = activeMachines[hostnameToDelete].alias || hostnameToDelete;
    itemToDelete = { type: 'machine', id: hostnameToDelete };
    deleteModalTitle.textContent = `Delete ${alias}?`;
    deleteModalText.textContent = `This will permanently delete the configuration for ${alias}. This action cannot be undone.`
    deleteModal.classList.add('active');
});

editScriptBtn.addEventListener('click', () => {
    if (selectedScripts.size !== 1) {
        updateTerminal('[SYSTEM] Please select exactly one script to edit.');
        return;
    }
    const nameToEdit = selectedScripts.values().next().value;
    const scriptContent = activeScripts[nameToEdit];
    
    originalScriptNameInput.value = nameToEdit;
    scriptNameInput.value = nameToEdit;
    scriptContentInput.value = scriptContent;

    scriptSummary.textContent = 'Update Script Details';
    saveScriptBtn.textContent = 'Update Script';
    scriptDetailsContainer.open = true;
});

deleteScriptBtn.addEventListener('click', () => {
    if (selectedScripts.size !== 1) {
        updateTerminal('[SYSTEM] Please select exactly one script to delete.');
        return;
    }
    const nameToDelete = selectedScripts.values().next().value;
    itemToDelete = { type: 'script', id: nameToDelete };
    deleteModalTitle.textContent = `Delete script "${nameToDelete}"?`;
    deleteModalText.textContent = `This will permanently delete the script. This action cannot be undone.`
    deleteModal.classList.add('active');
});

cancelDeleteBtn.addEventListener('click', () => deleteModal.classList.remove('active'));
confirmDeleteBtn.addEventListener('click', () => {
    if (itemToDelete) {
        if (itemToDelete.type === 'machine') {
            socket.emit('delete_machine', { hostname: itemToDelete.id });
        } else if (itemToDelete.type === 'script') {
            socket.emit('delete_script', { name: itemToDelete.id });
        }
        itemToDelete = null;
    }
    deleteModal.classList.remove('active');
});

scriptForm.addEventListener('submit', e => {
    e.preventDefault();
    if (scriptNameInput.value && scriptContentInput.value) {
        socket.emit('save_script', { 
            name: scriptNameInput.value, 
            content: scriptContentInput.value,
            original_name: originalScriptNameInput.value
        });
        resetScriptForm();
    } else {
        updateTerminal('[CLIENT-ERROR] Script Name and Content are required.');
    }
});

commandForm.addEventListener('submit', e => {
    e.preventDefault();
    lastCommandOutput.innerHTML = ''; // Clear previous output
    const command = commandInput.value;
    if (command && selectedMachines.size > 0) {
        const aliases = Array.from(selectedMachines).map(h => activeMachines[h].alias || h);
        updateTerminal(`$ ${command} on [${aliases.join(', ')}]`);
        socket.emit('run_command', { command, targets: Array.from(selectedMachines) });
        commandInput.value = '';
    } else {
        updateTerminal('[CLIENT-ERROR] Please enter a command and select at least one machine.');
    }
});

runScriptBtn.addEventListener('click', () => {
    lastCommandOutput.innerHTML = ''; // Clear previous output
    if (selectedScripts.size !== 1) {
         updateTerminal('[CLIENT-ERROR] Please select exactly one script to run.');
         return;
    }
    if (selectedMachines.size > 0) {
        const scriptName = selectedScripts.values().next().value;
        const aliases = Array.from(selectedMachines).map(h => activeMachines[h].alias || h);
        updateTerminal(`> Running script "${scriptName}" on [${aliases.join(', ')}]`);
        socket.emit('run_script', { script_name: scriptName, targets: Array.from(selectedMachines) });
    } else {
        updateTerminal('[CLIENT-ERROR] Please select a script and at least one machine.');
    }
});

// --- Socket.IO Handlers ---
socket.on('connect', () => {
    socket.emit('get_initial_data');
});

socket.on('initial_data', (data) => {
    activeMachines = data.machines || {};
    activeScripts = data.scripts || {};
    updateMachineListUI();
    updateScriptListUI();
    if (data.global_key && data.global_key.key) {
        globalKeyInput.value = data.global_key.key;
    }
});
socket.on('machines_updated', machines => {
    activeMachines = machines;
    updateMachineListUI();
});
socket.on('scripts_updated', scripts => {
    activeScripts = scripts;
    updateScriptListUI();
});
socket.on('command_output', data => {
    const aliasHtml = data.alias ? `<span class="text-blue-400">[${data.alias}]</span>` : `<span class="text-cyan-400">[${data.hostname}]</span>`;
    const outputEscaped = data.output.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    renderRawTerminal(lastCommandOutput, `<span>${aliasHtml} ${outputEscaped}</span>\n`);
});
socket.on('status', data => {
    const prefixHtml = `<span class="text-yellow-400">[SYSTEM]</span>`;
    const messageEscaped = data.message.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    renderRawTerminal(terminalOutput, `<span>${prefixHtml} ${messageEscaped}</span>\n`);
});

// --- UI Update Functions ---
function resetMachineForm() {
    machineForm.reset();
    originalHostnameInput.value = '';
    useGlobalKeyCheckbox.checked = false;
    sshKeyTextarea.style.display = 'block';
    machineSummary.textContent = 'Add New Machine';
    saveMachineBtn.textContent = 'Save Machine';
    machineDetailsContainer.open = false;
}

function resetScriptForm() {
    scriptForm.reset();
    originalScriptNameInput.value = '';
    scriptSummary.textContent = 'Add New Script';
    saveScriptBtn.textContent = 'Save Script';
    scriptDetailsContainer.open = false;
}

function updateMachineListUI() {
    const currentSelected = new Set(selectedMachines);
    machineList.innerHTML = '';
    const sortedHostnames = Object.keys(activeMachines).sort((a, b) => (activeMachines[a].alias || a).localeCompare(activeMachines[b].alias || b));
    
    sortedHostnames.forEach(hostname => {
        const machine = activeMachines[hostname];
        const item = document.createElement('div');
        item.className = 'list-item p-3 rounded-lg flex justify-between items-center cursor-pointer';
        item.dataset.hostname = hostname;
        
        item.innerHTML = `
            <div>
                <span class="font-semibold text-white">${machine.alias || hostname}</span>
                <span class="text-sm text-slate-400 block">${machine.username}@${hostname}</span>
            </div>
        `;
        item.addEventListener('click', () => {
            item.classList.toggle('selected');
            if (selectedMachines.has(hostname)) {
                selectedMachines.delete(hostname);
            } else {
                selectedMachines.add(hostname);
            }
        });

        if (currentSelected.has(hostname)) {
               item.classList.add('selected');
        }
        machineList.appendChild(item);
    });
}

function updateScriptListUI() {
    const currentSelected = new Set(selectedScripts);
    scriptList.innerHTML = '';
    Object.keys(activeScripts).sort().forEach(name => {
        const item = document.createElement('div');
        item.className = 'list-item p-3 rounded-lg flex justify-between items-center cursor-pointer';
        item.dataset.scriptName = name;
        
        item.innerHTML = `<span class="font-semibold">${name}</span>`;

        item.addEventListener('click', () => {
            // This makes the script list single-select
            document.querySelectorAll('#script-list .list-item').forEach(el => el.classList.remove('selected'));
            selectedScripts.clear();

            item.classList.toggle('selected');
            if (item.classList.contains('selected')) {
                selectedScripts.add(name);
            }
        });
        
        if (currentSelected.has(name)) {
               item.classList.add('selected');
        }
        scriptList.appendChild(item);
    });
}
