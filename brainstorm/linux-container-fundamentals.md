# Linux Container Fundamentals

A progressive guide from basic Linux concepts to Kubernetes. Each section builds on the previous.

---

## The Learning Chain

```
LEVEL 1: Linux Basics
├── Processes (everything is a process)
├── Files & Inodes (everything is a file)
├── I/O & Pipes (processes communicate)
└── File Descriptors (how processes access files)
         │
         ▼
LEVEL 2: Isolation Primitives
├── chroot (filesystem isolation - 1979)
├── Namespaces (resource isolation - 2002-2016)
└── Cgroups (resource limits - 2007)
         │
         ▼
LEVEL 3: Container Evolution
├── LXC (first "containers" - 2008)
├── Docker (user-friendly containers - 2013)
└── OCI/containerd (standardization)
         │
         ▼
LEVEL 4: Networking
├── Network Namespaces
├── veth, bridges, routing
└── iptables/netfilter (firewalls, NAT)
         │
         ▼
LEVEL 5: Orchestration
├── Kubernetes concepts
├── Services & kube-proxy
└── CNI & networking
```

---

# LEVEL 1: Linux Basics

## 1.1 Processes

**Everything running is a process.** Your shell, nginx, docker daemon - all processes.

```
                    PID 1 (init/systemd)
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
      PID 100          PID 200          PID 300
      (sshd)           (dockerd)        (nginx)
          │                │
          ▼                ▼
      PID 101          PID 201
    (your shell)     (container)
          │
          ▼
      PID 102
      (vim)
```

**Key concepts:**
- **PID**: Process ID, unique identifier
- **PPID**: Parent PID - who spawned this process
- **fork()**: Create a copy of current process
- **exec()**: Replace current process with new program

```bash
# See process tree
pstree -p

# See all processes
ps aux

# Process info in /proc
ls /proc/1/          # PID 1's info
cat /proc/1/status   # Process status
cat /proc/1/cmdline  # Command that started it
```

**The /proc filesystem:**
```
/proc/
├── 1/                  # PID 1
│   ├── cmdline         # Command line
│   ├── environ         # Environment variables
│   ├── fd/             # Open file descriptors
│   ├── ns/             # Namespace links
│   ├── cgroup          # Cgroup membership
│   └── status          # Process status
├── cpuinfo             # CPU information
├── meminfo             # Memory information
└── net/                # Network info
```

---

## 1.2 Files & Inodes

**Everything is a file.** Devices, sockets, pipes - all represented as files.

```
                    ┌─────────────┐
                    │   INODE     │
                    │  (metadata) │
                    ├─────────────┤
                    │ • owner     │
                    │ • permissions│
                    │ • size      │
                    │ • timestamps│
                    │ • data block│
                    │   pointers  │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
          [data]       [data]       [data]
          block 1      block 2      block 3
```

**Key concepts:**
- **Inode**: Metadata about a file (not the name!)
- **Directory**: Just a file mapping names → inode numbers
- **Hard link**: Multiple names pointing to same inode
- **Soft link**: File containing path to another file

```bash
# See inode numbers
ls -li

# See inode details
stat myfile.txt

# See filesystem inodes
df -i
```

**File types (first character of ls -l):**
```
-  regular file
d  directory
l  symbolic link
c  character device (e.g., /dev/tty)
b  block device (e.g., /dev/sda)
s  socket
p  named pipe (FIFO)
```

---

## 1.3 File Descriptors & I/O

**File descriptors (FD)** are how processes access files, pipes, sockets, devices.

```
┌─────────────────────────────────────────────────────────────┐
│                     PROCESS                                  │
│                                                             │
│  File Descriptor Table:                                     │
│  ┌────┬────────────────────────────────────┐               │
│  │ FD │ Points to                          │               │
│  ├────┼────────────────────────────────────┤               │
│  │  0 │ stdin  (keyboard, pipe, file)      │               │
│  │  1 │ stdout (terminal, pipe, file)      │               │
│  │  2 │ stderr (terminal, file)            │               │
│  │  3 │ open file, socket, etc.            │               │
│  │  4 │ another open file...               │               │
│  └────┴────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────┘
```

