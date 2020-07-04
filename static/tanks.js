// Global 'constants' set in the onLoad function
var canvas;
var ctx;
var viewRect;
var socket;

// Key tracking
var pressedKeys = {};

// Variables for the game
var grid = { w: 1, h: 1 };
var tanks = {};
var serverTanks = {};

var lastTime = Date.now();
var wasMovingLastFrame = false;

/* ===== CONSTANTS ===== */
// Constants that are needed by the physics engine
const TANK_WIDTH = 0.32;
const TANK_LENGTH = 0.42;
const WALL_THICKNESS = 0.1;

// Display constants
const TANK_OUTLINE_THICKNESS = 0.01;

const BARREL_RADIUS = 0.1;
const BARREL_OVERHANG = 0.2;
const TURRET_RADIUS = 0.1;

// Key bindings
const KEY_LEFT = 75;
const KEY_UP = 79;
const KEY_RIGHT = 59;
const KEY_DOWN = 76;

// Gameplay constants
const ROTATION_SPEED = 3; // rad/s
const MOVEMENT_SPEED = 1; // square/s

// Lag compensation/debug settings
const SHOW_SERVER_TANKS = false;
const LATENCY_COMPENSATION_LERP_FACTOR = 12;


// Called when the document loads
function onLoad() {
    // Get the canvas element and its drawing context
    canvas = document.getElementById("canvas");
    ctx = canvas.getContext("2d");

    // Make sure that the canvas looks good on high DPI monitors (like mine)
    var dpr = window.devicePixelRatio || 1;
    viewRect = canvas.getBoundingClientRect();

    canvas.width = viewRect.width * dpr;
    canvas.height = viewRect.height * dpr;

    ctx.scale(dpr, dpr);

    // Start socketio client
    socket = io.connect('http://' + document.domain + ':' + location.port);

    // When the connection is established, tell the server that a new player has arrived
    socket.on('connect', function() {
        let cols = ['blue', 'lime', 'magenta', 'green', 'orange', 'red', 'yellow'];

        socket.emit('c_on_new_user_arrive', {col: cols[Math.floor(Math.random() * cols.length)]})
    });

    socket.on('s_on_new_user_arrive', function(state) { 
        tanks = state;
        serverTanks = state;
    });
    socket.on('s_on_user_leave', function(id) {
        delete tanks[id.id];
        delete serverTanks[id.id];
    });
    socket.on('s_broadcast', function(state) { updateServerTankState(state); });
    socket.on('s_on_tank_move', function(state) { updateServerTankState(state); });
        
    // Set up callbacks
    window.onkeyup = function(e) { pressedKeys[e.keyCode] = false; }
    window.onkeydown = function(e) { pressedKeys[e.keyCode] = true; }
    window.onbeforeunload = function() { socket.close(); }

    // Set the loops going
    setInterval(updateServer, 50);
    
    frame();
}

// Called slower than the frames so that the server isn't swamped with updates
function updateServer() {
    socket.emit("c_on_tank_move", getMyTank());
}

// Called once per frame
function frame() {
    /* ===== UPDATES ===== */
    // Calculate the time since last frame for framerate independence
    var timeDelta = (Date.now() - lastTime) / 1000;
    lastTime = Date.now();

    // Control my tank
    var myTank = getMyTank();

    if (myTank) {
        myTank.angularVelocity = 0;

        if (pressedKeys[KEY_LEFT ] == true) { myTank.angularVelocity -= 1; }
        if (pressedKeys[KEY_RIGHT] == true) { myTank.angularVelocity += 1; }

        myTank.forwardVelocity = 0;
        if (pressedKeys[KEY_DOWN] == true) { myTank.forwardVelocity -= 1; }
        if (pressedKeys[KEY_UP  ] == true) { myTank.forwardVelocity += 1; }

        var isMoving = myTank.angularVelocity != 0 || myTank.forwardVelocity != 0;

        if (isMoving || wasMovingLastFrame) {
            // Don't emit to the server, because doing so every frame will overload the server
        }

        wasMovingLastFrame = isMoving;
    }

    // Update all the tanks' positions
    for (const id in tanks) {
        var tank = tanks[id];

        if (id == socket.id) {
            // How to update the position of currently controlled tanks if the server tells us 
            // something different.  For now do nothing - the client knows best.
        } else {
            // How to update the position of other tanks according to what the server says.
            var sTank = serverTanks[id];

            if (sTank) {
                // Copy across the velocities, so that the tank will do something approximately
                // what the server is saying - but that is smooth regardless.
                tank.angularVelocity = sTank.angularVelocity;
                tank.forwardVelocity = sTank.forwardVelocity;

                tank.x = lerp(tank.x, sTank.x, LATENCY_COMPENSATION_LERP_FACTOR * timeDelta);
                tank.y = lerp(tank.y, sTank.y, LATENCY_COMPENSATION_LERP_FACTOR * timeDelta);
                tank.r = lerp(tank.r, sTank.r, LATENCY_COMPENSATION_LERP_FACTOR * timeDelta);

                // Calculate the distance between where the server thinks the tank should be and
                // where the client thinks the tank should be.  This corresponds to the divergence
                var dX = sTank.x - tank.x;
                var dY = sTank.y - tank.y;
                var d = Math.sqrt(dX * dX + dY * dY);

                // We compare the cosines of the angles instead of the angles directly, because
                // the cosine function removes the edge case of wrapping angles round the 2pi mark
                /*
                if (d > 0.1 || Math.cos(tank.r - sTank.r) < Math.cos(0.3)) {
                    tank.x = sTank.x;
                    tank.y = sTank.y;
                    tank.r = sTank.r;
                }
                */
            }
        }

        var movementStep = tank.forwardVelocity * MOVEMENT_SPEED * timeDelta;

        tank.r += tank.angularVelocity * timeDelta * ROTATION_SPEED;
        tank.x -= movementStep * Math.sin(-tank.r);
        tank.y -= movementStep * Math.cos(-tank.r);
    }

    /* ===== RENDERING ==== */
    // Clear the canvas
    ctx.clearRect(0, 0, viewRect.width, viewRect.height);

    // Transform the canvas so that the map starts at (0, 0) and one unit corresponds to one
    // square of the grid
    ctx.save();
    ctx.translate(viewRect.width / 2, viewRect.height / 2);
    ctx.scale(200, 200);
    ctx.translate(-0.5, -0.5);

    // Draw the grid
    ctx.lineWidth = WALL_THICKNESS;
    ctx.strokeRect(0, 0, 1, 1);

    // Draw the tanks
    for (const id in tanks) {
        drawTank(tanks[id]);
    }
    
    if (SHOW_SERVER_TANKS) {
        for (const id in serverTanks) {
            drawTank(serverTanks[id], "rgba(0,0,0,0)");
        }
    }

    ctx.restore();

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
    // Save the canvas and move it so that the tank is at (0, 0) looking upwards
    ctx.save();
    ctx.translate(tank.x, tank.y);
    ctx.rotate(tank.r);

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





/* ===== UTILITIES ===== */
function lerp(a, b, t) {
    return (1 - t) * a + t * b;
}

function getMyTank() {
    return tanks[socket.id];
}
