/*
 * SPDX-License-Identifier: BSD-3-Clause
 * SPDX-FileCopyrightText: Copyright (c) 2026 YAMASHIRO Yoshihiro All Rights
 * Reserved.
 */
/**
 * @file pixels.c
 * @brief Implementation of PIXELS API for mruby/c
 * @details Implements the PIXELS class and methods for mruby/c scripts to
 * control LED_Strip
 */
#include "pixels.h"

#include <stdbool.h>
#include <stdint.h>
#include <emscripten.h>

#include "../../mrubyc/src/mrubyc.h"
#include "../lib/fn.h"

/**
 * @brief Forward declaration for PIXELS control method
 *
 * @param vm The mruby/c VM instance
 * @param v The value array
 * @param argc The argument count
 */
static void c_set_pixel(mrb_vm* vm, mrb_value* v, int argc);
static void c_update_pixels(mrb_vm* vm, mrb_value* v, int argc);

/**
 * @brief Defines the PIXELS class and methods for mruby/c
 *
 * @return fn_t kSuccess if successful, kFailure otherwise
 */
fn_t api_pixels_define(void) {
  mrb_class* class_pixels;
  class_pixels = mrbc_define_class(0, "PIXELS", mrbc_class_object);
  mrbc_define_method(0, class_pixels, "set", c_set_pixel);
  mrbc_define_method(0, class_pixels, "update", c_update_pixels);
  return kSuccess;
}

EM_JS(void, js_led_strip_set, (const size_t kIndex, const uint8_t kRed,
                       const uint8_t kGreen, const uint8_t kBlue), {
  document.getElementById(`${kIndex}`).style.backgroundColor = `rgb(${kRed}, ${kGreen}, ${kBlue})`;
});

/**
 * @brief Updates the state of the LED strip
 *
 * @param vm The mruby/c VM instance
 * @param v The value array
 * @param argc The argument count
 */
static void c_set_pixel(mrb_vm* vm, mrb_value* v, int argc) {
  SET_FALSE_RETURN();
  // index
  if ((true == MRBC_ISNUMERIC(v[1])) && true == MRBC_ISNUMERIC(v[2]) &&
      true == MRBC_ISNUMERIC(v[3]) && true == MRBC_ISNUMERIC(v[4])) {
    js_led_strip_set(GET_INT_ARG(1), GET_INT_ARG(2), GET_INT_ARG(3), GET_INT_ARG(4));
    SET_TRUE_RETURN();
  }
}

/**
 * @brief Updates the state of the LED strip
 *
 * @param vm The mruby/c VM instance
 * @param v The value array
 * @param argc The argument count
 */
static void c_update_pixels(mrb_vm* vm, mrb_value* v, int argc) {
  SET_TRUE_RETURN();
}
