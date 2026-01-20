/*
 * SPDX-License-Identifier: BSD-3-Clause
 * SPDX-FileCopyrightText: Copyright (c) 2025 ViXion Inc. All Rights Reserved.
 */
/**
 * @file fn.h
 * @brief Function return type definitions
 * @details Defines common return values used throughout the codebase
 */
#ifndef LIB_FN_H
#define LIB_FN_H

/**
 * @typedef fn_t
 * @brief Function return type used throughout the codebase
 */
typedef enum {
  kUndetermined = 0x00000000U, /**< Initial state, not yet determined */
  kInitialized = 0x0F0F0F0FU,  /**< Initialization completed */
  kSuccess = 0x5A5A5A5AU,      /**< Operation completed successfully */
  kFailure = 0xFFFFFFFFU       /**< Operation failed */
} fn_t;

#endif
