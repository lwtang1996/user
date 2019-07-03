## 环境

master node： 数量 1， 系统 ubuntu 16.04_x64 
worker node: 数量 1, 系统 ubuntu 16.04_x64

## 部署kubernetes(master node)

&emsp;&emsp; 以下操作在master node 上执行

1. 关闭selinux、开启ipv6

        sudo bash selinux_ipv6.sh

2. 下载k8s.io镜像

3. 下载kubeadm、kubelete和kubectl，解压缩复制到/usr/local/bin目录下，下载地址为： ftp://172.168.170.145/Hyperledger/Cello/Develop/kubeadm .

4. 安装kubelte 服务

5. 初始化 kubernetes 服务 

        KUBE_REPO_PREFIX="registry.domain.com" kubeadm init --kubernetes-version=v1.10.7 --pod-network-cidr=10.244.0.0/16 --apiserver-advertise-address=0.0.0.0 --ignore-preflight-errors='Swap'

    显示结果如下：

        Your Kubernetes master has initialized successfully!
        To start using your cluster, you need to run the following as a regular user:

        mkdir -p $HOME/.kube
        sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
        sudo chown $(id -u):$(id -g) $HOME/.kube/config

        You should now deploy a pod network to the cluster.
        Run "kubectl apply -f [podnetwork].yaml" with one of the options listed at:
        https://kubernetes.io/docs/concepts/cluster-administration/addons/

        You can now join any number of machines by running the following on each node
        as root:

        kubeadm join 192.168.1.185:6443 --token ow8gkw.yltjigl52r7q3jlq --discovery-token-ca-cert-hash sha256:aa2e50c49a35bcf65edfcf6081159adbf27d7d5a09707d584636a9ab4e1e7b3c

    按照上面显示的指示，copy kube-config：

        mkdir -p $HOME/.kube
        sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
        sudo chown $(id -u):$(id -g) $HOME/.kube/config

    查看当前节点状态：

        kubectl get nodes

    显示结果如下：

        NAME                             STATUS    ROLES     AGE       VERSION
        whty0-to-be-filled-by-o-e-m      NotReady     master    2h        v1.10.7

    之所以没有处于Ready状态，是因为我们还没有配置 可以使得kubernetes节点之间互相通信的[网络插件](https://kubernetes.io/docs/concepts/cluster-administration/addons/).

## 添加worker节点(worker node)

&emsp;&emsp; 通过kueadm上面显示的token就可以，引导其他节点加入到k8s集群。

1. 关闭selinux、开启ipv6

        sudo bash selinex_ipv6.sh

2. 下载k8s.io镜像

3. 安装kubelte 服务

4. 引导worker node 加入集群：

        sudo kubeadm join 192.168.1.185:6443 --token ow8gkw.yltjigl52r7q3jlq --discovery-token-ca-cert-hash sha256:aa2e50c49a35bcf65edfcf6081159adbf27d7d5a09707d584636a9ab4e1e7b3c --ignore-preflight-errors='swap' --ignore-preflight-errors='cri'

    这里所传入的token就是在master节点上初始化时最后显示的token，需要注意的是token是具有有效期的，在有效期过后需要重新发放token。
    显示结果如下：

        [preflight] Running pre-flight checks.
        [WARNING SystemVerification]: docker version is greater than the most recently validated version. Docker version: 18.06.1-ce. Max validated version: 17.03
        [WARNING CRI]: unable to check if the container runtime at "/var/run/dockershim.sock" is running: exit status 1
        [WARNING Swap]: running with swap on is not supported. Please disable swap
        [discovery] Trying to connect to API Server "192.168.1.185:6443"
        [discovery] Created cluster-info discovery client, requesting info from "https://192.168.1.185:6443"
        [discovery] Requesting info from "https://192.168.1.185:6443" again to validate TLS against the pinned public key
        [discovery] Cluster info signature and contents are valid and TLS certificate validates against pinned roots, will use API Server "192.168.1.185:6443"
        [discovery] Successfully established connection with API Server "192.168.1.185:6443"

## 安装跨主机网络插件

&emsp;&emsp; 想要在集群中部署的容器可以跨节点互相通信则需要安装[网络插件](https://kubernetes.io/docs/concepts/cluster-administration/addons/)，我们这里通过安装网络插件容器的方式来部署， 所使用的是cni网络插件：

        kubectl apply -f ./rbac-kdd.yaml
        kubectl apply -f ./calico.yaml

&emsp;&emsp; 这里需要提醒大家的是，我们在calico.yaml中有如下配置：

        # Auto-detect the BGP IP address.
        # value: "autodetect"
        - name: IP
            value: "autodetect"
        - name: IP_AUTODETECTION_METHOD
            value: interface=enp1s.*,wlx.*
        - name: FELIX_HEALTHENABLED
            value: "true"

&emsp;&emsp; *IP：autodetect* 指定了cni插件自动去识别主机的地址，_IP_AUTODETECTION_METHOD：interface=enp1s.\*,wlx.\*_ 则指定了主机的物理网卡名称(enp1s是有线网卡的前缀、wlx是无线网卡前缀)，支持通配符的方式来匹配，所以我们在安装的时候需要注意本地物理网卡的名称自己进行适当的修改。
&emsp;&emsp; 部署成功后我们可以查看当前在线节点：

    NAME                             STATUS    ROLES     AGE       VERSION
    whty0-to-be-filled-by-o-e-m      Ready     master    2h        v1.10.7
    whtyhust-to-be-filled-by-o-e-m   Ready     <none>    1h        v1.10.7

## 允许在master node 上创建资源(Optional)

&emsp;&emsp;在master node 上执行

        kubectl taint nodes --all node-role.kubernetes.io/master-

&emsp;&emsp;显示结果如下：

        taint "node-role.kubernetes.io/master:" not found
        taint "node-role.kubernetes.io/master:" not found
&emsp;&emsp; 执行以上命令后，在部署 k8s资源时 master node会像 worker node一样被对待，否则默认不会在master节点上部署 k8s 资源