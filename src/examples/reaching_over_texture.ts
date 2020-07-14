import { Program, Shader, Attribute, Texture, Uniform } from '../engine/engine.core';
import { triangle } from '../engine/engine.shapes';


const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const texture = document.getElementById('boxTexture') as HTMLImageElement;
const gl = canvas.getContext('webgl');
if (!gl) {
    throw new Error('no context');
}

const program = new Program(gl, `
    attribute vec3 a_coord;
    attribute vec2 a_textureCoord;
    varying vec2 v_textureCoord;

    void main() {
        v_textureCoord = a_textureCoord;
        gl_Position = vec4(a_coord.xyz, 1.);
    }
`, `
    precision mediump float;
    varying vec2 v_textureCoord;
    uniform sampler2D u_texture;
    uniform vec2 u_size;
    uniform vec4 u_backgroundColor;

    void main() {
        vec2 delta = 1. / u_size;

        vec4 color = texture2D(u_texture, v_textureCoord);

        for (float r = 0.; r < 5.; r++) {
            vec2 offset = vec2(0., r * delta.y);
            vec4 offsetTextureColor = texture2D(u_texture, v_textureCoord + offset);
            if (offsetTextureColor == u_backgroundColor) {
                color = vec4(1., 0., 0., 1.);
            }
        }

        gl_FragColor = color;
    }
`);

const tri = triangle(1.8, 1.6);

const shader = new Shader(program, [
    new Attribute(gl, program, 'a_coord', tri.vertices),
    new Attribute(gl, program, 'a_textureCoord', tri.texturePositions)
], [
    new Uniform(gl, program, 'u_size', '2f', [canvas.width, canvas.height]),
    new Uniform(gl, program, 'u_backgroundColor', '4f', [.2, .0, .5, 1.])
], [
    new Texture(gl, program, 'u_texture', texture, 0)
]);

shader.bind(gl);
shader.render(gl, [.2, .0, .5, 1.]);