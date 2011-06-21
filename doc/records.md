# SODN Records

Each node has a set of records about all the other nodes on the network.
These records are stored in an object where the key is the uuid of the
remote node.  It contains the following items:

* id - The uuid for that node
* name - A not-necessarily-unique name
* host - Hostname or IP, if listening for connections
* port - Port, if listening for connections
* friends - List of uuids that the remote node is connected to
* sequence - An integer that is incremented each time the data changes


Basic gossip protocol:

```
with nodes A and B:

A:
send set of id:sequence (DIGEST)

B:
For each id:sequence in DIGEST
  if sequence > data[id].sequence add data[id] to SEND_LIST
  if id unknown, or sequence < data[id].sequence add id to REQUEST_LIST
send SEND_LIST, REQUEST_LIST

A:
For each record in SEND_LIST
  data[id] = SEND_LIST[id]
For each id in REQUEST_LIST
  add id:data[id] to UPDATE_LIST
send UPDATE_LIST

B:
For each id:record in UPDATE_LIST
  data[id] = record
```

# MTU Boundaries and Topological Heuristics

In large a frequently-changing networks, complications arise as the size
of the updates gets close to the Maximum Transmission Unit (MTU).  The
algorithm above may lead to cases where one node requests more records
than the other is willing to send in a single transmission.

This will lead to cases where the *existence* of a node is known, but
its information is not filled in.  In those cases, the node should
record an empty record with a sequence ID of -1, so that it's knowledge
of the count of nodes on the network can still be as accurate as
possible.

Furthermore, because the network connections are a part of the data
transmitted, there may be cases where information should be prioritized
based on the shape of the network.

Given this topology:

```
A-----B
|     |
|     |
C-----D----E
```

If B initiates a gossip exchange with A, and determines that A has
updated information about E, but sending the full data for E would push
it over the MTU, then B should perhaps prioritize other pieces of data,
and initiate a gossip exchange with D instead.


