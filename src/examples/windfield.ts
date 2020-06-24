import { Program, Shader, renderLoop, Framebuffer, Attribute, Uniform, Texture } from '../engine/engine.core';
import { rectangle, flattenMatrix } from '../engine/engine.shapes';


const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const gl = canvas.getContext('webgl');


const fieldProgram = new Program(gl, `
    attribute vec4 a_observation;
    varying vec2 v_value;

    void main() {
        v_value = a_observation.zw;
        gl_Position = vec4(a_observation.xy, 0.0, 1.0);
    }
`, `
    precision mediump float;
    varying vec2 v_value;

    void main() {
        gl_FragColor = vec4(v_value.xy, 0.0, 1.0);
    }
`);

const fieldShader = new Shader(fieldProgram, [
    new Attribute(gl, fieldProgram, 'a_observation', [
        // locx, locy,   valx, valy
        [-0.4,   0.8,    0.1,  0.1],  // a
        [-0.6,  -0.2,    0.4,  0.5],  // b
        [ 0.2,   0.4,    0.2,  0.05],  // c

        [ 0.2,   0.4,    0.2,  0.05],  // c
        [-0.6,  -0.2,    0.4,  0.5],  // b
        [ 0.8,  -0.2,    0.3, -0.2], // d

        [ 0.8,  -0.2,    0.3, -0.2], // d
        [-0.6,  -0.2,    0.4,  0.5],  // b
        [-0.1,  -0.8,    0.5,  -0.1],  // e
    ])
], [], []);




const framebuffer = new Framebuffer(gl, canvas.width, canvas.height);



const rect = rectangle(2.0, 2.0);

const particleProgram = new Program(gl, `
    attribute vec3 a_vertexCoord;
    attribute vec2 a_textureCoord;
    varying vec2 v_textureCoord;

    void main() {
        v_textureCoord = a_textureCoord;
        gl_Position = vec4(a_vertexCoord, 1.0);
    }
`, `
    precision mediump float;
    varying vec2 v_textureCoord;
    uniform sampler2D u_texture;

    void main() {
        vec4 texColor = texture2D(u_texture, v_textureCoord);
        float strength = length(texColor.xy);
        gl_FragColor = vec4(strength, strength, strength, 1.0);
    }
`);

const particleShader = new Shader(particleProgram, [
    new Attribute(gl, particleProgram, 'a_vertexCoord', rect.vertices),
    new Attribute(gl, particleProgram, 'a_textureCoord', rect.texturePositions)
], [], [
    new Texture(gl, particleProgram, 'u_texture', framebuffer.fbo.texture, 0)
]);



fieldShader.bind(gl);
fieldShader.render(gl, null, framebuffer.fbo);
let t = 0;
renderLoop(20, (deltaT: number) => {
    t += deltaT;
    // particleShader.updateUniformData(gl, 'u_time', [t]);
    particleShader.bind(gl);
    particleShader.render(gl);
});