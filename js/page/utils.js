import { PianorollEntry } from "./pianoroll/pianoroll-entry.js";

function setAttrs(element) {
  return ([name, value]) => {
    element.setAttribute(name, value);
  };
}

/**
 *
 * @param {*} tag
 * @param {*} attributes
 * @param  {...any} content
 * @returns
 */
export function create(tag, attributes = {}, ...content) {
  let element;

  if ((element = customElements.get(tag))) {
    element = new element();
  } else {
    element = document.createElement(tag);
  }

  Object.entries(attributes).forEach(setAttrs(element));

  if (content)
    content.forEach((c) => {
      if (typeof c === `string`) {
        c = document.createTextNode(c);
      }
      element.appendChild(c);
    });

  return element;
}

/**
 * ...
 * @param {} qs
 * @param {*} parent
 * @returns
 */
export function find(qs, parent = document) {
  const nodes = parent.querySelectorAll(qs);
  if (nodes.length === 1) return nodes[0];
  return nodes;
}

const handlers = {};

export function listen(element, type, handler, opts = {}) {
  handlers[type] ??= [];
  const entry = { element, handler, opts };
  handlers[type].push(entry);
  element.addEventListener(type, handler, opts);
  return entry;
}

export function forget(element, type, handler = false) {
  // forget(entry)?
  if (element.element && element.handler && element.opts) {
    return removeSpecific(element);
  }

  // full function signature
  const elementListeners = handlers[type]?.filter(v => v.element === element);
  if (elementListeners.length === 0) return;
  if (handler) {
    removeSpecific(elementListeners.find(v => v.handler === handler))
  } else {
    elementListeners.forEach(removeSpecific);
  }
}

function removeSpecific(entry) {
  if (!entry) return;
  const { element, handler, opts } = entry;
  const pos = handlers[type].findIndex(v => v === entry);
  handlers[type].splice(pos, 1);
  element.removeEventListener(type, handler, opts);
}


/**
 *
 * @param {*} arr1
 * @param {*} arr2
 * @returns
 */
export function getDifference(arr1, arr2) {
  return arr1.map((v, i) => arr2[i] !== v);
}
