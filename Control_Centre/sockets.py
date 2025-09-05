# sockets.py
# Defines all the server-side Socket.IO event handlers.

from flask import session
from app_setup import socketio
from ssh_manager import get_ssh_client, close_all_connections
import storage
import config

@socketio.on('get_initial_data')
def handle_get_initial_data():
    """Sends all saved machine, script, and key data to a newly connected client."""
    if session.get('logged_in'):
        initial_data = {
            'machines': storage.saved_machines, 
            'scripts': storage.saved_scripts, 
            'global_key': storage.global_ssh_key
        }
        socketio.emit('initial_data', initial_data)

@socketio.on('save_global_key')
def handle_save_global_key(data):
    """Saves the global SSH key."""
    if session.get('logged_in'):
        storage.global_ssh_key = {'key': data.get('key', '')}
        storage.save_to_disk(config.GLOBAL_KEY_FILE, storage.global_ssh_key)
        socketio.emit('status', {'message': "Global SSH key saved."})

@socketio.on('save_machine')
def handle_save_machine(data):
    """Saves or updates a machine's configuration."""
    if session.get('logged_in'):
        hostname = data.get('hostname')
        original_hostname = data.get('original_hostname')

        # If hostname was changed, remove the old entry
        if original_hostname and original_hostname != hostname and original_hostname in storage.saved_machines:
            del storage.saved_machines[original_hostname]

        if hostname:
            data.pop('original_hostname', None)
            storage.saved_machines[hostname] = data
            storage.save_to_disk(config.MACHINES_FILE, storage.saved_machines)
            # Broadcast the update to all connected clients
            socketio.emit('machines_updated', storage.saved_machines, broadcast=True)
            socketio.emit('status', {'message': f"Machine '{data.get('alias', hostname)}' saved/updated."})

@socketio.on('delete_machine')
def handle_delete_machine(data):
    """Deletes a machine's configuration."""
    if session.get('logged_in'):
        hostname = data.get('hostname')
        if hostname and hostname in storage.saved_machines:
            alias = storage.saved_machines[hostname].get('alias', hostname)
            del storage.saved_machines[hostname]
            storage.save_to_disk(config.MACHINES_FILE, storage.saved_machines)
            socketio.emit('machines_updated', storage.saved_machines, broadcast=True)
            socketio.emit('status', {'message': f"Machine '{alias}' deleted."})

@socketio.on('save_script')
def handle_save_script(data):
    """Saves or updates a script."""
    if session.get('logged_in'):
        name = data.get('name')
        original_name = data.get('original_name')

        if original_name and original_name != name and original_name in storage.saved_scripts:
            del storage.saved_scripts[original_name]
        
        if name:
            data.pop('original_name', None)
            storage.saved_scripts[name] = data.get('content')
            storage.save_to_disk(config.SCRIPTS_FILE, storage.saved_scripts)
            socketio.emit('scripts_updated', storage.saved_scripts, broadcast=True)
            socketio.emit('status', {'message': f"Script '{name}' saved/updated."})

@socketio.on('delete_script')
def handle_delete_script(data):
    """Deletes a script."""
    if session.get('logged_in'):
        name = data.get('name')
        if name and name in storage.saved_scripts:
            del storage.saved_scripts[name]
            storage.save_to_disk(config.SCRIPTS_FILE, storage.saved_scripts)
            socketio.emit('scripts_updated', storage.saved_scripts, broadcast=True)
            socketio.emit('status', {'message': f"Script '{name}' deleted."})

@socketio.on('run_command')
def handle_run_command(data):
    """Executes a shell command on one or more target machines."""
    if session.get('logged_in'):
        command = data.get('command')
        targets = data.get('targets', [])
        for hostname in targets:
            details = storage.saved_machines.get(hostname, {})
            client = get_ssh_client(hostname)
            if client:
                try:
                    stdin, stdout, stderr = client.exec_command(command)
                    output = ''.join(stdout.readlines()) + ''.join(stderr.readlines())
                    socketio.emit('command_output', {'output': output.strip(), 'hostname': hostname, 'alias': details.get('alias')})
                except Exception as e:
                    socketio.emit('status', {'message': f"Command failed on {details.get('alias', hostname)}: {e}"})

@socketio.on('run_script')
def handle_run_script(data):
    """Runs a saved script on one or more target machines."""
    if session.get('logged_in'):
        script_name = data.get('script_name')
        targets = data.get('targets', [])
        if script_name not in storage.saved_scripts:
            socketio.emit('status', {'message': f"Script '{script_name}' not found."})
            return
        command = storage.saved_scripts[script_name]
        # Re-use the command execution logic
        handle_run_command({'command': command, 'targets': targets})

@socketio.on('disconnect')
def on_disconnect():
    """Cleans up when a client disconnects."""
    close_all_connections()
