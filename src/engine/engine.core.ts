import { createShaderProgram, setup3dScene, createFloatBuffer, getAttributeLocation, bindBufferToAttribute, getUniformLocation, bindValueToUniform, clearBackground, BufferObject, UniformType, bindProgram, createTexture, bindTextureToUniform, TextureObject, FramebufferObject, bindFramebuffer, bindOutputCanvasToFramebuffer, updateBufferData } from './webgl';
const hash = require('string-hash');


export interface IProgram {
    program: WebGLProgram;
    id: string;
    vertexShaderSource: string;
    fragmentShaderSource: string;
}


export class Program implements IProgram {

    readonly program: WebGLProgram;
    readonly id: string;

    constructor(gl: WebGLRenderingContext,
        readonly vertexShaderSource: string,
        readonly fragmentShaderSource: string) {
        this.program = createShaderProgram(gl, vertexShaderSource, fragmentShaderSource);
        this.id = hash(vertexShaderSource + fragmentShaderSource);
    }
}


export interface IUniform {
    location: WebGLUniformLocation;
    type: UniformType;
    value: number[];
    variableName: string;
}


export class Uniform implements IUniform {

    readonly location: WebGLUniformLocation;
    readonly type: UniformType;
    readonly value: number[];
    readonly variableName: string;

    constructor(gl: WebGLRenderingContext, program: IProgram, variableName: string, type: UniformType, data: number[]) {
        this.location = getUniformLocation(gl, program.program, variableName);
        this.type = type;
        this.value = data;
        this.variableName = variableName;
    }
}


export interface ITexture {
    location: WebGLUniformLocation;
    bindPoint: number;
    texture: TextureObject;
    variableName: string;
}

export class Texture implements ITexture {

    readonly location: WebGLUniformLocation;
    readonly bindPoint: number;
    readonly texture: TextureObject;
    readonly variableName: string;

    constructor(gl: WebGLRenderingContext, program: IProgram, variableName: string, image: HTMLImageElement, bindPoint: number) {
        this.location = getUniformLocation(gl, program.program, variableName);
        this.texture = createTexture(gl, image);
        this.bindPoint = bindPoint;
        this.variableName = variableName;
    }
}


export interface IAttribute {
    location: number;
    value: BufferObject;
    variableName: string;
}


export class Attribute implements IAttribute {

    readonly location: number;
    readonly value: BufferObject;
    readonly variableName: string;

    constructor(gl: WebGLRenderingContext, program: IProgram, variableName: string, data: number[][]) {
        this.location = getAttributeLocation(gl, program.program, variableName);
        this.value = createFloatBuffer(gl, data);
        this.variableName = variableName;
    }
}



function first<T>(arr: T[], condition: (el: T) => boolean): T {
    for (const el of arr) {
        if (condition(el)) {
            return el;
        }
    }
}


function parseProgram(program: IProgram): [string[], string[], string[]] {
    const attributeRegex = /^attribute (int|float|vec2|vec3|vec4|mat2|mat3|mat4) (\w*);/gm;
    const uniformRegex = /^uniform (int|float|vec2|vec3|vec4|mat2|mat3|mat4) (\w*);/gm;
    const textureRegex = /^uniform sampler2D (\w*);/gm;

    const shaderCode = program.fragmentShaderSource + '\n\n\n' + program.vertexShaderSource;

    const attributeNames = [];
    const attributeMatches = attributeRegex.exec(shaderCode);
    for (const attrMatch in attributeMatches) {
        attributeNames.push(attrMatch[2]);
    }
    const uniformNames = [];
    const uniformMatches = uniformRegex.exec(shaderCode);
    for (const uniformMatch in uniformMatches) {
        uniformNames.push(uniformMatch[2]);
    }
    const textureNames = [];
    const textureMatches = textureRegex.exec(shaderCode);
    for (const textureMatch in textureMatches) {
        textureNames.push(textureMatch[2]);
    }

    return [attributeNames, uniformNames, textureNames];
}



interface IShader {
    program: IProgram;
    attributes: IAttribute[];
    uniforms: IUniform[];
    textures: ITexture[];
    bind: (gl: WebGLRenderingContext) => void;
    render: (gl: WebGLRenderingContext, frameBuffer?: FramebufferObject) => void;
    updateAttributeData: (gl: WebGLRenderingContext, variableName: string, newData: number[][]) => void;
    updateUniformData: (gl: WebGLRenderingContext, variableName: string, newData: number[]) => void;
}

export class Shader implements IShader {
    constructor(
        readonly program: IProgram,
        readonly attributes: IAttribute[],
        readonly uniforms: IUniform[],
        readonly textures: ITexture[]
    ) {
        const [attributeNames, uniformNames, textureNames] = parseProgram(program);
        for (const attrName in attributeNames) {
            const found = attributes.filter(a => a.variableName === attrName);
            if (found.length !== 1) {
                throw new Error(`Provided ${found.length} values for shader's attribute ${attrName}.`);
            }
        }
        for (const uniformName in uniformNames) {
            const found = uniforms.filter(a => a.variableName === uniformName);
            if (found.length !== 1) {
                throw new Error(`Provided ${found.length} values for shader's uniform ${uniformName}.`);
            }
        }
        for (const texName in textureNames) {
            const found = textures.filter(a => a.variableName === texName);
            if (found.length !== 1) {
                throw new Error(`Provided ${found.length} values for shader's texture ${texName}.`);
            }
        }
    }

    public bind(gl: WebGLRenderingContext): void {
        bindProgram(gl, this.program.program);
        for (const a of this.attributes) {
            bindBufferToAttribute(gl, a.location, a.value);
        }
        for (const u of this.uniforms) {
            bindValueToUniform(gl, u.location, u.type, u.value);
        }
        for (const t of this.textures) {
            bindTextureToUniform(gl, t.texture.texture, t.bindPoint, t.location);
        }
    }

    public render(gl: WebGLRenderingContext, frameBuffer?: FramebufferObject): void {
        if (!frameBuffer) {
            bindOutputCanvasToFramebuffer(gl);
        } else {
            bindFramebuffer(gl, frameBuffer);
        }
        gl.drawArrays(gl.TRIANGLES, 0, this.attributes[0].value.vectorCount);
    }

    public updateAttributeData(gl: WebGLRenderingContext, variableName: string, newData: number[][]): void {
        const attribute = first<IAttribute>(this.attributes, el => el.variableName === variableName);
        updateBufferData(gl, attribute.value, newData);
    }

    public updateUniformData(gl: WebGLRenderingContext, variableName: string, newData: number[]): void {
        const uniform = first<IUniform>(this.uniforms, el => el.variableName === variableName);
        bindValueToUniform(gl, uniform.location, uniform.type, newData);
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
                    bindTextureToUniform(gl, t.texture.texture, t.bindPoint, t.location);
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