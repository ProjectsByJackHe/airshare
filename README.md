# This project is based off of  [vercel/serve-handler](https://github.com/vercel/serve-handler)

The main goal is to add a control plane layer to easily manage hosts connected to the local network. 

# User control plane

Data about registered hosts is stored as /var/nodes.json on disk and "nodes" key in cache 