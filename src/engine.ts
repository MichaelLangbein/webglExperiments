import { initShaderProgram, setup3dScene, createFloatBuffer, getAttributeLocation, bindBufferToAttribute, getUniformLocation, bindValueToUniform, clearBackground, BufferObject, UniformType, bindProgram } from './webgl';

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

interface IObject {
    program: WebGLProgram;
    attributes: AttributeObject[]; // note that attributes must all have the same number of entries!
    uniforms: UniformObject[];
    update: (tDelta: number) => void;
}


export class EObject implements IObject {
    program: WebGLProgram;
    attributes: AttributeObject[]; // note that attributes must all have the same number of entries!
    uniforms: UniformObject[];

    constructor(
            gl: WebGLRenderingContext,
            vertexShaderSource: string, fragmentShaderSource: string,
            attributeData: IAttribute[],
            uniformData: IUniform[]
        ) {

        const program = initShaderProgram(gl, vertexShaderSource, fragmentShaderSource);

        const attributes: AttributeObject[] = [];
        for (const attr of attributeData) {
            attributes.push({
                location: getAttributeLocation(gl, program, attr.variableName),
                value: createFloatBuffer(gl, attr.data)
            });
        }

        const uniforms: UniformObject[] = [];
        for (const uni of uniformData) {
            uniforms.push({
                location: getUniformLocation(gl, program, uni.variableName),
                type: uni.type,
                value: uni.data
            });
        }

        this.program = program;
        this.attributes = attributes;
        this.uniforms = uniforms;
    }

    update(tDelta: number): void {
        // extend this!
    }
}




export class Engine {

    readonly objects: IObject[] = [];

    constructor() {}

    public renderLoop(gl: WebGLRenderingContext, fps: number): void {
        setup3dScene(gl);

        const tDeltaTarget = 1000 * 1.0 / fps;
        let tStart, tNow: number, tDelta: number, tSleep;
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
                bindProgram(gl, o.program);
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
    }


}