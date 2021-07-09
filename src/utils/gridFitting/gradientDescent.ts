import { FeatureCollection, Point } from 'geojson';


interface GridParas {
    x0: number;
    y0: number;
    deltaX: number;
    deltaY: number;
    theta: number;
}

function assignValue(data: FeatureCollection<Point>, propKey: string): FeatureCollection<Point> {
    for (const feature of data.features) {
        feature.properties.value = feature.properties[propKey];
    }
    return data;
}

// function errorFunction(paras: GridParas, coords: number[][]): number {

// }

// function gradientDescent(coords: number[][]): GridParas {

// }

// function instrument(data: FeatureCollection<Point, any>, paras: GridParas): FeatureCollection<Point, GridPointProps> {

// }

// export function gridFit(data: FeatureCollection<Point, any>): FeatureCollection<Point, GridPointProps> {

//     data = assignValue(data, 'SWH');

//     const coords = data.features.map(f => (f.geometry as Point).coordinates);
//     const paras = gradientDescent(coords);
//     const instrumentedData = instrument(data, paras);

//     return instrumentedData;
// }