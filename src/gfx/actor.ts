import { Mat4 } from "wgpu-matrix";
import { Mesh } from "./mesh";

export type Transform = (m: Mat4) => Mat4;
export type Topology = GPUPrimitiveTopology;

export type ShaderStore = {
  name: string,  // name of shader like 'foo.vert.wgsl'
  get(): string, // callback to get the imported code
};

export abstract class Actor {
  abstract readonly mesh?: Mesh;
  abstract modelMatrix: Mat4;
  abstract transform: Transform;
  abstract vertexShader: ShaderStore;
  abstract fragmentShader: ShaderStore;
  abstract topology: Topology;

  static async new(): Promise<Actor> { throw "Abstract class don't call this"; }
};

