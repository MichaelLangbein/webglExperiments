import { TextureObject, createShaderProgram, createFloatBuffer, getAttributeLocation, bindBufferToAttribute, clearBackground, getUniformLocation, bindTextureToUniform, bindProgram, bindValueToUniform, createTexture } from './webgl';
import { rectangle } from './engine.shapes';
const ptVSS = require('../engine/shaders/passthrough.vert.glsl').default;
const ptFSS = require('../engine/shaders/passthrough.frag.glsl').default;


export const displayImageOn = (canvas: HTMLCanvasElement, image: HTMLImageElement): void => {

    const gl = canvas.getContext('webgl');

    const vertexShaderSource = `
    attribute vec4 a_vertex;
    attribute vec2 a_textureCoord;
    varying vec2 v_textureCoord;
    void main() {
        v_textureCoord = a_textureCoord;
        gl_Position = a_vertex;
    }
    `;
    const fragmentShaderSource = `
    precision mediump float;
    uniform sampler2D u_texture;
    // uniform vec2 u_textureSize;
    varying vec2 v_textureCoord;
    void main() {
        // vec2 delta = vec2(1., 1.) / u_textureSize;
        gl_FragColor = texture2D(u_texture, v_textureCoord); //  * 0. + vec4(5., 5., 0., 1.);
    }
    `;
    const program = createShaderProgram(gl, vertexShaderSource, fragmentShaderSource);
    bindProgram(gl, program);

    const rct = rectangle(1.3, 1.3);

    const bxData = createFloatBuffer(gl, rct.vertices);
    const bxLoc = getAttributeLocation(gl, program, 'a_vertex');
    bindBufferToAttribute(gl, bxLoc, bxData);

    const texCoords = createFloatBuffer(gl, rct.texturePositions);
    const texCoordsLoc = getAttributeLocation(gl, program, 'a_textureCoord');
    bindBufferToAttribute(gl, texCoordsLoc, texCoords);

    const texture = createTexture(gl, image);
    const textureLoc = getUniformLocation(gl, program, 'u_texture');
    bindTextureToUniform(gl, texture.texture, 0, textureLoc);

    clearBackground(gl, [.9, .9, .9, 1.0]);
    gl.drawArrays(gl.TRIANGLES, 0, rct.vertices.length);
};



export const createTextCanvas = (text: string, width: number = 256, height: number = 256, color: string = 'red') => {
    const ctx = document.createElement('canvas').getContext('2d');
    ctx.canvas.width = width;
    ctx.canvas.height = height;
    ctx.font = `bold ${height * 5 / 6 | 0}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.fillText(text, width / 2, height / 2);
    return ctx.canvas;
  };