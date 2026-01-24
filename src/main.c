/*! @file
  @brief
  Main entry point for mruby/c WebAssembly module.
*/

#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <string.h>
#include <emscripten.h>
#include "mrubyc.h"
#include "hal.h"

#if !defined(MRBC_MEMORY_SIZE)
#define MRBC_MEMORY_SIZE (1024 * 40)
#endif

#define MIN_BYTECODE_SIZE 8
#define MAX_BYTECODE_SIZE (1024 * 1024)

#define MAX_REGISTERED_METHODS 32
#define MAX_CLASS_NAME_LENGTH 64
#define MAX_METHOD_NAME_LENGTH 64

static uint8_t memory_pool[MRBC_MEMORY_SIZE];
static int initialized = 0;

static int validate_string(const char* str, size_t max_length) {
  if (!str) return 0;
  size_t len = strnlen(str, max_length + 1);
  return len > 0 && len <= max_length;
}

EMSCRIPTEN_KEEPALIVE
void* mrbc_wasm_define_class(const char* name, void* super_class) {
  if (!validate_string(name, MAX_CLASS_NAME_LENGTH)) {
    return NULL;
  }
  return mrbc_define_class(0, name, super_class ? super_class : mrbc_class_object);
}

EMSCRIPTEN_KEEPALIVE
void mrbc_wasm_define_method(void* class_ptr, const char* name, mrbc_func_t func_ptr) {
  if (!class_ptr || !validate_string(name, MAX_METHOD_NAME_LENGTH) || !func_ptr) {
    return;
  }
  mrbc_define_method(0, (mrbc_class*)class_ptr, name, func_ptr);
}

EMSCRIPTEN_KEEPALIVE
void* mrbc_wasm_get_class_object(void) {
  return mrbc_class_object;
}

typedef void (*js_method_func)(mrbc_vm*, mrbc_value*, int);
static js_method_func registered_methods[MAX_REGISTERED_METHODS];
static int method_count = 0;

EMSCRIPTEN_KEEPALIVE
int mrbc_wasm_register_method(void) {
  if (method_count >= MAX_REGISTERED_METHODS) {
    return -1;
  }
  return method_count++;
}

static void method_wrapper_0(mrbc_vm* vm, mrbc_value* v, int argc) {
  if (registered_methods[0]) registered_methods[0](vm, v, argc);
}

static void output_error(const char *message)
{
  hal_write(2, message, (int)strlen(message));
}

static void output_info(const char *message)
{
  hal_write(1, message, (int)strlen(message));
}

EMSCRIPTEN_KEEPALIVE
void mrbc_wasm_init(void)
{
  if (!initialized) {
    mrbc_init(memory_pool, MRBC_MEMORY_SIZE);
    initialized = 1;
  }
}

EMSCRIPTEN_KEEPALIVE
int mrbc_wasm_run(const uint8_t *bytecode, int size)
{
  char buffer[256];

  if (bytecode == NULL) {
    output_error("[ERROR] Bytecode pointer is NULL.\n");
    return -1;
  }

  if (size < MIN_BYTECODE_SIZE) {
    snprintf(buffer, sizeof(buffer),
      "[ERROR] Bytecode size too small: %d bytes (minimum: %d bytes).\n",
      size, MIN_BYTECODE_SIZE);
    output_error(buffer);
    return -2;
  }

  if (size > MAX_BYTECODE_SIZE) {
    snprintf(buffer, sizeof(buffer),
      "[ERROR] Bytecode size too large: %d bytes (maximum: %d bytes).\n",
      size, MAX_BYTECODE_SIZE);
    output_error(buffer);
    return -3;
  }

  if (bytecode[0] != 'R' || bytecode[1] != 'I' ||
      bytecode[2] != 'T' || bytecode[3] != 'E') {
    output_error("[ERROR] Invalid bytecode format: missing RITE header.\n");
    return -4;
  }

  if (!initialized) {
    mrbc_wasm_init();
  }

  mrbc_tcb *tcb = mrbc_create_task(bytecode, NULL);
  if (tcb == NULL) {
    output_error("[ERROR] Failed to create task.\n");
    output_error("  Possible causes:\n");
    output_error("  - Insufficient memory in VM pool\n");
    output_error("  - Invalid or corrupted bytecode\n");
    output_error("  - VM state is abnormal\n");
    snprintf(buffer, sizeof(buffer),
      "  Memory pool size: %d bytes\n", MRBC_MEMORY_SIZE);
    output_error(buffer);
    mrbc_cleanup();
    initialized = 0;
    mrbc_wasm_init();
    return -5;
  }

  int ret = mrbc_run();
  mrbc_cleanup();

  initialized = 0;
  mrbc_wasm_init();

  return ret == 1 ? 0 : ret;
}

EMSCRIPTEN_KEEPALIVE
void mrbc_wasm_print_statistics(void)
{
  mrbc_alloc_print_statistics();
}

int main(void)
{
  mrbc_wasm_init();
  return 0;
}
