
import { GeoJSON } from 'ol/format';
import { XYZ, Vector as VectorSource, Cluster } from 'ol/source';
import { Vector as VectorLayer, Image as ImageLayer } from 'ol/layer';
import RasterSource from 'ol/source/Raster';

import { createSplineSource, GridPointProps } from '../../ol/cubicSplines/cubicSplines3';
import { gridFit } from '../../gridFitting/marissSpecific';
import LayerGroup from 'ol/layer/Group';
import { FeatureCollection, Point } from 'geojson';
import { StyleLike } from 'ol/style/Style';
import { ColorRamp } from '../inverseDistance/interpolationLayer';
import Projection from 'ol/proj/Projection';




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


export function createInterpolationLayer(data: FeatureCollection<Point>, projection: Projection, styleFunction: StyleLike, colorRamp: ColorRamp) {

    data = gridFit(data, 'SWH');
    const splineSource = createSplineSource(data as FeatureCollection<Point, GridPointProps>, projection);

    const colorRampX = colorRamp.map(e => e.val);
    const colorRampR = colorRamp.map(e => e.rgb[0]);
    const colorRampG = colorRamp.map(e => e.rgb[1]);
    const colorRampB = colorRamp.map(e => e.rgb[2]);

    const waterSource = new XYZ({
        url: 'https://storage.googleapis.com/global-surface-water/tiles2020/transitions/{z}/{x}/{y}.png',
        crossOrigin: 'anonymous'
    });

    let smoothInterpolation = true;
    const maxValue = Math.max(... data.features.map(f => f.properties['SWH']));
    const differenceSource = new RasterSource({
        sources: [waterSource, splineSource],
        operation: (pixels: number[][], data: any): number[] => {
            const waterPixel = pixels[0];
            const splinePixel = pixels[1];

            // if inside interpolated range and water ...
            if (splinePixel[3] > 0 && waterPixel[3] > 0) {
                const v = splinePixel[0];

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
        lib: { interpolateRangewise, interpolateStepwise, interpolate, maxValue }
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

    const featureLayer = new VectorLayer({
        source: new Cluster({
            distance: 30,
            source: new VectorSource({
                features: new GeoJSON().readFeatures(data),
            })
        }),
        style: styleFunction
    });

    const layerGroup = new LayerGroup({
        layers: [differenceLayer, featureLayer],
    });

    layerGroup.set('updateParas', (smooth: boolean, labels: boolean) => {
        smoothInterpolation = smooth;
        splineSource.refresh();
        featureLayer.setVisible(labels);
    });

    return layerGroup;
}