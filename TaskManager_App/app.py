# app.py
from flask import Flask, render_template, request, redirect, url_for, flash, session, jsonify
import requests
import os
from functools import wraps
from dotenv import load_dotenv
from flask_debugtoolbar import DebugToolbarExtension
from flask_cors import CORS
from flask import Flask, request, jsonify
from functools import wraps
import logging
import time
from datetime import datetime
import json

# Load environment variables
load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', 'dev-secret-key')
app.debug = True
toolbar = DebugToolbarExtension(app)

CORS(app)

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    filename='api_logs.log'  # or omit for console output
)
logger = logging.getLogger('api_logger')

# Store the original request function
original_request = requests.request

# Create a wrapper function that logs requests and responses
@wraps(original_request)
def logging_request(method, url, **kwargs):
    # Log request
    start_time = time.time()
    
    # Remove sensitive info from headers for logging
    headers = kwargs.get('headers', {})
    safe_headers = headers.copy() if headers else {}
    if 'Authorization' in safe_headers:
        safe_headers['Authorization'] = 'Bearer [REDACTED]'
    
    log_data = {
        'method': method,
        'url': url,
        'headers': safe_headers,
    }
    
    if 'data' in kwargs:
        log_data['request_body'] = kwargs['data']
    if 'json' in kwargs:
        log_data['request_json'] = kwargs['json']
    if 'params' in kwargs:
        log_data['params'] = kwargs['params']
        
    logger.info(f"API Request: {json.dumps(log_data)}")
    
    # Make the actual request
    response = original_request(method, url, **kwargs)
    
    # Log response
    duration = time.time() - start_time
    
    try:
        response_body = response.json()
    except:
        response_body = "Non-JSON response"
    
    log_data = {
        'method': method,
        'url': url,
        'status_code': response.status_code,
        'duration_ms': round(duration * 1000, 2),
        'response_body': response_body
    }
    
    logger.info(f"API Response: {json.dumps(log_data)}")
    
    return response

# Replace the original request function with our logging version
requests.request = logging_request

# Patch GET method
original_get = requests.get
@wraps(original_get)
def logging_get(url, **kwargs):
    return logging_request('GET', url, **kwargs)
requests.get = logging_get

# Patch POST method
original_post = requests.post
@wraps(original_post)
def logging_post(url, **kwargs):
    return logging_request('POST', url, **kwargs)
requests.post = logging_post

# Patch PUT method
original_put = requests.put
@wraps(original_put)
def logging_put(url, **kwargs):
    return logging_request('PUT', url, **kwargs)
requests.put = logging_put

# Patch DELETE method
original_delete = requests.delete
@wraps(original_delete)
def logging_delete(url, **kwargs):
    return logging_request('DELETE', url, **kwargs)
requests.delete = logging_delete

# API base URL
API_BASE_URL = os.getenv('API_BASE_URL', 'http://localhost:3000')

# Decorator for routes that require authentication
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'token' not in session:
            flash('Please log in to access this page', 'danger')
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

# Helper functions
def get_headers():
    return {"Authorization": f"Bearer {session.get('token', '')}"}

# Routes
@app.route('/')
def index():
    if 'token' in session:
        return redirect(url_for('dashboard'))
    return render_template('index.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        data = {
            'name': request.form.get('name'),
            'email': request.form.get('email'),
            'password': request.form.get('password'),
            'age': request.form.get('age')
        }
        
        try:
            response = requests.post(f"{API_BASE_URL}/user/register", json=data)
            if response.status_code == 201:
                flash('Registration successful! Please log in.', 'success')
                return redirect(url_for('login'))
            else:
                flash(f'Registration failed: {response.json().get("error", "Unknown error")}', 'danger')
        except requests.RequestException as e:
            flash(f'Error connecting to server: {str(e)}', 'danger')
    
    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        data = {
            'email': request.form.get('email'),
            'password': request.form.get('password')
        }
        
        try:
            response = requests.post(f"{API_BASE_URL}/user/login", json=data)
            if response.status_code == 200:
                response_data = response.json()
                session['token'] = response_data.get('token')
                session['user_id'] = response_data.get('user', {}).get('_id')
                flash('Login successful!', 'success')
                return redirect(url_for('dashboard'))
            else:
                flash(f'Login failed: {response.json().get("error", "Invalid credentials")}', 'danger')
        except requests.RequestException as e:
            flash(f'Error connecting to server: {str(e)}', 'danger')
    
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    try:
        response = requests.post(
            f"{API_BASE_URL}/user/logout", 
            headers=get_headers()
        )
    except requests.RequestException:
        # Even if API logout fails, clear the session
        pass
    
    session.clear()
    flash('You have been logged out', 'info')
    return redirect(url_for('index'))

