import { AttributeData, Context, ElementsBundle, Index, Program, renderLoop, UniformData } from '../../engine2/engine.core';
import { boxE } from '../../utils/shapes';
import { identityMatrix, projectionMatrix, translateMatrix, transposeMatrix, flatten2 } from '../../utils/math';
import { setup3dScene } from '../../engine2/webgl2';
import Stats from 'stats.js';


class Entity {
    private color: number[];
    private position: number[];
    constructor() {
        this.color = [Math.random(), Math.random(), Math.random(), 1];
        this.position = [3 * Math.random() - 1.5, 3 * Math.random() - 1.5, -20 * (Math.random() * 0.5 + 0.5), 1];
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

const nrEntities = 50000;
const entities: Entity[] = [];
for (let i = 0; i < nrEntities; i++) {
    entities.push(new Entity());
}


const body = document.getElementById('container') as HTMLDivElement;
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;
const gl = canvas.getContext('webgl2') as WebGL2RenderingContext;
if (!gl) {
    throw new Error('no context');
}
const stats = new Stats();
stats.showPanel(0);
body.appendChild(stats.dom);

const box = boxE(0.25, 0.25, 0.25);



const context = new Context(gl, true);

const bundle = new ElementsBundle(new Program(`#version 300 es
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
    'a_position': new AttributeData(new Float32Array(flatten2(box.vertices)), 'vec4', false)
}, {
    'u_transform': new UniformData('mat4', flatten2(transposeMatrix(identityMatrix()))),
    'u_projection': new UniformData('mat4', flatten2(transposeMatrix(projectionMatrix(Math.PI / 2, 1, 0.01, 1000)))),
    'u_color': new UniformData('vec4', [1, 0, 0, 1])
}, {}, 'triangles', new Index(new Uint32Array(flatten2(box.vertexIndices))));


setup3dScene(context.gl);
bundle.upload(context);
bundle.initVertexArray(context);
bundle.bind(context);

let time = 0;
renderLoop(60, (tDelta: number) => {
    time += tDelta;    stats.begin();

    for (let entity of entities) {
        const transform = entity.getTransformationMatrix(time);
        bundle.updateUniformData(context, 'u_transform', flatten2(transposeMatrix(transform)));
        const color = entity.getColor();
        bundle.updateUniformData(context, 'u_color', color);
        bundle.draw(context);
    }
    stats.end();
});