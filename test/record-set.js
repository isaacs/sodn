var RecordSet = require("../lib/record-set")
  , Record = require("../lib/record")
  , tap = require("tap")

// just the data
var da = { id: "record-a", name: "a", sequence: 0 }
  , db = { id: "record-b", name: "b", sequence: 0 }
  , dc = { id: "record-c", name: "c", sequence: 0 }
  , dd = { id: "record-d", name: "d", sequence: 0 }

// record objects
var ra = Record.create(da)
  , rb = Record.create(db)
  , rc = Record.create(dc)
  , rd = Record.create(dd)

// updated data
var ua = { id: "record-a", name: "new-name-a", sequence: 1 }
  , ub = { id: "record-b", name: "new-name-b", sequence: 2 }
  , uc = { id: "record-c", name: "new-name-c", sequence: 3 }
  , ud = { id: "record-d", name: "new-name-d", sequence: 4 }

// record sets
var rsa = RecordSet.create()
  , rsb = RecordSet.create()

tap.test("adding and retrieving records", function (t) {
  // add two record objects
  rsa.add(ra)
  rsa.add(rb)
  // add two plain data objects
  rsa.add(dc)
  rsa.add(dd)

  // get in every different way.
  // as long as the id matches, it shouldn't matter, for a get
  var agota = rsa.get("record-a")
    , agotb = rsa.get(rb)
    , agotc = rsa.get(dc)
    , agotd = rsa.get(ud)

  t.equal(agota, ra, "should just retrieve record object")
  t.equal(agotb, rb, "should just retrieve record object")
  t.notEqual(agotc, rc, "should not retrieve plain object")
  t.notEqual(agotd, rd, "should not retrieve plain object")

  t.type(agota, Record, "Should be record object")
  t.type(agotb, Record, "Should be record object")
  t.type(agotc, Record, "Should be record object")
  t.type(agotd, Record, "Should be record object")

  // add records to b-set

  // flip it this time, so that they don't have any actual objects
  // in common.  Data objects first, then records.
  rsb.add(da)
  rsb.add(db)
  rsb.add(rc)
  rsb.add(rd)

  var bgota = rsb.get("record-a")
    , bgotb = rsb.get(rb)
    , bgotc = rsb.get(dc)
    , bgotd = rsb.get(ud)

  t.notEqual(bgota, ra, "should not retrieve plain object")
  t.notEqual(bgotb, rb, "should not retrieve plain object")
  t.equal(bgotc, rc, "should just retrieve record object")
  t.equal(bgotd, rd, "should just retrieve record object")

  t.type(bgota, Record, "Should be record object")
  t.type(bgotb, Record, "Should be record object")
  t.type(bgotc, Record, "Should be record object")
  t.type(bgotd, Record, "Should be record object")

  // make sure that none of them are the same object
  t.notEqual(bgota, agota)
  t.notEqual(bgota, agotb)
  t.notEqual(bgota, agotc)
  t.notEqual(bgota, agotd)
  t.notEqual(bgotb, agotb)
  t.notEqual(bgotb, agotc)
  t.notEqual(bgotb, agotd)
  t.notEqual(bgotc, agotc)
  t.notEqual(bgotc, agotd)
  t.notEqual(bgotd, agotd)

  t.end()
})

tap.test("digests", function (t) {
  Object.keys(rsa._digest).forEach(function (id) {
    t.equal(rsa._digest[id], rsa.get(id).sequence,
            "sequence should match digest")
  })

  Object.keys(rsb._digest).forEach(function (id) {
    t.equal(rsb._digest[id], rsb.get(id).sequence,
            "sequence should match digest")
  })
  t.end()
})

