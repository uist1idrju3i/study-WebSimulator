export class BoardAPI {
  constructor(wasmModule) {
    this.module = wasmModule;
    this.maxLEDs = 60;
  }

  async initialize() {
    try {
      this.createDotElements();
      this.setupPixelMethods();
      this.module._mrbc_wasm_define_pixels_class();
    } catch (error) {
      console.error('Board initialization failed:', error);
      throw error;
    }
  }

  createDotElements() {
    const container = document.getElementById('dot-container');
    if (!container) {
      throw new Error('dot-container element not found');
    }

    container.innerHTML = '';

    for (let i = 0; i < this.maxLEDs; i++) {
      const dot = document.createElement('div');
      dot.id = String(i);
      dot.className = 'dot';
      dot.textContent = String(i);
      container.appendChild(dot);
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
