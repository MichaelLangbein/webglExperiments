
typedef struct Vertex {
    float x;
    float y;
    float z;
} Vertex;


typedef struct Triangle {
    Vertex a;
    Vertex b;
    Vertex c;
} Triangle;


int edgeNumberTable[256][16] = {
    {-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1},
    {0, 8, 3, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1},
    {0, 1, 9, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1},
    {1, 8, 3, 9, 8, 1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1},
    {1, 2, 10, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1},
    {0, 8, 3, 1, 2, 10, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1},
    {9, 2, 10, 0, 2, 9, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1},
    {2, 8, 3, 2, 10, 8, 10, 9, 8, -1, -1, -1, -1, -1, -1, -1},
    {3, 11, 2, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1},
    {0, 11, 2, 8, 11, 0, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1},
    {1, 9, 0, 2, 3, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1},
    {1, 11, 2, 1, 9, 11, 9, 8, 11, -1, -1, -1, -1, -1, -1, -1},
    {3, 10, 1, 11, 10, 3, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1},
    {0, 10, 1, 0, 8, 10, 8, 11, 10, -1, -1, -1, -1, -1, -1, -1},
    {3, 9, 0, 3, 11, 9, 11, 10, 9, -1, -1, -1, -1, -1, -1, -1},
    {9, 8, 10, 10, 8, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1},
    {4, 7, 8, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1},
    {4, 3, 0, 7, 3, 4, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1},
    {0, 1, 9, 8, 4, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1},
    {4, 1, 9, 4, 7, 1, 7, 3, 1, -1, -1, -1, -1, -1, -1, -1},
    {1, 2, 10, 8, 4, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1},
    {3, 4, 7, 3, 0, 4, 1, 2, 10, -1, -1, -1, -1, -1, -1, -1},
    {9, 2, 10, 9, 0, 2, 8, 4, 7, -1, -1, -1, -1, -1, -1, -1},
    {2, 10, 9, 2, 9, 7, 2, 7, 3, 7, 9, 4, -1, -1, -1, -1},
    {8, 4, 7, 3, 11, 2, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1},
    {11, 4, 7, 11, 2, 4, 2, 0, 4, -1, -1, -1, -1, -1, -1, -1},
    {9, 0, 1, 8, 4, 7, 2, 3, 11, -1, -1, -1, -1, -1, -1, -1},
    {4, 7, 11, 9, 4, 11, 9, 11, 2, 9, 2, 1, -1, -1, -1, -1},
    {3, 10, 1, 3, 11, 10, 7, 8, 4, -1, -1, -1, -1, -1, -1, -1},
    {1, 11, 10, 1, 4, 11, 1, 0, 4, 7, 11, 4, -1, -1, -1, -1},
    {4, 7, 8, 9, 0, 11, 9, 11, 10, 11, 0, 3, -1, -1, -1, -1},
    {4, 7, 11, 4, 11, 9, 9, 11, 10, -1, -1, -1, -1, -1, -1, -1},
    {9, 5, 4, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1},
    {9, 5, 4, 0, 8, 3, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1},
    {0, 5, 4, 1, 5, 0, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1},
    {8, 5, 4, 8, 3, 5, 3, 1, 5, -1, -1, -1, -1, -1, -1, -1},
    {1, 2, 10, 9, 5, 4, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1},
    {3, 0, 8, 1, 2, 10, 4, 9, 5, -1, -1, -1, -1, -1, -1, -1},
    {5, 2, 10, 5, 4, 2, 4, 0, 2, -1, -1, -1, -1, -1, -1, -1},
    {2, 10, 5, 3, 2, 5, 3, 5, 4, 3, 4, 8, -1, -1, -1, -1},
    {9, 5, 4, 2, 3, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1},
    {0, 11, 2, 0, 8, 11, 4, 9, 5, -1, -1, -1, -1, -1, -1, -1},
    {0, 5, 4, 0, 1, 5, 2, 3, 11, -1, -1, -1, -1, -1, -1, -1},
    {2, 1, 5, 2, 5, 8, 2, 8, 11, 4, 8, 5, -1, -1, -1, -1},
    {10, 3, 11, 10, 1, 3, 9, 5, 4, -1, -1, -1, -1, -1, -1, -1},
    {4, 9, 5, 0, 8, 1, 8, 10, 1, 8, 11, 10, -1, -1, -1, -1},
    {5, 4, 0, 5, 0, 11, 5, 11, 10, 11, 0, 3, -1, -1, -1, -1},
    {5, 4, 8, 5, 8, 10, 10, 8, 11, -1, -1, -1, -1, -1, -1, -1},
    {9, 7, 8, 5, 7, 9, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1},
    {9, 3, 0, 9, 5, 3, 5, 7, 3, -1, -1, -1, -1, -1, -1, -1},
    {0, 7, 8, 0, 1, 7, 1, 5, 7, -1, -1, -1, -1, -1, -1, -1},
    {1, 5, 3, 3, 5, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1},
    {9, 7, 8, 9, 5, 7, 10, 1, 2, -1, -1, -1, -1, -1, -1, -1},
    {10, 1, 2, 9, 5, 0, 5, 3, 0, 5, 7, 3, -1, -1, -1, -1},
    {8, 0, 2, 8, 2, 5, 8, 5, 7, 10, 5, 2, -1, -1, -1, -1},
    {2, 10, 5, 2, 5, 3, 3, 5, 7, -1, -1, -1, -1, -1, -1, -1},
    {7, 9, 5, 7, 8, 9, 3, 11, 2, -1, -1, -1, -1, -1, -1, -1},
    {9, 5, 7, 9, 7, 2, 9, 2, 0, 2, 7, 11, -1, -1, -1, -1},
    {2, 3, 11, 0, 1, 8, 1, 7, 8, 1, 5, 7, -1, -1, -1, -1},
    {11, 2, 1, 11, 1, 7, 7, 1, 5, -1, -1, -1, -1, -1, -1, -1},
    {9, 5, 8, 8, 5, 7, 10, 1, 3, 10, 3, 11, -1, -1, -1, -1},
    {5, 7, 0, 5, 0, 9, 7, 11, 0, 1, 0, 10, 11, 10, 0, -1},
    {11, 10, 0, 11, 0, 3, 10, 5, 0, 8, 0, 7, 5, 7, 0, -1},
    {11, 10, 5, 7, 11, 5, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1},
    {10, 6, 5, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1},
    {0, 8, 3, 5, 10, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1},
    {9, 0, 1, 5, 10, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1},
    {1, 8, 3, 1, 9, 8, 5, 10, 6, -1, -1, -1, -1, -1, -1, -1},
    {1, 6, 5, 2, 6, 1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1},
    {1, 6, 5, 1, 2, 6, 3, 0, 8, -1, -1, -1, -1, -1, -1, -1},
    {9, 6, 5, 9, 0, 6, 0, 2, 6, -1, -1, -1, -1, -1, -1, -1},
    {5, 9, 8, 5, 8, 2, 5, 2, 6, 3, 2, 8, -1, -1, -1, -1},
    {2, 3, 11, 10, 6, 5, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1},
    {11, 0, 8, 11, 2, 0, 10, 6, 5, -1, -1, -1, -1, -1, -1, -1},
    {0, 1, 9, 2, 3, 11, 5, 10, 6, -1, -1, -1, -1, -1, -1, -1},
    {5, 10, 6, 1, 9, 2, 9, 11, 2, 9, 8, 11, -1, -1, -1, -1},
    {6, 3, 11, 6, 5, 3, 5, 1, 3, -1, -1, -1, -1, -1, -1, -1},
    {0, 8, 11, 0, 11, 5, 0, 5, 1, 5, 11, 6, -1, -1, -1, -1},
    {3, 11, 6, 0, 3, 6, 0, 6, 5, 0, 5, 9, -1, -1, -1, -1},
    {6, 5, 9, 6, 9, 11, 11, 9, 8, -1, -1, -1, -1, -1, -1, -1},
    {5, 10, 6, 4, 7, 8, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1},
    {4, 3, 0, 4, 7, 3, 6, 5, 10, -1, -1, -1, -1, -1, -1, -1},
    {1, 9, 0, 5, 10, 6, 8, 4, 7, -1, -1, -1, -1, -1, -1, -1},
    {10, 6, 5, 1, 9, 7, 1, 7, 3, 7, 9, 4, -1, -1, -1, -1},
    {6, 1, 2, 6, 5, 1, 4, 7, 8, -1, -1, -1, -1, -1, -1, -1},
    {1, 2, 5, 5, 2, 6, 3, 0, 4, 3, 4, 7, -1, -1, -1, -1},
    {8, 4, 7, 9, 0, 5, 0, 6, 5, 0, 2, 6, -1, -1, -1, -1},
    {7, 3, 9, 7, 9, 4, 3, 2, 9, 5, 9, 6, 2, 6, 9, -1},
    {3, 11, 2, 7, 8, 4, 10, 6, 5, -1, -1, -1, -1, -1, -1, -1},
    {5, 10, 6, 4, 7, 2, 4, 2, 0, 2, 7, 11, -1, -1, -1, -1},
    {0, 1, 9, 4, 7, 8, 2, 3, 11, 5, 10, 6, -1, -1, -1, -1},
    {9, 2, 1, 9, 11, 2, 9, 4, 11, 7, 11, 4, 5, 10, 6, -1},
    {8, 4, 7, 3, 11, 5, 3, 5, 1, 5, 11, 6, -1, -1, -1, -1},
    {5, 1, 11, 5, 11, 6, 1, 0, 11, 7, 11, 4, 0, 4, 11, -1},
    {0, 5, 9, 0, 6, 5, 0, 3, 6, 11, 6, 3, 8, 4, 7, -1},
    {6, 5, 9, 6, 9, 11, 4, 7, 9, 7, 11, 9, -1, -1, -1, -1},
    {10, 4, 9, 6, 4, 10, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1},
    {4, 10, 6, 4, 9, 10, 0, 8, 3, -1, -1, -1, -1, -1, -1, -1},
    {10, 0, 1, 10, 6, 0, 6, 4, 0, -1, -1, -1, -1, -1, -1, -1},
    {8, 3, 1, 8, 1, 6, 8, 6, 4, 6, 1, 10, -1, -1, -1, -1},
    {1, 4, 9, 1, 2, 4, 2, 6, 4, -1, -1, -1, -1, -1, -1, -1},
    {3, 0, 8, 1, 2, 9, 2, 4, 9, 2, 6, 4, -1, -1, -1, -1},
    {0, 2, 4, 4, 2, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1},
    {8, 3, 2, 8, 2, 4, 4, 2, 6, -1, -1, -1, -1, -1, -1, -1},
    {10, 4, 9, 10, 6, 4, 11, 2, 3, -1, -1, -1, -1, -1, -1, -1},
    {0, 8, 2, 2, 8, 11, 4, 9, 10, 4, 10, 6, -1, -1, -1, -1},
    {3, 11, 2, 0, 1, 6, 0, 6, 4, 6, 1, 10, -1, -1, -1, -1},
    {6, 4, 1, 6, 1, 10, 4, 8, 1, 2, 1, 11, 8, 11, 1, -1},
    {9, 6, 4, 9, 3, 6, 9, 1, 3, 11, 6, 3, -1, -1, -1, -1},
    {8, 11, 1, 8, 1, 0, 11, 6, 1, 9, 1, 4, 6, 4, 1, -1},
    {3, 11, 6, 3, 6, 0, 0, 6, 4, -1, -1, -1, -1, -1, -1, -1},
    {6, 4, 8, 11, 6, 8, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1},
    {7, 10, 6, 7, 8, 10, 8, 9, 10, -1, -1, -1, -1, -1, -1, -1},
    {0, 7, 3, 0, 10, 7, 0, 9, 10, 6, 7, 10, -1, -1, -1, -1},
    {10, 6, 7, 1, 10, 7, 1, 7, 8, 1, 8, 0, -1, -1, -1, -1},
    {10, 6, 7, 10, 7, 1, 1, 7, 3, -1, -1, -1, -1, -1, -1, -1},
    {1, 2, 6, 1, 6, 8, 1, 8, 9, 8, 6, 7, -1, -1, -1, -1},
    {2, 6, 9, 2, 9, 1, 6, 7, 9, 0, 9, 3, 7, 3, 9, -1},
    {7, 8, 0, 7, 0, 6, 6, 0, 2, -1, -1, -1, -1, -1, -1, -1},
    {7, 3, 2, 6, 7, 2, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1},
    {2, 3, 11, 10, 6, 8, 10, 8, 9, 8, 6, 7, -1, -1, -1, -1},
    {2, 0, 7, 2, 7, 11, 0, 9, 7, 6, 7, 10, 9, 10, 7, -1},
    {1, 8, 0, 1, 7, 8, 1, 10, 7, 6, 7, 10, 2, 3, 11, -1},
    {11, 2, 1, 11, 1, 7, 10, 6, 1, 6, 7, 1, -1, -1, -1, -1},
    {8, 9, 6, 8, 6, 7, 9, 1, 6, 11, 6, 3, 1, 3, 6, -1},
    {0, 9, 1, 11, 6, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1},
    {7, 8, 0, 7, 0, 6, 3, 11, 0, 11, 6, 0, -1, -1, -1, -1},
    {7, 11, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1},
    {7, 6, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1},
    {3, 0, 8, 11, 7, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1},
    {0, 1, 9, 11, 7, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1},
    {8, 1, 9, 8, 3, 1, 11, 7, 6, -1, -1, -1, -1, -1, -1, -1},
    {10, 1, 2, 6, 11, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1},
    {1, 2, 10, 3, 0, 8, 6, 11, 7, -1, -1, -1, -1, -1, -1, -1},
    {2, 9, 0, 2, 10, 9, 6, 11, 7, -1, -1, -1, -1, -1, -1, -1},
    {6, 11, 7, 2, 10, 3, 10, 8, 3, 10, 9, 8, -1, -1, -1, -1},
    {7, 2, 3, 6, 2, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1},
    {7, 0, 8, 7, 6, 0, 6, 2, 0, -1, -1, -1, -1, -1, -1, -1},
    {2, 7, 6, 2, 3, 7, 0, 1, 9, -1, -1, -1, -1, -1, -1, -1},
    {1, 6, 2, 1, 8, 6, 1, 9, 8, 8, 7, 6, -1, -1, -1, -1},
    {10, 7, 6, 10, 1, 7, 1, 3, 7, -1, -1, -1, -1, -1, -1, -1},
    {10, 7, 6, 1, 7, 10, 1, 8, 7, 1, 0, 8, -1, -1, -1, -1},
    {0, 3, 7, 0, 7, 10, 0, 10, 9, 6, 10, 7, -1, -1, -1, -1},
    {7, 6, 10, 7, 10, 8, 8, 10, 9, -1, -1, -1, -1, -1, -1, -1},
    {6, 8, 4, 11, 8, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1},
    {3, 6, 11, 3, 0, 6, 0, 4, 6, -1, -1, -1, -1, -1, -1, -1},
    {8, 6, 11, 8, 4, 6, 9, 0, 1, -1, -1, -1, -1, -1, -1, -1},
    {9, 4, 6, 9, 6, 3, 9, 3, 1, 11, 3, 6, -1, -1, -1, -1},
    {6, 8, 4, 6, 11, 8, 2, 10, 1, -1, -1, -1, -1, -1, -1, -1},
    {1, 2, 10, 3, 0, 11, 0, 6, 11, 0, 4, 6, -1, -1, -1, -1},
    {4, 11, 8, 4, 6, 11, 0, 2, 9, 2, 10, 9, -1, -1, -1, -1},
    {10, 9, 3, 10, 3, 2, 9, 4, 3, 11, 3, 6, 4, 6, 3, -1},
    {8, 2, 3, 8, 4, 2, 4, 6, 2, -1, -1, -1, -1, -1, -1, -1},
    {0, 4, 2, 4, 6, 2, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1},
    {1, 9, 0, 2, 3, 4, 2, 4, 6, 4, 3, 8, -1, -1, -1, -1},
    {1, 9, 4, 1, 4, 2, 2, 4, 6, -1, -1, -1, -1, -1, -1, -1},
    {8, 1, 3, 8, 6, 1, 8, 4, 6, 6, 10, 1, -1, -1, -1, -1},
    {10, 1, 0, 10, 0, 6, 6, 0, 4, -1, -1, -1, -1, -1, -1, -1},
    {4, 6, 3, 4, 3, 8, 6, 10, 3, 0, 3, 9, 10, 9, 3, -1},
    {10, 9, 4, 6, 10, 4, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1},
    {4, 9, 5, 7, 6, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1},
    {0, 8, 3, 4, 9, 5, 11, 7, 6, -1, -1, -1, -1, -1, -1, -1},
    {5, 0, 1, 5, 4, 0, 7, 6, 11, -1, -1, -1, -1, -1, -1, -1},
    {11, 7, 6, 8, 3, 4, 3, 5, 4, 3, 1, 5, -1, -1, -1, -1},
    {9, 5, 4, 10, 1, 2, 7, 6, 11, -1, -1, -1, -1, -1, -1, -1},
    {6, 11, 7, 1, 2, 10, 0, 8, 3, 4, 9, 5, -1, -1, -1, -1},
    {7, 6, 11, 5, 4, 10, 4, 2, 10, 4, 0, 2, -1, -1, -1, -1},
    {3, 4, 8, 3, 5, 4, 3, 2, 5, 10, 5, 2, 11, 7, 6, -1},
    {7, 2, 3, 7, 6, 2, 5, 4, 9, -1, -1, -1, -1, -1, -1, -1},
    {9, 5, 4, 0, 8, 6, 0, 6, 2, 6, 8, 7, -1, -1, -1, -1},
    {3, 6, 2, 3, 7, 6, 1, 5, 0, 5, 4, 0, -1, -1, -1, -1},
    {6, 2, 8, 6, 8, 7, 2, 1, 8, 4, 8, 5, 1, 5, 8, -1},
    {9, 5, 4, 10, 1, 6, 1, 7, 6, 1, 3, 7, -1, -1, -1, -1},
    {1, 6, 10, 1, 7, 6, 1, 0, 7, 8, 7, 0, 9, 5, 4, -1},
    {4, 0, 10, 4, 10, 5, 0, 3, 10, 6, 10, 7, 3, 7, 10, -1},
    {7, 6, 10, 7, 10, 8, 5, 4, 10, 4, 8, 10, -1, -1, -1, -1},
    {6, 9, 5, 6, 11, 9, 11, 8, 9, -1, -1, -1, -1, -1, -1, -1},
    {3, 6, 11, 0, 6, 3, 0, 5, 6, 0, 9, 5, -1, -1, -1, -1},
    {0, 11, 8, 0, 5, 11, 0, 1, 5, 5, 6, 11, -1, -1, -1, -1},
    {6, 11, 3, 6, 3, 5, 5, 3, 1, -1, -1, -1, -1, -1, -1, -1},
    {1, 2, 10, 9, 5, 11, 9, 11, 8, 11, 5, 6, -1, -1, -1, -1},
    {0, 11, 3, 0, 6, 11, 0, 9, 6, 5, 6, 9, 1, 2, 10, -1},
    {11, 8, 5, 11, 5, 6, 8, 0, 5, 10, 5, 2, 0, 2, 5, -1},
    {6, 11, 3, 6, 3, 5, 2, 10, 3, 10, 5, 3, -1, -1, -1, -1},
    {5, 8, 9, 5, 2, 8, 5, 6, 2, 3, 8, 2, -1, -1, -1, -1},
    {9, 5, 6, 9, 6, 0, 0, 6, 2, -1, -1, -1, -1, -1, -1, -1},
    {1, 5, 8, 1, 8, 0, 5, 6, 8, 3, 8, 2, 6, 2, 8, -1},
    {1, 5, 6, 2, 1, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1},
    {1, 3, 6, 1, 6, 10, 3, 8, 6, 5, 6, 9, 8, 9, 6, -1},
    {10, 1, 0, 10, 0, 6, 9, 5, 0, 5, 6, 0, -1, -1, -1, -1},
    {0, 3, 8, 5, 6, 10, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1},
    {10, 5, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1},
    {11, 5, 10, 7, 5, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1},
    {11, 5, 10, 11, 7, 5, 8, 3, 0, -1, -1, -1, -1, -1, -1, -1},
    {5, 11, 7, 5, 10, 11, 1, 9, 0, -1, -1, -1, -1, -1, -1, -1},
    {10, 7, 5, 10, 11, 7, 9, 8, 1, 8, 3, 1, -1, -1, -1, -1},
    {11, 1, 2, 11, 7, 1, 7, 5, 1, -1, -1, -1, -1, -1, -1, -1},
    {0, 8, 3, 1, 2, 7, 1, 7, 5, 7, 2, 11, -1, -1, -1, -1},
    {9, 7, 5, 9, 2, 7, 9, 0, 2, 2, 11, 7, -1, -1, -1, -1},
    {7, 5, 2, 7, 2, 11, 5, 9, 2, 3, 2, 8, 9, 8, 2, -1},
    {2, 5, 10, 2, 3, 5, 3, 7, 5, -1, -1, -1, -1, -1, -1, -1},
    {8, 2, 0, 8, 5, 2, 8, 7, 5, 10, 2, 5, -1, -1, -1, -1},
    {9, 0, 1, 5, 10, 3, 5, 3, 7, 3, 10, 2, -1, -1, -1, -1},
    {9, 8, 2, 9, 2, 1, 8, 7, 2, 10, 2, 5, 7, 5, 2, -1},
    {1, 3, 5, 3, 7, 5, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1},
    {0, 8, 7, 0, 7, 1, 1, 7, 5, -1, -1, -1, -1, -1, -1, -1},
    {9, 0, 3, 9, 3, 5, 5, 3, 7, -1, -1, -1, -1, -1, -1, -1},
    {9, 8, 7, 5, 9, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1},
    {5, 8, 4, 5, 10, 8, 10, 11, 8, -1, -1, -1, -1, -1, -1, -1},
    {5, 0, 4, 5, 11, 0, 5, 10, 11, 11, 3, 0, -1, -1, -1, -1},
    {0, 1, 9, 8, 4, 10, 8, 10, 11, 10, 4, 5, -1, -1, -1, -1},
    {10, 11, 4, 10, 4, 5, 11, 3, 4, 9, 4, 1, 3, 1, 4, -1},
    {2, 5, 1, 2, 8, 5, 2, 11, 8, 4, 5, 8, -1, -1, -1, -1},
    {0, 4, 11, 0, 11, 3, 4, 5, 11, 2, 11, 1, 5, 1, 11, -1},
    {0, 2, 5, 0, 5, 9, 2, 11, 5, 4, 5, 8, 11, 8, 5, -1},
    {9, 4, 5, 2, 11, 3, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1},
    {2, 5, 10, 3, 5, 2, 3, 4, 5, 3, 8, 4, -1, -1, -1, -1},
    {5, 10, 2, 5, 2, 4, 4, 2, 0, -1, -1, -1, -1, -1, -1, -1},
    {3, 10, 2, 3, 5, 10, 3, 8, 5, 4, 5, 8, 0, 1, 9, -1},
    {5, 10, 2, 5, 2, 4, 1, 9, 2, 9, 4, 2, -1, -1, -1, -1},
    {8, 4, 5, 8, 5, 3, 3, 5, 1, -1, -1, -1, -1, -1, -1, -1},
    {0, 4, 5, 1, 0, 5, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1},
    {8, 4, 5, 8, 5, 3, 9, 0, 5, 0, 3, 5, -1, -1, -1, -1},
    {9, 4, 5, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1},
    {4, 11, 7, 4, 9, 11, 9, 10, 11, -1, -1, -1, -1, -1, -1, -1},
    {0, 8, 3, 4, 9, 7, 9, 11, 7, 9, 10, 11, -1, -1, -1, -1},
    {1, 10, 11, 1, 11, 4, 1, 4, 0, 7, 4, 11, -1, -1, -1, -1},
    {3, 1, 4, 3, 4, 8, 1, 10, 4, 7, 4, 11, 10, 11, 4, -1},
    {4, 11, 7, 9, 11, 4, 9, 2, 11, 9, 1, 2, -1, -1, -1, -1},
    {9, 7, 4, 9, 11, 7, 9, 1, 11, 2, 11, 1, 0, 8, 3, -1},
    {11, 7, 4, 11, 4, 2, 2, 4, 0, -1, -1, -1, -1, -1, -1, -1},
    {11, 7, 4, 11, 4, 2, 8, 3, 4, 3, 2, 4, -1, -1, -1, -1},
    {2, 9, 10, 2, 7, 9, 2, 3, 7, 7, 4, 9, -1, -1, -1, -1},
    {9, 10, 7, 9, 7, 4, 10, 2, 7, 8, 7, 0, 2, 0, 7, -1},
    {3, 7, 10, 3, 10, 2, 7, 4, 10, 1, 10, 0, 4, 0, 10, -1},
    {1, 10, 2, 8, 7, 4, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1},
    {4, 9, 1, 4, 1, 7, 7, 1, 3, -1, -1, -1, -1, -1, -1, -1},
    {4, 9, 1, 4, 1, 7, 0, 8, 1, 8, 7, 1, -1, -1, -1, -1},
    {4, 0, 3, 7, 4, 3, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1},
    {4, 8, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1},
    {9, 10, 8, 10, 11, 8, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1},
    {3, 0, 9, 3, 9, 11, 11, 9, 10, -1, -1, -1, -1, -1, -1, -1},
    {0, 1, 10, 0, 10, 8, 8, 10, 11, -1, -1, -1, -1, -1, -1, -1},
    {3, 1, 10, 11, 3, 10, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1},
    {1, 2, 11, 1, 11, 9, 9, 11, 8, -1, -1, -1, -1, -1, -1, -1},
    {3, 0, 9, 3, 9, 11, 1, 2, 9, 2, 11, 9, -1, -1, -1, -1},
    {0, 2, 11, 8, 0, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1},
    {3, 2, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1},
    {2, 3, 8, 2, 8, 10, 10, 8, 9, -1, -1, -1, -1, -1, -1, -1},
    {9, 10, 2, 0, 9, 2, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1},
    {2, 3, 8, 2, 8, 10, 0, 1, 8, 1, 10, 8, -1, -1, -1, -1},
    {1, 10, 2, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1},
    {1, 3, 8, 9, 1, 8, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1},
    {0, 9, 1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1},
    {0, 3, 8, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1},
    {-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1}
};


