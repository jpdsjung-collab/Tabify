/**
 * DOM utility helpers.
 */

/**
 * Select a single element by CSS selector.
 * @param {string} selector
 * @param {ParentNode} [root=document]
 * @returns {HTMLElement|null}
 */
export function $(selector, root = document) {
  return root.querySelector(selector);
}

/**
 * Select all elements matching a CSS selector.
 * @param {string} selector
 * @param {ParentNode} [root=document]
 * @returns {NodeListOf<Element>}
 */
export function $$(selector, root = document) {
  return root.querySelectorAll(selector);
}

/**
 * Toggle a CSS class on an element.
 * @param {HTMLElement} el
 * @param {string} className
 * @param {boolean} [force]
 */
export function toggleClass(el, className, force) {
  if (!el) return;
  el.classList.toggle(className, force);
}

/**
 * Show an element (remove hidden class).
 * @param {HTMLElement} el
 */
export function show(el) {
  if (el) el.classList.remove('hidden');
}

/**
 * Hide an element (add hidden class).
 * @param {HTMLElement} el
 */
export function hide(el) {
  if (el) el.classList.add('hidden');
}

/**
 * Clear all child nodes from an element.
 * @param {HTMLElement} el
 */
export function clearChildren(el) {
  if (el) el.replaceChildren();
}