```bash
# See open file descriptors for a process
ls -l /proc/<pid>/fd/

# Example output:
# 0 -> /dev/pts/0 (stdin - terminal)
# 1 -> /dev/pts/0 (stdout - terminal)
# 2 -> /dev/pts/0 (stderr - terminal)
# 3 -> socket:[12345] (network socket)
# 4 -> /var/log/app.log (log file)
```

---

## 1.4 Pipes (Inter-Process Communication)

**Pipes** connect stdout of one process to stdin of another.

```
┌─────────────┐    PIPE     ┌─────────────┐
│   Process A │────────────►│  Process B  │
│             │  (buffer)   │             │
│ stdout (1) ─┼─►  ════  ──►┼─ stdin (0)  │
└─────────────┘             └─────────────┘

Example: cat file.txt | grep "error" | wc -l
```

**Anonymous pipes** (created with `|`):
```bash
# Data flows: cat → grep → wc
cat /var/log/syslog | grep error | wc -l
```

**Named pipes (FIFOs)** - persist on filesystem:
```bash
# Create named pipe
mkfifo /tmp/mypipe

# Terminal 1: Writer (blocks until reader connects)
echo "hello" > /tmp/mypipe

# Terminal 2: Reader
cat /tmp/mypipe
# Output: hello
```

**Other IPC mechanisms:**
```
┌──────────────────┬─────────────────────────────────────────┐
│ Mechanism        │ Use case                                │
├──────────────────┼─────────────────────────────────────────┤
│ Pipe             │ Parent-child, simple streaming          │
│ Named pipe (FIFO)│ Unrelated processes, simple             │
│ Unix socket      │ Local processes, bidirectional          │
│ TCP/UDP socket   │ Network communication                   │
│ Shared memory    │ High performance, same machine          │
│ Message queue    │ Async messaging                         │
│ Signals          │ Simple notifications (SIGTERM, etc.)    │
└──────────────────┴─────────────────────────────────────────┘
```

---

## 1.5 Standard I/O Redirection

```bash
# Redirect stdout to file
command > output.txt      # overwrite
command >> output.txt     # append

# Redirect stderr to file
command 2> errors.txt

# Redirect both
command > output.txt 2>&1
command &> all.txt        # shorthand

# Redirect stdin from file
command < input.txt

# /dev/null - discard output
command > /dev/null 2>&1
```

---

# LEVEL 2: Isolation Primitives

## 2.1 chroot (1979) - Filesystem Isolation

**chroot** changes the root directory for a process. It sees a different `/`.

```
REAL FILESYSTEM:                    CHROOT VIEW:
/                                   /  (actually /jail)
├── bin/                            ├── bin/
├── etc/                            ├── etc/
├── home/                           └── app/
├── jail/        ◄── chroot here
│   ├── bin/
│   ├── etc/
│   └── app/
└── var/
```

```bash
# Create minimal chroot environment
mkdir -p /jail/{bin,lib,lib64}
cp /bin/bash /jail/bin/
cp /bin/ls /jail/bin/

# Copy required libraries
ldd /bin/bash  # see dependencies
cp /lib/x86_64-linux-gnu/libc.so.6 /jail/lib/
# ... copy other libs

# Enter chroot
sudo chroot /jail /bin/bash

# Now / is /jail - can't see real filesystem
ls /
# Only sees: bin, lib, lib64
```

**Limitation:** chroot only isolates filesystem. Process can still see all other processes, use all network, consume all CPU/memory.

---

## 2.2 Namespaces (2002-2016) - Resource Isolation

