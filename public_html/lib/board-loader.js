/*
 * SPDX-License-Identifier: BSD-3-Clause
 * SPDX-FileCopyrightText: Copyright (c) 2026 YAMASHIRO Yoshihiro All Rights Reserved.
 */

/**
 * Board Loader - Dynamically loads and manages board configurations
 * Enables switching between different microcontroller boards without
 * recompiling the C/WASM code.
 */

class BoardLoader {
  constructor() {
    this.currentBoard = null;
    this.currentBoardId = null;
    this.loadedScripts = [];
    
    // Available boards registry
    this.availableBoards = [
      {
        id: 'xiao-nrf54l15',
        name: 'XIAO nRF54L15',
        path: 'boards/xiao-nrf54l15'
      }
    ];
  }

  /**
   * Load a script dynamically
   * @param {string} path - Path to the script file
   * @returns {Promise} Resolves when script is loaded
   */
  loadScript(path) {
    return new Promise((resolve, reject) => {
      // Check if script is already loaded
      const existingScript = document.querySelector(`script[src="${path}"]`);
      if (existingScript) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = path;
      script.onload = () => {
        this.loadedScripts.push(script);
        resolve();
      };
      script.onerror = () => {
        reject(new Error(`Failed to load script: ${path}`));
      };
      document.head.appendChild(script);
    });
  }

  /**
   * Unload previously loaded board scripts
   */
  unloadScripts() {
    for (const script of this.loadedScripts) {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    }
    this.loadedScripts = [];
  }

  /**
   * Load a board configuration
   * @param {string} boardPath - Path to the board directory
   * @returns {Promise} Resolves when all board files are loaded
   */
  async loadBoard(boardPath) {
    // Load board configuration files in order
    await this.loadScript(`${boardPath}/board-config.js`);
    await this.loadScript(`${boardPath}/ui-components.js`);
    await this.loadScript(`${boardPath}/api-definitions.js`);
  }

  /**
   * Switch to a different board
   * @param {string} boardId - The board ID to switch to
   * @param {HTMLElement} uiContainer - Container for board UI
   * @returns {Promise<boolean>} True if switch was successful
   */
  async switchBoard(boardId, uiContainer) {
    // Find the board configuration
    const boardInfo = this.availableBoards.find(b => b.id === boardId);
    if (!boardInfo) {
      console.error(`Board not found: ${boardId}`);
      return false;
    }

    // Cleanup current board if any
    if (this.currentBoard) {
      this.cleanupBoard(uiContainer);
    }

    try {
      // Load the new board
      await this.loadBoard(boardInfo.path);

      // Store reference to loaded config
      this.currentBoard = window.BOARD_CONFIG;
      this.currentBoardId = boardId;

      // Create the UI
      if (typeof window.createBoardUI === 'function' && uiContainer) {
        window.createBoardUI(uiContainer, this.currentBoard);
      }

      // Note: definePixelsAPI is now called from mrubycOnTaskCreated callback
      // after bytecode is loaded but before execution. This ensures symbol IDs
      // match between method definitions and bytecode.

      return true;
    } catch (error) {
      console.error(`Failed to load board ${boardId}:`, error);
      return false;
    }
  }

  /**
   * Cleanup the current board UI only
   * Note: API callback cleanup is handled atomically within definePixelsAPI
   * to prevent race conditions where PIXELS class methods reference invalid
   * function pointers during board switching.
   * @param {HTMLElement} uiContainer - Container for board UI
   */
  cleanupBoard(uiContainer) {
    // Note: We do NOT call cleanupPixelsAPI here anymore.
    // The cleanup of old callbacks is now handled atomically within
    // definePixelsAPI - new callbacks are registered and methods are
    // updated BEFORE old callbacks are removed. This ensures the PIXELS
    // class always has valid function pointers.

    // Cleanup UI
    if (typeof window.cleanupBoardUI === 'function' && uiContainer) {
      window.cleanupBoardUI(uiContainer);
    }

    // Clear references
    this.currentBoard = null;
    this.currentBoardId = null;

    // Note: We don't unload scripts as they may be needed again
    // and reloading them would cause issues with the function table
  }

  /**
   * Get list of available boards
   * @returns {Array} Array of board info objects
   */
  getAvailableBoards() {
    return this.availableBoards;
  }

  /**
   * Get current board configuration
   * @returns {Object|null} Current board config or null
   */
  getCurrentBoard() {
    return this.currentBoard;
  }

  /**
   * Check if a board is currently loaded
   * @returns {boolean} True if a board is loaded
   */
  isBoardLoaded() {
    return this.currentBoard !== null;
  }

  /**
   * Register a new board
   * @param {Object} boardInfo - Board information object
   * @param {string} boardInfo.id - Unique board ID
   * @param {string} boardInfo.name - Display name
   * @param {string} boardInfo.path - Path to board files
   */
  registerBoard(boardInfo) {
    // Check if board already exists
    const existing = this.availableBoards.find(b => b.id === boardInfo.id);
    if (existing) {
      console.warn(`Board ${boardInfo.id} already registered, updating...`);
      Object.assign(existing, boardInfo);
    } else {
      this.availableBoards.push(boardInfo);
    }
  }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.BoardLoader = BoardLoader;
}
