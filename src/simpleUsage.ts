import { initShaderProgram, setup3dScene, createFloatBuffer, getAttributeLocation, bindBufferToAttribute, getUniformLocation, bindValueToUniform, clearBackground, bindProgram } from './webgl';
const vertexShaderSource = require('./demo.vert').default;
const fragmentShaderSource = require('./demo.frag').default;


const canvas = document.getElementById('webGlCanvas') as HTMLCanvasElement;
const gl = canvas.getContext('webgl');

const program = initShaderProgram(gl, vertexShaderSource, fragmentShaderSource);

const aVertexLoc = getAttributeLocation(gl, program, 'aVertexPosition');
const uColorLoc = getUniformLocation(gl, program, 'uColor');
const uAngleLoc = getUniformLocation(gl, program, 'uAngle');

const vertexBuffer = createFloatBuffer(gl, [
    // triangle one
    [-.8, .8, .0],
    [.5, -.3, .0],
    [-.5, -.8, .0],

    // triangle two
    [-.2, .8, -.2],
    [.6, .8, -.2],
    [.6, -.7, -.2]
]);
bindBufferToAttribute(gl, aVertexLoc, vertexBuffer);


setup3dScene(gl);
bindProgram(gl, program);


let angle = 0.01;
let t0 = window.performance.now();
let tNow;
let tDelta;
const renderLoop = () => {
    tNow = window.performance.now();
    tDelta = tNow - t0;
    angle += 0.1 * tDelta;
    angle %= 360;
    t0 = tNow;

    clearBackground(gl, [0, 0, 0, 1]);

    bindValueToUniform(gl, uAngleLoc, '1f', [angle]);
    bindValueToUniform(gl, uColorLoc, '4f', [.1, .1, .9, .9]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    bindValueToUniform(gl, uColorLoc, '4f', [.9, .1, .1, .9]); // <-- this seems inefficient. GPU needs to wait for CPU here.
    gl.drawArrays(gl.TRIANGLES, 3, 3);

    requestAnimationFrame(renderLoop);
};

renderLoop();