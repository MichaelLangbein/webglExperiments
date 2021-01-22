import { Bundle, Context, ArrayBundle, Program, AttributeData, TextureData, UniformData } from '../../engine1/engine.core';

/**
 * In this example we sample from a texture.
 * The point where we sample is determined by a vertex-attribute: 'a_gridPosition'.
 * 'a_gridPosition' does not need to have anything to do with the clip-position!
 */


const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const gl = canvas.getContext('webgl') as WebGLRenderingContext;



const data = [
    [[255, 0, 0, 255], [0, 255, 0, 255], [255, 0, 0, 255], [0, 255, 0, 255]],
    [[0, 0, 255, 255], [255, 0, 0, 255], [0, 0, 255, 255], [255, 0, 0, 255]],
];

const clipPositions = [];
const gridPositions = [];

const R = data.length;
const C = data[0].length;
const deltaX = 2 / (C - 1);
const deltaY = 2 / (R - 1);
for (let row = 0; row < R - 1; row++) {
    for (let col = 0; col < C - 1; col++) {

        const clipSpaceX = -1 + col * deltaX;
        const clipSpaceY =  1 - row * deltaY;
        clipPositions.push([clipSpaceX         , clipSpaceY         ]);
        clipPositions.push([clipSpaceX         , clipSpaceY - deltaY]);
        clipPositions.push([clipSpaceX + deltaX, clipSpaceY - deltaY]);
        clipPositions.push([clipSpaceX         , clipSpaceY         ]);
        clipPositions.push([clipSpaceX + deltaX, clipSpaceY - deltaY]);
        clipPositions.push([clipSpaceX + deltaX, clipSpaceY         ]);

        gridPositions.push([row    , col    ]);
        gridPositions.push([row + 1, col    ]);
        gridPositions.push([row + 1, col + 1]);
        gridPositions.push([row    , col    ]);
        gridPositions.push([row + 1, col + 1]);
        gridPositions.push([row    , col + 1]);
    }
}



const context = new Context(gl, true);
const program = new Program(`
    precision mediump float;
    attribute vec2 a_clipPosition;
    attribute vec2 a_gridPosition;
    varying vec2 v_gridPosition;

    void main() {
        gl_Position = vec4(a_clipPosition * 0.3, 0, 1);
        v_gridPosition = a_gridPosition;
    }
`, `
    precision mediump float;
    varying vec2 v_gridPosition;
    uniform sampler2D u_dataTexture;
    uniform vec2 u_textureSize;

    void main() {
        // gridPosition: [row, col]; textureSize: [width, height] == [col, row]
        vec2 samplePoint = vec2(v_gridPosition.y / u_textureSize.x, v_gridPosition.x / u_textureSize.y);
        vec4 texData = texture2D(u_dataTexture, samplePoint);
        gl_FragColor = texData;
    }
`);
const bundle = new ArrayBundle(program, {
    'a_clipPosition': new AttributeData(new Float32Array(clipPositions.flat()), 'vec2', false),
    'a_gridPosition': new AttributeData(new Float32Array(gridPositions.flat()), 'vec2', false)
}, {
    'u_textureSize': new UniformData('vec2', [data[1].length - 1, data.length - 1])  // width * height === cols * rows
}, {
    'u_dataTexture': new TextureData(data, 'ubyte4')
}, 'triangles', gridPositions.flat().length);
bundle.upload(context);
bundle.initVertexArray(context);
bundle.bind(context);
bundle.draw(context);