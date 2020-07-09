"""
Module to encapsulate the state of the game, so that server.py only has to worry about the socketio
connections.
"""

import math
import random
import time

import maze_gen
from tank import Tank


BULLET_DESPAWN_TIME = 5


class GameState:
    """ A (singleton) class to store the entire state of the game. """

    def __init__(self):
        self._tanks = {}
        self._scoreboard = {}
        self.game_count = 0

        self._maze_walls = []
        self._maze_width = 0
        self._maze_height = 0

        self._projectiles = {}


    # Tank editing functions
    def add_tank(self, colour, name, sid):
        """ Add a new tank, and spawn it in an appropriate location. """

        (x, y) = self._get_all_centres_shuffled()[0]

        self._tanks[name] = Tank(x, y, random.random() * math.pi * 2, colour, name, sid)
        self._scoreboard[name] = 0


    def update_tank(self, tag, tank_json):
        """ Update a tank with some JSON data given by a client. """

        self._tanks[tag].update_from_json(tank_json)


    def explode_tank(self, tag, projectile_tag):
        """ Blow up a tank, and remove the projectile that blew it up. """

        self._tanks[tag].explode()

        del self._projectiles[projectile_tag]

        self.update_projectiles()


    def delete_tank(self, tag):
        """ Permanently delete a tank from the game. """

        del self._tanks[tag]

        # Don't delete the scoreboard in case the tank arrives back into the game


    def get_tank(self, tag):
        """ Returns the tank with a given tag. """

        return self._tanks[tag]


    def has_tank(self, tag):
        """ Returns true if a tank with the given tag is in the game. """

        return tag in self._tanks


    def add_projectile(self, tag, json):
        """ Spawns a new projectile given JSON data from the client. """

        self._projectiles[tag] = json

        self.update_projectiles()


    def on_disconnect(self, sid):
        """ Called when a given sid disconnects. """

        kicked_tags = []

        # Search to find out which tanks are attached to the sid that has disconnected.
        for tag in self._tanks:
            tank = self._tanks[tag]

            if tank.sid == sid:
                # The tank has been disconnected, so subtract its login count by one
                tank.login_count -= 1

                if tank.login_count == 0:
                    kicked_tags.append(tag)

                    del self._tanks[tag]

        return kicked_tags


    # Game start and stop stuff
    def tanks_still_alive(self):
        """ Returns a list of all the surviving tanks. """

        return [tag for tag in self._tanks if self._tanks[tag].is_alive()]


    def start_new_game(self):
        """ Starts a new game. """

        self._generate_maze()

        centres = self._get_all_centres_shuffled()

        for t in self._tanks:
            (x, y) = centres.pop()

            self._tanks[t].respawn(x, y, random.random() * math.pi * 2)

        self._projectiles = {}


    def _get_all_centres_shuffled(self):
        """
        Returns all the possible centres in the game, in some random order.  Used for deciding
        where to spawn new tanks.
        """

        centres = [
            (x + 0.5, y + 0.5)
            for x in range(self._maze_width)
            for y in range(self._maze_height)
        ]

        random.shuffle(centres)

        return centres


    def _generate_maze(self):
        """ Rewrite the maze variables of `self` with a new random maze. """

        self._maze_width = 10
        self._maze_height = 5

        # Generate maze
        maze = maze_gen.generate_maze(self._maze_width, self._maze_height)
        maze_gen.print_maze(maze)

        self._maze_walls = maze_gen.generate_walls_from_maze(
            self._maze_width,
            self._maze_height,
            maze
        )

    def update_score(self):
        """ Update the score, assuming that the game has just finished. """

        tanks_alive = self.tanks_still_alive()

        if len(tanks_alive) == 1:
            self._scoreboard[tanks_alive[0]] += 1
        else:
            print("Game was a draw.")

            assert tanks_alive == []


    def update_projectiles(self):
        """ Update all the projectiles, despawning the ones that have outlived their lifetime. """

        tags_to_despawn = []

        for tag in self._projectiles:
            if self._projectiles[tag]['spawnTime'] / 1000 + BULLET_DESPAWN_TIME < time.time():
                tags_to_despawn.append(tag)

        for t in tags_to_despawn:
            del self._projectiles[t]


    # JSON exporting stuff
    def tanks_json(self):
        """ Returns the state of just the tanks in JSON. """

        return {tag: self._tanks[tag].to_json() for tag in self._tanks}


    def entire_state_json(self):
        """ Returns the state of the entire game in JSON. """

        return {
            'width': self._maze_width,
            'height': self._maze_height,
            'maze': {
                'width': self._maze_width,
                'height': self._maze_height,
                'walls': [w.to_json() for w in self._maze_walls]
            },
            'tanks': self.tanks_json(),
            'projectiles': self._projectiles
        }
