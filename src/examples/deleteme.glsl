#version 300 es
        precision mediump float;
    uniform sampler2D u_texture;
    in vec2 v_texPosition;
    out vec4 outputColor;

    void main() {
        outputColor = texture(u_texture, v_texPosition);
    }