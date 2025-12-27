# Network Lab - Quick Hands-On

Fast labs to understand namespaces, Docker, and Kubernetes networking.

---

## Lab 1: Network Namespaces (5 min)

```bash
# Create two isolated "containers"
sudo ip netns add box1
sudo ip netns add box2

# Connect them with a virtual cable (veth pair)
sudo ip link add veth1 type veth peer name veth2
sudo ip link set veth1 netns box1
sudo ip link set veth2 netns box2

# Assign IPs and bring up
sudo ip netns exec box1 ip addr add 10.0.0.1/24 dev veth1
sudo ip netns exec box2 ip addr add 10.0.0.2/24 dev veth2
sudo ip netns exec box1 ip link set veth1 up
sudo ip netns exec box2 ip link set veth2 up

# Test - they can talk!
sudo ip netns exec box1 ping -c 2 10.0.0.2

# Cleanup
sudo ip netns delete box1 && sudo ip netns delete box2
```

**Takeaway:** Namespaces = isolated network stacks. veth = virtual cable.

---

## Lab 2: Docker Bridge (5 min)

```bash
# Run two containers
docker run -d --name c1 nginx
docker run -d --name c2 alpine sleep 3600

# See Docker's bridge
ip addr show docker0

# See veth pairs attached
bridge link show docker0

# Get container IPs
docker inspect c1 --format '{{.NetworkSettings.IPAddress}}'
docker inspect c2 --format '{{.NetworkSettings.IPAddress}}'

# Container-to-container works (same bridge)
docker exec c2 wget -qO- http://$(docker inspect c1 --format '{{.NetworkSettings.IPAddress}}')

# See inside container's namespace
docker exec c1 ip addr
docker exec c1 ip route   # default via docker0

# Cleanup
docker rm -f c1 c2
```

**Takeaway:** docker0 = bridge (virtual switch). Containers connect via veth pairs.

---

## Lab 3: Docker Port Mapping & iptables (5 min)

```bash
# Run with port mapping
docker run -d --name web -p 8080:80 nginx

# See the DNAT rule Docker created
sudo iptables -t nat -L DOCKER -n | grep 8080
# Output: DNAT ... dpt:8080 to:172.17.0.X:80

# Test it
curl localhost:8080

# See MASQUERADE for outbound NAT
sudo iptables -t nat -L POSTROUTING -n | grep MASQ

# Cleanup
docker rm -f web
```

**Takeaway:** `-p 8080:80` = iptables DNAT rule. Outbound = MASQUERADE.

---

## Lab 4: Kubernetes Service (10 min)

```bash
# Create deployment
kubectl create deployment web --image=nginx --replicas=2

# Expose as ClusterIP service
kubectl expose deployment web --port=80

# Get service IP (virtual - doesn't exist on any interface!)
kubectl get svc web
# CLUSTER-IP: 10.96.X.X

# Prove it's virtual
ip addr | grep 10.96   # nothing

# But it works!
kubectl run test --rm -it --image=busybox --restart=Never -- wget -qO- http://web/

# See kube-proxy's iptables magic
sudo iptables -t nat -L -n | grep -A5 "KUBE-SVC" | head -20
# Shows DNAT rules with probability (load balancing)

# Check endpoints (actual pod IPs)
kubectl get endpoints web

# Cleanup
kubectl delete deployment web && kubectl delete svc web
```

**Takeaway:** ClusterIP = iptables DNAT rules. kube-proxy manages them.

---

## Lab 5: Debugging Commands

```bash
# What's listening on a port?
ss -tlnp | grep :8080
sudo lsof -i :8080

# Container's network view
docker exec <container> ip addr
docker exec <container> ss -tlnp

# Watch packets
sudo tcpdump -i any port 8080 -nn

# See all NAT rules
sudo iptables -t nat -L -n -v

# K8s: Check service has endpoints
kubectl get endpoints <service>
```

---

## Quick Reference

| Concept | What It Is |
|---------|-----------|
| Namespace | Isolated network stack (own IPs, ports, routes) |
| veth pair | Virtual cable connecting two namespaces |
| Bridge (docker0) | Virtual switch connecting containers |
| DNAT | Change destination IP (port forwarding) |
| MASQUERADE | Change source IP to host's (outbound NAT) |
| ClusterIP | Virtual IP existing only as iptables rules |
| kube-proxy | Creates iptables rules for Services |
