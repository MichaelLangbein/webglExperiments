import { Map, View } from 'ol';
import { OSM } from 'ol/source';
import { Tile as TileLayer } from 'ol/layer';
import { Feature as olFeature } from 'ol';
import olStyle from 'ol/style/Style';
import olCircle from 'ol/style/Circle';
import olFill from 'ol/style/Fill';
import olStroke from 'ol/style/Stroke';
import olText from 'ol/style/Text';
import 'ol/ol.css';

import { FeatureCollection, Point } from 'geojson';

import { ColorRamp } from '../../utils/ol/inverseDistance/interpolationLayer';
import { createInterpolationLayer } from '../../utils/ol/cubicSplines/interpolationLayer';





document.getElementById('canvas').style.setProperty('height', '0px');
const fpser = document.getElementById('fpser');


fetch('assets/waveheight.json').then((response: Response) => {
    response.json().then((data: FeatureCollection<Point>) => {

        const maxValue = Math.max(...data.features.map(f => f.properties['SWH']));
        const colorRamp: ColorRamp = [
            { val: 0.9 * maxValue, rgb: [67, 168, 244] },
            { val: 0.93 * maxValue, rgb: [181, 221, 243] },
            { val: 0.96 * maxValue, rgb: [202, 181, 219] }
        ];

        const styleFunction = (feature: olFeature<any>, resolution: number): olStyle => {
            const features = feature.getProperties().features;
            let labelText: string;
            if (features.length > 1) {
                labelText = `${feature.getProperties().features.length}`;
            } else {
                labelText = `${Number.parseFloat(features[0].getProperties()['SWH']).toPrecision(3)}`;
            }

            return new olStyle({
                image: new olCircle({
                    radius: 13,
                    fill: new olFill({
                        color: 'rgba(0, 153, 255, 0.2)',
                    }),
                    stroke: new olStroke({
                        color: 'rgba(255, 255, 255, 0.2)',
                        width: 1,
                    })
                }),
                text: new olText({
                    text: labelText,
                    overflow: true,
                    offsetX: -((labelText.length * 5) / 2),
                    offsetY: 1,
                    textAlign: 'left',
                    fill: new olFill({
                        color: '#ffffff'
                    }),
                })
            });
        };

        const layer = createInterpolationLayer(data, map.getView().getProjection(), styleFunction, colorRamp);
        map.addLayer(layer);
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
