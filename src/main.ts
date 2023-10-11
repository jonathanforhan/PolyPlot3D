import './style.css'
import { WebGPURenderer } from './gfx/webgpu-renderer'
import defaultShader from "../shaders/default.wgsl?raw";
import { Mesh } from './gfx/mesh';
import { mat4, vec3 } from 'wgpu-matrix';

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

  const bunny1 = await Mesh.import("/assets/bunny/bunny.obj");
  const bunny2 = await Mesh.import("/assets/bunny/bunny.obj");

  try {
    let renderer = context instanceof GPUCanvasContext
      ? new WebGPURenderer(canvas, context)
      : null;
    renderer?.setShader(defaultShader);

    renderer?.addMesh(bunny1, (model) => {
      model = mat4.translate(model, vec3.fromValues(-4, 0, 0));
      model = mat4.rotateY(model, Date.now() / 1000);
      return model;
    })

    renderer?.addMesh(bunny2, (model) => {
      model = mat4.translate(model, vec3.fromValues(4, 0, 0));
      model = mat4.rotateY(model, Date.now() / 1000);
      return model;
    })

    await renderer?.draw();
  } catch (e) {
    console.error(e);
  }
})()
