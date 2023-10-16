struct VertexOutput {
    @builtin(position) Position: vec4<f32>,
    @location(0) color: vec4<f32>,
}

struct ViewProjection {
    view: mat4x4<f32>,
    projection: mat4x4<f32>,
}

@binding(0) @group(0)
var<uniform> view_projection : ViewProjection;

@binding(0) @group(1)
var<uniform> model : mat4x4<f32>;

@vertex
fn vertex_main(@location(0) position: vec3<f32>) -> VertexOutput {
    var output: VertexOutput;

    var position_v4: vec4<f32> = vec4(position * 100000, 1.0);
    output.Position = view_projection.projection * view_projection.view * model * position_v4;
    output.color = abs(vec4<f32>(0.0, 0.3, 0.0, 1) + 100 * (model * position_v4));
    return output;
}

@fragment
fn fragment_main(@location(0) color: vec4<f32>) -> @location(0) vec4<f32> {
    return color;
}