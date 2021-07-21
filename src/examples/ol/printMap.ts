import { simpleMapToCanvas } from '../../utils/ol/copyMap';
import { Map, View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import { OSM } from 'ol/source';
import { GeoJSON } from 'ol/format'
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Feature as olFeature } from 'ol';
import { Style as olStyle, Circle as olCircle, Fill as olFill, Stroke as olStroke, Text as olText } from 'ol/style';
import { FeatureCollection, Point } from 'geojson';
import { ColorRamp, createInterpolationLayer } from '../../utils/ol/inverseDistance/interpolationLayerPureWebGL';
import 'ol/ol.css';


const osm = new TileLayer({
    source: new OSM()
});


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
    });
});

const layers = [osm];

const view = new View({
    center: [15, 50],
    zoom: 7,
    projection: 'EPSG:4326'
});

const mapDiv = document.getElementById('map');

const map = new Map({
    layers, view, target: mapDiv
});


const targetCanvas = document.getElementById('canvas') as HTMLCanvasElement;
targetCanvas.width = mapDiv.clientWidth;
targetCanvas.height = mapDiv.clientHeight;

const button = document.getElementById('button');
button.addEventListener('click', () => {
    simpleMapToCanvas(map, targetCanvas);
});