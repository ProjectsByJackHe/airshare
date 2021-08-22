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
const axios = require('axios')
const NodeCache = require("node-cache"); 
const { exit } = require('process');
// single key will be used to represent internal memory cache
// key: "nodes", value: JSON
const myCache = new NodeCache() 
let hostIp;
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
  hostIp = String(getNetworkAddress()); 
  const currentDate = new Date()

  // default metadata: hostname + os type (windows / mac / linux)
  const platform = os.type() === "Darwin" ? "MacOs" : os.type()
  const defaultName = os.hostname() + "---" + platform
  fs.writeFileSync("./var/nodes.json", JSON.stringify({
    "nodes" : [{ "ip" : hostIp + ":" + port, "metadata" : defaultName, "creationDate": currentDate }]
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
    console.log(newNodes.nodes)
    if (newNodes.nodes.length) {
      fs.writeFileSync("./var/nodes.json", JSON.stringify(newNodes))
    } else {
      throw new Error("invalid number of nodes")
    }
  } catch (err) {
    console.log("error while trying to write to file: " + err)
    return res.status(400).send(err)
  }

  res.status(200).send("success!")
})


app.get("/node/data", async (req, res) => {
  try {
    let hosts = myCache.get("nodes") 
    if (!hosts) {
      hosts = JSON.parse(fs.readFileSync("./var/nodes.json")) 
      myCache.set("nodes", hosts) 
    }

    let validNodes = []
    
    for (let i = 0; i < hosts.nodes.length; i++) {
      let node = hosts.nodes[i]
      try {
        let text = await axios.get("http://" + node.ip + "/exist")
        if (text.data === "exists") { validNodes.push(node) }
      } catch (err) {
        console.log("host found offline: " + node + " AND failed to GET: " + err)
        continue 
      }
    } 

    // update nodes.json with list of still-online nodes
    if (validNodes.length !== hosts.nodes.length && validNodes.length > 0) {
      fs.writeFileSync("./var/nodes.json", { "nodes" : validNodes }) 
      myCache.set("nodes", { "nodes" : validNodes })
    }
 
    res.json(JSON.stringify({ "nodes" : validNodes }))
  } catch (err) {
    console.log("get /node/data: " + String(err))
    res.status(500).send("get /node/data: " + String(err)) 
  }
})

app.use(async (req, res, next) => {
  if (req.query.type) {
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
  console.log('Running at http://localhost:' + String(port) + ", on your network: http://" + String(hostIp) + ":" + String(port));
});