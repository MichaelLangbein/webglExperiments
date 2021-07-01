import { Map, View } from 'ol';
import { GeoJSON } from 'ol/format';
import { OSM, XYZ, ImageCanvas, Vector as VectorSource  } from 'ol/source';
import { Vector as VectorLayer, Tile as TileLayer, Vector, Image as ImageLayer, Tile } from 'ol/layer';
import RasterSource from 'ol/source/Raster';
import Static from 'ol/source/ImageStatic';
import { createSplineSource } from '../../utils/ol/cubicSplines3';
import { SplineLayer } from '../../utils/ol/cubicSplines2';
import Delaunator from 'delaunator';
import bbox from '@turf/bbox';
import { FeatureCollection, Point } from 'geojson';
import 'ol/ol.css';


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
 *      - don't even align with triangle edges
 *          - rounding error?
 * - handle non-power2 textures
 * - interpolation messed up if nonsquare datapoints
 *      - maybe buffer such that always 16 neighbors?
 * - out of memory error
 * 
 */



document.getElementById('canvas').style.setProperty('height', '0px');
const fpser = document.getElementById('fpser');


fetch('assets/testdata2.json').then((response: Response) => {
    response.json().then((data: FeatureCollection) => {

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
                    const r = interpolateRangewise(v, [50, 130, 210], [244, 168, 67]);
                    const g = interpolateRangewise(v, [50, 130, 210], [243, 221, 181]);
                    const b = interpolateRangewise(v, [50, 130, 210], [219, 181, 202]);

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
