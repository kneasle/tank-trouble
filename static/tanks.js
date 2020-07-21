// Global 'constants' set in the onLoad function
var canvas;
var ctx;
var viewRect;
var socket;
var params;

// Key tracking
var pressedKeys = {};

// Variables for the game
var maze = {
    width: 1,
    height: 1,
    walls: []
};
var tanks = {};
var serverTanks = {};

var currentGameCount = 0;

var projectiles = {};
var nextProjectileId = 0;

var lastTime = Date.now();
var wasMovingLastFrame = false;

// Variables used for rendering
var dpr = 1;

/* ===== CONSTANTS ===== */
// Constants that are needed by the physics engine
const TANK_WIDTH = 0.32;
const TANK_LENGTH = 0.42;

// Display constants
const TANK_OUTLINE_THICKNESS = 0.01;

const BARREL_RADIUS = 0.1;
const BARREL_OVERHANG = 0.2;
const TURRET_RADIUS = 0.1;

const MAZE_FILL_FACTOR = 0.95; // What proportion of the canvas should be filled by the maze
const TANK_CAMERA_ZOOM_FACTOR = 0.1; // Proportion of the diagonal length of the canvas window

// Key bindings
const KEY_LEFT = 37;
const KEY_UP = 38;
const KEY_RIGHT = 39;
const KEY_DOWN = 40;

const SHOOT_KEY = 32;

// Gameplay constants
const ROTATION_SPEED = 5; // rad/s
const MOVEMENT_SPEED = 2; // square/s

const MAX_OWNED_BULLETS = 5; // Number of bullets allowed to be owned by one tank at a time

// Debug view settings
var DEBUG_SERVER_TANKS = false;
var DEBUG_RECT_OUTLINES = false;
var DEBUG_RAYCAST = false;
var DEBUG_COLLISIONS = false;

var ATTACH_CAMERA_TO_TANK = false;

// Lag compensation settings
const LATENCY_COMPENSATION_LERP_FACTOR = 12;


// Called when the document loads
function onLoad() {
    // Read the params from the URL
    params = getParams(window.location.href);

    // Get the canvas element and its drawing context
    canvas = document.getElementById("canvas");
    ctx = canvas.getContext("2d");

    // Make sure that the canvas looks good on high DPI monitors (like mine)
    dpr = window.devicePixelRatio || 1;
    viewRect = canvas.getBoundingClientRect();

    canvas.width = viewRect.width * dpr;
    canvas.height = viewRect.height * dpr;

    // Start socketio client
    socket = io.connect('http://' + document.domain + ':' + location.port);

    // Declare useful function
    var overwriteGlobalState = function(state) {
        maze = state.maze;
        tanks = state.tanks;
        serverTanks = state.tanks;
        projectiles = state.projectiles;
        currentGameCount = state.gameCount;
    };

    // When the connection is established, tell the server that a new player has arrived
    socket.on('connect', function() {
        socket.emit('c_on_new_user_arrive', {
            colour: '#' + params.colour,
            name: params.name
        });
    });
    socket.on('s_on_new_user_arrive', function(state) {
        if (state.newUserTag == params.name) {
            overwriteGlobalState(state);
        } else {
            tanks[state.newUserTag] = state.tanks[state.newUserTag];
            serverTanks[state.newUserTag] = state.tanks[state.newUserTag];
        }
    });
    socket.on('s_on_user_leave', function(tags) {
        for (var i = 0; i < tags.length; i++) {
            delete tanks[tags[i]];
            delete serverTanks[tag[i]];
        }
    });
    socket.on('s_broadcast', function(state) { updateServerTankState(state); });
    socket.on('s_on_tank_move', function(tankData) {
        var serverTank = serverTanks[tankData.tag];

        // Check that the tank is actually defined, since we might not have recieved the new
        // new tank yet
        if (serverTank) {
            // Copy the fields of the new state into the right tank, since this only sends the updated
            // state, rather than the entire gamestate.  This is one of the rare cases where using TCP
            // is actually an advantage.
            for (field in tankData.newState) {
                serverTank[field] = tankData.newState[field];
            }
        }
    });
    socket.on('s_spawn_projectile', function(newProj) {
        // Check if the projectile is new and isn't one of ours
        if (!(newProj.id in projectiles)) {
            var proj = newProj.projectile;

            // Move the projectile to where it should be
            var timeSinceSpawn = Date.now() - proj.spawnTime;

            proj.x += proj.velX * timeSinceSpawn / 1000;
            proj.y += proj.velY * timeSinceSpawn / 1000;

            // Add the projectile
            projectiles[newProj.id] = proj;
        }
    });
    socket.on('s_on_tank_explode', function(data) {
        var tank = tanks[data.tankTag];

        // Start animation if this tank's explosion is new to us
        if (tank.isAlive) {
            tank.destructionTime = Date.now();
        }

        tank.isAlive = false;

        delete projectiles[data.projectileTag];
    });
    socket.on('s_start_new_game', function(newGameState) {
        overwriteGlobalState(newGameState);
    });

    // Set up callbacks
    window.onkeyup = function(e) { pressedKeys[e.keyCode] = false; };
    window.onkeydown = function(e) {
        pressedKeys[e.keyCode] = true;

        if (e.keyCode == SHOOT_KEY) {
            // Find the number of currently existing bullets owned by this tank by iterating over
            // the IDs, and testing if they start with the current username.
            var numOwnedBullets = 0;
            for (const id in projectiles) {
                if (projectiles[id].type == BULLET_TYPE && id.startsWith(params.name)) {
                    numOwnedBullets += 1;
                }
            }

            var myTank = getMyTank();

            if (numOwnedBullets < MAX_OWNED_BULLETS && myTank && myTank.isAlive) {
                // Calculate the direction and location of the tank barrel
                var dir = new Vec2(Math.cos(myTank.r), Math.sin(myTank.r));

                var newId = params.name + "|" + nextProjectileId;

                projectiles[newId] = spawnBullet(
                    new Vec2(myTank.x, myTank.y).add(dir.mul(TANK_LENGTH * (0.5 + BARREL_OVERHANG))),
                    dir
                );

                socket.emit("c_spawn_projectile", {
                    id: newId,
                    projectile: projectiles[newId]
                });

                nextProjectileId += 1;
            }
        }
    };
    window.onbeforeunload = function() { socket.close(); };
    window.onresize = function() {
        viewRect = canvas.getBoundingClientRect();

        canvas.width = viewRect.width * dpr;
        canvas.height = viewRect.height * dpr;
    };

    // Set the loops going
    setInterval(updateServer, 50);

    frame();
}

