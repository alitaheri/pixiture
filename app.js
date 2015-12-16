/// <reference path="../typings/pixi.js/pixi.js.d.ts" />
var width = document.body.clientWidth;
var height = document.body.clientHeight;
var renderer = PIXI.autoDetectRenderer(width, height, { antialias: true, backgroundColor: 0x00000F });
renderer.autoResize = true;
var view = renderer.view;
document.body.appendChild(view);
var datas = [];
var touches = [];
var mouse = {};
var stage = new PIXI.Container();
var cache = new PIXI.Container();
stage.addChild(cache);
var graphic = new PIXI.Graphics();
stage.addChild(graphic);
var LINE_WIDTH = 5;
function distance(Ax, Ay, Bx, By) {
    var dx = Ax - Bx;
    var dy = Ay - By;
    return Math.pow(dx * dx + dy * dy, 0.5);
}
function clear() {
    setTimeout(clear, 5000);
    var deleted = [];
    for (var i = 0; i < datas.length; i++) {
        var data = datas[i];
        if (data.frozen && data.gr) {
            cache.removeChild(data.gr);
            deleted.push(i);
            datas.splice(i, 1);
            render();
            return;
        }
    }
}
clear();
function renderStroke(gr, data) {
    gr.lineStyle(LINE_WIDTH, data.color);
    gr.moveTo(data.x[0], data.y[0]);
    for (var j = 1; j < data.x.length; j++) {
        gr.lineTo(data.x[j], data.y[j]);
    }
}
function render() {
    graphic.clear();
    for (var i = 0; i < datas.length; i++) {
        var data = datas[i];
        if (data.frozen) {
            if (!data.gr) {
                var cahcedGraphics = new PIXI.Graphics();
                cache.addChild(cahcedGraphics);
                renderStroke(cahcedGraphics, data);
                data.gr = cahcedGraphics;
            }
        }
        else {
            renderStroke(graphic, data);
        }
    }
    renderer.render(stage);
}
function addPoint(data, x, y) {
    var length = data.x.length;
    var previousX = data.x[length - 1];
    var previousY = data.y[length - 1];
    if (distance(x, y, previousX, previousY) > LINE_WIDTH) {
        data.x.push(x);
        data.y.push(y);
    }
}
view.addEventListener("touchstart", function (e) {
    e.preventDefault();
    for (var i = 0; i < e.targetTouches.length; i++) {
        var touch = e.targetTouches[i];
        var data = {
            x: [touch.pageX],
            y: [touch.pageY],
            color: Math.random() * 0xFFFFFF,
            frozen: false
        };
        touches[touch.identifier] = data;
        datas.push(data);
    }
    render();
}, false);
view.addEventListener("touchmove", function (e) {
    e.preventDefault();
    for (var i = 0; i < e.changedTouches.length; i++) {
        var touch = e.changedTouches[i];
        var data = touches[touch.identifier];
        if (data)
            addPoint(data, touch.pageX, touch.pageY);
    }
    render();
}, false);
view.addEventListener("touchend", function (e) {
    e.preventDefault();
    for (var i = 0; i < e.changedTouches.length; i++) {
        var touch = e.changedTouches[i];
        var data = touches[touch.identifier];
        if (data) {
            addPoint(data, touch.pageX, touch.pageY);
            data.frozen = true;
        }
        touches[touch.identifier] = null;
    }
    render();
}, false);
view.addEventListener("mousedown", function (e) {
    e.preventDefault();
    var data = {
        x: [e.pageX],
        y: [e.pageY],
        color: Math.random() * 0xFFFFFF,
        frozen: false
    };
    mouse.data = data;
    datas.push(data);
    render();
}, false);
view.addEventListener("mousemove", function (e) {
    e.preventDefault();
    var data = mouse.data;
    if (data) {
        addPoint(data, e.pageX, e.pageY);
        render();
    }
}, false);
view.addEventListener("mouseup", function (e) {
    e.preventDefault();
    if (mouse.data) {
        addPoint(mouse.data, e.pageX, e.pageY);
        mouse.data.frozen = true;
        mouse.data = undefined;
        render();
    }
}, false);
