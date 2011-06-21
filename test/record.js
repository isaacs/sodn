
var Record = require("../lib/record")
  , tap = require("tap")

var data = { id: "id"
           , name: "name"
           , sequence: 0
           , host: "host"
           , port: 8080
           , someRandomUnknownField: 1
           , friends: [ "friend" ] }
var r

tap.plan(4)

tap.test("initial values", function (t) {
  r = Record.create(data)
  t.equal(r.id, "id", "r.id")
  t.equal(r.name, "name", "r.name")
  t.equal(r.host, "host", "r.host")
  t.equal(r.port, 8080, "r.port")
  t.equal(r.sequence, 0, "r.sequence")
  t.equivalent(r.friends, ["friend"], "r.friends")
  t.equal(r.someRandomUnknownField, undefined, "r.someRandomUnknownField")
  t.end()
})

tap.test("proper update", function (t) {
  r.update({id:"id", name: "new-name", sequence: 10})
  t.equal(r.id, "id", "r.id")
  t.equal(r.name, "new-name", "r.name")
  t.equal(r.host, "host", "r.host")
  t.equal(r.port, 8080, "r.port")
  t.equal(r.sequence, 10, "r.sequence")
  t.end()
})

tap.test("invalid update", function (t) {
  t.throws(function () {
    // invalid ID
    r.update({id: "not the right id", sequence:100})
  })
  t.throws(function () {
    // no sequence
    r.update({id: "id"})
  })
  t.equal(r.id, "id", "r.id")
  t.equal(r.sequence, 10, "r.sequence")
  t.end()
})

tap.test("ignored update", function (t) {
  r.update({id: "id", sequence:1, name:"outdated-name"})

  t.equal(r.name, "new-name", "r.name")

  t.equal(r.sequence, 10, "r.sequence")
  t.end()
})
