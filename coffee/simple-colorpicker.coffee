
class Color
  constructor: (val) ->
    @setColor val
  
  #parse a string to RGB
  setColor: (val) ->
    val = val.toLowerCase()
    that = this
    $.each CPGlobal.stringParsers, (i, parser) ->
      match = parser.re.exec(val)
      values = match and parser.parse(match)
      if values
        that.r = values[0]
        that.g = values[1]
        that.b = values[2]
        that.a = (if !!values[3] then values[3] else 1.0)    
  
  toRGB: (r, g, b, a) ->
    r: @r
    g: @g
    b: @b
    a: @a
    
  toString: (string) ->
    return 'rgba('+@r+','+@g+','+@b+','+@a+')'

class Colorpicker
  constructor: (element, options) ->
    @opts = _.extend({
      colors: [
        {val: 'rgba(0,0,0,1.0)', title: 'Black'},
        {val: 'rgba(0,83,159,1.0)', 'rgba(0,0,0,1.0)', title: 'Dark blue'},
        {val: 'rgba(128,171,215,1.0)', title: 'Light blue'},
        {val: 'rgba(185,15,15,1.0)', title: 'Red'},
      ],
    }, options)
    @preparePicker element
    @availableColors = @picker.find(".colorpicker-color")
    @availableColors.on("click", $.proxy(@click, this))
    @setValue(@element.data("color"))
        
  click: (event) ->
    color = event.target.getAttribute("data-color")
    @setValue(color)

  setValue: (newColor) ->
    @color = new Color(newColor)
    @availableColors.removeClass("active")
    @availableColors.siblings('[data-color="'+@color.toString()+'"]').addClass("active")
    @element.trigger
      type: "changeColor"
      color: @color
      secondary: true
      
  preparePicker: (element) ->
    @element = $(element)
    @picker = @element.append($(CPGlobal.template))
    _.each @opts.colors, (c) =>
      if !c.background
        c.background = c.val
      $color = $("<div data-color='#{c.val}' class='colorpicker-color' 
        style='background: #{c.background}' title='#{c.title}' ></div>")
      if c.transparent
        $color.addClass "transparent"
      $color.appendTo(@picker.find('.colorpicker'));
      $color.click (e) =>
        @click e

$.fn.colorpicker = (option) ->
  @each ->
    $this = $(this)
    data = $this.data("colorpicker")
    options = typeof option is "object" and option
    $this.data "colorpicker", (data = new Colorpicker(this, $.extend({}, $.fn.colorpicker.defaults, options)))  unless data
    data[option]()  if typeof option is "string"


$.fn.colorpicker.defaults = {}
$.fn.colorpicker.Constructor = Colorpicker
CPGlobal =

  # a set of RE's that can match strings and generate color tuples.
  # from John Resig color plugin
  # https://github.com/jquery/jquery-color/
  stringParsers: [
    re: /rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*(\d+(?:\.\d+)?)\s*)?\)/
    parse: (execResult) ->
      [execResult[1], execResult[2], execResult[3], execResult[4]]
  ,
    re: /rgba?\(\s*(\d+(?:\.\d+)?)\%\s*,\s*(\d+(?:\.\d+)?)\%\s*,\s*(\d+(?:\.\d+)?)\%\s*(?:,\s*(\d+(?:\.\d+)?)\s*)?\)/
    parse: (execResult) ->
      [2.55 * execResult[1], 2.55 * execResult[2], 2.55 * execResult[3], execResult[4]]
  ,
    re: /#([a-fA-F0-9]{2})([a-fA-F0-9]{2})([a-fA-F0-9]{2})/
    parse: (execResult) ->
      [parseInt(execResult[1], 16), parseInt(execResult[2], 16), parseInt(execResult[3], 16)]
  ,
    re: /#([a-fA-F0-9])([a-fA-F0-9])([a-fA-F0-9])/
    parse: (execResult) ->
      [parseInt(execResult[1] + execResult[1], 16), parseInt(execResult[2] + execResult[2], 16), parseInt(execResult[3] + execResult[3], 16)]
  ]

  template: """
    <div class="colorpicker">
    </div>
  """
