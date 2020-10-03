import { Program, Shader, Index, Attribute, Uniform, Texture } from "./engine.core";
import { ShapeE } from "./engine.shapes";
import { flattenRecursive, transposeMatrix, projectionMatrix } from "./math";


function createSimple3dProgram (gl: WebGLRenderingContext): Program {

    const simple3DProgram = new Program(gl, `
    precision mediump float;
    attribute vec4 a_pos;
    attribute vec2 a_texPos;
    varying vec2 v_texPos;
    uniform mat4 u_model;
    uniform mat4 u_projection;

    void main() {
        v_texPos = a_texPos;
        vec4 pos = u_projection * u_model * a_pos;
        gl_Position = pos;
    }
    `, `
    precision mediump float;
    uniform sampler2D u_texture;
    varying vec2 v_texPos;
    uniform float u_opacity;

    void main() {
        vec4 pixelColor = texture2D(u_texture, v_texPos);
        gl_FragColor = vec4(pixelColor.xyz, u_opacity);
    }
    `);

    return simple3DProgram;
}




export class Element3D {
    readonly shader: Shader;


    constructor(
        gl: WebGLRenderingContext,
        public position: number[],
        readonly mesh: ShapeE,
        readonly texture: HTMLImageElement) {

        const program = createSimple3dProgram(gl);
        this.shader = new Shader(
            program,
            [
                new Attribute(gl, program, 'a_pos', mesh.vertices),
                new Attribute(gl, program, 'a_texPos', mesh.texturePositions)
            ], [
                new Uniform(gl, program, 'u_model', 'mat4', flattenRecursive(transposeMatrix(initialTransform))),
                new Uniform(gl, program, 'u_projection', 'mat4', flattenRecursive(transposeMatrix(projectionMatrix(Math.PI / 4, 1, 0.01, 50)))),
                new Uniform(gl, program, 'u_opacity', 'float', [1.0])
            ], [
                new Texture(gl, program, 'u_texture', texture, textureBindPoint)
            ],
            new Index(gl, mesh.vertexIndices, 'triangles')
        );
    }

    update(deltaT: number): void {

    }
}


