import { Mat4, mat4 } from "wgpu-matrix";

export enum ImportType {
  OBJ,
}

export type Transform = (m: Mat4) => Mat4;

/* Layout of mesh data */
export interface Mesh {
  positions: Float32Array;
  uvs: Float32Array;
  normals: Float32Array;
  indices: Uint16Array;
  model: Mat4;
  transform?: Transform;
}

/* Mesh utility class for importing and other functions */
export class Mesh {
  public static async import(filePath: string, importType: ImportType): Promise<Mesh> {
    const res = await fetch(filePath);
    if (!res.ok) {
      throw Error(`import ${filePath} failed`);
    }
    const file = await res.text();

    switch (importType) {
    case ImportType.OBJ:
      return Mesh.importOBJ(file);
    }
  }

  public static async importFromString(string: string, importType: ImportType): Promise<Mesh> {
    switch (importType) {
    case ImportType.OBJ:
      return Mesh.importOBJ(string);
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

    return {
      positions: new Float32Array(positions),
      uvs: new Float32Array(uvs),
      normals: new Float32Array(normals),
      indices: new Uint16Array(indices),
      model: mat4.identity(),
    };
  }
}

