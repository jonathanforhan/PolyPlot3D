export enum ImportType {
  OBJ = "obj",
}

/* Mesh utility class for importing and other functions */
export class Mesh {
  readonly positions: Float32Array;
  readonly uvs: Float32Array;
  readonly normals: Float32Array;
  readonly indices: Uint16Array;

  public constructor(
    positions: Float32Array = new Float32Array(),
    uvs: Float32Array = new Float32Array(),
    normals: Float32Array = new Float32Array(),
    indices: Uint16Array = new Uint16Array(),
  ) {
    this.positions = positions;
    this.uvs = uvs;
    this.normals = normals;
    this.indices = indices;
  }

  public duplicate(): Mesh {
    return new Mesh(
      this.positions.copyWithin(-1, -1),
      this.uvs.copyWithin(-1, -1),
      this.normals.copyWithin(-1, -1),
      this.indices.copyWithin(-1, -1),
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

