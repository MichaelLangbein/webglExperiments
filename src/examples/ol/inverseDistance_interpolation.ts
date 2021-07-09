import { Map, View } from 'ol';
import { OSM, XYZ } from 'ol/source';
import { Tile as TileLayer, Image as ImageLayer } from 'ol/layer';
import 'ol/ol.css';
import { FeatureCollection, Point } from 'geojson';
import { createInterpolationLayer, ColorRamp } from '../../utils/ol/interpolationLayer';
import { Feature as olFeature } from 'ol';
import { Style as olStyle, Circle as olCircle, Fill as olFill, Stroke as olStroke, Text as olText } from 'ol/style';



document.getElementById('canvas').style.setProperty('height', '0px');
const fpser = document.getElementById('fpser');


fetch('assets/waveheight.json').then((response: Response) => {
    response.json().then((data: FeatureCollection<Point>) => {

        const maxValue = Math.max(...data.features.map(f => f.properties['SWH']));
        const colorRamp: ColorRamp = [
            { val: 0.3 * maxValue, rgb: [67, 168, 244] },
            { val: 0.6 * maxValue, rgb: [181, 221, 243] },
            { val: 0.9 * maxValue, rgb: [202, 181, 219] }
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

        const layer = createInterpolationLayer(data, map.getView().getProjection().getCode(), styleFunction, colorRamp);
        map.addLayer(layer);

        let power = 3;
        let smooth = true;
        let labels = true;

        const xSlider = document.getElementById('xrange') as HTMLInputElement;
        xSlider.addEventListener('change', (evt) => {
            power = 10 * (+(xSlider.value) + 100) / 200;
            const updateFunc = layer.get('updateParas');
            updateFunc(power, smooth, labels);
        });
        const button = document.getElementById('button') as HTMLButtonElement;
        button.addEventListener('click', (evt) => {
            smooth = !smooth;
            const updateFunc = layer.get('updateParas');
            updateFunc(power, smooth, labels);
        });
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
