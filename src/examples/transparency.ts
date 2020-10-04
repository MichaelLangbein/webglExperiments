import { Shader, renderLoop, Index, Program, Attribute, Texture, Uniform } from "../engine/engine.core";
import { boxE } from "../engine/engine.shapes";
import { flattenRecursive, transposeMatrix, matrixMultiplyList, translateMatrix, 
  scaleMatrix, rotateYMatrix, projectionMatrix, rotateZMatrix } from "../engine/math";
import { setup3dScene } from "../module.main";


const canvas = document.getElementById("canvas") as HTMLCanvasElement;
canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;
const gl = canvas.getContext("webgl");
if (!gl) {
  throw new Error("no context");
}

const boxImg = document.getElementById("boxTexture") as HTMLImageElement;
const glassImg = document.getElementById("glassTexture") as HTMLImageElement;
const boxShape = boxE(1, 1, 1);

const simple3DProgram = new Program(
  gl,
  `
    precision mediump float;
    attribute vec4 a_pos;
    attribute vec2 a_texPos;
    varying vec2 v_texPos;
    uniform mat4 u_model;
    uniform mat4 u_projection;

    void main() {
        v_texPos = a_texPos;
        vec4 pos = u_projection * u_model * a_pos;
        gl_Position = pos;
    }
`,
  `
    precision mediump float;
    uniform sampler2D u_texture;
    varying vec2 v_texPos;
    uniform float u_opacity;

    void main() {
        vec4 pixelColor = texture2D(u_texture, v_texPos);
        gl_FragColor = vec4(pixelColor.xyz, u_opacity);
    }
`
);

const boxInitialTransform = matrixMultiplyList([
  translateMatrix(0, 0, -2.2),
  rotateZMatrix(0),
  rotateYMatrix(0),
  scaleMatrix(0.2, 0.2, 0.2),
]);
const boxShader = new Shader(
  simple3DProgram,
  [
    new Attribute(gl, simple3DProgram, "a_pos", boxShape.vertices),
    new Attribute(gl, simple3DProgram, "a_texPos", boxShape.texturePositions),
  ],
  [
    new Uniform( gl, simple3DProgram, "u_model", "mat4", flattenRecursive(transposeMatrix(boxInitialTransform))),
    new Uniform( gl, simple3DProgram, "u_projection", "mat4", flattenRecursive(transposeMatrix(projectionMatrix(Math.PI / 4, 1, 0.01, 50)) )),
    new Uniform(gl, simple3DProgram, "u_opacity", "float", [1.0]),
  ],
  [new Texture(gl, simple3DProgram, "u_texture", boxImg, 0)],
  new Index(gl, boxShape.vertexIndices, "triangles")
);

const glassInitialTransform = matrixMultiplyList([
  translateMatrix(0.1, 0.1, -1),
  rotateZMatrix(0.2),
  rotateYMatrix(0.3),
  scaleMatrix(0.2, 0.2, 0.2),
]);
const glassShader = new Shader(
  simple3DProgram,
  [
    new Attribute(gl, simple3DProgram, "a_pos", boxShape.vertices),
    new Attribute(gl, simple3DProgram, "a_texPos", boxShape.texturePositions),
  ],
  [
    new Uniform(
      gl,
      simple3DProgram,
      "u_model",
      "mat4",
      flattenRecursive(transposeMatrix(glassInitialTransform))
    ),
    new Uniform(
      gl,
      simple3DProgram,
      "u_projection",
      "mat4",
      flattenRecursive(
        transposeMatrix(projectionMatrix(Math.PI / 4, 1, 0.01, 50))
      )
    ),
    new Uniform(gl, simple3DProgram, "u_opacity", "float", [0.6]),
  ],
  [new Texture(gl, simple3DProgram, "u_texture", glassImg, 0)],
  new Index(gl, boxShape.vertexIndices, "triangles")
);

let t = 0;
setup3dScene(gl);
renderLoop(60, (deltaT: number) => {
  t += 1;
  const boxRotation = (0.01 * t) % (2 * Math.PI);
  const newBoxModelMatrix = matrixMultiplyList([
    translateMatrix(0, 0, -2.6),
    rotateZMatrix(boxRotation),
    rotateYMatrix(boxRotation),
    scaleMatrix(0.2, 0.2, 0.2),
  ]);
  boxShader.updateUniformData(
    gl,
    "u_model",
    flattenRecursive(transposeMatrix(newBoxModelMatrix))
  );
  boxShader.bind(gl);
  boxShader.render(gl);

  const glassRotation = (0.01 * t) % (2 * Math.PI);
  const newGlassModelMatrix = matrixMultiplyList([
    translateMatrix(0.1, 0.1, -1),
    rotateZMatrix(glassRotation),
    rotateYMatrix(0.3),
    scaleMatrix(0.2, 0.2, 0.2),
  ]);
  glassShader.updateUniformData(
    gl,
    "u_model",
    flattenRecursive(transposeMatrix(newGlassModelMatrix))
  );
  glassShader.bind(gl);
  glassShader.render(gl);
});
