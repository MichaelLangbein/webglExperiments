import { Program, Shader, Attribute, Uniform, Framebuffer, Texture } from '../engine/engine.core';
import { rectangle, flattenMatrix, gaussianKernel, sumMatrix } from '../engine/engine.shapes';
import { bindProgram } from '../engine/webgl';


const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const gl = canvas.getContext('webgl');
const image = document.getElementById('srtm') as HTMLImageElement;
const xslider = document.getElementById('xrange') as HTMLInputElement;
const yslider = document.getElementById('yrange') as HTMLInputElement;


const program = new Program(gl, `
        attribute vec3 a_position;
        attribute vec2 a_texturePosition;
        varying vec2 v_texturePosition;
        void main() {
            gl_Position = vec4(a_position.xyz, 1.);
            v_texturePosition = a_texturePosition;
        }
    `, `
        precision mediump float;
        uniform sampler2D u_srtm;
        uniform float u_imageSize;
        uniform vec3 u_sun;
        varying vec2 v_texturePosition;
        void main() {
            float delta = 4. / u_imageSize;
            float top = texture2D(u_srtm, vec2(v_texturePosition.x,         1. - v_texturePosition.y + delta)).r;
            float bot = texture2D(u_srtm, vec2(v_texturePosition.x,         1. - v_texturePosition.y - delta)).r;
            float lft = texture2D(u_srtm, vec2(v_texturePosition.x + delta, 1. - v_texturePosition.y        )).r;
            float rgt = texture2D(u_srtm, vec2(v_texturePosition.x - delta, 1. - v_texturePosition.y        )).r;

            vec3 surfaceNormal = vec3(
                lft - rgt,
                bot - top,
                2. * delta
            );
            surfaceNormal = normalize(surfaceNormal);
            vec3 sunNormal = normalize(u_sun);
            float alignment = abs(dot(sunNormal, surfaceNormal));

            gl_FragColor = vec4(0., 0., 0., alignment);
        }
    `);
bindProgram(gl, program.program);
const rect = rectangle(2, 2);
const shader = new Shader(
    program,
    [
        new Attribute(gl, program, 'a_position', rect.vertices),
        new Attribute(gl, program, 'a_texturePosition', rect.texturePositions)
    ], [
        new Uniform(gl, program, 'u_imageSize', '1f', [2048.]),
        new Uniform(gl, program, 'u_sun', '3f', [0., 0., 1.])  // array, pointing to sun from middle of map.
    ], [
        new Texture(gl, program, 'u_srtm', image, 0)
    ]
);




shader.bind(gl);
shader.render(gl);


function renderLoop(gl: WebGLRenderingContext, fps: number): void {

    const tDeltaTarget = 1000 * 1.0 / fps;
    let tStart, tNow: number, tDelta: number, tSleep;

    const render = () => {
        tStart = window.performance.now();

        shader.render(gl);
        shader.bind(gl); // <-- this is inefficient. Only bind what has changed - being `u_sun`.

        // Part 3: time-management
        tNow = window.performance.now();
        tDelta = tNow - tStart;
        tSleep = Math.max(tDeltaTarget - tDelta, 0);
        setTimeout(() => {
            requestAnimationFrame(render);
        }, tSleep);

    };

    render();
}

xslider.oninput = function() {
    const s = shader.uniforms[1].value;
    shader.updateUniformData(gl, 'u_sun', [parseInt(xslider.value) / 100., s[1], s[2]]);
};

yslider.oninput = function() {
    const s = shader.uniforms[1].value;
    shader.updateUniformData(gl, 'u_sun', [s[0], parseInt(yslider.value) / 100., s[2]]);
};

renderLoop(gl, 10);
