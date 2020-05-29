import { initShaderProgram, setup3dScene, createFloatBuffer, getAttributeLocation, bindBufferToAttribute, getUniformLocation, bindValueToUniform } from './webgl';
const vertexShaderSource = require('./demo.vert').default;
const fragmentShaderSource = require('./demo.frag').default;


const canvas = document.getElementById('webGlCanvas') as HTMLCanvasElement;

const gl = canvas.getContext('webgl');

const program = initShaderProgram(gl, vertexShaderSource, fragmentShaderSource);

setup3dScene(gl, program);

const vertexBuffer = createFloatBuffer(gl, [
    // triangle one
    [-.8, .8],
    [.1, -.6],
    [-.5, -.8],

    // triangle two
    [-.2, .8],
    [.8, .8],
    [.9, -.6]
]);
const aVertexLoc = getAttributeLocation(gl, program, 'aVertexPosition');
bindBufferToAttribute(gl, aVertexLoc, vertexBuffer);

const uColorLoc = getUniformLocation(gl, program, 'uColor');
bindValueToUniform(gl, uColorLoc, '4f', [.1, .1, .9, .9]);

gl.drawArrays(gl.TRIANGLES, 0, 3);
bindValueToUniform(gl, uColorLoc, '4f', [.9, .1, .1, .9]); // <-- this seems inefficient. GPU needs to wait for CPU here.
gl.drawArrays(gl.TRIANGLES, 3, 3);