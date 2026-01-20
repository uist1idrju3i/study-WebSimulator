/*
 * mruby/c WebAssembly Simulator - Application JavaScript
*/

let mrubycModule = null;
let isRunning = false;

const statusIndicator = document.getElementById('statusIndicator');
const statusText = document.getElementById('statusText');
const versionInfo = document.getElementById('versionInfo');
const output = document.getElementById('output');
const runSampleBtn = document.getElementById('runSampleBtn');
const runCustomBtn = document.getElementById('runCustomBtn');
const clearBtn = document.getElementById('clearBtn');
const bytecodeFile = document.getElementById('bytecodeFile');

let customBytecode = null;

function setStatus(status, text) {
  statusIndicator.className = 'status-indicator ' + status;
  statusText.textContent = text;
}

function appendOutput(text, className) {
  className = className || '';
  const span = document.createElement('span');
  if (className) span.className = className;
  span.textContent = text;
  output.appendChild(span);
  output.scrollTop = output.scrollHeight;
}

function clearOutput() {
  output.innerHTML = '';
}

window.mrubycOutput = function(text) {
  appendOutput(text);
};

window.mrubycError = function(text) {
  appendOutput(text, 'error');
};

async function initModule() {
  try {
    mrubycModule = await createMrubycModule();
    
    mrubycModule._mrbc_wasm_init();
    
    versionInfo.textContent = 'mruby/c module initialized';
    
    setStatus('ready', 'mruby/c module ready');
    runSampleBtn.disabled = false;
    
    appendOutput('[INFO] mruby/c WebAssembly module loaded successfully.\n', 'info');
  } catch (error) {
    setStatus('error', 'Failed to load module: ' + error.message);
    appendOutput('[ERROR] Failed to load mruby/c module: ' + error.message + '\n', 'error');
  }
}

async function runBytecode(bytecode) {
  if (!mrubycModule || isRunning) return;
  
  isRunning = true;
  setStatus('running', 'Running bytecode...');
  runSampleBtn.disabled = true;
  runCustomBtn.disabled = true;
  
  appendOutput('\n--- Execution Start ---\n', 'info');
  
  let bytecodePtr = 0;
  try {
    bytecodePtr = mrubycModule._malloc(bytecode.length);
    if (!bytecodePtr) {
      throw new Error('Memory allocation failed in WebAssembly module.');
    }
    const heapU8 = new Uint8Array(mrubycModule.wasmMemory.buffer);
    heapU8.set(bytecode, bytecodePtr);
    
    const result = mrubycModule._mrbc_wasm_run(bytecodePtr, bytecode.length);
    
    appendOutput('\n--- Execution End (return: ' + result + ') ---\n', 'info');
    
    if (result === 0) {
      appendOutput('[SUCCESS] Program completed successfully.\n', 'success');
    } else {
      appendOutput('[WARNING] Program returned non-zero: ' + result + '\n', 'error');
    }
  } catch (error) {
    appendOutput('\n[ERROR] Execution failed: ' + error.message + '\n', 'error');
  } finally {
    if (bytecodePtr) {
      mrubycModule._free(bytecodePtr);
    }
    isRunning = false;
    setStatus('ready', 'mruby/c module ready');
    runSampleBtn.disabled = false;
    runCustomBtn.disabled = customBytecode === null;
  }
}

runSampleBtn.addEventListener('click', function() {
  if (typeof SAMPLE_BYTECODE !== 'undefined') {
    runBytecode(new Uint8Array(SAMPLE_BYTECODE));
  } else {
    appendOutput('[ERROR] Sample bytecode not loaded.\n', 'error');
  }
});

const MAX_FILE_SIZE = 1024 * 1024; // 1MB limit

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' bytes';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

bytecodeFile.addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (file) {
    if (file.size > MAX_FILE_SIZE) {
      appendOutput('[ERROR] File too large: ' + file.name + ' (' + formatFileSize(file.size) + '). Maximum size is 1MB.\n', 'error');
      customBytecode = null;
      runCustomBtn.disabled = true;
      return;
    }
    const reader = new FileReader();
    reader.onload = function(event) {
      customBytecode = new Uint8Array(event.target.result);
      appendOutput('[INFO] Loaded bytecode file: ' + file.name + ' (' + customBytecode.length + ' bytes)\n', 'info');
      runCustomBtn.disabled = !mrubycModule || isRunning;
    };
    reader.onerror = function() {
      appendOutput('[ERROR] Failed to read file: ' + file.name + '\n', 'error');
      customBytecode = null;
      runCustomBtn.disabled = true;
    };
    reader.readAsArrayBuffer(file);
  }
});

runCustomBtn.addEventListener('click', function() {
  if (customBytecode) {
    runBytecode(customBytecode);
  }
});

clearBtn.addEventListener('click', clearOutput);

initModule();
