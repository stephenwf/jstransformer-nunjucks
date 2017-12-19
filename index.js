'use strict'

const path = require('path')
const fs = require('fs')
const nunjucks = require('nunjucks')
const extend = require('extend-shallow')

exports.name = 'nunjucks-node'
exports.inputFormats = ['njk', 'nunjucks', 'twig']
exports.outputFormat = 'html'

nunjucks.installJinjaCompat()

const NodeLoader = nunjucks.FileSystemLoader.extend({
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
      } catch (err) {
        return null
      }
    }

    this.pathsToNames[fullpath] = name

    return {
      src: fs.readFileSync(fullpath, 'utf-8'),
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
    new NodeLoader(paths),
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
