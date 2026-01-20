/*! @file
  @brief
  Main entry point for mruby/c WebAssembly module.

  <pre>
  Copyright (C) 2015- Kyushu Institute of Technology.
  Copyright (C) 2015- Shimane IT Open-Innovation Center.

  This file is distributed under BSD 3-Clause License.
  </pre>
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
  if (!initialized) {
    mrbc_wasm_init();
  }

  mrbc_tcb *tcb = mrbc_create_task(bytecode, NULL);
  if (tcb == NULL) {
    return -1;
  }

  int ret = mrbc_run();
  mrbc_cleanup();

  mrbc_init(memory_pool, MRBC_MEMORY_SIZE);

  return ret == 1 ? 0 : ret;
}

EMSCRIPTEN_KEEPALIVE
const char* mrbc_wasm_version(void)
{
  return "3.4";
}

int main(void)
{
  mrbc_wasm_init();
  return 0;
}
