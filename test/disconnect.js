// create two sodns, and then introduce them
// This isn't much more than you can just do with dnode directly.

var SODN = require("../")
  , a = SODN.create("a")
  , b = SODN.create("b")
  , tap = require("tap")

// If the reconnection fails, then it'll never get to the point
// where it closes the server, which means it'll just sit open
// for a long time.
var to = setTimeout(function () {
  throw new Error("Timeout")
}, 2000)

tap.plan(1)
tap.test("basic connect/disconnect", function (t) {

  a.listen("localhost", 8081)
  b.connect("localhost", 8081, function (arem) {
    // if the connection is severed abruptly, b should try to
    // reconnect.
    a.once("meet", function (friend) {
      t.equal(friend.id, b.id, "friend should be b")

      // random unexpected connection termination
      friend.connection.end()

      a.once("meet", function (friend) {
        t.ok(true, "re-connected")
        t.equal(b.id, friend.id, "friend should be b")

        friend.bye()
        a.close()
        t.end()
        clearTimeout(to)
      })
    })
  })
})
