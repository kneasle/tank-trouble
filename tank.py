class Tank:
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
        self._js_data['isAlive'] = True
        self._js_data['x'] = x
        self._js_data['y'] = y
        self._js_data['r'] = r


    def explode(self):
        self._js_data['isAlive'] = False


    def is_alive(self):
        return self._js_data['isAlive']


    def update_from_json(self, json):
        for k in json:
            self._js_data[k] = json[k]


    def to_json(self):
        return self._js_data