**Namespaces** isolate what a process can SEE.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        LINUX NAMESPACES                                  │
├──────────────┬──────────┬────────────────────────────────────────────────┤
│ Namespace    │ Isolates │ What process sees                             │
├──────────────┼──────────┼────────────────────────────────────────────────┤
│ PID          │ PIDs     │ Own PID tree (PID 1 inside container)         │
│ NET          │ Network  │ Own interfaces, IPs, ports, routing           │
│ MNT          │ Mounts   │ Own mount points, filesystem view             │
│ UTS          │ Hostname │ Own hostname and domain                       │
│ IPC          │ IPC      │ Own message queues, semaphores                │
│ USER         │ UIDs     │ Own user/group IDs (UID 0 maps to non-root)   │
│ CGROUP       │ Cgroups  │ Own cgroup root (added in 2016)               │
└──────────────┴──────────┴────────────────────────────────────────────────┘
```

```bash
# See namespaces for a process
ls -la /proc/$$/ns/
# cgroup -> cgroup:[...]
# ipc -> ipc:[...]
# mnt -> mnt:[...]
# net -> net:[...]
# pid -> pid:[...]
# user -> user:[...]
# uts -> uts:[...]

# Create process in new namespace
sudo unshare --net --pid --fork bash
# Now in new network + PID namespace

# Verify
ip addr    # only lo, no eth0
ps aux     # only sees processes in this namespace
```

**Quick namespace demo:**
```bash
# Create new UTS namespace (hostname isolation)
sudo unshare --uts bash
hostname container-test
hostname   # shows: container-test

# Exit and check host
exit
hostname   # still shows original hostname
```

---

## 2.3 Cgroups (2007) - Resource Limits

**Cgroups** limit what a process can USE (CPU, memory, I/O).

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CGROUPS                                        │
├───────────────┬─────────────────────────────────────────────────────────┤
│ Controller    │ What it limits                                          │
├───────────────┼─────────────────────────────────────────────────────────┤
│ cpu           │ CPU time (shares, quota)                                │
│ cpuset        │ Which CPUs/cores can be used                            │
│ memory        │ RAM usage (hard/soft limits)                            │
│ blkio         │ Disk I/O bandwidth                                      │
│ pids          │ Number of processes                                     │
│ devices       │ Access to devices                                       │
└───────────────┴─────────────────────────────────────────────────────────┘
```

```bash
# Cgroups v2 location
ls /sys/fs/cgroup/

# See Docker's cgroups
ls /sys/fs/cgroup/system.slice/docker-*.scope/

# See limits for a container
cat /sys/fs/cgroup/system.slice/docker-<id>.scope/memory.max
cat /sys/fs/cgroup/system.slice/docker-<id>.scope/cpu.max
```

**Container = Namespaces + Cgroups:**
```
┌────────────────────────────────────────────────────────┐
│                    CONTAINER                            │
│                                                        │
│   ┌──────────────────┐    ┌──────────────────┐        │
│   │   NAMESPACES     │    │     CGROUPS      │        │
│   │   (isolation)    │    │    (limits)      │        │
│   │                  │    │                  │        │
│   │ • Own PID 1      │    │ • Max 512MB RAM  │        │
│   │ • Own network    │    │ • Max 50% CPU    │        │
│   │ • Own mounts     │    │ • Max 100 PIDs   │        │
│   │ • Own hostname   │    │                  │        │
│   └──────────────────┘    └──────────────────┘        │
│                                                        │
│   + Layered filesystem (overlayfs)                    │
│   + Image (packaged root filesystem)                  │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

# LEVEL 3: Container Evolution

## 3.1 LXC (2008) - Linux Containers

**LXC** was the first to combine namespaces + cgroups into "containers".

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    CONTAINER EVOLUTION                                   │
│                                                                         │
│  1979        2002-2008        2008         2013         2015+          │
│    │             │              │            │             │            │
│    ▼             ▼              ▼            ▼             ▼            │
│ chroot    Namespaces+       LXC         Docker        OCI/runc         │
│           Cgroups added   (combines)   (usability)   (standard)        │
│                                                                         │
│  [fs only] [kernel adds  [first       [images,      [containerd,       │
│            isolation]     containers]  hub, easy]   podman, etc.]      │
└─────────────────────────────────────────────────────────────────────────┘
```

**LXC** = System containers (like lightweight VMs):
```bash
# LXC example
lxc-create -t ubuntu -n mycontainer
lxc-start -n mycontainer
lxc-attach -n mycontainer
# Full Ubuntu system running in container
```

