precision mediump float;
varying vec2 v_textureCoord;
uniform sampler2d u_texture;

void main() {
    gl_FragColor = texture2d(u_texture, v_textureCoord);
}