/*
 * SPDX-License-Identifier: BSD-3-Clause
 * SPDX-FileCopyrightText: Copyright (c) 2026 YAMASHIRO Yoshihiro All Rights
 * Reserved.
 */
/**
 * @file pixels.h
 * @brief PIXELS API for mruby/c
 * @details Defines the PIXELS class and methods for mruby/c scripts to control
 * LED_Strip
 */
#ifndef API_PIXELS_H
#define API_PIXELS_H

#include "../lib/fn.h"

/**
 * @brief Defines the PIXELS class and methods for mruby/c
 *
 * @return fn_t kSuccess if successful, kFailure otherwise
 */
fn_t api_pixels_define(void);

#endif
