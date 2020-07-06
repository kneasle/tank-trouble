from tank import Tank

class GameState:
    def __init__(self):
        self._tanks = {}

    def add_tank(self, x, y, r, colour, name, sid):
        self._tanks[sid] = Tank(x, y, r, colour, name, sid)

    def update_tank(self, sid, tank_json):
        self._tanks[sid].update_from_json(tank_json)

    def explode_tank(self, sid):
        self._tanks[sid].explode()

    def delete_tank(self, sid):
        del self._tanks[sid]

    def get_tank(self, sid):
        return self._tanks[sid]

    def tanks_json(self):
        return {k: self._tanks[k].to_json() for k in self._tanks}
