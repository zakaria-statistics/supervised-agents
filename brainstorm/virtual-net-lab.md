# Virtual Networking Lab

Hands-on exercises to understand Linux networking, Docker, and Kubernetes networking by doing.

**Prerequisites:**
- Linux VM (your k8s01)
- Docker installed
- kubectl + minikube or k3s (for K8s labs)

---

## Part 1: Network Namespaces (The Foundation)

Everything else (Docker, K8s) is built on top of network namespaces. Understand this first.

### Lab 1.1: Create Your Own Network Namespace

```bash
# See current namespaces (probably empty)
sudo ip netns list

# Create two namespaces (like two isolated containers)
sudo ip netns add red
sudo ip netns add blue

# Verify they exist
sudo ip netns list
# Output: red, blue
```

### Lab 1.2: Explore Inside a Namespace

```bash
# See interfaces in the "red" namespace
sudo ip netns exec red ip addr
# Output: Only 'lo' (loopback), and it's DOWN!

# Compare with host
ip addr
# Output: lo, eth0, docker0, etc.

# Key insight: The namespace is completely isolated - no network access yet
```

### Lab 1.3: Connect Two Namespaces with a veth Pair

A veth pair is like a virtual ethernet cable - packets in one end come out the other.

```bash
# Create a veth pair
sudo ip link add veth-red type veth peer name veth-blue

# Check - both ends are on the HOST right now
ip link | grep veth
# veth-red@veth-blue, veth-blue@veth-red

# Move each end into its namespace
sudo ip link set veth-red netns red
sudo ip link set veth-blue netns blue

# Verify - they disappeared from host!
ip link | grep veth
# (nothing)

# They're now inside the namespaces
sudo ip netns exec red ip link
# lo, veth-red

sudo ip netns exec blue ip link
# lo, veth-blue
```

### Lab 1.4: Assign IPs and Bring Up Interfaces

```bash
# Assign IPs
sudo ip netns exec red ip addr add 10.0.0.1/24 dev veth-red
sudo ip netns exec blue ip addr add 10.0.0.2/24 dev veth-blue

# Bring interfaces UP
sudo ip netns exec red ip link set veth-red up
sudo ip netns exec blue ip link set veth-blue up

# Also bring up loopback
sudo ip netns exec red ip link set lo up
sudo ip netns exec blue ip link set lo up

# Verify
sudo ip netns exec red ip addr show veth-red
# inet 10.0.0.1/24
```

### Lab 1.5: Test Connectivity!

```bash
# Ping from red to blue
sudo ip netns exec red ping -c 3 10.0.0.2
# IT WORKS! Packets flow through the veth pair

# Watch the traffic
# Terminal 1:
sudo ip netns exec red tcpdump -i veth-red -nn

# Terminal 2:
sudo ip netns exec blue ping 10.0.0.1

# You'll see ICMP packets flowing
```

### Lab 1.6: Each Namespace Has Its Own Ports

```bash
# Start a "server" in blue namespace on port 8080
sudo ip netns exec blue nc -l -p 8080 &

# Connect from red namespace
sudo ip netns exec red nc 10.0.0.2 8080
# Type something, it appears in the other terminal!

# Key insight: Port 8080 in "blue" is completely separate from port 8080 on the host
# That's why Docker containers can all use port 8080 internally
```

### Lab 1.7: Cleanup

```bash
sudo ip netns delete red
sudo ip netns delete blue
```

---

## Part 2: Build Your Own "Docker Bridge"

Docker's bridge network is just: a Linux bridge + veth pairs + iptables NAT. Let's build one manually.

### Lab 2.1: Create a Bridge (Like docker0)

```bash
# Create a bridge interface
sudo ip link add mybridge type bridge

# Assign an IP (this will be the gateway for our "containers")
sudo ip addr add 172.18.0.1/16 dev mybridge

# Bring it up
sudo ip link set mybridge up

# Verify
ip addr show mybridge
```

### Lab 2.2: Create Two "Containers" (Namespaces) Connected to the Bridge

```bash
# Create namespaces
sudo ip netns add container1
sudo ip netns add container2

# Create veth pairs for each
sudo ip link add veth1 type veth peer name veth1-br
sudo ip link add veth2 type veth peer name veth2-br

# Put one end in each namespace
sudo ip link set veth1 netns container1
sudo ip link set veth2 netns container2

# Attach the other end to the bridge
sudo ip link set veth1-br master mybridge
sudo ip link set veth2-br master mybridge

# Bring up the bridge-side interfaces
sudo ip link set veth1-br up
sudo ip link set veth2-br up

# Configure IPs inside "containers"
sudo ip netns exec container1 ip addr add 172.18.0.2/16 dev veth1
sudo ip netns exec container2 ip addr add 172.18.0.3/16 dev veth2

# Bring up interfaces inside namespaces
sudo ip netns exec container1 ip link set veth1 up
sudo ip netns exec container1 ip link set lo up
sudo ip netns exec container2 ip link set veth2 up
sudo ip netns exec container2 ip link set lo up
```

