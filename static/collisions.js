function intersection(rayOrigin, rayDir, line) {
    var lineDir = line.p2.sub(line.p1);
    var originDiff = line.p1.sub(rayOrigin);

    var determinant = lineDir.x * rayDir.y - lineDir.y * rayDir.x;

    if (Math.abs(determinant) < 1e-10) {
        return undefined;
    } else {
        var rayMultiplier = (lineDir.x * originDiff.y - lineDir.y * originDiff.x) / determinant;
        var lineMultiplier = (rayDir.x * originDiff.y - rayDir.y * originDiff.x) / determinant;

        return {
            rayMultiplier: rayMultiplier,
            lineMultiplier: lineMultiplier,
            normal: lineDir.perpendicular().normalised(),
            point: rayOrigin.add(rayDir.mul(rayMultiplier))
        };
    }
}

function recursiveBouncingRaycast(origin, dir, length, lines) {
    var firstIntersection = raycast(origin, dir, lines);

    if (firstIntersection && firstIntersection.rayMultiplier < length) {
        return [firstIntersection.point].concat(
            recursiveBouncingRaycast(
                firstIntersection.point,
                dir.reflectInDirection(firstIntersection.normal),
                length - firstIntersection.rayMultiplier,
                lines
            )
        );
    }

    return [origin.add(dir.mul(length))];
}

function bouncingRaycast(origin, directionVec, length, padding) {
    var lines = getAllWallBoundingLines(padding);

    return [origin].concat(recursiveBouncingRaycast(origin, directionVec, length, lines));
}

function raycast(origin, directionVec, precalculatedLines, minDist, maxDist) {
    var lines = precalculatedLines || getAllWallBoundingLines();

    var bestIntersection = undefined;
    var bestIntersectionMultiplier = maxDist || Infinity;

    for (var l = 0; l < lines.length; l++) {
        let i = intersection(origin, directionVec, lines[l]);

        if (i
            && i.rayMultiplier < bestIntersectionMultiplier 
            && i.rayMultiplier > (minDist || 0.0001)
            && i.lineMultiplier >= 0
            && i.lineMultiplier <= 1
        ) {
            // This is the best interesection
            bestIntersectionMultiplier = i.rayMultiplier;
            bestIntersection = i;
        }
    }

    return bestIntersection;
}

function getAllUniqueWallPoints() {
    var wallPoints = [];

    // Add a point to wallPoints if another almost identical point doesn't already exist
    function addPointIfUnique(point) {
        // Check nearest point distance by naively iterating over all the currently added points
        for (var j = 0; j < wallPoints.length; j++) {
            if (wallPoints[i].sub(point).length() <= 0.0001) {
                return;
            }
        }

        // If we haven't returned yet, push this point to wallPoints
        wallPoints.push(point);
    }

    for (var i = 0; i < maze.walls.length; i++) {
        var w = maze.walls[i];

        // Calculate the boundaries of the rectangle
        var minX = w.x;
        var minY = w.y;
        var maxX = w.x + w.width;
        var maxY = w.y + w.height;

        addPointIfUnique(new Vec2(minX, minY)); // Top left
        addPointIfUnique(new Vec2(maxX, minY)); // Top right
        addPointIfUnique(new Vec2(minX, maxY)); // Bottom left
        addPointIfUnique(new Vec2(maxX, maxY)); // Bottom right
    }

    return wallPoints;
}

function getAllWallBoundingLines(padding) {
    var padding = padding || 0;

    var lineSegments = [];

    for (var i = 0; i < maze.walls.length; i++) {
        var w = maze.walls[i];

        var minX = w.x - padding;
        var minY = w.y - padding;
        var maxX = w.x + w.width + padding;
        var maxY = w.y + w.height + padding;

        var topLeft = new Vec2(minX, minY);
        var topRight = new Vec2(maxX, minY);
        var bottomLeft = new Vec2(minX, maxY);
        var bottomRight = new Vec2(maxX, maxY);

        lineSegments.push(
            { p1: topRight, p2: topLeft }, // Top
            { p1: topLeft, p2: bottomLeft }, // Left
            { p1: bottomLeft, p2: bottomRight }, // Bottom
            { p1: bottomRight, p2: topRight } // Right
        );
    }

    return lineSegments;
}
