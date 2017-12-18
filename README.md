# jstransformer-nunjucks

[Nunjucks](http://mozilla.github.io/nunjucks/) support for [JSTransformers](http://github.com/jstransformers).

[![Dependency Status](https://img.shields.io/david/stephenwf/jstransformer-nunjucks/master.svg)](http://david-dm.org/stephenwf/jstransformer-nunjucks)
[![NPM version](https://img.shields.io/npm/v/jstransformer-nunjucks-node.svg)](https://www.npmjs.org/package/jstransformer-nunjucks-node)

## Installation

    npm install jstransformer-nunjucks

## API

```js
var nunjucks = require('jstransformer')(require('jstransformer-nunjucks'))

nunjucks.render('Hello, {{ name }}!', {name: 'World'}).body
//=> 'Hello, World!'
```

## License

MIT
