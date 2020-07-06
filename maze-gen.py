import random


def generate_maze(size_x, size_y, density=0.9, print_map=False):
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

    if print_map:
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

    return (right_walls, bottom_walls)


class Node:
    def __init__(self, group_id, position):
        self.group_id = group_id
        self.position = position


class Wall:
    def __init__(self, orientation, position, enabled):
        self.orientation = orientation
        self.position = position
        self.enabled = enabled


if __name__ == "__main__":
    generate_maze(10, 10, density=0.9, print_map=True)
