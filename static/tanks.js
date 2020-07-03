// Global 'constants' set in the onLoad function
var canvas;
var ctx;
var viewRect;
var socket;

// Key tracking
var pressedKeys = {};
window.onkeyup = function(e) { pressedKeys[e.keyCode] = false; }
window.onkeydown = function(e) { pressedKeys[e.keyCode] = true; }

// Variables for the game
var grid = { w: 1, h: 1 };
var myTankIndex = 0;
var tanks = [
    new Tank(0.5, 0.5, 1.7, "lime"),
    new Tank(0.4, 1.7, 0.5, "blue")
];

var lastTime = Date.now();

// ===== CONSTANTS =====
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

    socket.on('connect', function() {
        socket.emit('c_new_user', {
            data: 'Hello World!'
        })
    });

    frame();
}

// Called 60 time per second, render the game
function frame() {
    /* ===== UPDATES ===== */
    // Calculate the time since last frame for framerate independence
    var timeDelta = (Date.now() - lastTime) / 1000;
    lastTime = Date.now();

    // Control my tank
    var myTank = tanks[myTankIndex];

    myTank.angularVelocity = 0;
    if (pressedKeys[KEY_LEFT ] == true) { myTank.angularVelocity -= 1; }
    if (pressedKeys[KEY_RIGHT] == true) { myTank.angularVelocity += 1; }

    myTank.forwardVelocity = 0;
    if (pressedKeys[KEY_DOWN] == true) { myTank.forwardVelocity -= 1; }
    if (pressedKeys[KEY_UP  ] == true) { myTank.forwardVelocity += 1; }

    // Update all the tanks' positions
    for (var i = 0; i < tanks.length; i++) {
        var tank = tanks[i];

        tank.r += tank.angularVelocity * timeDelta * ROTATION_SPEED;
        tank.x -= tank.forwardVelocity * Math.sin(-tank.r) * timeDelta;
        tank.y -= tank.forwardVelocity * Math.cos(-tank.r) * timeDelta;
    }

    /* ===== RENDERING ==== */
    // Clear the canvas
    ctx.clearRect(0, 0, viewRect.width, viewRect.height);

    // Transform the canvas so that the map starts at (0, 0) and one unit corresponds to one
    // square of the grid
    ctx.save();
    ctx.translate(viewRect.width / 2, viewRect.height / 2);
    ctx.scale(400, 400);
    ctx.translate(-0.5, -0.5);

    // Draw the grid
    ctx.lineWidth = WALL_THICKNESS;
    ctx.strokeRect(0, 0, 1, 1);

    // Draw the tanks
    for (var i = 0; i < tanks.length; i++) {
        tanks[i].draw();
    }

    ctx.restore();

    window.requestAnimationFrame(frame);
}

// Draw a rectangle with both a fill and a stroke
function fillStrokeRect(x, y, w, h) {
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
}

// Constructor for a new tank
function Tank(x, y, r, col) {
    this.x = x;
    this.y = y;
    this.r = r;
    this.col = col;

    this.angularVelocity = 0;
    this.forwardVelocity = 0;

    // Draw the tank
    this.draw = function() {
        // Save the canvas and move it so that the this is at (0, 0) looking upwards
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.r);

        // Setup the right colours and line widths
        ctx.strokeStyle = "black";
        ctx.fillStyle = this.col;
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

        // Reset the canvas to where it was before drawing the this
        ctx.restore();
    }
}
