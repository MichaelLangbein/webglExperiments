import { Context } from "../../engine2/engine.core";


const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const gl = canvas.getContext('webgl2') as WebGL2RenderingContext;
if (!gl) {
    throw new Error('no context');
}

const boxImg = document.getElementById("boxTexture") as HTMLImageElement;
const glassImg = document.getElementById("glassTexture") as HTMLImageElement;


const context = new Context(gl, true);

// @TODO