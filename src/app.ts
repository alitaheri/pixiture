/// <reference path="pixi.js.d.ts" />

const DEFAULT_LINE_WIDTH = 2;

let uid = 0;

function getUID(): number {
  return uid++;
}

interface Color {
  r: number;
  g: number;
  b: number;
}

interface Options {
  width: number;
  height: number;
  transparent?: boolean;
  backgroundColor?: Color;
  strokeColor?: Color;
  strokeWidth?: number;
}

interface __Data {
  id: number;
  gr?: PIXI.Graphics;
  frozen: boolean;
  x: number[];
  y: number[];
}

interface __Options {
  width: number;
  height: number;
  transparent: boolean;
  backgroundColor: number;
  strokeColor: number;
  strokeWidth: number;
}

interface Data {
  id: number;
  x: number[];
  y: number[];
}

interface OnStartListener {
  (event: Event, id: number): void;
}

interface OnEndListener {
  (event: Event, data: Data): void;
}

type Point = [number, number];

class Pixiture {

  private static _colorToNmuber({r, g, b}: Color) {
    return r * 256 * 256 + g * 256 + b;
  }

  private static _distance(Ax: number, Ay: number, Bx: number, By: number) {
    return Math.sqrt((Ax - Bx) * (Ax - Bx) + (Ay - By) * (Ay - By));
  }

  private static _add([Ax, Ay]: Point, [Bx, By]: Point): Point {
    return [Ax + Bx, Ay + By];
  }

  private static _subtract([Ax, Ay]: Point, [Bx, By]: Point): Point {
    return [Ax - Bx, Ay - By];
  }

  private static _scale([Ax, Ay]: Point, scale: number): Point {
    return [Ax * scale, Ay * scale];
  }

  private static _magnitude([Ax, Ay]: Point) {
    return Math.sqrt(Ax * Ax + Ay * Ay);
  }

  private static _normalize([Ax, Ay]: Point): Point {
    let length = Math.sqrt(Ax * Ax + Ay * Ay);
    if (length < 0.0001) length = 0.0001;
    return [Ax / length, Ay / length];
  }

  private _options: __Options;
  private _renderer: PIXI.WebGLRenderer | PIXI.CanvasRenderer;
  private _stage: PIXI.Container;
  private _graphic: PIXI.Graphics;

  private _data: __Data[];
  private _touches: { [index: number]: __Data };
  private _mouse: __Data;

  private _onStartListeners: OnStartListener[];
  private _onEndListeners: OnEndListener[];

