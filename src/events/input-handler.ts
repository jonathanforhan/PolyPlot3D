export type KeyBinding = {
  key: string,
  callback(dt: number): void,
};

export type MouseBinding = {
  callback(x: number, y: number): void,
}

type BindingEntry = {
  callback(dt: number): void,
  state: boolean,
};

/* Binds call back and loop them, looping is with respect to delta time */
export class InputHandler {
  private readonly bindings: Record<string, BindingEntry> = {};
  private mouseBinding?: MouseBinding;

  public bindMouse(binding: MouseBinding) {
    this.mouseBinding = binding;
  }

  public bindKey(binding: KeyBinding) {
    this.bindings[binding.key] = { callback: binding.callback, state: false };
  }

  public apply() {
    document.addEventListener('keydown', e => {
      if (this.bindings[e.key] !== undefined) {
        this.bindings[e.key].state = true;
      }
    });

    document.addEventListener('keyup', e => {
      if (this.bindings[e.key] !== undefined) {
        this.bindings[e.key].state = false;
      }
    });

    document.addEventListener('mousemove', e => {
      if (document.pointerLockElement) {
        this.mouseBinding?.callback(e.movementX, -e.movementY);
      }
    });
  }

  public loopCallbacks(dt: number) {
    if (document.pointerLockElement) {
      Object.values(this.bindings).forEach(binding => {
        binding.state && binding.callback(dt);
      });
    }
  }
}
