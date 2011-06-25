// create two sodns, and then introduce them
// This isn't much more than you can just do with dnode directly.

var SODN = require("../")
  , a = SODN.create("a")
  , b = SODN.create("b")
  , c = SODN.create("c")
  , d = SODN.create("d")
  , e = SODN.create("e")
  , f = SODN.create("f")
  , tap = require("tap")
  , to = setTimeout(function () {
      throw new Error("Timeout")
    }, 5000)

tap.plan(1)
tap.test("simple gossip network", function (t) {

  console.error("in test")

  // connect in a ring.
  var port = 8081

  // there are 6 servers to get connected in the ring
  var n = 6

  // start up each server, and connect to the next one in line
  ;[a, b, c, d, e, f].forEach(function (x, i, list) {
    x.listen("localhost", port + i)

    // each one will have 2 friends
    x.once("meet", function () {
      x.once("meet", ready)
    })
  })

  // now they're all listening, so connect the ring
  ;[a, b, c, d, e, f].forEach(function (x, i, list) {
    var y = list[ (i + 1) % list.length ]
    x.connect(y.host, y.port)
  })

  function ready () {
    console.error("connection established", n)
    if (-- n > 0) return
    console.error("go!", a.friends)

    t.comment("starting conditions")

    t.ok(a.society.get(a.id), "a knows a")
    t.ok(a.society.get(b.id), "a knows b")
    t.notOk(a.society.get(c.id), "a doesn't know c")
    t.notOk(a.society.get(d.id), "a doesn't know d")
    t.notOk(a.society.get(e.id), "a doesn't know e")
    t.ok(a.society.get(f.id), "a knows f")

    t.ok(b.society.get(a.id), "b knows a")
    t.ok(b.society.get(b.id), "b knows b")
    t.ok(b.society.get(c.id), "b knows c")
    t.notOk(b.society.get(d.id), "b doesn't know d")
    t.notOk(b.society.get(e.id), "b doesn't know e")
    t.notOk(b.society.get(f.id), "b doesn't know f")

    t.notOk(c.society.get(a.id), "c doesn't know a")
    t.ok(c.society.get(b.id), "c knows b")
    t.ok(c.society.get(c.id), "c knows c")
    t.ok(c.society.get(d.id), "c knows d")
    t.notOk(c.society.get(e.id), "c doesn't know e")
    t.notOk(c.society.get(f.id), "c doesn't know f")

    t.notOk(d.society.get(a.id), "d doesn't know a")
    t.notOk(d.society.get(b.id), "d doesn't know b")
    t.ok(d.society.get(c.id), "d knows c")
    t.ok(d.society.get(d.id), "d knows d")
    t.ok(d.society.get(e.id), "d knows e")
    t.notOk(d.society.get(f.id), "d doesn't know f")

    t.notOk(e.society.get(a.id), "e doesn't know a")
    t.notOk(e.society.get(b.id), "e doesn't know b")
    t.notOk(e.society.get(c.id), "e doesn't know c")
    t.ok(e.society.get(d.id), "e knows d")
    t.ok(e.society.get(e.id), "e knows e")
    t.ok(e.society.get(f.id), "e knows f")

    t.ok(f.society.get(a.id), "f knows a")
    t.notOk(f.society.get(b.id), "f doesn't know b")
    t.notOk(f.society.get(c.id), "f doesn't know c")
    t.notOk(f.society.get(d.id), "f doesn't know d")
    t.ok(f.society.get(e.id), "f knows e")
    t.ok(f.society.get(f.id), "f knows f")

    // a becomes gossipy
    // This causes a to get all the information that b and d have, which
    // should include information about c and e
    a.gossip(function () {
      t.comment("a<->b, a<->f")
      t.ok(a.society.get(c.id), "a should have info about c")
      t.ok(a.society.get(e.id), "a should have info about e")
      t.ok(f.society.get(b.id), "f should have info about b")
      t.ok(b.society.get(f.id), "f should have info about b")
      bToC()
    })

    function bToC () {
      // now have b gossip with c
      // after this, b and c should both know the whole ring, except e
      b.gossip(c.id, function () {
        t.comment("b<->c")
        t.ok(b.society.get(a.id), "b knows a")
        t.ok(b.society.get(b.id), "b knows b")
        t.ok(b.society.get(c.id), "b knows c")
        t.ok(b.society.get(d.id), "b knows d")
        t.ok(b.society.get(f.id), "b knows f")

        t.ok(c.society.get(a.id), "c knows a")
        t.ok(c.society.get(b.id), "c knows b")
        t.ok(c.society.get(c.id), "c knows c")
        t.ok(c.society.get(d.id), "c knows d")
        t.ok(c.society.get(f.id), "c knows f")

        aToB()
      })
    }

    function aToB () {
      // a gossips with b again, now they both know the whole ring
      a.gossip(b.id, function () {
        t.comment("a<->b")
        t.ok(a.society.get(a.id), "a knows a")
        t.ok(a.society.get(b.id), "a knows b")
        t.ok(a.society.get(c.id), "a knows c")
        t.ok(a.society.get(d.id), "a knows d")
        t.ok(a.society.get(e.id), "a knows e")
        t.ok(a.society.get(f.id), "a knows f")

        t.ok(b.society.get(a.id), "b knows a")
        t.ok(b.society.get(b.id), "b knows b")
        t.ok(b.society.get(c.id), "b knows c")
        t.ok(b.society.get(d.id), "b knows d")
        t.ok(b.society.get(e.id), "b knows e")
        t.ok(b.society.get(f.id), "b knows f")

        aToF()
      })
    }

    function aToF () {
      // a gossips with f, and now everyone except e and d knows
      // the whole ring.
      a.gossip(f, function () {
        t.comment("a<->f")
        t.ok(f.society.get(a.id), "f knows a")
        t.ok(f.society.get(b.id), "f knows b")
        t.ok(f.society.get(c.id), "f knows c")
        t.ok(f.society.get(d.id), "f knows d")
        t.ok(f.society.get(e.id), "f knows e")
        t.ok(f.society.get(f.id), "f knows f")

        fToEAndCToD()
      })
    }

    function fToEAndCToD () {
      f.gossip(e, done)
      c.gossip(d, done)

      var n = 2
      function done () {
        if (--n > 0) return

        t.comment("f<->e, d<->c")
        t.ok(d.society.get(a.id), "d knows a")
        t.ok(d.society.get(b.id), "d knows b")
        t.ok(d.society.get(c.id), "d knows c")
        t.ok(d.society.get(d.id), "d knows d")
        t.ok(d.society.get(e.id), "d knows e")
        t.ok(d.society.get(f.id), "d knows f")

        t.ok(e.society.get(a.id), "e knows a")
        t.ok(e.society.get(b.id), "e knows b")
        t.ok(e.society.get(c.id), "e knows c")
        t.ok(e.society.get(d.id), "e knows d")
        t.ok(e.society.get(e.id), "e knows e")
        t.ok(e.society.get(f.id), "e knows f")
        end()
      }
    }


  }


  function end () {
    t.end()
    ;[a, b, c, d, e, f].forEach(function (x, i, list) {
      // shut it all down
      x.close()
      x.broadcast("bye")
      x.broadcast("hangup")
    })
    clearTimeout(to)
  }
})
