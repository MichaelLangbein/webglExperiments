import { FeatureCollection, Point } from 'geojson';
import { createInterpolationSource, InterpolationRenderer } from './inverseDistance_2steps';
import { Vector } from 'ol/layer';
import ImageLayer from 'ol/layer/Image';
import { GeoJSON } from 'ol/format';
import VectorSource from 'ol/source/Vector';
import LayerGroup from 'ol/layer/Group';
import { Cluster } from 'ol/source';
import { StyleLike } from 'ol/style/Style';


export type ColorRamp = {val: number, rgb: [number, number, number]}[];

export function createInterpolationLayer(data: FeatureCollection<Point>, projection: string, styleFunction: StyleLike, colorRamp: ColorRamp): LayerGroup {

    const interpolationSource = createInterpolationSource(data, 3, 'SWH', 0.2, colorRamp);
    const interpolationLayer = new ImageLayer({
        source: interpolationSource
    });

    const featureLayer = new Vector({
        source: new Cluster({
            distance: 30,
            source: new VectorSource({
                features: new GeoJSON({
                    dataProjection: 'EPSG:4326',
                    featureProjection: projection
                }).readFeatures(data),
            })
        }),
        style: styleFunction
    });

    const layerGroup = new LayerGroup({
        layers: [interpolationLayer, featureLayer],
    });

    layerGroup.set('updateParas', (power: number, smooth: boolean, labels: boolean) => {

        // step 1: update power
        const renderer = interpolationSource.get('renderer') as InterpolationRenderer;
        renderer.setPower(power);

        // step 2: update smoothing
        renderer.setSmooth(smooth);
        interpolationSource.refresh();  // strangely, differenceLayer.changed() does not work.

        // step 3: update labels:
        featureLayer.setVisible(labels);
    });

    return layerGroup;
}
