import './style.css'
import { WebGPURenderer } from './gfx/webgpu-renderer'
import { Bunny } from './gfx/actors/bunny';

const canvas = document.querySelector<HTMLCanvasElement>("#canvas")!;
const context = canvas.getContext("webgpu") || canvas.getContext("webgl2");

(async function main() {
  try {
    let renderer = context instanceof GPUCanvasContext
      ? await WebGPURenderer.new(canvas, context)
      : null;

    const bunny = await Bunny.new();
    renderer?.addActor(bunny);

    await renderer?.render();
  } catch (e) {
    console.error(e);
  }
})()