Vertex edgeCoords[12] = {
    {0.5, 0.0, 0.0},
    {1.0, 0.0, 0.5},
    {0.5, 0.0, 1.0},
    {0.0, 0.0, 0.5},
    {0.5, 1.0, 0.0},
    {1.0, 1.0, 0.5},
    {0.5, 1.0, 1.0},
    {0.0, 1.0, 0.5},
    {0.0, 0.5, 0.0},
    {1.0, 0.5, 0.0},
    {1.0, 0.5, 1.0},
    {0.0, 0.5, 1.0}
};


int getEdgeTableIndex(float* data, float threshold) {
    int index = 0;
    if (data[0] < threshold) index += 1;
    if (data[1] < threshold) index += 2;
    if (data[2] < threshold) index += 4;
    if (data[3] < threshold) index += 8;
    if (data[4] < threshold) index += 16;
    if (data[5] < threshold) index += 32;
    if (data[6] < threshold) index += 64;
    if (data[7] < threshold) index += 128;
    return index;
}


int* getEdgeList(int index) {
    return edgeNumberTable[index];
}


Vertex* getVertex(int index) {
    return &(edgeCoords[index]);
}


int getVertices(int* edgeList, Vertex* vertices) {
    int vertexListLength = 0;
    for (int e = 0; e < 16; e++) {
        int index = edgeList[e];
        if (index > -1) {
            Vertex* v = getVertex(index);
            // Assigning structs is the same as memcopy - so no need to worry about mutating these vertices vs. the edgeCoords.
            vertices[vertexListLength] = *v;
            vertexListLength += 1;
        }
    }
    return vertexListLength;
}


