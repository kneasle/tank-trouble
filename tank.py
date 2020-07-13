""" Module to encapsulate the data stored about a single tank. """


class Tank:
    """ A class representing a single tank stored by the server. """

    def __init__(self, x, y, r, col, username, sid):
        self._js_data = {
            'x': x,
            'y': y,
            'r': r,
            'col': col,
            'angularVelocity': 0,
            'forwardVelocity': 0,
            'isAlive': True,
            'destructionTime': 0
        }
        self._username = username
        self.login_count = 1
        self.sid = sid

    def respawn(self, x, y, r):
        """ Respawn the tank by overwriting the location, and setting it to be alive. """

        self._js_data['isAlive'] = True
        self._js_data['x'] = x
        self._js_data['y'] = y
        self._js_data['r'] = r

    def explode(self):
        """ Blow up this tank. """

        self._js_data['isAlive'] = False

    def is_alive(self):
        """ Returns true if this tank hasn't been blown up yet this game. """

        return self._js_data['isAlive']

    def set_colour(self, new_colour):
        """ Set the colour of the tank. """

        self._js_data['col'] = new_colour

    def update_from_json(self, json):
        """ Update the attributes given in `json`. """

        for k in json:
            self._js_data[k] = json[k]

    def to_json(self):
        """ Serialise to JSON. """

        return self._js_data
