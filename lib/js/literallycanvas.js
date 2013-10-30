(function() {
    var _ref;
    window.LC = (_ref = window.LC) != null ? _ref : {};
    LC.LiterallyCanvas = function() {
        function LiterallyCanvas(canvas, opts) {
            this.canvas = canvas;
            this.opts = opts;
            this.$canvas = $(this.canvas);
            this.colors = {
                primary: this.opts.primaryColor || "#000",
                secondary: this.opts.secondaryColor || "#fff",
                background: this.opts.backgroundColor || "rgba(230, 230, 230, 1.0)"
            };
            $(this.canvas).css("background-color", this.colors.background);
            this.setBackground(this.opts.backgroundImage);
            this.buffer = $("<canvas>").get(0);
            this.ctx = this.canvas.getContext("2d");
            this.bufferCtx = this.buffer.getContext("2d");
            this.shapes = [];
            this.undoStack = [];
            this.redoStack = [];
            this.isDragging = false;
            this.position = {
                x: 0,
                y: 0
            };
            this.scale = 1;
            this.tool = void 0;
            this.repaint();
        }
        LiterallyCanvas.prototype.trigger = function(name, data) {
            return this.canvas.dispatchEvent(new CustomEvent(name, {
                detail: data
            }));
        };
        LiterallyCanvas.prototype.on = function(name, fn) {
            return this.canvas.addEventListener(name, function(e) {
                return fn(e.detail);
            });
        };
        LiterallyCanvas.prototype.clientCoordsToDrawingCoords = function(x, y) {
            return {
                x: (x - this.position.x) / this.scale,
                y: (y - this.position.y) / this.scale
            };
        };
        LiterallyCanvas.prototype.drawingCoordsToClientCoords = function(x, y) {
            return {
                x: x * this.scale + this.position.x,
                y: y * this.scale + this.position.y
            };
        };
        LiterallyCanvas.prototype.begin = function(x, y) {
            var newPos;
            newPos = this.clientCoordsToDrawingCoords(x, y);
            this.tool.begin(newPos.x, newPos.y, this);
            return this.isDragging = true;
        };
        LiterallyCanvas.prototype["continue"] = function(x, y) {
            var newPos;
            newPos = this.clientCoordsToDrawingCoords(x, y);
            if (this.isDragging) {
                return this.tool["continue"](newPos.x, newPos.y, this);
            }
        };
        LiterallyCanvas.prototype.end = function(x, y) {
            var newPos;
            newPos = this.clientCoordsToDrawingCoords(x, y);
            if (this.isDragging) {
                this.tool.end(newPos.x, newPos.y, this);
            }
            return this.isDragging = false;
        };
        LiterallyCanvas.prototype.setColor = function(name, color) {
            this.colors[name] = color;
            $(this.canvas).css("background-color", this.colors.background);
            this.trigger("" + name + "ColorChange", this.colors[name]);
            return this.repaint();
        };
        LiterallyCanvas.prototype.getColor = function(name) {
            return this.colors[name];
        };
        LiterallyCanvas.prototype.saveShape = function(shape) {
            return this.execute(new LC.AddShapeAction(this, shape));
        };
        LiterallyCanvas.prototype.pan = function(x, y) {
            this.position.x = this.position.x - x;
            this.position.y = this.position.y - y;
            if (this.background) {
                this.background.offset.x = this.background.offset.x - x;
                this.background.offset.y = this.background.offset.y - y;
                return this.updateBackground();
            }
        };
        LiterallyCanvas.prototype.zoom = function(factor) {
            var oldScale;
            oldScale = this.scale;
            this.scale = this.scale + factor;
            this.scale = Math.max(this.scale, .2);
            this.scale = Math.min(this.scale, 4);
            this.scale = Math.round(this.scale * 100) / 100;
            this.position.x = LC.scalePositionScalar(this.position.x, this.canvas.width, oldScale, this.scale);
            this.position.y = LC.scalePositionScalar(this.position.y, this.canvas.height, oldScale, this.scale);
            this.repaint();
            if (this.background) {
                this.background.offset = {
                    x: LC.scalePositionScalar(this.background.offset.x, this.canvas.width, oldScale, this.scale),
                    y: LC.scalePositionScalar(this.background.offset.y, this.canvas.height, oldScale, this.scale)
                };
                this.background.dimension = {
                    w: Math.round(this.background.init_dimension.w * this.scale),
                    h: Math.round(this.background.init_dimension.h * this.scale)
                };
                return this.updateBackground();
            }
        };
        LiterallyCanvas.prototype.repaint = function(dirty, drawBackground) {
            if (dirty == null) {
                dirty = true;
            }
            if (drawBackground == null) {
                drawBackground = false;
            }
            if (dirty) {
                this.buffer.width = this.canvas.width;
                this.buffer.height = this.canvas.height;
                this.bufferCtx.clearRect(0, 0, this.buffer.width, this.buffer.height);
                if (drawBackground) {
                    this.bufferCtx.fillStyle = this.colors.background;
                    this.bufferCtx.fillRect(0, 0, this.buffer.width, this.buffer.height);
                }
                this.draw(this.shapes, this.bufferCtx);
            }
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            if (this.canvas.width > 0 && this.canvas.height > 0) {
                return this.ctx.drawImage(this.buffer, 0, 0);
            }
        };
        LiterallyCanvas.prototype.update = function(shape) {
            var _this = this;
            this.repaint(false);
            return this.transformed(function() {
                return shape.update(_this.ctx);
            }, this.ctx);
        };
        LiterallyCanvas.prototype.draw = function(shapes, ctx) {
            return this.transformed(function() {
                var _this = this;
                return _.each(shapes, function(s) {
                    return s.draw(ctx);
                });
            }, ctx);
        };
        LiterallyCanvas.prototype.transformed = function(fn, ctx) {
            ctx.save();
            ctx.translate(this.position.x, this.position.y);
            ctx.scale(this.scale, this.scale);
            fn();
            return ctx.restore();
        };
        LiterallyCanvas.prototype.clear = function() {
            this.execute(new LC.ClearAction(this));
            this.shapes = [];
            return this.repaint();
        };
        LiterallyCanvas.prototype.execute = function(action) {
            this.undoStack.push(action);
            action["do"]();
            return this.redoStack = [];
        };
        LiterallyCanvas.prototype.undo = function() {
            var action;
            if (!this.undoStack.length) {
                return;
            }
            action = this.undoStack.pop();
            action.undo();
            return this.redoStack.push(action);
        };
        LiterallyCanvas.prototype.redo = function() {
            var action;
            if (!this.redoStack.length) {
                return;
            }
            action = this.redoStack.pop();
            this.undoStack.push(action);
            return action["do"]();
        };
        LiterallyCanvas.prototype.getPixel = function(x, y) {
            var p, pixel;
            p = this.drawingCoordsToClientCoords(x, y);
            pixel = this.ctx.getImageData(p.x, p.y, 1, 1).data;
            if (pixel[3]) {
                return "rgb(" + pixel[0] + "," + pixel[1] + "," + pixel[2] + ")";
            } else {
                return null;
            }
        };
        LiterallyCanvas.prototype.canvasForExport = function() {
            var output, outputCtx;
            this.repaint(true, false);
            output = $("<canvas>").get(0);
            output.width = this.canvas.width;
            output.height = this.canvas.height;
            outputCtx = output.getContext("2d");
            if (this.background) {
                outputCtx.drawImage(this.background.image, this.background.offset.x, this.background.offset.y, this.background.dimension.w, this.background.dimension.h);
            }
            outputCtx.drawImage(this.canvas, 0, 0);
            return output;
        };
        LiterallyCanvas.prototype.setBackground = function(backgroundURL) {
            var image, _this = this;
            if (!backgroundURL || backgroundURL === "") {
                this.$canvas.css("background-image", "none");
                this.background = null;
                if (!!this.removeBackgroundButton) {
                    this.removeBackgroundButton.hide();
                }
                return;
            }
            image = new Image();
            image.onload = function() {
                var resizedDimensions;
                resizedDimensions = LC.resize(image.width, image.height, _this.canvas.width, _this.canvas.height);
                _this.background = {
                    image: image,
                    init_dimension: {
                        w: resizedDimensions.width,
                        h: resizedDimensions.height
                    },
                    dimension: {
                        w: resizedDimensions.width,
                        h: resizedDimensions.height
                    },
                    offset: {
                        x: 0,
                        y: 0
                    }
                };
                _this.$canvas.css("background-image", "url('" + backgroundURL + "')");
                if (!!_this.removeBackgroundButton) {
                    _this.removeBackgroundButton.show();
                }
                return _this.updateBackground();
            };
            return image.src = backgroundURL;
        };
        LiterallyCanvas.prototype.updateBackground = function() {
            this.$canvas.css("background-size", "" + this.background.dimension.w + "px " + this.background.dimension.h + "px");
            return this.$canvas.css("background-position", "" + this.background.offset.x + "px " + this.background.offset.y + "px");
        };
        return LiterallyCanvas;
    }();
    LC.ClearAction = function() {
        function ClearAction(lc) {
            this.lc = lc;
            this.oldShapes = this.lc.shapes;
        }
        ClearAction.prototype["do"] = function() {
            this.lc.shapes = [];
            return this.lc.repaint();
        };
        ClearAction.prototype.undo = function() {
            this.lc.shapes = this.oldShapes;
            return this.lc.repaint();
        };
        return ClearAction;
    }();
    LC.AddShapeAction = function() {
        function AddShapeAction(lc, shape) {
            this.lc = lc;
            this.shape = shape;
        }
        AddShapeAction.prototype["do"] = function() {
            this.ix = this.lc.shapes.length;
            this.lc.shapes.push(this.shape);
            return this.lc.repaint();
        };
        AddShapeAction.prototype.undo = function() {
            this.lc.shapes.pop(this.ix);
            return this.lc.repaint();
        };
        return AddShapeAction;
    }();
}).call(this);

