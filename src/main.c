/*! @file
  @brief
  Main entry point for mruby/c WebAssembly module.
*/

#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <emscripten.h>
#include "mrubyc.h"

#if !defined(MRBC_MEMORY_SIZE)
#define MRBC_MEMORY_SIZE (1024 * 40)
#endif

static uint8_t memory_pool[MRBC_MEMORY_SIZE];
static int initialized = 0;

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
  (void)size;  /* Parameter reserved for future bytecode validation */

  if (!initialized) {
    mrbc_wasm_init();
  }

  mrbc_tcb *tcb = mrbc_create_task(bytecode, NULL);
  if (tcb == NULL) {
    mrbc_cleanup();
    initialized = 0;
    mrbc_wasm_init();
    return -1;
  }

  int ret = mrbc_run();
  mrbc_cleanup();

  initialized = 0;
  mrbc_wasm_init();

  return ret == 1 ? 0 : ret;
}

EMSCRIPTEN_KEEPALIVE
const char* mrbc_wasm_version(void)
{
  /* Note: Update this version when upgrading mruby/c submodule.
     mruby/c does not provide a C preprocessor macro for the version string. */
  return "3.4";
}

int main(void)
{
  mrbc_wasm_init();
  return 0;
}
