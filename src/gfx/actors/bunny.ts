import { defaultVert } from "../shaders";
import { defaultFrag } from "../shaders";
import { Mat4, mat4 } from "wgpu-matrix";
import { Actor, CullMode, ShaderStore, SharedActor, Topology, Transform } from "../actor";
import { ImportType, Mesh } from "../mesh";

export class Bunny extends Actor {
  public mesh: Mesh;
  public modelMatrix: Mat4;
  public transform?: Transform;
  public vertexShader: ShaderStore;
  public fragmentShader: ShaderStore;
  public topology: Topology;
  public cullMode: CullMode;

  private constructor(
    mesh: Mesh,
    modelMatrix: Mat4,
    transform: Transform | undefined,
    vertexShader: ShaderStore,
    fragmentShader: ShaderStore,
    topology: Topology,
    cullMode: CullMode,
  ) {
    super();
    this.mesh = mesh;
    this.modelMatrix = modelMatrix;
    this.transform = transform;
    this.vertexShader = vertexShader;
    this.fragmentShader = fragmentShader;
    this.topology = topology;
    this.cullMode = cullMode;
  }

  public static override async new(): Promise<Bunny> {
    return new Bunny(
      await Mesh.import("bunny", ImportType.OBJ),
      mat4.identity(),
      undefined,
      {
        name: 'default.vert.wgsl',
        get: () => defaultVert.default,
      },
      {
        name: 'default.frag.wgsl',
        get: () => defaultFrag.default,
      },
      "triangle-list",
      "back",
    );
  }

  public newShared(): SharedActor<Bunny> {
    return new SharedActor(new Bunny(
      this.mesh,
      mat4.identity(),
      undefined,
      {
        name: 'default.vert.wgsl',
        get: () => defaultVert.default,
      },
      {
        name: 'default.frag.wgsl',
        get: () => defaultFrag.default,
      },
      "triangle-list",
      "back",
    ));
  }

  public duplicate(): Actor {
    return new Bunny(
      this.mesh.duplicate(),
      mat4.identity(),
      undefined,
      {
        name: 'default.vert.wgsl',
        get: () => defaultVert.default,
      },
      {
        name: 'default.frag.wgsl',
        get: () => defaultFrag.default,
      },
      "triangle-list",
      "back",
    )
  }
}
