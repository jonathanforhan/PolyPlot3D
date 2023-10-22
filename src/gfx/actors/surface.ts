import { surfaceVert, wireFrag, wireVert } from "../shaders";
import { surfaceFrag } from "../shaders";
import { Mat4, mat4 } from "wgpu-matrix";
import { Actor, CullMode, ShaderStore, SharedActor, Topology, Transform } from "../actor";
import { Mesh } from "../mesh";

export type Range = {
  x: { low: number, high: number },
  y: { low: number, high: number },
  z: { low: number, high: number },
}

export type SurfaceFunction = (arg: { x: number, y: number }) => number;

const createMesh = (range: Range, fn: SurfaceFunction): Mesh => {
  let [vertices, indices] = [new Array, new Array];
  let [rx, ry] = [range.x.high - range.x.low, range.y.high - range.y.low];
  const s = 0.1;

  for (let i = range.x.low; i < range.x.high; i++) {
    for (let j = range.y.low; j < range.y.high; j++) {
      let [x, y] = [i * s, j * s];
      let z = fn({ x, y });
      let k = z / s;

      k >= range.z.low && k <= range.z.high
        ? vertices.push(i, k, j)
        : vertices.push(NaN, NaN, NaN)
    }
  }

  for (let i = 0; i < rx - 1; i++) {
    for (let j = 0; j < ry - 1; j++) {
      if (isNaN(vertices[i * rx * 3 + j * 3])) {
        continue;
      }

      indices.push(
        // top left | bot left | bot right
        i * ry + j + 1, i * ry + j, i * ry + ry + j,
        // bot right | top left | top right
        i * ry + ry + j, i * ry + j + 1, i * ry + ry + j + 1,
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
    range: Range,
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
