const BULLET_RADIUS = 0.05;
const BULLET_SPEED = 2;
const BULLET_LIFETIME = 5; // seconds

const BULLET_TYPE = "Bullet";

function spawnBullet(spawnPoint, direction) {
    var path = bouncingRaycast(spawnPoint, direction, BULLET_SPEED * BULLET_LIFETIME);

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
        if ((Date.now() - proj.spawnTime) / 1000 > BULLET_LIFETIME) {
            return true;
        } else {
            var timeSinceSpawn = (Date.now() - proj.spawnTime) / 1000;

            var i = 0;
            while (proj.path[i].time < timeSinceSpawn) {
                i += 1;
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
        }
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
