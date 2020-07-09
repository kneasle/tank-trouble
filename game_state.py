import math
import random
import time

import maze_gen
from tank import Tank
from wall import Wall


BULLET_DESPAWN_TIME = 5


class GameState:
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
        (x, y) = self.get_all_centres_shuffled()[0]

        self._tanks[name] = Tank(x, y, random.random() * math.pi * 2, colour, name, sid)
        self._scoreboard[name] = 0


    def update_tank(self, tag, tank_json):
        self._tanks[tag].update_from_json(tank_json)


    def explode_tank(self, tag, projectile_tag):
        self._tanks[tag].explode()

        del self._projectiles[projectile_tag]

        self.update_projectiles()


    def delete_tank(self, tag):
        del self._tanks[tag]


    def get_tank(self, tag):
        return self._tanks[tag]


    def has_tank(self, tag):
        return tag in self._tanks


    def add_projectile(self, tag, json):
        self._projectiles[tag] = json

        self.update_projectiles()


    def on_disconnect(self, sid):
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
        return [tag for tag in self._tanks if self._tanks[tag].is_alive()]


    def get_all_centres_shuffled(self):
        centres = [
            (x + 0.5, y + 0.5)
            for x in range(self._maze_width)
            for y in range(self._maze_height)
        ]

        random.shuffle(centres)

        return centres


    def start_new_game(self):
        self._generate_maze()

        centres = self.get_all_centres_shuffled()

        for t in self._tanks:
            (x, y) = centres.pop()

            self._tanks[t].respawn(x, y, random.random() * math.pi * 2)

        self._projectiles = {}


    def _generate_maze(self):
        self._maze_width = 10
        self._maze_height = 5

        # Generate maze
        maze = maze_gen.generate_maze(self._maze_width, self._maze_height)
        maze_gen.print_maze(maze)

        # ===== CONVERT NEW MAZE INTO RECTANGLES =====
        self._maze_walls = []

        # Edges
        self._maze_walls.append(Wall.generate_horizontal_wall(0, 0, self._maze_width))
        self._maze_walls.append(
            Wall.generate_horizontal_wall(0, self._maze_height, self._maze_width)
        )
        self._maze_walls.append(Wall.generate_vertical_wall(0, 0, self._maze_height))
        self._maze_walls.append(Wall.generate_vertical_wall(self._maze_width, 0, self._maze_height))

        (right_walls, bottom_walls) = maze

        # Horizontal walls
        for y in range(self._maze_height - 1):
            x = 0
            current_wall_start_x = 0
            current_wall_length = 0

            while x < self._maze_width:
                while x < self._maze_width and bottom_walls[y][x]:
                    x += 1
                    current_wall_length += 1

                if current_wall_length > 0:
                    self._maze_walls.append(
                        Wall.generate_horizontal_wall(
                            current_wall_start_x,
                            y + 1,
                            current_wall_length
                        )
                    )

                x += 1
                current_wall_start_x = x
                current_wall_length = 0

        # Vertical walls
        for x in range(self._maze_width - 1):
            y = 0
            current_wall_start_y = 0
            current_wall_length = 0

            while y < self._maze_height:
                while y < self._maze_height and right_walls[y][x]:
                    y += 1
                    current_wall_length += 1

                if current_wall_length > 0:
                    self._maze_walls.append(
                        Wall.generate_vertical_wall(
                            x + 1,
                            current_wall_start_y,
                            current_wall_length
                        )
                    )

                y += 1
                current_wall_start_y = y
                current_wall_length = 0


    def update_score(self):
        tanks_alive = self.tanks_still_alive()

        if len(tanks_alive) == 1:
            self._scoreboard[tanks_alive[0]] += 1
        else:
            print("Game was a draw.")

            assert tanks_alive == []


    def update_projectiles(self):
        tags_to_despawn = []

        for tag in self._projectiles:
            if self._projectiles[tag]['spawnTime'] / 1000 + BULLET_DESPAWN_TIME < time.time():
                tags_to_despawn.append(tag)

        for t in tags_to_despawn:
            del self._projectiles[t]


    # JSON exporting stuff
    def tanks_json(self):
        return {tag: self._tanks[tag].to_json() for tag in self._tanks}


    def entire_state_json(self):
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