void moveVertices(Vertex* vertices, int nrVertices, float deltaX, float deltaY, float deltaZ) {
    for (int i = 0; i < nrVertices; i++) {
        vertices[i].x += deltaX;
        vertices[i].y += deltaY;
        vertices[i].z += deltaZ;
    }
}


void scaleVertices(Vertex* vertices, int nrVertices, float scaleX, float scaleY, float scaleZ) {
    for (int i = 0; i < nrVertices; i++) {
        vertices[i].x *= scaleX;
        vertices[i].y *= scaleY;
        vertices[i].z *= scaleZ;
    }
}


int cubeIndex(int Y, int Z, int x, int y, int z) {
    return         z 
             + y * Z 
         + x * Y * Z;
}


void fillSubCube(float* data, float* cubeData, int Y, int Z, int x, int y, int z) {
    cubeData[0] = data[cubeIndex(Y, Z, x    , y    , z    )];
    cubeData[1] = data[cubeIndex(Y, Z, x + 1, y    , z    )];
    cubeData[2] = data[cubeIndex(Y, Z, x + 1, y    , z + 1)];
    cubeData[3] = data[cubeIndex(Y, Z, x    , y    , z + 1)];
    cubeData[4] = data[cubeIndex(Y, Z, x    , y + 1, z    )];
    cubeData[5] = data[cubeIndex(Y, Z, x + 1, y + 1, z    )];
    cubeData[6] = data[cubeIndex(Y, Z, x + 1, y + 1, z + 1)];
    cubeData[7] = data[cubeIndex(Y, Z, x    , y + 1, z + 1)];
}


