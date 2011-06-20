// create two sodns, and then introduce them
// This isn't much more than you can just do with dnode directly.

var SODN = require("../")
  , a = SODN.create("a")
  , b = SODN.create("b")
  , tap = require("tap")

setTimeout(function () {
  throw new Error("Timeout")
}, 1000)

tap.plan(1)
tap.test("basic connect/disconnect", function (t) {

  a.listen("localhost", 8081)
  b.connect("localhost", 8081, function (arem) {
    // if the connection is severed abruptly, b should try to
    // reconnect.
    a.once("meet", function (friend) {
      t.equal(friend.id, b.id, "friend should be b")
      console.error("ending connection, expect a reconnect")
      friend.connection.end()
      a.once("meet", function (friend) {
        t.equal(b.id, friend.id, "friend shoudl be b")
        console.error("re-met")
        friend.bye(function () {
          t.end()
        })

      })
    })
  })
})