(function() {
    var buttonIsDown, coordsForTouchEvent, initLiterallyCanvas, position, _ref;
    window.LC = (_ref = window.LC) != null ? _ref : {};
    coordsForTouchEvent = function($el, e) {
        var p, t;
        t = e.originalEvent.changedTouches[0];
        p = $el.offset();
        return [ t.clientX - p.left, t.clientY - p.top ];
    };
    position = function(e) {
        var p;
        if (e.offsetX != null) {
            return {
                left: e.offsetX,
                top: e.offsetY
            };
        } else {
            p = $(e.target).offset();
            return {
                left: e.pageX - p.left,
                top: e.pageY - p.top
            };
        }
    };
    buttonIsDown = function(e) {
        if (e.buttons != null) {
            return e.buttons === 1;
        } else {
            return e.which > 0;
        }
    };
    initLiterallyCanvas = function(el, opts) {
        var $c, $el, $tbEl, lc, resize, tb, _this = this;
        if (opts == null) {
            opts = {};
        }
        opts = _.extend({
            primaryColor: "rgba(0, 0, 0, 1)",
            secondaryColor: "rgba(0, 0, 0, 0)",
            backgroundColor: "rgb(230, 230, 230, 1.0)",
            backgroundImage: "",
            imageURLPrefix: "lib/img",
            keyboardShortcuts: true,
            sizeToContainer: true,
            toolClasses: [ LC.PencilWidget, LC.EraserWidget, LC.LineWidget, LC.RectangleWidget, LC.GraphWidget, LC.TextWidget, LC.PanWidget ],
            customButtons: []
        }, opts);
        $el = $(el);
        $el.addClass("literally");
        $tbEl = $('<div class="toolbar">');
        $el.append($tbEl);
        $c = $el.find("canvas");
        lc = new LC.LiterallyCanvas($c.get(0), opts);
        tb = new LC.Toolbar(lc, $tbEl, opts);
        tb.selectTool(tb.tools[0]);
        resize = function() {
            if (opts.sizeToContainer) {
                $c.css("height", "" + ($el.height() - $tbEl.height()) + "px");
            }
            $c.attr("width", $c.width());
            $c.attr("height", $c.height());
            return lc.repaint();
        };
        $el.resize(resize);
        $(window).resize(resize);
        resize();
        $c.mousedown(function(e) {
            var down, p;
            down = true;
            e.originalEvent.preventDefault();
            document.onselectstart = function() {
                return false;
            };
            p = position(e);
            return lc.begin(p.left, p.top);
        });
        $c.mousemove(function(e) {
            var p;
            e.originalEvent.preventDefault();
            p = position(e);
            return lc["continue"](p.left, p.top);
        });
        $c.mouseup(function(e) {
            var p;
            e.originalEvent.preventDefault();
            document.onselectstart = function() {
                return true;
            };
            p = position(e);
            return lc.end(p.left, p.top);
        });
        $c.mouseenter(function(e) {
            var p;
            p = position(e);
            if (buttonIsDown(e)) {
                return lc.begin(p.left, p.top);
            }
        });
        $c.mouseout(function(e) {
            var p;
            p = position(e);
            return lc.end(p.left, p.top);
        });
        $c.bind("touchstart", function(e) {
            e.preventDefault();
            if (e.originalEvent.touches.length === 1) {
                return lc.begin.apply(lc, coordsForTouchEvent($c, e));
            } else {
                return lc["continue"].apply(lc, coordsForTouchEvent($c, e));
            }
        });
        $c.bind("touchmove", function(e) {
            e.preventDefault();
            return lc["continue"].apply(lc, coordsForTouchEvent($c, e));
        });
        $c.bind("touchend", function(e) {
            e.preventDefault();
            if (e.originalEvent.touches.length !== 0) {
                return;
            }
            return lc.end.apply(lc, coordsForTouchEvent($c, e));
        });
        $c.bind("touchcancel", function(e) {
            e.preventDefault();
            if (e.originalEvent.touches.length !== 0) {
                return;
            }
            return lc.end.apply(lc, coordsForTouchEvent($c, e));
        });
        if (opts.keyboardShortcuts) {
            $(document).keydown(function(e) {
                if ($(document.activeElement).is('input[type="text"]')) {
                    return;
                }
                switch (e.which) {
                  case 37:
                    lc.pan(-10, 0);
                    break;

                  case 38:
                    lc.pan(0, -10);
                    break;

                  case 39:
                    lc.pan(10, 0);
                    break;

                  case 40:
                    lc.pan(0, 10);
                }
                return lc.repaint();
            });
        }
        return [ lc, tb ];
    };
    $.fn.literallycanvas = function(opts, option, set) {
        var _this = this;
        if (opts == null) {
            opts = {};
        }
        if (option == null) {
            option = null;
        }
        if (set == null) {
            set = null;
        }
        this.each(function(ix, el) {
            var val;
            if (!el.literallycanvas || typeof opts === "object") {
                val = initLiterallyCanvas(el, opts);
                el.literallycanvas = val[0];
                el.literallycanvasToolbar = val[1];
            }
            if (opts === "option" && typeof option === "string") {
                switch (option) {
                  case "backgroundImage":
                    return el.literallycanvas.setBackground(set);

                  case "clear":
                    return el.literallycanvas.clear();
                }
            }
        });
        return this;
    };
    $.fn.canvasForExport = function() {
        return this.get(0).literallycanvas.canvasForExport();
    };
}).call(this);

