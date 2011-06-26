module.exports = RecordSet

RecordSet.create = function () { return new RecordSet }

var Record = require("./record")

function RecordSet () {
  // the actual data
  this._data = {}

  // Just the {id:sequence} from data
  this._digest = {}
}

RecordSet.prototype.get = function (id) {
  if (id && id.id) id = id.id
  return this._data[id]
}

RecordSet.prototype.add = function (rec) {
  if (this._data[rec.id]) {
    this._data[rec.id].update(rec)
  } else {
    if (!(rec instanceof Record)) rec = new Record(rec)
    this._data[rec.id] = rec
  }
  rec = this._data[rec.id]
  this._digest[rec.id] = rec.sequence
}

RecordSet.prototype.remove = function (id) {
  if (id && id.id) id = id.id
  var me = this

  delete me._data[id]
  delete me._digest[id]
}

// given a digest of {id:sequence} fields, build up a
// {response:{id:record}, request:{id:sequence}} to return
// to the caller.
RecordSet.prototype.gossip = function (digest) {
  if (digest._digest) digest = digest._digest

  var request = {}
    , response = {}
    , me = this
  Object.keys(digest).forEach(function (id) {
    if (!me._data[id]) {
      me.add({id:id, sequence:-1})
    }
    if (me._digest[id] > digest[id]) {
      response[id] = me._data[id]
    } else if (me._digest[id] < digest[id]) {
      request[id] = me._digest[id]
    }
  })
  // now go through records I have that aren't in the digest
  Object.keys(me._digest).forEach(function (id) {
    if (!me._digest[id] && me._digest[id] !== 0) return
    if (!digest[id] && digest[id] !== 0) {
      response[id] = me._data[id]
    }
  })
  return { request: request, response: response }
}

// given a gossip {request,response} object, update the relevant
// fields, and return a set of records.
RecordSet.prototype.update = function (conv) {
  var req = conv.request || {}
    , res = conv.response || {}
    , me = this
    , data = {}
  Object.keys(res).forEach(function (id) {
    me.add(res[id])
  })
  Object.keys(req).forEach(function (id) {
    var mine = me.get(id)
    if (!mine) return
    if (mine.sequence > req[id]) data[id] = mine
  })
  return {response:data}
}

// walk through the set in a depth-first manner.
// Records are visited at most once.
RecordSet.prototype.dfWalk = function (start, fn) {
  if (start.id) start = start.id
  var seen = {}
    , me = this
    , data = me._data
    , results = {}

  ;(function dfs (record, fn) {
    record = data[record]
    seen[record.id] = true
    results[record.id] = fn(record)
    ;(record.friends || []).forEach(function (f) {
      if (!seen[f]) dfs(f, fn)
    })
  })(start, fn)

  return results
}

// walk through the set in a breadth-first manner.
RecordSet.prototype.bfWalk = function (start, fn) {
  if (start.id) start = start.id
  var seen = {}
    , me = this
    , data = me._data
    , results = {}
    , queue = [start]

  while (record = queue.shift()) if (!seen[record]) {
    record = data[record]
    seen[record.id] = true
    results[record.id] = fn(record)
    queue.push.apply(queue, record.friends || [])
  }

  return results
}
