import { PCA } from 'ml-pca';
import { Matrix, inverse } from 'ml-matrix';



export const reprojectDataAlongPrincipalAxes = (data: number[][]) => {

    const pca = new PCA(data);
    const eigenVectors = pca.getEigenvectors();
    const T = inverse(eigenVectors);

    const reprojectedData = data
        .map(d => Matrix.columnVector(d))
        .map(d => T.mmul(d))
        .map(m => m.getColumn(0));

        return {
        reprojectedData,
        eigenVectors
    };
};
