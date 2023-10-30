import { axisVert } from "../shaders";
import { axisFrag } from "../shaders";
import { Mat4, mat4 } from "wgpu-matrix";
import { Actor, CullMode, ShaderStore, SharedActor, Topology, Transform } from "../actor";
import { Mesh } from "../mesh";

export class Axis extends Actor {
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

  public static override new(): Axis {
    return new Axis(
      new Mesh(
        new Float32Array([
          0, -0.5, 0,
          0, 0.5, 0,
          -0.5, 0, 0,
          0.5, 0, 0,
          0, 0, -0.5,
          0, 0, 0.5,
        ]),
        undefined,
        undefined,
        new Uint16Array([
          0, 1,
          2, 3,
          4, 5,
        ]),
      ),
      mat4.identity(),
      undefined,
      {
        name: 'axis.vert.wgsl',
        get: () => axisVert.default,
      },
      {
        name: 'axis.frag.wgsl',
        get: () => axisFrag.default,
      },
      "line-list",
      "back",
    )
  }

  public newShared(_?: any): SharedActor<Actor> {
    return new SharedActor(new Axis(
      this.mesh,
      mat4.identity(),
      undefined,
      {
        name: 'axis.vert.wgsl',
        get: () => axisVert.default,
      },
      {
        name: 'axis.frag.wgsl',
        get: () => axisFrag.default,
      },
      "line-list",
      "back",
    ));
  }

  public duplicate(): Actor {
    return new Axis(
      this.mesh.duplicate(),
      mat4.identity(),
      undefined,
      {
        name: 'axis.vert.wgsl',
        get: () => axisVert.default,
      },
      {
        name: 'axis.frag.wgsl',
        get: () => axisFrag.default,
      },
      "line-list",
      "back",
    );
  }
}