int getMaxNrVertices(int X, int Y, int Z) {
    return (X - 1) * (Y - 1) * (Z - 1) * 16;
}


int marchCubes(Vertex* vertices, float* data, int X, int Y, int Z, 
                float threshold, 
                float cubeWidth, float cubeHeight, float cubeDepth,
                float x0, float y0, float z0) {
    int nrVertices = 0; // We'll only make use of `nrVertices` slots.
    
    for (int x = 0; x < X-1; x++) {
        for (int y = 0; y < Y-1; y++) {
            for (int z = 0; z < Z-1; z++) {
                float cubeData[8];
                fillSubCube(data, cubeData, Y, Z, x, y, z);

                int edgeTableIndex = getEdgeTableIndex(cubeData, threshold);
                int* edgeList = getEdgeList(edgeTableIndex);

                Vertex cubeVertices[16];
                int cubeNrVertices = getVertices(edgeList, cubeVertices);
                scaleVertices(cubeVertices, cubeNrVertices, cubeWidth, cubeHeight, cubeDepth);
                moveVertices(cubeVertices, cubeNrVertices, 
                        x0 + (float)x * cubeWidth,
                        y0 + (float)y * cubeHeight,
                        z0 + (float)z * cubeDepth);

                for (int i = 0; i < cubeNrVertices; i++) {
                    vertices[nrVertices + i] = cubeVertices[i];
                }
                
                nrVertices += cubeNrVertices;
            }
        }
    }

    return nrVertices;
}


