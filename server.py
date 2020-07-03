#!/usr/bin/env python3

from flask import Flask, render_template
from flask_socketio import SocketIO

# Initialise the flask-socketio server
app = Flask(__name__)
app.config['SECRET_KEY'] = 'vnkdjnfjknfl1232#'
socketio = SocketIO(app)

# Function called when the browser loads the root page in the URL
@app.route('/')
def sessions():
    return render_template('tanks.html')


# Called when a new player arrives
@socketio.on('c_new_user')
def handle_my_custom_event(json, methods=['GET', 'POST']):
    print('recieved new user', str(json))

    socketio.emit('s_new_user', json)


@socketio.on('my event')
def handle_my_custom_event(json, methods=['GET', 'POST']):
    print('received my event: ' + str(json))
    socketio.emit('my response', json)

if __name__ == '__main__':
    socketio.run(app, debug=True)
