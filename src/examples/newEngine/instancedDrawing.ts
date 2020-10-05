import { Context } from "../../engine/engine.new";


const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const gl = canvas.getContext('webgl2');
if (!gl) {
    throw new Error('no context');
}

const boxImg = document.getElementById("boxTexture") as HTMLImageElement;
const glassImg = document.getElementById("glassTexture") as HTMLImageElement;


const context = new Context(gl, true);

// @TODO