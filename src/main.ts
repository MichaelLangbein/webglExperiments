import { Engine } from './engine';
const vertexShaderSource = require('./demo.vert').default;
const fragmentShaderSource = require('./demo.frag').default;

const canvasId = 'webGlCanvas';
const engine = new Engine(canvasId);

