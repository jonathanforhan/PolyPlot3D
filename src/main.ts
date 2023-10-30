import './style.css'
import { WebGPURenderer } from './gfx/webgpu-renderer'
import { Axis } from './gfx/actors/axis';
import { Surface } from './gfx/actors/surface';
import "@cortex-js/compute-engine";
import { MathfieldElement } from "mathlive";

const mathFields = document.querySelectorAll<MathfieldElement>("math-field")!;
const eqCheckboxes = document.querySelectorAll<HTMLInputElement>("input")!;

mathFields[0].setValue(`$$ \\frac{\\left(x^2-y^2\\right)}{10} $$`);
mathFields[1].setValue(`$$ 0 $$`);
mathFields[2].setValue(`$$ \\sqrt{x^2+y^2}-5 $$`);
mathFields[3].setValue(`$$ x\\cdot\\sin y $$`);

const canvas = document.querySelector<HTMLCanvasElement>("#canvas")!;
const context = canvas.getContext("webgpu") || canvas.getContext("webgl2");

(async function main() {
  try {
    /*
    let renderer = context instanceof GPUCanvasContext
      ? await WebGPURenderer.new(canvas, context)
      : new Object as any;
    */
    let renderer = await WebGPURenderer.new(canvas, context as GPUCanvasContext);

    const axis = Axis.new();
    renderer.addActor(axis);

    let actorId: string[] = new Array(mathFields.length);
    let wireId: string[] = new Array(mathFields.length);

    eqCheckboxes.forEach((box, i) => {
      box?.addEventListener('change', () => {
        if (box.checked) {
          const surface = Surface.new({
            range: {
              x: { low: -80, high: 80 },
              y: { low: -80, high: 80 },
              z: { low: -80, high: 80 },
            },
            fn: mathFields[i].expression.simplify().compile(),
          });
          actorId[i] = renderer.addActor(surface);
          wireId[i] = renderer.addActor(surface.newWire().actor);
        } else {
          renderer.removeActor(actorId[i]);
          renderer.removeActor(wireId[i]);
        }
      });
    });

    await renderer?.render();
  } catch (e) {
    console.error(e);
  }
})()
