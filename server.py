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


# Start a new game (expected_game_count is used to avoid double-starting a game when the last tank
# standing is blown up before the game restarts, and so there will be two calls to this function)
def start_new_game(expected_game_count):
    global game_state

    if game_state.game_count == expected_game_count:
        print("Starting new game.")

        # Update game count so that any more queued calls to this function will fail and not cause
        # the game to restart multiple times
        game_state.game_count += 1

        game_state.update_score()
        game_state.start_new_game()

        socketio.emit('s_start_new_game', game_state.entire_state_json())
    else:
        print("Already started this game.")

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
        username = json['name']

        if game_state.has_tank(username):
            game_state.get_tank(username).login_count += 1
        else:
            game_state.add_tank(
                json['colour'],
                username,
                request.sid
            )

        state_json = game_state.entire_state_json()

        state_json['newUserTag'] = json['name']

        socketio.emit('s_on_new_user_arrive', state_json)
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
    game_state.update_tank(tank_data['tag'], tank_data['newState'])

    tankLock.acquire()
    try:
        socketio.emit('s_on_tank_move', tank_data)
    finally:
        tankLock.release()

@socketio.on('c_on_tank_explode')
def on_tank_explode(data):
    socketio.emit('s_on_tank_explode', data);

    tankLock.acquire()
    try:
        game_state.explode_tank(data['tankTag'], data['projectileTag'])

        num_tanks_alive = len(game_state.tanks_still_alive())
        if num_tanks_alive == 1:
            threading.Timer(5, start_new_game, [game_state.game_count]).start()

            print("One tank remaining")
        elif num_tanks_alive == 0:
            threading.Timer(1, start_new_game, [game_state.game_count]).start()

            print("No tanks remaining")
    finally:
        tankLock.release()

@socketio.on('c_spawn_projectile')
def on_spawn_projectile(data):
    socketio.emit('s_spawn_projectile', data)

    game_state.add_projectile(data['id'], data['projectile'])

if __name__ == '__main__':
    # Spawn separate thread to broadcast the state of the game to avoid divergence
    broadcast_thread = threading.Thread(target=broadcast_loop)
    broadcast_thread.start()

    game_state.start_new_game()

    socketio.run(app, host='0.0.0.0', debug=False)
