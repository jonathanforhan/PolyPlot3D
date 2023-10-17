import { Actor } from "./actor.ts";
import { ActorID, Renderer } from "./renderer.ts";
import { v1 as uuid } from 'uuid';
import { defaultVert } from "./shaders.ts";
import { defaultFrag } from "./shaders.ts";
import { Mat4, mat4 } from "wgpu-matrix";
import { InputHandler } from "../events/input-handler.ts";

type ActorImpl = {
  vertexBuffer?: GPUBuffer;
  indexBuffer?: GPUBuffer;
  uniformBuffer?: GPUBuffer;
  uniformBindGroup?: GPUBindGroup;
  pipeline?: GPURenderPipeline;
}

/* WebGPU implementation of Renderer, PolyPlot uses WebGPU supported by browser */
export class WebGPURenderer extends Renderer {
  protected device: GPUDevice;
  protected readonly actors: Record<ActorID, Actor & ActorImpl>;

  /* Async constructor */
  public static async new(canvas: HTMLCanvasElement, context: GPUCanvasContext): Promise<WebGPURenderer> {
    if (!navigator.gpu) throw "WebGPU is not supported";

    const adapter = await navigator.gpu.requestAdapter();
    const device = await adapter?.requestDevice();
    if (!device) throw "WebGPU Request Device -> REJECTED";

    context.configure({
      device: device,
      format: navigator.gpu.getPreferredCanvasFormat(),
      alphaMode: "premultiplied",
    })

    return new WebGPURenderer(canvas, context, device);
  }

  /* Private constructor to be used by new() */
  private constructor(canvas: HTMLCanvasElement, context: GPUCanvasContext, device: GPUDevice) {
    super(canvas, context);
    this.device = device;
    this.actors = {};
  }