  constructor(options: Options) {
    const allOptions = {
      width: options.width,
      height: options.height,
      transparent: !!options.transparent,
      backgroundColor: options.backgroundColor ? Pixiture._colorToNmuber(options.backgroundColor) : 0,
      strokeColor: options.strokeColor ? Pixiture._colorToNmuber(options.strokeColor) : 0xFFFFFF,
      strokeWidth: options.strokeWidth || DEFAULT_LINE_WIDTH,
    };

    this._options = allOptions;
    this._renderer = PIXI.autoDetectRenderer(allOptions.width, allOptions.height, {
      antialias: true,
      backgroundColor: allOptions.backgroundColor,
      transparent: allOptions.transparent,
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
    this._renderer.view.addEventListener("mouseup", this._handleMouseUp, false);
  }

  public view() {
    return this._renderer.view;
  }

  public registerOnStartListener(listener: OnStartListener) {
    if (typeof listener === 'function') {
      this._onStartListeners.push(listener);
    }
  }

  public registerOnEndListener(listener: OnEndListener) {
    if (typeof listener === 'function') {
      this._onEndListeners.push(listener);
    }
  }

  public clearStroke(id: number) {
    for (let i = 0; i < this._data.length; i++) {
      const data = this._data[i];
      if (data.frozen && data.gr && data.id === id) {
        this._stage.removeChild(data.gr);
        this._data.splice(i, 1);
        this._render();
        return;
      }
    }
  }

  public clearAll() {
    const newData = [];
    for (let i = 0; i < this._data.length; i++) {
      const data = this._data[i];
      if (data.frozen && data.gr) {
        this._stage.removeChild(data.gr);
      } else {
        newData.push(data);
      }
    }
    this._data = newData;
    this._render();
  }

  private _renderStroke = (gr: PIXI.Graphics, data: __Data, drawCircleIfPossible = false) => {
    gr.lineStyle(this._options.strokeWidth, this._options.strokeColor);

    if (drawCircleIfPossible && data.x.length === 1) {
      gr.beginFill(this._options.strokeColor);
      gr.drawCircle(data.x[0], data.y[0], this._options.strokeWidth);
      gr.endFill();
      return;
    }

    gr.moveTo(data.x[0], data.y[0]);

    if (data.x.length === 2) {
      gr.lineTo(data.x[1], data.y[1]);
      return;
    }

    const scale = this._options.strokeWidth / 5;

    const controls = { x: [], y: [] };

    for (let i = 0; i < data.x.length; i++) {
      if (i == 0) {
        const start: Point = [data.x[i], data.y[i]];
        const second: Point = [data.x[i + 1], data.y[i + 1]];
        const tangent = Pixiture._subtract(second, start);

        const control = Pixiture._add(start, Pixiture._scale(tangent, scale));

        controls.x.push(control[0]);
        controls.y.push(control[1]);
      }
      else if (i == data.x.length - 1) {
        const oneToLast: Point = [data.x[i - 1], data.y[i - 1]];
        const last: Point = [data.x[i], data.y[i]];
        const tangent = Pixiture._subtract(last, oneToLast);
        const control = Pixiture._add(last, Pixiture._scale(tangent, scale));

        controls.x.push(control[0]);
        controls.y.push(control[1]);
      }
      else {
        const p0: Point = [data.x[i - 1], data.y[i - 1]];
        const p1: Point = [data.x[i], data.y[i]];
        const p2: Point = [data.x[i + 1], data.y[i + 1]];
        const tangent = Pixiture._normalize(Pixiture._subtract(p2, p0));
        const q0 = Pixiture._subtract(p1, Pixiture._scale(tangent, scale * Pixiture._magnitude(Pixiture._subtract(p1, p0))));
        const q1 = Pixiture._add(p1, Pixiture._scale(tangent, scale * Pixiture._magnitude(Pixiture._subtract(p2, p1))));

        controls.x.push(q0[0]);
        controls.y.push(q0[1]);

        controls.x.push(q1[0]);
        controls.y.push(q1[1]);
      }
    }

    for (let i = 0; i < data.x.length - 1; i++) {
      gr.bezierCurveTo(
        controls.x[2 * i],
        controls.y[2 * i],
        controls.x[2 * i + 1],
        controls.y[2 * i + 1],
        data.x[i + 1],
        data.y[i + 1]
      );
    }

  }

  private _onStart = (event: Event, data: __Data) => {
    for (let i = 0; i < this._onStartListeners.length; i++) {
      this._onStartListeners[i](event, data.id);
    }
  }

  private _onEnd = (event: Event, data: __Data) => {
    const outputData = {
      id: data.id,
      x: data.x,
      y: data.y,
    };

    for (let i = 0; i < this._onEndListeners.length; i++) {
      this._onEndListeners[i](event, outputData);
    }
  }

  private _addPoint = (data: __Data, pageX: number, pageY: number) => {
    const len = data.x.length;
    const x = pageX - this._renderer.view.offsetLeft;
    const y = pageY - this._renderer.view.offsetTop;

    if (len > 0) {
      const distance = Pixiture._distance(x, y, data.x[len - 1], data.y[len - 1]);
      if (distance <= this._options.strokeWidth)
        return;
    }

    data.x.push(x);
    data.y.push(y);
  }

  private _addStroke = (x: number, y: number): __Data => {
    const data = {
      id: getUID(),
      x: [x - this._renderer.view.offsetLeft],
      y: [y - this._renderer.view.offsetTop],
      frozen: false,
    };
    this._data.push(data);
    return data;
  }

  private _render = () => {
    this._graphic.clear();

    for (let i = 0; i < this._data.length; i++) {
      const data = this._data[i];
      if (data.frozen) {
        if (!data.gr) {
          const cahcedGraphics = new PIXI.Graphics();
          this._stage.addChild(cahcedGraphics);
          this._renderStroke(cahcedGraphics, data, true);
          data.gr = cahcedGraphics;
        }
      } else {
        this._renderStroke(this._graphic, data);
      }
    }

    this._renderer.render(this._stage);
  }

  private _handleTouchStart = (event: TouchEvent) => {
    event.preventDefault();

    for (let i = 0; i < event.targetTouches.length; i++) {
      const touch = event.targetTouches[i];
      const data = this._addStroke(touch.pageX, touch.pageY)
      this._touches[touch.identifier] = data;
      this._onStart(event, data);
    }
    this._render();
  }

  private _handleTouchMove = (event: TouchEvent) => {
    event.preventDefault();

    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      const data = this._touches[touch.identifier];
      if (data) this._addPoint(data, touch.pageX, touch.pageY);
    }
    this._render();
  }

  private _handleTouchEnd = (event: TouchEvent) => {
    event.preventDefault();

    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      const data = this._touches[touch.identifier];
      if (data) {
        this._addPoint(data, touch.pageX, touch.pageY);
        data.frozen = true;
        this._onEnd(event, data);
      }
      delete this._touches[touch.identifier];
    }
    this._render();
  }

  private _handleMouseDown = (event: MouseEvent) => {
    event.preventDefault();
    const data = this._addStroke(event.pageX, event.pageY);
    this._mouse = data;
    this._onStart(event, data);
    this._render();
  }

  private _handleMouseMove = (event: MouseEvent) => {
    event.preventDefault();
    if (this._mouse) {
      this._addPoint(this._mouse, event.pageX, event.pageY);
      this._render();
    }
  }

  private _handleMouseUp = (event: MouseEvent) => {
    event.preventDefault();
    if (this._mouse) {
      this._addPoint(this._mouse, event.pageX, event.pageY);
      this._mouse.frozen = true;
      this._onEnd(event, this._mouse);
      this._mouse = null;
      this._render();
    }
  }
}
