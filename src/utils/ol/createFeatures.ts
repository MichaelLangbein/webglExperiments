import { vectorAddition, scalarProduct } from '../math';

export const createPointGrid = (startPoint: [number, number], deltaX: number, deltaY: number,
                            nrRows: number, nrCols: number, xDir: [number, number], yDir: [number, number],
                            noiseX = 0, noiseY = 0, failRate = 0) => {

    const features = [];
    for (let i = 0; i < nrRows; i++) {
        for (let j = 0; j < nrCols; j++) {
            if (Math.random() > failRate) {

                // pos = start + i*deltaX + j*deltaY + noise
                const pos = vectorAddition(
                                vectorAddition(
                                    vectorAddition(startPoint,
                                        scalarProduct(deltaX * i, xDir)),
                                    scalarProduct(deltaY * j, yDir)),
                                    [Math.random() * noiseX, Math.random() * noiseY]);

                features.push({
                    type: 'Feature',
                    properties: {
                        id: i * nrCols + j,
                        value: [i, j]
                    },
                    geometry: {
                        type: 'Point',
                        coordinates: pos
                    }
                });
            }
        }
    }

    const featureCollection = {
        type: 'FeatureCollection',
        features: features
    };

    return featureCollection;
};
