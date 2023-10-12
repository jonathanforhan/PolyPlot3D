import { InputHandler } from "../events/input-handler.ts";
import { Camera } from "./camera.ts";
import { Mesh, Transform } from "./mesh.ts";
import { Renderer } from "./renderer.ts";
import { Mat4, mat4 } from "wgpu-matrix";

/* WebGPU specific data */
interface MeshBufferData {
  bindGroup?: GPUBindGroup,
  uniformBuffer?: GPUBuffer,
}

/* WebGPU implementation of Renderer, PolyPlot uses WebGPU supported by browser */
export class WebGPURenderer implements Renderer {
  public readonly canvas: HTMLCanvasElement;
  public readonly context: GPUCanvasContext;
  public readonly camera: Camera;
  private device?: GPUDevice;
  private pipeline?: GPURenderPipeline;
  private shaderCode?: string;
  private assets: (Mesh & MeshBufferData)[] = [];
  private view: Mat4;
  private projection: Mat4;
  private viewProjectionUniform?: { buffer: GPUBuffer, bindGroup: GPUBindGroup };
  private inputHandler: InputHandler;

  /* Fails if WebGPU not supported */
  public constructor(canvas: HTMLCanvasElement, context: GPUCanvasContext) {
    if (!navigator.gpu) throw Error("WebGPU is not supported");
    this.canvas = canvas;
    this.context = context;
    this.camera = new Camera;

    this.canvas.width = canvas.clientWidth * devicePixelRatio;
    this.canvas.height = canvas.clientHeight * devicePixelRatio;

    this.canvas.addEventListener('click', async () => {
      this.canvas.requestPointerLock();
    })

    this.view = mat4.identity();
    this.view[14] = -8;
    this.projection = mat4.perspective((2 * Math.PI) / 5, this.canvas.width / this.canvas.height, 1, 100);
    this.inputHandler = new InputHandler();
  }

  /* Implemented from Renderer Interface */
  public setShader(shaderCode: string) {
    this.shaderCode = shaderCode;
  }

  /* Implemented from Renderer Interface */
  public addMesh(mesh: Mesh, transform?: Transform) {
    if (transform) mesh.transform = transform;
    this.assets.push(mesh);
  }

