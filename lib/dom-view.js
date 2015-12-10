'use strict'
const domify = require('domify')
const EventEmitter = require('events').EventEmitter

/**
 * @module dom-view
 */

/**
 * `data-bind="attribute:property"`
 * `data-event="domEvent:ourEvent"`
 */
class View extends EventEmitter {
  constructor (options) {
    super()
    this.html = options.html
    this.el = domify(this.html)
    this.viewModel = new Map()
    objToMap(this.viewModel, options.viewModel)
    this.viewModel.forEach((value, key) => this.set(key, value))
    this.bindEvents()
    this.observeDom()
    if (options.appendTo) this.appendTo(options.appendTo)
    if (options.replaceWith) this.replaceWith(options.replaceWith)
  }
  appendTo (parentElement) {
    if (typeof parentElement === 'string') parentElement = document.querySelector(parentElement);
    if (parentElement){
      if (parentElement.el) parentElement = parentElement.el;
      this.el = parentElement.appendChild(this.el);
    }
    return this
  }
  remove () {
    this.el.remove()
    this.el = null
    this.emit('removed')
  }
  replaceWith (element) {
    if (typeof element === 'string') element = document.querySelector(element);
    element.parentNode.replaceChild(element, this.el)
  }
  get (prop) {
    return this.viewModel.get(prop)
  }
  set (prop, value) {
    this.viewModel.set(prop, value)
    let boundElements = Array.from(this.el.querySelectorAll(`[data-bind*="${prop}"]`))
    if (value instanceof View) {
      boundElements.forEach(el => {
        value.appendTo(el)
      })
    } else {
      boundElements.forEach(el => {
        const dataVm = el.getAttribute('data-bind')
        dataVm.split(',').forEach(attr => {
          const bind = getBindValues(attr)
          if (bind.viewProperty === prop) {
            el.setAttribute(bind.attr, value)
            el[bind.attr] = value
          }
        })
      })
    }
    return this
  }
  bindEvents () {
    Array.from(this.el.querySelectorAll('[data-event]'))
      .forEach(el => {
        let eventSplit = el.getAttribute('data-event').split(':')
        el.addEventListener(eventSplit[0], e => {
          this.emit(eventSplit[1], e)
        })
      })
    return this
  }
  observeDom () {
    Array.from(this.el.querySelectorAll('[data-bind]'))
      .forEach(el => {
        this.observeElement(el, 'change', getBindValues(el.getAttribute('data-bind')).viewProperty)
      })
    return this
  }
  observeElement (el, event, boundProperty) {
    el.addEventListener(event, e => {
      this.viewModel.set(boundProperty, el.value)
    })
  }
}

function objToMap (map, object) {
  for (let prop in object) {
    map.set(prop, object[prop])
  }
}

function getBindValues (attr) {
  const split = attr.split(':')
  if (split.length === 1) {
    return { attr: 'textContent', viewProperty: split[0] }
  } else {
    return { attr: split[0], viewProperty: split[1] }
  }
}

module.exports = View

// TODO: if data-bind="property" on an <input>, assume dev meant data-bind="value:property"
// TODO: data-event="submit" shorthand for data-event="click:submit"