Vertex vertexMin(Vertex v1, Vertex v2) {
    Vertex v = {v2.x - v1.x, v2.y - v1.y, v2.z - v1.z};
    return v;
}


Vertex crossProd(Vertex v1, Vertex v2) {
    Vertex v = {
        v1.y * v2.z - v1.z * v2.y,
        v1.z * v2.x - v1.x * v2.z,
        v1.x * v2.y - v1.y * v2.x
    };
    return v;
}



// float sqrt(float val) {
//     float sqrt = val / 2;
//     float temp = 0;
//     while (sqrt != temp) {
//         temp = sqrt;
//         sqrt = (val / temp + temp) / 2;
//     }
//     return sqrt;
// }


// Vertex normalize(Vertex vec) {
//     float l = sqrt(vec.x * vec.x + vec.y * vec.y + vec.z * vec.z);
//     Vertex out = {
//         vec.x / l,
//         vec.y / l,
//         vec.z / l
//     };
//     return out;
// }


int getNormals(Vertex* vertices, int nrVertices, Vertex* normals) {
    for (int i = 0; i < nrVertices; i+= 3) {
        Vertex v0 = vertices[i];
        Vertex v1 = vertices[i + 1];
        Vertex v2 = vertices[i + 2];

        Vertex vec1 = vertexMin(v1, v0);
        Vertex vec2 = vertexMin(v2, v0);
        Vertex normal = crossProd(vec1, vec2);
        // normal = normalize(normal);
        
        normals[i] = normal;
        normals[i + 1] = normal;
        normals[i + 2] = normal;
    }
    return 0;
}


