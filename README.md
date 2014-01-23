Canvas for WeScript
================

Canvas for WeScript is an HTML5 drawing widget designed to be used in the
collaborative lecture notes app WeScript of the RWTH Aachen University. It is
based on the great drawing widget [Literally Canvas](http://literallycanvas.github.com)
written by Stephen Johnson and Cameron Paul. It was reduced in function and adds 
new functionality. It is laid out to be used in a lecture slides annotating
context. Hence, it is capable for creating quick and dirty lecture notes
scribbles. In contrast to the original widget it is capable of loading images
in the background to be drawn upon and exporting the result. Additionally it supports
adding text (different implementation from the original literallycanvas).

Usage
-----

[Full original documentation ](http://literallycanvas.github.com)

Literally Canvas depends on jQuery (tested on 1.8.2) and underscore.js (tested
on 1.4.2). The "fat" version includes these dependencies. The "thin" version
does not.

Add the files under `lib/css` and `lib/img` to your project, as well as the
appropriate file from `lib/js`. Then do this:

```html
<div class="literally"><canvas></canvas></div>
```

```javascript
$('.literally').literallycanvas();
```

In order to add a background image, call either
```javascript
// upon initialization
$('.literally').literallycanvas({backgroundImage: 'image.jpg'});

// after initialization, call with null or '' to reset
$('.literally').literallycanvas("option", "backgroundImage", "image.jpg");
```

You can add custom buttons upon initialization, by providing objects within an
array to the call, e.g.:
```javascript
$('.literally').literallycanvas({customButtons: [{
  title: 'Tooltip for the button',
  cssSuffix: 'myCustomButton',
  buttonImage: 'myImage.jpg',
  text: 'Example button',
  callback: function() { alert('alerts suck'); },
}, {text: 'second button'}]});
```
All elements of an button object are optional. Thus, you may provide either text
or an image for the button to show (or both).

Files
-----

```
coffee/       Coffeescript source code
js/           Javascript dependencies and temporary Javascript files
lib/          Things you need to use Literally Canvas on your page
LICENSE       The license. Spoiler: it's BSD!
README.md     You are here
watch_js.sh   Simple watch script for people who don't have make (...)
```

Developing
----------

You'll need `coffee-script` and `uglify-js2` installed via `npm`, and `sass`
via `gem`.
