'use strict'
const domify = require('domify')
const EventEmitter = require('events').EventEmitter

/**
 * @module dom-view
 */

/**
 * `data-bind="elementAttribute:viewModelProperty"`
 * `data-event="domEvent:ourEvent"`
 *
 * @param [options] {object}
 * @param [options.html] {string}
 * @param [options.viewModel] {object}
 * @param [options.appendTo] {string|element}
 * @param [options.replace]
 */
class View extends EventEmitter {
  constructor (options) {
    super()
    options = options || {}
    // if (!options.html) throw new Error('dom-view: options.html is required')
    if (!options.html) return
    this.html = options.html
    this.el = domify(this.html)
    this.viewModel = new Map()
    objToMap(this.viewModel, options.viewModel)
    this.viewModel.forEach((value, key) => this.set(key, value))
    bindEvents(this)
    observeDom(this)
    if (options.appendTo) this.appendTo(options.appendTo)
    if (options.prependTo) this.prependTo(options.prependTo)
    if (options.replace) this.replace(options.replace)
  }
  /**
   * @param {string|element}
   * @chainable
   */
  appendTo (parentElement) {
    if (typeof parentElement === 'string') parentElement = document.querySelector(parentElement)
    if (parentElement){
      if (parentElement.el) parentElement = parentElement.el
      const isFrag = this.el.constructor === DocumentFragment
      this.el = parentElement.appendChild(this.el)
      if (isFrag) this.el = parentElement
    }
    return this
  }

  /**
   * @param {string|element}
   * @chainable
   */
  prependTo (parentElement) {
    if (typeof parentElement === 'string') parentElement = document.querySelector(parentElement)
    if (parentElement){
      if (parentElement.el) parentElement = parentElement.el
      const isFrag = this.el.constructor === DocumentFragment
      this.el = parentElement.insertBefore(this.el, parentElement.firstChild)
      if (isFrag) this.el = parentElement
    }
    return this
  }

  /**
   * Replace the specified element or view with this view.
   * @param {string|element|view} - The element to be replaceChild
   * @chainable
   */
  replace (element) {
    if (typeof element === 'string') {
      element = document.querySelector(element)
    } else if (element instanceof View) {
      element = element.el
    }
    if (!element) throw new Error(`View.prototype.replace: invalid args [${element}]`)
    if (element.parentNode) element.parentNode.replaceChild(this.el, element)
    return this
  }

  remove () {
    this.el.remove()
    this.el = null
    this.emit('removed')
  }
  get (prop) {
    return this.viewModel.get(prop)
  }
  set (prop, value) {
    this.viewModel.set(prop, value)
    const selector = `[data-bind*="${prop}"]`
    let boundElements = Array.from(this.el.querySelectorAll(selector))

    /* IE and doc frags don't have `.matches()` */
    if (this.el.matches && this.el.matches(selector)) boundElements.push(this.el)

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
            /* make this optional, as `innerHTML="<blah>"` can get huge */
            // el.setAttribute(bind.attr, value)
            el[bind.attr] = value
          }
        })
      })
    }
    return this
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

function bindEvents (view) {
  const dataEvents = Array.from(view.el.querySelectorAll('[data-event]'))
  /* if the view itself is an element, check for events */
  if (view.el.getAttribute && view.el.getAttribute('data-event')) dataEvents.push(view.el)
  dataEvents
    .forEach(el => {
      let eventSplit = el.getAttribute('data-event').split(':')
      el.addEventListener(eventSplit[0], e => {
        view.emit(eventSplit[1], e)
      })
    })
  return view
}

function observeDom (view) {
  Array.from(view.el.querySelectorAll('[data-bind]'))
    .forEach(el => {
      observeElement(view, el, 'change', getBindValues(el.getAttribute('data-bind')).viewProperty)
    })
  return this
}
function observeElement (view, el, event, boundProperty) {
  el.addEventListener(event, e => {
    view.viewModel.set(boundProperty, el.value)
  })
}

module.exports = View

/*
TODO
- if data-bind="property" on an <input>, assume dev meant data-bind="value:property"
- data-event="submit" shorthand for data-event="click:submit"
- need event binding in the config (`{ click: clicked }`), no need for event-mapping to be in the DOM
- make model property attribute optional (modelValue="value")
*/
