import { surfaceVert, wireFrag, wireVert } from "../shaders";
import { surfaceFrag } from "../shaders";
import { Mat4, mat4 } from "wgpu-matrix";
import { Actor, CullMode, ShaderStore, SharedActor, Topology, Transform } from "../actor";
import { Mesh } from "../mesh";

const createMesh = (range: { low: number, high: number }, fn: SurfaceFunction): Mesh => {
  let [vertices, indices] = [new Array, new Array];
  let [x, y] = [0, 0];
  let s = 0.05; // scale
  let m = 30; // mutator
  let r = range.high - range.low;

  for (let i = range.low; i < range.high; i++) {
    for (let j = range.low; j < range.high; j++) {
      [x, y] = [(i) * s, (j) * s];
      vertices.push(x * m, fn(x, y) * m, y * m);
    }
  }

  for (let i = 0; i < r - 1; i++) {
    for (let j = 0; j < r - 1; j++) {
      indices.push(
        // top left | bot left | bot right
        i * r + j + 1, i * r + j, i * r + r + j,
        // bot right | top left | top right
        i * r + r + j, i * r + j + 1, i * r + r + j + 1,
      );
    }
  }

  console.log(`Produced ${vertices.length} vertices, ${indices.length} indices`);

  return new Mesh(
    new Float32Array(vertices),
    undefined,
    undefined,
    new Uint16Array(indices),
  );
}

export type SurfaceFunction = (x: number, y: number) => number;

export class Surface extends Actor {
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

  public static override new(opts: {
    range: { low: number, high: number },
    fn: SurfaceFunction
  }): Surface {
    return new Surface(
      createMesh(opts.range, opts.fn),
      mat4.identity(),
      undefined,
      {
        name: 'surface.vert.wgsl',
        get: () => surfaceVert.default,
      },
      {
        name: 'surface.frag.wgsl',
        get: () => surfaceFrag.default,
      },
      "triangle-list",
      "none",
    );
  }

  public newShared(): SharedActor<Surface> {
    return new SharedActor(new Surface(
      this.mesh,
      mat4.identity(),
      undefined,
      {
        name: 'surface.vert.wgsl',
        get: () => surfaceVert.default,
      },
      {
        name: 'surface.frag.wgsl',
        get: () => surfaceFrag.default,
      },
      "triangle-list",
      "none",
    ));
  }

  public newWire(): SharedActor<Surface> {
    const wire = this.newShared();
    wire.actor.topology = "line-list";
    wire.actor.vertexShader = {
      name: 'wire.vert.wgsl',
      get: () => wireVert.default,
    };
    wire.actor.fragmentShader = {
      name: 'wire.frag.wgsl',
      get: () => wireFrag.default,
    };
    wire.actor.transform = this.transform;
    return wire;
  }

  public duplicate(): Actor {
    return new Surface(
      this.mesh.duplicate(),
      mat4.identity(),
      undefined,
      {
        name: 'surface.vert.wgsl',
        get: () => surfaceVert.default,
      },
      {
        name: 'surface.frag.wgsl',
        get: () => surfaceFrag.default,
      },
      "triangle-list",
      "none",
    )
  }
}
