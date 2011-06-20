
module.exports = SODN
SODN.create = function (name) {
  return new SODN(name)
}

var dnode = require("dnode")
  , inherits = require("inherits")
  , EE = require("events").EventEmitter
  , uuid = require("node-uuid")

inherits(SODN, EE)

function SODN (name) {
  this.network = {}
  this.host = this.port = null
  this.id = uuid()
  this.name = name
  this.dnode = dnode(makeMethods(this))
}

// these are the methods that can be called directly
SODN.prototype.listen = function (host, port) {
  this.host = host
  this.port = port

  var me = this
    , myInfo = { id: this.id
               , name: this.name
               , host: this.host
               , port: this.port
               , network: this.network }

  this.dnode.listen(host, port, function onconnect (remote, connection) {
    remote.hello(myInfo, function (friend) {
      friend.caller = true
      me.addFriend(friend, remote, connection)
    })
  })

  me.broadcast("listening", host, port)
}

SODN.prototype.broadcast = function (msg) {
  //console.error("broadcast %s", msg)
  var args = Array.prototype.slice.call(arguments, 1)
    , me = this

  Object.keys(this.network).forEach(function (f) {
    //console.error("broadcast: send "+msg+" to ",(me.network[f]))
    if (!me.network[f]) return
    me[msg].apply(me, [f].concat(args))
  })
}

SODN.prototype.close = function () {
  this.host = this.port = null
  this.broadcast("closing")
  this.dnode.close()
}

SODN.prototype.connect = function (host, port, cb) {
  var self = this
  this.dnode.connect(host, port, function (remote) {
    self.once("meet", function onmeet (friend) {
      if (friend !== remote.friend) {
        self.once("meet", onmeet)
        return
      }
      if (cb) cb(friend)
    })
  })
}

SODN.prototype.addFriend = function (friend, rem, con) {
  var id = friend.id
  //console.error("addFriend", friend)
  if (this.network[id]) {
    if (!this.network[id].connection.stream.destroyed) {
      this.network[id].bye()
    }
  }
  this.network[id] = friend
  friend.remote = rem
  rem.friend = friend
  friend.connection = con
  Object.keys(rem).forEach(function (m) {
    friend[m] = rem[m]
  })
  this.emit("meet", friend)
}





// these are the methods that can be called by peers on the network
//
// close over the SODN object
function makeMethods (me) {
  // close over the dnode connection
  return function methods (remote, connection) {
    var f

    // auto-reconnect
    if (connection) connection.on("end", function () {
      // if the handshake didn't finish, then don't bother
      // Wasn't a close friend anyway, or already said bye.
      if (!f || !me.network[f.id] || connection.disconnecting) return

      // remove from the list of connections
      me.network[f.id] = null

      // if we both are reachable, then let the caller do it.
      if (me.host && me.port && f.host && f.port && f.caller) return

      // either i'm not reachable, or was the caller
      if (f.port && f.host) {
        //console.error("try to reconnect", f)
        me.connect(f.host, f.port)
      }
    })

    function hello (friend, cb) {
      var myInfo = { id: me.id
                   , name: me.name
                   , host: me.host
                   , port: me.port
                   , network: me.network }
      friend.caller = false
      me.addFriend(friend, remote, connection)
      f = friend
      cb(myInfo)
    }

    function bye (cb) {
      if (f) me.network[f.id] = null
      connection.disconnecting = true
      // no, YOU hang up first!
      remote.hangup()
      hangup()
    }

    function hangup () {
      connection.disconnecting = true
      if (f) me.network[f.id] = null
      if (!connection.stream.flush()) {
        connection.stream.on("drain", connection.end.bind(connection))
      } else connection.end()
    }

    function closing () {
      //console.error(f.name + " told "+me.name+" that they're closing")
      if (!f) return
      f.host = f.port = null
    }

    function listening (host, port) {
      if (!f) return
      f.host = host
      f.port = port
    }

    return { hello: hello
           , closing: closing
           , listening: listening
           , hangup: hangup
           , bye: bye }
  }
}

Object.keys(makeMethods()()).forEach(function (m) {
  SODN.prototype[m] = function (friend) {
    if (friend.id) friend = friend.id
    var rem = this.network[friend] && this.network[friend].remote
    if (!rem) this.emit("error", new Error(
      "Can't send message "+m
      +"\nNo connection to "+friend))
    var args = Array.prototype.slice(arguments, 1)
    rem[m].apply(rem, args)
  }
})

