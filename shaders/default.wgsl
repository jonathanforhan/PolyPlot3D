struct VertexOutput {
    @builtin(position) Position: vec4<f32>,
    @location(0) frag_position: vec4<f32>,
    @location(1) frag_uv: vec2<f32>,
}

@binding(0) @group(0)
var<uniform> uniforms : mat4x4<f32>;

@vertex
fn vertex_main(@location(0) position: vec4<f32>, @location(1) uv: vec2<f32>) -> VertexOutput {
    var output: VertexOutput;
    output.Position = uniforms * position;
    output.frag_uv = uv;
    output.frag_position = 0.5 * (position + vec4(1.0, 1.0, 1.0, 1.0));
    return output;
}

@fragment
fn fragment_main(@location(0) frag_position: vec4<f32>, @location(1) frag_uv: vec2<f32>) -> @location(0) vec4<f32> {
    return frag_position;
}
