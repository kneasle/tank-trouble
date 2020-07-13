""" Module to encapsulate the represent a rectangular wall. """

WALL_WIDTH = 0.1
WALL_RADIUS = WALL_WIDTH / 2


class Wall:
    """ A class representing a rectangular grid-aligned wall. """

    def __init__(self, x, y, width, height):
        self.x = x
        self.y = y
        self.width = width
        self.height = height

    @classmethod
    def generate_horizontal_wall(cls, x, y, length):
        """ Return a standard-thickness horizontal wall. """

        return cls(x - WALL_RADIUS, y - WALL_RADIUS, length + WALL_WIDTH, WALL_WIDTH)

    @classmethod
    def generate_vertical_wall(cls, x, y, length):
        """ Return a standard-thickness vertical wall. """

        return cls(x - WALL_RADIUS, y - WALL_RADIUS, WALL_WIDTH, length + WALL_WIDTH)

    def to_json(self):
        """ Serialise this wall into JSON. """

        return {
            'x': self.x,
            'y': self.y,
            'width': self.width,
            'height': self.height
        }

    def __repr__(self):
        return self.__str__()

    def __str__(self):
        return f"<{self.x}, {self.y}, {self.width}, {self.height}>"
