import Delaunator from 'delaunator';
import { ArrayBundle, Program, AttributeData, UniformData, TextureData, Context, ElementsBundle, Index, Bundle } from '../../engine1/engine.core';
import { ImageCanvas } from 'ol/source';
import Projection from 'ol/proj/Projection';
import { FeatureCollection, Point } from 'geojson';




export function createSplineSource(data: FeatureCollection, projection: Projection): ImageCanvas {

    const splineRenderer = new SplineRenderer(data);

    const splineSource = new ImageCanvas({
        canvasFunction: (extent, imageResolution, devicePixelRatio, imageSize, projection) => {
            console.log('canvasFunction', extent, imageResolution, devicePixelRatio, imageSize)
            splineRenderer.setBbox(extent);
            splineRenderer.setCanvasSize(imageSize[0], imageSize[1]);
            const canvas = splineRenderer.renderFrame();
            return canvas;
        },
        projection, ratio: 1
    });

    return splineSource;
}






class SplineRenderer {

    private canvas: HTMLCanvasElement;
    private bundle: Bundle;
    private context: Context;

    constructor(data: FeatureCollection) {

        this.canvas = document.createElement('canvas') as HTMLCanvasElement;
        this.canvas.width = 600;
        this.canvas.height = 600;
        this.canvas.style.setProperty('position', 'absolute');
        this.canvas.style.setProperty('left', '0px');
        this.canvas.style.setProperty('top', '0px');
        this.canvas.style.setProperty('width', '100%');
        this.canvas.style.setProperty('height', '100%');


        const features = data.features.sort((f1, f2) => f1.properties['id'] > f2.properties['id'] ? 1 : -1);
        const coordinates = features.map(f => (f.geometry as Point).coordinates);
        const d = Delaunator.from(coordinates);
        const index = new Uint16Array(d.triangles.buffer);

        const nrCols = features.reduce((carry, val) => val.properties['col'] > carry ? val.properties['col'] : carry, 0) + 1;
        const nrRows = features.reduce((carry, val) => val.properties['row'] > carry ? val.properties['row'] : carry, 0) + 1;
        const minX = features.map(f => (f.geometry as Point).coordinates[0]).reduce((carry, val) => val < carry ? val : carry, 10000);
        const minY = features.map(f => (f.geometry as Point).coordinates[1]).reduce((carry, val) => val < carry ? val : carry, 10000);
        const maxX = features.map(f => (f.geometry as Point).coordinates[0]).reduce((carry, val) => val > carry ? val : carry, -10000);
        const maxY = features.map(f => (f.geometry as Point).coordinates[1]).reduce((carry, val) => val > carry ? val : carry, -10000);
        const gridBounds = [minX, minY, maxX, maxY];
        const minVal = features.map(f => f.properties['value']).reduce((carry, val) => val < carry ? val : carry, 100000);
        const maxVal = features.map(f => f.properties['value']).reduce((carry, val) => val > carry ? val : carry, -100000);
        const valueBounds = [minVal, maxVal];

        const dataMatrix255: number[][][] = new Array(nrRows).fill(0).map(v => new Array(nrRows).fill(0).map(v => [0, 0, 0, 0]));
        const colsAndRows: number[] = [];
        for (const feature of features) {
            const id = feature.properties['id'];
            const row = feature.properties['row'];
            const col = feature.properties['col'];
            const val = feature.properties['value'];
            const coords = (feature.geometry as Point).coordinates;
            const xNormalized = 255 * (coords[0] - gridBounds[0]) / (gridBounds[2] - gridBounds[0]);
            const yNormalized = 255 * (coords[1] - gridBounds[1]) / (gridBounds[3] - gridBounds[1]);
            const valNormalized = 255 * (val - valueBounds[0]) / (valueBounds[1] - valueBounds[0]);
            dataMatrix255[row][col] = [id, xNormalized, yNormalized, valNormalized];
            colsAndRows.push(col, row);
        }

        this.context = new Context(this.canvas.getContext('webgl', {preserveDrawingBuffer: true}) as WebGLRenderingContext, false);
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
        uniform vec2 u_valueBounds;

        float readValueFromTexture(vec4 textureData) {
            return textureData[3] * (u_valueBounds[1] - u_valueBounds[0]) + u_valueBounds[0];
        }


        mat4 calcDerivativeMatrix(sampler2D textureSampler, vec2 textureCoordinate, vec2 textureSize) {
            vec2 dX = vec2(1, 0);
            vec2 dY = vec2(0, 1);

            vec4 textureData_1_1 = texture2D(textureSampler, (textureCoordinate - 1.0 * dX - 1.0 * dY) / textureSize);
            vec4 textureData0_1  = texture2D(textureSampler, (textureCoordinate + 0.0 * dX - 1.0 * dY) / textureSize);
            vec4 textureData1_1  = texture2D(textureSampler, (textureCoordinate + 1.0 * dX - 1.0 * dY) / textureSize);
            vec4 textureData2_1  = texture2D(textureSampler, (textureCoordinate + 2.0 * dX - 1.0 * dY) / textureSize);
            vec4 textureData_10  = texture2D(textureSampler, (textureCoordinate - 1.0 * dX + 0.0 * dY) / textureSize);
            vec4 textureData00   = texture2D(textureSampler, (textureCoordinate + 0.0 * dX + 0.0 * dY) / textureSize);
            vec4 textureData10   = texture2D(textureSampler, (textureCoordinate + 1.0 * dX + 0.0 * dY) / textureSize);
            vec4 textureData20   = texture2D(textureSampler, (textureCoordinate + 2.0 * dX + 0.0 * dY) / textureSize);
            vec4 textureData_11  = texture2D(textureSampler, (textureCoordinate - 1.0 * dX + 1.0 * dY) / textureSize);
            vec4 textureData01   = texture2D(textureSampler, (textureCoordinate + 0.0 * dX + 1.0 * dY) / textureSize);
            vec4 textureData11   = texture2D(textureSampler, (textureCoordinate + 1.0 * dX + 1.0 * dY) / textureSize);
            vec4 textureData21   = texture2D(textureSampler, (textureCoordinate + 2.0 * dX + 1.0 * dY) / textureSize);
            vec4 textureData_12  = texture2D(textureSampler, (textureCoordinate - 1.0 * dX + 2.0 * dY) / textureSize);
            vec4 textureData02   = texture2D(textureSampler, (textureCoordinate + 0.0 * dX + 2.0 * dY) / textureSize);
            vec4 textureData12   = texture2D(textureSampler, (textureCoordinate + 1.0 * dX + 2.0 * dY) / textureSize);
            vec4 textureData22   = texture2D(textureSampler, (textureCoordinate + 2.0 * dX + 2.0 * dY) / textureSize);

            // values
            float f_1_1 = readValueFromTexture(textureData_1_1);
            float f0_1 = readValueFromTexture(textureData0_1);
            float f1_1 = readValueFromTexture(textureData1_1);
            float f2_1 = readValueFromTexture(textureData2_1);
            float f_10 = readValueFromTexture(textureData_10);
            float f00 = readValueFromTexture(textureData00);
            float f10 = readValueFromTexture(textureData10);
            float f20 = readValueFromTexture(textureData20);
            float f_11 = readValueFromTexture(textureData_11);
            float f01 = readValueFromTexture(textureData01);
            float f11 = readValueFromTexture(textureData11);
            float f21 = readValueFromTexture(textureData21);
            float f_12 = readValueFromTexture(textureData_12);
            float f02 = readValueFromTexture(textureData02);
            float f12 = readValueFromTexture(textureData12);
            float f22 = readValueFromTexture(textureData22);

            // 1st. derivatives [val/pixel]
            float fx0_1 = (f1_1 - f_1_1) / 2.0;
            float fx1_1 = (f2_1 - f0_1) / 2.0;
            float fx00 = (f10 - f_10) / 2.0;
            float fx10 = (f20 - f00) / 2.0;
            float fx01 = (f11 - f_11) / 2.0;
            float fx11 = (f21 - f01) / 2.0;
            float fx02 = (f12 - f_12) / 2.0;
            float fx12 = (f22 - f02) / 2.0;
            float fy_10 = (f_11 - f_1_1) / 2.0;
            float fy_11 = (f_12 - f_10) / 2.0;
            float fy00 = (f01 - f0_1) / 2.0;
            float fy01 = (f02 - f00) / 2.0;
            float fy10 = (f11 - f1_1) / 2.0;
            float fy11 = (f12 - f10) / 2.0;
            float fy20 = (f21 - f2_1) / 2.0;
            float fy21 = (f22 - f20) / 2.0;

            // 2nd derivatives [val/pixel^2]
            float fxy00 = (fx01 - fx0_1) / 2.0;
            float fxy01 = (fx02 - fx00) / 2.0;
            float fxy10 = (fx11 - fx1_1) / 2.0;
            float fxy11 = (fx12 - fx10) / 2.0;

            return mat4(
                 f00,  f01,  fy00,  fy01,
                 f10,  f11,  fy10,  fy11,
                fx00, fx01, fxy00, fxy01,
                fx10, fx11, fxy10, fxy11
            );
        }

        mat4 calcBicubicCoefMatrix(mat4 derivativeMatrix) {
            return mat4(
                1,  0, -3,  2,
                 0,  0,  3, -2,
                 0,  1, -2,  1,
                 0,  0, -1,  1
            ) * derivativeMatrix * mat4(
                1,  0,  0,  0,
                0,  0,  1,  0,
               -3,  3, -2, -1,
                2, -2,  1,  1
            );
        }

        float bicubicInterpolationUnitSquare( float x, float y, mat4 derivativeMatrix ) {
            mat4 coefMatrix = calcBicubicCoefMatrix(derivativeMatrix);

            vec4 xVec = vec4(1, x, x*x, x*x*x);
            vec4 yVec = vec4(1, y, y*y, y*y*y);

            return dot(yVec, coefMatrix * xVec);
        }

        float bicubicInterpolationRectilinear(
            float x, float x0, float x1,
            float y, float y0, float y1,
            mat4 derivativeMatrix
        ) {
           mat4 coefMatrix = calcBicubicCoefMatrix(derivativeMatrix);

           float xM = (x - x0) / (x1 - x0);
           float yM = (y - y0) / (y1 - y0);

           vec4 xVec = vec4(1, xM, xM*xM, xM*xM*xM);
           vec4 yVec = vec4(1, yM, yM*yM, yM*yM*yM);

            return dot(xVec, coefMatrix * yVec);
        }

        void main() {
            mat4 derivativeMatrix = calcDerivativeMatrix( u_dataTexture, v_texturePosition, u_textureSize );
            float x = fract(v_texturePosition.x);
            float y = fract(v_texturePosition.y);
            float interpolatedValue = bicubicInterpolationUnitSquare( x,  y, derivativeMatrix );
            float interpolatedValueNormalized = (interpolatedValue - u_valueBounds[0]) / (u_valueBounds[1] - u_valueBounds[0]);
            gl_FragColor = vec4(interpolatedValueNormalized, interpolatedValueNormalized, interpolatedValueNormalized, 0.8);
        }
        `);
        this.bundle = new ElementsBundle(program, {
            'a_geoPosition': new AttributeData(new Float32Array(coordinates.flat()), 'vec2', false),
            'a_texturePosition': new AttributeData(new Float32Array(colsAndRows), 'vec2', false),
        }, {
            'u_geoBbox': new UniformData('vec4', [0, 0, 360, 180]),
            'u_valueBounds': new UniformData('vec2', valueBounds),
            'u_textureSize': new UniformData('vec2', [nrCols, nrRows])
        }, {
            'u_dataTexture': new TextureData(dataMatrix255, 'ubyte4')
        }, 'triangles', new Index(index));

        this.bundle.upload(this.context);
        this.bundle.initVertexArray(this.context);
        this.bundle.bind(this.context);
        this.bundle.draw(this.context, [0, 0, 0, 255]);

    }

    setBbox(newBbox: number[]): boolean {
        if (newBbox !== this.bundle.uniforms['u_geoBbox'].value) {
            this.bundle.updateUniformData(this.context, 'u_geoBbox', newBbox);
            this.bundle.upload(this.context);
        }
        return true;
    }

    setCanvasSize(width: number, height: number): void {
        if (this.canvas.width !== width) this.canvas.width = width;
        if (this.canvas.height !== height) this.canvas.height = height;
    }

    renderFrame(): HTMLCanvasElement {
        this.bundle.draw(this.context);
        return this.canvas;
    }

}

