class LC.Widget
    
  constructor: (@opts) ->
    
  # text to be shown in a hypothetical tooltip
  title: undefined

  # suffix of the CSS elements that are generated for this class.
  # specficially tool-{suffix} for the button, and tool-options-{suffix} for
  # the options container.
  cssSuffix: undefined

  # function that returns the HTML of the tool button's contents
  button: -> undefined

  # function that returns the HTML of the tool options
  options: -> undefined
    
  # called when the widget is selected
  select: (lc) ->
        

class LC.ToolWidget extends LC.Widget
    
  constructor: (@opts) ->
    @tool = @makeTool()
        
  select: (lc) ->
    lc.tool = @tool
        
  makeTool: -> undefined
        

class LC.StrokeWidget extends LC.ToolWidget
    
  options: ->
    $el = $("
      <span class='brush-width-min'>1 px</span>
      <input type='range' min='1' max='50' step='1' value='#{@tool.strokeWidth}'>
      <span class='brush-width-max'>50 px</span>
      <span class='brush-width-val'>(5 px)</span>
    ")

    $input = $el.filter('input')
    if $input.size() == 0
      $input = $el.find('input')

    $brushWidthVal = $el.filter('.brush-width-val')
    if $brushWidthVal.size() == 0
      $brushWidthVal = $el.find('.brush-width-val')

    $input.change (e) =>
      @tool.strokeWidth = parseInt($(e.currentTarget).val(), 10)
      $brushWidthVal.html("(#{@tool.strokeWidth} px)")
    return $el


class LC.SimpleStrokeWidget extends LC.ToolWidget
  
  options: ->
    $el = $("
      <div class='button-group simple-strokewidth'>
        <div class='button' data-strokewidth='2' title='Fine Stroke'>
          <div class='button-image-wrapper'><img src='#{@opts.imageURLPrefix}/fine.png'></div>
        </div><div class='button' data-strokewidth='5' title='Medium Stroke'>
          <div class='button-image-wrapper'><img src='#{@opts.imageURLPrefix}/medium.png'></div>
        </div><div class='button' data-strokewidth='20' title='Coarse stroke'>
          <div class='button-image-wrapper'><img src='#{@opts.imageURLPrefix}/coarse.png'></div>
        </div>
      </div>
    ")

    $buttons = $el.filter('.button')
    if $buttons.size() == 0
      $buttons = $el.find('.button')
    $buttons.click (e) =>
      $buttons.removeClass("active")  
      @selectStroke(e)
      
    #find active strokesize
    $active = $el.find("[data-strokewidth='#{@tool.strokeWidth}']")
    $active.addClass("active")
    
    return $el

  selectStroke: (e) ->
    $button = $(e.currentTarget)
    @tool.strokeWidth = parseInt($button.data("strokewidth"))
    $button.addClass("active")
    

class LC.RectangleWidget extends LC.SimpleStrokeWidget

  title: 'Rectangle'
  cssSuffix: 'rectangle'
  button: -> "<img src='#{@opts.imageURLPrefix}/rectangle.png'>"
  makeTool: -> new LC.RectangleTool()
  options: ->
    $el = $('<div>')
    @tool.input = $("<input type='checkbox' value='transparent' id='chkTransparent'>")
    $label = $('<label for = "chkTransparent">Transparent&nbsp;&nbsp;&nbsp;</label>')
    $strokewidth = super
    $strokewidth.hide()
    
    @tool.input.bind 'change', (e) =>
      @tool.transparent = @tool.input.prop('checked')
      if @tool.transparent
        $strokewidth.show()
      else
        $strokewidth.hide()
    
    $el.append @tool.input, $label, $strokewidth
    return $el.children()
  

class LC.LineWidget extends LC.SimpleStrokeWidget

  title: 'Line'
  cssSuffix: 'line'
  button: -> "<img src='#{@opts.imageURLPrefix}/line.png'>"
  makeTool: -> new LC.LineTool()
   

class LC.PencilWidget extends LC.SimpleStrokeWidget

  title: "Pencil"
  cssSuffix: "pencil"
  button: -> "<img src='#{@opts.imageURLPrefix}/pencil.png'>"
  makeTool: -> new LC.Pencil()


class LC.EraserWidget extends LC.SimpleStrokeWidget

  title: "Eraser"
  cssSuffix: "eraser"
  button: -> "<img src='#{@opts.imageURLPrefix}/eraser.png'>"
  makeTool: -> new LC.Eraser()


class LC.PanWidget extends LC.ToolWidget

  title: "Pan"
  cssSuffix: "pan"
  button: -> "<img src='#{@opts.imageURLPrefix}/pan.png'>"
  makeTool: -> new LC.Pan()


class LC.EyeDropperWidget extends LC.ToolWidget

  title: "Eyedropper"
  cssSuffix: "eye-dropper"
  button: -> "<img src='#{@opts.imageURLPrefix}/eyedropper.png'>"
  makeTool: -> new LC.EyeDropper()
  
  
class LC.GraphWidget extends LC.ToolWidget
  title: "Graph"
  cssSuffix: "graph"
  button: -> "<img src='#{@opts.imageURLPrefix}/graph.png'>"
  makeTool: -> new LC.GraphTool()


class LC.TextWidget extends LC.ToolWidget
  title: "Text"
  cssSuffix: "text"
  button: -> "<img src='#{@opts.imageURLPrefix}/text.png'>"
  makeTool: -> new LC.TextTool()
  options: ->
    $el = $("
      <input class='input-text-val' type='text' value='' placeholder='Text to insert ...'>
    ")

    $input = $el.filter('input')
    if $input.size() == 0
      $input = $el.find('input')
    @tool.input = $input

    $input.bind 'keyup change', (e) =>
      @tool.inputText = $(e.currentTarget).val()
    return $el
