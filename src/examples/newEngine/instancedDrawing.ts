import { Context, InstancedElementsBundle, Index, Program } from '../../engine/engine.new';
import { boxE } from '../../engine/engine.shapes';
import { renderLoop } from '../../engine/engine.core';


const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const gl = canvas.getContext('webgl2');
if (!gl) {
    throw new Error('no context');
}

const boxImg = document.getElementById('boxTexture') as HTMLImageElement;
const glassImg = document.getElementById('glassTexture') as HTMLImageElement;

const box = boxE(1, 1, 1);

const context = new Context(gl, true);


const bundle = new InstancedElementsBundle(new Program(`#version 300 es
    precision mediump float;

    void main() {

    }

`, `#version 300 es
    precision mediump float;
    out vec4 outputColor;

    void main() {
        outputColor = vec4(1.0, 0.0, 0.0, 1.0);
    }

`), {}, {}, {}, 'triangles', new Index(box.vertexIndices), 10);

bundle.upload(context);
bundle.initVertexArray(context);
bundle.bind(context);
renderLoop(60, (tDelta: number) => {
    bundle.draw(context);
});