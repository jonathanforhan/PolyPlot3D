import { Mat4 } from "wgpu-matrix";
import { Mesh } from "./mesh";

export type Transform = (m: Mat4) => Mat4;
export type Topology = GPUPrimitiveTopology;
export type CullMode = GPUCullMode;

export type ShaderStore = {
  name: string,  // name of shader like 'foo.vert.wgsl'
  get(): string, // callback to get the imported code
};

export abstract class Actor {
  public abstract mesh?: Mesh;
  public abstract modelMatrix: Mat4;
  public abstract transform?: Transform;
  public abstract vertexShader: ShaderStore;
  public abstract fragmentShader: ShaderStore;
  public abstract topology: Topology;
  public abstract cullMode: GPUCullMode; 

  public static new(_?: any | undefined): any { throw "Abstract method must override"; }
  public abstract newShared?(_?: any | undefined): SharedActor<Actor>;

  public abstract duplicate(): Actor;
};

export class SharedActor<T extends Actor> {
  public actor: T;

  constructor(actor: T) {
    this.actor = actor;
    delete this.actor.newShared;
  }
}

