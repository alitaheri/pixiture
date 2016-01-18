/// <reference path="pixi.js.d.ts" />
var DEFAULT_LINE_WIDTH = 2;
var uid = 0;
function getUID() {
    return uid++;
}
var Pixiture = (function () {
    function Pixiture(options) {
        var _this = this;
        this._renderStroke = function (gr, data, drawCircleIfPossible) {
            if (drawCircleIfPossible === void 0) { drawCircleIfPossible = false; }
            gr.lineStyle(_this._options.strokeWidth, _this._options.strokeColor);
            if (drawCircleIfPossible && data.x.length === 1) {
                gr.beginFill(_this._options.strokeColor);
                gr.drawCircle(data.x[0], data.y[0], _this._options.strokeWidth / 10);
                gr.endFill();
                return;
            }
            gr.moveTo(data.x[0], data.y[0]);
            if (data.x.length === 2) {
                gr.lineTo(data.x[1], data.y[1]);
                return;
            }
            if (_this._options.linear) {
                for (var i = 1; i < data.x.length; i++) {
                    gr.lineTo(data.x[i], data.y[i]);
                }
                return;
            }
            var scale = 0.3;
            var controls = { x: [], y: [] };
            for (var i = 0; i < data.x.length; i++) {
                if (i === 0) {
                    var start = [data.x[i], data.y[i]];
                    var second = [data.x[i + 1], data.y[i + 1]];
                    var tangent = Pixiture._subtract(second, start);
                    var control = Pixiture._add(start, Pixiture._scale(tangent, scale));
                    controls.x.push(control[0]);
                    controls.y.push(control[1]);
                }
                else if (i === data.x.length - 1) {
                    var oneToLast = [data.x[i - 1], data.y[i - 1]];
                    var last = [data.x[i], data.y[i]];
                    var tangent = Pixiture._subtract(last, oneToLast);
                    var control = Pixiture._add(last, Pixiture._scale(tangent, scale));
                    controls.x.push(control[0]);
                    controls.y.push(control[1]);
                }
                else {
                    var p0 = [data.x[i - 1], data.y[i - 1]];
                    var p1 = [data.x[i], data.y[i]];
                    var p2 = [data.x[i + 1], data.y[i + 1]];
                    var tangent = Pixiture._normalize(Pixiture._subtract(p2, p0));
                    var q0 = Pixiture._subtract(p1, Pixiture._scale(tangent, scale * Pixiture._magnitude(Pixiture._subtract(p1, p0))));
                    var q1 = Pixiture._add(p1, Pixiture._scale(tangent, scale * Pixiture._magnitude(Pixiture._subtract(p2, p1))));
                    controls.x.push(q0[0]);
                    controls.y.push(q0[1]);
                    controls.x.push(q1[0]);
                    controls.y.push(q1[1]);
                }
            }
            if (_this._options.debug) {
                for (var i = 0; i < data.x.length - 1; i++) {
                    gr.moveTo(data.x[i], data.y[i]);
                    gr.bezierCurveTo(controls.x[2 * i], controls.y[2 * i], controls.x[2 * i + 1], controls.y[2 * i + 1], data.x[i + 1], data.y[i + 1]);
                    gr.moveTo(data.x[i], data.y[i]);
                    gr.lineTo(controls.x[2 * i], controls.y[2 * i]);
                    gr.moveTo(controls.x[2 * i], controls.y[2 * i]);
                    gr.lineTo(controls.x[2 * i + 1], controls.y[2 * i + 1]);
                    gr.moveTo(controls.x[2 * i + 1], controls.y[2 * i + 1]);
                    gr.lineTo(data.x[i + 1], data.y[i + 1]);
                    gr.beginFill(0xFF0000);
                    gr.drawCircle(data.x[i + 1], data.y[i + 1], 2);
                    gr.endFill();
                    gr.beginFill(0xFF00FF);
                    gr.drawCircle(controls.x[2 * i], controls.y[2 * i], 2);
                    gr.endFill();
                    gr.beginFill(0x00FF00);
                    gr.drawCircle(controls.x[2 * i + 1], controls.y[2 * i + 1], 2);
                    gr.endFill();
                }
            }
            else {
                for (var i = 0; i < data.x.length - 1; i++) {
                    gr.bezierCurveTo(controls.x[2 * i], controls.y[2 * i], controls.x[2 * i + 1], controls.y[2 * i + 1], data.x[i + 1], data.y[i + 1]);
                }
            }
        };
        this._onStart = function (event, data) {
            for (var i = 0; i < _this._onStartListeners.length; i++) {
                _this._onStartListeners[i](event, data.id);
            }
        };
        this._onEnd = function (event, data) {
            var outputData = {
                id: data.id,
                x: data.x,
                y: data.y
            };
            for (var i = 0; i < _this._onEndListeners.length; i++) {
                _this._onEndListeners[i](event, outputData);
            }
        };
        this._addPoint = function (data, clientX, clientY) {
            var len = data.x.length;
            var rect = _this._renderer.view.getBoundingClientRect();
            var x = clientX - rect.left;
            var y = clientY - rect.top;
            if (len > 0) {
                var distance = Pixiture._distance(x, y, data.x[len - 1], data.y[len - 1]);
                if (distance <= _this._options.strokeWidth)
                    return;
            }
            data.x.push(x);
            data.y.push(y);
        };
        this._addStroke = function (clientX, clientY) {
            var rect = _this._renderer.view.getBoundingClientRect();
            var data = {
                id: getUID(),
                x: [],
                y: [],
                frozen: false
            };
            _this._addPoint(data, clientX, clientY);
            _this._data.push(data);
            return data;
        };
        this._render = function () {
            _this._graphic.clear();
            for (var i = 0; i < _this._data.length; i++) {
                var data = _this._data[i];
                if (data.frozen) {
                    if (!data.gr) {
                        var cahcedGraphics = new PIXI.Graphics();
                        _this._stage.addChild(cahcedGraphics);
                        _this._renderStroke(cahcedGraphics, data, true);
                        data.gr = cahcedGraphics;
                    }
                }
                else {
                    _this._renderStroke(_this._graphic, data);
                }
            }
            _this._renderer.render(_this._stage);
        };
        this._handleTouchStart = function (event) {
            event.preventDefault();
            for (var i = 0; i < event.targetTouches.length; i++) {
                var touch = event.targetTouches[i];
                var data = _this._addStroke(touch.clientX, touch.clientY);
                _this._touches[touch.identifier] = data;
                _this._onStart(event, data);
            }
            _this._render();
        };
        this._handleTouchMove = function (event) {
            event.preventDefault();
            for (var i = 0; i < event.changedTouches.length; i++) {
                var touch = event.changedTouches[i];
                var data = _this._touches[touch.identifier];
                if (data)
                    _this._addPoint(data, touch.clientX, touch.clientY);
            }
            _this._render();
        };
        this._handleTouchEnd = function (event) {
            event.preventDefault();
            for (var i = 0; i < event.changedTouches.length; i++) {
                var touch = event.changedTouches[i];
                var data = _this._touches[touch.identifier];
                if (data) {
                    _this._addPoint(data, touch.clientX, touch.clientY);
                    data.frozen = true;
                    _this._onEnd(event, data);
                }
                delete _this._touches[touch.identifier];
            }
            _this._render();
        };
        this._handleMouseDown = function (event) {
            event.preventDefault();
            var data = _this._addStroke(event.clientX, event.clientY);
            _this._mouse = data;
            _this._onStart(event, data);
            _this._render();
        };
        this._handleMouseMove = function (event) {
            event.preventDefault();
            if (_this._mouse) {
                _this._addPoint(_this._mouse, event.clientX, event.clientY);
                _this._render();
            }
        };
        this._handleMouseLeave = function (event) {
            event.preventDefault();
            if (_this._mouse) {
                _this._addPoint(_this._mouse, event.clientX, event.clientY);
                _this._mouse.frozen = true;
                _this._onEnd(event, _this._mouse);
                _this._mouse = null;
                _this._render();
            }
        };
        this._handleMouseUp = function (event) {
            event.preventDefault();
            if (_this._mouse) {
                _this._addPoint(_this._mouse, event.clientX, event.clientY);
                _this._mouse.frozen = true;
                _this._onEnd(event, _this._mouse);
                _this._mouse = null;
                _this._render();
            }
        };
        var allOptions = {
            width: options.width,
            height: options.height,
            linear: options.linear,
            debug: options.debug,
            transparent: !!options.transparent,
            backgroundColor: options.backgroundColor ? Pixiture._colorToNmuber(options.backgroundColor) : 0,
            strokeColor: options.strokeColor ? Pixiture._colorToNmuber(options.strokeColor) : 0xFFFFFF,
            strokeWidth: options.strokeWidth || DEFAULT_LINE_WIDTH
        };
        this._options = allOptions;
        this._renderer = PIXI.autoDetectRenderer(allOptions.width, allOptions.height, {
            antialias: true,
            backgroundColor: allOptions.backgroundColor,
            transparent: allOptions.transparent
        });
        this._data = [];
        this._touches = {};
        this._stage = new PIXI.Container();
        this._graphic = new PIXI.Graphics();
        this._stage.addChild(this._graphic);
        this._onStartListeners = [];
        this._onEndListeners = [];
        this._renderer.view.addEventListener("touchstart", this._handleTouchStart, false);
        this._renderer.view.addEventListener("touchmove", this._handleTouchMove, false);
        this._renderer.view.addEventListener("touchend", this._handleTouchEnd, false);
        this._renderer.view.addEventListener("mousedown", this._handleMouseDown, false);
        this._renderer.view.addEventListener("mousemove", this._handleMouseMove, false);
        this._renderer.view.addEventListener("mouseleave", this._handleMouseLeave, false);
        this._renderer.view.addEventListener("mouseup", this._handleMouseUp, false);
    }
    Pixiture._colorToNmuber = function (_a) {
        var r = _a.r, g = _a.g, b = _a.b;
        return r * 256 * 256 + g * 256 + b;
    };
    Pixiture._distance = function (Ax, Ay, Bx, By) {
        return Math.sqrt((Ax - Bx) * (Ax - Bx) + (Ay - By) * (Ay - By));
    };
    Pixiture._add = function (_a, _b) {
        var Ax = _a[0], Ay = _a[1];
        var Bx = _b[0], By = _b[1];
        return [Ax + Bx, Ay + By];
    };
    Pixiture._subtract = function (_a, _b) {
        var Ax = _a[0], Ay = _a[1];
        var Bx = _b[0], By = _b[1];
        return [Ax - Bx, Ay - By];
    };
    Pixiture._scale = function (_a, scale) {
        var Ax = _a[0], Ay = _a[1];
        return [Ax * scale, Ay * scale];
    };
    Pixiture._magnitude = function (_a) {
        var Ax = _a[0], Ay = _a[1];
        return Math.sqrt(Ax * Ax + Ay * Ay);
    };
    Pixiture._normalize = function (_a) {
        var Ax = _a[0], Ay = _a[1];
        var length = Math.sqrt(Ax * Ax + Ay * Ay);
        if (length < 0.0001)
            length = 0.0001;
        return [Ax / length, Ay / length];
    };
    Pixiture.prototype.view = function () {
        return this._renderer.view;
    };
    Pixiture.prototype.asPng = function (dataUrl) {
        if (dataUrl === void 0) { dataUrl = true; }
        var data = this._renderer.view.toDataURL('image/png');
        return dataUrl ? data : data.replace('data:image/png;base64,', '');
    };
    Pixiture.prototype.registerOnStartListener = function (listener) {
        if (typeof listener === 'function') {
            this._onStartListeners.push(listener);
        }
    };
    Pixiture.prototype.registerOnEndListener = function (listener) {
        if (typeof listener === 'function') {
            this._onEndListeners.push(listener);
        }
    };
    Pixiture.prototype.clearStroke = function (id) {
        for (var i = 0; i < this._data.length; i++) {
            var data = this._data[i];
            if (data.frozen && data.gr && data.id === id) {
                this._stage.removeChild(data.gr);
                this._data.splice(i, 1);
                this._render();
                return;
            }
        }
    };
    Pixiture.prototype.clearAll = function () {
        var newData = [];
        for (var i = 0; i < this._data.length; i++) {
            var data = this._data[i];
            if (data.frozen && data.gr) {
                this._stage.removeChild(data.gr);
            }
            else {
                newData.push(data);
            }
        }
        this._data = newData;
        this._render();
    };
    return Pixiture;
})();
//# sourceMappingURL=app.js.map