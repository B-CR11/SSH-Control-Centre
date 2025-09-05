# routes.py
# Handles the web page routing for the application.

from flask import render_template, request, session, redirect, url_for, flash
from app_setup import app
import config

@app.route('/')
def index():
    """Renders the main application page if logged in, otherwise redirects to login."""
    if not session.get('logged_in'):
        return redirect(url_for('login'))
    # Instead of rendering a string, render the actual HTML file.
    return render_template('index.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    """Handles the login process."""
    if request.method == 'POST':
        # Check credentials against the ones in the config file.
        if request.form['username'] == config.USERNAME and request.form['password'] == config.PASSWORD:
            session['logged_in'] = True
            return redirect(url_for('index'))
        else:
            flash('Invalid credentials. Please try again.')
    # Render the login page template.
    return render_template('login.html')

@app.route('/logout')
def logout():
    """Logs the user out by clearing the session."""
    session.pop('logged_in', None)
    return redirect(url_for('login'))