(function() {
    var dual, mid, normals, refine, slope, unit, _ref;
    window.LC = (_ref = window.LC) != null ? _ref : {};
    LC.bspline = function(points, order) {
        if (!order) {
            return points;
        }
        return LC.bspline(dual(dual(refine(points))), order - 1);
    };
    refine = function(points) {
        var refined;
        points = [ _.first(points) ].concat(points).concat(_.last(points));
        refined = [];
        _.each(points, function(point, index, points) {
            refined[index * 2] = point;
            if (points[index + 1]) {
                return refined[index * 2 + 1] = mid(point, points[index + 1]);
            }
        });
        return refined;
    };
    dual = function(points) {
        var dualed;
        dualed = [];
        _.each(points, function(point, index, points) {
            if (points[index + 1]) {
                return dualed[index] = mid(point, points[index + 1]);
            }
        });
        return dualed;
    };
    mid = function(a, b) {
        return new LC.Point(a.x + (b.x - a.x) / 2, a.y + (b.y - a.y) / 2, a.size + (b.size - a.size) / 2, a.color);
    };
    LC.toPoly = function(line) {
        var polyLeft, polyRight, _this = this;
        polyLeft = [];
        polyRight = [];
        _.each(line, function(point, index) {
            var n;
            n = normals(point, slope(line, index));
            polyLeft = polyLeft.concat([ n[0] ]);
            return polyRight = [ n[1] ].concat(polyRight);
        });
        return polyLeft.concat(polyRight);
    };
    slope = function(line, index) {
        var point;
        if (line.length < 3) {
            point = {
                x: 0,
                y: 0
            };
        }
        if (index === 0) {
            point = slope(line, index + 1);
        } else if (index === line.length - 1) {
            point = slope(line, index - 1);
        } else {
            point = LC.diff(line[index - 1], line[index + 1]);
        }
        return point;
    };
    LC.diff = function(a, b) {
        return {
            x: b.x - a.x,
            y: b.y - a.y
        };
    };
    unit = function(vector) {
        var length;
        length = LC.len(vector);
        return {
            x: vector.x / length,
            y: vector.y / length
        };
    };
    normals = function(p, slope) {
        slope = unit(slope);
        slope.x = slope.x * p.size / 2;
        slope.y = slope.y * p.size / 2;
        return [ {
            x: p.x - slope.y,
            y: p.y + slope.x,
            color: p.color
        }, {
            x: p.x + slope.y,
            y: p.y - slope.x,
            color: p.color
        } ];
    };
    LC.len = function(vector) {
        return Math.sqrt(Math.pow(vector.x, 2) + Math.pow(vector.y, 2));
    };
    LC.scalePositionScalar = function(val, viewportSize, oldScale, newScale) {
        var newSize, oldSize;
        oldSize = viewportSize * oldScale;
        newSize = viewportSize * newScale;
        return val + (oldSize - newSize) / 2;
    };
    LC.resize = function(oldWidth, oldHeight, targetWidth, targetHeight) {
        var factor, horizontalFactor, verticalFactor;
        horizontalFactor = targetWidth / oldWidth;
        verticalFactor = targetHeight / oldHeight;
        factor = Math.min(verticalFactor, horizontalFactor);
        return {
            width: Math.round(factor * oldWidth),
            height: Math.round(factor * oldHeight)
        };
    };
}).call(this);

