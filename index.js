'use strict'

const path = require('path')
const fs = require('fs')
const nunjucks = require('nunjucks')
const extend = require('extend-shallow')

exports.name = 'nunjucks-node'
exports.inputFormats = ['njk', 'nunjucks', 'twig']
exports.outputFormat = 'html'

nunjucks.installJinjaCompat()

// https://github.com/jxson/front-matter/blob/master/index.js#L2-L13
const optionalByteOrderMark = '\\ufeff?'
const pattern = '^(' +
  optionalByteOrderMark +
  '(= yaml =|---)' +
  '$([\\s\\S]*?)' +
  '^(?:\\2|\\.\\.\\.)' +
  '$' +
  (process.platform === 'win32' ? '\\r?' : '') +
  '(?:\\n)?)'
// NOTE: If this pattern uses the 'g' flag the `regex` variable definition will
// need to be moved down into the functions that use it.
const regex = new RegExp(pattern, 'm')

function ignoreFrontMatter(file) {
  return file.replace(regex, '')
}

function isLernaProject() {
  return fs.existsSync(
    path.resolve(
      path.join(
        process.cwd(),
        '..',
        '..',
        'lerna.json'
      )
    )
  )
}

const NodeLoader = nunjucks.FileSystemLoader.extend({
  init(searchPaths, opts) {
    this.reporter = opts ? opts.reporter : {}
    nunjucks.FileSystemLoader.prototype.init.call(this, searchPaths, opts)
  },
  getSource(name) {
    let fullpath = null
    const paths = this.searchPaths

    for (let i = 0; i < paths.length; i++) {
      const p = path.resolve(paths[i], name)

      if (fs.existsSync(p)) {
        fullpath = p
        break
      }
    }

    if (!fullpath) {
      try {
        fullpath = require.resolve(path.join(process.cwd(), 'node_modules', name))
        this.reporter[name] = fullpath
      } catch (err) {
      }
    }

    // Lerna
    if (!fullpath && isLernaProject()) {
      try {
        fullpath = require.resolve(path.join(process.cwd(), '..', '..', 'node_modules', name))
        this.reporter[name] = fullpath
      } catch (err) {
      }
    }

    if (!fullpath) {
      return null
    }

    this.pathsToNames[fullpath] = name

    return {
      src: ignoreFrontMatter(fs.readFileSync(fullpath, 'utf-8')),
      path: fullpath,
      noCache: this.noCache
    }
  }
})

exports.compile = function (str, options) {
  // Prepare the options.
  const opts = extend({watch: false}, options)

  // Find the path for which the environment will be created.
  const envpath = opts.root || opts.path || (opts.filename ? path.dirname(opts.filename) : null)
  const paths = [process.cwd()]

  if (envpath) {
    paths.push(envpath)
  }

  const loaders = [
    new NodeLoader(paths, options),
    new nunjucks.FileSystemLoader(paths)
  ]

  const env = new nunjucks.Environment(loaders, opts)

  env.addFilter('raw', env.getFilter('safe'))

  // Add all the Filters.
  for (const name in opts.filters || {}) {
    if ({}.hasOwnProperty.call(opts.filters, name)) {
      let filter = null
      switch (typeof opts.filters[name]) {
        case 'string':
          // eslint-disable-next-line import/no-dynamic-require
          filter = require(opts.filters[name])
          break
        case 'function':
        default:
          filter = opts.filters[name]
          break
      }
      env.addFilter(name, filter)
    }
  }

  // Add all the Globals.
  for (const name in opts.globals || {}) {
    if (opts.globals[name] !== null) {
      env.addGlobal(name, opts.globals[name])
    }
  }

  // Compile the template.
  const template = nunjucks.compile(str, env, opts.filename || null, true)

  // Bind the render function as the returning function.
  return template.render.bind(template)
}
