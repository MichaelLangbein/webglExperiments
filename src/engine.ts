import { initShaderProgram, setup3dScene, createFloatBuffer, getAttributeLocation, bindBufferToAttribute, getUniformLocation, bindValueToUniform, clearBackground, BufferObject, UniformType, bindProgram } from './webgl';
const basic3dVertexShaderSource = require('./shaders/basic3d.vert.glsl').default;
const basic3dFragmentShaderSource = require('./shaders/basic3d.frag.glsl').default;
const hash = require('string-hash');



/**
 * User facing. Contains basic information to create an
 * (engine facing) UniformObject
 */
export interface IUniform {
    variableName: string;
    type: UniformType;
    data: number[];
}

interface UniformObject {
    location: WebGLUniformLocation;
    type: UniformType;
    value: number[];
}

/**
 * User facing. Contains basic information to create an
 * (engine facing) AttributeObject
 */
export interface IAttribute {
    variableName: string;
    data: number[][];
}

interface AttributeObject {
    location: number;
    value: BufferObject;
}

export interface ProgramObject {
    program: WebGLProgram;
    id: string;
}

interface IObject {
    program: ProgramObject;
    attributes: AttributeObject[]; // note that attributes must all have the same number of entries!
    uniforms: UniformObject[];
    update: (tDelta: number) => void;
}





export class EObject implements IObject {
    program: ProgramObject;
    attributes: AttributeObject[]; // note that attributes must all have the same number of entries!
    uniforms: UniformObject[];

    constructor(
            gl: WebGLRenderingContext,
            program: ProgramObject,
            attributeData: IAttribute[],
            uniformData: IUniform[]
        ) {

        const attributes: AttributeObject[] = [];
        for (const attr of attributeData) {
            attributes.push({
                location: getAttributeLocation(gl, program.program, attr.variableName),
                value: createFloatBuffer(gl, attr.data)
            });
        }

        const uniforms: UniformObject[] = [];
        for (const uni of uniformData) {
            uniforms.push({
                location: getUniformLocation(gl, program.program, uni.variableName),
                type: uni.type,
                value: uni.data
            });
        }

        this.program = program;
        this.attributes = attributes;
        this.uniforms = uniforms;
    }

    update(tDelta: number): void {
        // @TODO: extend this!
    }
}



export class EObject3d {
    program: ProgramObject;
    attributes: AttributeObject[]; // note that attributes must all have the same number of entries!
    uniforms: UniformObject[];

    constructor(
            gl: WebGLRenderingContext,
            vertices: number[][],
            translation: number[],
            rotation: number[]
        ) {

        const program = {
            program: initShaderProgram(gl, basic3dVertexShaderSource, basic3dFragmentShaderSource),
            id: hash(basic3dVertexShaderSource + basic3dFragmentShaderSource)
        };

        const attributes: AttributeObject[] = [{
            location: getAttributeLocation(gl, program, 'a_vertex'),
            value: createFloatBuffer(gl, vertices)
        }];

        const uniforms: UniformObject[] = [{
            location: getUniformLocation(gl, program, 'u_translation'),
            type: '3f',
            value: translation
        }, {
            location: getUniformLocation(gl, program, 'u_rotation'),
            type: '3f',
            value: rotation
        }];

        this.program = program;
        this.attributes = attributes;
        this.uniforms = uniforms;
    }

    update(tDelta: number): void {
        // TODO: extend this.
    }
}




export class Engine {

    readonly objects: IObject[] = [];

    constructor() {}

    public renderLoop(gl: WebGLRenderingContext, fps: number): void {
        setup3dScene(gl);

        const tDeltaTarget = 1000 * 1.0 / fps;
        let tStart, tNow: number, tDelta: number, tSleep;
        let currentShader = '';
        const render = () => {
            tStart = window.performance.now();

            // Part 1: do global changes (like changing rotation angle)

            // Part 2: allow objects to update their state
            for (const o of this.objects) {
                o.update(tDeltaTarget);
            }

            // Part 3: do the actual rendering work here
            clearBackground(gl, [0, 0, 0, 1]);
            for (const o of this.objects) {
                if (o.program.id !== currentShader) {
                    bindProgram(gl, o.program.program);
                    currentShader = o.program.id;
                }
                for (const a of o.attributes) {
                    bindBufferToAttribute(gl, a.location, a.value);
                }
                for (const u of o.uniforms) {
                    bindValueToUniform(gl, u.location, u.type, u.value);
                }
                gl.drawArrays(gl.TRIANGLES, 0, o.attributes[0].value.vectorCount);
            }

            // Part 4: time-management
            tNow = window.performance.now();
            tDelta = tNow - tStart;
            tSleep = Math.max(tDeltaTarget - tDelta, 0);
            setTimeout(() => {
                requestAnimationFrame(render);
            }, tSleep);

        };

        render();
    }

    public addObject(object: IObject): void {
        this.objects.push(object);
        this.sortObjects();
    }


    private sortObjects(): void {
        // @TODO: sort objects by their program (and then by their buffer), so we don't have to keep switching shaders.
        this.objects.sort((a: IObject, b: IObject) => {
            return (a.program.id > b.program.id) ? 1 : -1;
        });
    }


}