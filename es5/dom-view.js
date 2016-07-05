'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var domify = require('domify');
var EventEmitter = require('events').EventEmitter;

var View = function (_EventEmitter) {
  _inherits(View, _EventEmitter);

  function View(options) {
    _classCallCheck(this, View);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(View).call(this));

    options = options || {};

    if (!options.html) return _possibleConstructorReturn(_this);
    _this.html = options.html;
    _this.el = domify(_this.html);
    _this.viewModel = new Map();
    objToMap(_this.viewModel, options.viewModel);
    _this.viewModel.forEach(function (value, key) {
      return _this.set(key, value);
    });
    bindEvents(_this);
    observeDom(_this);
    if (options.appendTo) _this.appendTo(options.appendTo);
    if (options.prependTo) _this.prependTo(options.prependTo);
    if (options.replace) _this.replace(options.replace);
    return _this;
  }

  _createClass(View, [{
    key: 'appendTo',
    value: function appendTo(parentElement) {
      if (typeof parentElement === 'string') parentElement = document.querySelector(parentElement);
      if (parentElement) {
        if (parentElement.el) parentElement = parentElement.el;
        var isFrag = this.el.constructor === DocumentFragment;
        this.el = parentElement.appendChild(this.el);
        if (isFrag) this.el = parentElement;
      }
      return this;
    }
  }, {
    key: 'prependTo',
    value: function prependTo(parentElement) {
      if (typeof parentElement === 'string') parentElement = document.querySelector(parentElement);
      if (parentElement) {
        if (parentElement.el) parentElement = parentElement.el;
        var isFrag = this.el.constructor === DocumentFragment;
        this.el = parentElement.insertBefore(this.el, parentElement.firstChild);
        if (isFrag) this.el = parentElement;
      }
      return this;
    }
  }, {
    key: 'replace',
    value: function replace(element) {
      if (typeof element === 'string') {
        element = document.querySelector(element);
      } else if (element instanceof View) {
        element = element.el;
      }
      if (!element) throw new Error('View.prototype.replace: invalid args [' + element + ']');
      if (element.parentNode) element.parentNode.replaceChild(this.el, element);
      return this;
    }
  }, {
    key: 'remove',
    value: function remove() {
      this.el.remove();
      this.el = null;
      this.emit('removed');
    }
  }, {
    key: 'get',
    value: function get(prop) {
      return this.viewModel.get(prop);
    }
  }, {
    key: 'set',
    value: function set(prop, value) {
      this.viewModel.set(prop, value);
      var selector = '[data-bind*="' + prop + '"]';
      var boundElements = Array.from(this.el.querySelectorAll(selector));

      if (this.el.matches && this.el.matches(selector)) boundElements.push(this.el);

      if (value instanceof View) {
        boundElements.forEach(function (el) {
          value.appendTo(el);
        });
      } else {
        boundElements.forEach(function (el) {
          var dataVm = el.getAttribute('data-bind');
          dataVm.split(',').forEach(function (attr) {
            var bind = getBindValues(attr);
            if (bind.viewProperty === prop) {
              el[bind.attr] = value;
            }
          });
        });
      }
      return this;
    }
  }, {
    key: 'bindEvent',
    value: function bindEvent(from, to) {}
  }]);

  return View;
}(EventEmitter);

function objToMap(map, object) {
  for (var prop in object) {
    map.set(prop, object[prop]);
  }
}

function getBindValues(attr) {
  var split = attr.split(':');
  if (split.length === 1) {
    return { attr: 'textContent', viewProperty: split[0] };
  } else {
    return { attr: split[0], viewProperty: split[1] };
  }
}

function bindEvents(view) {
  var dataEvents = Array.from(view.el.querySelectorAll('[data-event]'));

  if (view.el.getAttribute && view.el.getAttribute('data-event')) dataEvents.push(view.el);
  dataEvents.forEach(function (el) {
    var eventMappings = el.getAttribute('data-event').split(',');
    eventMappings.forEach(function (mapping) {
      var _mapping$split = mapping.split(':');

      var _mapping$split2 = _slicedToArray(_mapping$split, 2);

      var from = _mapping$split2[0];
      var to = _mapping$split2[1];

      el.addEventListener(from, function (e) {
        view.emit(to, e);
      });
    });
  });
  return view;
}

function observeDom(view) {
  Array.from(view.el.querySelectorAll('[data-bind]')).forEach(function (el) {
    observeElement(view, el, 'change', getBindValues(el.getAttribute('data-bind')).viewProperty);
  });
  return this;
}
function observeElement(view, el, event, boundProperty) {
  el.addEventListener(event, function (e) {
    view.viewModel.set(boundProperty, el.value);
  });
}

module.exports = View;