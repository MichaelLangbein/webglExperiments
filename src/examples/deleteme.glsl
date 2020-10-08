#version 300 es
    precision highp float;
    uniform vec4 u_color;
    out vec4 outputColor;

    void main() {
        outputColor = u_color;
    }