from tank import Tank

class GameState:
    def __init__(self):
        self._tanks = {}

    def add_tank(self, x, y, r, colour, name, sid):
        self._tanks[name] = Tank(x, y, r, colour, name, sid)

    def update_tank(self, tag, tank_json):
        self._tanks[tag].update_from_json(tank_json)

    def explode_tank(self, tag):
        self._tanks[tag].explode()

    def delete_tank(self, tag):
        del self._tanks[tag]

    def get_tank(self, tag):
        return self._tanks[tag]

    def tanks_json(self):
        return {tag: self._tanks[tag].to_json() for tag in self._tanks}