typedef struct Neighbors {
    float top;
    float bottom;
    float left;
    float right;
    float front;
    float back;
} Neighbors;



float max(float v1, float v2) {
    if (v1 > v2) {
        return v1;
    } else {
        return v2;
    }
}

float min(float v1, float v2) {
    if (v1 > v2) {
        return v2;
    } else {
        return v1;
    }
}


Neighbors getNearestDataPoints(
        Vertex v, float* data, int X, int Y, int Z,
        float sizeX, float sizeY, float sizeZ, float x0, float y0, float z0) {

    int xTop = min(max((v.x       - x0) / sizeX, 0), X - 1);
    int yTop = min(max((v.y + 1.0 - y0) / sizeY, 0), Y - 1);
    int zTop = min(max((v.z       - z0) / sizeZ, 0), Z - 1);
    int iTop = cubeIndex(Y, Z, xTop, yTop, zTop);

    int xBot = min(max((v.x       - x0) / sizeX, 0), X - 1);
    int yBot = min(max((v.y - 1.0 - y0) / sizeY, 0), Y - 1);
    int zBot = min(max((v.z       - z0) / sizeZ, 0), Z - 1);
    int iBot = cubeIndex(Y, Z, xBot, yBot, zBot);

    int xLft = min(max((v.x - 1.0 - x0) / sizeX, 0), X - 1);
    int yLft = min(max((v.y       - y0) / sizeY, 0), Y - 1);
    int zLft = min(max((v.z       - z0) / sizeZ, 0), Z - 1);
    int iLft = cubeIndex(Y, Z, xLft, yLft, zLft);


    int xRgt = min(max((v.x + 1.0 - x0) / sizeX, 0), X - 1);
    int yRgt = min(max((v.y       - y0) / sizeY, 0), Y - 1);
    int zRgt = min(max((v.z       - z0) / sizeZ, 0), Z - 1);
    int iRgt = cubeIndex(Y, Z, xRgt, yRgt, zRgt);

    int xFrt = min(max((v.x       - x0) / sizeX, 0), X - 1);
    int yFrt = min(max((v.y       - y0) / sizeY, 0), Y - 1);
    int zFrt = min(max((v.z + 1.0 - z0) / sizeZ, 0), Z - 1);
    int iFrt = cubeIndex(Y, Z, xFrt, yFrt, zFrt);

    int xBck = min(max((v.x       - x0) / sizeX, 0), X - 1);
    int yBck = min(max((v.y       - y0) / sizeY, 0), Y - 1);
    int zBck = min(max((v.z - 1.0 - z0) / sizeZ, 0), Z - 1);
    int iBck = cubeIndex(Y, Z, xBck, yBck, zBck);

    Neighbors n = {
        data[iTop],
        data[iBot],
        data[iLft],
        data[iRgt],
        data[iFrt],
        data[iBck]
    };
    return n;
}


