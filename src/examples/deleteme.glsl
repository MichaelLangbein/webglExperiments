#version 300 es
precision lowp float;
uniform sampler2D u_dataTexture;
uniform int u_nrDataPoints;
in vec2 v_position;
out vec4 color;

void main() {
    float val = 0.0;
    float minDistance = 100000.0;
    for(int i = 0; i < u_nrDataPoints; i++) {
        float pos = float(i) / float(u_nrDataPoints);
        vec4 data = texture(u_dataTexture, vec2(pos, 0.0));
        float iDistance = distance(data.xy, v_position);
        if (iDistance < minDistance) {
            val = data.z;
            minDistance = iDistance;
        }
    }
    // float val = texture(u_dataTexture, vec2(0.8, 0.0)).z / 10.0 + 0.0 * u_nrDataPoints;
    color = vec4(val, val, val, 1.0);
}