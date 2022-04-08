import { PianorollEntry } from "./pianoroll-entry.js";

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

function setListeners(element) {
  return ([eventType, listener]) => {
    element.addEventListener(eventType, listener);
  };
}

/**
 *
 * @param {*} element
 * @param {*} handlers
 */
export function listen(element, handlers = {}) {
  Object.entries(handlers).forEach(setListeners(element));
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
