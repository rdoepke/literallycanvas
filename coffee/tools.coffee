class LC.Tool

  # called when the user starts dragging
  begin: (x, y, lc) ->

  # called when the user moves while dragging
  continue: (x, y, lc) ->

  # called when the user finishes dragging
  end: (x, y, lc) ->


class LC.StrokeTool extends LC.Tool

  constructor: () ->
    @strokeWidth = 2


class LC.RectangleTool extends LC.StrokeTool

  begin: (x, y, lc) ->
    @currentShape = new LC.Rectangle(
      x, y, @strokeWidth, lc.getColor('primary'), lc.getColor('secondary'))

  continue: (x, y, lc) ->
    @currentShape.width = x - @currentShape.x
    @currentShape.height = y - @currentShape.y
    lc.update(@currentShape)

  end: (x, y, lc) ->
    lc.saveShape(@currentShape)


class LC.LineTool extends LC.StrokeTool

  begin: (x, y, lc) ->
    @currentShape = new LC.Line(x, y, @strokeWidth, lc.getColor('primary'))

  continue: (x, y, lc) ->
    @currentShape.x2 = x
    @currentShape.y2 = y
    lc.update(@currentShape)

  end: (x, y, lc) ->
    lc.saveShape(@currentShape)
   

class LC.Pencil extends LC.StrokeTool

  begin: (x, y, lc) ->
    @color = lc.getColor('primary')
    @currentShape = @makeShape()
    @currentShape.addPoint(@makePoint(x, y, lc))

  continue: (x, y, lc) ->
    @currentShape.addPoint(@makePoint(x, y, lc))
    lc.update(@currentShape)

  end: (x, y, lc) ->
    lc.saveShape(@currentShape)
    @currentShape = undefined

  makePoint: (x, y, lc) -> new LC.Point(x, y, @strokeWidth, @color)
  makeShape: -> new LC.LinePathShape(this)


class LC.Eraser extends LC.Pencil

  constructor: () ->
    @strokeWidth = 5

  makePoint: (x, y, lc) -> new LC.Point(x, y, @strokeWidth, '#000')
  makeShape: -> new LC.EraseLinePathShape(this)


class LC.Pan extends LC.Tool

  begin: (x, y, lc) ->
    @start = {x:x, y:y}

  continue: (x, y, lc) ->
    lc.pan @start.x - x, @start.y - y
    lc.repaint()


class LC.EyeDropper extends LC.Tool
    
  readColor: (x, y, lc) ->
    newColor = lc.getPixel(x, y)
    lc.setColor('primary', newColor or lc.getColor('background'))

  begin: (x, y, lc) ->
    @readColor(x, y, lc)

  continue: (x, y, lc) ->
    @readColor(x, y, lc)
    

class LC.TextTool extends LC.Tool

  constructor: () ->
    @inputText = ""
    

  begin: (x, y, lc) ->
    if !@endpos
      @input.focus()
      @size = 16
      @currentShape = new LC.Text(
        x, y, @size, "sans-serif", lc.getColor('primary'), @inputText)

  continue: (x, y, lc) ->
    @currentShape.text = @inputText
    @currentShape.x = x
    @currentShape.y = y
    lc.update(@currentShape)
    
  finishTyping: (lc) ->
    @input.off 'keyup.edittext change.edittext'
    $('body').off 'click.edittext'
    @boundKeyup = @boundClick = false
    @endpos = null
    @save lc

  save: (lc) ->
    lc.saveShape(@currentShape)
    @inputText = ""
    @input.val("")
    
  bodyClickOne: (lc) ->
    $('body').one 'click.edittext', (e) =>
      if (e.target == @input.get(0))
        @bodyClickOne lc
      else
        @finishTyping lc

  end: (x, y, lc) ->
    if !$.trim(@inputText)
      @endpos =
        x: x
        y: y
        lc: lc
      if !@boundKeyup
        @boundKeyup = true
        @input.on 'keyup.edittext change.edittext', (e) =>
          if e.keyCode == 13
            @save lc
            @endpos.y = @endpos.y + @size*1.2
            @currentShape = new LC.Text(@endpos.x, @endpos.y, @size, 
              "sans-serif", lc.getColor('primary'), @inputText)
          else
            if !@boundClick
              @boundClick = true
              @bodyClickOne lc
          @continue(@endpos.x, @endpos.y, @endpos.lc)
    else
      @finishTyping lc
      
      
class LC.GraphTool extends LC.Tool

  begin: (x, y, lc) ->
    @currentShape = new LC.Graph(x, y, 2, lc.getColor('primary'), 20)

  continue: (x, y, lc) ->
    @currentShape.x2 = x
    @currentShape.y2 = y
    lc.update(@currentShape)

  end: (x, y, lc) ->
    lc.saveShape(@currentShape)
