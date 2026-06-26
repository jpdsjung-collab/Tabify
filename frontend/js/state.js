/**
 * Application state — single source of truth for UI data.
 */

/** @type {import('./state.js').AppState} */
const state = {
  selectedFile: null,
  previewUrl: null,
  jobId: null,
  tabResult: null,
  isUploading: false,
  isProcessing: false,
  systemStatus: null,
};

/**
 * Update state and optionally notify listeners.
 * @param {Partial<typeof state>} patch
 */
export function setState(patch) {
  Object.assign(state, patch);
}

/**
 * Get current read-only state snapshot.
 * @returns {typeof state}
 */
export function getState() {
  return state;
}

/**
 * Reset state for a new conversion.
 */
export function resetState() {
  if (state.previewUrl) {
    URL.revokeObjectURL(state.previewUrl);
  }
  state.selectedFile = null;
  state.previewUrl = null;
  state.jobId = null;
  state.tabResult = null;
  state.isUploading = false;
  state.isProcessing = false;
}

export default state;
