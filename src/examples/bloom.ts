import { Program, Shader, Attribute, Uniform, Framebuffer, Texture } from '../engine/engine.core';
import { rectangle, flattenMatrix, gaussianKernel, sumMatrix } from '../engine/engine.shapes';


const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const gl = canvas.getContext('webgl');

const program1 = new Program(gl, `
    attribute vec2 a_pos;
    varying vec2 v_pos;
    void main() {
        gl_Position = vec4(a_pos.x, a_pos.y, 0., 1.);
        v_pos = a_pos;
    }
    `, `
    precision mediump float;
    varying vec2 v_pos;
    void main() {
        gl_FragColor = vec4(v_pos.x, v_pos.y, 0.5, 1.);
    }
    `);
const shader1 = new Shader(
    program1,
    [
        new Attribute(gl, program1, 'a_pos', [
            [-.5, -.3],
            [.1, .8],
            [.4, -.1]
        ])
    ], [], []
);

const framebuffer = new Framebuffer(gl, canvas.width, canvas.height);

shader1.bind(gl);
shader1.render(gl, [.0, .0, .0, 0.], framebuffer.fbo);



const program2 = new Program(gl, `
    attribute vec3 a_vertexCoord;
    attribute vec2 a_textureCoord;
    varying vec2 v_textureCoord;
    void main() {
        v_textureCoord = a_textureCoord;
        gl_Position = vec4(a_vertexCoord.xyz, 1.);
    }
    `, `
    precision mediump float;
    uniform sampler2D u_texture;
    uniform vec2 u_delta;
    uniform float u_kernel[9];
    uniform float u_kernelWeight;
    varying vec2 v_textureCoord;

    void main() {
        vec4 colorSum =
            texture2D(u_texture, v_textureCoord + u_delta * vec2(-1, -1)) * u_kernel[0] +
            texture2D(u_texture, v_textureCoord + u_delta * vec2( 0, -1)) * u_kernel[1] +
            texture2D(u_texture, v_textureCoord + u_delta * vec2( 1, -1)) * u_kernel[2] +
            texture2D(u_texture, v_textureCoord + u_delta * vec2(-1,  0)) * u_kernel[3] +
            texture2D(u_texture, v_textureCoord + u_delta * vec2( 0,  0)) * u_kernel[4] +
            texture2D(u_texture, v_textureCoord + u_delta * vec2( 1,  0)) * u_kernel[5] +
            texture2D(u_texture, v_textureCoord + u_delta * vec2(-1,  1)) * u_kernel[6] +
            texture2D(u_texture, v_textureCoord + u_delta * vec2( 0,  1)) * u_kernel[7] +
            texture2D(u_texture, v_textureCoord + u_delta * vec2( 1,  1)) * u_kernel[8];

        float transparency = colorSum.w;
        if (colorSum.x + colorSum.y + colorSum.z == 0.) {
            transparency = 0.;
        }
        gl_FragColor = vec4((colorSum / u_kernelWeight).rgb, transparency);
    }`);
const rect = rectangle(1.7, 1.7);
const shader2 = new Shader(
    program2,
    [
        new Attribute(gl, program2, 'a_vertexCoord', rect.vertices),
        new Attribute(gl, program2, 'a_textureCoord', rect.texturePositions),
    ], [
        new Uniform(gl, program2, 'u_delta', '2f', [.01, .01]),
        new Uniform(gl, program2, 'u_kernel', '1fv', flattenMatrix(gaussianKernel())),
        new Uniform(gl, program2, 'u_kernelWeight', '1f', [sumMatrix(gaussianKernel())])
    ], [
        new Texture(gl, program2, 'u_texture', framebuffer.fbo.texture, 0)
    ]
);

shader2.bind(gl);
shader2.render(gl, [.0, .1, .0, .3]);