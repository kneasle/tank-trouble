from tank import Tank

class GameState:
    def __init__(self):
        self._tanks = {}
        self._scoreboard = {}

    # Tank editing functions
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

    def has_tank(self, tag):
        return tag in self._tanks

    def on_disconnect(self, sid):
        kicked_tags = []

        # Search to find out which tanks are attached to the sid that has disconnected.
        for tag in self._tanks:
            tank = self._tanks[tag]

            if tank._sid == sid:
                # The tank has been disconnected, so subtract its login count by one
                tank.login_count -= 1

                if tank.login_count == 0:
                    kicked_tags.append(tag)

                    del self._tanks[tag]

        return kicked_tags

    # Game start and stop stuff
    def tanks_still_alive(self):
        return [tag for tag in self._tanks if self._tanks[tag]._js_data['isAlive']]

    def start_new_game(self):
        print("Starting new game")

    def finish_game(self, winner):
        print(f"{winner or 'No-one'} won.")

    # JSON exporting stuff
    def tanks_json(self):
        return {tag: self._tanks[tag].to_json() for tag in self._tanks}
