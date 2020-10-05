import { Program, Shader, Framebuffer, renderLoop, Attribute, Texture } from '../../engine/engine.core';
import { rectangleA } from '../../engine/engine.shapes';
import { createTextCanvas } from '../../engine/engine.helpers';


const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const gl = canvas.getContext('webgl');
if (!gl) {
    throw new Error('no context');
}

const rect = rectangleA(2.0, 2.0);
const testCanvas = createTextCanvas('test', 256, 256, 'red');
const fb1 = new Framebuffer(gl, canvas.width, canvas.height);
const fb2 = new Framebuffer(gl, canvas.width, canvas.height);

const moveProgram = new Program(gl, `
    precision mediump float;
    attribute vec3 a_vertexCoord;
    attribute vec2 a_textureCoord;
    varying vec2 v_textureCoord;
    void main() {
        v_textureCoord = a_textureCoord;
        gl_Position = vec4(a_vertexCoord.xyz, 1.0);
    }
`, `
    precision mediump float;
    uniform sampler2D u_texture;
    varying vec2 v_textureCoord;
    void main() {
        vec2 samplePoint = v_textureCoord + vec2(0.01, 0.01);
        gl_FragColor = texture2D(u_texture, samplePoint);
    }
`);
const moveShader = new Shader(moveProgram, [
    new Attribute(gl, moveProgram, 'a_vertexCoord', rect.vertices),
    new Attribute(gl, moveProgram, 'a_textureCoord', rect.texturePositions)
], [], [
    new Texture(gl, moveProgram, 'u_texture', testCanvas, 0)
]);

const displayProgram = new Program(gl, `
    precision mediump float;
    attribute vec3 a_vertexCoord;
    attribute vec2 a_textureCoord;
    varying vec2 v_textureCoord;
    void main() {
        v_textureCoord = a_textureCoord;
        gl_Position = vec4(a_vertexCoord.xyz, 1.0);
    }
`, `
    precision mediump float;
    uniform sampler2D u_texture;
    varying vec2 v_textureCoord;
    void main() {
        gl_FragColor = texture2D(u_texture, v_textureCoord);
    }
`);
const displayShader = new Shader(displayProgram, [
    new Attribute(gl, displayProgram, 'a_vertexCoord', rect.vertices),
    new Attribute(gl, displayProgram, 'a_textureCoord', rect.texturePositions)
], [], [
    new Texture(gl, displayProgram, 'u_texture', testCanvas, 0),
]);



let i = 0;
let fbIn, fbOut;
renderLoop(20, (deltaT: number) => {
    i += 1;

    // framebuffer ping-pong
    if (i % 2 === 1) {
        fbIn = fb1;
        fbOut = fb2;
    } else {
        fbIn = fb2;
        fbOut = fb1;
    }

    moveShader.textures[0].texture = fbIn.fbo.texture;
    moveShader.bind(gl);
    moveShader.render(gl, undefined, fbOut.fbo);

    displayShader.textures[0].texture = fbOut.fbo.texture;
    displayShader.render(gl);
});