(function() {
    var _ref, __hasProp = {}.hasOwnProperty, __extends = function(child, parent) {
        for (var key in parent) {
            if (__hasProp.call(parent, key)) child[key] = parent[key];
        }
        function ctor() {
            this.constructor = child;
        }
        ctor.prototype = parent.prototype;
        child.prototype = new ctor();
        child.__super__ = parent.prototype;
        return child;
    };
    LC.Shape = function() {
        function Shape() {}
        Shape.prototype.draw = function(ctx) {};
        Shape.prototype.update = function(ctx) {
            return this.draw(ctx);
        };
        return Shape;
    }();
    LC.Rectangle = function(_super) {
        __extends(Rectangle, _super);
        function Rectangle(x, y, strokeWidth, strokeColor, fillColor) {
            this.x = x;
            this.y = y;
            this.strokeWidth = strokeWidth;
            this.strokeColor = strokeColor;
            this.fillColor = fillColor;
            this.width = 0;
            this.height = 0;
        }
        Rectangle.prototype.draw = function(ctx) {
            ctx.fillStyle = this.fillColor;
            ctx.fillRect(this.x, this.y, this.width, this.height);
            ctx.lineWidth = this.strokeWidth;
            ctx.strokeStyle = this.strokeColor;
            return ctx.strokeRect(this.x, this.y, this.width, this.height);
        };
        return Rectangle;
    }(LC.Shape);
    LC.Text = function(_super) {
        __extends(Text, _super);
        function Text(x, y, size, font, color, text) {
            this.x = x;
            this.y = y;
            this.size = size;
            this.font = font;
            this.color = color;
            this.text = text;
        }
        Text.prototype.draw = function(ctx) {
            if (this.text !== "") {
                ctx.fillStyle = this.color;
                ctx.font = this.size + "px " + this.font;
                return ctx.fillText(this.text, this.x, this.y);
            }
        };
        return Text;
    }(LC.Shape);
    LC.Line = function(_super) {
        __extends(Line, _super);
        function Line(x1, y1, strokeWidth, color) {
            this.x1 = x1;
            this.y1 = y1;
            this.strokeWidth = strokeWidth;
            this.color = color;
            this.x2 = this.x1;
            this.y2 = this.y1;
        }
        Line.prototype.draw = function(ctx) {
            ctx.lineWidth = this.strokeWidth;
            ctx.strokeStyle = this.color;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(this.x1, this.y1);
            ctx.lineTo(this.x2, this.y2);
            return ctx.stroke();
        };
        return Line;
    }(LC.Shape);
    LC.Graph = function(_super) {
        __extends(Graph, _super);
        function Graph(x1, y1, strokeWidth, color, scale) {
            this.x1 = x1;
            this.y1 = y1;
            this.strokeWidth = strokeWidth;
            this.color = color;
            this.scale = scale;
            this.x2 = this.x1;
            this.y2 = this.y1;
            this.oSize = Math.round(this.strokeWidth * 2.5);
            this.arrowSize = Math.round(this.strokeWidth * 1.5);
            this.tickLength = Math.round(this.strokeWidth * 1.5);
            this.tickWidth = Math.round(this.strokeWidth / 2);
        }
        Graph.prototype.draw = function(ctx) {
            var ticks_x, ticks_y, x, y, _fn, _fn1, _i, _j, _len, _len1, _this = this;
            ctx.strokeStyle = this.color;
            ctx.lineCap = "round";
            ctx.lineWidth = this.strokeWidth;
            ctx.beginPath();
            if (this.x1 < this.x2) {
                ctx.moveTo(this.x1 - this.oSize, this.y1);
                ctx.lineTo(this.x2, this.y1);
                ctx.moveTo(this.x2 - this.arrowSize, this.y1 - this.arrowSize);
                ctx.lineTo(this.x2, this.y1);
                ctx.lineTo(this.x2 - this.arrowSize, this.y1 + this.arrowSize);
                ticks_x = function() {
                    var _i, _ref, _ref1, _ref2, _results;
                    _results = [];
                    for (x = _i = _ref = this.x1 + this.scale, _ref1 = this.x2 - this.scale / 2, _ref2 = this.scale; _ref2 > 0 ? _i <= _ref1 : _i >= _ref1; x = _i += _ref2) {
                        _results.push(x);
                    }
                    return _results;
                }.call(this);
            } else {
                ctx.moveTo(this.x1 + this.oSize, this.y1);
                ctx.lineTo(this.x2, this.y1);
                ctx.moveTo(this.x2 + this.arrowSize, this.y1 - this.arrowSize);
                ctx.lineTo(this.x2, this.y1);
                ctx.lineTo(this.x2 + this.arrowSize, this.y1 + this.arrowSize);
                ticks_x = function() {
                    var _i, _ref, _ref1, _ref2, _results;
                    _results = [];
                    for (x = _i = _ref = this.x1 - this.scale, _ref1 = this.x2 + this.scale / 2, _ref2 = -this.scale; _ref2 > 0 ? _i <= _ref1 : _i >= _ref1; x = _i += _ref2) {
                        _results.push(x);
                    }
                    return _results;
                }.call(this);
            }
            if (this.y1 > this.y2) {
                ctx.moveTo(this.x1, this.y1 + this.oSize);
                ctx.lineTo(this.x1, this.y2);
                ctx.moveTo(this.x1 - this.arrowSize, this.y2 + this.arrowSize);
                ctx.lineTo(this.x1, this.y2);
                ctx.lineTo(this.x1 + this.arrowSize, this.y2 + this.arrowSize);
                ticks_y = function() {
                    var _i, _ref, _ref1, _ref2, _results;
                    _results = [];
                    for (y = _i = _ref = this.y1 - this.scale, _ref1 = this.y2 + this.scale / 2, _ref2 = -this.scale; _ref2 > 0 ? _i <= _ref1 : _i >= _ref1; y = _i += _ref2) {
                        _results.push(y);
                    }
                    return _results;
                }.call(this);
            } else {
                ctx.moveTo(this.x1, this.y1 - this.oSize);
                ctx.lineTo(this.x1, this.y2);
                ctx.moveTo(this.x1 + this.arrowSize, this.y2 - this.arrowSize);
                ctx.lineTo(this.x1, this.y2);
                ctx.lineTo(this.x1 - this.arrowSize, this.y2 - this.arrowSize);
                ticks_y = function() {
                    var _i, _ref, _ref1, _ref2, _results;
                    _results = [];
                    for (y = _i = _ref = this.y1 + this.scale, _ref1 = this.y2 - this.scale / 2, _ref2 = this.scale; _ref2 > 0 ? _i <= _ref1 : _i >= _ref1; y = _i += _ref2) {
                        _results.push(y);
                    }
                    return _results;
                }.call(this);
            }
            ctx.stroke();
            ctx.lineWidth = this.tickWidth;
            ctx.beginPath();
            _fn = function(x) {
                ctx.moveTo(x, _this.y1 - _this.tickLength);
                return ctx.lineTo(x, _this.y1 + _this.tickLength);
            };
            for (_i = 0, _len = ticks_x.length; _i < _len; _i++) {
                x = ticks_x[_i];
                _fn(x);
            }
            _fn1 = function(y) {
                ctx.moveTo(_this.x1 - _this.tickLength, y);
                return ctx.lineTo(_this.x1 + _this.tickLength, y);
            };
            for (_j = 0, _len1 = ticks_y.length; _j < _len1; _j++) {
                y = ticks_y[_j];
                _fn1(y);
            }
            return ctx.stroke();
        };
        return Graph;
    }(LC.Shape);
    LC.LinePathShape = function(_super) {
        __extends(LinePathShape, _super);
        function LinePathShape() {
            this.points = [];
            this.order = 3;
            this.segmentSize = Math.pow(2, this.order);
            this.tailSize = 3;
            this.sampleSize = this.tailSize + 1;
        }
        LinePathShape.prototype.addPoint = function(point) {
            this.points.push(point);
            if (!this.smoothedPoints || this.points.length < this.sampleSize) {
                return this.smoothedPoints = LC.bspline(this.points, this.order);
            } else {
                this.tail = _.last(LC.bspline(_.last(this.points, this.sampleSize), this.order), this.segmentSize * this.tailSize);
                return this.smoothedPoints = _.initial(this.smoothedPoints, this.segmentSize * (this.tailSize - 1)).concat(this.tail);
            }
        };
        LinePathShape.prototype.draw = function(ctx, points) {
            if (points == null) {
                points = this.smoothedPoints;
            }
            if (!points.length) {
                return;
            }
            ctx.strokeStyle = points[0].color;
            ctx.lineWidth = points[0].size;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            _.each(_.rest(points), function(point) {
                return ctx.lineTo(point.x, point.y);
            });
            return ctx.stroke();
        };
        return LinePathShape;
    }(LC.Shape);
    LC.EraseLinePathShape = function(_super) {
        __extends(EraseLinePathShape, _super);
        function EraseLinePathShape() {
            _ref = EraseLinePathShape.__super__.constructor.apply(this, arguments);
            return _ref;
        }
        EraseLinePathShape.prototype.draw = function(ctx) {
            ctx.save();
            ctx.globalCompositeOperation = "destination-out";
            EraseLinePathShape.__super__.draw.call(this, ctx);
            return ctx.restore();
        };
        EraseLinePathShape.prototype.update = function(ctx) {
            ctx.save();
            ctx.globalCompositeOperation = "destination-out";
            EraseLinePathShape.__super__.update.call(this, ctx);
            return ctx.restore();
        };
        return EraseLinePathShape;
    }(LC.LinePathShape);
    LC.Point = function() {
        function Point(x, y, size, color) {
            this.x = x;
            this.y = y;
            this.size = size;
            this.color = color;
        }
        Point.prototype.lastPoint = function() {
            return this;
        };
        Point.prototype.draw = function(ctx) {
            return console.log("draw point", this.x, this.y, this.size, this.color);
        };
        return Point;
    }();
}).call(this);

