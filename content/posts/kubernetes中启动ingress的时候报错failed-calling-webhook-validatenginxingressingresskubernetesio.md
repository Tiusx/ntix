---
title: "Kubernetes中启动ingress的时候报错：failed calling webhook \"validate.nginxingress.ingress.kubernetes.io"
slug: "kubernetes中启动ingress的时候报错failed-calling-webhook-validatenginxingressingresskubernetesio"
date: "2023-09-21"
category: "开发"
status: "Published"
tags: ["技术","Kubernetes","K8s","Ingress","Webhook"]
summary: "Kubernetes中启动ingress的时候报错"
---

#### 问题：
Kubernetes中启动ingress的时候报错了，提示：

```shell
Error from server (InternalError): error when creating "ingress.yaml": Internal error occurred: failed calling webhook "validate.nginxingress.ingress.kubernetes.io": failed to call webhook: Post "https://ingress-nginx-controller-admission-nginxingress.ingress-nginx.svc:443/networking/v1/ingresses?timeout=10s": dial tcp 10.233.172.178:443: connect: connection refused
```
#### 解决：

- 查看kubernetes的webhook信息
```shell
kubectl get ValidatingWebhookConfiguration
```
- 然后使用如下的命令删除信息即可：
```shell
kubectl delete -A ValidatingWebhookConfiguration ingress-nginx-admission-web
```

然后再重新启动ingress即可。