**Docker** = Application containers (one process per container):
```bash
# Docker example
docker run nginx
# Just nginx, not full OS
```

**Key difference:**
```
LXC:    Full OS in container (systemd, sshd, many processes)
Docker: Single application (one main process, minimal footprint)
```

---

## 3.2 Docker (2013) - Made Containers Easy

**Docker added:**
1. **Images** - Packaged filesystem with layers
2. **Dockerfile** - Reproducible builds
3. **Registry** - Share images (Docker Hub)
4. **Simple CLI** - `docker run` just works

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      DOCKER ARCHITECTURE                                 │
│                                                                         │
│   ┌────────────┐                                                        │
│   │ Docker CLI │  docker run, build, push                               │
│   └─────┬──────┘                                                        │
│         │ REST API                                                      │
│         ▼                                                               │
│   ┌────────────┐                                                        │
│   │  dockerd   │  Docker daemon                                         │
│   └─────┬──────┘                                                        │
│         │                                                               │
│         ▼                                                               │
│   ┌────────────┐                                                        │
│   │ containerd │  Container runtime (manages lifecycle)                 │
│   └─────┬──────┘                                                        │
│         │                                                               │
│         ▼                                                               │
│   ┌────────────┐                                                        │
│   │    runc    │  OCI runtime (actually creates container)              │
│   │            │  → namespaces, cgroups, chroot                         │
│   └────────────┘                                                        │
└─────────────────────────────────────────────────────────────────────────┘
```

**Image layers (overlayfs):**
```
┌─────────────────────────────────────────┐
│ Container Layer (read-write)            │  ← Your changes
├─────────────────────────────────────────┤
│ App Layer: COPY app.js                  │  ← Image layers
├─────────────────────────────────────────┤     (read-only)
│ Node Layer: RUN npm install             │
├─────────────────────────────────────────┤
│ Base Layer: FROM node:18                │
└─────────────────────────────────────────┘
```

---

## 3.3 How Docker Creates a Container

```bash
# When you run: docker run -d nginx

# Docker does (simplified):
1. Pull image (layers) if needed
2. Create overlay filesystem from layers
3. Create namespaces:
   unshare --pid --net --mnt --uts --ipc
4. Create cgroup and set limits
5. Setup networking (veth pair to bridge)
6. chroot into overlay filesystem
7. exec nginx process
```

---

# LEVEL 4: Networking

## 4.1 Network Namespace Recap

Each container gets its own network namespace:
- Own interfaces
- Own IP addresses
- Own routing table
- Own iptables rules
- Own port space (port 80 in container A ≠ port 80 in container B)

---

## 4.2 The Layer 2 / Layer 3 Model

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   LAYER 3 (IP/Routing) - HOST KERNEL                                   │
│   ══════════════════════════════════                                   │
│   • Routes packets between different subnets                           │
│   • ip_forward=1 enables routing                                       │
│   • iptables handles NAT, firewall                                     │
│                                                                         │
│            eth0: 192.168.11.67 (physical)                              │
│                     │                                                   │
│            ┌────────┴────────┐                                         │
│            │   HOST KERNEL   │ (router between subnets)                │
│            └────────┬────────┘                                         │
│               │           │                                            │
│     172.17.0.1│           │172.18.0.1  (gateway IPs on bridges)       │
│               │           │                                            │
│   ┌───────────┴───┐   ┌───┴───────────┐                               │
│   │    docker0    │   │    br-mynet   │                               │
│   │   (bridge)    │   │   (bridge)    │                               │
│   └───────┬───────┘   └───────┬───────┘                               │
│           │                   │                                        │
│   LAYER 2 (Switching) - BRIDGES                                        │
│   ═════════════════════════════                                        │
│   • Forward frames by MAC address                                      │
│   • Connect containers on same subnet                                  │
│   • Like a virtual switch                                              │
│           │                   │                                        │
│     ┌─────┴─────┐       ┌─────┴─────┐                                 │
│     │  veth     │       │   veth    │                                 │
│     │Container A│       │Container B│                                 │
│     │172.17.0.2 │       │172.18.0.2 │                                 │
│     └───────────┘       └───────────┘                                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 4.3 iptables / Netfilter

**Netfilter** = kernel framework for packet processing
**iptables** = CLI tool to configure netfilter rules

```
                PACKET FLOW THROUGH NETFILTER
                ══════════════════════════════

                    Incoming packet
                          │
                          ▼
                   ┌──────────────┐
                   │  PREROUTING  │ ← DNAT happens here (port forwarding)
                   └──────┬───────┘
                          │
                ┌─────────┴─────────┐
                │  Routing Decision │
                └─────────┬─────────┘
                          │
           ┌──────────────┼──────────────┐
           ▼                             ▼
    ┌─────────────┐               ┌─────────────┐
    │   FORWARD   │               │    INPUT    │
    │(not for me) │               │  (for me)   │
    └──────┬──────┘               └──────┬──────┘
           │                             │
           │                             ▼
           │                      [Local Process]
           │                             │
           │                             ▼
           │                      ┌─────────────┐
           │                      │   OUTPUT    │
           │                      └──────┬──────┘
           │                             │
           └──────────────┬──────────────┘
                          ▼
                   ┌──────────────┐
                   │ POSTROUTING  │ ← SNAT/MASQUERADE here (outbound NAT)
                   └──────┬───────┘
                          │
                          ▼
                   Outgoing packet
