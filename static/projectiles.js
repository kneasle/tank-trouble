const BULLET_RADIUS = 0.05;
const BULLET_SPEED = 2;
const BULLET_LIFETIME = 5; // seconds

const BULLET_TYPE = "Bullet";

function spawnBullet(spawnPoint, direction) {
    return {
        type: BULLET_TYPE,
        x: spawnPoint.x,
        y: spawnPoint.y,
        velX: direction.x * BULLET_SPEED,
        velY: direction.y * BULLET_SPEED,
        spawnTime: Date.now()
    };
}

// Updates the projectile, and returns true if it should despawn
function updateProjectile(proj, timeDelta) {
    if (proj.type == BULLET_TYPE) {
        proj.x += proj.velX * timeDelta;
        proj.y += proj.velY * timeDelta;

        return Date.now() > proj.spawnTime + BULLET_LIFETIME * 1000;
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
