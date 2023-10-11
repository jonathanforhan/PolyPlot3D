/**
 * Renderer Parent Class
 */
export interface Renderer {
  readonly canvas: HTMLCanvasElement;
  readonly context: GPUCanvasContext | WebGL2RenderingContext;
  initialize(): Promise<void>;
}

