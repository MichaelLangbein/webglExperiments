import { Vector as VectorLayer } from 'ol/layer';
import { Options } from 'ol/layer/BaseVector';
import LayerRenderer from 'ol/renderer/Layer';
import { FrameState } from 'ol/PluggableMap';
import Point from 'ol/geom/Point';

import Delaunator from 'delaunator';
import { ArrayBundle, Program, AttributeData, UniformData, TextureData, Context, ElementsBundle, Index, Bundle } from '../../engine2/engine.core';



export interface SplineLayerOptions extends Options {}

export class SplineLayer extends VectorLayer {

    constructor(opt_options: SplineLayerOptions) {
        super(opt_options);
    }

    createRenderer(): LayerRenderer<VectorLayer> {
        const renderer = new SplineRenderer(this);
        return renderer;
    }
}



export class SplineRenderer extends LayerRenderer<VectorLayer> {

    private canvas: HTMLCanvasElement;
    private bundle: Bundle;
    private context: Context;

    constructor(layer: VectorLayer) {
        super(layer);

        this.canvas = document.createElement('canvas') as HTMLCanvasElement;
        this.canvas.width = 600;
        this.canvas.height = 600;
        this.canvas.style.setProperty('position', 'absolute');
        this.canvas.style.setProperty('left', '0px');
        this.canvas.style.setProperty('top', '0px');
        this.canvas.style.setProperty('width', '100%');
        this.canvas.style.setProperty('height', '100%');


        const features = layer.getSource().getFeatures().sort((f1, f2) => f1.getProperties()['id'] > f2.getProperties()['id'] ? 1 : -1);
        const coordinates = features.map(f => (f.getGeometry() as Point).getCoordinates());
        const d = Delaunator.from(coordinates);
        const index = d.triangles;

        const nrCols = features.reduce((carry, val) => val.getProperties()['col'] > carry ? val.getProperties()['col'] : carry, 0) + 1;
        const nrRows = features.reduce((carry, val) => val.getProperties()['row'] > carry ? val.getProperties()['row'] : carry, 0) + 1;
        const minX = features.map(f => (f.getGeometry() as Point).getCoordinates()[0]).reduce((carry, val) => val < carry ? val : carry, 10000);
        const minY = features.map(f => (f.getGeometry() as Point).getCoordinates()[1]).reduce((carry, val) => val < carry ? val : carry, 10000);
        const maxX = features.map(f => (f.getGeometry() as Point).getCoordinates()[0]).reduce((carry, val) => val > carry ? val : carry, -10000);
        const maxY = features.map(f => (f.getGeometry() as Point).getCoordinates()[1]).reduce((carry, val) => val > carry ? val : carry, -10000);
        const gridBounds = [minX, minY, maxX, maxY];
        const minVal = features.map(f => f.getProperties()['value']).reduce((carry, val) => val < carry ? val : carry, 100000);
        const maxVal = features.map(f => f.getProperties()['value']).reduce((carry, val) => val > carry ? val : carry, -100000);
        const valueBounds = [minVal, maxVal];

        const dataMatrix255: number[][][] = new Array(nrRows).fill(0).map(v => new Array(nrRows).fill(0).map(v => [0, 0, 0, 0]));
        const colsAndRows: number[] = [];
        for (const feature of features) {
            const id = feature.getProperties()['id'];
            const row = feature.getProperties()['row'];
            const col = feature.getProperties()['col'];
            const val = feature.getProperties()['value'];
            const coords = (feature.getGeometry() as Point).getCoordinates();
            const xNormalized = 255 * (coords[0] - gridBounds[0]) / (gridBounds[2] - gridBounds[0]);
            const yNormalized = 255 * (coords[1] - gridBounds[1]) / (gridBounds[3] - gridBounds[1]);
            const valNormalized = 255 * (val - valueBounds[0]) / (valueBounds[1] - valueBounds[0]);
            dataMatrix255[row][col] = [id, xNormalized, yNormalized, valNormalized];
            colsAndRows.push(col, row);
        }

        this.context = new Context(this.canvas.getContext('webgl2') as WebGL2RenderingContext, false);
        const program = new Program(`
        precision mediump float;
        attribute vec2 a_geoPosition;
        varying vec2 v_geoPosition;
        attribute vec2 a_texturePosition;
        varying vec2 v_texturePosition;
        uniform vec4 u_geoBbox;

        vec4 geo2ClipPosition(vec2 geoPosition, vec4 geoBbox) {
            return vec4(
                (geoPosition[0] - geoBbox[0]) / (geoBbox[2] - geoBbox[0]) * 2.0 - 1.0,
                (geoPosition[1] - geoBbox[1]) / (geoBbox[3] - geoBbox[1]) * 2.0 - 1.0,
                0.0,
                1.0
            );
        }

        void main() {
            v_texturePosition = a_texturePosition;
            v_geoPosition = a_geoPosition;
            gl_Position = geo2ClipPosition(a_geoPosition, u_geoBbox);
        }
        `, `
        precision mediump float;
        varying vec2 v_texturePosition;
        varying vec2 v_geoPosition;
        uniform sampler2D u_dataTexture;
        uniform vec2 u_textureSize;
        uniform vec4 u_gridBounds;
        uniform vec2 u_valueBounds;

        vec2 readCoordsFromTexture(vec4 textureData) {
            float x = textureData[1] * (u_gridBounds[2] - u_gridBounds[0]) + u_gridBounds[0];
            float y = textureData[2] * (u_gridBounds[3] - u_gridBounds[1]) + u_gridBounds[1];
            return vec2(x, y);
        }

        float readValueFromTexture(vec4 textureData) {
            return textureData[3] * (u_valueBounds[1] - u_valueBounds[0]) + u_valueBounds[0];
        }

        float splineInterpolate(
                float x, float y, float x0, float y0, float x1, float y1,
                float f00, float f01, float fy00, float fy01,
                float f10, float f11, float fy10, float fy11,
                float fx00, float fx01, float fxy00, float fxy01,
                float fx10, float fx11, float fxy10, float fxy11
        ) {
            mat4 alpha = mat4(
                1, 0, 0, 0,
                0, 0, 1, 0,
                -3, 3, -2, -1,
                2, -2, 1, 1
            ) * mat4(
                f00, f01, fy00, fy01,
                f10, f11, fy10, fy11,
                fx00, fx01, fxy00, fxy01,
                fx10, fx11, fxy10, fxy11
            ) * mat4(
                1, 0, -3, 2,
                0, 0, 3, -2,
                0, 1, -2, 1,
                0, 0, -1, 1
            );

            float xM = (x - x0) / (x1 - x0);
            float yM = (y - y0) / (y1 - y0);

            return dot(
                vec4(1, xM, xM*xM, xM*xM*xM) * alpha,
                vec4(1, yM, yM*yM, yM*yM*yM)
            );
        }


        // from http://www.java-gaming.org/index.php?topic=35123.0
vec4 cubic(float v){
    vec4 n = vec4(1.0, 2.0, 3.0, 4.0) - v;
    vec4 s = n * n * n;
    float x = s.x;
    float y = s.y - 4.0 * s.x;
    float z = s.z - 4.0 * s.y + 6.0 * s.x;
    float w = 6.0 - x - y - z;
    return vec4(x, y, z, w) * (1.0/6.0);
}

vec4 textureBicubic(sampler2D sampler, vec2 texCoords){

   vec2 texSize = textureSize(sampler, 0);
   vec2 invTexSize = 1.0 / texSize;

   texCoords = texCoords * texSize - 0.5;


    vec2 fxy = fract(texCoords);
    texCoords -= fxy;

    vec4 xcubic = cubic(fxy.x);
    vec4 ycubic = cubic(fxy.y);

    vec4 c = texCoords.xxyy + vec2 (-0.5, +1.5).xyxy;

    vec4 s = vec4(xcubic.xz + xcubic.yw, ycubic.xz + ycubic.yw);
    vec4 offset = c + vec4 (xcubic.yw, ycubic.yw) / s;

    offset *= invTexSize.xxyy;

    vec4 sample0 = texture(sampler, offset.xz);
    vec4 sample1 = texture(sampler, offset.yz);
    vec4 sample2 = texture(sampler, offset.xw);
    vec4 sample3 = texture(sampler, offset.yw);

    float sx = s.x / (s.x + s.y);
    float sy = s.z / (s.z + s.w);

    return mix(
       mix(sample3, sample2, sx), mix(sample1, sample0, sx)
    , sy);
}

        void main() {
            // vec2 deltaX = vec2(1.0, 0.0);
            // vec2 deltaY = vec2(0.0, 1.0);

            // vec4 texN1N1 = texture2D(u_dataTexture, (v_texturePosition -       deltaX -       deltaY) / u_textureSize );
            // vec4 texN10  = texture2D(u_dataTexture, (v_texturePosition                -       deltaY) / u_textureSize );
            // vec4 texN11  = texture2D(u_dataTexture, (v_texturePosition +       deltaX -       deltaY) / u_textureSize );
            // vec4 texN12  = texture2D(u_dataTexture, (v_texturePosition + 2.0 * deltaX -       deltaY) / u_textureSize );
            // vec4 tex0N1  = texture2D(u_dataTexture, (v_texturePosition -       deltaX               ) / u_textureSize );
            // vec4 tex00   = texture2D(u_dataTexture, (v_texturePosition                              ) / u_textureSize );
            // vec4 tex01   = texture2D(u_dataTexture, (v_texturePosition +       deltaX               ) / u_textureSize );
            // vec4 tex02   = texture2D(u_dataTexture, (v_texturePosition + 2.0 * deltaX               ) / u_textureSize );
            // vec4 tex1N1  = texture2D(u_dataTexture, (v_texturePosition -       deltaX +       deltaY) / u_textureSize );
            // vec4 tex10   = texture2D(u_dataTexture, (v_texturePosition                +       deltaY) / u_textureSize );
            // vec4 tex11   = texture2D(u_dataTexture, (v_texturePosition +       deltaX +       deltaY) / u_textureSize );
            // vec4 tex12   = texture2D(u_dataTexture, (v_texturePosition + 2.0 * deltaX +       deltaY) / u_textureSize );
            // vec4 tex2N1  = texture2D(u_dataTexture, (v_texturePosition -       deltaX + 2.0 * deltaY) / u_textureSize );
            // vec4 tex20   = texture2D(u_dataTexture, (v_texturePosition                + 2.0 * deltaY) / u_textureSize );
            // vec4 tex21   = texture2D(u_dataTexture, (v_texturePosition +       deltaX + 2.0 * deltaY) / u_textureSize );
            // vec4 tex22   = texture2D(u_dataTexture, (v_texturePosition + 2.0 * deltaX + 2.0 * deltaY) / u_textureSize );

            // vec2 geoLocN1N1 = readCoordsFromTexture(texN1N1);
            // vec2 geoLocN10 = readCoordsFromTexture(texN10);
            // vec2 geoLocN11 = readCoordsFromTexture(texN11);
            // vec2 geoLocN12 = readCoordsFromTexture(texN12);
            // vec2 geoLoc0N1 = readCoordsFromTexture(tex0N1);
            // vec2 geoLoc00 = readCoordsFromTexture(tex00);
            // vec2 geoLoc01 = readCoordsFromTexture(tex01);
            // vec2 geoLoc02 = readCoordsFromTexture(tex02);
            // vec2 geoLoc1N1 = readCoordsFromTexture(tex1N1);
            // vec2 geoLoc10 = readCoordsFromTexture(tex10);
            // vec2 geoLoc11 = readCoordsFromTexture(tex11);
            // vec2 geoLoc12 = readCoordsFromTexture(tex12);
            // vec2 geoLoc2N1 = readCoordsFromTexture(tex2N1);
            // vec2 geoLoc20 = readCoordsFromTexture(tex20);
            // vec2 geoLoc21 = readCoordsFromTexture(tex21);
            // vec2 geoLoc22 = readCoordsFromTexture(tex22);

            // float valueN1N1 = readValueFromTexture(texN1N1);
            // float valueN10 = readValueFromTexture(texN10);
            // float valueN11 = readValueFromTexture(texN11);
            // float valueN12 = readValueFromTexture(texN12);
            // float value0N1 = readValueFromTexture(tex0N1);
            // float value00 = readValueFromTexture(tex00);
            // float value01 = readValueFromTexture(tex01);
            // float value02 = readValueFromTexture(tex02);
            // float value1N1 = readValueFromTexture(tex1N1);
            // float value10 = readValueFromTexture(tex10);
            // float value11 = readValueFromTexture(tex11);
            // float value12 = readValueFromTexture(tex12);
            // float value2N1 = readValueFromTexture(tex2N1);
            // float value20 = readValueFromTexture(tex20);
            // float value21 = readValueFromTexture(tex21);
            // float value22 = readValueFromTexture(tex22);

            // float f00 = value00;
            // float f10 = value10;
            // float f01 = value01;
            // float f11 = value11;
            // float fx00 = value10 - valueN10;
            // float fx01 = value02 - value00;
            // float fx10 = value11 - value1N1;
            // float fx11 = value12 - value10;
            // float fy00 = value10 - valueN10;
            // float fy01 = value11 - valueN11;
            // float fy10 = value20 - value00;
            // float fy11 = value21 - value01;
            // float fxy00 = value11 - value10 - value01 + value00;
            // float fxy10 = value21 - value20 - value11 + value10;
            // float fxy01 = value12 - value11 - value02 + value01;
            // float fxy11 = value22 - value21 - value12 + value11;

            // float interpolatedValue = splineInterpolate(
            //     v_geoPosition.x, v_geoPosition.y, geoLoc00.x, geoLoc00.y, geoLoc11.x, geoLoc11.y,
            //     f00, f01, fy00, fy01,
            //     f10, f11, fy10, fy11,
            //     fx00, fx01, fxy00, fxy01,
            //     fx10, fx11, fxy10, fxy11
            // );

            float interpolatedValue = textureBicubic(u_dataTexture, v_texturePosition).w;


            float valInterpolatedNormalized = (interpolatedValue - u_valueBounds[0]) / (u_valueBounds[1] - u_valueBounds[0]);
            gl_FragColor = vec4(valInterpolatedNormalized, valInterpolatedNormalized, valInterpolatedNormalized, 0.7);
        }
        `);
        this.bundle = new ElementsBundle(program, {
            'a_geoPosition': new AttributeData(new Float32Array(coordinates.flat()), 'vec2', false),
            'a_texturePosition': new AttributeData(new Float32Array(colsAndRows), 'vec2', false),
        }, {
            'u_geoBbox': new UniformData('vec4', [0, 0, 360, 180]),
            'u_gridBounds': new UniformData('vec4', gridBounds),
            'u_valueBounds': new UniformData('vec2', valueBounds),
            'u_textureSize': new UniformData('vec2', [nrCols, nrRows])
        }, {
            'u_dataTexture': new TextureData(dataMatrix255, 'ubyte4')
        }, 'triangles', new Index(index));


        this.bundle.upload(this.context);
        this.bundle.initVertexArray(this.context);
        this.bundle.bind(this.context);
        this.bundle.draw(this.context);

    }

    prepareFrame(frameState: FrameState): boolean {
        const newBbox = frameState.extent;
        if (newBbox !== this.bundle.uniforms['u_geoBbox'].value) {
            this.bundle.updateUniformData(this.context, 'u_geoBbox', newBbox);
            this.bundle.upload(this.context);
        }
        return true;
    }

    renderFrame(frameState: FrameState, target: HTMLElement): HTMLElement {
        this.bundle.draw(this.context);
        return this.canvas;
    }

    renderDeclutter(frameState: FrameState): void {
    }
}

