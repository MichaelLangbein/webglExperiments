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


