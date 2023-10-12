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
    this.position = vec3.fromValues(0, 1.8, 3);
    this.front = vec3.fromValues(0, 0, -1);
    this.up = vec3.fromValues(0, 1, 0);
    this.x = 0;
    this.y = 0;
    this.yaw = 90;
    this.pitch = 0;
    this.fov = 45;
  }

  public translateForward(speed: number) {
    vec3.addScaled(this.position, this.front, speed, this.position);
  }

  public translateBackward(speed: number) {
    vec3.subtract(this.position, vec3.scale(this.front, speed), this.position);
  }

  public translateRight(speed: number) {
    vec3.addScaled(this.position, vec3.normalize(vec3.cross(this.front, this.up)), speed, this.position);
  }

  public translateLeft(speed: number) {
    vec3.subtract(this.position, vec3.scale(vec3.normalize(vec3.cross(this.front, this.up)), speed), this.position);
  }

  public translateUp(speed: number) {
    vec3.addScaled(this.position, this.up, speed, this.position);
  }

  public translateDown(speed: number) {
    vec3.subtract(this.position, vec3.scale(this.up, speed), this.position);
  }

  /* NOTE takes in Delta X and Delta Y */
  public lookAround(dx: number, dy: number) {
    const sensitivity = 0.1;
    dx *= sensitivity;
    dy *= sensitivity;

    this.yaw += dx;
    this.pitch += dy;

    if (this.pitch > 90) this.pitch = 90;
    if (this.pitch < -90) this.pitch = -90;

    let front = vec3.fromValues(
      Math.cos(degToRad(this.yaw)) * Math.cos(degToRad(this.pitch)),
      Math.sin(degToRad(this.pitch)),
      Math.sin(degToRad(this.yaw)) * Math.cos(degToRad(this.pitch)),
    )

    vec3.normalize(front, this.front);
  }

  public apply(view: Mat4) {
    mat4.lookAt(this.position, vec3.add(this.position, this.front), this.up, view);
  }
}