(function() {
    var CPGlobal, Color, Colorpicker;
    Color = function() {
        function Color(val) {
            this.setColor(val);
        }
        Color.prototype.setColor = function(val) {
            var that;
            val = val.toLowerCase();
            that = this;
            return $.each(CPGlobal.stringParsers, function(i, parser) {
                var match, values;
                match = parser.re.exec(val);
                values = match && parser.parse(match);
                if (values) {
                    that.r = values[0];
                    that.g = values[1];
                    that.b = values[2];
                    return that.a = !!values[3] ? values[3] : 1;
                }
            });
        };
        Color.prototype.toRGB = function(r, g, b, a) {
            return {
                r: this.r,
                g: this.g,
                b: this.b,
                a: this.a
            };
        };
        Color.prototype.toString = function(string) {
            return "rgba(" + this.r + "," + this.g + "," + this.b + "," + this.a + ")";
        };
        return Color;
    }();
    Colorpicker = function() {
        function Colorpicker(element, options) {
            this.opts = _.extend({
                colors: [ {
                    val: "rgba(0,0,0,1.0)",
                    title: "Black"
                }, {
                    val: "rgba(0,83,159,1.0)",
                    "rgba(0,0,0,1.0)": "rgba(0,0,0,1.0)",
                    title: "Dark blue"
                }, {
                    val: "rgba(128,171,215,1.0)",
                    title: "Light blue"
                }, {
                    val: "rgba(185,15,15,1.0)",
                    title: "Red"
                } ]
            }, options);
            this.preparePicker(element);
            this.availableColors = this.picker.find(".colorpicker-color");
            this.availableColors.on("click", $.proxy(this.click, this));
            this.setValue(this.element.data("color"));
        }
        Colorpicker.prototype.click = function(event) {
            var color;
            color = event.target.getAttribute("data-color");
            return this.setValue(color);
        };
        Colorpicker.prototype.setValue = function(newColor) {
            this.color = new Color(newColor);
            this.availableColors.removeClass("active");
            this.availableColors.siblings('[data-color="' + this.color.toString() + '"]').addClass("active");
            return this.element.trigger({
                type: "changeColor",
                color: this.color,
                secondary: true
            });
        };
        Colorpicker.prototype.preparePicker = function(element) {
            var _this = this;
            this.element = $(element);
            this.picker = this.element.append($(CPGlobal.template));
            return _.each(this.opts.colors, function(c) {
                var $color;
                if (!c.background) {
                    c.background = c.val;
                }
                $color = $("<div data-color='" + c.val + "' class='colorpicker-color'         style='background: " + c.background + "' title='" + c.title + "' ></div>");
                if (c.transparent) {
                    $color.addClass("transparent");
                }
                $color.appendTo(_this.picker.find(".colorpicker"));
                return $color.click(function(e) {
                    return _this.click(e);
                });
            });
        };
        return Colorpicker;
    }();
    $.fn.colorpicker = function(option) {
        return this.each(function() {
            var $this, data, options;
            $this = $(this);
            data = $this.data("colorpicker");
            options = typeof option === "object" && option;
            if (!data) {
                $this.data("colorpicker", data = new Colorpicker(this, $.extend({}, $.fn.colorpicker.defaults, options)));
            }
            if (typeof option === "string") {
                return data[option]();
            }
        });
    };
    $.fn.colorpicker.defaults = {};
    $.fn.colorpicker.Constructor = Colorpicker;
    CPGlobal = {
        stringParsers: [ {
            re: /rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*(\d+(?:\.\d+)?)\s*)?\)/,
            parse: function(execResult) {
                return [ execResult[1], execResult[2], execResult[3], execResult[4] ];
            }
        }, {
            re: /rgba?\(\s*(\d+(?:\.\d+)?)\%\s*,\s*(\d+(?:\.\d+)?)\%\s*,\s*(\d+(?:\.\d+)?)\%\s*(?:,\s*(\d+(?:\.\d+)?)\s*)?\)/,
            parse: function(execResult) {
                return [ 2.55 * execResult[1], 2.55 * execResult[2], 2.55 * execResult[3], execResult[4] ];
            }
        }, {
            re: /#([a-fA-F0-9]{2})([a-fA-F0-9]{2})([a-fA-F0-9]{2})/,
            parse: function(execResult) {
                return [ parseInt(execResult[1], 16), parseInt(execResult[2], 16), parseInt(execResult[3], 16) ];
            }
        }, {
            re: /#([a-fA-F0-9])([a-fA-F0-9])([a-fA-F0-9])/,
            parse: function(execResult) {
                return [ parseInt(execResult[1] + execResult[1], 16), parseInt(execResult[2] + execResult[2], 16), parseInt(execResult[3] + execResult[3], 16) ];
            }
        } ],
        template: '<div class="colorpicker">\n</div>'
    };
}).call(this);

(function() {
    var _ref;
    window.LC = (_ref = window.LC) != null ? _ref : {};
    LC.makeColorPicker = function($el, title, callback) {
        var cp;
        $el.data("color", "rgba(0, 0, 0, 1.0)");
        cp = $el.colorpicker({
            format: "rgba"
        }).data("colorpicker");
        $el.on("changeColor", function(e) {
            return callback(e.color.toRGB());
        });
        return cp;
    };
    LC.Toolbar = function() {
        function Toolbar(lc, $el, opts) {
            this.lc = lc;
            this.$el = $el;
            this.opts = opts;
            this.$el.append(this.template());
            this.initButtons();
            this.initTools();
            this.initColors();
            this.initZoom();
            this.initCustomButtons();
        }
        Toolbar.prototype._bindColorPicker = function(name, title) {
            var $el, _this = this;
            $el = this.$el.find("." + name + "-picker");
            return LC.makeColorPicker($el, "" + title + " color", function(c) {
                return _this.lc.setColor(name, "rgba(" + c.r + ", " + c.g + ", " + c.b + ", " + c.a + ")");
            });
        };
        Toolbar.prototype.initColors = function() {
            var pickers;
            return pickers = [ this._bindColorPicker("primary", "Primary (stroke)") ];
        };
        Toolbar.prototype.initButtons = function() {
            var $rbButton, _this = this;
            this.$el.find(".clear-button").click(function(e) {
                return _this.lc.clear();
            });
            this.$el.find(".undo-button").click(function(e) {
                return _this.lc.undo();
            });
            this.$el.find(".redo-button").click(function(e) {
                return _this.lc.redo();
            });
            $rbButton = this.$el.find(".removebackground-button");
            this.lc.removeBackgroundButton = $rbButton;
            if (!this.lc.background) {
                $rbButton.hide();
            }
            return $rbButton.click(function(e) {
                return _this.lc.setBackground(null);
            });
        };
        Toolbar.prototype.initTools = function() {
            var ToolClass, _this = this;
            this.tools = function() {
                var _i, _len, _ref1, _results;
                _ref1 = this.opts.toolClasses;
                _results = [];
                for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
                    ToolClass = _ref1[_i];
                    _results.push(new ToolClass(this.opts));
                }
                return _results;
            }.call(this);
            return _.each(this.tools, function(t) {
                var buttonEl, optsEl;
                optsEl = $("<div class='tool-options tool-options-" + t.cssSuffix + "'></div>");
                optsEl.html(t.options());
                optsEl.hide();
                t.$el = optsEl;
                _this.$el.find(".tool-options-container").append(optsEl);
                buttonEl = $("        <div class='button tool-" + t.cssSuffix + "' title='" + t.title + "'>          <div class='button-image-wrapper'></div>        </div>        ");
                buttonEl.find(".button-image-wrapper").html(t.button());
                _this.$el.find(".tools").append(buttonEl);
                return buttonEl.click(function(e) {
                    return _this.selectTool(t);
                });
            });
        };
        Toolbar.prototype.initCustomButtons = function() {
            var _this = this;
            this.customButtons = this.opts.customButtons;
            return _.each(this.customButtons, function(c) {
                var buttonEl, imageWrapper;
                _.extend({
                    title: "",
                    cssSuffix: "button",
                    buttonImage: null,
                    text: null,
                    callback: function() {}
                }, c);
                buttonEl = $("        <div class='button custom-" + c.cssSuffix + "' title='" + c.title + "'>          <div class='button-image-wrapper'></div>        </div>");
                imageWrapper = buttonEl.find(".button-image-wrapper");
                if (!!c.buttonImage) {
                    imageWrapper.html("<img src='" + c.buttonImage + "'/>");
                } else {
                    imageWrapper.remove();
                }
                if (!!c.text) {
                    buttonEl.addClass("varwidth");
                    buttonEl.append(c.text);
                }
                _this.$el.find(".custom-buttons").append(buttonEl);
                return buttonEl.click(function(e) {
                    return c.callback();
                });
            });
        };
        Toolbar.prototype.initZoom = function() {
            var _this = this;
            this.$el.find(".zoom-in-button").click(function(e) {
                _this.lc.zoom(.2);
                return _this.$el.find(".zoom-display").html(_this.lc.scale);
            });
            return this.$el.find(".zoom-out-button").click(function(e) {
                _this.lc.zoom(-.2);
                return _this.$el.find(".zoom-display").html(_this.lc.scale);
            });
        };
        Toolbar.prototype.selectTool = function(t) {
            this.$el.find(".tools .active").removeClass("active");
            this.$el.find(".tools .tool-" + t.cssSuffix).addClass("active");
            t.select(this.lc);
            this.$el.find(".tool-options").hide();
            if (t.$el) {
                return t.$el.show();
            }
        };
        Toolbar.prototype.template = function() {
            return "    <div class='toolbar-row'>      <div class='toolbar-row-left'>        <div class='tools button-group'></div>      </div>      <div class='toolbar-row-right'>        <div class='button removebackground-button danger' title='Remove background image'>          <div class='button-image-wrapper'><img src='" + this.opts.imageURLPrefix + "/removebackground.png'></div>        </div>        <div class='button clear-button danger varwidth' title='Reset drawing'>Clear</div>        <div class='button-group'>          <div class='button btn-warning undo-button' title='Undo'>            <div class='button-image-wrapper'><img src='" + this.opts.imageURLPrefix + "/undo.png'></div>          </div><div class='button btn-warning redo-button' title='Redo'>            <div class='button-image-wrapper'><img src='" + this.opts.imageURLPrefix + "/redo.png'></div>          </div>        </div>        <div class='button-group'>          <div class='button btn-inverse zoom-out-button' title='Zoom out'>            <div class='button-image-wrapper'><img src='" + this.opts.imageURLPrefix + "/zoom-out.png'></div>          </div><div class='button btn-inverse zoom-in-button' title='Zoom in'>            <div class='button-image-wrapper'><img src='" + this.opts.imageURLPrefix + "/zoom-in.png'></div>          </div>        </div>        <div class='zoom-display' title='Current zoomlevel'>1</div>      </div>      <div class='clearfix'></div>    </div>    <div class='toolbar-row'>      <div class='toolbar-row-left'>        <div class='primary-picker'></div>        <div class='tool-options-container'></div>      </div>      <div class='toolbar-row-right custom-buttons'>      </div>      <div class='clearfix'></div>    </div>  ";
        };
        return Toolbar;
    }();
}).call(this);

