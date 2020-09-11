import { rectangleE } from '../engine/engine.shapes';
import { Shader, Program, Attribute, Index } from '../engine/engine.core';
import { createIndexBuffer, arrayToCanvas } from '../engine/webgl';


const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const gl = canvas.getContext('webgl');
if (!gl) {
    throw new Error('no context');
}


const rect = rectangleE(1.1, 0.9);

const rectProgram = new Program(gl, `
    precision mediump float;
    attribute vec3 a_pos;
    varying vec3 v_pos;

    void main() {
        v_pos = a_pos;
        gl_Position = vec4(a_pos, 1.0);
    }
`, `
    precision mediump float;
    varying vec3 v_pos;

    void main() {
        gl_FragColor = vec4(v_pos.xy, 0.0, 1.0);
    }
`);
const rectShader = new Shader(rectProgram, [
    new Attribute(gl, rectProgram, 'a_pos', rect.vertices)
], [], [], new Index(gl, rect.vertexIndices));

rectShader.bind(gl);
rectShader.render(gl, [0, 0, 0, 0]);



