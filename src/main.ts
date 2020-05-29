import { initShaderProgram, setup3dScene, createFloatBuffer, getAttributeLocation, bindBufferToAttribute, getUniformLocation, bindValueToUniform } from './webgl';
const vertexShaderSource = require('./demo.vert').default;
const fragmentShaderSource = require('./demo.frag').default;


const canvas = document.getElementById('webGlCanvas') as HTMLCanvasElement;

const gl = canvas.getContext('webgl');

const program = initShaderProgram(gl, vertexShaderSource, fragmentShaderSource);

setup3dScene(gl, program);

const posBuffer = createFloatBuffer(gl, [
    [-.8, .8],
    [.8, -.1],
    [-.1, -.8]
]);
const posAttributeLocation = getAttributeLocation(gl, program, 'aVertexPosition');
bindBufferToAttribute(gl, posAttributeLocation, posBuffer);


const colorUniformLocation = getUniformLocation(gl, program, 'uColor');
bindValueToUniform(gl, colorUniformLocation, '4f', [.1, .1, .9, .9]);


var offset = 0;
gl.drawArrays(gl.TRIANGLES, offset, posBuffer.vectorCount);


