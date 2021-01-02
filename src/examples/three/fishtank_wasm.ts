import {
    AmbientLight, DirectionalLight, DoubleSide, Mesh, MeshBasicMaterial,
    PerspectiveCamera, PlaneGeometry, Scene, WebGLRenderer, MeshPhongMaterial,
    AxesHelper, SphereGeometry, BoxGeometry
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { perlin3D } from '../../utils/noise';
import { ArrayCubeF32 } from '../../utils/arrayMatrix';
import { createMarchingCubeBlockMeshes, fetchWasm, MarchingCubeService } from '../../utils/marchingCubes/marchingCubes';
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
camera.name = 'camera';


const light = new DirectionalLight('white', 0.6);
light.position.x = -3;
light.position.y = 1;
light.position.z = 5;
light.name = 'light1';
scene.add(light);

const light2 = new AmbientLight('#c5f8f3', 0.2);
light2.name = 'light2';
scene.add(light2);

const axesHelper = new AxesHelper(5);
axesHelper.name = 'axesHelper';
scene.add(axesHelper);

const skyBox = new Mesh(
    new BoxGeometry(500, 500, 500, 3, 3, 3),
    new MeshPhongMaterial({
        color: '#daf8e3',
        side: DoubleSide
    })
);
skyBox.name = 'skybox';
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
stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
fpser.appendChild(stats.dom);
function animate() {
    stats.begin();
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
    stats.end();
}

fetchWasm().subscribe((svc: MarchingCubeService) => {


    function spaceFunction(x: number, y: number, z: number): number {
        return 100 * perlin3D(1 * x / X, 1 * y / Y, 1 * z / Z)
            + 50 * perlin3D(5 * x / X, 5 * y / Y, 5 * z / Z)
            + 10 * perlin3D(10 * x / X, 10 * y / Y, 10 * z / Z);
    }

    const X = 300;
    const Y = 100;
    const Z = 300;
    const allData = new ArrayCubeF32(X, Y, Z);
    for (let x = 0; x < X; x++) {
        for (let y = 0; y < Y; y++) {
            for (let z = 0; z < Z; z++) {
                if (x !== 0 && y !== 0 && z !== 0 && x !== X - 1 && y !== Y - 1 && z !== Z - 1) {
                    allData.set(x, y, z, spaceFunction(x, y, z));
                } else {
                    allData.set(x, y, z, 0);
                }
            }
        }
    }
    const threshold = 20;

    const cubeSize: [number, number, number] = [1, 1, 1];
    const blockSize: [number, number, number] = [100, 100, 100];


    const meshes = createMarchingCubeBlockMeshes(allData, threshold, cubeSize, blockSize, 0, 30, svc);
    meshes.map(m => m.mesh.translateX(- cubeSize[0] * X / 2));
    meshes.map(m => m.mesh.translateY(- cubeSize[1] * Y / 2));
    meshes.map(m => m.mesh.translateZ(- cubeSize[2] * Z / 2));
    meshes.map((m, i) => m.mesh.name = `mesh${i}`);
    meshes.map(m => scene.add(m.mesh));



    const planeGeom = new PlaneGeometry(Z, Y);
    const planeMaterial = new MeshBasicMaterial({
        color: '#4400f2',
        side: DoubleSide,
        transparent: true,
        opacity: 0.5
    });
    const cutPlane = new Mesh(planeGeom, planeMaterial);
    cutPlane.position.setX(- cubeSize * X / 2);
    cutPlane.lookAt(-1, 0, 0);
    cutPlane.name = 'cutPlane';
    scene.add(cutPlane);


    sliderA.addEventListener('input', (ev: Event) => {
        const newX = X * (+(sliderA.value) + 100) / 200 - X / 2;
        cutPlane.position.setX(newX);

        for (const mesh of meshes) {
            const bbox = mesh.getBbox();

            if (bbox.xMin <= newX && newX <= bbox.xMax) {
                const startPointWC = mesh.mesh.position.toArray();
                const originalData = allData.getSubBlock(mesh.startPoint, mesh.blockSize);
                const newData = new ArrayCubeF32(mesh.blockSize[0], mesh.blockSize[1], mesh.blockSize[2]);
                for (let x = 0; x < mesh.blockSize[0]; x++) {
                    for (let y = 0; y < mesh.blockSize[1]; y++) {
                        for (let z = 0; z < mesh.blockSize[2]; z++) {
                            const xVal = startPointWC[0] + x * cubeSize[0];
                            if (xVal < newX) {
                                newData.set(x, y, z, 0);
                            } else {
                                newData.set(x, y, z,
                                    originalData.get(x, y, z));
                            }
                        }
                    }
                }
                mesh.updateData(newData.data);
            }
        }
    });


    sliderB.addEventListener('input', (ev: Event) => {
        const newThreshold = 50 * (+(sliderB.value) + 100) / 200;
        meshes.map(m => m.updateThreshold(newThreshold));
    });
});


animate();
