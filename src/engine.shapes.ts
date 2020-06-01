
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
        [ width / 2,  height / 2, -depth / 2],
        [ width / 2, -height / 2, -depth / 2],
        [ width / 2, -height / 2, -depth / 2],

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
        [-width / 2,  height / 2, -depth / 2],
        [-width / 2, -height / 2, -depth / 2],
        [-width / 2, -height / 2, -depth / 2]
    ];
};