#!/usr/bin/env python3

from flask import Flask, render_template, request
from flask_socketio import SocketIO

import random
import logging
import threading
import time

# Global game state
def createTank(x, y, r, col, sid):
    return {
        'x': x,
        'y': y,
        'r': r,
        'col': col,
        'sid': sid,
        'angularVelocity': 0,
        'forwardVelocity': 0
    }
    
tanks = []

# Initialise the flask-socketio server
app = Flask(__name__)
app.config['SECRET_KEY'] = 'vnkdjnfjknfl1232#'
socketio = SocketIO(app, async_mode='threading')

# Stop the logger from continually printing GET requests
logging.getLogger('werkzeug').setLevel(logging.ERROR)


# Broadcast the state of the game every so often to avoid diversion
def broadcast():
    socketio.emit('s_broadcast', tanks)

def broadcast_loop():
    while True:
        broadcast()

        time.sleep(0.02)

# Function called when the browser loads the root page in the URL
@app.route('/')
def sessions():
    return render_template('tanks.html')


# Called when a new player arrives
@socketio.on('c_on_new_user_arrive')
def on_new_user_arrive(json, methods=['GET', 'POST']):
    print('recieved new user', request.sid, str(json))
    
    tanks.append(
        createTank(
            random.random(),
            random.random(),
            random.random() * 8,
            json['col'],
            request.sid
        )
    )

    socketio.emit('s_on_new_user_arrive', tanks)


@socketio.on('disconnect')
def on_user_leave_2(methods=['GET', 'POST']):
    print(f'user leaving {request.sid}')
    
    i = 0
    while i < len(tanks):
        if tanks[i]['sid'] == request.sid:
            del tanks[i]
        else:
            i += 1

    socketio.emit('s_on_user_leave', tanks)


@socketio.on('c_on_tank_move')
def on_tank_move(updated_tanks, methods=['GET', 'POST']):
    for i in range(len(updated_tanks)):
        if tanks[i]['sid'] == request.sid:
            tanks[i] = updated_tanks[i]

    # socketio.emit('s_on_tank_move', tanks)

if __name__ == '__main__':
    # Spawn separate thread to broadcast the state of the game to avoid divergence
    broadcast_thread = threading.Thread(target=broadcast_loop)

    broadcast_thread.start()

    socketio.run(app, debug=False)