(function() {
    var _ref, _ref1, _ref2, _ref3, _ref4, _ref5, __hasProp = {}.hasOwnProperty, __extends = function(child, parent) {
        for (var key in parent) {
            if (__hasProp.call(parent, key)) child[key] = parent[key];
        }
        function ctor() {
            this.constructor = child;
        }
        ctor.prototype = parent.prototype;
        child.prototype = new ctor();
        child.__super__ = parent.prototype;
        return child;
    };
    LC.Tool = function() {
        function Tool() {}
        Tool.prototype.begin = function(x, y, lc) {};
        Tool.prototype["continue"] = function(x, y, lc) {};
        Tool.prototype.end = function(x, y, lc) {};
        return Tool;
    }();
    LC.StrokeTool = function(_super) {
        __extends(StrokeTool, _super);
        function StrokeTool() {
            this.strokeWidth = 2;
        }
        return StrokeTool;
    }(LC.Tool);
    LC.RectangleTool = function(_super) {
        __extends(RectangleTool, _super);
        function RectangleTool() {
            _ref = RectangleTool.__super__.constructor.apply(this, arguments);
            return _ref;
        }
        RectangleTool.prototype.begin = function(x, y, lc) {
            if (!this.transparent) {
                return this.currentShape = new LC.Rectangle(x, y, 0, lc.getColor("primary"), lc.getColor("primary"));
            } else {
                return this.currentShape = new LC.Rectangle(x, y, this.strokeWidth, lc.getColor("primary"), lc.getColor("secondary"));
            }
        };
        RectangleTool.prototype["continue"] = function(x, y, lc) {
            this.currentShape.width = x - this.currentShape.x;
            this.currentShape.height = y - this.currentShape.y;
            return lc.update(this.currentShape);
        };
        RectangleTool.prototype.end = function(x, y, lc) {
            return lc.saveShape(this.currentShape);
        };
        return RectangleTool;
    }(LC.StrokeTool);
    LC.LineTool = function(_super) {
        __extends(LineTool, _super);
        function LineTool() {
            _ref1 = LineTool.__super__.constructor.apply(this, arguments);
            return _ref1;
        }
        LineTool.prototype.begin = function(x, y, lc) {
            return this.currentShape = new LC.Line(x, y, this.strokeWidth, lc.getColor("primary"));
        };
        LineTool.prototype["continue"] = function(x, y, lc) {
            this.currentShape.x2 = x;
            this.currentShape.y2 = y;
            return lc.update(this.currentShape);
        };
        LineTool.prototype.end = function(x, y, lc) {
            return lc.saveShape(this.currentShape);
        };
        return LineTool;
    }(LC.StrokeTool);
    LC.Pencil = function(_super) {
        __extends(Pencil, _super);
        function Pencil() {
            _ref2 = Pencil.__super__.constructor.apply(this, arguments);
            return _ref2;
        }
        Pencil.prototype.begin = function(x, y, lc) {
            this.color = lc.getColor("primary");
            this.currentShape = this.makeShape();
            return this.currentShape.addPoint(this.makePoint(x, y, lc));
        };
        Pencil.prototype["continue"] = function(x, y, lc) {
            this.currentShape.addPoint(this.makePoint(x, y, lc));
            return lc.update(this.currentShape);
        };
        Pencil.prototype.end = function(x, y, lc) {
            lc.saveShape(this.currentShape);
            return this.currentShape = void 0;
        };
        Pencil.prototype.makePoint = function(x, y, lc) {
            return new LC.Point(x, y, this.strokeWidth, this.color);
        };
        Pencil.prototype.makeShape = function() {
            return new LC.LinePathShape(this);
        };
        return Pencil;
    }(LC.StrokeTool);
    LC.Eraser = function(_super) {
        __extends(Eraser, _super);
        function Eraser() {
            this.strokeWidth = 5;
        }
        Eraser.prototype.makePoint = function(x, y, lc) {
            return new LC.Point(x, y, this.strokeWidth, "#000");
        };
        Eraser.prototype.makeShape = function() {
            return new LC.EraseLinePathShape(this);
        };
        return Eraser;
    }(LC.Pencil);
    LC.Pan = function(_super) {
        __extends(Pan, _super);
        function Pan() {
            _ref3 = Pan.__super__.constructor.apply(this, arguments);
            return _ref3;
        }
        Pan.prototype.begin = function(x, y, lc) {
            return this.start = {
                x: x,
                y: y
            };
        };
        Pan.prototype["continue"] = function(x, y, lc) {
            lc.pan(this.start.x - x, this.start.y - y);
            return lc.repaint();
        };
        return Pan;
    }(LC.Tool);
    LC.EyeDropper = function(_super) {
        __extends(EyeDropper, _super);
        function EyeDropper() {
            _ref4 = EyeDropper.__super__.constructor.apply(this, arguments);
            return _ref4;
        }
        EyeDropper.prototype.readColor = function(x, y, lc) {
            var newColor;
            newColor = lc.getPixel(x, y);
            return lc.setColor("primary", newColor || lc.getColor("background"));
        };
        EyeDropper.prototype.begin = function(x, y, lc) {
            return this.readColor(x, y, lc);
        };
        EyeDropper.prototype["continue"] = function(x, y, lc) {
            return this.readColor(x, y, lc);
        };
        return EyeDropper;
    }(LC.Tool);
    LC.TextTool = function(_super) {
        __extends(TextTool, _super);
        function TextTool() {
            this.inputText = "";
        }
        TextTool.prototype.begin = function(x, y, lc) {
            if (!this.endpos) {
                this.input.focus();
                this.size = 16;
                return this.currentShape = new LC.Text(x, y, this.size, "sans-serif", lc.getColor("primary"), this.inputText);
            }
        };
        TextTool.prototype["continue"] = function(x, y, lc) {
            this.currentShape.text = this.inputText;
            this.currentShape.x = x;
            this.currentShape.y = y;
            return lc.update(this.currentShape);
        };
        TextTool.prototype.finishTyping = function(lc) {
            this.input.off("keyup.edittext change.edittext");
            $("body").off("click.edittext");
            this.boundKeyup = this.boundClick = false;
            this.endpos = null;
            return this.save(lc);
        };
        TextTool.prototype.save = function(lc) {
            lc.saveShape(this.currentShape);
            this.inputText = "";
            return this.input.val("");
        };
        TextTool.prototype.bodyClickOne = function(lc) {
            var _this = this;
            return $("body").one("click.edittext", function(e) {
                if (e.target === _this.input.get(0)) {
                    return _this.bodyClickOne(lc);
                } else {
                    return _this.finishTyping(lc);
                }
            });
        };
        TextTool.prototype.end = function(x, y, lc) {
            var _this = this;
            if (!$.trim(this.inputText)) {
                this.endpos = {
                    x: x,
                    y: y,
                    lc: lc
                };
                if (!this.boundKeyup) {
                    this.boundKeyup = true;
                    return this.input.on("keyup.edittext change.edittext", function(e) {
                        if (e.keyCode === 13) {
                            _this.save(lc);
                            _this.endpos.y = _this.endpos.y + _this.size * 1.2;
                            _this.currentShape = new LC.Text(_this.endpos.x, _this.endpos.y, _this.size, "sans-serif", lc.getColor("primary"), _this.inputText);
                        } else {
                            if (!_this.boundClick) {
                                _this.boundClick = true;
                                _this.bodyClickOne(lc);
                            }
                        }
                        return _this["continue"](_this.endpos.x, _this.endpos.y, _this.endpos.lc);
                    });
                }
            } else {
                return this.finishTyping(lc);
            }
        };
        return TextTool;
    }(LC.Tool);
    LC.GraphTool = function(_super) {
        __extends(GraphTool, _super);
        function GraphTool() {
            _ref5 = GraphTool.__super__.constructor.apply(this, arguments);
            return _ref5;
        }
        GraphTool.prototype.begin = function(x, y, lc) {
            return this.currentShape = new LC.Graph(x, y, 2, lc.getColor("primary"), 20);
        };
        GraphTool.prototype["continue"] = function(x, y, lc) {
            this.currentShape.x2 = x;
            this.currentShape.y2 = y;
            return lc.update(this.currentShape);
        };
        GraphTool.prototype.end = function(x, y, lc) {
            return lc.saveShape(this.currentShape);
        };
        return GraphTool;
    }(LC.Tool);
}).call(this);

