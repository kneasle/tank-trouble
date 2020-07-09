""" Module to hold all the maze generation code. """

import random

from wall import Wall


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


    class Edge:
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

    edges = [
        Edge("r", (i, j), True)
        for j in range(size_y)
        for i in range(size_x - 1)
    ] + [
        Edge("b", (i, j), True)
        for j in range(size_y - 1)
        for i in range(size_x)
    ]

    random.shuffle(edges)

    for edge in edges:
        if edge.orientation == "r":
            parent_nodes = [nodes[edge.position[0] + size_x * edge.position[1]],
                            nodes[edge.position[0] + 1 + size_x * edge.position[1]]]

        else:
            parent_nodes = [nodes[edge.position[0] + size_x * edge.position[1]],
                            nodes[edge.position[0] + size_x * (edge.position[1] + 1)]]

        if parent_nodes[0].group_id != parent_nodes[1].group_id:
            edge.enabled = False

            dead_group_id = parent_nodes[1].group_id

            for node in nodes:
                if node.group_id == dead_group_id:
                    node.group_id = parent_nodes[0].group_id

    enabled_edges = list(filter(lambda edge: edge.enabled, edges))

    random.shuffle(enabled_edges)

    for i in range(round((size_x - 1) * (size_y - 1) * (1 - density))):
        enabled_edges[i].enabled = False

    right_edges = [[True for i in range(size_x - 1)] for i in range(size_y)]
    bottom_edges = [[True for i in range(size_x)] for i in range(size_y - 1)]

    for edge in edges:
        if edge.orientation == "r":
            right_edges[edge.position[1]][edge.position[0]] = edge.enabled

        if edge.orientation == "b":
            bottom_edges[edge.position[1]][edge.position[0]] = edge.enabled

    return (right_edges, bottom_edges)


def generate_walls_from_maze(width, height, maze):
    """ Converts a wall given in right/bottom walls into rectangular walls of the correct width. """

    walls = []

    # Edges
    walls.append(Wall.generate_horizontal_wall(0, 0, width))
    walls.append(
        Wall.generate_horizontal_wall(0, height, width)
    )
    walls.append(Wall.generate_vertical_wall(0, 0, height))
    walls.append(Wall.generate_vertical_wall(width, 0, height))

    (right_walls, bottom_walls) = maze

    # Horizontal walls
    for y in range(height - 1):
        x = 0
        current_wall_start_x = 0
        current_wall_length = 0

        while x < width:
            while x < width and bottom_walls[y][x]:
                x += 1
                current_wall_length += 1

            if current_wall_length > 0:
                walls.append(
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
    for x in range(width - 1):
        y = 0
        current_wall_start_y = 0
        current_wall_length = 0

        while y < height:
            while y < height and right_walls[y][x]:
                y += 1
                current_wall_length += 1

            if current_wall_length > 0:
                walls.append(
                    Wall.generate_vertical_wall(
                        x + 1,
                        current_wall_start_y,
                        current_wall_length
                    )
                )

            y += 1
            current_wall_start_y = y
            current_wall_length = 0

    return walls


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
