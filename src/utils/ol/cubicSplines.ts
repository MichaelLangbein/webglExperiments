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

        float triangular(float x) {
            if( -1.0 < x && x <= 0.0 ) {
                return x + 1.0;
            }
            else if( 0.0 < x && x <= 1.0 ) {
                return 1.0 - x;
            }
        }

        float bSpline(float x) {
            float f = x;
            if( f < 0.0 )  {
                f = -f;
            }

            if( f >= 0.0 && f <= 1.0 ) {
                return ( 2.0 / 3.0 ) + ( 0.5 ) * ( f* f * f ) - (f*f);
            }
            else if( f > 1.0 && f <= 2.0 ) {
                return 1.0 / 6.0 * pow( ( 2.0 - f  ), 3.0 );
            }
            return 1.0;
        }


        float biCubic(sampler2D textureSampler, vec2 textureSize, vec2 textureCoordinate) {
            float nSum = 0.0;
            float nDenom = 0.0;

            float a = fract(textureCoordinate.x);
            float b = fract(textureCoordinate.y);

            for (int m = -1; m <= 2; m++) {
                for (int n = -1; n <= 2; n++) {
                    vec2 offsetX = float(m) * vec2(1, 0);
                    vec2 offsetY = float(n) * vec2(0, 1);
                    vec4 textureData = texture2D(textureSampler, (textureCoordinate + offsetX + offsetY) / textureSize);
                    float value = readValueFromTexture(textureData);

                    float coefX = bSpline(float(m) - a);
                    float coefY = bSpline(-(float(n) - b));

                    nSum = nSum + (value * coefX * coefY);
                    nDenom = nDenom + (coefX * coefY);
                }
            }

            return nSum / nDenom;
        }

        void main() {
            float interpolatedValue = biCubic(u_dataTexture, u_textureSize, v_texturePosition);
            float interpolatedValueNormalized = (interpolatedValue - u_valueBounds[0]) / (u_valueBounds[1] - u_valueBounds[0]);
            gl_FragColor = vec4(interpolatedValueNormalized, interpolatedValueNormalized, interpolatedValueNormalized, 0.8);
        }
        `);
        this.bundle = new ElementsBundle(program, {
            'a_geoPosition': new AttributeData(new Float32Array(coordinates.flat()), 'vec2', false),
            'a_texturePosition': new AttributeData(new Float32Array(colsAndRows), 'vec2', false),
        }, {
            'u_geoBbox': new UniformData('vec4', [0, 0, 360, 180]),
            // 'u_gridBounds': new UniformData('vec4', gridBounds),
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

