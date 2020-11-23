#version 300 es
    precision mediump float;
    out vec4 outputColor;
    in float v_color[4];

    void main() {
        outputColor = vec4(v_color[0], v_color[1], v_color[2], v_color[3]);
    }