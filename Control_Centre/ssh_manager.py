# ssh_manager.py
# Manages SSH connections using Paramiko.

import paramiko
from io import StringIO
from app_setup import socketio
import storage # Import the storage module to access saved data

# --- SSH Client Management ---
# This dictionary will store active SSH client objects.
ssh_clients = {}

def get_ssh_client(hostname):
    """
    Gets an active SSH client for a given hostname.
    If a client exists and is active, it's returned.
    Otherwise, a new connection is attempted.
    """
    # Check if a valid, active client already exists in our cache.
    if hostname in ssh_clients and ssh_clients[hostname].get_transport() and ssh_clients[hostname].get_transport().is_active():
        return ssh_clients[hostname]

    if hostname not in storage.saved_machines:
        socketio.emit('status', {'message': f"Connection details for {hostname} not found."})
        return None

    try:
        details = storage.saved_machines[hostname]
        key_str = None
        
        # Determine whether to use the global key or a machine-specific key
        if details.get('use_global_key'):
            key_str = storage.global_ssh_key.get('key')
            if not key_str:
                msg = f"Machine {details.get('alias', hostname)} is set to use global key, but no global key is saved."
                socketio.emit('status', {'message': msg})
                return None
        else:
            key_str = details.get('ssh_key')

        if not key_str:
            msg = f"No SSH key found for machine {details.get('alias', hostname)}."
            socketio.emit('status', {'message': msg})
            return None

        # Paramiko needs a file-like object for the key
        key_file_obj = StringIO(key_str)
        pkey = None
        # List of key types Paramiko supports, to try one by one
        key_classes = [paramiko.Ed25519Key, paramiko.ECDSAKey, paramiko.RSAKey, paramiko.DSSKey]
        
        for key_class in key_classes:
            try:
                key_file_obj.seek(0) # Reset file pointer for each attempt
                pkey = key_class.from_private_key(key_file_obj)
                break # Stop if a key is successfully loaded
            except paramiko.SSHException:
                continue # Try the next key type if this one fails

        if pkey is None:
            msg = f"Could not load private key for {details.get('alias', hostname)}. Unsupported format or password protected."
            socketio.emit('status', {'message': msg})
            return None

        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        
        socketio.emit('status', {'message': f"Connecting to {details.get('alias', hostname)}..."})
        client.connect(hostname, port=int(details['port']), username=details['username'], pkey=pkey, timeout=10)
        
        ssh_clients[hostname] = client # Cache the new client
        socketio.emit('status', {'message': f"Connection to {details.get('alias', hostname)} successful."})
        return client
    except Exception as e:
        socketio.emit('status', {'message': f"Failed to connect to {details.get('alias', hostname)}: {e}"})
        if hostname in ssh_clients:
            del ssh_clients[hostname] # Clean up failed connection attempt
        return None

def close_all_connections():
    """Closes all active SSH connections."""
    global ssh_clients
    for hostname, client in ssh_clients.items():
        try:
            client.close()
        except:
            pass # Ignore errors on close
    ssh_clients = {}
    print("All SSH connections closed.")
