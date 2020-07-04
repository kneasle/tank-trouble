#!/usr/bin/env python3

from flask import Flask, render_template
from flask_socketio import SocketIO
import threading
import time

# Global game state
def createTank(x, y, r, col):
    return {
        'x': x,
        'y': y,
        'r': r,
        'col': col,
        'angularVelocity': 0,
        'forwardVelocity': 0
    }
    
tanks = [
    createTank(0.5, 0.5, 1.7, "lime"),
    createTank(0.4, 1.7, 0.5, "blue")
]

# Initialise the flask-socketio server
app = Flask(__name__)
app.config['SECRET_KEY'] = 'vnkdjnfjknfl1232#'
socketio = SocketIO(app, async_mode='threading')


# Broadcast the state of the game every so often to avoid diversion
def broadcast():
    socketio.emit('s_broadcast', tanks)

def broadcast_loop():
    while True:
        broadcast()
        time.sleep(0.1)

# Function called when the browser loads the root page in the URL
@app.route('/')
def sessions():
    return render_template('tanks.html')


# Called when a new player arrives
@socketio.on('c_new_user')
def on_new_user(json, methods=['GET', 'POST']):
    print('recieved new user', str(json))


@socketio.on('c_on_tank_move')
def on_tank_move(json, methods=['GET', 'POST']):
    tanks[json['index']] = json['tank']

if __name__ == '__main__':
    # Spawn separate thread to broadcast the state of the game to avoid divergence
    broadcast_thread = threading.Thread(target=broadcast_loop)

    broadcast_thread.start()

    socketio.run(app, debug=False)
