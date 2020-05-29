import { initShaderProgram, setup3dScene, createFloatBuffer, getAttributeLocation, bindBufferToAttribute } from './webgl';
const vertexShaderSource = require('./demo.vert').default;
const fragmentShaderSource = require('./demo.frag').default;


const canvas = document.getElementById('webGlCanvas') as HTMLCanvasElement;
const gl = canvas.getContext('webgl');
const program = initShaderProgram(gl, vertexShaderSource, fragmentShaderSource);
setup3dScene(gl, program);


const posBuffer = createFloatBuffer(gl, [
    [0, 0],
    [-1, 0.5],
    [1, 0.5]
]);

const posAttributeLocation = getAttributeLocation(gl, program, 'aVertexPosition');

bindBufferToAttribute(gl, posAttributeLocation, posBuffer);

var primitiveType = gl.TRIANGLES;
var offset = 0;
var count = 3;
gl.drawArrays(primitiveType, offset, count);


