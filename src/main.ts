import './style.css'
import { WebGPURenderer } from './render/webgpu-renderer'

const canvas = document.querySelector<HTMLCanvasElement>("#canvas")!;
const context = canvas.getContext("webgpu") || canvas.getContext("webgl2");

function setup() {
  const resizeCanvas = () => [ canvas.width = window.innerWidth, canvas.height = window.innerHeight ];
  window.addEventListener('load', resizeCanvas);
  window.addEventListener('resize', resizeCanvas);
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