// Called slower than the frames so that the server isn't swamped with updates
function updateServer() {
    var myTank = getMyTank();

    if (myTank) {
        socket.emit("c_on_tank_move", {
            tag: params.name,
            gameCount: currentGameCount,
            newState: {
                x: myTank.x,
                y: myTank.y,
                r: myTank.r
            }
        });
    }
}

// Called once per frame
function frame() {
    /* ===== UPDATES ===== */
    // Calculate the time since last frame for framerate independence
    var timeDelta = (Date.now() - lastTime) / 1000;
    lastTime = Date.now();

    // Control my tank
    var myTank = getMyTank();

    if (myTank && myTank.isAlive) {
        myTank.angularVelocity = 0;
        if (pressedKeys[KEY_LEFT ] == true) { myTank.angularVelocity -= ROTATION_SPEED; }
        if (pressedKeys[KEY_RIGHT] == true) { myTank.angularVelocity += ROTATION_SPEED; }

        myTank.forwardVelocity = 0;
        if (pressedKeys[KEY_DOWN] == true) { myTank.forwardVelocity -= MOVEMENT_SPEED; }
        if (pressedKeys[KEY_UP  ] == true) { myTank.forwardVelocity += MOVEMENT_SPEED; }

        var isMoving = myTank.angularVelocity != 0 || myTank.forwardVelocity != 0;

        if (isMoving || wasMovingLastFrame) {
            // Don't emit to the server, because doing so every frame will overload the server
        }

        wasMovingLastFrame = isMoving;
    }

    /* PRECALCULATE THE WALL STATE, SINCE IT WILL NOT CHANGE PER TANK */
    var wallLines = getAllWallBoundingLines();
    var wallPoints = getAllUniqueWallPoints();

    // Update all the tanks' positions
    for (const id in tanks) {
        // Find the client and server tank states.  `tank` will be what is displayed directly
        // to the screen, and must be moved smoothly, whereas `sTank` stores the last sstate
        // of the tank as recieved from the server.  This is very jerky, and this code is here
        // to smooth this out
        var tank = tanks[id];
        var sTank = serverTanks[id];

        // We don't need to waste CPU time updating the dead tanks.  Also, if we do this, we can
        // rely on the dead tanks not moving for things like explosion particle emission.
        if (!tank.isAlive) {
            continue;
        }

        // Edit the tank location and rotation on separate variables, so that we can perform
        // collision detection and decide actually where we want to move the tank
        var newX = tank.x;
        var newY = tank.y;
        var newR = tank.r;

        if (id == params.name) {
            // How to update the position of currently controlled tanks if the server tells us
            // something different.  For now do nothing - the client knows best.
        } else {
            // How to update the position of other tanks according to what the server says.
            if (sTank) {
                // Copy across the velocities, so that the tank will do something approximately
                // what the server is saying - but that is smooth regardless.
                tank.angularVelocity = sTank.angularVelocity;
                tank.forwardVelocity = sTank.forwardVelocity;

                // Interpolate between what the tank is currently doing, and what the server thinks
                // the tank should be doing.  This will completely remove diversion and smooth out
                // the gameplay, at the cost of slightly increased latency, and a tiny bit of
                // rubber banding occasionally.
                newX = lerp(newX, sTank.x, LATENCY_COMPENSATION_LERP_FACTOR * timeDelta);
                newY = lerp(newY, sTank.y, LATENCY_COMPENSATION_LERP_FACTOR * timeDelta);
                newR = lerp(newR, sTank.r, LATENCY_COMPENSATION_LERP_FACTOR * timeDelta);
            }
        }

        // Update the tank's position
        var movementStep = tank.forwardVelocity * timeDelta;
        newX += movementStep * Math.cos(newR);
        newY += movementStep * Math.sin(newR);

        // Update the tank's rotation
        newR += tank.angularVelocity * timeDelta;

        /* ===== COLLISION DETECTION ===== */
        /* This works in three stages.  First, a culling stage is performed to refine the collision
         * checks required in the second stage as far as possible.  The second stage takes the
         * culled data, and turns them into a list of constraints on where the tank can move to.
         * The third stage takes these constraints and attempts to move the tank a minimal amount
         * whilst satisfying all the constraints that were calculated.
         */

        /* TANK SPECIFICATION */

        // The corners of the tank that we should do collision testing with
        var corners = [
            // The 4 corners of the tank body
            new Vec2(-TANK_LENGTH / 2, -TANK_WIDTH / 2),
            new Vec2(-TANK_LENGTH / 2, TANK_WIDTH / 2),
            new Vec2(TANK_LENGTH / 2, TANK_WIDTH / 2),
            new Vec2(TANK_LENGTH / 2, -TANK_WIDTH / 2),

            // The outer two corners of the turret
            new Vec2(TANK_LENGTH * (0.5 + BARREL_OVERHANG), -TANK_WIDTH * BARREL_RADIUS),
            new Vec2(TANK_LENGTH * (0.5 + BARREL_OVERHANG), TANK_WIDTH * BARREL_RADIUS)
        ];

        // Calculate the new bounding box of the tank (for use culling wall lines for the raycasts)
        var tankBBoxMin = Vec2_ONE().mul(Infinity);
        var tankBBoxMax = Vec2_ONE().mul(-Infinity);

        for (var i = 0; i < corners.length; i++) {
            var transformedCorner = transformCoord(corners[i], new Vec2(newX, newY), newR);

            tankBBoxMin = tankBBoxMin.min(transformedCorner);
            tankBBoxMax = tankBBoxMax.max(transformedCorner);
        }

        // Add these bounding boxes to the collision debug view
        if (DEBUG_COLLISIONS) {
            addDebugRect(tankBBoxMin, tankBBoxMax.sub(tankBBoxMin), tank.col);
        }

        // Use this bounding box to determine which wall lines are never going to be overlapping
        // with the tank.  This assumes that the corners of the tank that can collide with walls
        // must be moving away from the centre of the tank, and therefore the entire raycast is
        // contained within the bounding box of the tank.
        var refinedWallLines = [];
        var refinedWallPoints = [];

        // Cull the wall lines
        for (var i = 0; i < wallLines.length; i++) {
            let l = wallLines[i];

            // The wall is too far to the left to overlap with the tank's bounding box
            if (Math.max(l.p1.x, l.p2.x) < tankBBoxMin.x) {
                continue;
            }

            // The wall is too far to the right to overlap with the tank's bounding box
            if (Math.min(l.p1.x, l.p2.x) > tankBBoxMax.x) {
                continue;
            }

            // The wall is too far up to overlap with the tank's bounding box
            if (Math.max(l.p1.y, l.p2.y) < tankBBoxMin.y) {
                continue;
            }

            // The wall is too far down to overlap with the tank's bounding box
            if (Math.min(l.p1.y, l.p2.y) > tankBBoxMax.y) {
                continue;
            }

            // If we've got this far, the wall's BBox overlaps the tank's, and so we should test
            // it for collisions.
            refinedWallLines.push(l);

            // Draw a collision debug line if the flag is set
            if (DEBUG_COLLISIONS) {
                addDebugLine(l.p1, l.p2, tank.col);
            }
        }

        // Cull the wall points
        for (var i = 0; i < wallPoints.length; i++) {
            let p = wallPoints[i];

            // Check that the point lies within the tank's bounding box
            if (p.x >= tankBBoxMin.x && p.x <= tankBBoxMax.x
             && p.y >= tankBBoxMin.y && p.y <= tankBBoxMax.y
            ) {
                // Add it to the refined list
                refinedWallPoints.push(p);

                // Draw a debug collision line if the flag is set
                if (DEBUG_COLLISIONS) {
                    addDebugPoint(p, tank.col);
                }
            }
        }

        /* FIND THE CONSTRAINTS ON THE TANK'S MOVEMENT */
        // An array to store all the points on the tank, and how they're intersecting with the walls
        var constraints = [];

        // Find constraints relating to the corners of the tank intersecting with the wall lines.
        for (var i = 0; i < corners.length; i++) {
            var corner = corners[i];

            // Calculate where this corner has moved from and to
            var lastLocation = transformCoord(corner, Vec2from(tank), tank.r);
            var nextLocation = transformCoord(corner, new Vec2(newX, newY), newR);

            // Calculate the movement direction as a vector
            var dir = nextLocation.sub(lastLocation);

            // Ignore this corner if it hasn't moved
            if (dir.length() <= 0.0001) {
                continue;
            }

            // Perform a raycast in the direction that the corner has moved
            var intersection = raycast(lastLocation, dir, refinedWallLines, -0.0001, 1);

            // Only do a collision if there is an intersection, and we're going _into_ the wall not
            // out of it.  This normal check is needed to ensure that people don't get stuck inside
            // the wall with no possiblity of escape.
            if (intersection && intersection.normal.dot(dir) < 0) {
                constraints.push({
                    intersection: intersection,
                    corner: corner,
                    newCornerLocation: nextLocation
                });
            }
        }

        /* SOLVING THE CONSTRAINTS */
        if (constraints.length > 0) {
            // For the time being, always solve the constraints by always moving the tank and never
            // rotating it.
        
            /* First we will turn all the constraints into a list of normals and directions (it's
             * OK to remove the data about where on the tank the collision happens, since this is
             * irrelevant if we are only moving the tanks and not rotating it).  This prevents
             * multiple intersections with the same wall causing the tank to vibrate (a bug that
             * can be seen present in the original tank trouble game).
             */
            var combinedConstraints = [];

            for (var i = 0; i < constraints.length; i++) {
                // Determine if a very similar normal has been encountered so far, and only update
                // the distance requirement if this requirement is longer than the other.
                var hasSeenASimilarNormal = false;

                // Calculate the distance that the tank would have to move in order to be outside
                // the wall
                var distance = constraints[i].intersection.point.sub(
                    constraints[i].newCornerLocation
                ).projectOnto(constraints[i].intersection.normal).length();

                for (var j = 0; j < combinedConstraints.length; j++) {
                    // Test if the normals are very similar to each other by calculating their dot
                    // product (we can assume they have unit length because the raycasting code
                    // guaruntees that)
                    if (
                        constraints[i].intersection.normal.dot(
                            combinedConstraints[j].normal
                        ) > 0.999
                    ) {
                        // If the new distance is longer than the current longest distance, then
                        // we need to move further to resolve the worst of the overlaps.
                        combinedConstraints[j].distance = Math.max(
                            combinedConstraints[j].distance,
                            distance
                        );

                        hasSeenASimilarNormal = true;
                    }
                }

                // If we haven't seen a similar normal, then we should add this one to
                // combinedConstraints
                if (!hasSeenASimilarNormal) {
                    combinedConstraints.push({
                        normal: constraints[i].intersection.normal,
                        distance: distance
                    });
                }
            }

            // Calculate the total movment required in order to satisfy all the constraints.
            // Since we are not rotating the tank, all we have to do is to add all the vectors
            // together
            var recoveryMovement = Vec2_ZERO();

            for (var i = 0; i < combinedConstraints.length; i++) {
                recoveryMovement = recoveryMovement.add(
                    combinedConstraints[i].normal.mul(combinedConstraints[i].distance)
                );
            }

            // Apply this correction to the tank's new location
            newX += recoveryMovement.x;
            newY += recoveryMovement.y;
        }

        // Overwrite the tank's current position with the new coordinates calculated above
        tank.x = newX;
        tank.y = newY;
        tank.r = newR;
    }

    // Update all projectiles
    var projectilesToDestroy = [];

    for (const id in projectiles) {
        if (updateProjectile(projectiles[id], timeDelta)) {
            projectilesToDestroy.push(id);
        }
    }

    while (projectilesToDestroy.length > 0) {
        delete projectiles[projectilesToDestroy.pop()];
    }

    // Detect when my tank is destroyed
    var myTank = getMyTank();

    if (myTank && myTank.isAlive) {
        for (const id in projectiles) {
            var proj = projectiles[id];
            var tankSpaceCoord = inverseTransformCoord(Vec2from(proj), Vec2from(myTank), myTank.r);

            if (Math.abs(tankSpaceCoord.x) <= TANK_LENGTH / 2 + BULLET_RADIUS
             && Math.abs(tankSpaceCoord.y) <= TANK_WIDTH / 2 + BULLET_RADIUS
            ) {
                myTank.isAlive = false;
                myTank.destructionTime = Date.now();

                socket.emit('c_on_tank_explode', { tankTag: params.name, projectileTag: id });

                delete projectiles[id];

                break;
            }
        }
    }

    /* ===== RENDERING ==== */
    // Clear the canvas
    ctx.clearRect(0, 0, viewRect.width, viewRect.height);

    /* Transform the canvas so that the map starts at (0, 0) and one unit corresponds to one
     * square of the maze
     */
    
    // Save the canvas' transformation matrix so that it can be restored at the end of every frame
    ctx.save();

    // Move the origin to the centre of the canvas window
    ctx.translate(viewRect.width / 2, viewRect.height / 2);

    if (ATTACH_CAMERA_TO_TANK && myTank) {
        /* MAKE THE CAMERA FOLLOW THE TANK. */

        // Calculate the length from one corner to the opposite corner of the canvas
        var diagonalLength = Math.sqrt(
            viewRect.width * viewRect.width + viewRect.height * viewRect.height
        );
        
        // Scale all the drawing according to the size of the canvas
        ctx.scale(
            diagonalLength * TANK_CAMERA_ZOOM_FACTOR,
            diagonalLength * TANK_CAMERA_ZOOM_FACTOR
        );

        // Move the camera to be above the tank, with the tank facing upwards
        ctx.rotate(-myTank.r - Math.PI / 2);
        ctx.translate(-myTank.x, -myTank.y);
    } else {
        /* MAKE THE CAMERA STATIC AND MAKE THE MAZE FILL THE WINDOW */
        
        // Find out what scale to use in order to fill the window with the maze
        var scale = Math.min(
            viewRect.width / maze.width,
            viewRect.height / maze.height
        ) * MAZE_FILL_FACTOR;

        // Scale the canvas by the required scale
        ctx.scale(scale * MAZE_FILL_FACTOR, scale * MAZE_FILL_FACTOR);

        // Translate so that the centre of the maze is the centre of the canvas
        ctx.translate(-maze.width / 2, -maze.height / 2);
    }

    // Draw the grid
    ctx.fillStyle = 'black';

    for (var i = 0; i < maze.walls.length; i++) {
        var w = maze.walls[i];

        ctx.fillRect(w.x, w.y, w.width, w.height);
    }

    // Draw the tanks
    for (const id in tanks) {
        drawTank(tanks[id]);
    }

    // Draw projectiles
    ctx.fillStyle = "black";
    for (const id in projectiles) {
        renderProjectile(ctx, projectiles[id]);
    }

    // ===== DEBUG DRAWING =====
    if (DEBUG_SERVER_TANKS) {
        for (const id in serverTanks) {
            drawTank(serverTanks[id], "rgba(0,0,0,0)");
        }
    }

    drawAllDebugShapes(ctx);

    if (DEBUG_RECT_OUTLINES) {
        var lines = getAllWallBoundingLines(BULLET_RADIUS);

        for (var i = 0; i < lines.length; i++) {
            ctx.beginPath();

            ctx.moveTo(lines[i].p1.x, lines[i].p1.y);
            ctx.lineTo(lines[i].p2.x, lines[i].p2.y);

            ctx.strokeStyle = "red";
            ctx.lineWidth = 0.03;
            ctx.stroke();
        }
    }

    if (DEBUG_RAYCAST) {
        if (myTank) {
            var points = bouncingRaycast(
                new Vec2(myTank.x, myTank.y),
                new Vec2(Math.cos(myTank.r), Math.sin(myTank.r)),
                BULLET_SPEED * BULLET_LIFETIME,
                BULLET_RADIUS
            );

            if (points.length > 0) {
                ctx.beginPath();
                ctx.moveTo(points[0].x, points[0].y);

                for (var i = 1; i < points.length; i++) {
                    ctx.lineTo(points[i].x, points[i].y);
                }

                ctx.lineWidth = 0.01;
                ctx.strokeStyle = myTank.col;
                ctx.stroke();
            }
        }
    }

    // Restore the window to standard transformation
    ctx.restore();

    // Request another frame
    window.requestAnimationFrame(frame);
}





