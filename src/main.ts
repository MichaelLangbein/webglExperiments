import { Engine, EObject, IAttribute, IUniform, createProgram } from './engine';
const vertexShaderSource = require('./demo.vert').default;
const fragmentShaderSource = require('./demo.frag').default;


const canvas = document.getElementById('webGlCanvas') as HTMLCanvasElement;
const gl = canvas.getContext('webgl');


const engine = new Engine();


const program = createProgram(gl, vertexShaderSource, fragmentShaderSource);


class SpinnyThing extends EObject {
    constructor(gl: WebGLRenderingContext, attributeData: IAttribute[], uniformData: IUniform[]) {
        super(gl, program, attributeData, uniformData);
    }

    update(tDelta: number): void {
        const oldVal = this.uniforms[1].value[0];
        const newVal = oldVal + 0.05 * tDelta;
        this.uniforms[1].value[0] = newVal;
    }
}



const redSquare = new SpinnyThing(gl, [{
    variableName: 'aVertexPosition',
    data: [
        [-.8, .8, .4],
        [-.8, -.8, .4],
        [.8, -.8, .4],
        [-.8, .8, .4],
        [.8, .8, .4],
        [.8, -.8, .4]
    ]
}], [{
    variableName: 'uColor',
    type: '4f',
    data: [1, 0, 0, 1]
}, {
    variableName: 'uAngle',
    type: '1f',
    data: [0.001]
}]);


const blueSquare = new SpinnyThing(gl, [{
    variableName: 'aVertexPosition',
    data: [
        [-.8, .8, -.4],
        [-.8, -.8, -.4],
        [.8, -.8, -.4],
        [-.8, .8, -.4],
        [.8, .8, -.4],
        [.8, -.8, -.4]
    ]
}], [{
    variableName: 'uColor',
    type: '4f',
    data: [0, 0, 1, 1]
}, {
    variableName: 'uAngle',
    type: '1f',
    data: [0.001]
}]);



engine.addObject(redSquare);
engine.addObject(blueSquare);

engine.renderLoop(gl, 30);

