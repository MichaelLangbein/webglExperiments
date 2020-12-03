import {
    AmbientLight, Color, DirectionalLight, DoubleSide, Mesh, MeshBasicMaterial,
    PerspectiveCamera, PlaneGeometry, Scene, WebGLRenderer
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { createBlockMeshes, getSubBlock } from '../../utils/voxel';
const Stats = require('stats.js');

const map = document.getElementById('map') as HTMLDivElement;
const container = document.getElementById('canvas') as HTMLCanvasElement;
const slider = document.getElementById('xrange') as HTMLInputElement;
const fpser = document.getElementById('fpser') as HTMLDivElement;
map.style.setProperty('display', 'none');
container.style.setProperty('width', '800px');
container.style.setProperty('height', '600px');

const scene = new Scene();
const renderer = new WebGLRenderer({
    canvas: container
});

const camera = new PerspectiveCamera(75, container.width / container.height, 0.1, 1000);
camera.position.z = 10;
camera.position.y = 4;

const controls = new OrbitControls(camera, container);

const light = new DirectionalLight('white');
light.position.x = -3;
light.position.y = 1;
light.position.z = 5;
scene.add(light);

const light2 = new AmbientLight('yellow', 0.5);
scene.add(light2);

const planeGeom = new PlaneGeometry(80, 80);
const planeMaterial = new MeshBasicMaterial({ color: new Color('rgb(0, 100, 225)'), side: DoubleSide, transparent: true, opacity: 0.5 });
const cutPlane = new Mesh(planeGeom, planeMaterial);
cutPlane.position.setX(-20);
cutPlane.lookAt(-1, 0, 0);
scene.add(cutPlane);



const colorFunc = (val: number): [number, number, number] => {
    switch (val) {
        case 0:
            return [0.1, 0.1, 0.1];
        case 1:
            return [0.8, 0.0, 0.4];
        case 2:
            return [0.9, 0.1, 0];
        case 3:
            return [0.6, 0.2, 0.0];
        case 4:
            return [0.2, 0.8, 0.0];
        case 5:
            return [0.5, 1.0, 0.0];
        case 6:
            return [0.4, 0.4, 0.8];
        case 7:
            return [0.8, 0.8, 0.8];
        case 8:
            return [1, 1, 1];
        default:
            return [1, 1, 1];
    }
};

const X = 100;
const Y = 20;
const Z = 100;

const allData: number[][][] = [];
for (let x = 0; x < X; x++) {
    allData.push([]);
    for (let y = 0; y < Y; y++) {
        allData[x].push([]);
        for (let z = 0; z < Z; z++) {
            if (x === 0 || y === 0 || z === 0 || x === X - 1 || y === Y - 1 || z === Z - 1) {
                allData[x][y].push(0);
            }
            else if (y < 10 * Math.sin(x * 0.1) * Math.cos(z * 0.1) + 5) {
                allData[x][y].push(Math.floor((10 * y / Y) + (z/20)));
            } else {
                allData[x][y].push(0);
            }
        }
    }
}

const cubeSize = 1;
const blockSize: [number, number, number] = [10, 10, 10];
const translation: [number, number, number] = [-15, 0, -25];

const voxelBlocks = createBlockMeshes(allData, cubeSize, blockSize, colorFunc);
voxelBlocks.map(vb => vb.translate(translation));
voxelBlocks.map(vb => scene.add(vb.mesh));

slider.addEventListener('input', (ev: Event) => {
    const val = -50 + 100 * (+slider.value) / 100;

    cutPlane.position.setX(val);

    for (const vb of voxelBlocks) {
        const bbox = vb.getBbox();
        if (bbox.xMin <= val && val <= bbox.xMax) {

            const startPointWC = vb.mesh.position.toArray();
            const startPoint = vb.startPoint;
            const blockSize = vb.blockSize;
            const oldData = getSubBlock(allData, startPoint, blockSize);
            const newData: number[][][] = [];
            for (let x = 0; x < blockSize[0]; x++) {
                newData.push([]);
                for (let y = 0; y < blockSize[1]; y++) {
                    newData[x].push([]);
                    for (let z = 0; z < blockSize[2]; z++) {
                        const xVal = startPointWC[0] + x * cubeSize;
                        if (xVal < val) {
                            newData[x][y][z] = 0;
                        } else {
                            newData[x][y][z] = oldData[x][y][z];
                        }
                    }
                }
            }

            vb.updateData(newData);
        }
    }


});

document.onkeydown = (event: KeyboardEvent) => {
    console.log(event.keyCode);
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
};


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