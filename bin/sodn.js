#!/usr/bin/env node

// start up a node, listening on the specified port and hostname

var types = { host: String
            , port: Number
            , name: String
            , conn: String
            , repl: Boolean }
  , shortHands = { h: "--host"
                 , p: "--port"
                 , n: "--name"
                 , r: "--repl"
                 , c: "--conn"
                 , i: "--repl" }
  , nopt = require("nopt")
  , opts = nopt(types, shortHands)
  , SODN = require("../sodn")
  , sodn = SODN.create(opts.name || "(unnamed sodn)")

if (opts.host && opts.port) {
  sodn.listen(opts.host, opts.port)
  console.log("Listening on "+sodn.host+":"+sodn.port)
}

if (opts.conn) {
  var c = opts.conn.match(/^([^:]+):(\d+)$/)
  if (c) {
    console.log("Connecting to "+opts.conn)
    setTimeout(function () {
      sodn.connect(c[0], +c[1])
    }, 1000)
  } else {
    console.error("Invalid connection param: "+opts.conn)
  }
}

if (opts.repl) startRepl()

function startRepl () {
  var repl = require("repl")

  var r = repl.start("sodn> ")

  r.context.sodn = sodn

  r.rli.on("close", function () {
    sodn.close()
    sodn.broadcast("bye")
    sodn.broadcast("hangup")
  })
}
