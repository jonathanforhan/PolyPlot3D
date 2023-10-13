import './style.css'
import defaultShader from "../shaders/default.wgsl?raw";
import { WebGPURenderer } from './gfx/webgpu-renderer'
import { ImportType, Mesh } from './gfx/mesh';
import { mat4, vec3 } from 'wgpu-matrix';

const canvas = document.querySelector<HTMLCanvasElement>("#canvas")!;
const context = canvas.getContext("webgpu") || canvas.getContext("webgl2");

(async function main() {
  new URLSearchParams(window.location.href).forEach((k, v) => console.log(k, v));
  const asset = "bunny"
  const bunny1 = await Mesh.import(asset, ImportType.OBJ);
  const bunny2 = await Mesh.import(asset, ImportType.OBJ);

  try {
    let renderer = context instanceof GPUCanvasContext
      ? new WebGPURenderer(canvas, context)
      : null;
    renderer?.setShader(defaultShader);

    renderer?.addMesh(bunny1, (model) => {
      mat4.translate(model, vec3.fromValues(-4, 0, 0), model);
      mat4.rotateY(model, 4 * Date.now() / 1000, model);
      return model;
    })

    renderer?.addMesh(bunny2, (model) => {
      mat4.translate(model, vec3.fromValues(4, 0, 0), model);
      mat4.rotateY(model, -4 * Date.now() / 1000, model);
      return model;
    })

    await renderer?.render();
  } catch (e) {
    console.error(e);
  }
})()
