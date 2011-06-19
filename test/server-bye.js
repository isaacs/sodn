// create two sodns, and then introduce them
// This isn't much more than you can just do with dnode directly.

var SODN = require("../")
  , a = SODN.create("a")
  , b = SODN.create("b")
  , tap = require("tap")

tap.plan(1)
tap.test("basic connect/disconnect", function (t) {

  a.listen("localhost", 8081)
  b.connect("localhost", 8081)

  a.on("meet", function (brem) {
    t.equal(b.id, brem.id, "ids should be equal")
    t.equal(b.name, brem.name, "names should be equal")
    t.equal(b.name, "b", "name should be a")
    //console.error(brem.connection.stream)
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
      brem.bye()
      setTimeout(function () {
        t.equal(brem.connection.stream.destroyed, true
               ,"should be destroyed")
        t.end()
      }, 100)
    }, 100)
  })
})
