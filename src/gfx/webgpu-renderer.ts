import { Mesh, Transform } from "./mesh.ts";
import { Renderer } from "./renderer.ts";
import { mat4 } from "wgpu-matrix";

/* WebGPU specific data */
interface MeshBufferData {
  bindGroup?: GPUBindGroup,
  uniformBuffer?: GPUBuffer,
}

/* WebGPU implementation of Renderer, PolyPlot uses WebGPU supported by browser */
export class WebGPURenderer implements Renderer {
  public readonly canvas: HTMLCanvasElement;
  public readonly context: GPUCanvasContext;
  private device?: GPUDevice;
  private shaderCode?: string;
  private assets: (Mesh & MeshBufferData)[] = [];

  /* Fails if WebGPU not supported */
  public constructor(canvas: HTMLCanvasElement, context: GPUCanvasContext) {
    if (!navigator.gpu) throw Error("WebGPU is not supported");
    this.canvas = canvas;
    this.context = context;

    this.canvas.width = canvas.clientWidth * devicePixelRatio;
    this.canvas.height = canvas.clientHeight * devicePixelRatio;
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
   *
   * @returns : NORETURN
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
    const pipeline = this.createPipeline(shaderModule);

    // one view projection uniform buffer that we write to at an offset
    const viewProjectionUniformBuffer = this.device.createBuffer({
      size: 16 * 4 * 2,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    const viewProjectionBindGroup = this.device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: { buffer: viewProjectionUniformBuffer }
        }
      ]
    });

    // create unique bindGroups for each Asset
    for (let asset of this.assets) {
      asset.uniformBuffer = this.device.createBuffer({
        size: 16 * 4,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
      });
      asset.bindGroup = this.device.createBindGroup({
        layout: pipeline.getBindGroupLayout(1),
        entries: [
          {
            binding: 0,
            resource: { buffer: asset.uniformBuffer }
          }
        ],
      });
    }

    this.device!.queue.writeBuffer(viewProjectionUniformBuffer, 0, this.getView());
    this.device!.queue.writeBuffer(viewProjectionUniformBuffer, 16 * 4, this.getProjection());

    const frame = () => {
      const [currWidth, currHeight] = [
        this.canvas.clientWidth * devicePixelRatio,
        this.canvas.clientHeight * devicePixelRatio
      ];

      if (currWidth !== this.canvas.width || currHeight !== this.canvas.height) {
        depthTexture.destroy();

        [this.canvas.width, this.canvas.height] = [currWidth, currHeight];
        this.device!.queue.writeBuffer(viewProjectionUniformBuffer, 16 * 4, this.getProjection());

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

      this.assets.forEach((asset, i) => {
        renderPassEncoder.setPipeline(pipeline);
        renderPassEncoder.setBindGroup(0, viewProjectionBindGroup);
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
    const buffer = this.device!.createBuffer({
      size: vertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });
    new Float32Array(buffer.getMappedRange()).set(vertices);
    buffer.unmap();
    return buffer;
  }

  private createIndexBuffer(indices: Uint16Array) {
    const buffer = this.device!.createBuffer({
      size: indices.byteLength,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });
    new Uint16Array(buffer.getMappedRange()).set(indices);
    buffer.unmap();
    return buffer;
  }

  /* creates pipeline, is shader dependant, make sure formats match */
  private createPipeline(shaderModule: GPUShaderModule): GPURenderPipeline {
    return this.device!.createRenderPipeline({
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

  private getProjection(): Float32Array {
    let projection = mat4.perspective((2 * Math.PI) / 5, this.canvas.width / this.canvas.height, 1, 100);
    return projection  as Float32Array;
  }

  private getView(): Float32Array {
    let view = mat4.identity(); view[14] = -8;
    return view as Float32Array;
  }
}

