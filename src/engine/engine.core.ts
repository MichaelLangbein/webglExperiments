import { initShaderProgram, setup3dScene, createFloatBuffer, getAttributeLocation, bindBufferToAttribute, getUniformLocation, bindValueToUniform, clearBackground, BufferObject, UniformType, bindProgram, createTexture, bindTextureToUniform } from './webgl';
const hash = require('string-hash');


export interface IProgram {
    program: WebGLProgram;
    id: string;
}


export class Program implements IProgram {

    readonly program: WebGLProgram;
    readonly id: string;

    constructor(gl: WebGLRenderingContext, vertexShaderSource: string, fragmentShaderSource: string) {
        this.program = initShaderProgram(gl, vertexShaderSource, fragmentShaderSource);
        this.id = hash(vertexShaderSource + fragmentShaderSource);
    }
}


export interface IUniform {
    location: WebGLUniformLocation;
    type: UniformType;
    value: number[];
}


export class Uniform implements IUniform {

    readonly location: WebGLUniformLocation;
    readonly type: UniformType;
    readonly value: number[];

    constructor(gl: WebGLRenderingContext, program: IProgram, variableName: string, type: UniformType, data: number[]) {
        this.location = getUniformLocation(gl, program.program, variableName);
        this.type = type;
        this.value = data;
    }
}


export interface ITexture {
    location: WebGLUniformLocation;
    bindPoint: number;
    texture: WebGLTexture;
}

export class Texture implements ITexture {

    readonly location: WebGLUniformLocation;
    readonly bindPoint: number;
    readonly texture: WebGLTexture;

    constructor(gl: WebGLRenderingContext, program: IProgram, variableName: string, image: HTMLImageElement, bindPoint: number) {
        this.location = getUniformLocation(gl, program.program, variableName);
        this.texture = createTexture(gl, image);
        this.bindPoint = bindPoint;
    }
}


export interface IAttribute {
    location: number;
    value: BufferObject;
}


export class Attribute implements IAttribute {

    readonly location: number;
    readonly value: BufferObject;

    constructor(gl: WebGLRenderingContext, program: IProgram, variableName: string, data: number[][]) {
        this.location = getAttributeLocation(gl, program.program, variableName);
        this.value = createFloatBuffer(gl, data);
    }
}


interface IEntity {
    program: IProgram;
    attributes: IAttribute[]; // note that attributes must all have the same number of entries!
    uniforms: IUniform[];
    textures: ITexture[];
    update: (tDelta: number) => void;
}



export class Entity implements IEntity {

    constructor(
        readonly program: IProgram,
        readonly attributes: IAttribute[],
        readonly uniforms: IUniform[],
        readonly textures: ITexture[],
        readonly updateFunction: (tDelta: number, attrs: IAttribute[], unis: IUniform[]) => void) {}

    update(tDelta: number): void {
        this.updateFunction(tDelta, this.attributes, this.uniforms);
    }
}




export class Engine {

    readonly entities: IEntity[] = [];

    constructor() {}

    public renderLoop(gl: WebGLRenderingContext, fps: number): void {
        setup3dScene(gl);

        const tDeltaTarget = 1000 * 1.0 / fps;
        let tStart, tNow: number, tDelta: number, tSleep;
        let currentShader = '';
        const render = () => {
            tStart = window.performance.now();

            // Part 1: allow objects to update their state
            for (const e of this.entities) {
                e.update(tDeltaTarget);
            }

            // Part 2: do the actual rendering work here
            clearBackground(gl, [.7, .7, .7, 1]);
            for (const e of this.entities) {
                if (e.program.id !== currentShader) {
                    bindProgram(gl, e.program.program);
                    currentShader = e.program.id;
                }
                for (const a of e.attributes) {
                    bindBufferToAttribute(gl, a.location, a.value);
                }
                for (const u of e.uniforms) {
                    bindValueToUniform(gl, u.location, u.type, u.value);
                }
                for (const t of e.textures) {
                    bindTextureToUniform(gl, t.texture, t.bindPoint, t.location);
                }
                gl.drawArrays(gl.TRIANGLES, 0, e.attributes[0].value.vectorCount);
            }

            // Part 3: time-management
            tNow = window.performance.now();
            tDelta = tNow - tStart;
            tSleep = Math.max(tDeltaTarget - tDelta, 0);
            setTimeout(() => {
                requestAnimationFrame(render);
            }, tSleep);

        };

        render();
    }

    public addEntity(entity: IEntity): void {
        this.entities.push(entity);
        this.sortEntities();
    }


    private sortEntities(): void {
        this.entities.sort((a: IEntity, b: IEntity) => {
            return (a.program.id > b.program.id) ? 1 : -1;
        });
    }


}