float getMeanValInDirection(float* data, int X, int Y, int Z, float sizeX, float sizeY, float sizeZ, float x0, float y0, float z0, Vertex vertex, Vertex normal) {
    Neighbors ns = getNearestDataPoints(vertex, data, X, Y, Z, sizeX, sizeY, sizeZ, x0, y0, z0);
    float sum = 0;
    float i = 0;
    if (normal.x < 0) {
        sum += ns.left;
        i += 1;
    } 
    if (normal.x > 0) {
        sum += ns.right;
        i += 1;
    }
    if (normal.y < 0) {
        sum += ns.top;
        i += 1;
    } 
    if (normal.y > 0) {
        sum += ns.bottom;
        i += 1;
    }
    if (normal.z < 0) {
        sum += ns.front;
        i += 1;
    } 
    if (normal.z > 0) {
        sum += ns.back;
        i += 1;
    }
    return sum / i;
}


int mapColors(float* data, int X, int Y, int Z,
            Vertex* vertices, int nrVertices, float sizeX, float sizeY, float sizeZ, float x0, float y0, float z0,
            Vertex* normals, 
            Vertex* colors, float minVal, float maxVal) {
    for (int i = 0; i < nrVertices; i++) {
        Vertex v = vertices[i];
        Vertex n = normals[i];
        float val = getMeanValInDirection(data, X, Y, Z, sizeX, sizeY, sizeZ, x0, y0, z0, v, n);
        float percentage = (val - minVal) / (maxVal - minVal);
        float r = percentage;
        float g = (1.0 - percentage);
        float b = 0.0;
        Vertex color = {r, g, b};
        colors[i] = color;
    }
    return 0;
}


// The following code is only compiled and executed when the target is not wasm.
#ifdef __unix__
#include <stdio.h>


void testEdgeTableIndex(float* data, float threshold) {
    int edgeTableIndex = getEdgeTableIndex(data, threshold);
    printf("EdgeTableIndex: %i\n", edgeTableIndex);
}


