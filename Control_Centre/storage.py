# storage.py
# Manages persistent data storage in JSON files.

import os
import json
import config

# --- Global State Management ---
# These dictionaries will hold the application's data in memory.
saved_machines = {}
saved_scripts = {}
global_ssh_key = {}

def load_data():
    """Loads all saved data from JSON files into memory at startup."""
    global saved_machines, saved_scripts, global_ssh_key
    
    # A list of tuples to define what to load.
    # (file_path, dictionary_to_load_into, descriptive_name)
    files_to_load = [
        (config.MACHINES_FILE, 'saved_machines', 'machines'),
        (config.SCRIPTS_FILE, 'saved_scripts', 'scripts'),
        (config.GLOBAL_KEY_FILE, 'global_ssh_key', 'global key')
    ]

    for file_path, data_dict_name, name in files_to_load:
        try:
            if os.path.exists(file_path):
                with open(file_path, 'r') as f:
                    # Use globals() to dynamically get the variable by its string name
                    globals()[data_dict_name] = json.load(f)
        except (IOError, json.JSONDecodeError) as e:
            print(f"Warning: Could not load {name} file: {e}")
            globals()[data_dict_name] = {}

def save_to_disk(file_path, data):
    """Saves a given dictionary to a specified JSON file."""
    try:
        with open(file_path, 'w') as f:
            json.dump(data, f, indent=4)
    except IOError as e:
        print(f"Error saving file {file_path}: {e}")
