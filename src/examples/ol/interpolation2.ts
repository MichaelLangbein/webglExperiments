import { Map, View } from 'ol';
import { OSM, XYZ } from 'ol/source';
import { Tile as TileLayer, Image as ImageLayer } from 'ol/layer';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import RasterSource from 'ol/source/Raster';
import GeoJSON from 'ol/format/GeoJSON';
import { FeatureCollection, Point } from 'geojson';
import { createInterpolationSource } from '../../utils/ol/inverseDistance_withPixelCutting';
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



document.getElementById('canvas').style.setProperty('height', '0px');
const fpser = document.getElementById('fpser');


fetch('assets/waveheight.json').then((response: Response) => {
    response.json().then((data: FeatureCollection<Point>) => {

        const maxValue = Math.max(... data.features.map(f => f.properties['SWH']));

        const interpolationSource = createInterpolationSource(data, map.getView().getProjection().getCode(), 3, 'SWH', 0.3);

        const waterSource = new XYZ({
            url: 'https://storage.googleapis.com/global-surface-water/tiles2020/transitions/{z}/{x}/{y}.png',
            crossOrigin: 'anonymous'
        });

        const differenceSource = new RasterSource({
            sources: [waterSource, interpolationSource],
            operation: (pixels: number[][], data: any): number[] => {
                const waterPixel = pixels[0];
                const interpolatedPixel = pixels[1];

                // if inside interpolated range and water ...
                if (interpolatedPixel[3] > 0 && waterPixel[3] > 0) {
                    const v = interpolatedPixel[0] * maxValue / 255;
                    const r = interpolateRangewise(v, [0.3 * maxValue, 0.6 * maxValue, 0.9 * maxValue], [67, 168, 244]);
                    const g = interpolateRangewise(v, [0.3 * maxValue, 0.6 * maxValue, 0.9 * maxValue], [181, 221, 243]);
                    const b = interpolateRangewise(v, [0.3 * maxValue, 0.6 * maxValue, 0.9 * maxValue], [202, 181, 219]);

                    return [r, g, b, waterPixel[3]];
                } else {
                    return [0, 0, 0, 0];
                }
            },
            lib: { interpolateRangewise, interpolate, maxValue }
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
