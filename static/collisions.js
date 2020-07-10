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
            normal: lineDir.perpendicular(),
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

function bouncingRaycast(origin, directionVec, length) {
    var lines = getAllWallBoundingLines();

    return [origin].concat(recursiveBouncingRaycast(origin, directionVec, length, lines));
}

function raycast(origin, directionVec, precalculated_lines) {
    var lines = precalculated_lines || getAllWallBoundingLines();

    var bestIntersection = undefined;
    var bestIntersectionMultiplier = Infinity;

    for (var l = 0; l < lines.length; l++) {
        let i = intersection(origin, directionVec, lines[l]);

        if (i
            && i.rayMultiplier < bestIntersectionMultiplier 
            && i.rayMultiplier > 0
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

