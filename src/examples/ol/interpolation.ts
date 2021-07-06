import { Map, View } from 'ol';
import { GeoJSON } from 'ol/format';
import { OSM, XYZ, Vector as VectorSource } from 'ol/source';
import { Vector as VectorLayer, Tile as TileLayer, Image as ImageLayer } from 'ol/layer';
import RasterSource from 'ol/source/Raster';
import 'ol/ol.css';

import { FeatureCollection, Point } from 'geojson';

import { createSplineSource, GridPointProps } from '../../utils/ol/cubicSplines3';

import CircleStyle from 'ol/style/Circle';
import { Fill, Style } from 'ol/style';
import { assignRowAndColToFeatureGrid } from '../../utils/gridFitting/matrixTree';


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




/**
 * @TODO:
 * - splineSource has strange line-artifacts
 * - out of memory error
 */



document.getElementById('canvas').style.setProperty('height', '0px');
const fpser = document.getElementById('fpser');


fetch('assets/testdata2.json').then((response: Response) => {
    response.json().then((data: FeatureCollection<Point, GridPointProps>) => {

        const splineSource = createSplineSource(data, map.getView().getProjection());

        const waterSource = new XYZ({
            url: 'https://storage.googleapis.com/global-surface-water/tiles2020/transitions/{z}/{x}/{y}.png',
            crossOrigin: 'anonymous'
        });

        const differenceSource = new RasterSource({
            sources: [waterSource, splineSource],
            operation: (pixels: number[][], data: any): number[] => {
                const waterPixel = pixels[0];
                const splinePixel = pixels[1];

                // if inside interpolated range and water ...
                if (splinePixel[3] > 0 && waterPixel[3] > 0) {
                    const v = splinePixel[0];
                    const r = interpolateRangewise(v, [50, 130, 210], [67, 168, 244]);
                    const g = interpolateRangewise(v, [50, 130, 210], [181, 221, 243]);
                    const b = interpolateRangewise(v, [50, 130, 210], [202, 181, 219]);

                    return [r, g, b, waterPixel[3]];
                    // return [splinePixel[0], splinePixel[1], splinePixel[2], waterPixel[3]];
                } else {
                    return [0, 0, 0, 0];
                }
            },
            lib: { interpolateRangewise, interpolate }
        });
        const differenceLayer = new ImageLayer({
            source: differenceSource
        });
        map.addLayer(differenceLayer);

        const dataLayer = new VectorLayer({
            source: new VectorSource({
                features: new GeoJSON().readFeatures(data)
            }),
        });
        map.addLayer(dataLayer);

    });
});


const osm = new TileLayer({
    source: new OSM()
});


const layers = [osm];

const map = new Map({
    target: document.getElementById('map') as HTMLDivElement,
    layers,
    view: new View({
        center: [16, 55],
        zoom: 7,
        projection: 'EPSG:4326'
    })
});


map.on('pointermove', (evt) => {
    fpser.innerHTML = `${evt.coordinate}`;
});