  /* Adds actor to actor record via a uuid, add's shader to shader registry if needed */
  public addActor<T extends Actor>(actor: T): ActorID {
    this.shaderModules[actor.vertexShader.name] ??= this.device.createShaderModule({ code: actor.vertexShader.get() });
    this.shaderModules[actor.fragmentShader.name] ??= this.device.createShaderModule({ code: actor.fragmentShader.get() });
    const vertexBuffer = actor.mesh && this.mapBuffer(actor.mesh.positions, GPUBufferUsage.VERTEX);
    const indexBuffer = actor.mesh && this.mapBuffer(actor.mesh.indices, GPUBufferUsage.INDEX);
    const pipeline = this.device.createRenderPipeline({
      vertex: {
        module: this.shaderModules[actor.vertexShader.name] as GPUShaderModule,
        entryPoint: "vertex_main",
        buffers: [
          {
            attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }],
            arrayStride: 4 * 3,
            stepMode: "vertex",
          }
        ],
      },
      fragment: {
        module: this.shaderModules[actor.fragmentShader.name] as GPUShaderModule,
        entryPoint: "fragment_main",
        targets: [{ format: navigator.gpu.getPreferredCanvasFormat() }],
      },
      primitive: {
        topology: actor.topology,
        cullMode: 'back',
      },
      depthStencil: {
        depthWriteEnabled: true,
        depthCompare: 'less',
        format: 'depth24plus',
      },
      layout: "auto",
    });
    const { buffer, bindGroup } = this.createUniform(pipeline, 16 * 4, 1, 0);

    const id: ActorID = uuid();
    this.actors[id] = {
      ...actor,
      vertexBuffer: vertexBuffer,
      indexBuffer: indexBuffer,
      uniformBuffer: buffer,
      uniformBindGroup: bindGroup,
      pipeline: pipeline
    };
    return id;
  }

  /* Removes an actor from actor record via a uuid */
  public removeActor(id: string): void {
    delete this.actors[id];
  }

  /* Main render loop, handles resource creation */
  public async render(): Promise<void> {
    const context = this.context as GPUCanvasContext;

    // TODO NOT GOOD
    let depthTexture = this.device.createTexture({
      size: [this.canvas.width, this.canvas.height],
      format: 'depth24plus',
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });

    const renderPassDescriptor: GPURenderPassDescriptor = {
      colorAttachments: [
        {
          view: context.getCurrentTexture().createView(),
          clearValue: { r: 0.1, g: 0.1, b: 0.1, a: 0.1 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
      depthStencilAttachment: {
        view: depthTexture.createView(),
        depthClearValue: 1.0,
        depthLoadOp: 'clear',
        depthStoreOp: 'store',
      }
    };

    const viewProjectionPipeline = this.device.createRenderPipeline({
      vertex: {
        module: this.device.createShaderModule({ code: defaultVert.default }),
        entryPoint: "vertex_main",
        buffers: [
          {
            attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }],
            arrayStride: 4 * 3,
            stepMode: "vertex",
          }
        ],
      },
      fragment: {
        module: this.device.createShaderModule({ code: defaultFrag.default }),
        entryPoint: "fragment_main",
        targets: [{ format: navigator.gpu.getPreferredCanvasFormat() }],
      },
      primitive: {
        topology: 'triangle-list',
        cullMode: 'back',
      },
      depthStencil: {
        depthWriteEnabled: true,
        depthCompare: 'less',
        format: 'depth24plus',
      },
      layout: "auto",
    });
    const viewProjectionUniform = this.createUniform(viewProjectionPipeline, 16 * 4 * 2, 0, 0);

    let view: Mat4 = mat4.identity();
    view[14] = -10;

    const getProjection = () => mat4.perspective((2 * Math.PI) / 5, this.canvas.width / this.canvas.height, 1, 100);
    let projection = getProjection();

    this.device.queue.writeBuffer(viewProjectionUniform.buffer, 0, view as Float32Array);
    this.device.queue.writeBuffer(viewProjectionUniform.buffer, 16 * 4, projection as Float32Array);

    const inputHandler = new InputHandler();
    const s = 10; // sensivity
    inputHandler.bindKey({ key: 'w', callback: (dt) => this.camera.translateForward(dt * s) });
    inputHandler.bindKey({ key: 'a', callback: (dt) => this.camera.translateLeft(dt * s) });
    inputHandler.bindKey({ key: 's', callback: (dt) => this.camera.translateBackward(dt * s) });
    inputHandler.bindKey({ key: 'd', callback: (dt) => this.camera.translateRight(dt * s) });
    inputHandler.bindKey({ key: 'q', callback: (dt) => this.camera.translateUp(dt * s) });
    inputHandler.bindKey({ key: 'e', callback: (dt) => this.camera.translateDown(dt * s) });
    inputHandler.bindMouse({ callback: (x, y) => this.camera.lookAround(x, y) });
    inputHandler.apply();

    const frame = () => {
      const [currWidth, currHeight] = [
        this.canvas.clientWidth * devicePixelRatio,
        this.canvas.clientHeight * devicePixelRatio
      ];

      if (currWidth !== this.canvas.width || currHeight !== this.canvas.height) {
        depthTexture.destroy();
        [this.canvas.width, this.canvas.height] = [currWidth, currHeight];
        projection = getProjection();
        depthTexture = this.device!.createTexture({
          size: [this.canvas.width,
          this.canvas.height],
          format: 'depth24plus',
          usage: GPUTextureUsage.RENDER_ATTACHMENT
        });
        renderPassDescriptor.depthStencilAttachment!.view = depthTexture.createView();
      }
      (renderPassDescriptor.colorAttachments as any[])[0].view = (<GPUCanvasContext>this.context).getCurrentTexture().createView();

      const commandEncoder = this.device!.createCommandEncoder();
      const renderPassEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);

      inputHandler.loopCallbacks(0);
      this.camera.apply(view);

      this.device.queue.writeBuffer(viewProjectionUniform.buffer, 0, view as Float32Array);
      this.device.queue.writeBuffer(viewProjectionUniform.buffer, 16 * 4, projection as Float32Array);

      Object.values(this.actors).forEach(actor => {
        renderPassEncoder.setPipeline(actor.pipeline!);
        renderPassEncoder.setBindGroup(0, viewProjectionUniform.bindGroup);
        renderPassEncoder.setBindGroup(1, actor.uniformBindGroup!);

        actor.modelMatrix = actor.transform(mat4.identity());
        this.device.queue.writeBuffer(actor.uniformBuffer!, 0, actor.modelMatrix as Float32Array);

        actor.vertexBuffer && renderPassEncoder.setVertexBuffer(0, actor.vertexBuffer);
        actor.indexBuffer && renderPassEncoder.setIndexBuffer(actor.indexBuffer, 'uint16');
        actor.mesh && renderPassEncoder.drawIndexed(actor.mesh.indices.length);
      });

      renderPassEncoder.end();
      this.device.queue.submit([commandEncoder.finish()]);

      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* Create a buffer from 'data' mapped to GPU memory, GPUBufferUsage.COPY_DST is implicitly added to usage */
  private mapBuffer(data: Float32Array | Uint16Array, usage: number): GPUBuffer {
    const buffer = this.device.createBuffer({
      size: data.byteLength,
      usage: usage | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });

    data instanceof Float32Array
      ? new Float32Array(buffer.getMappedRange()).set(data)
      : new Uint16Array(buffer.getMappedRange()).set(data);

    buffer.unmap();
    return buffer;
  }

  /* Create a uniform buffer */
  private createUniform(
    pipeline: GPURenderPipeline,
    size: number,
    group: number,
    binding: number
  ): {
    buffer: GPUBuffer,
    bindGroup: GPUBindGroup
  } {
    const buffer = this.device.createBuffer({
      size: size,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
    const bindGroup = this.device.createBindGroup({
      layout: pipeline.getBindGroupLayout(group),
      entries: [
        {
          binding: binding,
          resource: { buffer: buffer }
        }
      ]
    });

    return { buffer, bindGroup }
  }
}

