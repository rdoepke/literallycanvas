window.LC = window.LC ? {}


class LC.LiterallyCanvas

  constructor: (@canvas, @opts) ->
    @$canvas = $(@canvas)
    @colors =
      primary: @opts.primaryColor or '#000'
      secondary: @opts.secondaryColor or '#fff'
      background: @opts.backgroundColor or 'rgba(230, 230, 230, 1.0)'
    $(@canvas).css('background-color', @colors.background)
    @setBackground @opts.backgroundImage

    @buffer = $('<canvas>').get(0)
    @ctx = @canvas.getContext('2d')
    @bufferCtx = @buffer.getContext('2d')

    @shapes = []
    @undoStack = []
    @redoStack = []

    @isDragging = false
    @position = {x: 0, y: 0}
    @scale = 1.0
    @tool = undefined

    @repaint()

  trigger: (name, data) ->
    @canvas.dispatchEvent new CustomEvent name,
      detail: data

  on: (name, fn) ->
    @canvas.addEventListener name, (e) ->
      fn e.detail

  clientCoordsToDrawingCoords: (x, y) ->
    x: (x - @position.x) / @scale,
    y: (y - @position.y) / @scale,

  drawingCoordsToClientCoords: (x, y) ->
    x: x * @scale + @position.x,
    y: y * @scale + @position.y

  begin: (x, y) ->
    newPos = @clientCoordsToDrawingCoords(x, y)
    @tool.begin newPos.x, newPos.y, this
    @isDragging = true

  continue: (x, y) ->
    newPos = @clientCoordsToDrawingCoords(x, y)
    @tool.continue newPos.x, newPos.y, this if @isDragging

  end: (x, y) ->
    newPos = @clientCoordsToDrawingCoords(x, y)
    @tool.end newPos.x, newPos.y, this if @isDragging
    @isDragging = false

  setColor: (name, color) ->
    @colors[name] = color
    $(@canvas).css('background-color', @colors.background)
    @trigger "#{name}ColorChange", @colors[name]
    @repaint()

  getColor: (name) -> @colors[name]

  saveShape: (shape) ->
    @execute(new LC.AddShapeAction(this, shape))

  pan: (x, y) ->
    # Subtract because we are moving the viewport
    @position.x = @position.x - x
    @position.y = @position.y - y
    # if we have a background, we need to move it as well
    if @background
      @background.offset.x = @background.offset.x - x
      @background.offset.y = @background.offset.y - y
      @updateBackground()
      

  zoom: (factor) ->
    oldScale = @scale
    @scale = @scale + factor
    @scale = Math.max(@scale, 0.2)
    @scale = Math.min(@scale, 4.0)
    @scale = Math.round(@scale*100)/100

    @position.x = LC.scalePositionScalar(
      @position.x, @canvas.width, oldScale, @scale)
    @position.y = LC.scalePositionScalar(
      @position.y, @canvas.height, oldScale, @scale)

    @repaint()
    
    # if we have a background, we need to zoom it as well
    if @background
      @background.offset =
        x: LC.scalePositionScalar(
          @background.offset.x, @canvas.width, oldScale, @scale)
        y: LC.scalePositionScalar(
          @background.offset.y, @canvas.height, oldScale, @scale)
      @background.dimension = 
        w: Math.round(@background.init_dimension.w * @scale)
        h: Math.round(@background.init_dimension.h * @scale)
      @updateBackground()

  # Repaints the canvas.
  # If dirty is true then all saved shapes are completely redrawn,
  # otherwise the back buffer is simply copied to the screen as is.
  # If drawBackground is true, the background is rendered as a solid
  # color, otherwise it is left transparent.
  repaint: (dirty = true, drawBackground = false) ->
    if dirty
      @buffer.width = @canvas.width
      @buffer.height = @canvas.height
      @bufferCtx.clearRect(0, 0, @buffer.width, @buffer.height)
      if drawBackground
        @bufferCtx.fillStyle = @colors.background
        @bufferCtx.fillRect(0, 0, @buffer.width, @buffer.height)
      @draw @shapes, @bufferCtx
    @ctx.clearRect(0, 0, @canvas.width, @canvas.height)
    if @canvas.width > 0 and @canvas.height > 0
      @ctx.drawImage @buffer, 0, 0

  # Redraws the back buffer to the screen in its current state
  # then draws the given shape translated and scaled on top of that.
  # This is used for updating a shape while it is being drawn
  # without doing a full repaint.
  # The context is restored to its original state before returning.
  update: (shape) ->
    @repaint false
    @transformed =>
      shape.update(@ctx)
    , @ctx

  # Draws the given shapes translated and scaled to the given context.
  # The context is restored to its original state before returning.
  draw: (shapes, ctx) ->
    @transformed ->
      _.each shapes, (s) =>
        s.draw(ctx)
    , ctx

  # Executes the given function after translating and scaling the context.
  # The context is restored to its original state before returning.
  transformed: (fn, ctx) ->
    ctx.save()
    ctx.translate @position.x, @position.y
    ctx.scale @scale, @scale
    fn()
    ctx.restore()

  clear: ->
    @execute(new LC.ClearAction(this))
    @shapes = []
    @repaint()

  execute: (action) ->
    @undoStack.push(action)
    action.do()
    @redoStack = []

  undo: ->
    return unless @undoStack.length
    action = @undoStack.pop()
    action.undo()
    @redoStack.push(action)

  redo: ->
    return unless @redoStack.length
    action = @redoStack.pop()
    @undoStack.push(action)
    action.do()

  getPixel: (x, y) ->
    p = @drawingCoordsToClientCoords x, y
    pixel = @ctx.getImageData(p.x, p.y, 1, 1).data
    if pixel[3]
      "rgb(" + pixel[0] + "," + pixel[1] + ","  + pixel[2] + ")"
    else
      null

  canvasForExport: ->
    #originally draws new rectangle as background, like this
    #@repaint(true, true)
    #we want to annotate slides - so leave it transparent (2nd param = false):
    @repaint(true, false)
    output = $('<canvas>').get(0)
    output.width = @canvas.width
    output.height = @canvas.height
    outputCtx = output.getContext('2d')
    if @background
      outputCtx.drawImage(@background.image, 
        @background.offset.x, @background.offset.y, 
        @background.dimension.w, @background.dimension.h)
    outputCtx.drawImage(@canvas, 0, 0)
    output
    
  # for annotating slides we need to be able to set a background
  setBackground: (backgroundURL) ->
    if !backgroundURL || backgroundURL == ''
      @$canvas.css 'background-image', 'none'
      @background = null
      return
    image = new Image()
    image.onload = =>
      resizedDimensions = LC.resize(image.width, image.height, 
        @canvas.width, @canvas.height)
      @background = 
        image: image
        init_dimension:
          w: resizedDimensions.width
          h: resizedDimensions.height
        dimension:
          w: resizedDimensions.width
          h: resizedDimensions.height
        offset:
          x: 0
          y: 0
      @$canvas.css("background-image", "url('#{backgroundURL}')")
      @updateBackground()
    image.src = backgroundURL    

  updateBackground: ->
    @$canvas.css("background-size", 
      "#{@background.dimension.w}px #{@background.dimension.h}px")
    @$canvas.css("background-position",
      "#{@background.offset.x}px #{@background.offset.y}px")

# maybe add checks to these in the future to make sure you never double-undo or
# double-redo
class LC.ClearAction

  constructor: (@lc) ->
    @oldShapes = @lc.shapes

  do: ->
    @lc.shapes = []
    @lc.repaint()

  undo: ->
    @lc.shapes = @oldShapes
    @lc.repaint()


class LC.AddShapeAction

  constructor: (@lc, @shape) ->

  do: ->
    @ix = @lc.shapes.length
    @lc.shapes.push(@shape)
    @lc.repaint()

  undo: ->
    @lc.shapes.pop(@ix)
    @lc.repaint()
