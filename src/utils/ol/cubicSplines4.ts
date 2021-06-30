import ImageCanvasSource from 'ol/source/ImageCanvas';
import Projection from 'ol/proj/Projection';
import { point } from '@turf/helpers';
import nearestPoint from '@turf/nearest-point';
import { Feature, FeatureCollection } from 'geojson';



function interpolate(x0: number, y0: number, x1: number, y1: number, x: number): number {
    const fract = (x - x0) / (x1 - x0);
    const intpl = fract * (y1 - y0) + y0;
    return intpl;
}

function getColor(pt: any): number[] {
    const val = pt.properties.value;
    const c = interpolate(0, 0, 20, 255, val);
    return [c, c, c, 255];
}

export function createSplineSource(data: FeatureCollection, projection: Projection) {
    const splineSource = new ImageCanvasSource({
        projection,
        canvasFunction: (extent, imageResolution, devicePixelRatio, imageSize, projection) => {
            const canvas = document.createElement('canvas');
            canvas.width = imageSize[0];
            canvas.height = imageSize[1];

            const context = canvas.getContext('2d');
            const imageData = new ImageData(imageSize[0], imageSize[1]);

            for (let width = 0; width <= imageSize[0]; width++) {
                for (let height = 0; height <= imageSize[1]; height++) {
                    const i = height * imageSize[0] * 4 + width * 4;
                    const xCoord = interpolate(0, extent[0], imageSize[0], extent[2], width);
                    const yCoord = interpolate(0, extent[1], imageSize[1], extent[3], height);
                    const pt = point([xCoord, yCoord]);
                    const nearest = nearestPoint(pt, data);

                    const color = getColor(nearest);
                    imageData.data[i    ] = color[0];
                    imageData.data[i + 1] = color[1];
                    imageData.data[i + 2] = color[2];
                    imageData.data[i + 3] = color[3];
                }
            }

            context.putImageData(imageData, 0, 0);

            return canvas;
        }
    });

    return splineSource;
}