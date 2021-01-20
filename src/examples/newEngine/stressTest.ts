import { ArrayBundle, Program, Context, AttributeData, UniformData } from '../../engine2/engine.core';
import { rectangleA } from '../../engine2/engine.shapes';
const Stats = require('stats.js');

const body = document.getElementById('body') as HTMLDivElement;
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const mapDiv = document.getElementById('map') as HTMLDivElement;
const button = document.getElementById('button') as HTMLButtonElement;
const slider = document.getElementById('xrange') as HTMLInputElement;
const fpser = document.getElementById('fpser') as HTMLDivElement;


/**
 * The idea here is to test if GPUs execute vertex-shaders slower or faster than fragment-shaders.
 * For this, we can set `u_vertexOperations` and `u_fragmentOperations`.
 *
 * With this:
 * T = u_vertexOperations * #vertices * speedVertexRender + u_fragmentOperations * #pixels * speedFragmentRender
 *
 * By measuring T for different values u_vertexOperations and u_fragmentOperations, we should be able to infer the speeds.
 */


const rect = rectangleA(2, 2);

const shader = new ArrayBundle(new Program(
    `#version 300 es
    precision mediump float;
    in vec4 a_pos;
    uniform int u_vertexOperations;

    void main() {
        float val = 0.0;
        for (int i = 0; i < u_vertexOperations; i++) {
            val += asin(float(i) / float(u_vertexOperations));
        }
        gl_Position = a_pos + 0.00001 * val;
    }
    `,
    `#version 300 es
    precision mediump float;
    out vec4 color;
    uniform float u_time;
    uniform int u_fragmentOperations;

    void main() {
        float val = 0.0;
        for (int i = 0; i < u_fragmentOperations; i++) {
            val += asin(float(i) / float(u_fragmentOperations));
        }
        float r = 0.5 * sin(u_time) + 0.5 + 0.00001 * val;
        float g = 0.5 * cos(u_time) + 0.5;
        color = vec4(r, 0.0, g, 1.0);
    }
    `), {
        'a_pos': new AttributeData(new Float32Array(rect.vertices.flat()), 'vec4', false)
    }, {
        'u_time': new UniformData('float', [0]),
        'u_vertexOperations': new UniformData('int', [1000000]),
        'u_fragmentOperations': new UniformData('int', [1])
    }, {}, 'triangles', rect.vertices.length);

const context = new Context(canvas.getContext('webgl2') as WebGL2RenderingContext, true);


shader.upload(context);
shader.initVertexArray(context);
shader.bind(context);

const stats = new Stats();
stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
fpser.appendChild( stats.dom );
const startTime = window.performance.now();
function doRender() {
    requestAnimationFrame(() => {
        stats.begin();

        const time = (window.performance.now() - startTime) / 1000;
        shader.updateUniformData(context, 'u_time', [time]);
        shader.draw(context, [0, 0, 0, 0]);

        stats.end();
        doRender();
    });
}
doRender();