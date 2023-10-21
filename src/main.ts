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
        x: { low: -100, high: 100 },
        y: { low: -100, high: 100 },
        z: { low: -100, high: 100 },
      },
      fn: (x, y) => ((x * x + y * y) / 50) + 1
    });
    renderer?.addActor(surface1);
    renderer?.addActor(surface1.newWire().actor);

    await renderer?.render();
  } catch (e) {
    console.error(e);
  }
})()
