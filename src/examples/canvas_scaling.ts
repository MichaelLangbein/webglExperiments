import { rectangleE } from '../engine/engine.shapes';
import { Program, Shader, Attribute, Index, Texture, Uniform, DataTexture } from '../engine/engine.core';


const createCircleTextureArray = (rows: number, columns: number, radius: number): number[][][] => {
    const center_x = rows / 2;
    const center_y = columns / 2;

    const data = [];
    for (let row = 0; row < rows; row++) {
        const rowData = [];
        for (let col = 0; col < columns; col++) {

            const offx = center_x - col;
            const offy = center_y - row;
            const rad = Math.sqrt(offx * offx + offy * offy);

            if (rad < radius) {
                const r = Math.random() * 255;
                const g = Math.random() * 255;
                const b = Math.random() * 255;
                const a = 255;
                rowData.push([r, g, b, a]);
            } else {
                const r = 0;
                const g = 0;
                const b = 0;
                const a = 0;
                rowData.push([r, g, b, a]);
            }

        }
        data.push(rowData);
    }
    return data;
};


const container = document.getElementById('container');

const w = 1;
const h = 1;
const r = 1;

const data = createCircleTextureArray(w, h, r);

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const gl = canvas.getContext('webgl');
if (!gl) {
    throw new Error('no context');
}


const rect = rectangleE(1.9, 1.9);

const rectProgram = new Program(gl, `
    precision mediump float;
    attribute vec3 a_pos;
    attribute vec2 a_texturePos;
    varying vec2 v_texturePos;

    void main() {
        v_texturePos = a_texturePos;
        gl_Position = vec4(a_pos, 1.0);
    }
`, `
    precision mediump float;
    uniform sampler2D u_texture;
    varying vec2 v_texturePos;

    void main() {
        gl_FragColor = texture2D(u_texture, v_texturePos);
    }
`);
const rectShader = new Shader(rectProgram, [
    new Attribute(gl, rectProgram, 'a_pos', rect.vertices),
    new Attribute(gl, rectProgram, 'a_texturePos', rect.texturePositions)
], [], [
    new DataTexture(gl, rectProgram, 'u_texture', data, 0)
], new Index(gl, rect.vertexIndices));


/**
 * Webgl renders to the viewport, which is relative to canvas.width * canvas.height.
 * (To be more precise, only *polygons* are clipped to the viewport.
 * Operations like `clearColor()` et.al., will draw to the *full* canvas.width * height!
 * If you want to also constrain clearColor, use `scissor` instead of viewport.)
 * That canvas.width * canvas.height then gets stretched to canvas.clientWidth * canvas.clientHeight.
 * (Note: the full canvas.width gets stretched to clientWidth, not just the viewport!)
 */
canvas.width = 100;
canvas.height = 100;
rectShader.bind(gl);
rectShader.render(gl, [0, 0, 0, 0], null, [10, 10, 90, 90]);
console.log(gl.getParameter(gl.VIEWPORT));
