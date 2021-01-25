import { Vector as VectorLayer } from 'ol/layer';
import { Options } from 'ol/layer/BaseVector';
import LayerRenderer from 'ol/renderer/Layer';
import { FrameState } from 'ol/PluggableMap';
import Point from 'ol/geom/Point';

import Delaunator from 'delaunator';
import { ArrayBundle, Program, AttributeData, UniformData, TextureData, Context, ElementsBundle, Index, Bundle } from '../../engine2/engine.core';



export interface InverseDistanceLayerOptions extends Options {}

export class InverseDistanceLayer extends VectorLayer {

    constructor(opt_options: InverseDistanceLayerOptions) {
        super(opt_options);
    }

    createRenderer(): LayerRenderer<VectorLayer> {
        const renderer = new InverseDistanceRenderer(this);
        return renderer;
    }
}



export class InverseDistanceRenderer extends LayerRenderer<VectorLayer> {

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

        void main() {
            float factor = 1.0;
            vec2 deltaX = factor * vec2(1.0, 0.0);
            vec2 deltaY = factor * vec2(0.0, 1.0);
            vec4 dataCtr = texture2D(u_dataTexture, v_texturePosition / u_textureSize );
            vec4 dataRgt = texture2D(u_dataTexture, (v_texturePosition + deltaX) / u_textureSize );
            vec4 dataLft = texture2D(u_dataTexture, (v_texturePosition - deltaX) / u_textureSize );
            vec4 dataBot = texture2D(u_dataTexture, (v_texturePosition + deltaY) / u_textureSize );
            vec4 dataTop = texture2D(u_dataTexture, (v_texturePosition - deltaY) / u_textureSize );

            vec2 geoPosCtr = readCoordsFromTexture(dataCtr);
            vec2 geoPosRgt = readCoordsFromTexture(dataRgt);
            vec2 geoPosLft = readCoordsFromTexture(dataLft);
            vec2 geoPosTop = readCoordsFromTexture(dataTop);
            vec2 geoPosBot = readCoordsFromTexture(dataBot);

            float valueCtr = readValueFromTexture(dataCtr);
            float valueRgt = readValueFromTexture(dataRgt);
            float valueLft = readValueFromTexture(dataLft);
            float valueTop = readValueFromTexture(dataTop);
            float valueBot = readValueFromTexture(dataBot);

            float distCtr = distance(geoPosCtr, v_geoPosition);
            float distRgt = distance(geoPosRgt, v_geoPosition);
            float distLft = distance(geoPosLft, v_geoPosition);
            float distTop = distance(geoPosTop, v_geoPosition);
            float distBot = distance(geoPosBot, v_geoPosition);

            float normalizer = 1.0 / ((1.0 / (distCtr * distCtr)) + (1.0 / (distTop * distTop)) + (1.0 / (distBot * distBot)) + (1.0 / (distLft * distLft)) + (1.0 / (distRgt * distRgt)));
            float weightedValCtr = dataCtr.w / ( distCtr * distCtr );
            float weightedValTop = dataTop.w / ( distTop * distTop );
            float weightedValBot = dataBot.w / ( distBot * distBot );
            float weightedValRgt = dataRgt.w / ( distRgt * distRgt );
            float weightedValLft = dataLft.w / ( distLft * distLft );

            float valInterpolated = normalizer * (weightedValCtr + weightedValTop + weightedValBot + weightedValLft + weightedValRgt);
            float valInterpolatedNormalized = 5.0 * (valInterpolated - u_valueBounds[0]) / (u_valueBounds[1] - u_valueBounds[0]);

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