```

**Docker uses iptables for:**
```bash
# 1. Port forwarding (-p 8080:80)
# PREROUTING: DNAT external:8080 → container:80
sudo iptables -t nat -L DOCKER -n

# 2. Outbound internet access
# POSTROUTING: MASQUERADE container IP → host IP
sudo iptables -t nat -L POSTROUTING -n

# 3. Container isolation
sudo iptables -L DOCKER-ISOLATION-STAGE-1 -n
```

---

# LEVEL 5: Kubernetes

## 5.1 K8s Networking Model

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    KUBERNETES NETWORKING                                 │
│                                                                         │
│  RULE 1: Every Pod gets its own IP                                     │
│  RULE 2: All Pods can reach all other Pods (no NAT)                    │
│  RULE 3: Nodes can reach all Pods (no NAT)                             │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                         CLUSTER                                  │   │
│  │                                                                  │   │
│  │    ┌─────────────────────┐    ┌─────────────────────┐          │   │
│  │    │       NODE 1        │    │       NODE 2        │          │   │
│  │    │                     │    │                     │          │   │
│  │    │  ┌──────┐ ┌──────┐ │    │  ┌──────┐ ┌──────┐ │          │   │
│  │    │  │Pod A │ │Pod B │ │    │  │Pod C │ │Pod D │ │          │   │
│  │    │  │.0.5  │ │.0.6  │ │    │  │.1.5  │ │.1.6  │ │          │   │
│  │    │  └──────┘ └──────┘ │    │  └──────┘ └──────┘ │          │   │
│  │    │        │           │    │        │           │          │   │
│  │    │    cni0 bridge     │    │    cni0 bridge     │          │   │
│  │    │   10.244.0.1/24    │    │   10.244.1.1/24    │          │   │
│  │    │        │           │    │        │           │          │   │
│  │    └────────┼───────────┘    └────────┼───────────┘          │   │
│  │             │                         │                       │   │
│  │             └─────── Overlay/Routes ──┘                       │   │
│  │                  (flannel, calico)                            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 5.2 Services & kube-proxy

**Problem:** Pod IPs are ephemeral (pods die, restart with new IPs)
**Solution:** Service = stable virtual IP that load balances to pods

```
                         ┌─────────────────────┐
         client ────────►│  Service ClusterIP  │
                         │    10.96.45.100     │
                         │     (virtual)       │
                         └──────────┬──────────┘
                                    │
                    kube-proxy iptables rules:
                    DNAT with probability-based
                    load balancing
                                    │
              ┌─────────────────────┼─────────────────────┐
              ▼                     ▼                     ▼
         ┌────────┐            ┌────────┐            ┌────────┐
         │ Pod A  │            │ Pod B  │            │ Pod C  │
         │10.244. │            │10.244. │            │10.244. │
         │ 0.5:80 │            │ 1.5:80 │            │ 0.6:80 │
         └────────┘            └────────┘            └────────┘
