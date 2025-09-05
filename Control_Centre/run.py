# run.py
# The main entry point for the SSH Command Centre application.

# Import the app and socketio instances from our setup file
from app_setup import app, socketio

# Import modules to register their routes and event handlers
import routes
import sockets
from storage import load_data

# --- Main Execution ---
if __name__ == '__main__':
    # Load all saved data from JSON files when the server starts
    print("Loading initial data...")
    load_data()
    
    # Run the application
    # Using eventlet is recommended for SocketIO performance.
    # The host '0.0.0.0' makes the server accessible on your local network.
    print("Starting SSH Command Centre server...")
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
