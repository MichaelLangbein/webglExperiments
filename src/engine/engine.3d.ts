import { Program, Shader, Index, Attribute, Uniform, Texture, IAttribute, IUniform, renderLoop } from "./engine.core";
import { boxE, ShapeE } from "./engine.shapes";
import { flattenRecursive, transposeMatrix, projectionMatrix, identityMatrix, first } from "./math";
import { setup3dScene, clearBackground, bindProgram, bindBufferToAttribute, bindValueToUniform, bindTextureToUniform, createEmptyTexture, bindIndexBuffer } from "./webgl";


class Simple3dShader extends Shader {
    private gl: WebGLRenderingContext;
    constructor(gl: WebGLRenderingContext) {

        const program = new Program(gl, `
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
        
        const startShape = boxE(1, 1, 1);
        const startTransform = identityMatrix();
        const startTexture = createEmptyTexture(gl, 2, 2);
        
        super(program, [
            new Attribute(gl, program, "a_pos", startShape.vertices),
            new Attribute(gl, program, "a_texPos", startShape.texturePositions),
        ],[
            new Uniform(gl, program, "u_model", "mat4", flattenRecursive(transposeMatrix(startTransform))),
            new Uniform(gl, program, "u_projection", "mat4", flattenRecursive(transposeMatrix(projectionMatrix(Math.PI / 4, 1, 0.01, 50)) )),
            new Uniform(gl, program, "u_opacity", "float", [1.0]),
        ],[
            new Texture(gl, program, "u_texture", startTexture, 0)
        ],
        new Index(gl, startShape.vertexIndices, "triangles"));
        this.gl = gl;
    }

    public updateTransform(matrix: number[][]): void {
        this.updateUniformData(this.gl, 'u_model', flattenRecursive(transposeMatrix(matrix)));
    }

    public updateOpacity(opacity: number): void {
        this.updateUniformData(this.gl, 'u_opacity', [opacity]);
    }

    public updateTexture(img: HTMLImageElement, bindPoint: number): void {
        this.updateTextureData(this.gl, 'u_texture', img);
    }
}





interface IEntity {
    shader: Shader;
    update: (tDelta: number) => void;
}



export class Entity implements IEntity {

    constructor(
        readonly shader: Shader,
        readonly updateFunction: (tDelta: number, attrs: IAttribute[], unis: IUniform[]) => void) {}

    update(tDelta: number): void {
        this.updateFunction(tDelta, this.shader.attributes, this.shader.uniforms);
    }
}


export interface ICamera {
    fieldOfViewInRadians: number;
    aspectRatio: number;
    near: number;
    far: number;
}



export class Engine {

    readonly entities: IEntity[] = [];
    constructor(
        readonly gl: WebGLRenderingContext,
        readonly background: [0, 0, 0, 1]
    ) {}

    public renderLoop(fps: number): void {
        setup3dScene(this.gl);
        let currentShader: string;

        renderLoop(fps, (tDelta: number) => {
          // Part 1: allow objects to update their state
          for (const e of this.entities) {
              e.update(tDelta);
          }

          // Part 2: do the actual rendering work here
          clearBackground(this.gl, this.background);
          for (const e of this.entities) {
              if (e.shader.program.id !== currentShader) {
                  bindProgram(this.gl, e.shader.program.program);
                  currentShader = e.shader.program.id;
              }
              for (const a of e.shader.attributes) {
                  bindBufferToAttribute(this.gl, a.location, a.value);
              }
              for (const u of e.shader.uniforms) {
                  bindValueToUniform(this.gl, u.location, u.type, u.value);
              }
              for (const t of e.shader.textures) {
                  bindTextureToUniform(this.gl, t.texture.texture, t.bindPoint, t.location);
              }
              e.shader.render(this.gl);
          }
        });
    }

    public addEntity(entity: IEntity): void {
        this.entities.push(entity);
        this.sortEntities();
    }


    private sortEntities(): void {
        this.entities.sort((a: IEntity, b: IEntity) => {
            return (a.shader.program.id > b.shader.program.id) ? 1 : -1;
        });
        // @TODO: sort by texture (including bindpoint) and transparency
    }

}