```

**kube-proxy creates iptables rules:**
```bash
# See service rules
sudo iptables -t nat -L KUBE-SERVICES -n

# Probability-based load balancing:
# -m statistic --mode random --probability 0.333 → Pod A
# -m statistic --mode random --probability 0.500 → Pod B
# (remaining) → Pod C
```

---

## 5.3 Service Types

```
┌─────────────┬───────────────────────────────────────────────────────────┐
│ Type        │ How it works                                              │
├─────────────┼───────────────────────────────────────────────────────────┤
│ ClusterIP   │ Virtual IP inside cluster only                           │
│ (default)   │ iptables DNAT to pod IPs                                 │
├─────────────┼───────────────────────────────────────────────────────────┤
│ NodePort    │ ClusterIP + opens port on ALL nodes (30000-32767)        │
│             │ External: <any-node-ip>:<nodeport>                       │
├─────────────┼───────────────────────────────────────────────────────────┤
│ LoadBalancer│ NodePort + cloud provider creates external LB            │
│             │ External: <load-balancer-ip>                             │
├─────────────┼───────────────────────────────────────────────────────────┤
│ ExternalName│ DNS CNAME to external service                            │
│             │ No proxying, just DNS                                    │
└─────────────┴───────────────────────────────────────────────────────────┘
```

---

## 5.4 Ingress

```
                         EXTERNAL
                            │
                            ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     INGRESS CONTROLLER                                  │
│                   (nginx, traefik, etc.)                               │
│                                                                        │
│  Rules:                                                                │
│  • api.example.com/users  →  user-service:80                          │
│  • api.example.com/orders →  order-service:80                         │
│  • www.example.com        →  frontend-service:80                      │
│                                                                        │
│  Layer 7 (HTTP): route by hostname, path, headers                     │
└────────────────────────────────┬───────────────────────────────────────┘
                                 │
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
               Service A    Service B    Service C
                    │            │            │
                   Pods         Pods         Pods
```

---

# Quick Reference

## What Each Thing Does

| Concept | Purpose | Layer |
|---------|---------|-------|
| Process | Running program | OS |
| Inode | File metadata | Filesystem |
| Pipe | Connect process stdout→stdin | IPC |
| FD | Process handle to files/sockets | OS |
| chroot | Isolate filesystem view | Isolation |
| Namespace | Isolate resources (PID, net, etc) | Isolation |
| Cgroup | Limit resources (CPU, mem) | Limits |
| LXC | System containers | Container |
| Docker | Application containers | Container |
| Bridge | Layer 2 switch (same subnet) | Network |
| veth | Virtual cable between namespaces | Network |
| iptables | Firewall, NAT, packet mangling | Network |
| kube-proxy | Service→Pod routing via iptables | K8s |
| CNI | Cross-node pod networking | K8s |

## The Container Formula

```
Container = Namespaces (isolation)
          + Cgroups (limits)
          + Layered filesystem (image)
          + Networking (veth + bridge + iptables)
```

## Commands Cheat Sheet

```bash
# Processes
ps aux | pstree -p | /proc/<pid>/

# Files & Inodes
ls -li | stat <file> | df -i

# Namespaces
ls -la /proc/$$/ns/
sudo unshare --net --pid --fork bash
sudo nsenter -t <pid> -n ip addr

# Cgroups
ls /sys/fs/cgroup/
cat /sys/fs/cgroup/.../memory.max

# Docker
docker inspect <c> --format '{{.NetworkSettings.IPAddress}}'
docker exec <c> ip addr

# iptables
sudo iptables -L -n -v
sudo iptables -t nat -L -n -v

# Kubernetes
kubectl get pods -o wide
kubectl get endpoints <svc>
sudo iptables -t nat -L KUBE-SERVICES -n
```
