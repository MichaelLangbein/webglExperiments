import { Program, ArrayBundle, Context, AttributeData, UniformData } from '../../engine1/engine.core';


/**
 * Here, we try to pass the id of the closest vertex
 * on to the fragment shader.
 */



const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const gl = canvas.getContext('webgl') as WebGLRenderingContext;

const context = new Context(gl, true);
const program = new Program(`
    precision mediump float;
    attribute vec2 a_position;
    attribute vec4 a_id;
    attribute vec4 a_role;
    varying vec4 v_id;
    varying vec4 v_role;

    void main() {
        gl_Position = vec4(a_position.xy, 0, 1);
        v_id = a_id;
        v_role = a_role;
    }
`, `
    precision mediump float;
    varying vec4 v_id;
    varying vec4 v_role;


    int maxIndexVec4(vec4 vec) {
        int maxIndx = 0;
        float maxVal = vec[0];
        if (vec[1] > maxVal) {
            maxIndx = 1;
            maxVal = vec[1];
        }
        if (vec[2] > maxVal) {
            maxIndx = 2;
            maxVal = vec[2];
        }
        if (vec[3] > maxVal) {
            maxIndx = 3;
            maxVal = vec[3];
        }
        return maxIndx;
    }

    int reconstructClosestId(vec4 id, vec4 role) {
        int idTL = int(id[0] / role[0]);
        int idTR = int(id[1] / role[1]);
        int idBR = int(id[2] / role[2]);
        int idBL = int(id[3] / role[3]);
        int closestRole = maxIndexVec4(role);
        if (closestRole == 0) {
            return idTL;
        }
        if (closestRole == 1) {
            return idTR;
        }
        if (closestRole == 2) {
            return idBR;
        }
        if (closestRole == 3) {
            return idBL;
        }
    }

    vec4 getColorPerId(int id) {
        vec4 color = vec4(0, 0, 0, 1);
        if (id == 1) {
            color = vec4(1, 0, 0, 1);
        }
        if (id == 2) {
            color = vec4(0, 1, 0, 1);
        }
        if (id == 3) {
            color = vec4(0, 0, 1, 1);
        }
        if (id == 4) {
            color = vec4(1, 1, 0, 1);
        }
        return color;
    }

    void main() {
        int id = reconstructClosestId(v_id, v_role);
        vec4 color = getColorPerId(id);
        gl_FragColor = color;
    }
`);
const bundle = new ArrayBundle(program, {
    'a_position': new AttributeData(new Float32Array([
        -1,  1,
        -1, -1,
         1, -1,
         1,  1,
        -1,  1,
         1, -1]), 'vec2', false),
    'a_role': new AttributeData(new Float32Array([
        1, 0, 0, 0, // top left
        0, 0, 0, 1, // bot left
        0, 0, 1, 0, // bot right
        0, 1, 0, 0, // top right
        1, 0, 0, 0, // top left
        0, 0, 1, 0 // bot right
    ]), 'vec4', false),
    'a_id': new AttributeData(new Float32Array([
        1, 0, 0, 0, // top left
        0, 0, 0, 3, // bot left
        0, 0, 4, 0, // bot right
        0, 2, 0, 0, // top right
        1, 0, 0, 0, // top left
        0, 0, 4, 0 // bot right
    ]), 'vec4', false)
}, {}, {}, 'triangles', 6);
bundle.upload(context);
bundle.initVertexArray(context);
bundle.bind(context);
bundle.draw(context);