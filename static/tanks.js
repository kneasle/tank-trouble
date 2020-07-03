// Global 'constants' set in the onLoad function
var canvas;
var ctx;
var viewRect;
var socket;

// Variables for the game
var grid = { w: 1, h: 1 };
var tanks = [
    { x: 0.5, y: 0.5, r: 1.7, col: "lime" }
];

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
        var tank = tanks[i];

        drawTank(tank);
    }

    ctx.restore();
}

// Draw a tank
function drawTank(tank) {
    // Save the canvas and move it so that the tank is at (0, 0) looking upwards
    ctx.save();
    ctx.translate(tank.x, tank.y);
    ctx.rotate(tank.r);

    // Setup the right colours and line widths
    ctx.strokeStyle = "black";
    ctx.fillStyle = tank.col;
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

// Draw a rectangle with both a fill and a stroke
function fillStrokeRect(x, y, w, h) {
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
}