@app.route('/dashboard')
@login_required
def dashboard():
    try:
        # Get user profile
        user_response = requests.get(
            f"{API_BASE_URL}/user/me", 
            headers=get_headers()
        )
        
        # Get tasks
        tasks_response = requests.get(
            f"{API_BASE_URL}/task", 
            headers=get_headers()
        )
        
        if user_response.status_code == 200 and tasks_response.status_code == 200:
            user = user_response.json()
            tasks = tasks_response.json()
            return render_template('dashboard.html', user=user, tasks=tasks)
        else:
            flash('Failed to fetch data. Please log in again.', 'danger')
            session.clear()
            return redirect(url_for('login'))
    except requests.RequestException as e:
        flash(f'Error connecting to server: {str(e)}', 'danger')
        return redirect(url_for('index'))

@app.route('/profile')
@login_required
def profile():
    try:
        response = requests.get(
            f"{API_BASE_URL}/user/me", 
            headers=get_headers()
        )
        
        if response.status_code == 200:
            user = response.json()
            return render_template('profile.html', user=user)
        else:
            flash('Failed to fetch profile. Please log in again.', 'danger')
            session.clear()
            return redirect(url_for('login'))
    except requests.RequestException as e:
        flash(f'Error connecting to server: {str(e)}', 'danger')
        return redirect(url_for('dashboard'))

@app.route('/profile/update', methods=['POST'])
@login_required
def update_profile():
    data = {
        'name': request.form.get('name'),
        'age': request.form.get('age')
    }
    
    try:
        response = requests.put(
            f"{API_BASE_URL}/user/me", 
            json=data, 
            headers=get_headers()
        )
        
        if response.status_code == 200:
            flash('Profile updated successfully!', 'success')
        else:
            flash(f'Failed to update profile: {response.json().get("error", "Unknown error")}', 'danger')
    except requests.RequestException as e:
        flash(f'Error connecting to server: {str(e)}', 'danger')
    
    return redirect(url_for('profile'))

@app.route('/profile/avatar', methods=['POST'])
@login_required
def upload_avatar():
    if 'avatar' not in request.files:
        flash('No file part', 'danger')
        return redirect(url_for('profile'))
        
    file = request.files['avatar']
    
    if file.filename == '':
        flash('No selected file', 'danger')
        return redirect(url_for('profile'))
    
    try:
        files = {'avatar': (file.filename, file.read(), file.content_type)}
        response = requests.post(
            f"{API_BASE_URL}/user/me/avatar", 
            files=files,
            headers=get_headers()
        )
        
        if response.status_code == 200:
            flash('Avatar uploaded successfully!', 'success')
        else:
            flash(f'Failed to upload avatar: {response.json().get("error", "Unknown error")}', 'danger')
    except requests.RequestException as e:
        flash(f'Error connecting to server: {str(e)}', 'danger')
    
    return redirect(url_for('profile'))

@app.route('/profile/avatar/delete', methods=['POST'])
@login_required
def delete_avatar():
    try:
        response = requests.delete(
            f"{API_BASE_URL}/user/me/avatar", 
            headers=get_headers()
        )
        
        if response.status_code == 200:
            flash('Avatar deleted successfully!', 'success')
        else:
            flash(f'Failed to delete avatar: {response.json().get("error", "Unknown error")}', 'danger')
    except requests.RequestException as e:
        flash(f'Error connecting to server: {str(e)}', 'danger')
    
    return redirect(url_for('profile'))