### Lab 2.3: Test Container-to-Container Communication

```bash
# Container1 → Container2
sudo ip netns exec container1 ping -c 3 172.18.0.3
# WORKS! Traffic goes: veth1 → bridge → veth2

# Both can reach the "gateway" (host)
sudo ip netns exec container1 ping -c 3 172.18.0.1
# WORKS!
```

### Lab 2.4: Container Can't Reach Internet Yet

```bash
# Try to reach external IP
sudo ip netns exec container1 ping -c 2 8.8.8.8
# FAILS! "Network unreachable"

# Why? The container has no default route
sudo ip netns exec container1 ip route
# Only: 172.18.0.0/16 dev veth1

# Add default route via our bridge
sudo ip netns exec container1 ip route add default via 172.18.0.1
sudo ip netns exec container2 ip route add default via 172.18.0.1

# Try again
sudo ip netns exec container1 ping -c 2 8.8.8.8
# Still fails! Packet leaves, but reply can't come back
# Why? The source IP (172.18.0.2) is private, internet doesn't know how to reach it
```

### Lab 2.5: Enable NAT (MASQUERADE) - This is What Docker Does!

```bash
# Enable IP forwarding (allow host to route packets)
sudo sysctl net.ipv4.ip_forward=1

# Add MASQUERADE rule (change source IP to host's IP when leaving)
sudo iptables -t nat -A POSTROUTING -s 172.18.0.0/16 ! -o mybridge -j MASQUERADE

# Now try again
sudo ip netns exec container1 ping -c 3 8.8.8.8
# IT WORKS!

# What happened:
# 1. Packet leaves container1: src=172.18.0.2, dst=8.8.8.8
# 2. Host receives, routes to eth0
# 3. MASQUERADE changes src to host's IP (192.168.11.67)
# 4. Reply comes back to host
# 5. Host uses conntrack to remember, changes dst back to 172.18.0.2
# 6. Packet delivered to container1
```

### Lab 2.6: See the NAT in Action

```bash
# Terminal 1: Watch NAT translations
sudo conntrack -E

# Terminal 2: Generate traffic
sudo ip netns exec container1 curl -s http://example.com

# You'll see the connection tracking entries showing the translation
```

### Lab 2.7: Port Forwarding (Like docker -p)

```bash
# Start a web server in container1
sudo ip netns exec container1 python3 -m http.server 80 &

# Currently only reachable from inside
sudo ip netns exec container2 curl http://172.18.0.2/
# Works!

curl http://172.18.0.2/
# Works from host too (because host has route to bridge)

# But external machines can't reach it. Let's add port forwarding:
# External:8080 → container1:80

sudo iptables -t nat -A PREROUTING -p tcp --dport 8080 -j DNAT --to-destination 172.18.0.2:80
sudo iptables -A FORWARD -p tcp -d 172.18.0.2 --dport 80 -j ACCEPT

# Now from another machine (or host):
curl http://<host-ip>:8080/
# Traffic flows: external → host:8080 → DNAT → container1:80
```

### Lab 2.8: See All the iptables Rules We Created

```bash
# NAT rules
sudo iptables -t nat -L -n -v
# You'll see:
# - MASQUERADE for outbound
# - DNAT for port forwarding

# Filter rules
sudo iptables -L FORWARD -n -v
```

### Lab 2.9: Cleanup

```bash
# Remove iptables rules
sudo iptables -t nat -F
sudo iptables -F FORWARD

# Delete namespaces
sudo ip netns delete container1
sudo ip netns delete container2

# Delete bridge
sudo ip link delete mybridge
```

---

## Part 3: Observe Real Docker Networking

Now that you understand the building blocks, let's see how Docker does it.

### Lab 3.1: Inspect docker0 Bridge

```bash
# See the docker0 bridge
ip addr show docker0
# Note the IP: 172.17.0.1/16

# See bridge details
bridge link show docker0
# Shows veth interfaces attached to it
```

### Lab 3.2: Run a Container and Watch What Happens

```bash
# Terminal 1: Watch interface creation
watch -n1 'ip link | grep veth'

# Terminal 2: Start a container
docker run -d --name web1 nginx

# You'll see a new veth appear!

# Find the container's IP
docker inspect web1 --format '{{.NetworkSettings.IPAddress}}'
# 172.17.0.X

# See the veth pair
bridge link show docker0
```

### Lab 3.3: Enter Container's Namespace

