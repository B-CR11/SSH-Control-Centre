# config.py
# This file contains the configuration settings for the application.

import os

# A strong secret key is required for session management
SECRET_KEY = os.urandom(24)

# --- User Credentials ---
# IMPORTANT: Change these default credentials for security
USERNAME = 'Admin'
PASSWORD = 'qNxUQhDPnxsctRJvF2fxkrxHfn'

# --- Persistent Storage Setup ---
# Defines the filenames for storing data
MACHINES_FILE = 'machines.json'
SCRIPTS_FILE = 'scripts.json'
GLOBAL_KEY_FILE = 'global_key.json'
