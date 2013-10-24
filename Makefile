.PHONY: coffee clean all css update-gh-pages

all: lib/js/literallycanvas.js lib/js/literallycanvas.min.js css

clean:
	rm -f gen/*.js
	rm -f lib/js/literallycanvas.*.js

watch-js:
	watch -n 2 make lib/js/literallycanvas.js

watch-css:
	sass --no-cache --watch scss/literally.scss:lib/css/literally.css

css:
	sass --no-cache scss/literally.scss lib/css/literally.css

coffee: coffee/*.coffee
	mkdir -p gen
	coffee -o gen -c coffee

lib/js/literallycanvas.js: coffee
	uglifyjs2 gen/*.js -o lib/js/literallycanvas.js --beautify

lib/js/literallycanvas.min.js: coffee
	uglifyjs2 gen/*.js -o lib/js/literallycanvas.min.js --compress

serve:
	python -m SimpleHTTPServer 8000 .
