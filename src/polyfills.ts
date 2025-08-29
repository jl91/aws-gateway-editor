/**
 * This file includes polyfills needed by Angular and is loaded before the app.
 * You can add your own extra polyfills to this file.
 */

/***************************************************************************************************
 * Zone JS is required by default for Angular itself.
 */
import 'zone.js';  // Included with Angular CLI.

/***************************************************************************************************
 * APPLICATION IMPORTS
 */

// Add global to window for libraries that expect it
(window as any).global = window;

// Polyfill for process
(window as any).process = {
  env: { DEBUG: undefined },
  version: '',
  nextTick: function(fn: Function) {
    return setTimeout(fn, 0);
  }
};

// Polyfill for Buffer
if (typeof (window as any).Buffer === 'undefined') {
  (window as any).Buffer = require('buffer/').Buffer;
}