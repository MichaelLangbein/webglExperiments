import { Vector as VectorLayer } from 'ol/layer';
import { Options } from 'ol/layer/BaseVector';
import LayerRenderer from 'ol/renderer/Layer';
import { FrameState } from 'ol/PluggableMap';
import { DataPoint, convertToDataMatrix } from '../matrixTree';
import Point from 'ol/geom/Point';
import { reprojectDataAlongPrincipalAxes } from '../pcaAlign';
import { Feature } from 'ol';



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

    canvas: HTMLCanvasElement;

    constructor(layer: VectorLayer) {
        super(layer);

        const features = layer.getSource().getFeatures() as Feature<Point>[];
        const dataTexture = createDataTexture(features, 'SWH');

        this.canvas = document.createElement('canvas') as HTMLCanvasElement;
    }

    prepareFrame(frameState: FrameState): boolean {
        return true;
    }

    renderFrame(frameState: FrameState, target: HTMLElement): HTMLElement {
        return this.canvas;
    }

    renderDeclutter(frameState: FrameState): void {

    }
}


function createDataTexture(features: Feature<Point>[], valueKey: string) {
    const coordinates = features.map(f => f.getGeometry().getCoordinates());
    const values = features.map(f => f.getProperties()[valueKey]);

    // Step 1: rotate grid so that aligned with x- and y-axis
    const reprojectedData = reprojectDataAlongPrincipalAxes(coordinates);

    // Step 2: parse grid into a 2d-matrix
    const dataPoints: DataPoint[] = [];
    for (let i = 0; i < values.length; i++) {
        dataPoints.push({
            x: reprojectedData.reprojectedData[i][0],
            y: reprojectedData.reprojectedData[i][1],
            data: values[i]
        });
    }
    const dataMatrix = convertToDataMatrix(dataPoints);

    // // Step 3: encode data to base 255
    // const encodedData = dataMatrix.map(row => {
    //     row.map(el => {
    //         encodeInBase(255, el);
    //     });
    // });

    // // Step 4: write data to texture
    // const texture = dataToTexture(dataMatrix);
}