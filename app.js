const handler = require('serve-handler');
const arg = process.argv.slice(2)
const sharepath = arg[0] || "./"
const port = arg[1] || 1000
const os = require('os')
const express = require('express')
const app = express() 
const fs = require('fs')
 


const interfaces = os.networkInterfaces();

const getNetworkAddress = () => {
	for (const name of Object.keys(interfaces)) {
		for (const interface of interfaces[name]) {
			const {address, family, internal} = interface;
      console.log(address)
			if (family === 'IPv4' && !internal) {
				return address;
			}
		}
	}
}; 

app.use(async (req, res, next) => {
  if (req.query.type === "files") {
    return handler(req, res, {
      "public": sharepath 
    });
  }
  next() 
})

app.use((req, res) => {
  res.sendFile("./controlplane/index.html")
})

app.listen(port, '0.0.0.0', () => {
  console.log('Running at http://localhost:' + String(port));
});