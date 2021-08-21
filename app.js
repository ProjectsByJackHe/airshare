const handler = require('serve-handler');
const arg = process.argv.slice(2)
const path = require('path')
const sharepath = arg[0] || "../"
const port = arg[1] || 1000
const os = require('os')
const express = require('express')
const app = express() 
const fs = require('fs')
const bodyParser = require('body-parser')
const cors = require('cors')
const NodeCache = require("node-cache"); 
const { exit } = require('process');
// single key will be used to represent internal memory cache
// key: "nodes", value: JSON
const myCache = new NodeCache() 

// utility functions 
const interfaces = os.networkInterfaces();
const getNetworkAddress = () => {
	for (const name of Object.keys(interfaces)) {
		for (const interface of interfaces[name]) {
			const {address, family, internal} = interface;
			if (family === 'IPv4' && !internal) {
				return address;
			}
		}
	}
};


try {
  // initialize node.json as current node since we don't know the state of all other hosts on the network yet. 
  const currentHostIp = String(getNetworkAddress()); 
  const currentDate = new Date()

  // default metadata: hostname + os type (windows / mac / linux)
  const defaultName = os.hostname() + " --- " + os.type()
  fs.writeFileSync("./var/nodes.json", JSON.stringify({
    "nodes" : [{ "ip" : currentHostIp + ":" + port, "metadata" : defaultName, "creationDate": currentDate }]
  }))

} catch (err) {
  console.log(err) 
  exit(1); 
}

app.use(bodyParser.json())

app.use(cors())

app.get("/exist", (req, res) => {
  res.status(200).send("exists")
})

app.post("/node/update", (req, res) => {
  if (myCache.get("nodes")) myCache.del("nodes"); 
  let newNodes = req.body 
  // newNodes should be { "nodes" : [{...}, {...}] }
  try {
    if (newNodes.nodes.length) {
      fs.writeFileSync("./var/nodes.json", newNodes)
    } else {
      throw new Error("invalid number of nodes")
    }
  } catch (err) {
    res.status(400).send(err)
  }
})


app.get("/node/data", (req, res) => {
  try {
    let nodes = myCache.get("nodes") 
    if (!nodes) {
      nodes = fs.readFileSync("./var/node.json") 
      myCache.set("nodes", nodes) 
    }

    res.json(JSON.stringify(nodes))
  } catch (err) {
    res.status(500).send("get /node/data: " + String(err)) 
  }
})

app.use(async (req, res, next) => {
  if (req.query.type === "files") {
    return handler(req, res, {
      "public": sharepath 
    });
  }
  next() 
})

app.use((req, res) => {
  res.sendFile(path.resolve(__dirname, "controlplane", "index.html"))
})

app.listen(port, '0.0.0.0', () => {
  console.log('Running at http://localhost:' + String(port));
});