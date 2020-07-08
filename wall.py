WALL_WIDTH = 0.1
WALL_RADIUS = WALL_WIDTH / 2

class Wall:
    def __init__(self, x, y, width, height):
        self.x = x
        self.y = y
        self.width = width
        self.height = height

    @classmethod
    def generate_horizontal_wall(self, x, y, length):
        return Wall(x - WALL_RADIUS, y - WALL_RADIUS, x + length + WALL_RADIUS, y + WALL_RADIUS)

    @classmethod
    def generate_vertical_wall(self, x, y, length):
        return Wall(x - WALL_RADIUS, y - WALL_RADIUS, x + WALL_RADIUS, y + length + WALL_RADIUS)
