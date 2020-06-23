
export const vertexShader = `
    attribute vec3 a_vertex;
    attribute vec3 a_textureCoord;
    varying vec2 v_textureCoord;

    void main() {
        v_textureCoord = vec2(a_textureCoord.xy);
        gl_Position = vec4(a_vertex.xyz, 1.);
    }
`;

export const fragmentShader = `
    precision mediump float;
    uniform sampler2D u_texture;
    varying vec2 v_textureCoord;

    void main() {
        vec4 colorVal = texture2D(u_texture, v_textureCoord);
        gl_FragColor = colorVal;
    }
`;