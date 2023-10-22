import { mat4, Mat4, vec3, Vec3 } from "wgpu-matrix";

const degToRad = (deg: number) => deg * (Math.PI / 180);

export class Camera {
  public position: Vec3;
  public front: Vec3;
  public up: Vec3;
  public x: number;
  public y: number;
  public yaw: number;
  public pitch: number;
  public fov: number;

  constructor() {
    this.position = vec3.fromValues(0, 0, 0);
    this.front = vec3.fromValues(0, 0, -1);
    this.up = vec3.fromValues(0, 1, 0);
    this.x = 0;
    this.y = 0;
    this.yaw = 90;
    this.pitch = 0;
    this.fov = 45;

    // nice starting position for camera
    this.lookAround(0, 0);
    this.translateBackward(20);
    this.translateLeft(20);
    this.translateUp(10);
    this.lookAround(400, -100);
  }

  public translateForward(s: number) {
    let front = vec3.fromValues(this.front[0], 0, this.front[2]);
    vec3.normalize(front, front);
    vec3.addScaled(this.position, front, s, this.position);
  }

  public translateBackward(s: number) {
    let front = vec3.fromValues(this.front[0], 0, this.front[2]);
    vec3.normalize(front, front);
    vec3.addScaled(this.position, front, -s, this.position);
  }

  public translateRight(s: number) {
    let right = vec3.cross(this.front, this.up);
    vec3.normalize(right, right);
    vec3.addScaled(this.position, right, s, this.position);
  }

  public translateLeft(s: number) {
    let left = vec3.cross(this.front, this.up);
    vec3.normalize(left, left);
    vec3.addScaled(this.position, left, -s, this.position);
  }

  public translateUp(s: number) {
    vec3.addScaled(this.position, this.up, s, this.position);
  }

  public translateDown(s: number) {
    vec3.addScaled(this.position, this.up, -s, this.position);
  }

  /* NOTE takes in Delta X and Delta Y */
  public lookAround(dx: number, dy: number) {
    const sensitivity = 0.1;
    dx *= sensitivity;
    dy *= sensitivity;

    this.yaw += dx;
    this.pitch += dy;

    this.pitch = Math.max(-89, Math.min(this.pitch, 89));

    vec3.normalize(
      vec3.fromValues(
        Math.cos(degToRad(this.yaw)) * Math.cos(degToRad(this.pitch)),
        Math.sin(degToRad(this.pitch)),
        Math.sin(degToRad(this.yaw)) * Math.cos(degToRad(this.pitch)),
      ), this.front);
  }

  public apply(view: Mat4) {
    mat4.lookAt(this.position, vec3.add(this.position, this.front), this.up, view);
  }
}
