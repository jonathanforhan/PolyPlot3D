import { Mat4, mat4 } from "wgpu-matrix";

export enum ImportType {
  OBJ = "obj",
}

export type Transform = (m: Mat4) => Mat4;

/* Mesh utility class for importing and other functions */
export class Mesh {
  positions: Float32Array;
  uvs: Float32Array;
  normals: Float32Array;
  indices: Uint16Array;
  model: Mat4;
  transform?: Transform;

  constructor(
    positions: Float32Array = new Float32Array(),
    uvs: Float32Array = new Float32Array(),
    normals: Float32Array = new Float32Array(),
    indices: Uint16Array = new Uint16Array(),
    model: Mat4 = mat4.identity(),
    transform?: Transform,
  ) {
    this.positions = positions;
    this.uvs = uvs;
    this.normals = normals;
    this.indices = indices;
    this.model = model;
    this.transform = transform;
  }

  public duplicate(): Mesh {
    return new Mesh(
      this.positions.copyWithin(-1, -1),
      this.uvs.copyWithin(-1, -1),
      this.normals.copyWithin(-1, -1),
      this.indices.copyWithin(-1, -1),
      this.model.copyWithin(-1, -1)
    );
  }

  public static async import(asset: string, importType: ImportType): Promise<Mesh> {
    const server = `https://jfraspi.us:443`;
    const res = await fetch(`${server}/import?asset=${asset}&ft=${importType}`);
    if (!res.ok) {
      throw Error(`import ${asset} failed`);
    }
    const file = await res.text();

    switch (importType) {
      case ImportType.OBJ:
        return Mesh.importOBJ(file);
    }
  }

  private static async importOBJ(bytes: string): Promise<Mesh> {
    const lines = bytes.split('\n');

    type CacheArray<T> = T[][];
    const cachedPositions: CacheArray<number> = [];
    const cachedFaces: CacheArray<string> = [];
    const cachedNormals: CacheArray<number> = [];
    const cachedUvs: CacheArray<number> = [];

    // save to cache buckets
    for (let line of lines) {
      line = line.trim();
      const [start, ...data] = line.split(' ');

      switch (start) {
        case 'v':
          cachedPositions.push(data.map(parseFloat));
          break;
        case 'vt':
          cachedUvs.push(data.map(Number));
          break;
        case 'vn':
          cachedNormals.push(data.map(parseFloat));
          break;
        case 'f':
          cachedFaces.push(data);
          break;
      }
    }

    const positions: number[] = [];
    const uvs: number[] = [];
    const normals: number[] = [];
    const indices: number[] = [];
    const cache: Record<string, number> = {};

    // get final result
    let i = 0;
    for (const faces of cachedFaces) {
      for (const faceString of faces) {
        if (cache[faceString] !== undefined) {
          indices.push(cache[faceString]);
        } else {
          cache[faceString] = i;
          indices.push(i);
          i++;

          const [vI, uvI, nI] = faceString.split('/').map(s => +s - 1);
          vI > -1 && positions.push(...cachedPositions[vI]);
          uvI > -1 && uvs.push(...cachedUvs[uvI]);
          nI > -1 && normals.push(...cachedNormals[nI]);
        }
      }
    }

    return new Mesh(
      new Float32Array(positions),
      new Float32Array(uvs),
      new Float32Array(normals),
      new Uint16Array(indices),
    );
  }
}

