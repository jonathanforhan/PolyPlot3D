import { Mesh } from "./mesh.ts";
import { Renderer } from "./renderer.ts";
import { mat4, vec3 } from "wgpu-matrix";

/**
 * WebGPU Renderer
 *   PolyPlot uses WebGPU if has browser support, currently only supported in Chromium
 */
export class WebGPURenderer implements Renderer {
  public readonly canvas: HTMLCanvasElement;
  public readonly context: GPUCanvasContext;
  private device?: GPUDevice;
  private shaderCode?: string;
  private mesh?: Mesh;

  public constructor(canvas: HTMLCanvasElement, context: GPUCanvasContext) {
    this.canvas = canvas;
    this.context = context;

    if (!navigator.gpu) throw Error("WebGPU is not supported");
  }

  public setShader(shaderCode: string) {
    this.shaderCode = shaderCode;
  }

  public setMesh(mesh: Mesh) {
    this.mesh = mesh;
  }

  public async draw(): Promise<void> {
    if (!this.shaderCode) throw Error("No shader code set");
    if (!this.mesh) throw Error("No mesh set");

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw Error("Couldn't WebGPU adapter request not forfilled");

    this.device = await adapter.requestDevice();
    const shaderModule = this.device.createShaderModule({ code: this.shaderCode });

    this.context.configure({
      device: this.device,
      format: navigator.gpu.getPreferredCanvasFormat(),
      alphaMode: "premultiplied",
    });

    const vertexBuffer = this.createBuffer(this.mesh.positions, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST, true);
    const indexBuffer = this.createBuffer(this.mesh.indices, GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST, true);
    const pipeline = this.createPipeline(shaderModule);

    const depthTexture = this.device.createTexture({
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

    let projection = mat4.perspective((2 * Math.PI) / 5, this.canvas.width / this.canvas.height, 1, 100);
    let view = mat4.identity(); view[14] = -8; view[13] = -1;
    let model = mat4.identity();

    const modelUniformBuffer = this.device.createBuffer({
      size: model.length * 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })
    const viewUniformBuffer = this.device.createBuffer({
      size: model.length * 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })
    const projectionUniformBuffer = this.device.createBuffer({
      size: model.length * 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })
    const uniformBindGroup = this.device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: { buffer: modelUniformBuffer }
        },
        {
          binding: 1,
          resource: { buffer: viewUniformBuffer }
        },
        {
          binding: 2,
          resource: { buffer: projectionUniformBuffer }
        }
      ]
    });

    const frame = () => {
      this.device = this.device!;

      model = mat4.rotateY(model, Math.PI / 60); 

      this.device.queue.writeBuffer(modelUniformBuffer, 0, model as Float32Array);
      this.device.queue.writeBuffer(viewUniformBuffer, 0, view as Float32Array);
      this.device.queue.writeBuffer(projectionUniformBuffer, 0, projection as Float32Array);
      (renderPassDescriptor.colorAttachments as any[])[0].view = this.context.getCurrentTexture().createView();

      const commandEncoder = this.device.createCommandEncoder();
      const renderPassEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
      renderPassEncoder.setPipeline(pipeline);
      renderPassEncoder.setBindGroup(0, uniformBindGroup);
      renderPassEncoder.setVertexBuffer(0, vertexBuffer);
      renderPassEncoder.setIndexBuffer(indexBuffer, "uint16");
      renderPassEncoder.drawIndexed(this.mesh?.indices.length!);
      renderPassEncoder.end();
      this.device.queue.submit([commandEncoder.finish()]);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  private createBuffer<T extends Float32Array | Uint16Array>(buffer: T, usage: number, mapped: boolean): GPUBuffer {
    const gpuBuffer = this.device!.createBuffer({
      size: buffer.byteLength,
      usage,
      mappedAtCreation: mapped,
    });

    if (mapped) {
      if (buffer instanceof Float32Array) {
        new Float32Array(gpuBuffer.getMappedRange()).set(buffer);
      } else if (buffer instanceof Uint16Array) {
        new Uint16Array(gpuBuffer.getMappedRange()).set(buffer);
      }
      gpuBuffer.unmap();
      this.device!.queue.writeBuffer(gpuBuffer, 0, buffer);
    }

    return gpuBuffer;
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
              { // position
                shaderLocation: 0,
                offset: 0,
                format: "float32x3",
              },
            ],
            arrayStride: 4 * 3,
            stepMode: "vertex",
          }
        ],
      },
      fragment: {
        module: shaderModule,
        entryPoint: "fragment_main",
        targets: [
          {
            format: navigator.gpu.getPreferredCanvasFormat(),
          },
        ],
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
}

