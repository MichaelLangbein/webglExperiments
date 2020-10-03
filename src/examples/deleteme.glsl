precision mediump float;
    uniform sampler2D u_texture;
    varying vec3 v_pos;
    varying vec2 v_texPos;

    void main() {
        vec4 pixelColor = texture2D(u_texture, v_texPos);
        gl_FragColor = vec4(pixelColor.xyz, 1.0);
    }