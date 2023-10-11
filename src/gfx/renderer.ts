import { Mesh, Transform } from "./mesh";

/* Renderer Parent Class */
export interface Renderer {
  readonly canvas: HTMLCanvasElement;
  readonly context: GPUCanvasContext | WebGL2RenderingContext;

  setShader(code: string): void;
  addMesh(mesh: Mesh, transform?: Transform): void;
  render(): Promise<void>;
}

