#!/usr/bin/env python3

""" Main module of the server. """

import logging
import threading
import time

from flask import Flask, render_template, request
from flask_socketio import SocketIO
from engineio.payload import Payload

from game_state import GameState


game_state = GameState() # pylint: disable=invalid-name

# Initialise the flask-socketio server
app = Flask(__name__) # pylint: disable=invalid-name
app.config['SECRET_KEY'] = 'vnkdjnfjknfl1232#'
socketio = SocketIO(app, async_mode='threading') # pylint: disable=invalid-name

Payload.max_decode_packets = 15

# Stop the logger from continually printing GET requests
logging.getLogger('werkzeug').setLevel(logging.ERROR)


# Function called when the browser loads the root page in the URL
@app.route('/')
def render_landing_page():
    """ Renders the landing page of the game. """

    return render_template('landing-page.html')


@app.route('/tanks')
def render_game_page():
    """ Renders the gameplay page of the game. """

    return render_template('tanks.html')


def start_new_game(expected_game_count):
    """
    Called as a callback when one or no tanks are left.  Will sometimes be called twice to start
    the same game, but this is handled by using `expected_game_count` to check that no game has
    been created since the timer was created.
    """

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


def broadcast():
    """ Broadcast the entire state of the tanks to the clients, to avoid diversion. """
    socketio.emit('s_broadcast', game_state.tanks_json())


def broadcast_loop():
    """ Calls `broadcast` twice a second. """

    while True:
        broadcast()

        time.sleep(0.5)


# Called when a new player arrives
@socketio.on('c_on_new_user_arrive')
def on_new_user_arrive(json):
    """ Called when a new user arrives in the game. """

    print('recieved new user', request.sid, str(json))

    username = json['name']

    if game_state.has_tank(username):
        game_state.get_tank(username).login_count += 1
        game_state.get_tank(username).set_colour(json['colour'])
    else:
        game_state.add_tank(
            json['colour'],
            username,
            request.sid
        )

    state_json = game_state.entire_state_json()

    state_json['newUserTag'] = json['name']

    socketio.emit('s_on_new_user_arrive', state_json)


@socketio.on('disconnect')
def on_user_leave():
    """ Called when a user disconnects from the game. """

    print(f'user leaving {request.sid}')

    tags = game_state.on_disconnect(request.sid)

    socketio.emit('s_on_user_leave', tags)


@socketio.on('c_on_tank_move')
def on_tank_move(tank_data):
    """ Called when a tank moves. """

    game_state.update_tank(tank_data['tag'], tank_data['newState'])

    socketio.emit('s_on_tank_move', tank_data)


@socketio.on('c_on_tank_explode')
def on_tank_explode(data):
    """ Called when a tank explodes. """

    socketio.emit('s_on_tank_explode', data)

    game_state.explode_tank(data['tankTag'], data['projectileTag'])

    num_tanks_alive = len(game_state.tanks_still_alive())
    if num_tanks_alive == 1:
        threading.Timer(5, start_new_game, [game_state.game_count]).start()

        print("One tank remaining")
    elif num_tanks_alive == 0:
        threading.Timer(1, start_new_game, [game_state.game_count]).start()

        print("No tanks remaining")


@socketio.on('c_spawn_projectile')
def on_spawn_projectile(data):
    """ Called when a projectile is shot. """

    socketio.emit('s_spawn_projectile', data)

    game_state.add_projectile(data['id'], data['projectile'])


if __name__ == '__main__':
    # Spawn separate thread to broadcast the state of the game to avoid divergence
    threading.Thread(target=broadcast_loop).start()

    game_state.start_new_game()

    socketio.run(app, host='0.0.0.0', debug=False)