```bash
# Find container's PID
PID=$(docker inspect web1 --format '{{.State.Pid}}')
echo $PID

# See network from container's view
sudo nsenter -t $PID -n ip addr
# eth0: 172.17.0.X (connected to docker0)

# See routing
sudo nsenter -t $PID -n ip route
# default via 172.17.0.1 (docker0 is the gateway)

# See listening ports
sudo nsenter -t $PID -n ss -tlnp
```

### Lab 3.4: Observe Docker Port Mapping

```bash
# Run container with port mapping
docker run -d --name web2 -p 8081:80 nginx

# See Docker's DNAT rule
sudo iptables -t nat -L DOCKER -n -v | grep 8081
# DNAT tcp -- 0.0.0.0/0 0.0.0.0/0 tcp dpt:8081 to:172.17.0.X:80

# Test it
curl http://localhost:8081/

# Watch the packet flow
sudo tcpdump -i any port 8081 or port 80 -nn &
curl http://localhost:8081/
```

### Lab 3.5: Container-to-Container Communication

```bash
# Run two containers
docker run -d --name app1 nginx
docker run -d --name app2 alpine sleep 3600

# Get app1's IP
APP1_IP=$(docker inspect app1 --format '{{.NetworkSettings.IPAddress}}')

# From app2, connect to app1
docker exec app2 wget -qO- http://$APP1_IP/
# Works! Both on same bridge

# Watch traffic on docker0
sudo tcpdump -i docker0 -nn
# Then run the wget again
```

### Lab 3.6: Custom Docker Network

```bash
# Create custom network
docker network create --subnet=172.20.0.0/16 mynet

# See the new bridge
ip link | grep br-
bridge link

# Run containers on it
docker run -d --name custom1 --network mynet nginx
docker run -d --name custom2 --network mynet alpine sleep 3600

# They can reach each other by NAME (DNS!)
docker exec custom2 ping -c 2 custom1
# Docker's embedded DNS resolves container names
```

### Lab 3.7: Cleanup

```bash
docker rm -f web1 web2 app1 app2 custom1 custom2
docker network rm mynet
```

---

## Part 4: Kubernetes Networking

Kubernetes adds another layer: Services (virtual IPs managed by kube-proxy).

### Lab 4.1: Setup (if using minikube)

```bash
# Start minikube if not running
minikube start

# Or use your k3s cluster
```

### Lab 4.2: Deploy Pods and Observe Their Network

```bash
# Create a deployment with 3 replicas
kubectl create deployment web --image=nginx --replicas=3

# Wait for pods
kubectl get pods -o wide
# Note: Each pod has its own IP (10.244.x.x or similar)

# Enter a pod and explore
kubectl exec -it <pod-name> -- bash
ip addr        # See pod's IP
ip route       # See routing
cat /etc/resolv.conf  # See cluster DNS
exit
```

### Lab 4.3: Create a Service and See kube-proxy Magic

```bash
# Expose the deployment
kubectl expose deployment web --port=80 --target-port=80

# Get service info
kubectl get svc web
# NAME   TYPE        CLUSTER-IP      PORT(S)
# web    ClusterIP   10.96.X.X       80/TCP

# This ClusterIP is VIRTUAL - it doesn't exist on any interface!
# Let's prove it:
ip addr | grep 10.96
# Nothing!

# But it works:
kubectl run test --rm -it --image=busybox -- wget -qO- http://web/
# nginx response!
```

### Lab 4.4: How Does ClusterIP Work? iptables!

```bash
# See kube-proxy's iptables rules (run on node, not in pod)
sudo iptables -t nat -L KUBE-SERVICES -n | grep -A2 web

# You'll see something like:
# KUBE-SVC-XXXXX  tcp  --  0.0.0.0/0  10.96.X.X  tcp dpt:80

# Follow the chain
sudo iptables -t nat -L KUBE-SVC-XXXXX -n
# Shows rules that DNAT to actual pod IPs with probability (load balancing!)
# -m statistic --mode random --probability 0.333 → pod1 IP
# -m statistic --mode random --probability 0.500 → pod2 IP
# → pod3 IP
```

### Lab 4.5: Test Load Balancing

```bash
# Modify nginx to show hostname
for pod in $(kubectl get pods -l app=web -o name); do
  kubectl exec $pod -- sh -c 'echo "I am $(hostname)" > /usr/share/nginx/html/index.html'
done

# Now curl multiple times
for i in {1..10}; do
  kubectl run test$i --rm -it --image=busybox --restart=Never -- wget -qO- http://web/
done
# You'll see different hostnames - load balancing works!
```

### Lab 4.6: NodePort - Access from Outside

```bash
# Change service to NodePort
kubectl expose deployment web --port=80 --type=NodePort --name=web-external

# Get the assigned port
kubectl get svc web-external
# PORT(S): 80:31XXX/TCP

# Access from outside (use node IP + NodePort)
curl http://<node-ip>:31XXX/

# See the iptables rule for NodePort
sudo iptables -t nat -L KUBE-NODEPORTS -n
```

