import './style.css'
import { WebGPURenderer } from './gfx/webgpu-renderer'
import { Axis } from './gfx/actors/axis';
import { Surface } from './gfx/actors/surface';

const canvas = document.querySelector<HTMLCanvasElement>("#canvas")!;
const context = canvas.getContext("webgpu") || canvas.getContext("webgl2");

(async function main() {
  try {
    let renderer = context instanceof GPUCanvasContext
      ? await WebGPURenderer.new(canvas, context)
      : null;

    const axis = Axis.new();
    renderer?.addActor(axis);

    const surface1 = Surface.new({
      range: {
        low: -50,
        high: 50
      },
      fn: (x, y) => (7 * x * y) / (Math.pow(Math.E, (x * x + y * y)))
    });
    renderer?.addActor(surface1);
    renderer?.addActor(surface1.newWire().actor);

    await renderer?.render();
  } catch (e) {
    console.error(e);
  }
})()