void testEdgeList(int edgeTableIndex) {
    int* edgeList = getEdgeList(edgeTableIndex);
    printf("Edge numbers: [%i, %i, %i, %i, %i, %i, %i, %i, %i, %i, %i, %i, %i, %i, %i, %i]\n",
    edgeList[0], edgeList[1], edgeList[2], edgeList[3], edgeList[4], edgeList[5], edgeList[6], edgeList[7],
    edgeList[8], edgeList[9], edgeList[10], edgeList[11], edgeList[12], edgeList[13], edgeList[14], edgeList[15]);
}


void testGetVertices() {
    int edgeList[16] = {11, 7, 4, 11, 4, 2, 8, 3, 4, 3, 2, 4, -1, -1, -1, -1};
    Vertex vertices[16];  // allocates space on stack for 16 vertices - but we'll only fill up `nrVertices` of them.
    int nrVertices = getVertices(edgeList, vertices);
    for (int i = 0; i < nrVertices; i++) {
        Vertex v = vertices[i];
        printf("Vertex %i [%f, %f, %f]\n", i, v.x, v.y, v.z);
    }
}


void testMoveVertices() {
    Vertex vertices[3] = {
        {1, 1, 1},
        {1, 1, 1},
        {1, 1, 1},
    };
    moveVertices(vertices, 3, 2, 1, 4);
    for (int i = 0; i < 3; i++) {
        printf("[%f, %f, %f]\n", vertices[i].x, vertices[i].y, vertices[i].z);
    }
}


void testScaleVertices() {
    Vertex vertices[3] = {
        {1, 1, 1},
        {1, 1, 1},
        {1, 1, 1},
    };
    scaleVertices(vertices, 3, 0.5, 1, 4);
    for (int i = 0; i < 3; i++) {
        printf("[%f, %f, %f]\n", vertices[i].x, vertices[i].y, vertices[i].z);
    }
}


void testMarchCubes() {
    int X = 3;
    int Y = 3;
    int Z = 3;

    float cubeWidth = 1.5;  // x
    float cubeHeight = 1.5;  // y
    float cubeDepth = 1.5;  // z
    
    float data[3 * 3 * 3] = {
        0, 0, 0,
        1, 0, 0,
        1, 1, 0,
        0, 0, 0,
        1, 0, 0,
        1, 1, 0,
        1, 0, 0,
        1, 1, 0,
        1, 1, 1
    };
    
    float threshold = 0.5;
    int maxNrVertices = getMaxNrVertices(X, Y, Z);

    Vertex vertices[maxNrVertices]; // Allocates `maxNrVertices` slots on the stack - but we won't be using all of them.
    int nrVertices = marchCubes(vertices, data, X, Y, Z, threshold, cubeWidth, cubeHeight, cubeDepth, 0, 0, 0);
    printf("Max nr vertices: %i, nr vertices: %i\n", maxNrVertices, nrVertices);

    for (int i = 0; i < nrVertices; i++) {
        Vertex v = vertices[i];
        printf("Vertex %i: [%.2f, %.2f, %.2f]\n", i, v.x, v.y, v.z);
    }
}


void testGetNormals() {
    Vertex vertices[6] = {
        {0, 0, 0},
        {0, 0, 1},
        {1, 0, 0},
        {0, 0, 0},
        {1, 1, 1},
        {-1, 1, 1},
    };
    Vertex normals[6];
    int success = getNormals(vertices, 6, normals);
    printf("Error code: %i\n", success);
    for (int n = 0; n < 6; n++) {
        printf("normal [%f, %f, %f]\n", normals[n].x, normals[n].y, normals[n].z);
    }
}


void testGetNearestDataPoint() {

    float data[27] = {
        0, 0, 0,
        0, 0, 0,
        0, 0, 0,
        0, 0, 0,
        0, 1, 0,
        0, 0, 0,
        0, 0, 0,
        0, 0, 0,
        0, 0, 0,
    };
    int X = 3;
    int Y = 3;
    int Z = 3;
    float sizeX = 1;
    float sizeY = 1;
    float sizeZ = 1;
    float x0 = 0;
    float y0 = 0;
    float z0 = 0;

    Vertex v = {1, 1, 0.5};

    Neighbors ns = getNearestDataPoints(v, data, X, Y, Z, sizeX, sizeY, sizeZ, x0, y0, z0);
    printf("neighbors: [top %.2f, bot %.2f, lft %.2f, rgt %.2f, frt %.2f, bck %.2f] \n", ns.top, ns.bottom, ns.left, ns.right, ns.front, ns.back);
}

void testMapColors() {
    float data[27] = {
        0, 0, 0,
        0, 0, 0,
        0, 0, 0,
        0, 0, 0,
        0, 1, 0,
        0, 0, 0,
        0, 0, 0,
        0, 0, 0,
        0, 0, 0,
    };
    int X = 3;
    int Y = 3;
    int Z = 3;
    float threshold = 0.5;
    int maxNrVertices = getMaxNrVertices(X, Y, Z);

    Vertex vertices[maxNrVertices]; // Allocates `maxNrVertices` slots on the stack - but we won't be using all of them.
    int nrVertices = marchCubes(vertices, data, X, Y, Z, threshold, 1, 1, 1, 0, 0, 0);

    Vertex colors[nrVertices];
    mapColors(data, X, Y, Z, vertices, nrVertices, 1, 1, 1, 0, 0, 0, colors, 0, 1);

    for (int i = 0; i < nrVertices; i++) {
        printf("color %i: [%.2f, %.2f, %.2f]\n", i, colors[i].x, colors[i].y, colors[i].z);
    }
}


int main() {
    testMapColors();
    return 0;
}
#endif