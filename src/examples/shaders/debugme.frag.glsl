precision mediump float;
    uniform sampler2D u_bgTexture;
    uniform sampler2D u_particleTexture;
    varying vec2 v_textureCoord;
    void main() {
        vec4 bgColor = texture2D(u_bgTexture, v_textureCoord);
        vec4 particleColor = texture2D(u_particleTexture, v_textureCoord);
        gl_FragColor = vec4(0.9 * particleColor.xyz + 0.1 * bgColor.xyz, 1.0);
    }