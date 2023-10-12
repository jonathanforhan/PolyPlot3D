import './style.css'
import defaultShader from "../shaders/default.wgsl?raw";
import { WebGPURenderer } from './gfx/webgpu-renderer'
import { ImportType, Mesh } from './gfx/mesh';
import { mat4, vec3 } from 'wgpu-matrix';

const canvas = document.querySelector<HTMLCanvasElement>("#canvas")!;
const context = canvas.getContext("webgpu") || canvas.getContext("webgl2");

function setup() {
}

(async function main() {
  setup();

  const bunny1 = await Mesh.import("./assets/bunny/bunny.obj", ImportType.OBJ);
  const bunny2 = await Mesh.import("./assets/bunny/bunny.obj", ImportType.OBJ);

  try {
    let renderer = context instanceof GPUCanvasContext
      ? new WebGPURenderer(canvas, context)
      : null;
    renderer?.setShader(defaultShader);

    renderer?.addMesh(bunny1, (model) => {
      model = mat4.translate(model, vec3.fromValues(-4, 0, 0));
      model = mat4.rotateY(model, 4 * Date.now() / 1000);
      return model;
    })

    renderer?.addMesh(bunny2, (model) => {
      model = mat4.translate(model, vec3.fromValues(4, 0, 0));
      model = mat4.rotateY(model, -4 * Date.now() / 1000);
      return model;
    })

    await renderer?.render();
  } catch (e) {
    console.error(e);
  }
})()
