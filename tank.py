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
        self._sid = sid
        self._username = username

    def explode(self):
        self._js_data['isAlive'] = False

    def update_from_json(self, json):
        self._js_data = json

    def to_json(self):
        return self._js_data
