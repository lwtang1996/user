#!/bin/bash
ROOT=$HOME/minikube
export MINIKUBE_WANTUPDATENOTIFICATION=false
export MINIKUBE_WANTREPORTERRORPROMPT=false
export MINIKUBE_HOME=$HOME
export CHANGE_MINIKUBE_NONE_USER=true
mkdir -p $HOME/.kube
touch $HOME/.kube/config
export KUBECONFIG=$HOME/.kube/config

option=$1
case $option in
	start):
		sudo -E minikube start --vm-driver=none --registry-mirror=https://registry.docker-cn.com
		# this for loop waits until kubectl can access the api server that Minikube has created
		for i in { 1..150 }; do
			# timeout for 5 minutes
			kubectl get po &> /dev/null
			if [ $? -ne 1 ]; then
				break
			fi
			sleep 2
		done
	;;
	stop):
		sudo -E minikube stop
	;;
	reset):
		sudo -E kubeadm reset
		sudo -E minikube delete
	;;
	dashboard):
		sudo -E minikube dashboard
	;;
	status):
		sudo -E minikube status
	;;
	*):
		echo "$option is not supported"
esac
