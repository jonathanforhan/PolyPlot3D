import { Mat4, mat4 } from "wgpu-matrix";
import { Actor, ShaderStore, Topology, Transform } from "../actor";
import { ImportType, Mesh } from "../mesh";
import { defaultVert } from "../shaders";
import { defaultFrag } from "../shaders";

export class Bunny extends Actor {
  mesh: Mesh;
  modelMatrix: Mat4;
  transform: Transform;
  vertexShader: ShaderStore;
  fragmentShader: ShaderStore;
  topology: Topology;

  private constructor(
    mesh: Mesh,
    modelMatrix: Mat4,
    transform: Transform,
    vertexShader: ShaderStore,
    fragmentShader: ShaderStore,
    topology: Topology,
  ) {
    super();
    this.mesh = mesh;
    this.modelMatrix = modelMatrix;
    this.transform = transform;
    this.vertexShader = vertexShader;
    this.fragmentShader = fragmentShader;
    this.topology = topology;
  }

  public static override async new(): Promise<Bunny> {
    return new Bunny(
      await Mesh.import("bunny", ImportType.OBJ),
      mat4.identity(),
      m => m,
      {
        name: 'default.vert.wgsl',
        get: () => defaultVert.default,
      },
      {
        name: 'default.frag.wgsl',
        get: () => defaultFrag.default,
      },
      "triangle-list"
    )
  }
}
