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

class Pixiture {

  private static _colorToNmuber({r, g, b}: Color) {
    return r * 256 * 256 + g * 256 + b;
  }

  private static _distance(Ax: number, Ay: number, Bx: number, By: number) {
    return Math.sqrt((Ax - Bx) * (Ax - Bx) + (Ay - By) * (Ay - By));
  }

  private _options: __Options;
  private _renderer: PIXI.WebGLRenderer | PIXI.CanvasRenderer;
  private _stage: PIXI.Container;
  private _graphic: PIXI.Graphics;

  private _data: __Data[];
  private _touches: __Data[];
  private _mouse: __Data;

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
    this._touches = [];

    this._stage = new PIXI.Container();
    this._graphic = new PIXI.Graphics();
    this._stage.addChild(this._graphic);

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
    for (let i = 0; i < this._data.length; i++) {
      const data = this._data[i];
      if (data.frozen && data.gr) {
        this._stage.removeChild(data.gr);
        this._data.splice(i, 1);
      }
    }
    this._render();
  }

  private _renderStroke(gr: PIXI.Graphics, data: __Data) {
    gr.lineStyle(this._options.strokeWidth, this._options.strokeColor);
    gr.moveTo(data.x[0], data.y[0]);

    for (let j = 1; j < data.x.length; j++) {
      gr.lineTo(data.x[j], data.y[j]);
    }
  }

  private _addPoint(data: __Data, pageX: number, pageY: number) {
    data.x.push(pageX - this._renderer.view.offsetLeft);
    data.y.push(pageY - this._renderer.view.offsetTop);
  }

  private _addStroke(x: number, y: number): __Data {
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
          this._renderStroke(cahcedGraphics, data);
          data.gr = cahcedGraphics;
        }
      } else {
        this._renderStroke(this._graphic, data);
      }
    }

    this._stage.removeChild(this._graphic);
    this._stage.addChild(this._graphic);

    this._renderer.render(this._stage);
  }

  private _handleTouchStart = (event: TouchEvent) => {
    event.preventDefault();

    for (let i = 0; i < event.targetTouches.length; i++) {
      const touch = event.targetTouches[i];
      this._touches[touch.identifier] = this._addStroke(touch.pageX, touch.pageY);
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
      }
      this._touches[touch.identifier] = null;
    }
    this._render();
  }

  private _handleMouseDown = (event: MouseEvent) => {
    event.preventDefault();
    this._mouse = this._addStroke(event.pageX, event.pageY);
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
      this._mouse = null;
      this._render();
    }
  }
}
