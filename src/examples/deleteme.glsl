#version 300 es
    precision mediump float;
    in vec4 a_position;

    void main() {
        vec4 pos = a_position;
        gl_Position = pos;
    }