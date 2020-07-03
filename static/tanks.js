// Global variables
var canvas;
var ctx;
var viewRect;
var socket;

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
    // Test the canvas
    ctx.fillStyle = "gray";
    var b = 10;
    ctx.fillRect(b, b, viewRect.width - b * 2, viewRect.height - b * 2);

    ctx.beginPath();
    ctx.moveTo(100, 100);
    ctx.lineTo(200, 200);
    ctx.stroke();
}
