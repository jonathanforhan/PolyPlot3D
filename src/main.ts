import './style.css'
import { WebGPURenderer } from './gfx/webgpu-renderer'
import defaultShader from "../shaders/default.wgsl?raw";
import { Mesh } from './gfx/mesh';

const canvas = document.querySelector<HTMLCanvasElement>("#canvas")!;
const context = canvas.getContext("webgpu") || canvas.getContext("webgl2");

function setup() {
  const pixelRatio = window.devicePixelRatio || 1;
  const resizeCanvas = () => {
    canvas.width = window.innerWidth * pixelRatio;
    canvas.height = window.innerHeight * pixelRatio;
  };
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();
}

(async function main() {
  setup();

  const bunny = await Mesh.import("/assets/bunny/bunny.obj");

  try {
    let renderer = context instanceof GPUCanvasContext
      ? new WebGPURenderer(canvas, context)
      : null;
    renderer?.setShader(defaultShader);
    renderer?.setMesh(bunny);
    await renderer?.draw();
  } catch (e) {
    console.error(e);
  }
})()