@app.route('/tasks')
@login_required
def tasks():
    try:
        response = requests.get(
            f"{API_BASE_URL}/task", 
            headers=get_headers()
        )
        
        if response.status_code == 200:
            tasks = response.json()
            return render_template('tasks.html', tasks=tasks)
        else:
            flash(f'Failed to fetch tasks: {response.json().get("error", "Unknown error")}', 'danger')
            return redirect(url_for('dashboard'))
    except requests.RequestException as e:
        flash(f'Error connecting to server: {str(e)}', 'danger')
        return redirect(url_for('dashboard'))

@app.route('/tasks/add', methods=['POST'])
@login_required
def add_task():
    data = {
        'description': request.form.get('description')
    }
    
    try:
        response = requests.post(
            f"{API_BASE_URL}/task", 
            json=data, 
            headers=get_headers()
        )
        
        if response.status_code == 201:
            flash('Task added successfully!', 'success')
        else:
            flash(f'Failed to add task: {response.json().get("error", "Unknown error")}', 'danger')
    except requests.RequestException as e:
        flash(f'Error connecting to server: {str(e)}', 'danger')
    
    return redirect(url_for('tasks'))

@app.route('/tasks/<task_id>/update', methods=['POST'])
@login_required
def update_task(task_id):
    data = {
        'description': request.form.get('description'),
        'completed': True if request.form.get('completed') == 'on' else False
    }
    
    try:
        response = requests.put(
            f"{API_BASE_URL}/task/{task_id}", 
            json=data, 
            headers=get_headers()
        )
        
        if response.status_code == 200:
            flash('Task updated successfully!', 'success')
        else:
            flash(f'Failed to update task: {response.json().get("error", "Unknown error")}', 'danger')
    except requests.RequestException as e:
        flash(f'Error connecting to server: {str(e)}', 'danger')
    
    return redirect(url_for('tasks'))

@app.route('/tasks/<task_id>/delete', methods=['POST'])
@login_required
def delete_task(task_id):
    try:
        response = requests.delete(
            f"{API_BASE_URL}/task/{task_id}", 
            headers=get_headers()
        )
        
        if response.status_code == 200:
            flash('Task deleted successfully!', 'success')
        else:
            flash(f'Failed to delete task: {response.json().get("error", "Unknown error")}', 'danger')
    except requests.RequestException as e:
        flash(f'Error connecting to server: {str(e)}', 'danger')
    
    return redirect(url_for('tasks'))

@app.route('/tasks/toggle/<task_id>', methods=['POST'])
@login_required
def toggle_task(task_id):
    try:
        # First get the current task
        task_response = requests.get(
            f"{API_BASE_URL}/task/{task_id}", 
            headers=get_headers()
        )
        
        if task_response.status_code == 200:
            task = task_response.json()
            completed = not task.get('completed', False)
            
            # Update the task
            update_response = requests.put(
                f"{API_BASE_URL}/task/{task_id}", 
                json={'completed': completed}, 
                headers=get_headers()
            )
            
            if update_response.status_code == 200:
                return jsonify({'success': True})
            else:
                return jsonify({'success': False, 'error': 'Failed to update task'}), 400
        else:
            return jsonify({'success': False, 'error': 'Task not found'}), 404
    except requests.RequestException as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/account/delete', methods=['POST'])
@login_required
def delete_account():
    try:
        response = requests.delete(
            f"{API_BASE_URL}/user/me", 
            headers=get_headers()
        )
        
        if response.status_code == 200:
            session.clear()
            flash('Your account has been deleted successfully', 'success')
            return redirect(url_for('index'))
        else:
            flash(f'Failed to delete account: {response.json().get("error", "Unknown error")}', 'danger')
            return redirect(url_for('profile'))
    except requests.RequestException as e:
        flash(f'Error connecting to server: {str(e)}', 'danger')
        return redirect(url_for('profile'))

if __name__ == '__main__':
    app.run(debug=True, port=5000)