---
title: "rclone工具迁移MinIO至华为云OBS"
slug: "rclone工具迁移minio至华为云obs"
date: "2023-07-14"
category: "开发"
status: "Published"
tags: ["技术","Minio","Obs"]
summary: "迁移MinIO至华为云OBS"
---

#### 下载rclone工具
```shell
[root@ceshi-minio ~]# wget https://downloads.rclone.org/v1.62.2/rclone-v1.62.2-linux-amd64.zip
--2023-07-14 15:01:15--  https://downloads.rclone.org/v1.62.2/rclone-v1.62.2-linux-amd64.zip
Resolving downloads.rclone.org (downloads.rclone.org)... 95.217.6.16, 2a01:4f9:c012:7154::1
Connecting to downloads.rclone.org (downloads.rclone.org)|95.217.6.16|:443... connected.
HTTP request sent, awaiting response... 200 OK
Length: 17778094 (17M) [application/zip]
Saving to: ‘rclone-v1.62.2-linux-amd64.zip’

100%[===================================================================================================>] 17,778,094  1.62MB/s   in 11s    

2023-07-14 15:01:28 (1.55 MB/s) - ‘rclone-v1.62.2-linux-amd64.zip’ saved [17778094/17778094]
[root@ceshi-minio ~]# ls
rclone-v1.62.2-linux-amd64.zip
[root@ceshi-minio ~]# unzip rclone-v1.62.2-linux-amd64.zip 
Archive:  rclone-v1.62.2-linux-amd64.zip
   creating: rclone-v1.62.2-linux-amd64/
  inflating: rclone-v1.62.2-linux-amd64/rclone.1  
  inflating: rclone-v1.62.2-linux-amd64/README.txt  
  inflating: rclone-v1.62.2-linux-amd64/README.html  
  inflating: rclone-v1.62.2-linux-amd64/git-log.txt  
  inflating: rclone-v1.62.2-linux-amd64/rclone  
[root@ceshi-minio ~]# cd rclone-v1.62.2-linux-amd64
[root@ceshi-minio rclone-v1.62.2-linux-amd64]# ls
git-log.txt  rclone  rclone.1  README.html  README.txt
[root@ceshi-minio rclone-v1.62.2-linux-amd64]# mv rclone /usr/bin/
```
#### 配置rclone配置文件
![image.png](https://rimg.tius.cn/images/6f3bfe4368fc74eeaf8669dbcd6e3ca462eb8d88.png#blurhash=L13bgq_3%25Mt7RjR%25j%5Bj%5Bj%5BkBkBa%7C&width=708&height=441)

默认`rclone`配置文件路径 `~/.config/rclone/rclone.conf` 可以通过 `rclone config file`获取
###### MinIO配置样例
```markdown
[minio]
type = s3
provider = Minio
env_auth = false
access_key_id = your-access-key-id
secret_access_key = your-secret-access-key
region = src-region-id
endpoint = src-endpoint
location_constraint =
server_side_encryption =
```
###### OBS配置样例
```markdown
[obs]
type = s3
provider = HuaweiOBS
access_key_id = your-access-key-id
secret_access_key = your-secret-access-key
region = dst-region-id
endpoint = dst-endpoint
acl = private
```
#### 上传测试文件进行迁移
![image.png](https://rimg.tius.cn/images/e76f4d6b57e278899f69b6844bb93f295b0761bc.png#blurhash=LnQcn%7D0K009Ft7fRWBayWBj%5Bj%5Bj%5B&width=790&height=441)

#### 执行rclone命令进行复制迁移
```shell
[root@ceshi-minio rclone]# rclone copy -P minio:ceshi obs:ceshi-myj
Transferred:            2.553 MiB / 2.553 MiB, 100%, 0 B/s, ETA -
Transferred:                1 / 1, 100%
Elapsed time:             0.6s
```
```
执行命令rclone copy -P minio:src_bucket/ obs:dst_bucket 将源数据拷贝到目标桶中复制数据
```
#### 验证是否复制迁移成功
![image.png](https://rimg.tius.cn/images/57ad8556ca10fbcce8b24b967b8ec6cac383b2d3.png#blurhash=L7Ss51%3FbWA%7Eq%3FwV%40oyoLRixabFV%5B&width=834&height=407)

