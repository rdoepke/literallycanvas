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
    @initColors()
    @initButtons()
    @initTools()
    @initZoom()

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
          <div class='tool-image-wrapper'></div>
        </div>
        ")
      buttonEl.find('.tool-image-wrapper').html(t.button())
      @$el.find('.tools').append(buttonEl)

      buttonEl.click (e) =>
        @selectTool(t)

  initZoom: ->
    @$el.find('.zoom-in-button').click (e) =>
      @lc.zoom(0.2)
      @$el.find('.zoom-display').html(@lc.scale)

    @$el.find('.zoom-out-button').click (e) =>
      @lc.zoom(-0.2)
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
        <div class='button clear-button danger varwidth' title='Start over'>Clear</div>
        <div class='button-group'>
          <div class='button btn-warning undo-button' title='Undo'>
            <div class='tool-image-wrapper'><img src='#{@opts.imageURLPrefix}/undo.png'></div>
          </div><div class='button btn-warning redo-button' title='Redo'>
            <div class='tool-image-wrapper'><img src='#{@opts.imageURLPrefix}/redo.png'></div>
          </div>
        </div>
        <div class='button-group'>
          <div class='button btn-inverse zoom-out-button' title='Zoom out'>
            <div class='tool-image-wrapper'><img src='#{@opts.imageURLPrefix}/zoom-out.png'></div>
          </div><div class='button btn-inverse zoom-in-button' title='Zoom in'>
            <div class='tool-image-wrapper'><img src='#{@opts.imageURLPrefix}/zoom-in.png'></div>
          </div>
        </div>
        <div class='zoom-display' title='Current zoomlevel'>1</div>
      </div>
      <div class='clearfix'></div>
    </div>

    <div class='toolbar-row'>
      <div class='toolbar-row-left'>
        <div class='primary-picker'></div>
        <div class='tool-options-container'></div>
      </div>
      <div class='clearfix'></div>
    </div>
  "