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
def broadcast_function():
    while True:
        socketio.emit('s_broadcast', tanks)
        time.sleep(1)

# Function called when the browser loads the root page in the URL
@app.route('/')
def sessions():
    return render_template('tanks.html')


# Called when a new player arrives
@socketio.on('c_new_user')
def handle_my_custom_event(json, methods=['GET', 'POST']):
    print('recieved new user', str(json))

    socketio.emit('s_new_user', json)


@socketio.on('c_on_tank_move')
def handle_my_custom_event(json, methods=['GET', 'POST']):
    print('received my event: ' + str(json))
    socketio.emit('my response', json)

if __name__ == '__main__':
    # Spawn separate thread to broadcast the state of the game to avoid divergence
    broadcast_thread = threading.Thread(target=broadcast_function)

    broadcast_thread.start()

    socketio.run(app, debug=False)
