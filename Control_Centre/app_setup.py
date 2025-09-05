# app_setup.py
# Initializes the Flask application and the SocketIO server.

from flask import Flask
from flask_socketio import SocketIO
import config

# --- Flask App Initialization ---
# The 'static_folder' and 'template_folder' arguments tell Flask where to find these files.
app = Flask(__name__, template_folder='templates', static_folder='static')
app.config['SECRET_KEY'] = config.SECRET_KEY

# Initialize SocketIO with the Flask app
# The 'async_mode' is explicitly set, with 'eventlet' being a common choice for performance.
socketio = SocketIO(app, async_mode='eventlet')
