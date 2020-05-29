import { initShaderProgram, setup3dScene, createFloatBuffer, getAttributeLocation, bindBufferToAttribute, getUniformLocation, bindValueToUniform, clearBackground, BufferObject, UniformType, bindProgram } from './webgl';


export interface UniformObject {
    location: WebGLUniformLocation;
    type: UniformType;
    value: number[];
}

export interface AttributeObject {
    location: number;
    value: BufferObject;
}

export interface EObject {
    program: WebGLProgram;
    attributes: AttributeObject[]; // note that attributes must all have the same number of entries!
    uniforms: UniformObject[];
}


export class Engine {

    private canvas: HTMLCanvasElement;
    private gl: WebGLRenderingContext;
    private objects: EObject[];

    constructor(canvasId: string) {
        this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        this.gl = this.canvas.getContext('webgl');
    }


    public renderLoop(fps: number): void {
        setup3dScene(this.gl);

        const tDeltaTarget = 1000 * 1.0 / fps;
        let tStart, tNow: number, tDelta, tSleep;
        const render = () => {
            tStart = window.performance.now();

            // Part 1: do global changes (like changing rotation angle)

            // Part 2: allow objects to update their state

            // Part 3: do the actual rendering work here
            clearBackground(this.gl, [0, 0, 0, 1]);
            for (const o of this.objects) {
                bindProgram(this.gl, o.program);
                for (const a of o.attributes) {
                    bindBufferToAttribute(this.gl, a.location, a.value);
                }
                for (const u of o.uniforms) {
                    bindValueToUniform(this.gl, u.location, u.type, u.value);
                }
                this.gl.drawArrays(this.gl.TRIANGLES, 0, o.attributes[0].value.vectorCount);
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

    public addObject(object: EObject): void {
        this.objects.push(object);
        this.sortObjects();
    }

    private sortObjects(): void {
        // @TODO: sort objects by their program (and then by their buffer), so we don't have to keep switching shaders.
    }


}