import { AttributeData, Context, ElementsBundle, Index, InstancedAttributeData, InstancedElementsBundle, Program, renderLoop, UniformData } from '../../engine/engine.core';
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

const nrInstances = 10000;
const entities: Entity[] = [];
for (let i = 0; i < nrInstances; i++) {
    entities.push(new Entity());
}
const initialTransforms = [];
const colors = [];
for (let entity of entities) {
    const transform = entity.getTransformationMatrix(0);
    initialTransforms.push(transposeMatrix(transform));
    colors.push(entity.getColor());
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

const instancedBundle = new InstancedElementsBundle(new Program(`#version 300 es
    precision highp float;
    in vec4 a_position;
    in mat4 a_transform;
    in vec4 a_color;
    out vec4 v_color;
    uniform mat4 u_projection;

    void main() {
        gl_Position = u_projection * a_transform * a_position;
        v_color = a_color;
    }
`, `#version 300 es
    precision highp float;
    in vec4 v_color;
    out vec4 outputColor;

    void main() {
        outputColor = v_color;
    }
`), {
    'a_position': new AttributeData(flattenRecursive(box.vertices), 'vec4', false),
    'a_transform': new InstancedAttributeData(flattenRecursive(initialTransforms), 'mat4', true, 1),
    'a_color': new InstancedAttributeData(flattenRecursive(colors), 'vec4', false, 1)
}, {
    'u_projection': new UniformData('mat4', flattenRecursive(transposeMatrix(projectionMatrix(Math.PI / 2, 1, 0.01, 1000)))),
}, {}, 'triangles', new Index(box.vertexIndices), nrInstances);


setup3dScene(context.gl);
instancedBundle.upload(context);
instancedBundle.initVertexArray(context);
instancedBundle.bind(context);

let time = 0;
renderLoop(60, (tDelta: number) => {
    time += tDelta;

    const newTransforms = [];
    for (let entity of entities) {
        const transform = entity.getTransformationMatrix(time);
        newTransforms.push(transposeMatrix(transform));
    }
    instancedBundle.updateAttributeData(context, 'a_transform', flattenRecursive(newTransforms));
    instancedBundle.draw(context);
});