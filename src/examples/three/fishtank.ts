import {
    AmbientLight, Color, DirectionalLight, DoubleSide, Mesh, MeshBasicMaterial,
    PerspectiveCamera, PlaneGeometry, Scene, WebGLRenderer, CylinderGeometry, MeshPhongMaterial, AxesHelper, BoxGeometry
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { createMarchingCubeBlockMeshes, getSubBlock } from '../../utils/marchingCubes';
import { perlin3D } from '../../utils/noise';
const Stats = require('stats.js');


const map = document.getElementById('map') as HTMLDivElement;
const container = document.getElementById('canvas') as HTMLCanvasElement;
const sliderA = document.getElementById('xrange') as HTMLInputElement;
const sliderB = document.getElementById('yrange') as HTMLInputElement;
const fpser = document.getElementById('fpser') as HTMLDivElement;
map.style.setProperty('display', 'none');
// container.style.setProperty('width', '800px');
// container.style.setProperty('height', '600px');


const scene = new Scene();
const renderer = new WebGLRenderer({
    canvas: container
});
// renderer.setSize(container.width, container.height);

const camera = new PerspectiveCamera(75, container.width / container.height, 0.1, 1000);
camera.position.z = 10;
camera.position.y = 4;


const light = new DirectionalLight('white');
light.position.x = -3;
light.position.y = 1;
light.position.z = 5;
scene.add(light);

const light2 = new AmbientLight('#c5f8f3', 0.5);
scene.add(light2);

const axesHelper = new AxesHelper(5);
scene.add(axesHelper);

const skyBox = new Mesh(
    new BoxGeometry(1000, 1000, 1000, 1, 1, 1),
    new MeshPhongMaterial({
        color: '#4400f2',
        side: DoubleSide
    })
);
scene.add(skyBox);


const controls = new OrbitControls(camera, container);
document.addEventListener('keydown', (event: KeyboardEvent) => {
    switch (event.keyCode) {
        case 37:
            camera.translateX(-1);
            break;
        case 38:
            camera.translateZ(-1);
            break;
        case 39:
            camera.translateX(1);
            break;
        case 40:
            camera.translateZ(1);
            break;
    }
});



var stats = new Stats();
stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
fpser.appendChild( stats.dom );
function animate() {
    stats.begin();
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
    stats.end();
}
animate();



function spaceFunction(x: number, y: number, z: number): number {
    return 100 * perlin3D(1 * x / X,  1 * y / Y,  1 * z / Z)
          + 50 * perlin3D(5 * x / X,  5 * y / Y,  5 * z / Z)
          + 10 * perlin3D(10 * x / X, 10 * y / Y, 10 * z / Z);
}

function colorFunc(val: number): [number, number, number] {
    const degree = val / 10;
    const r0 = 0 / 255;
    const r1 = 68 / 255;
    const g0 = 233 / 255;
    const g1 = 0 / 255;
    const b0 = 255 / 255;
    const b1 = 242 / 255;

    return [
        degree * r0 + (1 - degree) * r1,
        degree * g0 + (1 - degree) * g1,
        degree * b0 + (1 - degree) * b1,
    ];
}

const X = 100;
const Y = 60;
const Z = 100;
const allData: number[][][] = [];
for (let x = 0; x < X; x++) {
    allData.push([]);
    for (let y = 0; y < Y; y++) {
        allData[x].push([]);
        for (let z = 0; z < Z; z++) {
            if (x === 0 || y === 0 || z === 0 || x === X - 1 || y === Y - 1 || z === Z - 1) {
                allData[x][y].push(0);
            } else {
                allData[x][y][z] = spaceFunction(x, y, z);
            }
        }
    }
}

const threshold = 20;
const cubeSize = 0.5;
const blockSize: [number, number, number] = [8, Y, Z];


const meshes = createMarchingCubeBlockMeshes(allData, threshold, cubeSize, blockSize, colorFunc);
meshes.map(m => m.mesh.translateX(- cubeSize * X / 2));
meshes.map(m => m.mesh.translateY(- cubeSize * Y / 2));
meshes.map(m => m.mesh.translateZ(- cubeSize * Z / 2));
meshes.map(m => scene.add(m.mesh));



const planeGeom = new PlaneGeometry(Z, Y);
const planeMaterial = new MeshBasicMaterial({
    color: '#4400f2',
    side: DoubleSide, transparent: true,
    opacity: 0.5
});
const cutPlane = new Mesh(planeGeom, planeMaterial);
cutPlane.position.setX(- cubeSize * X / 2);
cutPlane.lookAt(-1, 0, 0);
scene.add(cutPlane);


sliderA.addEventListener('input', (ev: Event) => {
    const newX = X * (+(sliderA.value) + 100) / 200  - X / 2;
    cutPlane.position.setX(newX);

    for (const mesh of meshes) {
        const bbox = mesh.getBbox();
        if (bbox.xMin <= newX && newX <= bbox.xMax) {
            const startPointWC = mesh.mesh.position.toArray();
            const originalData = getSubBlock(allData, mesh.startPoint, mesh.blockSize);
            const newData: number[][][] = [];
            for (let x = 0; x < mesh.blockSize[0]; x++) {
                newData.push([]);
                for (let y = 0; y < mesh.blockSize[1]; y++) {
                    newData[x].push([]);
                    for (let z = 0; z < mesh.blockSize[2]; z++) {
                        const xVal = startPointWC[0] + x * cubeSize;
                        if (xVal < newX) {
                            newData[x][y][z] = 0;
                        } else {
                            newData[x][y][z] = originalData[x][y][z];
                        }
                    }
                }
            }
            mesh.updateData(newData);
        }
    }
});


sliderB.addEventListener('input', (ev: Event) => {
    const newThreshold = 50 * (+(sliderB.value) + 100) / 200;
    meshes.map(m => m.updateThreshold(newThreshold));
});