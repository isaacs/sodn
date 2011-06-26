
var debug = process.env.SODN_DEBUG ? function () {
  console.error.apply(console, arguments)
} : function () {}


module.exports = SODN
SODN.create = function (name) {
  return new SODN(name)
}

var dnode = require("dnode")
  , inherits = require("inherits")
  , EE = require("events").EventEmitter
  , uuid = require("node-uuid")
  , Record = require("./lib/record")
  , RecordSet = require("./lib/record-set")

inherits(SODN, EE)

function SODN (name) {
  this.id = uuid()
  this.name = name
  this.friends = []
  this.host = this.port = null
  this.sequence = 0

  var record = new Record(this)
  this.record = record

  this.society = new RecordSet
  this.society.add(record)

  this.network = {}
  this.dnode = dnode(makeMethods(this))
}

// these are the methods that can be called directly
SODN.prototype.listen = function (host, port) {
  this.host = host
  this.port = port
  this.sequence ++

  this.record.update(this)
  debug("updating this.record", this.record)

  var me = this

  this.dnode.listen(host, port, function onconnect (remote, connection) {
    remote.hello(me.record, function (friend) {
      friend = new Record(friend)
      remote.caller = true
      me.addFriend(friend, remote, connection)
    })
  })

  me.broadcast("update", this.record)
}

SODN.prototype.broadcast = function (msg) {
  var args = Array.prototype.slice.call(arguments, 1)
    , me = this
    , needSync = false

  debug("broadcast %s", msg, args, me.friends)

  me.friends.forEach(function (f) {
    if (!me.network[f]) {
      debug("  not in network", f)
      needSync = true
      return
    }
    me[msg].apply(me, [f].concat(args))
  })

  if (needSync) {
    me.friends = Object.keys(me.network)
    me.sequence ++
    me.record.update(me)
  }
}

SODN.prototype.close = function () {
  if (!this.host || !this.port) return
  this.host = this.port = null
  this.sequence ++
  this.record.update(this)
  this.broadcast("update", this.record)
  this.dnode.close()
}

SODN.prototype.connect = function (host, port, cb) {
  var me = this
  this.dnode.connect(host, port, function (remote) {
    debug("back from connection", me.name, remote)
    // connection initiates the "hello" conversation,
    // which ends with emitting the "meet" event with the
    // new friend.  If we've been given a cb, then call
    // it when that dance is done.
    if (cb) me.once("meet", function onmeet (friend) {
      if (friend !== remote.friend) {
        return me.once("meet", onmeet)
      }
      debug("meeting", friend)
      cb(friend)
    })
  })
}

SODN.prototype.addFriend = function (friend, rem, con) {
  var id = friend.id
  friend = new Record(friend)

  //debug("addFriend", friend)
  if (this.network[id]) {
    if (!this.network[id].connection.stream.destroyed) {
      // Shut down that connection before adding this one.
      // Good chance it's bogus anyhow.
      this.network[id].bye()
    }
  }

  // hard overwrite
  this.society.remove(friend)
  this.society.add(friend)

  this.network[id] = rem
  rem.connection = con
  rem.friend = friend

  // update my list of friends.
  this.friends = Object.keys(this.network)
  this.sequence ++
  this.record.update(this)

  this.emit("meet", friend)
}

SODN.prototype.gossip = function (id, cb) {
  if (typeof cb !== "function" && typeof id === "function") {
    cb = id, id = null
  }
  cb = cb || function () {}

  var me = this

  if (!id) {
    var n = me.friends.length
    function cb_ () {
      if (--n > 0) return
      cb()
    }
    me.friends.forEach(function (f) {
      me.gossip(f, cb_)
    })
    return
  }

  if (id && id.id) id = id.id

  me.network[id].gossip(me.society._digest, function (conv) {
    conv = me.society.update(conv)
    me.network[id].societyUpdate(conv, cb)
  })
}



// these are the methods that can be called by peers on the network
//
// close over the SODN object
function makeMethods (me) {
  // close over the dnode connection
  return function methods (remote, connection) {
    var f

    // auto-reconnect
    // We also call this function to just get the list of functions,
    // so it needs to handle being called without a connection, and
    // just returning the set of functions.
    if (connection) connection.on("end", function () {
      // if the handshake didn't finish, then don't bother
      // Wasn't a close friend anyway, or already said bye.
      if (!f || !me.network[f.id] || connection.disconnecting) return

      // remove from the list of connections
      delete me.network[f.id]
      me.friends = Object.keys(me.network)
      me.sequence ++
      me.record.update(me)

      // if we both are reachable, then let the original caller do it.
      if (me.host && me.port && f.host && f.port && remote.caller) return

      // either i'm not reachable, or i was the caller
      if (f.port && f.host) {
        debug("try to reconnect", f)
        // If you get an error here, just accept it, and move on.
        // It could well be that the server is just kaput.
        me.dnode.once("error", function HANDLE (er) {
          if (er.message.trim().match(/^ECONNREFUSED/)) {
            debug("connection was refused", f)
          } else {
            // some other error.
            me.dnode.once("error", HANDLE)
          }
        })
        me.connect(f.host, f.port)
      }
    })

    function hello (friend, cb) {
      // me: <connect>
      // remote: "hello"
      // this means I'm the caller, not the remote
      remote.caller = false
      me.addFriend(friend, remote, connection)
      f = me.society.get(friend)
      // send my record to the callee
      cb(me.record)
    }

    function bye () {
      if (f) {
        delete me.network[f.id]
        me.friends = Object.keys(me.network)
        me.sequence ++
        me.record.update(me)
      }
      connection.disconnecting = true
      // no, YOU hang up first!
      remote.hangup()
      hangup()
    }

    function hangup () {
      debug("hangup", me.id, me.name)
      // flush any pending messages, and then disconnect
      connection.disconnecting = true
      if (f) {
        delete me.network[f.id]
        me.friends = Object.keys(me.network)
        me.sequence ++
        me.record.update(me)
      }

      if (!connection.stream.flush()) {
        connection.stream.on("drain", connection.end.bind(connection))
      } else connection.end()
    }

    function update (record) {
      debug("update", record, me.id, me.name)
      // "Here's an update of one record"
      // This is called when closing, listening, or any other
      // change to a given sodn's personal data.
      me.society.add(record)
      if (f) f = me.society.get(record)
    }

    function gossip (digest, cb) {
      debug("gossip", digest)
      cb(me.society.gossip(digest))
    }

    function societyUpdate (conv, cb) {
      debug("societyUpdate", conv)
      cb(me.society.update(conv))
    }

    return { hello: hello
           , update: update
           , hangup: hangup
           , bye: bye
           , gossip: gossip
           , societyUpdate: societyUpdate
           }
  }
}

Object.keys(makeMethods()()).forEach(function (m) {
  if (!SODN.prototype[m]) SODN.prototype[m] = function (id) {
    if (id.id) id = id.id
    var rem = this.network[id]
    if (!rem) this.emit("error", new Error(
      "Can't send message "+m
      +"\nNo connection to "+id))
    var args = Array.prototype.slice.call(arguments, 1)
    debug(" Sugared: %s %s", m, id, args)
    rem[m].apply(rem, args)
  }
})

