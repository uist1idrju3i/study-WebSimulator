/*
 * mruby/c WebAssembly Simulator - Application JavaScript
*/

let mrubycModule = null;
let isRunning = false;
let boardLoader = null;

const statusIndicator = document.getElementById('statusIndicator');
const statusText = document.getElementById('statusText');
const versionInfo = document.getElementById('versionInfo');
const output = document.getElementById('output');
const runSampleBtn = document.getElementById('runSampleBtn');
const runCustomBtn = document.getElementById('runCustomBtn');
const clearBtn = document.getElementById('clearBtn');
const showStatsBtn = document.getElementById('showStatsBtn');
const bytecodeFile = document.getElementById('bytecodeFile');
const boardSelector = document.getElementById('boardSelector');
const boardUIContainer = document.getElementById('boardUIContainer');

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

// Callback called after bytecode is loaded but before execution
// This is the right time to define board APIs so symbol IDs match
window.mrubycOnTaskCreated = function() {
  if (boardLoader && mrubycModule && typeof window.definePixelsAPI === 'function') {
    window.definePixelsAPI(mrubycModule);
  }
};

async function initModule() {
  try {
    mrubycModule = await createMrubycModule();
    
    mrubycModule._mrbc_wasm_init();
    
    versionInfo.textContent = 'mruby/c module initialized';
    
    // Initialize board loader
    boardLoader = new BoardLoader();
    boardLoader.setModule(mrubycModule);
    
    // Populate board selector
    const boards = boardLoader.getAvailableBoards();
    boards.forEach(board => {
      const option = document.createElement('option');
      option.value = board.id;
      option.textContent = board.name;
      boardSelector.appendChild(option);
    });
    
    // Auto-select first board if available
    if (boards.length > 0) {
      boardSelector.value = boards[0].id;
      await boardLoader.switchBoard(boards[0].id, boardUIContainer);
      appendOutput('[INFO] Board loaded: ' + boards[0].name + '\n', 'info');
    }
    
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
    
    // Use ccall with async: true to properly handle ASYNCIFY
    // This ensures that emscripten_sleep calls are properly awaited
    const result = await mrubycModule.ccall(
      'mrbc_wasm_run',
      'number',
      ['number', 'number'],
      [bytecodePtr, bytecode.length],
      { async: true }
    );
    
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

// Board selector change handler
boardSelector.addEventListener('change', async function(e) {
  const boardId = e.target.value;
  if (!boardId) {
    // Clear board UI if no board selected
    if (boardLoader) {
      boardLoader.cleanupBoard(boardUIContainer);
    }
    return;
  }
  
  if (boardLoader && mrubycModule) {
    const success = await boardLoader.switchBoard(boardId, boardUIContainer);
    if (success) {
      const board = boardLoader.getCurrentBoard();
      appendOutput('[INFO] Board switched to: ' + board.name + '\n', 'info');
    } else {
      appendOutput('[ERROR] Failed to switch board.\n', 'error');
    }
  }
});

showStatsBtn.addEventListener('click', function() {
  if (mrubycModule) {
    appendOutput('\n--- VM Statistics ---\n', 'info');
    mrubycModule._mrbc_wasm_print_statistics();
    appendOutput('--- End Statistics ---\n', 'info');
  } else {
    appendOutput('[ERROR] mruby/c module not loaded.\n', 'error');
  }
});

initModule();
