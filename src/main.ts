import './style.css'
import { WebGPURenderer } from './render/webgpu-renderer'

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

  try {
    let renderer = context instanceof GPUCanvasContext
      ? new WebGPURenderer(canvas, context)
      : null;
    renderer?.initialize();
  } catch (e) {
    console.error(e);
  }
})()
