import { Program, Shader, Attribute } from '../../engine/engine.core';
import { triangleA } from '../../engine/engine.shapes';

// 0. Setup
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const gl = canvas.getContext('webgl');
if (!gl) {
    throw new Error('no context');
}
const obj = triangleA(1., 1.);


const program = new Program(
    gl,
    `
        precision mediump float;
        attribute vec3 a_position;
        attribute vec3 a_color;
        varying vec3 v_color;
        void main() {
            v_color = a_color;
            gl_Position = vec4(a_position.xyz, 1.0);
        }
    `,
    `
        precision mediump float;
        varying vec3 v_color;
        void main() {
            gl_FragColor = vec4(v_color.xyz, 1.0);
        }
    `,
);

const shader = new Shader(program, [
    new Attribute(gl, program, 'a_position', obj.vertices),
    new Attribute(gl, program, 'a_color', [
        [1.0, 0.0, 0.0],
        [0.0, 1.0, 0.0],
        [0.0, 0.0, 1.0]
    ])
], [], []);

shader.bind(gl);
shader.render(gl);