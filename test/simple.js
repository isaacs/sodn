// create two sodns, and then introduce them
// This isn't much more than you can just do with dnode directly.

var SODN = require("../")
  , a = SODN.create("a")
  , b = SODN.create("b")
  , tap = require("tap")

tap.plan(1)
tap.test("basic connect/disconnect", function (t) {

  a.listen("localhost", 8081)
  b.connect("localhost", 8081, function (arem) {
    t.equal(a.id, arem.id, "ids should be equal")
    t.equal(a.name, arem.name, "names should be equal")
    t.equal(a.name, "a", "name should be a")
    //console.error(arem.connection.stream)
    //console.error("about to close")

    // should be able to close the server and not accept any
    // more connections.  However, *existing* connections should
    // continue to be able to send messages.
    //
    // TODO: when doing this, tell all friends about it.
    // Likewise, .listen() should alert all friends of
    // IP and port number.
    a.close()

    setTimeout(function () {
      // console.error("sending bye message")
      arem.bye()
      setTimeout(function () {
        t.equal(arem.connection.stream.destroyed, true
               ,"should be destroyed")
        t.end()
      }, 100)
    }, 100)
  })
})