  /**
   * Main render loop, handles resource creation
   */
  public async render(): Promise<void> {
    if (!this.shaderCode) throw Error("No shader code set");
    if (!this.assets) throw Error("No assets to draw");

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw Error("Couldn't WebGPU adapter request not forfilled");

    this.device = await adapter.requestDevice();
    this.context.configure({
      device: this.device,
      format: navigator.gpu.getPreferredCanvasFormat(),
      alphaMode: "premultiplied",
    });

    const vertexBuffers = this.assets.map(asset => this.createVertexBuffer(asset.positions));
    const indexBuffers = this.assets.map(asset => this.createIndexBuffer(asset.indices));

    let depthTexture = this.device.createTexture({
      size: [this.canvas.width, this.canvas.height],
      format: 'depth24plus',
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });

    const renderPassDescriptor: GPURenderPassDescriptor = {
      colorAttachments: [
        {
          view: this.context.getCurrentTexture().createView(),
          clearValue: { r: 0.0, g: 0.5, b: 1.0, a: 1.0 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
      depthStencilAttachment: {
        view: depthTexture.createView(),
        depthClearValue: 1.0,
        depthLoadOp: 'clear',
        depthStoreOp: 'store',
      }
    };

    const shaderModule = this.device.createShaderModule({ code: this.shaderCode });
    this.createPipeline(shaderModule);

    // create one uniform for view projection
    this.viewProjectionUniform = this.createUniform(16 * 4 * 2, 0, 0);

    // create unique bindGroups for each Asset
    for (let asset of this.assets) {
      ({ buffer: asset.uniformBuffer, bindGroup: asset.bindGroup } = this.createUniform(16 * 4, 1, 0));
    }

    this.device!.queue.writeBuffer(this.viewProjectionUniform.buffer, 0, this.view as Float32Array);
    this.device!.queue.writeBuffer(this.viewProjectionUniform.buffer, 16 * 4, this.projection as Float32Array);

    this.setupKeyBindings();
    let then = 0;

    const frame = () => {
      let now = Date.now() / 1000;
      let dt = now - then;
      then = now;

      const [currWidth, currHeight] = [
        this.canvas.clientWidth * devicePixelRatio,
        this.canvas.clientHeight * devicePixelRatio
      ];

      if (currWidth !== this.canvas.width || currHeight !== this.canvas.height) {
        depthTexture.destroy();

        [this.canvas.width, this.canvas.height] = [currWidth, currHeight];
        this.updateProjection();

        depthTexture = this.device!.createTexture({
          size: [this.canvas.width, this.canvas.height],
          format: 'depth24plus',
          usage: GPUTextureUsage.RENDER_ATTACHMENT,
        });
        renderPassDescriptor.depthStencilAttachment!.view = depthTexture.createView();
      }
      (renderPassDescriptor.colorAttachments as any[])[0].view = this.context.getCurrentTexture().createView();

      const commandEncoder = this.device!.createCommandEncoder();
      const renderPassEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);

      this.inputHandler.loopCallbacks(dt);
      this.camera.apply(this.view);

      this.device!.queue.writeBuffer(this.viewProjectionUniform!.buffer, 0, this.view as Float32Array);
      this.device!.queue.writeBuffer(this.viewProjectionUniform!.buffer, 16 * 4, this.projection as Float32Array);

      this.assets.forEach((asset, i) => {
        renderPassEncoder.setPipeline(this.pipeline!);
        renderPassEncoder.setBindGroup(0, this.viewProjectionUniform!.bindGroup);
        renderPassEncoder.setBindGroup(1, asset.bindGroup!);

        if (asset.transform) asset.model = asset.transform(mat4.identity());
        this.device!.queue.writeBuffer(asset.uniformBuffer!, 0, asset.model as Float32Array);

        renderPassEncoder.setVertexBuffer(0, vertexBuffers[i]);
        renderPassEncoder.setIndexBuffer(indexBuffers[i], "uint16");
        renderPassEncoder.drawIndexed(asset.indices.length!);
      });

      renderPassEncoder.end();
      this.device!.queue.submit([commandEncoder.finish()]);

      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  private createVertexBuffer(vertices: Float32Array) {
    if (!this.device) {
      throw new Error("Buffer creatation error, missing device");
    }
    const buffer = this.device.createBuffer({
      size: vertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });
    new Float32Array(buffer.getMappedRange()).set(vertices);
    buffer.unmap();
    return buffer;
  }

  private createIndexBuffer(indices: Uint16Array) {
    if (!this.device) {
      throw new Error("Buffer creatation error, missing device");
    }
    const buffer = this.device.createBuffer({
      size: indices.byteLength,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });
    new Uint16Array(buffer.getMappedRange()).set(indices);
    buffer.unmap();
    return buffer;
  }

  /* creates pipeline, is shader dependant, make sure formats match */
  private createPipeline(shaderModule: GPUShaderModule) {
    if (!this.device) {
      throw new Error("Pipeline creatation error, missing device");
    }
    this.pipeline = this.device.createRenderPipeline({
      vertex: {
        module: shaderModule,
        entryPoint: "vertex_main",
        buffers: [
          {
            attributes: [
              { shaderLocation: 0, offset: 0, format: "float32x3" },
            ],
            arrayStride: 4 * 3,
            stepMode: "vertex",
          }
        ],
      },
      fragment: {
        module: shaderModule,
        entryPoint: "fragment_main",
        targets: [{ format: navigator.gpu.getPreferredCanvasFormat() }],
      },
      primitive: {
        topology: "triangle-list",
        cullMode: 'back',
      },
      depthStencil: {
        depthWriteEnabled: true,
        depthCompare: 'less',
        format: 'depth24plus',
      },
      layout: "auto",
    });
  }

  private createUniform(
    size: number,
    group: number,
    binding: number
  ): {
    buffer: GPUBuffer,
    bindGroup: GPUBindGroup
  } {
    if (!this.device || !this.pipeline) {
      throw new Error("Uniform creatation error, missing device or pipeline");
    }

    const buffer = this.device.createBuffer({
      size,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    const bindGroup = this.device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(group),
      entries: [
        {
          binding,
          resource: { buffer }
        }
      ]
    });

    return { buffer, bindGroup };
  }

  private updateProjection() {
    this.projection = mat4.perspective((2 * Math.PI) / 5, this.canvas.width / this.canvas.height, 1, 100);
  }

  private setupKeyBindings() {
    const s = 10; // sensivity
    this.inputHandler.bindKey({ key: 'w', callback: (dt) => this.camera.translateForward(dt * s) });
    this.inputHandler.bindKey({ key: 'a', callback: (dt) => this.camera.translateLeft(dt * s) });
    this.inputHandler.bindKey({ key: 's', callback: (dt) => this.camera.translateBackward(dt * s) });
    this.inputHandler.bindKey({ key: 'd', callback: (dt) => this.camera.translateRight(dt * s) });
    this.inputHandler.bindKey({ key: 'q', callback: (dt) => this.camera.translateUp(dt * s) });
    this.inputHandler.bindKey({ key: 'e', callback: (dt) => this.camera.translateDown(dt * s) });

    this.inputHandler.bindMouse({ callback: (x, y) => this.camera.lookAround(x, y) });

    this.inputHandler.apply();
  }
}