(function() {
    var _ref, _ref1, _ref2, _ref3, _ref4, _ref5, _ref6, _ref7, _ref8, _ref9, __hasProp = {}.hasOwnProperty, __extends = function(child, parent) {
        for (var key in parent) {
            if (__hasProp.call(parent, key)) child[key] = parent[key];
        }
        function ctor() {
            this.constructor = child;
        }
        ctor.prototype = parent.prototype;
        child.prototype = new ctor();
        child.__super__ = parent.prototype;
        return child;
    };
    LC.Widget = function() {
        function Widget(opts) {
            this.opts = opts;
        }
        Widget.prototype.title = void 0;
        Widget.prototype.cssSuffix = void 0;
        Widget.prototype.button = function() {
            return void 0;
        };
        Widget.prototype.options = function() {
            return void 0;
        };
        Widget.prototype.select = function(lc) {};
        return Widget;
    }();
    LC.ToolWidget = function(_super) {
        __extends(ToolWidget, _super);
        function ToolWidget(opts) {
            this.opts = opts;
            this.tool = this.makeTool();
        }
        ToolWidget.prototype.select = function(lc) {
            return lc.tool = this.tool;
        };
        ToolWidget.prototype.makeTool = function() {
            return void 0;
        };
        return ToolWidget;
    }(LC.Widget);
    LC.StrokeWidget = function(_super) {
        __extends(StrokeWidget, _super);
        function StrokeWidget() {
            _ref = StrokeWidget.__super__.constructor.apply(this, arguments);
            return _ref;
        }
        StrokeWidget.prototype.options = function() {
            var $brushWidthVal, $el, $input, _this = this;
            $el = $("      <span class='brush-width-min'>1 px</span>      <input type='range' min='1' max='50' step='1' value='" + this.tool.strokeWidth + "'>      <span class='brush-width-max'>50 px</span>      <span class='brush-width-val'>(5 px)</span>    ");
            $input = $el.filter("input");
            if ($input.size() === 0) {
                $input = $el.find("input");
            }
            $brushWidthVal = $el.filter(".brush-width-val");
            if ($brushWidthVal.size() === 0) {
                $brushWidthVal = $el.find(".brush-width-val");
            }
            $input.change(function(e) {
                _this.tool.strokeWidth = parseInt($(e.currentTarget).val(), 10);
                return $brushWidthVal.html("(" + _this.tool.strokeWidth + " px)");
            });
            return $el;
        };
        return StrokeWidget;
    }(LC.ToolWidget);
    LC.SimpleStrokeWidget = function(_super) {
        __extends(SimpleStrokeWidget, _super);
        function SimpleStrokeWidget() {
            _ref1 = SimpleStrokeWidget.__super__.constructor.apply(this, arguments);
            return _ref1;
        }
        SimpleStrokeWidget.prototype.options = function() {
            var $active, $buttons, $el, _this = this;
            $el = $("      <div class='button-group simple-strokewidth'>        <div class='button' data-strokewidth='2' title='Fine Stroke'>          <div class='button-image-wrapper'><img src='" + this.opts.imageURLPrefix + "/fine.png'></div>        </div><div class='button' data-strokewidth='5' title='Medium Stroke'>          <div class='button-image-wrapper'><img src='" + this.opts.imageURLPrefix + "/medium.png'></div>        </div><div class='button' data-strokewidth='20' title='Coarse stroke'>          <div class='button-image-wrapper'><img src='" + this.opts.imageURLPrefix + "/coarse.png'></div>        </div>      </div>    ");
            $buttons = $el.filter(".button");
            if ($buttons.size() === 0) {
                $buttons = $el.find(".button");
            }
            $buttons.click(function(e) {
                $buttons.removeClass("active");
                return _this.selectStroke(e);
            });
            $active = $el.find("[data-strokewidth='" + this.tool.strokeWidth + "']");
            $active.addClass("active");
            return $el;
        };
        SimpleStrokeWidget.prototype.selectStroke = function(e) {
            var $button;
            $button = $(e.currentTarget);
            this.tool.strokeWidth = parseInt($button.data("strokewidth"));
            return $button.addClass("active");
        };
        return SimpleStrokeWidget;
    }(LC.ToolWidget);
    LC.RectangleWidget = function(_super) {
        __extends(RectangleWidget, _super);
        function RectangleWidget() {
            _ref2 = RectangleWidget.__super__.constructor.apply(this, arguments);
            return _ref2;
        }
        RectangleWidget.prototype.title = "Rectangle";
        RectangleWidget.prototype.cssSuffix = "rectangle";
        RectangleWidget.prototype.button = function() {
            return "<img src='" + this.opts.imageURLPrefix + "/rectangle.png'>";
        };
        RectangleWidget.prototype.makeTool = function() {
            return new LC.RectangleTool();
        };
        RectangleWidget.prototype.options = function() {
            var $el, $label, $strokewidth, _this = this;
            $el = $("<div>");
            this.tool.input = $("<input type='checkbox' value='transparent' id='chkTransparent'>");
            $label = $('<label for = "chkTransparent">Transparent&nbsp;&nbsp;&nbsp;</label>');
            $strokewidth = RectangleWidget.__super__.options.apply(this, arguments);
            $strokewidth.hide();
            this.tool.input.bind("change", function(e) {
                _this.tool.transparent = _this.tool.input.prop("checked");
                if (_this.tool.transparent) {
                    return $strokewidth.show();
                } else {
                    return $strokewidth.hide();
                }
            });
            $el.append(this.tool.input, $label, $strokewidth);
            return $el.children();
        };
        return RectangleWidget;
    }(LC.SimpleStrokeWidget);
    LC.LineWidget = function(_super) {
        __extends(LineWidget, _super);
        function LineWidget() {
            _ref3 = LineWidget.__super__.constructor.apply(this, arguments);
            return _ref3;
        }
        LineWidget.prototype.title = "Line";
        LineWidget.prototype.cssSuffix = "line";
        LineWidget.prototype.button = function() {
            return "<img src='" + this.opts.imageURLPrefix + "/line.png'>";
        };
        LineWidget.prototype.makeTool = function() {
            return new LC.LineTool();
        };
        return LineWidget;
    }(LC.SimpleStrokeWidget);
    LC.PencilWidget = function(_super) {
        __extends(PencilWidget, _super);
        function PencilWidget() {
            _ref4 = PencilWidget.__super__.constructor.apply(this, arguments);
            return _ref4;
        }
        PencilWidget.prototype.title = "Pencil";
        PencilWidget.prototype.cssSuffix = "pencil";
        PencilWidget.prototype.button = function() {
            return "<img src='" + this.opts.imageURLPrefix + "/pencil.png'>";
        };
        PencilWidget.prototype.makeTool = function() {
            return new LC.Pencil();
        };
        return PencilWidget;
    }(LC.SimpleStrokeWidget);
    LC.EraserWidget = function(_super) {
        __extends(EraserWidget, _super);
        function EraserWidget() {
            _ref5 = EraserWidget.__super__.constructor.apply(this, arguments);
            return _ref5;
        }
        EraserWidget.prototype.title = "Eraser";
        EraserWidget.prototype.cssSuffix = "eraser";
        EraserWidget.prototype.button = function() {
            return "<img src='" + this.opts.imageURLPrefix + "/eraser.png'>";
        };
        EraserWidget.prototype.makeTool = function() {
            return new LC.Eraser();
        };
        return EraserWidget;
    }(LC.SimpleStrokeWidget);
    LC.PanWidget = function(_super) {
        __extends(PanWidget, _super);
        function PanWidget() {
            _ref6 = PanWidget.__super__.constructor.apply(this, arguments);
            return _ref6;
        }
        PanWidget.prototype.title = "Pan";
        PanWidget.prototype.cssSuffix = "pan";
        PanWidget.prototype.button = function() {
            return "<img src='" + this.opts.imageURLPrefix + "/pan.png'>";
        };
        PanWidget.prototype.makeTool = function() {
            return new LC.Pan();
        };
        return PanWidget;
    }(LC.ToolWidget);
    LC.EyeDropperWidget = function(_super) {
        __extends(EyeDropperWidget, _super);
        function EyeDropperWidget() {
            _ref7 = EyeDropperWidget.__super__.constructor.apply(this, arguments);
            return _ref7;
        }
        EyeDropperWidget.prototype.title = "Eyedropper";
        EyeDropperWidget.prototype.cssSuffix = "eye-dropper";
        EyeDropperWidget.prototype.button = function() {
            return "<img src='" + this.opts.imageURLPrefix + "/eyedropper.png'>";
        };
        EyeDropperWidget.prototype.makeTool = function() {
            return new LC.EyeDropper();
        };
        return EyeDropperWidget;
    }(LC.ToolWidget);
    LC.GraphWidget = function(_super) {
        __extends(GraphWidget, _super);
        function GraphWidget() {
            _ref8 = GraphWidget.__super__.constructor.apply(this, arguments);
            return _ref8;
        }
        GraphWidget.prototype.title = "Graph";
        GraphWidget.prototype.cssSuffix = "graph";
        GraphWidget.prototype.button = function() {
            return "<img src='" + this.opts.imageURLPrefix + "/graph.png'>";
        };
        GraphWidget.prototype.makeTool = function() {
            return new LC.GraphTool();
        };
        return GraphWidget;
    }(LC.ToolWidget);
    LC.TextWidget = function(_super) {
        __extends(TextWidget, _super);
        function TextWidget() {
            _ref9 = TextWidget.__super__.constructor.apply(this, arguments);
            return _ref9;
        }
        TextWidget.prototype.title = "Text";
        TextWidget.prototype.cssSuffix = "text";
        TextWidget.prototype.button = function() {
            return "<img src='" + this.opts.imageURLPrefix + "/text.png'>";
        };
        TextWidget.prototype.makeTool = function() {
            return new LC.TextTool();
        };
        TextWidget.prototype.options = function() {
            var $el, $input, _this = this;
            $el = $("      <input class='input-text-val' type='text' value='' placeholder='Text to insert ...'>    ");
            $input = $el.filter("input");
            if ($input.size() === 0) {
                $input = $el.find("input");
            }
            this.tool.input = $input;
            $input.bind("keyup change", function(e) {
                return _this.tool.inputText = $(e.currentTarget).val();
            });
            return $el;
        };
        return TextWidget;
    }(LC.ToolWidget);
}).call(this);