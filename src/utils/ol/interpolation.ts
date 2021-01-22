import { Vector as VectorLayer } from 'ol/layer';
import { Options } from 'ol/layer/BaseVector';
import LayerRenderer from 'ol/renderer/Layer';
import { FrameState } from 'ol/PluggableMap';
import Point from 'ol/geom/Point';

import Delaunator from 'delaunator';
import { ArrayBundle, Program, AttributeData, UniformData, TextureData, Context, ElementsBundle, Index, Bundle } from '../../engine2/engine.core';



export interface InterpolationLayerOptions extends Options {}

export class InterpolationLayer extends VectorLayer {

    constructor(opt_options: InterpolationLayerOptions) {
        super(opt_options);
    }

    createRenderer(): LayerRenderer<VectorLayer> {
        const renderer = new InterpolationRenderer(this);
        return renderer;
    }
}



export class InterpolationRenderer extends LayerRenderer<VectorLayer> {

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

        const dataMatrix255: number[][][] = new Array(nrRows).fill(0).map(v => new Array(nrRows).fill(0).map(v => [0, 0, 0, 0]));
        const colsAndRows: number[] = [];
        for (const feature of features) {
            const id = feature.getProperties()['id'];
            const row = feature.getProperties()['row'];
            const col = feature.getProperties()['col'];
            const val = feature.getProperties()['value'];
            const coords = (feature.getGeometry() as Point).getCoordinates();
            dataMatrix255[row][col] = [id, coords[0], coords[1], val];
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

        void main() {
            float factor = 1.0;
            vec2 deltaX = factor * vec2(1.0, 0.0);
            vec2 deltaY = factor * vec2(0.0, 1.0);
            vec4 data = texture2D(u_dataTexture, v_texturePosition / u_textureSize );
            vec4 dataRgt = texture2D(u_dataTexture, (v_texturePosition + deltaX) / u_textureSize );
            vec4 dataLft = texture2D(u_dataTexture, (v_texturePosition - deltaX) / u_textureSize );
            vec4 dataBot = texture2D(u_dataTexture, (v_texturePosition + deltaY) / u_textureSize );
            vec4 dataTop = texture2D(u_dataTexture, (v_texturePosition - deltaY) / u_textureSize );

            vec2 geoPosRgt = vec2(dataRgt.y * 4.0 + 16.0, dataRgt.z * 2.0 + 54.0);
            vec2 geoPosLft = vec2(dataLft.y * 4.0 + 16.0, dataLft.z * 2.0 + 54.0);
            vec2 geoPosTop = vec2(dataTop.y * 4.0 + 16.0, dataTop.z * 2.0 + 54.0);
            vec2 geoPosBot = vec2(dataBot.y * 4.0 + 16.0, dataBot.z * 2.0 + 54.0);

            float distRgt = distance(geoPosRgt, v_geoPosition);
            float distLft = distance(geoPosLft, v_geoPosition);
            float distTop = distance(geoPosTop, v_geoPosition);
            float distBot = distance(geoPosBot, v_geoPosition);

            float normalizer = 1.0 / ((1.0 / distRgt) + (1.0 / distLft) + (1.0 / distTop) + (1.0 / distBot));
            float weightedValRgt = dataRgt.w / distRgt;
            float weightedValLft = dataLft.w / distLft;
            float weightedValTop = dataTop.w / distTop;
            float weightedValBot = dataBot.w / distBot;

            float valInterpolated = normalizer * (weightedValRgt + weightedValLft + weightedValTop + weightedValBot);

            gl_FragColor = vec4(valInterpolated * 255.0 / 10.0, 0, 0, 0.7);
        }
        `);
        this.bundle = new ElementsBundle(program, {
            'a_geoPosition': new AttributeData(new Float32Array(coordinates.flat()), 'vec2', false),
            'a_texturePosition': new AttributeData(new Float32Array(colsAndRows), 'vec2', false),
        }, {
            'u_geoBbox': new UniformData('vec4', [0, 0, 360, 180]),
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

