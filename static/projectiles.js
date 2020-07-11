const BULLET_RADIUS = 0.05;
const BULLET_SPEED = 2;
const BULLET_LIFETIME = 5; // seconds

const BULLET_TYPE = "Bullet";

function spawnBullet(spawnPoint, direction) {
    var path = bouncingRaycast(spawnPoint, direction, BULLET_SPEED * BULLET_LIFETIME, BULLET_RADIUS);

    var annotatedPath = [];
    var cumulativeLength = 0;

    for (var i = 0; i < path.length; i++) {
        if (i > 0) {
            cumulativeLength += path[i].sub(path[i - 1]).length();
        }

        annotatedPath.push({
            x: path[i].x,
            y: path[i].y,
            time: cumulativeLength / BULLET_SPEED
        });
    }

    return {
        type: BULLET_TYPE,
        spawnTime: Date.now(),
        path: annotatedPath
    };
}

// Updates the projectile, and returns true if it should despawn
function updateProjectile(proj, timeDelta) {
    if (proj.type == BULLET_TYPE) {
        var timeSinceSpawn = (Date.now() - proj.spawnTime) / 1000;

        // We start i at 1, because if this gets run in the same millisecond that the bullet
        // spawn, the loop guard will fail on the first iteration, and i will stay set to 0,
        // which will cause `proj.path[i - 1]` after the loop to access the -1st element of
        // proj.path, which is undefined and will cause a crash.
        var i = 1;
        while (proj.path[i].time < timeSinceSpawn) {
            i += 1;

            // We do the 'has the bullet despawned' here, rather than as an if statement earlier,
            // because sometimes (very rarely), a millisecond will tick over between the if
            // statement evaluating Date.now() and the calculation of timeSinceSpawn and this will
            // leave i being equal to the length of the array, which will cause a crash when access
            // of that array element is attempted.
            if (i == proj.path.length) {
                return true;
            }
        }

        var lerpFactor = inverseLerp(proj.path[i - 1].time, proj.path[i].time, timeSinceSpawn);
        var vec = vecLerp(
            new Vec2(proj.path[i - 1].x, proj.path[i - 1].y),
            new Vec2(proj.path[i].x, proj.path[i].y),
            lerpFactor
        );

        proj.x = vec.x;
        proj.y = vec.y;

        return false;
    } else {
        console.error("Unknown projectile type " + proj.type);

        return false;
    }
}

function renderProjectile(ctx, proj) {
    if (proj.type == BULLET_TYPE) {
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, BULLET_RADIUS, 0, Math.PI * 2);
        ctx.fill();
    }
}