tap.test("removing", function (t) {
  rsa.remove(ra)
  t.equal(rsa.get(ra), undefined, "removed record should be gone")
  t.equal(rsa._digest[ra.id], undefined, "removed record should be gone")

  rsb.remove(db)
  t.equal(rsb.get(db), undefined, "removed record should be gone")
  t.equal(rsb._digest[db.id], undefined, "removed record should be gone")

  rsa.remove("record-c")
  t.equal(rsa.get(rc), undefined, "removed record should be gone")
  t.equal(rsa._digest[rc.id], undefined, "removed record should be gone")

  t.end()
})

tap.test("updating", function (t) {
  rsa.add(ua)
  t.equal(rsa.get(ra).sequence, ua.sequence, "sequence should be updated")
  rsb.add(uc)
  t.equal(rsb.get(dc).sequence, uc.sequence, "sequence should be updated")
  t.end()
})

tap.test("gossipping", function (t) {
  // at this point, rsa contains: new-a, b, d
  // rsb contains: a, new-c, d
  // give rsb's digest to rsa.
  // result: { request:{c:-1}, response:{new-a,b} }
  var result = rsa.gossip(rsb)
  t.has(result, { request: { "record-c": -1 }
                , response: { "record-a": ua, "record-b": db } }
       ,"gossip result")
  var result = rsb.update(result)
  // now rsb has new-a and b, and the result has record-c
  var a = rsb.get("record-a")
    , b = rsb.get("record-b")
    , c = rsb.get("record-c")
    , d = rsb.get("record-d")
  t.similar(a, ua, "should be new 'a' record")
  t.similar(b, db, "should be old 'b' record")
  t.similar(c, uc, "should be new 'c' record")
  t.similar(d, dd, "should be old 'd' record")

  // now update rsa with the result from rsb
  // after this step, they should be in sync.
  rsa.update(result)

  var a = rsa.get("record-a")
    , b = rsa.get("record-b")
    , c = rsa.get("record-c")
    , d = rsa.get("record-d")

  t.similar(a, ua, "should be new 'a' record")
  t.similar(b, db, "should be old 'b' record")
  t.similar(c, uc, "should be new 'c' record")
  t.similar(d, dd, "should be old 'd' record")

  t.similar(rsa._data, rsb._data, "should have synced data")
  t.similar(rsa._digest, rsb._digest, "should have synced digest")
  t.end()
})

tap.test("walking", function (t) {
  var a = { id: "a", sequence: 1, friends: [ "b", "f" ] }
    , b = { id: "b", sequence: 1, friends: [ "c", "a" ] }
    , c = { id: "c", sequence: 1, friends: [ "d", "b" ] }
    , d = { id: "d", sequence: 1, friends: [ "e", "c" ] }
    , e = { id: "e", sequence: 1, friends: [ "f", "d" ] }
    , f = { id: "f", sequence: 1, friends: [ "a", "e" ] }
    , rs = new RecordSet()

  rs.add(a)
  rs.add(b)
  rs.add(c)
  rs.add(d)
  rs.add(e)
  rs.add(f)

  var order = [ "a", "b", "f", "c", "e", "d" ]
  results = rs.bfWalk(a, function (n, path) {
    t.equal(n.id, order.shift(), "bfs order: "+n.id)
    return path
  })
  t.equal(order.length, 0, "all nodes visited")

  // shortest path from 'a'
  var expect = { a: []
               , b: [ "a" ]
               , f: [ "a" ]
               , c: [ "a", "b" ]
               , e: [ "a", "f" ]
               , d: [ "a", "b", "c" ] }
  t.similar(results, expect, "results")


  var order = [ "a", "b", "c", "d", "e", "f" ]
  results = rs.dfWalk(a, function (n, path) {
    t.equal(n.id, order.shift(), "dfs order: "+n.id)
    return path
  })
  t.equal(order.length, 0, "all nodes visited")

  var expect = { a: []
               , b: [ "a" ]
               , c: [ "a", "b" ]
               , d: [ "a", "b", "c" ]
               , e: [ "a", "b", "c", "d" ]
               , f: [ "a", "b", "c", "d", "e" ] }
  t.similar(results, expect, "results")

  t.end()
})
