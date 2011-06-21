// Not much to this class.
// Basically just a data object, but constructed objects
// are way faster in v8 when you have a lot of them.

module.exports = Record

Record.create = function (data) {
  return new Record(data)
}

function Record (data) {
  if (!data) return

  this.id = data.id
  this.sequence = Math.max(+data.sequence, -1)
  if (isNaN(this.sequence)) this.sequence = -1

  if (data.name) this.name = data.name
  if (data.host) this.host = data.host
  if (data.port) this.port = data.port
  if (data.friends) this.friends = data.friends
}

Record.prototype.update = function (data) {
  if (!data) return

  if (this.id && data.id !== this.id) throw new Error(
    "Updating the wrong record")

  if (!data.sequence) throw new Error(
    "Can't update data without a new sequence")

  // if the data is outdated, then just ignore the update
  data.sequence = Math.max(+data.sequence, -1)
  if (isNaN(data.sequence)
     || data.sequence <= this.sequence) return

  Record.call(this, data)
}
