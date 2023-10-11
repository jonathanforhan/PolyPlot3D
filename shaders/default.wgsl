struct VertexOutput {
    @builtin(position) Position: vec4<f32>,
    @location(0) frag_position: vec4<f32>,
    // @location(1) frag_uv: vec2<f32>,
}

@binding(0) @group(0)
var<uniform> model : mat4x4<f32>;
@binding(1) @group(0)
var<uniform> view : mat4x4<f32>;
@binding(2) @group(0)
var<uniform> projection : mat4x4<f32>;

@vertex
fn vertex_main(@location(0) position: vec3<f32>) -> VertexOutput {
    var output: VertexOutput;
    var position_v4: vec4<f32> = vec4(position, 1.0);
    output.Position = projection * view * model * position_v4;
    output.frag_position = 0.5 * (position_v4 + vec4(1.0, 1.0, 1.0, 1.0));
    return output;
}

@fragment
fn fragment_main(@location(0) frag_position: vec4<f32>) -> @location(0) vec4<f32> {
    return frag_position;
}
