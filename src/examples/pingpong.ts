import { Engine, Program, Entity, Attribute, Uniform, IAttribute, IUniform, Texture } from '../engine/engine.core';
import { box, square, flattenMatrix, edgeDetectKernel, gaussianKernel, embossKernel, sumMatrix, normalKernel } from '../engine/engine.shapes';
import { clearBackground, bindBufferToAttribute, bindTextureToUniform, bindProgram, bindValueToUniform, createFramebuffer, bindOutputCanvasToFramebuffer, bindFramebuffer } from '../engine/webgl';
const basic3dVertexShaderSource = require('../engine/shaders/basic3d.vert.glsl').default;
const basic3dFragmentShaderSource = require('../engine/shaders/basic3d.frag.glsl').default;
const convVSS = require('../engine/shaders/conv.vert.glsl').default;
const convFSS = require('../engine/shaders/conv.frag.glsl').default;
const canvas = document.getElementById('webGlCanvas') as HTMLCanvasElement;
const letterImg = document.getElementById('letterTexture') as HTMLImageElement;
const boxImg = document.getElementById('boxTexture') as HTMLImageElement;



const main = () => {
    const gl = canvas.getContext('webgl');
    const program = new Program(gl, convVSS, convFSS);
    bindProgram(gl, program.program);

    const bx = square(.9, .9);

    const coords = new Attribute(gl, program, 'a_coord', bx);
    bindBufferToAttribute(gl, coords.location, coords.value);

    const texCoords = new Attribute(gl, program, 'a_textureCoord', bx);
    bindBufferToAttribute(gl, texCoords.location, texCoords.value);

    const tex = new Texture(gl, program, 'u_image', boxImg, 0);
    bindTextureToUniform(gl, tex.texture.texture, tex.bindPoint, tex.location);
    const texSize = new Uniform(gl, program, 'u_textureSize', '2f', [tex.texture.originalImage.width, tex.texture.originalImage.height]);
    bindValueToUniform(gl, texSize.location, texSize.type, texSize.value);

    clearBackground(gl, [.7, .7, .7, 1]);


    const fb1 = createFramebuffer(gl, tex.texture);
    const fb2 = createFramebuffer(gl, tex.texture);


    const kernels = [
        edgeDetectKernel(), gaussianKernel(), embossKernel(), normalKernel()
    ];
    const edgeKernel = new Uniform(gl, program, 'u_kernel[0]', '1fv', flattenMatrix(edgeDetectKernel()));
    const kernelWeight = new Uniform(gl, program, 'u_kernelWeight', '1f', [1]);

    let i = 0;
    for (const kernel of kernels) {
        // pick active framebuffer
        let fb = (i % 2 === 0) ? fb1 : fb2;
        bindFramebuffer(gl, fb);

        // update uniforms
        bindValueToUniform(gl, edgeKernel.location, edgeKernel.type, flattenMatrix(kernel));
        bindValueToUniform(gl, kernelWeight.location, kernelWeight.type, [sumMatrix(kernel)]);

        gl.drawArrays(gl.TRIANGLES, 0, bx.length);
        i++;
    }

    bindOutputCanvasToFramebuffer(gl);
    gl.drawArrays(gl.TRIANGLES, 0, bx.length);

};

setTimeout(main, 1000);