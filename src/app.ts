/// <reference path="../typings/pixi.js/pixi.js.d.ts" />

import * as PIXI from 'pixi.js';

interface Data {
    x: number[];
    y: number[];
    color: number;
}

const width = document.body.clientWidth;
const height = document.body.clientHeight;

const renderer = PIXI.autoDetectRenderer(width, height, { antialias: true, backgroundColor: 0x00000F });
renderer.autoResize = true;
const view = renderer.view;
document.body.appendChild(view);
const datas: Data[] = [];
let touches: Data[] = [];
let mouse: { data?: Data } = {};

const stage = new PIXI.Container();

const graphic = new PIXI.Graphics();
stage.addChild(graphic);

function distance(Ax: number, Ay: number, Bx: number, By: number) {
    const dx = Ax - Bx;
    const dy = Ay - By;
    return Math.pow(dx * dx + dy * dy, 0.5);
}

function dotProduct(Ax: number, Ay: number, Bx: number, By: number) {
    return Ax * Bx + Ay * By;
}

function calculateAngle(Ax: number, Ay: number, Bx: number, By: number, Cx: number, Cy: number) {

    const abDistance = distance(Ax, Ay, Bx, By);
    const bcDistance = distance(Bx, By, Cx, Cy);

    const product = dotProduct(Bx - Ax, By - Ay, Cx - Bx, Cy - By);
    const distanceProduct = abDistance * bcDistance;

    if (distanceProduct === 0) return 0;

    return Math.acos(product / distanceProduct);
}

function render() {
    graphic.clear();

    for (let i = 0; i < datas.length; i++) {
        const data = datas[i];
        graphic.lineStyle(10, data.color);
        graphic.moveTo(data.x[0], data.y[0]);

        for (let j = 1; j < data.x.length; j++) {
            graphic.lineTo(data.x[j], data.y[j]);
        }
    }
    renderer.render(stage);
}

function addPoint(data: Data, x: number, y: number) {
    const length = data.x.length;

    const previousX = data.x[length - 1];
    const previousY = data.y[length - 1];

    if (length > 1) {
        const angle = calculateAngle(
            data.x[length - 2],
            data.y[length - 2],
            data.x[length - 1],
            data.y[length - 1],
            x,
            y
        );
        if (isNaN(angle) && angle < Math.PI / 180.0 * 45.0) return;
    }

    if (distance(x, y, previousX, previousY) > 5) {
        data.x.push(x);
        data.y.push(y);
    }
}

view.addEventListener("touchstart", e => {
    e.preventDefault();

    for (let i = 0; i < e.targetTouches.length; i++) {
        const touch = e.targetTouches[i];
        const data = { x: [touch.pageX], y: [touch.pageY], color: Math.random() * 0xFFFFFF };
        touches[touch.identifier] = data;
        datas.push(data);
    }
    render();
}, false);

view.addEventListener("touchmove", e => {
    e.preventDefault();

    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const data = touches[touch.identifier];
        if (data) addPoint(data, touch.pageX, touch.pageY);
    }
    render();
}, false);

view.addEventListener("touchend", e => {
    e.preventDefault();

    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const data = touches[touch.identifier];
        if (data) addPoint(data, touch.pageX, touch.pageY);
        touches[touch.identifier] = null;
    }
    render();
}, false);

view.addEventListener("mousedown", e => {
    e.preventDefault();

    const data = { x: [e.pageX], y: [e.pageY], color: Math.random() * 0xFFFFFF };
    mouse.data = data;
    datas.push(data);

    render();
}, false);

view.addEventListener("mousemove", e => {
    e.preventDefault();

    const data = mouse.data;
    if (data) {
        addPoint(data, e.pageX, e.pageY);
        render();
    }

}, false);

view.addEventListener("mouseup", e => {
    e.preventDefault();
    if (mouse.data) {
        addPoint(mouse.data, e.pageX, e.pageY);
        mouse.data = undefined;
        render();
    }
}, false);
