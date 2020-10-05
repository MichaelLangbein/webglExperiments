import { Program, Attribute, Uniform, IAttribute, IUniform, Texture } from '../../engine/engine.core';
import { rectangleA, edgeDetectKernel } from '../../engine/engine.shapes';
import { clearBackground, bindBufferToAttribute, bindTextureToUniform, bindProgram, bindValueToUniform } from '../../engine/webgl';
import { flattenRecursive } from '../../engine/math';
const basic3dVertexShaderSource = require('./shaders/basic3d.vert.glsl').default;
const basic3dFragmentShaderSource = require('./shaders/basic3d.frag.glsl').default;
const convVSS = require('./shaders/conv.vert.glsl').default;
const convFSS = require('./shaders/conv.frag.glsl').default;
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const letterImg = document.getElementById('letterTexture') as HTMLImageElement;
const boxImg = document.getElementById('boxTexture') as HTMLImageElement;

const main = () => {
    const gl = canvas.getContext('webgl');
    if (!gl) {
        throw new Error('no context');
    }
    const program = new Program(gl, convVSS, convFSS);
    bindProgram(gl, program.program);

    const bx = rectangleA(1., 1.);

    const coords = new Attribute(gl, program, 'a_vertex', bx.vertices);
    bindBufferToAttribute(gl, coords.location, coords.value);

    const texCoords = new Attribute(gl, program, 'a_textureCoord', bx.texturePositions);
    bindBufferToAttribute(gl, texCoords.location, texCoords.value);

    const tex = new Texture(gl, program, 'u_texture', boxImg, 0);
    bindTextureToUniform(gl, tex.texture.texture, tex.bindPoint, tex.location);
    const texSize = new Uniform(gl, program, 'u_textureSize', 'vec2', [tex.texture.width, tex.texture.height]);
    bindValueToUniform(gl, texSize.location, texSize.type, texSize.value);

    const edgeKernel = new Uniform(gl, program, 'u_kernel[0]', 'mat3', flattenRecursive(edgeDetectKernel()));
    bindValueToUniform(gl, edgeKernel.location, edgeKernel.type, edgeKernel.value);
    const kernelWeight = new Uniform(gl, program, 'u_kernelWeight', 'float', [1]);
    bindValueToUniform(gl, kernelWeight.location, kernelWeight.type, kernelWeight.value);

    clearBackground(gl, [.7, .7, .7, 1]);
    gl.drawArrays(gl.TRIANGLES, 0, bx.vertices.length);
};

setTimeout(main, 1000);