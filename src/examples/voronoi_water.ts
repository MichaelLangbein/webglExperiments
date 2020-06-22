import { Program, Shader, renderLoop, Attribute, Uniform } from '../engine/engine.core';
import { rectangle } from '../engine/engine.shapes';


const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const gl = canvas.getContext('webgl');


const program = new Program(gl, `
    attribute vec3 a_vertex;
    void main() {
        gl_Position = vec4(a_vertex.xyz, 1.);
    }
`, `
    precision mediump float;
    uniform float u_time;
    uniform vec2 u_size;

    vec2 random2(vec2 p) {
        return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453);
    }

    void main() {
        vec2 relCoord = gl_FragCoord.xy / u_size;

        // tiling the space
        float scale = 5.;
        vec2 tileIndex = floor(scale * relCoord);
        vec2 innerCoord = fract(scale * relCoord);

        float minDist = 100.;
        for (int y= -1; y <= 1; y++) {
            for (int x= -1; x <= 1; x++) {
                vec2 offset = vec2(float(x), float(y));
                vec2 centerPoint = random2(tileIndex + offset);
                centerPoint = 0.5 + 0.5*sin(u_time + 6.2831*centerPoint);
                float dist = distance(centerPoint + offset, innerCoord);
                minDist = min(dist, minDist);
            }
        }

        gl_FragColor = vec4(minDist, minDist, minDist, 1.);
    }
`);

const rect = rectangle(1.8, 1.8);
const shader = new Shader(program, [
    new Attribute(gl, program, 'a_vertex', rect.vertices)
], [
    new Uniform(gl, program, 'u_size', '2f', [canvas.width, canvas.height]),
    new Uniform(gl, program, 'u_time', '1f', [0.])
], []);


let t = 0.;
renderLoop(10, (tDelta: number) => {
    t += tDelta;
    shader.updateUniformData(gl, 'u_time', [t]);
    shader.bind(gl);
    shader.render(gl, [.9, .9, .9, 1.]);
});