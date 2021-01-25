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

        mat4 getSplineCoefMatrix(
                float f00, float f01, float fy00, float fy01,
                float f10, float f11, float fy10, float fy11,
                float fx00, float fx01, float fxy00, float fxy01,
                float fx10, float fx11, float fxy10, float fxy11
        ) {
           return mat4(
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
        }

        float splineInterpolateUnit(
                float x, float y,
                float f00, float f01, float fy00, float fy01,
                float f10, float f11, float fy10, float fy11,
                float fx00, float fx01, float fxy00, float fxy01,
                float fx10, float fx11, float fxy10, float fxy11
        ) {
            mat4 alpha = getSplineCoefMatrix(
                f00, f01, fy00, fy01,
                f10, f11, fy10, fy11,
                fx00, fx01, fxy00, fxy01,
                fx10, fx11, fxy10, fxy11
            );

            return dot(
                vec4(1, x, x*x, x*x*x) * alpha,
                vec4(1, y, y*y, y*y*y)
            );
        }


        float splineInterpolateGrid(
                float x, float y, 
                float x0, float y0, float x1, float y1,
                float f00, float f01, float fy00, float fy01,
                float f10, float f11, float fy10, float fy11,
                float fx00, float fx01, float fxy00, float fxy01,
                float fx10, float fx11, float fxy10, float fxy11
        ) {
            float deltaX = x1 - x0;
            float deltaY = y1 - y0;
            mat4 alpha = getSplineCoefMatrix(
                f00, f01, deltaY * fy00, deltaY * fy01,
                f10, f11, deltaY * fy10, deltaY * fy11,
                deltaX * fx00, deltaX * fx01, deltaX * deltaY * fxy00, deltaX * deltaY * fxy01,
                deltaX * fx10, deltaX * fx11, deltaX * deltaY * fxy10, deltaX * deltaY * fxy11
            );

            float xM = (x - x0) / (x1 - x0);
            float yM = (y - y0) / (y1 - y0);

            return dot(
                vec4(1, xM, xM*xM, xM*xM*xM) * alpha,
                vec4(1, yM, yM*yM, yM*yM*yM)
            );
        }


        void main() {
            vec2 deltaX = vec2(1.0, 0.0);
            vec2 deltaY = vec2(0.0, 1.0);

            vec4 tex_1_1 = texture2D(u_dataTexture, (v_texturePosition -       deltaX -       deltaY) / u_textureSize );
            vec4 tex_10  = texture2D(u_dataTexture, (v_texturePosition                -       deltaY) / u_textureSize );
            vec4 tex_11  = texture2D(u_dataTexture, (v_texturePosition +       deltaX -       deltaY) / u_textureSize );
            vec4 tex_12  = texture2D(u_dataTexture, (v_texturePosition + 2.0 * deltaX -       deltaY) / u_textureSize );
            vec4 tex0_1  = texture2D(u_dataTexture, (v_texturePosition -       deltaX               ) / u_textureSize );
            vec4 tex00   = texture2D(u_dataTexture, (v_texturePosition                              ) / u_textureSize );
            vec4 tex01   = texture2D(u_dataTexture, (v_texturePosition +       deltaX               ) / u_textureSize );
            vec4 tex02   = texture2D(u_dataTexture, (v_texturePosition + 2.0 * deltaX               ) / u_textureSize );
            vec4 tex1_1  = texture2D(u_dataTexture, (v_texturePosition -       deltaX +       deltaY) / u_textureSize );
            vec4 tex10   = texture2D(u_dataTexture, (v_texturePosition                +       deltaY) / u_textureSize );
            vec4 tex11   = texture2D(u_dataTexture, (v_texturePosition +       deltaX +       deltaY) / u_textureSize );
            vec4 tex12   = texture2D(u_dataTexture, (v_texturePosition + 2.0 * deltaX +       deltaY) / u_textureSize );
            vec4 tex2_1  = texture2D(u_dataTexture, (v_texturePosition -       deltaX + 2.0 * deltaY) / u_textureSize );
            vec4 tex20   = texture2D(u_dataTexture, (v_texturePosition                + 2.0 * deltaY) / u_textureSize );
            vec4 tex21   = texture2D(u_dataTexture, (v_texturePosition +       deltaX + 2.0 * deltaY) / u_textureSize );
            vec4 tex22   = texture2D(u_dataTexture, (v_texturePosition + 2.0 * deltaX + 2.0 * deltaY) / u_textureSize );

            vec2 geoLoc_1_1 = readCoordsFromTexture(tex_1_1);
            vec2 geoLoc_10  = readCoordsFromTexture(tex_10);
            vec2 geoLoc_11  = readCoordsFromTexture(tex_11);
            vec2 geoLoc_12  = readCoordsFromTexture(tex_12);
            vec2 geoLoc0_1  = readCoordsFromTexture(tex0_1);
            vec2 geoLoc00   = readCoordsFromTexture(tex00);
            vec2 geoLoc01   = readCoordsFromTexture(tex01);
            vec2 geoLoc02   = readCoordsFromTexture(tex02);
            vec2 geoLoc1_1  = readCoordsFromTexture(tex1_1);
            vec2 geoLoc10   = readCoordsFromTexture(tex10);
            vec2 geoLoc11   = readCoordsFromTexture(tex11);
            vec2 geoLoc12   = readCoordsFromTexture(tex12);
            vec2 geoLoc2_1  = readCoordsFromTexture(tex2_1);
            vec2 geoLoc20   = readCoordsFromTexture(tex20);
            vec2 geoLoc21   = readCoordsFromTexture(tex21);
            vec2 geoLoc22   = readCoordsFromTexture(tex22);

            float dX = geoLoc01.x - geoLoc00.x;
            float dY = geoLoc10.x - geoLoc00.x;

            float f_1_1 = readValueFromTexture(tex_1_1);
            float f_10  = readValueFromTexture(tex_10);
            float f_11  = readValueFromTexture(tex_11);
            float f_12  = readValueFromTexture(tex_12);
            float f0_1  = readValueFromTexture(tex0_1);
            float f00   = readValueFromTexture(tex00);
            float f01   = readValueFromTexture(tex01);
            float f02   = readValueFromTexture(tex02);
            float f1_1  = readValueFromTexture(tex1_1);
            float f10   = readValueFromTexture(tex10);
            float f11   = readValueFromTexture(tex11);
            float f12   = readValueFromTexture(tex12);
            float f2_1  = readValueFromTexture(tex2_1);
            float f20   = readValueFromTexture(tex20);
            float f21   = readValueFromTexture(tex21);
            float f22   = readValueFromTexture(tex22);

            float fx00  = ( f01 - f0_1 ) / ( 2.0 * dX );
            float fx01  = ( f02 - f00  ) / ( 2.0 * dX );
            float fx10  = ( f11 - f1_1 ) / ( 2.0 * dX );
            float fx11  = ( f12 - f10  ) / ( 2.0 * dX );
            float fy00  = ( f10 - f_10 ) / ( 2.0 * dY );
            float fy01  = ( f11 - f_11 ) / ( 2.0 * dY );
            float fy10  = ( f20 - f00  ) / ( 2.0 * dY );
            float fy11  = ( f21 - f01  ) / ( 2.0 * dY );
            float fxy00 = (fx01 - fx00) / dY;
            float fxy10 = (fx11 - fx10) / dY;
            float fxy01 = (fy01 - fy00) / dX;
            float fxy11 = (fy11 - fy10) / dX;

            float interpolatedValue = splineInterpolateGrid(
                v_geoPosition.x, v_geoPosition.y, geoLoc00.x, geoLoc00.y, geoLoc11.x, geoLoc11.y,
                f00, f01, fy00, fy01,
                f10, f11, fy10, fy11,
                fx00, fx01, fxy00, fxy01,
                fx10, fx11, fxy10, fxy11
            );

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

