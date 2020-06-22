precision mediump float;
uniform sampler2D u_texture;
// uniform vec2 u_textureSize;
varying vec2 v_textureCoord;

void main() {
    // vec2 delta = vec2(1., 1.) / u_textureSize;
    gl_FragColor = texture2D(u_texture, v_textureCoord);
}