
export const triangle = (width: number, height: number): number[][] => {
    return [
        [-width / 2, -height / 2, 0],
        [         0,  height / 2, 0],
        [ width / 2, -height / 2, 0]
    ];
};


export const square = (width: number, height: number): number[][] => {
    return [
        [-width / 2,  height / 2, 0],
        [ width / 2,  height / 2, 0],
        [-width / 2, -height / 2, 0],
        [ width / 2,  height / 2, 0],
        [-width / 2, -height / 2, 0],
        [ width / 2, -height / 2, 0]
    ];
};

export const box = (width: number, height: number, depth: number): number[][] => {
    return [
        // face 1
        [-width / 2,  height / 2, depth / 2],
        [ width / 2,  height / 2, depth / 2],
        [-width / 2, -height / 2, depth / 2],
        [ width / 2,  height / 2, depth / 2],
        [-width / 2, -height / 2, depth / 2],
        [ width / 2, -height / 2, depth / 2],

        // face 2
        [-width / 2,  height / 2,  depth / 2],
        [ width / 2,  height / 2,  depth / 2],
        [ width / 2,  height / 2, -depth / 2],
        [-width / 2,  height / 2,  depth / 2],
        [ width / 2,  height / 2, -depth / 2],
        [-width / 2,  height / 2, -depth / 2],

        // face 3
        [ width / 2,  height / 2,  depth / 2],
        [ width / 2,  height / 2, -depth / 2],
        [ width / 2, -height / 2, -depth / 2],
        [ width / 2,  height / 2,  depth / 2],
        [ width / 2, -height / 2, -depth / 2],
        [ width / 2, -height / 2,  depth / 2],

        // face 4
        [-width / 2, -height / 2,  depth / 2],
        [ width / 2, -height / 2,  depth / 2],
        [ width / 2, -height / 2, -depth / 2],
        [-width / 2, -height / 2,  depth / 2],
        [ width / 2, -height / 2, -depth / 2],
        [-width / 2, -height / 2, -depth / 2],

        // face 5
        [-width / 2,  height / 2, -depth / 2],
        [ width / 2,  height / 2, -depth / 2],
        [-width / 2, -height / 2, -depth / 2],
        [ width / 2,  height / 2, -depth / 2],
        [-width / 2, -height / 2, -depth / 2],
        [ width / 2, -height / 2, -depth / 2],

        // face 6
        [-width / 2,  height / 2,  depth / 2],
        [-width / 2,  height / 2, -depth / 2],
        [-width / 2, -height / 2, -depth / 2],
        [-width / 2,  height / 2,  depth / 2],
        [-width / 2, -height / 2, -depth / 2],
        [-width / 2, -height / 2,  depth / 2]
    ];
};


export const edgeDetectKernel = (): number[][] => {
    return [
        [-1., -1., -1.],
        [-1.,  8., -1.],
        [-1., -1., -1.]
    ];
};

export const normalKernel = (): number[][] => {
    return [
        [0, 0, 0],
        [0, 1, 0],
        [0, 0, 0]
      ];
};

export const  gaussianKernel = (): number[][] => {
    return [
        [0.045, 0.122, 0.045],
        [0.122, 0.332, 0.122],
        [0.045, 0.122, 0.045]
  ];
};

export const unsharpenKernel = (): number[][] => {
    return [
        [-1, -1, -1],
        [-1,  9, -1],
        [-1, -1, -1]
  ];
};

export const embossKernel = (): number[][] => {
    return [
        [-2, -1,  0],
        [-1,  1,  1],
        [ 0,  1,  2]
  ];
};

export const flattenMatrix = (m: number[][]): number[] => {
    return [].concat.apply([], m);
};

export const sumMatrix = (m: number[][]): number => {
    let sum = 0.;
    for (const row of m) {
        for (const entry of row) {
            sum += entry;
        }
    }
    return sum;
}
