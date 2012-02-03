all:
	coco -o lib -cb lib/index.co
	coco -o . -j package.co

clean:
	rm -rf lib/*.js

test: all
	coco test/test.co