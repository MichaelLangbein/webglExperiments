import { Engine, Program, Entity, Attribute, Uniform, IAttribute, IUniform, Texture } from '../engine/engine.core';
import { box, rectangle, flattenMatrix, edgeDetectKernel, gaussianKernel, embossKernel, sumMatrix, normalKernel } from '../engine/engine.shapes';
import { clearBackground, bindBufferToAttribute, bindTextureToUniform, bindProgram, bindValueToUniform, createFramebuffer, bindOutputCanvasToFramebuffer, createTexture } from '../engine/webgl';
const basic3dVertexShaderSource = require('../engine/shaders/basic3d.vert.glsl').default;
const basic3dFragmentShaderSource = require('../engine/shaders/basic3d.frag.glsl').default;
const convVSS = require('../engine/shaders/conv.vert.glsl').default;
const convFSS = require('../engine/shaders/conv.frag.glsl').default;
const canvas = document.getElementById('webGlCanvas') as HTMLCanvasElement;
const letterImg = document.getElementById('letterTexture') as HTMLImageElement;
const boxImg = document.getElementById('boxTexture') as HTMLImageElement;
const whiteImage = document.getElementById('whiteImage') as HTMLImageElement;




const main = () => {
    const gl = canvas.getContext('webgl');
    const program = new Program(gl, convVSS, convFSS);
    bindProgram(gl, program.program);

    const bx = rectangle(.9, .9);

    const whiteTexture1 = createTexture(gl, whiteImage);
    const fb1 = createFramebuffer(gl);
    const whiteTexture2 = createTexture(gl, whiteImage);
    const fb2 = createFramebuffer(gl);

    const coords = new Attribute(gl, program, 'a_coord', bx.vertices);
    bindBufferToAttribute(gl, coords.location, coords.value);

    const texCoords = new Attribute(gl, program, 'a_textureCoord', bx.texturePositions);
    bindBufferToAttribute(gl, texCoords.location, texCoords.value);

    const inputTexture = new Texture(gl, program, 'u_image', boxImg, 0);
    bindTextureToUniform(gl, inputTexture.texture.texture, inputTexture.bindPoint, inputTexture.location);
    const texSize = new Uniform(gl, program, 'u_textureSize', '2f', [inputTexture.texture.width, inputTexture.texture.height]);
    bindValueToUniform(gl, texSize.location, texSize.type, texSize.value);

    clearBackground(gl, [.7, .7, .7, 1]);

    const kernels = [
        edgeDetectKernel(), gaussianKernel(), embossKernel(), normalKernel()
    ];
    const kernelVals = new Uniform(gl, program, 'u_kernel[0]', '1fv', flattenMatrix(edgeDetectKernel()));
    const kernelWeight = new Uniform(gl, program, 'u_kernelWeight', '1f', [1]);

    let i = 0;
    // for (const kernel of kernels) {
    //     // pick active framebuffer
    //     let fb = (i % 2 === 0) ? fb1 : fb2;
    //     // set rendering target
    //     bindFramebuffer(gl, fb);

    //     // update uniforms
    //     bindValueToUniform(gl, kernelVals.location, kernelVals.type, flattenMatrix(kernel));
    //     bindValueToUniform(gl, kernelWeight.location, kernelWeight.type, [sumMatrix(kernel)]);

    //     // draw operation will affect the currently bound framebuffer's texture.
    //     clearBackground(gl, [.7, .7, .7, 1]);
    //     gl.drawArrays(gl.TRIANGLES, 0, bx.length);

    //     // make the last output texture the new input texture
    //     bindTextureToUniform(gl, fb.texture.texture, inputTexture.bindPoint, inputTexture.location);
    //     i++;
    // }

    bindOutputCanvasToFramebuffer(gl);
    clearBackground(gl, [.7, .7, .7, 1]);
    gl.drawArrays(gl.TRIANGLES, 0, bx.vertices.length);

};

setTimeout(main, 1000);