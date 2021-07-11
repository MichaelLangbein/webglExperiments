import { FeatureCollection, Point } from 'geojson';
import { GridPointProps } from '../ol/cubicSplines/cubicSplines3';
import { nelderMead } from 'fmin';
import { vectorProjectedOnto, vectorAddition, scalarProduct, vectorLength, vectorSubtraction, createMatrix } from '../math';


export interface GridParas {
    x0: number;
    y0: number;
    deltaX: number;
    deltaY: number;
    theta: number;
    rho: number;
}

function makeAxis(angleRadians: number) {
    const axis = [
        Math.cos(angleRadians),
        Math.sin(angleRadians)
    ];
    return axis;
}

function point2closestGridPoint(point: number[], gridParas: GridParas): {closestGridPoint: number[], r: number, c: number} {
    const nullPoint = [gridParas.x0, gridParas.y0];
    const pointMin = vectorSubtraction(point, nullPoint);

    const primaryAxis = makeAxis(gridParas.theta);
    const alpha = vectorProjectedOnto(pointMin, primaryAxis);
    const col = Math.round(alpha / gridParas.deltaX);

    const secondaryAxis = makeAxis(gridParas.rho);
    const beta = vectorProjectedOnto(pointMin, secondaryAxis);
    const row = Math.round(beta / gridParas.deltaY);

    const closestGridPoint = vectorAddition(
        [gridParas.x0, gridParas.y0],
        vectorAddition(
            scalarProduct(col, primaryAxis),
            scalarProduct(row, secondaryAxis)
        )
    );
    return {closestGridPoint, r: row, c: col};

}

function distance(p1: number[], p2: number[]): number {
    return Math.sqrt(
        Math.pow(p1[0] - p2[0], 2) +
        Math.pow(p1[1] - p2[1], 2)
    );
}

function getBbox(data: number[][]): {xMin: number, xMax: number, yMin: number, yMax: number} {
    const xs = data.map(dp => dp[0]);
    const ys = data.map(dp => dp[1]);
    return {
        xMin: Math.min(...xs),
        xMax: Math.max(...xs),
        yMin: Math.min(...ys),
        yMax: Math.max(...ys),
    };
}

function error(data: number[][], gridParas: GridParas): number {
    if (gridParas.x0 < 0 || gridParas.y0 < 0 || gridParas.deltaX < 0 || gridParas.deltaY < 0) return 100000000;
    const bbox = getBbox(data);
    const nrCols = (bbox.xMax - bbox.xMax) / gridParas.deltaX;
    const nrRows = (bbox.yMax - bbox.yMin) / gridParas.deltaY;
    if (nrCols * nrRows < data.length) return 100000000000;

    let cumlDistance = 0;
    const alreadySeen = createMatrix(nrCols, nrRows);
    for (let point of data) {
        const {closestGridPoint, r, c} = point2closestGridPoint(point, gridParas);
        const d = distance(point, closestGridPoint);
        cumlDistance += d;

        if (alreadySeen[r][c] > 0) {
            cumlDistance += 100 * alreadySeen[r][c];
        }
        alreadySeen[r][c] += 1;
    }
    return cumlDistance;
}

function gradientDescent(points: number[][]): GridParas {
    const minX = Math.min(... points.map(p => p[0]));
    const minY = Math.min(... points.map(p => p[1]));
    const deltaX = Math.abs(points[1][0] - points[0][0]);

    const loss = (paras: number[]) => {
        const gridParas: GridParas = {
            x0: paras[0],
            y0: paras[1],
            deltaX: paras[2],
            deltaY: paras[3],
            theta: paras[4],
            rho: paras[5]
        };
        return error(points, gridParas);
    };
    var solution = nelderMead(loss, [minX, minY, deltaX, deltaX, 0, Math.PI / 2]);

    const output = {
        x0: solution.x[0],
        y0: solution.x[1],
        deltaX: solution.x[2],
        deltaY: solution.x[3],
        theta: solution.x[4],
        rho: solution.x[5]
    };
    return output;
}

function instrument(data: FeatureCollection<Point, any>, gridParas: GridParas, valuePara: string): FeatureCollection<Point, GridPointProps> {
    for (const feature of data.features) {
        const {closestGridPoint, r, c} = point2closestGridPoint(feature.geometry.coordinates, gridParas);
        feature.properties.row = r;
        feature.properties.col = c;
        feature.properties.val = feature.properties[valuePara];
    }
    return data;
}

export function gridFit(data: FeatureCollection<Point, any>, valuePara: string): FeatureCollection<Point, GridPointProps> {

    const coords = data.features.map(f => (f.geometry as Point).coordinates);
    const paras = gradientDescent(coords);
    console.log(paras)
    const instrumentedData = instrument(data, paras, valuePara);

    return instrumentedData;
}