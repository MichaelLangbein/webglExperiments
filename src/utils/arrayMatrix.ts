

export class ArrayCube {
    constructor(public X: number, public Y: number, public Z: number, public data: ArrayLike<any>) {
        if (data instanceof Array) {
            const dataArr = new Float32Array(X * Y * Z);
            for (let x = 0; x < X; x++) {
                for (let y = 0; y < Y; y++) {
                    for (let z = 0; z < Z; z++) {
                        dataArr[z + y * Z + x * Y * Z] = data[x][y][z];
                    }
                }
            }
            this.data = dataArr;
        }
    }

    get(x: number, y: number, z: number): any {
        const i =
            z +
            y * this.Z +
            x * this.Y * this.Z;
        return this.data[i];
    }

    getSubBlock(start: [number, number, number], size: [number, number, number]): ArrayCube {
        const subset: number[][][] = [];
        for (let x = 0; x < size[0]; x++) {
            subset.push([]);
            for (let y = 0; y < size[1]; y++) {
                subset[x].push([]);
                for (let z = 0; z < size[2]; z++) {
                    subset[x][y].push(this.get(x + start[0], y + start[1], z + start[2]));
                }
            }
        }
        return new ArrayCube(size[0], size[1], size[2], subset);
    }
}