/* ===== STATE-UPDATING CODE ===== */
function updateServerTankState(state) {
    serverTanks = state;
}




/* ===== DRAWING CODE ===== */
// Draw a rectangle with both a fill and a stroke
function fillStrokeRect(x, y, w, h) {
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
}

// Draw a tank
function drawTank(tank, fillOverride) {
    if (tank.isAlive) {
        drawLiveTank(tank, fillOverride);
    }
}

function drawLiveTank(tank, fillOverride) {
    // Save the canvas and move it so that the tank is at (0, 0) looking upwards
    ctx.save();
    ctx.translate(tank.x, tank.y);
    ctx.rotate(tank.r + Math.PI / 2);

    // Setup the right colours and line widths
    ctx.strokeStyle = "black";
    ctx.fillStyle = fillOverride || tank.col;
    ctx.lineWidth = 0.01;

    // Tank body
    fillStrokeRect(
        TANK_WIDTH * -0.5,
        TANK_LENGTH * -0.5,
        TANK_WIDTH,
        TANK_LENGTH
    );

    // Barrel
    fillStrokeRect(
        TANK_WIDTH * -BARREL_RADIUS,
        TANK_LENGTH * -(0.5 + BARREL_OVERHANG),
        TANK_WIDTH * BARREL_RADIUS * 2,
        TANK_LENGTH * (0.5 + BARREL_OVERHANG)
    );

    // Turret
    ctx.beginPath();
    ctx.arc(0, 0, TURRET_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Reset the canvas to where it was before drawing the tank
    ctx.restore();
}





/* ===== COLLISION ENGINE CODE ===== */
function transformCoord(coord, origin, rotation) {
    return coord.rotatedBy(rotation).add(origin);
}

function inverseTransformCoord(coord, origin, rotation) {
    return coord.sub(origin).rotatedBy(-rotation);
}




/* ===== UTILITIES ===== */
function lerp(a, b, t) {
    return (1 - t) * a + t * b;
}

// Returns t such that lerp(a, b, t) = c.  Divides by 0 if a = b
function inverseLerp(a, b, c) {
    return (c - a) / (b - a);
}

function getMyTank() {
    return tanks[params.name];
}

/**
 * Get the URL parameters
 * source: https://css-tricks.com/snippets/javascript/get-url-variables/
 * @param  {String} url The URL
 * @return {Object}     The URL parameters
 */
function getParams(url) {
	var params = {};
	var parser = document.createElement('a');
	parser.href = url;
	var query = parser.search.substring(1);
	var vars = query.split('&');
	for (var i = 0; i < vars.length; i++) {
		var pair = vars[i].split('=');
		params[pair[0]] = decodeURIComponent(pair[1]);
	}
	return params;
};
