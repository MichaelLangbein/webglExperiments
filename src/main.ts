import { Engine, Program, Entity, Attribute, Uniform, IAttribute, IUniform, Texture } from './engine/engine.core';
import { box, square } from './engine/engine.shapes';
const basic3dVertexShaderSource = require('./engine/shaders/basic3d.vert.glsl').default;
const basic3dFragmentShaderSource = require('./engine/shaders/basic3d.frag.glsl').default;


const canvas = document.getElementById('webGlCanvas') as HTMLCanvasElement;
const gl = canvas.getContext('webgl');

const letterImg = document.getElementById('letterTexture') as HTMLImageElement;
const boxImg = document.getElementById('boxTexture') as HTMLImageElement;

const engine = new Engine();

const program = new Program(gl, basic3dVertexShaderSource, basic3dFragmentShaderSource);

const letterEntity = new Entity(
    program,
    [
        new Attribute(gl, program, 'a_vertex', square(.2, .2) ),
        new Attribute(gl, program, 'a_textureCoord', square(.2, .2))
    ], [
        new Uniform(gl, program, 'u_translation', '3f', [.3, .3, .0]),
        new Uniform(gl, program, 'u_rotation', '3f', [.0, .0, .0])
    ], [
        new Texture(gl, program, 'u_texture', letterImg, 0)
    ],
    (tDelta: number, attrs: IAttribute[], unis: IUniform[]) => {
        unis[1].value[0] += 0.001 * tDelta;
        unis[1].value[1] += 0.001 * tDelta;
    });




const boxEntity = new Entity(
    program,
    [
        new Attribute(gl, program, 'a_vertex', box(.2, .2, .2) ),
        new Attribute(gl, program, 'a_textureCoord', box(.2, .2, .2))
    ], [
        new Uniform(gl, program, 'u_translation', '3f', [-.3, -.3, -.3]),
        new Uniform(gl, program, 'u_rotation', '3f', [.0, .0, .0])
    ], [
        new Texture(gl, program, 'u_texture', boxImg, 1)
    ],
    (tDelta: number, attrs: IAttribute[], unis: IUniform[]) => {
        unis[1].value[0] += 0.001 * tDelta;
        unis[1].value[1] += 0.001 * tDelta;
    }
);



engine.addEntity(letterEntity);
engine.addEntity(boxEntity);

engine.renderLoop(gl, 30);

