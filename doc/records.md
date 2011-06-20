Each node has a set of records about all the other nodes on the network.
These records are stored in an object where the key is the uuid of the
remote node.  It contains the following items:

* id - The uuid for that node
* name - A not-necessarily-unique name
* host - Hostname or IP, if listening for connections
* port - Port, if listening for connections
* friends - List of uuids that the remote node is connected to
* sequence - An integer that is incremented each time the data changes

Periodically, a node will send the set of `{<id>:<sequence>}` values to
one of its connected peers.  The peer will reply with
`{update:{<set>}, request:<list>}`, where `update` is the set of new
records that the gossip initiator has which are out of date, and the
`request` is a list of id's where the initiator's sequence number is
higher than the peer's, and then the initator will send those records if
necessary.
