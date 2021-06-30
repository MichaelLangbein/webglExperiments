import { Map, View } from 'ol';
import { Vector as VectorLayer, Tile as TileLayer, Vector, Image as ImageLayer, Tile } from 'ol/layer';
import { OSM, XYZ, ImageCanvas } from 'ol/source';
import { GeoJSON } from 'ol/format';
import { Vector as VectorSource } from 'ol/source';

import { createSplineSource } from '../../utils/ol/cubicSplines3';
import RasterSource from 'ol/source/Raster';
import Static from 'ol/source/ImageStatic';
import { SplineLayer } from '../../utils/ol/cubicSplines2';
import 'ol/ol.css';

import bbox from '@turf/bbox';



document.getElementById('canvas').style.setProperty('height', '0px');
const fpser = document.getElementById('fpser');


fetch('assets/testdata.json').then((response: Response) => {
    response.json().then((data: any) => {

        const splineSource = createSplineSource(data, map.getView().getProjection());

        const waterSource = new XYZ({
            url: 'https://storage.googleapis.com/global-surface-water/tiles2020/transitions/{z}/{x}/{y}.png',
            crossOrigin: 'anonymous'
        });


        const canvas = document.createElement('canvas') as HTMLCanvasElement;
        canvas.width = 1700;
        canvas.height = 900;

        const xkcdSource = new ImageCanvas({
            canvasFunction: (extent) => {
                const context = canvas.getContext('2d');
                context.fillRect(0, 0, canvas.width, canvas.height);
                context.fillStyle = 'red';
                context.beginPath();
                context.moveTo(0, 0);
                context.lineTo(canvas.width, canvas.height);
                context.stroke();
                return canvas;
            },
            ratio: 1,
        });

        const differenceSource = new RasterSource({
            sources: [waterSource, splineSource, xkcdSource],
            operation: (pixels: number[][], data: any): number[] => {
                const waterPixel = pixels[0];
                const splinePixel = pixels[1];
                const xkcdPixel = pixels[2];

                                // // if inside interpolated range and water ...
                                // if (xkcdPixel[3] > 0 && waterPixel[3] > 0) {
                                //     return [xkcdPixel[0], xkcdPixel[1], xkcdPixel[2], waterPixel[3] / 2];
                                // } else {
                                //     return [0, 0, 0, 0];
                                // }

                // if inside interpolated range and water ...
                if (splinePixel[3] > 0 && waterPixel[3] > 0) {
                    return [splinePixel[0], splinePixel[1], splinePixel[2], waterPixel[3] / 2];
                } else {
                    return [0, 0, 0, 0];
                }
            }
        });
        const differenceLayer = new ImageLayer({
            source: differenceSource
        });
        map.addLayer(differenceLayer);


        // const splineLayer = new SplineLayer({
        //     source: new VectorSource({
        //         features: new GeoJSON().readFeatures(data)
        //     })
        // });
        // map.addLayer(splineLayer);

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
})