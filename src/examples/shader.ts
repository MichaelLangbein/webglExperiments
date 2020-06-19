import { Program, Shader, Attribute, Uniform } from '../engine/engine.core';


const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const gl = canvas.getContext('webgl');

const minVertShader = `
    attribute vec2 a_pos;
    varying vec2 v_pos;
    void main() {
        gl_Position = vec4(a_pos.x, a_pos.y, 0., 1.);
        v_pos = a_pos;
    }
`;
const minFragShader = `
    precision mediump float;
    uniform vec3 u_color;
    varying vec2 v_pos;
    void main() {
        gl_FragColor = vec4(u_color.xyz, 1.);
    }
`;
const minProg = new Program(gl, minVertShader, minFragShader);
const minShader = new Shader(
    minProg,
    [
        new Attribute(gl, minProg, 'a_pos', [
            [-.5, -.3],
            [.1, .8],
            [.4, -.1]
        ])
    ], [
        new Uniform(gl, minProg, 'u_color', '3f', [.8, .1, .1])
    ], []
);



minShader.bind(gl);
minShader.render(gl);

minShader.updateAttributeData(gl, 'a_pos', [
    [-.5, .5],
    [.4, .8],
    [.05, -.4]
]);
minShader.updateUniformData(gl, 'u_color', [.1, .8, .1]);
minShader.render(gl);