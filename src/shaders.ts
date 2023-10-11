// location 0 in vec4 position;
// location 1 in vec4 colorIn;
// location 0 out vec4 colorOut;
// outputs gl_Position as well
const defaultShader = `
struct VertexOut {
  @builtin(position) position : vec4f,
  @location(0) color : vec4f
}

@vertex
fn vertex_main(@location(0) position: vec4f, @location(1) color: vec4f) -> VertexOut {
  var output: VertexOut;
  output.position = position;
  output.color = color;
  return output;
}

@fragment
fn fragment_main(fragData: VertexOut) -> @location(0) vec4f {
  return fragData.color;
}
`;

export { defaultShader }

