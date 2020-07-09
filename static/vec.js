function Vec2(x, y) {
    this.x = x;
    this.y = y;

    // Basic algebraic functions
    this.mul = function(scalar) {
        return new Vec2(this.x * scalar, this.y * scalar);
    };

    this.div = function(scalar) {
        return new Vec2(this.x / scalar, this.y / scalar);
    };

    this.add = function(other) {
        return new Vec2(this.x + other.x, this.y + other.y);
    };

    this.sub = function(other) {
        return new Vec2(this.x - other.x, this.y - other.y);
    };

    // Other basic functions
    this.dot = function(other) {
        return this.x * other.x + this.y * other.y;
    };

    this.length = function() {
        return Math.sqrt(this.squareLength());
    };

    this.squareLength = function() {
        return this.dot(this);
    };

    // More complex but useful functions
    this.perpendicular = function() {
        return new Vec2(-vector.y, vector.x);
    };

    this.projectOnto = function(vector, dir) {
        return dir.mul(vector.dot(dir) / dir.squareLength());
    };

    this.reflectInDirection = function(vector, dir) {
        return vector.sub(vector.projectOnto(dir).mul(2));
    }
}
