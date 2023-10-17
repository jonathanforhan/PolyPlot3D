import { Actor } from "./actor";
import { Camera } from "./camera";

export type ActorID = string;

/* Renderer Parent Class */
export abstract class Renderer {
  protected readonly context: GPUCanvasContext | WebGL2RenderingContext;
  protected readonly canvas: HTMLCanvasElement;
  protected readonly camera: Camera;
  protected readonly abstract actors: Record<ActorID, Actor & any>
  protected readonly shaderModules: Record<string, GPUShaderModule | WebGLShader>;

  protected constructor(canvas: HTMLCanvasElement, context: GPUCanvasContext | WebGL2RenderingContext) {
    this.context = context;
    this.canvas = canvas;
    this.camera = new Camera;
    this.shaderModules = {};

    this.canvas.width = canvas.clientWidth * devicePixelRatio;
    this.canvas.height = canvas.clientHeight * devicePixelRatio;
  }

  /* add an actor to the internal list */
  public abstract addActor<T extends Actor>(actor: T): ActorID;

  /* remove an actor to the internal list */
  public abstract removeActor(id: ActorID): void;

  /* this is called after all setup is complete, this is implementation dependant */
  public abstract render(): Promise<void>;
}

