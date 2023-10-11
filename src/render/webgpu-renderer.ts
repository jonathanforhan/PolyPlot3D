import { Renderer } from "./renderer.ts"
import { defaultShader } from "../shaders.ts"

/**
 * WebGPU Renderer
 *   PolyPlot uses WebGPU if has browser support, currently only supported in Chromium
 */
export class WebGPURenderer implements Renderer {
  readonly canvas: HTMLCanvasElement;
  readonly context: GPUCanvasContext;

  constructor(canvas: HTMLCanvasElement, context: GPUCanvasContext) {
    this.canvas = canvas;
    this.context = context;
  }

  async initialize(): Promise<void> {
    if (!navigator.gpu) {
      throw Error("WebGPU is not supported");
    }

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      throw Error("Couldn't WebGPU adapter request not forfilled");
    }

    const device = await adapter.requestDevice();

    const shaderModule = device.createShaderModule({ code: defaultShader });

    this.context.configure({
      device: device,
      format: navigator.gpu.getPreferredCanvasFormat(),
      alphaMode: "premultiplied",
    });

    const vertices = new Float32Array([
      0.0, 0.6, 0, 1, 1, 0, 0, 1,
      -0.5, -0.6, 0, 1, 0, 1, 0, 1,
      0.5, -0.6, 0, 1, 0, 0, 1, 1,
    ]);

    const vertexBuffer = device.createBuffer({
      size: vertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(vertexBuffer, 0, vertices, 0, vertices.length);

    const vertexBuffers: GPUVertexBufferLayout[] = [
      {
        attributes: [
          { // position
            shaderLocation: 0,
            offset: 0,
            format: "float32x4",
          },
          { // color
            shaderLocation: 1,
            offset: 16,
            format: "float32x4",
          },
        ],
        arrayStride: 32,
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
      },
      layout: "auto",
    };

    const renderPipeline = device.createRenderPipeline(pipelineDescriptor);

    const commandEncoder = device.createCommandEncoder();

    const clearColor = { r: 0.0, g: 0.5, b: 1.0, a: 1.0 };

    const renderPassDescriptor: GPURenderPassDescriptor = {
      colorAttachments: [
        {
          clearValue: clearColor,
          loadOp: "clear",
          storeOp: "store",
          view: this.context.getCurrentTexture().createView(),
        },
      ],
    };

    const renderPassEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    renderPassEncoder.setPipeline(renderPipeline);
    renderPassEncoder.setVertexBuffer(0, vertexBuffer);
    renderPassEncoder.draw(3);
    renderPassEncoder.end();
    device.queue.submit([commandEncoder.finish()]);
  }
}

