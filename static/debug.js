var debugShapes = [];

const LINE = "line";
const RECT = "rect";
const POINT = "point";

function addDebugLine(p1, p2, colour) {
    debugShapes.push({
        type: LINE,
        p1: p1,
        p2: p2,
        colour: colour
    });
}

function addDebugRect(origin, size, colour) {
    debugShapes.push({
        type: RECT,
        origin: origin,
        size: size,
        colour: colour
    });
}

function addDebugPoint(point, colour) {
    debugShapes.push({
        type: POINT,
        point: point,
        colour: colour
    });
}

function drawAllDebugShapes(ctx) {
    ctx.lineWidth = 0.01;

    // Draw the shapes
    for (var i = 0; i < debugShapes.length; i++) {
        let shape = debugShapes[i];

        ctx.strokeStyle = shape.colour || "#f0f";
        ctx.fillStyle = shape.colour || "#f0f";

        if (shape.type === RECT) {
            ctx.strokeRect(shape.origin.x, shape.origin.y, shape.size.x, shape.size.y);
        } else if (shape.type === LINE) {
            ctx.beginPath();
            ctx.moveTo(shape.p1.x, shape.p1.y);
            ctx.lineTo(shape.p2.x, shape.p2.y);
            ctx.stroke();
        } else if (shape.type === POINT) {
            ctx.beginPath();
            ctx.arc(shape.point.x, shape.point.y, 0.02, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Clear the debug shapes for the next frame
    debugShapes = [];
}
