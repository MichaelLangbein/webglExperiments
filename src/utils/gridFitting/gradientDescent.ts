import { FeatureCollection, Point } from 'geojson';
import { GridPointProps } from '../ol/cubicSplines/cubicSplines_webgl1';
import { nelderMead } from 'fmin';
import { vectorProjectedOntoLength, vectorAddition, scalarProduct, vectorLength, vectorSubtraction, createMatrix } from '../math';


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
    const alpha = vectorProjectedOntoLength(pointMin, primaryAxis);
    const col = Math.round(alpha / gridParas.deltaX);

    const secondaryAxis = makeAxis(gridParas.rho);
    const beta = vectorProjectedOntoLength(pointMin, secondaryAxis);
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

function gradientDescent(points: number[][], firstGuess: GridParas): {paras: GridParas, fit: number} {

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
    var solution = nelderMead(loss, [firstGuess.x0, firstGuess.y0, firstGuess.deltaX, firstGuess.deltaY, firstGuess.theta, firstGuess.rho]);

    const output = {
        x0: solution.x[0],
        y0: solution.x[1],
        deltaX: solution.x[2],
        deltaY: solution.x[3],
        theta: solution.x[4],
        rho: solution.x[5]
    };
    return {
        paras: output,
        fit: solution.fit
    };
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

    data.features.sort((a, b) => a.properties.id < b.properties.id ? -1 : 1);
    const coords = data.features.map(f => (f.geometry as Point).coordinates);

    const lastPoint = coords[coords.length - 1];
    const deltaX = Math.abs(coords[1][0] - coords[0][0]);
    const firstGuess = {x0: lastPoint[0], y0: lastPoint[1], deltaX: deltaX, deltaY: deltaX, theta: 0, rho: Math.PI / 2};
    const firstResult = gradientDescent(coords, firstGuess);

    let bestParas: GridParas = firstResult.paras;
    let bestFit = firstResult.fit;
    for (let i = 0; i < 10; i++) {
        const guess: GridParas = {
            x0: firstGuess.x0 + Math.random(),
            y0: firstGuess.y0 + Math.random(),
            deltaX: firstGuess.deltaX + Math.random(),
            deltaY: firstGuess.deltaY + Math.random(),
            theta: firstGuess.theta + Math.random(),
            rho: firstGuess.rho + Math.random(),
        };
        const out = gradientDescent(coords, guess);
        if (out.fit < bestFit) {
            bestParas = out.paras;
            bestFit = out.fit;
        }
    }
console.log(bestParas)

    const instrumentedData = instrument(data, bestParas, valuePara);

    return instrumentedData;
}