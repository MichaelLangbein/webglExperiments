import { Program, Shader, Attribute, Uniform, Framebuffer, Texture } from '../engine/engine.core';
import { rectangle } from '../engine/engine.shapes';


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
    varying vec2 v_textureCoord;
    void main() {
        gl_FragColor = texture2D(u_texture, v_textureCoord);
    }
    `);
const rect = rectangle(1.7, 1.7);
const shader2 = new Shader(
    program2,
    [
        new Attribute(gl, program2, 'a_vertexCoord', rect.vertices),
        new Attribute(gl, program2, 'a_textureCoord', rect.texturePositions),
    ], [], [
        new Texture(gl, program2, 'u_texture', framebuffer.fbo.texture, 0)
    ]
);

shader2.bind(gl);
shader2.render(gl, [.0, .1, .0, .3]);