

export class ArrayCube {
    constructor(public X: number, public Y: number, public Z: number, public data: ArrayLike<any>) {}

    get(x: number, y: number, z: number): any {
        const i =
            z +
            y * this.Z +
            x * this.Y * this.Z;
        return this.data[i];
    }
}

export function nestedListToArrayCube(data: number[][][]): ArrayCube {
    const X = data.length;
    const Y = data[0].length;
    const Z = data[0][0].length;

    const dataArr = new Float32Array(X * Y * Z);
    for (let x = 0; x < X; x++) {
        for (let y = 0; y < Y; y++) {
            for (let z = 0; z < Z; z++) {
                dataArr[z + y * Z + x * Y * Z] = data[x][y][z];
            }
        }
    }

    return new ArrayCube(X, Y, Z, dataArr);
}