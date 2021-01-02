
export class ArrayMatrixUi32 {

    data: Uint32Array;

    constructor(public X: number, public Y: number, data?: Uint32Array) {
        if (data) {
            this.data = data;
        } else {
            this.data = new Uint32Array(X * Y);
        }
    }


    set(x: number, y: number, val: number) {
        const i =
            y +
            x * this.Y;
        this.data[i] = val;
    }

    get(x: number, y: number): any {
        const i =
            y +
            x * this.Y;
        return this.data[i];
    }

    getSubBlock(start: [number, number], size: [number, number]): ArrayMatrixUi32 {
        const subset = new ArrayMatrixUi32(size[0], size[1]);
        for (let x = 0; x < size[0]; x++) {
            for (let y = 0; y < size[1]; y++) {
                subset.set(x, y,
                    this.get(x + start[0], y + start[1]));
            }
        }
        return subset;
    }

}



export class ArrayMatrixF32 {

    data: Float32Array;

    constructor(public X: number, public Y: number, data?: Float32Array) {
        if (data) {
            this.data = data;
        } else {
            this.data = new Float32Array(X * Y);
        }
    }


    set(x: number, y: number, val: number) {
        const i =
            y +
            x * this.Y;
        this.data[i] = val;
    }

    get(x: number, y: number): any {
        const i =
            y +
            x * this.Y;
        return this.data[i];
    }

    getSubBlock(start: [number, number], size: [number, number]): ArrayMatrixUi32 {
        const subset = new ArrayMatrixUi32(size[0], size[1]);
        for (let x = 0; x < size[0]; x++) {
            for (let y = 0; y < size[1]; y++) {
                subset.set(x, y,
                    this.get(x + start[0], y + start[1]));
            }
        }
        return subset;
    }

}


export class ArrayCubeF32 {

    data: Float32Array;

    constructor(public X: number, public Y: number, public Z: number, data?: Float32Array) {
        if (data) {
            this.data = data;
        } else {
            this.data = new Float32Array(X * Y * Z);
        }
    }

    set(x: number, y: number, z: number, val: number) {
        const i =
            z +
            y * this.Z +
            x * this.Y * this.Z;
        this.data[i] = val;
    }

    get(x: number, y: number, z: number): any {
        const i =
            z +
            y * this.Z +
            x * this.Y * this.Z;
        return this.data[i];
    }

    getSubBlock(start: [number, number, number], size: [number, number, number]): ArrayCubeF32 {
        const subset = new ArrayCubeF32(size[0], size[1], size[2]);
        for (let x = 0; x < size[0]; x++) {
            for (let y = 0; y < size[1]; y++) {
                for (let z = 0; z < size[2]; z++) {
                    subset.set(x, y, z,
                        this.get(x + start[0], y + start[1], z + start[2]));
                }
            }
        }
        return subset;
    }
}
