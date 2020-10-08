import { AttributeData, Context, ElementsBundle, Index, Program, renderLoop, UniformData } from '../../engine/engine.core';
import { boxE } from '../../engine/engine.shapes';
import { flattenRecursive, identityMatrix, projectionMatrix, translateMatrix, transposeMatrix } from '../../engine/math';
import { setup3dScene } from '../../engine/webgl';



class Entity {
    private color: number[];
    private position: number[];
    constructor() {
        this.color = [Math.random(), Math.random(), Math.random(), 1];
        this.position = [3 * Math.random() - 1.5, 3 * Math.random() - 1.5, -20 * (Math.random()* 0.5 + 0.5), 1];
    }
    getTransformationMatrix(time: number): number[][] {
        const deltaX = -0.05 * Math.sin(time * 0.01);
        const deltaZ = Math.sqrt(Math.pow(this.position[2] + 30, 2)) * 0.005 * Math.sin(time * 0.001);
        this.position[0] += deltaX;
        this.position[2] += deltaZ;
        return translateMatrix(this.position[0], this.position[1], this.position[2]);
    }   
    getColor(): number[] {
        return this.color;
    }
}

const entities: Entity[] = [];
for (let i = 0; i < 10000; i++) {
    entities.push(new Entity());
}



const canvas = document.getElementById('canvas') as HTMLCanvasElement;
canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;
const gl = canvas.getContext('webgl2') as WebGL2RenderingContext;
if (!gl) {
    throw new Error('no context');
}

const box = boxE(0.25, 0.25, 0.25);



const context = new Context(gl, true);

const simpleBundle = new ElementsBundle(new Program(`#version 300 es
    precision highp float;
    in vec4 a_position;
    uniform mat4 u_transform;
    uniform mat4 u_projection;

    void main() {
        gl_Position = u_projection * u_transform * a_position;
    }
`, `#version 300 es
    precision highp float;
    uniform vec4 u_color;
    out vec4 outputColor;

    void main() {
        outputColor = u_color;
    }
`), {
    'a_position': new AttributeData(flattenRecursive(box.vertices), 'vec4', false)
}, {
    'u_transform': new UniformData('mat4', flattenRecursive(transposeMatrix(identityMatrix()))),
    'u_projection': new UniformData('mat4', flattenRecursive(transposeMatrix(projectionMatrix(Math.PI / 2, 1, 0.01, 1000)))),
    'u_color': new UniformData('vec4', [1, 0, 0, 1])
}, {}, 'triangles', new Index(box.vertexIndices));


setup3dScene(context.gl);
simpleBundle.upload(context);
simpleBundle.initVertexArray(context);
simpleBundle.bind(context);

let time = 0;
renderLoop(60, (tDelta: number) => {
    time += tDelta;

    for (let entity of entities) {
        const transform = entity.getTransformationMatrix(time);
        simpleBundle.updateUniformData(context, 'u_transform', flattenRecursive(transposeMatrix(transform)));
        const color = entity.getColor();
        simpleBundle.updateUniformData(context, 'u_color', color);
        simpleBundle.draw(context);
    }
});