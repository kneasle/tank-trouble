""" Module to hold all the maze generation code. """

import random


def generate_maze(size_x, size_y, density=0.9):
    """
    Generate a maze of a given size, returning the maze in the form of arrays of 'right walls' and
    'bottom walls'.

    For example, the following maze:
    +---+---+---+
    |       |   |
    +---+   +   +
    |           |
    +   +---+---+
    |           |
    +---+---+---+
    would be represented as:
        right_walls: [
            [f, t],
            [f, f],
            [f, f]
        ]
        bottom_walls: [
            [t, f, f],
            [f, t, t]
        ]

    (where t = True, f = False).
    """

    class Node:
        """ A simple class to hold a single cell in the maze during Prim's. """

        def __init__(self, group_id, position):
            self.group_id = group_id
            self.position = position


    class Wall:
        """
        A simple class to hold a single connection between two Nodes, which may or may not have a
        wall added to it.
        """

        def __init__(self, orientation, position, enabled):
            self.orientation = orientation
            self.position = position
            self.enabled = enabled


    nodes = [Node(i + j * size_x, (i, j))
             for j in range(size_y)
             for i in range(size_x)]

    walls = [
        Wall("r", (i, j), True)
        for j in range(size_y)
        for i in range(size_x - 1)
    ] + [
        Wall("b", (i, j), True)
        for j in range(size_y - 1)
        for i in range(size_x)
    ]

    random.shuffle(walls)

    for wall in walls:
        if wall.orientation == "r":
            parent_nodes = [nodes[wall.position[0] + size_x * wall.position[1]],
                            nodes[wall.position[0] + 1 + size_x * wall.position[1]]]

        else:
            parent_nodes = [nodes[wall.position[0] + size_x * wall.position[1]],
                            nodes[wall.position[0] + size_x * (wall.position[1] + 1)]]

        if parent_nodes[0].group_id != parent_nodes[1].group_id:
            wall.enabled = False

            dead_group_id = parent_nodes[1].group_id

            for node in nodes:
                if node.group_id == dead_group_id:
                    node.group_id = parent_nodes[0].group_id

    enabled_walls = list(filter(lambda wall: wall.enabled, walls))

    random.shuffle(enabled_walls)

    for i in range(round((size_x - 1) * (size_y - 1) * (1 - density))):
        enabled_walls[i].enabled = False

    right_walls = [[True for i in range(size_x - 1)] for i in range(size_y)]
    bottom_walls = [[True for i in range(size_x)] for i in range(size_y - 1)]

    for wall in walls:
        if wall.orientation == "r":
            right_walls[wall.position[1]][wall.position[0]] = wall.enabled

        if wall.orientation == "b":
            bottom_walls[wall.position[1]][wall.position[0]] = wall.enabled

    return (right_walls, bottom_walls)


def print_maze(walls):
    """ Prints a maze given in the 'right and down walls' format. """

    right_walls, bottom_walls = walls
    size_x = len(bottom_walls[0])
    size_y = len(right_walls)
    print("+---" * size_x + "+")

    for y in range(size_y):
        print("|   ", end="")
        for x in range(size_x - 1):
            if right_walls[y][x]:
                print("|   ", end="")
            else:
                print("    ", end="")
        print("|")

        if y != size_y - 1:
            for x in range(size_x):
                if bottom_walls[y][x]:
                    print("+---", end="")
                else:
                    print("+   ", end="")
            print("+")

    print("+---" * size_x + "+")


if __name__ == "__main__":
    print_maze(generate_maze(10, 10, density=0.9))
