import { Engine, Program, Entity, Attribute, Uniform, IAttribute, IUniform } from './engine.core';
import { box } from './engine.shapes';
import { getAttributeLocation, getUniformLocation } from './webgl';
const basic3dVertexShaderSource = require('./shaders/basic3d.vert.glsl').default;
const basic3dFragmentShaderSource = require('./shaders/basic3d.frag.glsl').default;


const canvas = document.getElementById('webGlCanvas') as HTMLCanvasElement;
const gl = canvas.getContext('webgl');

const engine = new Engine();

const program = new Program(gl, basic3dVertexShaderSource, basic3dFragmentShaderSource);

const redSquare = new Entity(
    program,
    [
        new Attribute(gl, program, 'a_vertex', box(.2, .2, .2) )
    ], [
        new Uniform(gl, program, 'u_translation', '3f', [.3, .3, .0]),
        new Uniform(gl, program, 'u_rotation', '3f', [.0, .0, .0])
    ],
    (tDelta: number, attrs: IAttribute[], unis: IUniform[]) => {
        unis[1].value[0] += 0.001 * tDelta;
        unis[1].value[1] += 0.001 * tDelta;
    });




const blueSquare = new Entity(
    program,
    [
        new Attribute(gl, program, 'a_vertex', box(.2, .2, .2) )
    ], [
        new Uniform(gl, program, 'u_translation', '3f', [-.3, -.3, -.3]),
        new Uniform(gl, program, 'u_rotation', '3f', [.0, .0, .0])
    ],
    (tDelta: number, attrs: IAttribute[], unis: IUniform[]) => {
        unis[1].value[0] += 0.001 * tDelta;
        unis[1].value[1] += 0.001 * tDelta;
    }
);



engine.addEntity(redSquare);
engine.addEntity(blueSquare);

engine.renderLoop(gl, 30);

