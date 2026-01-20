# Makefile for building mruby/c WebAssembly module with Emscripten

# Directories
MRUBYC_DIR = mrubyc
MRUBYC_SRC_DIR = $(MRUBYC_DIR)/src
SRC_DIR = src
HAL_DIR = $(SRC_DIR)/lib/mrubyc
BUILD_DIR = public_html

# Emscripten compiler
CC = emcc

# Compiler flags
# Note: -flto is removed because Link-Time Optimization can interfere with
# Emscripten's ASYNCIFY by inlining functions across compilation units,
# which confuses the ASYNCIFY call graph analysis.
CFLAGS = -O3 \
         -I$(MRUBYC_SRC_DIR) \
         -I$(HAL_DIR) \
         -DMRBC_SCHEDULER_EXIT=1 -DMRBC_USE_FLOAT=1 -DMRBC_USE_MATH=1 -DMAX_VM_COUNT=5 \
         -DNDEBUG

# Emscripten specific flags
# ASYNCIFY_STACK_SIZE is increased from the default 4096 to 16384 bytes
# to accommodate the mruby/c VM's deeper call stack when sleep_ms is called.
# ASYNCIFY_ADD uses wildcard pattern to ensure all functions that may be in
# the call stack when emscripten_sleep is called are properly asyncified.
# This is necessary because -O3 optimization can inline functions, which may
# confuse ASYNCIFY's automatic detection.
EMFLAGS = -s WASM=1 \
          -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString","wasmMemory"]' \
          -s EXPORTED_FUNCTIONS='["_main","_mrbc_wasm_init","_mrbc_wasm_run","_malloc","_free"]' \
          -s ALLOW_MEMORY_GROWTH=1 \
          -s ASYNCIFY \
          -s ASYNCIFY_STACK_SIZE=16384 \
          -s 'ASYNCIFY_ADD=["mrbc_*","hal_*","main"]' \
          -s ASYNCIFY_IMPORTS='["emscripten_sleep"]' \
          -s MODULARIZE=1 \
          -s EXPORT_NAME='createMrubycModule' \
          --no-entry

# mruby/c source files
MRUBYC_SRCS = $(MRUBYC_SRC_DIR)/alloc.c \
              $(MRUBYC_SRC_DIR)/c_array.c \
              $(MRUBYC_SRC_DIR)/c_hash.c \
              $(MRUBYC_SRC_DIR)/c_math.c \
              $(MRUBYC_SRC_DIR)/c_numeric.c \
              $(MRUBYC_SRC_DIR)/c_object.c \
              $(MRUBYC_SRC_DIR)/c_proc.c \
              $(MRUBYC_SRC_DIR)/c_range.c \
              $(MRUBYC_SRC_DIR)/c_string.c \
              $(MRUBYC_SRC_DIR)/class.c \
              $(MRUBYC_SRC_DIR)/console.c \
              $(MRUBYC_SRC_DIR)/error.c \
              $(MRUBYC_SRC_DIR)/global.c \
              $(MRUBYC_SRC_DIR)/keyvalue.c \
              $(MRUBYC_SRC_DIR)/load.c \
              $(MRUBYC_SRC_DIR)/mrblib.c \
              $(MRUBYC_SRC_DIR)/rrt0.c \
              $(MRUBYC_SRC_DIR)/symbol.c \
              $(MRUBYC_SRC_DIR)/value.c \
              $(MRUBYC_SRC_DIR)/vm.c

# HAL source files
HAL_SRCS = $(HAL_DIR)/hal.c

# Main source files
MAIN_SRCS = $(SRC_DIR)/main.c \
             $(SRC_DIR)/api/pixels.c

# All source files
SRCS = $(MRUBYC_SRCS) $(HAL_SRCS) $(MAIN_SRCS)

# Output files
MRUBYC_BUILD_DIR = $(BUILD_DIR)/mrubyc
OUTPUT_JS = $(MRUBYC_BUILD_DIR)/mrubyc.js
OUTPUT_WASM = $(MRUBYC_BUILD_DIR)/mrubyc.wasm

# Default target
all: $(MRUBYC_BUILD_DIR) $(OUTPUT_JS)

# Create build directory
$(MRUBYC_BUILD_DIR):
	mkdir -p $(MRUBYC_BUILD_DIR)

# Build WebAssembly module
$(OUTPUT_JS): $(SRCS)
	$(CC) $(CFLAGS) $(EMFLAGS) $(SRCS) -o $(OUTPUT_JS)

# Clean build artifacts
clean:
	rm -f $(OUTPUT_JS) $(OUTPUT_WASM)

# Rebuild
rebuild: clean all

# Help
help:
	@echo "mruby/c WebAssembly Build System"
	@echo ""
	@echo "Targets:"
	@echo "  all      - Build the WebAssembly module (default)"
	@echo "  clean    - Remove build artifacts"
	@echo "  rebuild  - Clean and rebuild"
	@echo "  help     - Show this help message"
	@echo ""
	@echo "Before building, make sure to activate Emscripten:"
	@echo "  source emsdk/emsdk_env.sh"

.PHONY: all clean rebuild help
