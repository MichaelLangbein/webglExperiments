attribute vec4 a_vertex;
attribute vec2 a_textureCoord;
uniform vec3 u_translation;
uniform vec3 u_rotation;
varying vec2 v_textureCoord;



mat4 rotationAxis(float angle, vec3 axis) {
    float s = sin(angle);
    float c = cos(angle);
    float oc = 1.0 - c;
    return mat4(oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,  0.0,
                oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,  0.0,
                oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c,           0.0,
                0.0,                                0.0,                                0.0,                                1.0);
}

mat4 rotateX(float angle) {
    mat4 rmx = rotationAxis(angle, vec3(1.0, 0.0, 0.0));
    return rmx
}

mat4 rotateY(float angle) {
    mat4 rmy = rotationAxis(angle, vec3(0.0, 1.0, 0.0));
    return rmy;
}

vec3 rotateZ(float angle) {
    mat4 rmz = rotationAxis(angle, vec3(0.0, 0.0, 1.0));
    return rmz;
}




void main() {
    vec4 position = rotateZ(u_rotation.z) * rotateY(u_rotation.y) * rotateX(u_rotation.x) * a_vertex + vec4(u_translation, .0);
    // TODO: perspective
    gl_Position = position;
    v_textureCoord = a_textureCoord;
}