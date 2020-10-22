import { ElementsBundle, Program, Index, AttributeData, Context, UniformData } from '../../engine/engine.core';
import Delaunator from 'delaunator';
import earcut from 'earcut';

import { Map, View } from 'ol';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer';
import { OSM, Vector as VectorSource } from 'ol/source';
import { GeoJSON } from 'ol/format';
import 'ol/ol.css';
import { setup3dScene } from '../../engine/webgl';

const mapDiv = document.getElementById('map') as HTMLDivElement;
const canvas = document.getElementById('canvas') as HTMLCanvasElement;

const bg = new TileLayer({
    source: new OSM()
});

const view = new View({
    center: [5, 52],
    zoom: 4,
    projection: 'EPSG:4326'
});

fetch('./assets/polygons.geojson').then(response => {
    response.json().then(data => {
        const dataLayer = new VectorLayer({
            source: new VectorSource({
                features: new GeoJSON().readFeatures(data)
            })
        });
        map.addLayer(dataLayer);
    });
});


const map = new Map({
    target: mapDiv,
    layers: [bg],
    view: view
});



const bbox = map.getView().calculateExtent(map.getSize());
const data = {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "properties": {},
        "geometry": {
          "type": "Polygon",
          "coordinates": [
            [
              [
                14.0625,
                50.51342652633956
              ],
              [
                19.335937499999996,
                54.059387886623576
              ],
              [
                14.765625,
                58.99531118795094
              ],
              [
                -1.7578125,
                59.17592824927136
              ],
              [
                -7.3828125,
                53.014783245859235
              ],
              [
                0.703125,
                55.87531083569679
              ],
              [
                8.7890625,
                56.17002298293205
              ],
              [
                7.91015625,
                53.54030739150022
              ],
              [
                6.15234375,
                50.84757295365389
              ],
              [
                11.42578125,
                49.26780455063753
              ],
              [
                14.0625,
                50.51342652633956
              ]
            ]
          ]
        }
      },
      {
        "type": "Feature",
        "properties": {},
        "geometry": {
          "type": "Polygon",
          "coordinates": [
            [
              [
                -7.91015625,
                51.6180165487737
              ],
              [
                -8.61328125,
                49.15296965617042
              ],
              [
                -7.3828125,
                44.33956524809713
              ],
              [
                2.4609375,
                43.197167282501276
              ],
              [
                13.886718749999998,
                46.31658418182218
              ],
              [
                17.75390625,
                52.05249047600099
              ],
              [
                15.8203125,
                50.17689812200107
              ],
              [
                12.480468749999998,
                49.03786794532644
              ],
              [
                9.140625,
                49.03786794532644
              ],
              [
                4.921875,
                50.736455137010665
              ],
              [
                5.44921875,
                52.26815737376817
              ],
              [
                7.3828125,
                55.27911529201561
              ],
              [
                1.58203125,
                54.97761367069628
              ],
              [
                -2.4609375,
                53.85252660044951
              ],
              [
                -7.91015625,
                51.6180165487737
              ]
            ]
          ]
        }
      },
      {
        "type": "Feature",
        "properties": {},
        "geometry": {
          "type": "Polygon",
          "coordinates": [
            [
              [
                -9.667968749999998,
                52.802761415419674
              ],
              [
                -1.9335937499999998,
                59.80063426102869
              ],
              [
                15.99609375,
                59.5343180010956
              ],
              [
                20.7421875,
                54.67383096593114
              ],
              [
                22.32421875,
                55.07836723201515
              ],
              [
                22.148437499999996,
                61.60639637138628
              ],
              [
                -18.6328125,
                60.326947742998414
              ],
              [
                -16.34765625,
                50.064191736659104
              ],
              [
                -9.667968749999998,
                52.802761415419674
              ]
            ]
          ]
        }
      },
      {
        "type": "Feature",
        "properties": {},
        "geometry": {
          "type": "Polygon",
          "coordinates": [
            [
              [
                19.335937499999996,
                52.3755991766591
              ],
              [
                14.765625,
                45.336701909968134
              ],
              [
                4.04296875,
                42.68243539838623
              ],
              [
                -4.04296875,
                42.5530802889558
              ],
              [
                -7.91015625,
                43.45291889355465
              ],
              [
                -9.667968749999998,
                45.583289756006316
              ],
              [
                -10.37109375,
                49.26780455063753
              ],
              [
                -10.37109375,
                50.958426723359935
              ],
              [
                -15.644531250000002,
                48.3416461723746
              ],
              [
                -14.0625,
                39.36827914916014
              ],
              [
                23.203125,
                43.197167282501276
              ],
              [
                21.796875,
                53.64463782485651
              ],
              [
                19.335937499999996,
                52.3755991766591
              ]
            ]
          ]
        }
      }
    ]
  };
const coords = data.features.map((f, i) => f.geometry.coordinates[0]).flat();
const colors = data.features.map((f, i) => Array(f.geometry.coordinates[0].length).fill(i));
const indices = earcut(coords.flat());

const geoshader = new ElementsBundle(new Program(`#version 300 es
    precision highp float;
    in vec2 a_coord;
    in float a_color;
    flat out float v_color;
    uniform vec4 u_bbox;

    void main() {
        gl_Position = vec4( -1.0 + 2.0 * (a_coord.x - u_bbox.x) / (u_bbox.z - u_bbox.x),  -1.0 + 2.0 * (a_coord.y - u_bbox.y) / (u_bbox.w - u_bbox.y), 0, 1);
        v_color = a_color;
    }`, `#version 300 es
    precision highp float;
    flat in float v_color;
    out vec4 vertexColor;

    void main() {
        vertexColor = vec4(v_color / 4.0, v_color / 4.0, v_color / 4.0, 0.5);
    }`), {
        a_coord: new AttributeData(coords.flat(), 'vec2', false),
        a_color: new AttributeData(colors.flat(), 'float', false)
    }, {
        u_bbox: new UniformData('vec4', bbox)
    }, {}, 'triangles', new Index(indices));

const context = new Context(canvas.getContext('webgl2') as WebGL2RenderingContext, true);

setup3dScene(context.gl);
geoshader.upload(context);
geoshader.initVertexArray(context);
geoshader.bind(context);
geoshader.draw(context, [0.1, 0.1, 0.1, 1.0]);