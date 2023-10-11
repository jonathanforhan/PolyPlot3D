import { Renderer } from "./renderer.ts";
import defaultShader from "../../shaders/default.wgsl?raw";
import { mat4, vec3 } from "wgpu-matrix";

/**
 * WebGPU Renderer
 *   PolyPlot uses WebGPU if has browser support, currently only supported in Chromium
 */
export class WebGPURenderer implements Renderer {
  readonly canvas: HTMLCanvasElement;
  readonly context: GPUCanvasContext;

  public constructor(canvas: HTMLCanvasElement, context: GPUCanvasContext) {
    this.canvas = canvas;
    this.context = context;
  }

  public async initialize(): Promise<void> {
    if (!navigator.gpu) throw Error("WebGPU is not supported");

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw Error("Couldn't WebGPU adapter request not forfilled");

    const device = await adapter.requestDevice();
    const shaderModule = device.createShaderModule({ code: defaultShader });

    this.context.configure({
      device: device,
      format: navigator.gpu.getPreferredCanvasFormat(),
      alphaMode: "premultiplied",
    });

    const vertices = new Float32Array([
      // float4 position, float4 color, float2 uv,
      1, -1, 1, 1, 1, 0, 1, 1, 0, 1,
      -1, -1, 1, 1, 0, 0, 1, 1, 1, 1,
      -1, -1, -1, 1, 0, 0, 0, 1, 1, 0,
      1, -1, -1, 1, 1, 0, 0, 1, 0, 0,
      1, -1, 1, 1, 1, 0, 1, 1, 0, 1,
      -1, -1, -1, 1, 0, 0, 0, 1, 1, 0,

      1, 1, 1, 1, 1, 1, 1, 1, 0, 1,
      1, -1, 1, 1, 1, 0, 1, 1, 1, 1,
      1, -1, -1, 1, 1, 0, 0, 1, 1, 0,
      1, 1, -1, 1, 1, 1, 0, 1, 0, 0,
      1, 1, 1, 1, 1, 1, 1, 1, 0, 1,
      1, -1, -1, 1, 1, 0, 0, 1, 1, 0,

      -1, 1, 1, 1, 0, 1, 1, 1, 0, 1,
      1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
      1, 1, -1, 1, 1, 1, 0, 1, 1, 0,
      -1, 1, -1, 1, 0, 1, 0, 1, 0, 0,
      -1, 1, 1, 1, 0, 1, 1, 1, 0, 1,
      1, 1, -1, 1, 1, 1, 0, 1, 1, 0,

      -1, -1, 1, 1, 0, 0, 1, 1, 0, 1,
      -1, 1, 1, 1, 0, 1, 1, 1, 1, 1,
      -1, 1, -1, 1, 0, 1, 0, 1, 1, 0,
      -1, -1, -1, 1, 0, 0, 0, 1, 0, 0,
      -1, -1, 1, 1, 0, 0, 1, 1, 0, 1,
      -1, 1, -1, 1, 0, 1, 0, 1, 1, 0,

      1, 1, 1, 1, 1, 1, 1, 1, 0, 1,
      -1, 1, 1, 1, 0, 1, 1, 1, 1, 1,
      -1, -1, 1, 1, 0, 0, 1, 1, 1, 0,
      -1, -1, 1, 1, 0, 0, 1, 1, 1, 0,
      1, -1, 1, 1, 1, 0, 1, 1, 0, 0,
      1, 1, 1, 1, 1, 1, 1, 1, 0, 1,

      1, -1, -1, 1, 1, 0, 0, 1, 0, 1,
      -1, -1, -1, 1, 0, 0, 0, 1, 1, 1,
      -1, 1, -1, 1, 0, 1, 0, 1, 1, 0,
      1, 1, -1, 1, 1, 1, 0, 1, 0, 0,
      1, -1, -1, 1, 1, 0, 0, 1, 0, 1,
      -1, 1, -1, 1, 0, 1, 0, 1, 1, 0,
    ]);


    const vertexBuffer = device.createBuffer({
      size: vertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });
    new Float32Array(vertexBuffer.getMappedRange()).set(vertices);
    vertexBuffer.unmap();

    device.queue.writeBuffer(vertexBuffer, 0, vertices, 0, vertices.length);

    const vertexBuffers: GPUVertexBufferLayout[] = [
      {
        attributes: [
          { // position
            shaderLocation: 0,
            offset: 0,
            format: "float32x4",
          },
          { // uv
            shaderLocation: 1,
            offset: 32,
            format: "float32x2",
          },
        ],
        arrayStride: 40,
        stepMode: "vertex",
      }
    ];

    const pipelineDescriptor: GPURenderPipelineDescriptor = {
      vertex: {
        module: shaderModule,
        entryPoint: "vertex_main",
        buffers: vertexBuffers,
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
    };

    const renderPipeline = device.createRenderPipeline(pipelineDescriptor);

    const depthTexture = device.createTexture({
      size: [this.canvas.width, this.canvas.height],
      format: 'depth24plus',
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });

    const uniformBuffer = device.createBuffer({
      size: 4 * 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })

    const uniformBindGroup = device.createBindGroup({
      layout: renderPipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: {
            buffer: uniformBuffer,
          }
        }
      ]
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

    const proj = mat4.perspective((2 * Math.PI) / 5, this.canvas.width / this.canvas.height, 1, 100);
    const mvp = mat4.create();

    const getTransformMatrix = () => {
      const view = mat4.identity();
      mat4.translate(view, vec3.fromValues(0, 0, -4), view);
      const now = Date.now() / 1000;
      mat4.rotate(view, vec3.fromValues(Math.sin(now), Math.cos(now), 0), 1, view);
      mat4.multiply(proj, view, mvp);
      return mvp as Float32Array;
    }

    const frame = () => {
      const transform = getTransformMatrix();
      device.queue.writeBuffer(uniformBuffer, 0, transform.buffer, transform.byteOffset, transform.byteLength);
      renderPassDescriptor.colorAttachments[0]!.view = this.context.getCurrentTexture().createView();

      const commandEncoder = device.createCommandEncoder();
      const renderPassEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
      renderPassEncoder.setPipeline(renderPipeline);
      renderPassEncoder.setBindGroup(0, uniformBindGroup);
      renderPassEncoder.setVertexBuffer(0, vertexBuffer);
      renderPassEncoder.draw(36);
      renderPassEncoder.end();
      device.queue.submit([commandEncoder.finish()]);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
}

