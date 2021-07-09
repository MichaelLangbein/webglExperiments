import { FeatureCollection, Point } from 'geojson';
import { createInterpolationSource, InterpolationRenderer } from './inverseDistance_withPixelCutting';
import { Vector } from 'ol/layer';
import ImageLayer from 'ol/layer/Image';
import { GeoJSON } from 'ol/format';
import { XYZ } from 'ol/source';
import RasterSource from 'ol/source/Raster';
import VectorSource from 'ol/source/Vector';
import LayerGroup from 'ol/layer/Group';
import { Cluster } from 'ol/source';
import { StyleLike } from 'ol/style/Style';
import { map } from 'rxjs/operators';


export type ColorRamp = {val: number, rgb: [number, number, number]}[];


export function createInterpolationLayer(data: FeatureCollection<Point>, projection: string, styleFunction: StyleLike, colorRamp: ColorRamp): LayerGroup {


    const colorRampX = colorRamp.map(e => e.val);
    const colorRampR = colorRamp.map(e => e.rgb[0]);
    const colorRampG = colorRamp.map(e => e.rgb[1]);
    const colorRampB = colorRamp.map(e => e.rgb[2]);


    const interpolationSource = createInterpolationSource(data, projection, 3, 'SWH', 0.2);
    const waterSource = new XYZ({
        url: 'https://storage.googleapis.com/global-surface-water/tiles2020/transitions/{z}/{x}/{y}.png',
        crossOrigin: 'anonymous'
    });

    let smoothInterpolation = true;
    const maxValue = Math.max(... data.features.map(f => f.properties['SWH']));
    const differenceSource = new RasterSource({
        sources: [waterSource, interpolationSource],
        operation: (pixels: number[][], data: any): number[] => {
            const waterPixel = pixels[0];
            const interpolatedPixel = pixels[0];

            // if inside interpolated range and water ...
            if (interpolatedPixel[3] > 0 && waterPixel[3] > 0) {
                const v = interpolatedPixel[0] * maxValue / 255;

                let r, g, b;
                if (data.smooth) {
                    r = interpolateRangewise(v, data.colorRampX, data.colorRampR);
                    g = interpolateRangewise(v, data.colorRampX, data.colorRampG);
                    b = interpolateRangewise(v, data.colorRampX, data.colorRampB);
                } else {
                    r = interpolateStepwise(v, data.colorRampX, data.colorRampR);
                    g = interpolateStepwise(v, data.colorRampX, data.colorRampG);
                    b = interpolateStepwise(v, data.colorRampX, data.colorRampB);
                }

                return [r, g, b, waterPixel[3]];
            } else {
                return [0, 0, 0, 0];
            }
        },
        lib: { interpolateStepwise, interpolateRangewise, interpolate, maxValue }
    });
    differenceSource.on('beforeoperations', function (event) {
        event.data.smooth = smoothInterpolation;
        event.data.colorRampX = colorRampX;
        event.data.colorRampR = colorRampR;
        event.data.colorRampG = colorRampG;
        event.data.colorRampB = colorRampB;
    });

    const differenceLayer = new ImageLayer({
        source: differenceSource
    });

    const featureLayer = new Vector({
        source: new Cluster({
            distance: 30,
            source: new VectorSource({
                features: new GeoJSON().readFeatures(data),
            })
        }),
        style: styleFunction
    });

    const layerGroup = new LayerGroup({
        layers: [differenceLayer, featureLayer]
    });

    layerGroup.set('updateParas', (power: number, smooth: boolean, labels: boolean) => {

        // step 1: update power
        const renderer = interpolationSource.get('renderer') as InterpolationRenderer;
        renderer.setPower(power);

        // step 2: update smoothing
        smoothInterpolation = smooth;
        interpolationSource.refresh();  // strangely, differenceLayer.changed() does not work.

        // step 3: update labels:
        featureLayer.setVisible(labels);
    });

    return layerGroup;
}


function interpolate(x0: number, y0: number, x1: number, y1: number, x: number): number {
    const degree = (x - x0) / (x1 - x0);
    const interp = degree * (y1 - y0) + y0;
    return interp;
}

function interpolateRangewise(x: number, xs: number[], ys: number[]): number {
    if (x < xs[0]) return ys[0];

    for (let i = 0; i < xs.length - 1; i++) {
        if (xs[i] <= x && x < xs[i + 1]) {
            return interpolate(xs[i], ys[i], xs[i + 1], ys[i + 1], x);
        }
    }

    if (xs[xs.length - 1] <= x) {
        return ys[ys.length - 1];
    }
}

function interpolateStepwise(x: number, xs: number[], ys: number[]): number {
    if (x < xs[0]) return ys[0];

    for (let i = 0; i < xs.length - 1; i++) {
        if (xs[i] <= x && x < xs[i + 1]) {
            return ys[i + 1];
        }
    }

    if (xs[xs.length - 1] <= x) {
        return ys[ys.length - 1];
    }
}