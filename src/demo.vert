attribute vec4 aVertexPosition;
uniform float uAngle;

void main() {
    float angleRad = radians(uAngle);
    float c = cos(angleRad);
    float s = sin(angleRad);
    mat4 rotationMatrix = mat4(
        c,   0.0, -s,  0.0,
        0.0, 1.0, 0.0, 0.0,
        s,   0.0, c,   0.0,
        0.0, 0.0, 0.0, 1.0
    );
    gl_Position = rotationMatrix * aVertexPosition;
}