import './style.css'
import defaultShader from "../shaders/default.wgsl?raw";
import axisShader from "../shaders/axis.wgsl?raw"
import { WebGPURenderer } from './gfx/webgpu-renderer'
import { ImportType, Mesh, MeshOptions } from './gfx/mesh';
import { mat4, vec3 } from 'wgpu-matrix';

const canvas = document.querySelector<HTMLCanvasElement>("#canvas")!;
const context = canvas.getContext("webgpu") || canvas.getContext("webgl2");

(async function main() {
  const asset = "bunny"
  const bunny1 = await Mesh.import(asset, ImportType.OBJ);
  const bunny2 = bunny1.duplicate();
  const bunny3 = bunny1.duplicate();
  const bunny4 = bunny1.duplicate();

  try {
    let renderer = context instanceof GPUCanvasContext
      ? new WebGPURenderer(canvas, context)
      : null;
    renderer?.setShader(defaultShader);

    const axis = {
      x: Mesh.importLine(),
      y: Mesh.importLine(),
      z: Mesh.importLine(),
    };

    const meshOptions: MeshOptions = {
      primitiveState: {
        topology: 'line-list',
        cullMode: 'none'
      },
      shaderCode: axisShader,
    };

    axis.x.meshOptions = meshOptions;
    axis.y.meshOptions = meshOptions;
    axis.z.meshOptions = meshOptions;
    renderer?.addMesh(axis.x, model => mat4.rotateZ(model, Math.PI / 2, model));
    renderer?.addMesh(axis.y);
    renderer?.addMesh(axis.z, model => mat4.rotateX(model, Math.PI / 2, model));

    renderer?.addMesh(bunny1, model => {
      let theta = (Date.now() / 4000) % (2 * Math.PI);
      mat4.translate(model, vec3.fromValues(Math.cos(theta) * 10, 0, Math.sin(theta) * 10), model)
      return mat4.rotateY(model, theta * 2, model)
    });
    renderer?.addMesh(bunny2, model => {
      let theta = (Date.now() / 4000) % (2 * Math.PI);
      mat4.translate(model, vec3.fromValues(Math.cos(theta + Math.PI) * 10, 0, Math.sin(theta + Math.PI) * 10), model)
      return mat4.rotateY(model, theta * 2, model)
    });
    renderer?.addMesh(bunny3, model => {
      let theta = (Date.now() / 4000) % (2 * Math.PI);
      mat4.translate(model, vec3.fromValues(Math.cos(theta + Math.PI / 2) * 10, Math.sin(theta + Math.PI / 2) * 10, 0), model)
      return mat4.rotateY(model, theta * 2, model)
    });
    renderer?.addMesh(bunny4, model => {
      let theta = (Date.now() / 4000) % (2 * Math.PI);
      mat4.translate(model, vec3.fromValues(Math.cos(theta + 3 * Math.PI / 2) * 10, Math.sin(theta + 3 * Math.PI / 2) * 10, 0), model);
      return mat4.rotateY(model, theta * 2, model)
    });

    await renderer?.render();
  } catch (e) {
    console.error(e);
  }
})()
