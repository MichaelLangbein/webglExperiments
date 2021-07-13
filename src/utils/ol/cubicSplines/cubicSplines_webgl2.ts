import Delaunator from 'delaunator';
import { Program, AttributeData, UniformData, TextureData, Context, ElementsBundle, Index, Bundle } from '../../../engine2/engine.core';
import { ImageCanvas } from 'ol/source';
import Projection from 'ol/proj/Projection';
import { FeatureCollection, Point } from 'geojson';


export interface GridPointProps {
    col: number;
    row: number;
    value: number;
}

export function createSplineSource(data: FeatureCollection<Point, GridPointProps>, projection: Projection): ImageCanvas {

    const splineRenderer = new SplineRenderer(data);

    const splineSource = new ImageCanvas({
        canvasFunction: (extent, imageResolution, devicePixelRatio, imageSize, projection) => {
            splineRenderer.setCanvasSize(imageSize[0], imageSize[1]);
            splineRenderer.setBbox(extent);
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

    constructor(data: FeatureCollection<Point, GridPointProps>) {

        this.canvas = document.createElement('canvas') as HTMLCanvasElement;
        this.canvas.width = 600;
        this.canvas.height = 600;
        this.canvas.style.setProperty('position', 'absolute');
        this.canvas.style.setProperty('left', '0px');
        this.canvas.style.setProperty('top', '0px');
        this.canvas.style.setProperty('width', '100%');
        this.canvas.style.setProperty('height', '100%');


        const features = data.features;
        const coordinates = features.map(f => f.geometry.coordinates);
        const d = Delaunator.from(coordinates);
        const index = new Uint32Array(d.triangles.buffer);

        const nrCols = Math.max(... features.map(f => f.properties.col)) + 1;
        const nrRows = Math.max(... features.map(f => f.properties.row)) + 1;
        const minVal = Math.min(... features.map(f => f.properties.value));
        const maxVal = Math.max(... features.map(f => f.properties.value));
        const valueBounds = [minVal, maxVal];

        const dataMatrix255: number[][][] = new Array(nrRows).fill(0)
                    .map(v => new Array(nrCols).fill(0)
                    .map(v => [0, 0, 0, 0]));
        const colsAndRows: number[] = [];
        for (const feature of features) {
            const row = feature.properties.row;
            const col = feature.properties.col;
            const val = feature.properties.value;
            // @IMPORTANT: only normalize to 255 if texture is ubyte4. With floatX there is no need for (de-)normalization
            const valNormalized = 255 * (val - valueBounds[0]) / (valueBounds[1] - valueBounds[0]);
            dataMatrix255[row][col] = [0, 0, 0, valNormalized];
            colsAndRows.push(col, row);
        }

        this.context = new Context(this.canvas.getContext('webgl2') as WebGL2RenderingContext, false);
        const program = new Program(
            `
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
            `,
        `
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
            float f0_1  = readValueFromTexture(textureData0_1 );
            float f1_1  = readValueFromTexture(textureData1_1 );
            float f2_1  = readValueFromTexture(textureData2_1 );
            float f_10  = readValueFromTexture(textureData_10 );
            float f00   = readValueFromTexture(textureData00  );
            float f10   = readValueFromTexture(textureData10  );
            float f20   = readValueFromTexture(textureData20  );
            float f_11  = readValueFromTexture(textureData_11 );
            float f01   = readValueFromTexture(textureData01  );
            float f11   = readValueFromTexture(textureData11  );
            float f21   = readValueFromTexture(textureData21  );
            float f_12  = readValueFromTexture(textureData_12 );
            float f02   = readValueFromTexture(textureData02  );
            float f12   = readValueFromTexture(textureData12  );
            float f22   = readValueFromTexture(textureData22  );

            // 1st. derivatives [val/pixel]
            float fx_10 = (f_11 - f_1_1) / 2.0;
            float fx_11 = (f_12 - f_10 ) / 2.0;
            float fx00  = (f01  - f0_1 ) / 2.0;
            float fx10  = (f11  - f1_1 ) / 2.0;
            float fx01  = (f02  - f00  ) / 2.0;
            float fx11  = (f12  - f10  ) / 2.0;
            float fx20  = (f21  - f2_1 ) / 2.0;
            float fx21  = (f22  - f20  ) / 2.0;
            float fy0_1 = (f1_1 - f_1_1) / 2.0;
            float fy1_1 = (f2_1 - f0_1 ) / 2.0;
            float fy00  = (f10 - f_10  ) / 2.0;
            float fy10  = (f20  - f00  ) / 2.0;
            float fy01  = (f11  - f01  ) / 2.0;
            float fy11  = (f21  - f01  ) / 2.0;
            float fy02  = (f12  - f_12 ) / 2.0;
            float fy12  = (f22  - f02  ) / 2.0;

            // 2nd derivatives [val/pixel^2]
            float fxy00 = ( ((fx10 - fx_10)/2.0)  + ((fy01 - fy0_1)/2.0)  ) / 2.0;
            float fxy01 = ( ((fx11 - fx_11)/2.0)  + ((fy02 - fy00 )/2.0)  ) / 2.0;
            float fxy10 = ( ((fx20 - fx00 )/2.0)  + ((fy11 - fy1_1)/2.0)  ) / 2.0;
            float fxy11 = ( ((fx21 - fx01 )/2.0)  + ((fy12 - fy10 )/2.0)  ) / 2.0;

            return mat4(
                 f00,  f10,  fx00,  fx10,
                 f01,  f11,  fx01,  fx11,
                fy00, fy10, fxy00, fxy10,
                fy01, fy11, fxy01, fxy11
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

            return dot(xVec, coefMatrix * yVec);
        }

        void main() {
            mat4 derivativeMatrix = calcDerivativeMatrix( u_dataTexture, v_texturePosition, u_textureSize );
            float x = fract(v_texturePosition.x);
            float y = fract(v_texturePosition.y);
            // if (x > 0.998) { x = 1.0 - x; }
            // if (y > 0.998) { y = 1.0 - y; }
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
        this.bundle.draw(this.context, [0, 0, 0, 0]);

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
        this.bundle.draw(this.context, [0, 0, 0, 0]);
        return this.canvas;
    }

}

