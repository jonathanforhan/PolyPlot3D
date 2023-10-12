import { Camera } from "./camera";
import { Mesh, Transform } from "./mesh";

/* Renderer Parent Class */
export interface Renderer {
  readonly canvas: HTMLCanvasElement;
  readonly context: GPUCanvasContext | WebGL2RenderingContext;
  readonly camera: Camera;

  setShader(code: string): void;
  addMesh(mesh: Mesh, transform?: Transform): void;
  render(): Promise<void>;
}

