#!/usr/bin/env python3

import random
import logging
import threading
import time

from flask import Flask, render_template, request
from flask_socketio import SocketIO
from engineio.payload import Payload

from game_state import GameState

# A lock to make sure that only one thread can access the tanks array at one time, to avoid
# painful race conditions when people leave the server
tankLock = threading.Lock()
game_state = GameState()

# Initialise the flask-socketio server
app = Flask(__name__)
app.config['SECRET_KEY'] = 'vnkdjnfjknfl1232#'
socketio = SocketIO(app, async_mode='threading')

Payload.max_decode_packets = 15

# Stop the logger from continually printing GET requests
logging.getLogger('werkzeug').setLevel(logging.ERROR)


# Function called when the browser loads the root page in the URL
@app.route('/')
def display_landing_page():
    return render_template('landing-page.html')

@app.route('/tanks')
def display_tanks():
    return render_template('tanks.html')


# Broadcast the state of the game every so often to avoid diversion
def broadcast():
    socketio.emit('s_broadcast', game_state.tanks_json())

def broadcast_loop():
    while True:
        broadcast()

        time.sleep(0.5)


# Called when a new player arrives
@socketio.on('c_on_new_user_arrive')
def on_new_user_arrive(json):
    print('recieved new user', request.sid, str(json))

    tankLock.acquire()
    try:
        game_state.add_tank(
            random.random(),
            random.random(),
            random.random() * 8,
            json['colour'],
            json['name'],
            request.sid
        )

        socketio.emit('s_on_new_user_arrive', game_state.tanks_json())
    finally:
        tankLock.release()


@socketio.on('disconnect')
def on_user_leave_2():
    print(f'user leaving {request.sid}')

    tankLock.acquire()
    try:
        tags = game_state.on_disconnect(request.sid)

        socketio.emit('s_on_user_leave', tags)
    finally:
        tankLock.release()


@socketio.on('c_on_tank_move')
def on_tank_move(tank_data):
    tankLock.acquire()
    try:
        game_state.update_tank(tank_data['tag'], tank_data['newState'])

        socketio.emit('s_on_tank_move', tank_data)
    finally:
        tankLock.release()

@socketio.on('c_on_tank_explode')
def on_tank_explode(data):
    socketio.emit('s_on_tank_explode', {'tank': request.sid, 'projectile': data['projectile']})

    tankLock.acquire()
    try:
        game_state.explode_tank(request.sid)

        num_tanks_alive = len(game_state.tanks_still_alive())
        if num_tanks_alive == 1:
            print("One tank remaining")
        elif num_tanks_alive == 0:
            print("No tanks remaining")
    finally:
        tankLock.release()

@socketio.on('c_spawn_projectile')
def on_spawn_projectile(data):
    socketio.emit('s_spawn_projectile', data)

if __name__ == '__main__':
    # Spawn separate thread to broadcast the state of the game to avoid divergence
    broadcast_thread = threading.Thread(target=broadcast_loop)
    broadcast_thread.start()

    socketio.run(app, debug=False)
