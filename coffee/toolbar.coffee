window.LC = window.LC ? {}

LC.makeColorPicker = ($el, title, callback) ->
  $el.data('color', 'rgba(0, 0, 0, 1.0)')
  cp = $el.colorpicker(format: 'rgba').data('colorpicker')
  $el.on 'changeColor', (e) ->
    callback(e.color.toRGB())
  return cp


class LC.Toolbar

  constructor: (@lc, @$el, @opts) ->
    @$el.append(@template())
    @initButtons()
    @initTools()
    @initColors()
    @initZoom()
    @initCustomButtons()

  _bindColorPicker: (name, title) ->
    $el = @$el.find(".#{name}-picker")
    LC.makeColorPicker $el, "#{title} color", (c) =>
      @lc.setColor(name, "rgba(#{c.r}, #{c.g}, #{c.b}, #{c.a})")

  initColors: ->
    pickers = [
      @_bindColorPicker('primary', 'Primary (stroke)')
      #@_bindColorPicker('secondary', 'Secondary (fill)')
      #@_bindColorPicker('background', 'Background')
    ]

  initButtons: ->
    @$el.find('.clear-button').click (e) =>
      @lc.clear()

    @$el.find('.undo-button').click (e) =>
      @lc.undo()

    @$el.find('.redo-button').click (e) =>
      @lc.redo()
      
    $rbButton = @$el.find('.removebackground-button')
    @lc.removeBackgroundButton = $rbButton
    $rbButton.hide() if !@lc.background
    $rbButton.click (e) =>
      @lc.setBackground null

  initTools: ->
    @tools = (new ToolClass(@opts) for ToolClass in @opts.toolClasses)
    _.each @tools, (t) =>
      optsEl = $("<div class='tool-options tool-options-#{t.cssSuffix}'></div>")
      optsEl.html(t.options())
      optsEl.hide()
      t.$el = optsEl
      @$el.find('.tool-options-container').append(optsEl)

      buttonEl = $("
        <div class='button tool-#{t.cssSuffix}' title='#{t.title}'>
          <div class='button-image-wrapper'></div>
        </div>
        ")
      buttonEl.find('.button-image-wrapper').html(t.button())
      @$el.find('.tools').append(buttonEl)

      buttonEl.click (e) =>
        @selectTool(t)

  initCustomButtons: ->
    @customButtons = @opts.customButtons
    _.each @customButtons, (c) =>
      #defaults
      _.extend({
        title: ''
        cssSuffix: 'button'
        buttonImage: null
        text: null
        callback: -> 
      }, c)
    
      buttonEl = $("
        <div class='button custom-#{c.cssSuffix}' title='#{c.title}'>
          <div class='button-image-wrapper'></div>
        </div>")
        
      imageWrapper = buttonEl.find('.button-image-wrapper')
      if !!c.buttonImage
        imageWrapper.html("<img src='#{c.buttonImage}'/>")
      else
        imageWrapper.remove()
        
      if !!c.text
        buttonEl.addClass('varwidth')
        buttonEl.append(c.text)
      
      @$el.find('.custom-buttons').append(buttonEl)
      buttonEl.click (e) =>
        c.callback()
      
  initZoom: ->
    @$el.find('.zoom-in-button').click (e) =>
      @lc.zoom(0.2)
      @updateZoom()

    @$el.find('.zoom-out-button').click (e) =>
      @lc.zoom(-0.2)
      @updateZoom()
      
    @$el.find('.zoom-display').click (e) =>
      @lc.zoom(-@lc.scale + 1)
      @updateZoom()
      
  updateZoom: ->
    @$el.find('.zoom-display').html(@lc.scale)

  selectTool: (t) ->
    @$el.find(".tools .active").removeClass("active")
    @$el.find(".tools .tool-#{t.cssSuffix}").addClass("active")
    t.select(@lc)
    @$el.find('.tool-options').hide()
    t.$el.show() if t.$el

  template: () ->
    return "
    <div class='toolbar-row'>
      <div class='toolbar-row-left'>
        <div class='tools button-group'></div>
      </div>

      <div class='toolbar-row-right'>
        <div class='button removebackground-button danger' title='Remove background image'>
          <div class='button-image-wrapper'><img src='#{@opts.imageURLPrefix}/removebackground.png'></div>
        </div>
        <div class='button clear-button danger varwidth' title='Reset drawing'>Clear</div>
        <div class='button-group'>
          <div class='button btn-warning undo-button' title='Undo'>
            <div class='button-image-wrapper'><img src='#{@opts.imageURLPrefix}/undo.png'></div>
          </div><div class='button btn-warning redo-button' title='Redo'>
            <div class='button-image-wrapper'><img src='#{@opts.imageURLPrefix}/redo.png'></div>
          </div>
        </div>
        <div class='button-group'>
          <div class='button btn-inverse zoom-out-button' title='Zoom out'>
            <div class='button-image-wrapper'><img src='#{@opts.imageURLPrefix}/zoom-out.png'></div>
          </div><div class='button btn-inverse zoom-in-button' title='Zoom in'>
            <div class='button-image-wrapper'><img src='#{@opts.imageURLPrefix}/zoom-in.png'></div>
          </div>
        </div>
        <div class='zoom-display' title='Current zoomlevel. Click to reset to 1'>1</div>
      </div>
      <div class='clearfix'></div>
    </div>

    <div class='toolbar-row'>
      <div class='toolbar-row-left'>
        <div class='primary-picker'></div>
        <div class='tool-options-container'></div>
      </div>
      <div class='toolbar-row-right custom-buttons'>
      </div>
      <div class='clearfix'></div>
    </div>
  "