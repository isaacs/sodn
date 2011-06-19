
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
      me.addFriend(friend, remote, connection)
    })
  })
}

SODN.prototype.close = function () {
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
      cb && cb(friend)
    })
  })
}

SODN.prototype.addFriend = function (friend, rem, con) {
  var id = friend.id
  if (this.network[id]) return friend.bye()
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

    function hello (friend, cb) {
      var myInfo = { id: me.id
                   , name: me.name
                   , host: me.host
                   , port: me.port
                   , network: me.network }
      me.addFriend(friend, remote, connection)
      f = friend
      cb(myInfo)
    }

    function bye () {
      if (f) me.network[f.id] = null
      connection.end()
    }

    return { hello: hello
           , bye: bye }
  }
}