### Lab 4.7: Pod-to-Pod Across Nodes (if multi-node cluster)

```bash
# Get pods and their nodes
kubectl get pods -o wide

# The CNI plugin (flannel, calico) handles cross-node routing
# It creates overlay networks or configures routes

# See flannel interface (if using flannel)
ip addr show flannel.1

# See routes for pod network
ip route | grep 10.244
```

### Lab 4.8: DNS in Kubernetes

```bash
# Every service gets a DNS name
kubectl run test --rm -it --image=busybox -- nslookup web
# Returns: web.default.svc.cluster.local → 10.96.X.X

# Full DNS name format:
# <service>.<namespace>.svc.cluster.local

# See DNS server
kubectl run test --rm -it --image=busybox -- cat /etc/resolv.conf
# nameserver 10.96.0.10 (kube-dns/CoreDNS)
```

### Lab 4.9: Cleanup

```bash
kubectl delete deployment web
kubectl delete svc web web-external
```

---

## Part 5: Troubleshooting Exercises

### Exercise 5.1: Debug "Connection Refused"

```bash
# Scenario: curl http://localhost:8080 returns "Connection refused"

# Step 1: Is anything listening?
ss -tlnp | grep 8080
# If empty → nothing is listening on that port

# Step 2: Is it bound to correct interface?
ss -tlnp | grep 8080
# 127.0.0.1:8080 → only localhost
# 0.0.0.0:8080 → all interfaces

# Step 3: Check from container perspective
docker exec <container> ss -tlnp
```

### Exercise 5.2: Debug "No Route to Host"

```bash
# Scenario: Container can't reach external site

# Step 1: Check routing inside container
docker exec <container> ip route
# Is there a default route?

# Step 2: Check host IP forwarding
cat /proc/sys/net/ipv4/ip_forward
# Should be 1

# Step 3: Check NAT rules
sudo iptables -t nat -L POSTROUTING -n -v | grep MASQ
```

### Exercise 5.3: Debug Kubernetes Service

```bash
# Scenario: Pod can't reach service

# Step 1: Check service exists and has endpoints
kubectl get svc <service>
kubectl get endpoints <service>
# Endpoints should list pod IPs

# Step 2: Check pod labels match service selector
kubectl get svc <service> -o yaml | grep selector
kubectl get pods --show-labels

# Step 3: Check kube-proxy is running
kubectl get pods -n kube-system | grep kube-proxy
```

---

## Cheat Sheet: What to Check

| Problem | Commands |
|---------|----------|
| Nothing listening | `ss -tlnp \| grep <port>` |
| Wrong binding | `ss -tlnp` (check 0.0.0.0 vs 127.0.0.1) |
| Firewall blocking | `sudo iptables -L -n -v` |
| No NAT | `sudo iptables -t nat -L -n -v` |
| Container IP | `docker inspect <c> --format '{{.NetworkSettings.IPAddress}}'` |
| Pod IP | `kubectl get pods -o wide` |
| Service endpoints | `kubectl get endpoints <svc>` |
| DNS resolution | `nslookup <hostname>` or `dig +short <hostname>` |
| Packet flow | `sudo tcpdump -i any port <port> -nn` |
| Inside namespace | `sudo nsenter -t <pid> -n <command>` |

---

## Summary: How It All Connects

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        NETWORKING STACK                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  KUBERNETES                                                             │
│  ├── Services (ClusterIP, NodePort, LoadBalancer)                      │
│  │   └── Implemented via: kube-proxy + iptables DNAT                   │
│  ├── Pods                                                               │
│  │   └── Each pod = network namespace + veth to CNI bridge             │
│  └── CNI (Flannel, Calico)                                             │
│      └── Cross-node communication (overlay or routing)                  │
│                                                                         │
│  DOCKER                                                                 │
│  ├── docker0 bridge                                                     │
│  │   └── Linux bridge connecting containers                            │
│  ├── Port mapping (-p 8080:80)                                         │
│  │   └── iptables DNAT in PREROUTING chain                             │
│  ├── Container networking                                               │
│  │   └── veth pair: one end in container, one on bridge                │
│  └── Outbound NAT                                                       │
│      └── iptables MASQUERADE in POSTROUTING chain                      │
│                                                                         │
│  LINUX KERNEL                                                           │
│  ├── Network Namespaces                                                │
│  │   └── Isolated network stacks (interfaces, IPs, ports, routes)      │
│  ├── veth pairs                                                         │
│  │   └── Virtual ethernet cables connecting namespaces                 │
│  ├── Bridges                                                            │
│  │   └── Virtual switches connecting multiple interfaces               │
│  └── Netfilter / iptables                                              │
│      └── Packet filtering, NAT, mangling                               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

Once you understand namespaces + veth + bridges + iptables, Docker and Kubernetes networking is just automation of these primitives!
