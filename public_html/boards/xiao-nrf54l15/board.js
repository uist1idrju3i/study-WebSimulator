export class BoardAPI {
  constructor(wasmModule) {
    this.module = wasmModule;
    this.maxLEDs = 60;
  }

  async initialize() {
    try {
      const classObject = this.module._mrbc_wasm_get_class_object();
      if (!classObject) {
        throw new Error('Failed to get class object');
      }

      const pixelsClass = this.module.ccall(
        'mrbc_wasm_define_class',
        'number',
        ['string', 'number'],
        ['PIXELS', classObject]
      );
      if (!pixelsClass) {
        throw new Error('Failed to define PIXELS class');
      }

      this.setupPixelMethods();
    } catch (error) {
      console.error('Board initialization failed:', error);
      throw error;
    }
  }

  setupPixelMethods() {
    window.pixelSet = this.pixelSet.bind(this);
    window.pixelUpdate = this.pixelUpdate.bind(this);
  }

  pixelSet(index, red, green, blue) {
    if (!Number.isInteger(index) || index < 0 || index >= this.maxLEDs) {
      console.error(`Invalid LED index: ${index}`);
      return;
    }

    const validateColor = (val) => Number.isInteger(val) && val >= 0 && val <= 255;
    if (!validateColor(red) || !validateColor(green) || !validateColor(blue)) {
      console.error(`Invalid RGB values: ${red}, ${green}, ${blue}`);
      return;
    }

    const element = document.getElementById(String(index));
    if (element) {
      element.style.backgroundColor = `rgb(${red}, ${green}, ${blue})`;
    }
  }

  pixelUpdate() {
  }
}
