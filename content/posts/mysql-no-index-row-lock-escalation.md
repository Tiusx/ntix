---
title: "MySQL无索引条件更新导致行锁升级为表锁"
slug: "mysql-no-index-row-lock-escalation"
date: "2021-08-07"
category: "开发"
tags: ["MySQL", "InnoDB", "表锁"]
summary: "InnoDB更新语句WHERE条件缺少索引，执行全表扫描，锁全部扫描行，等效表锁，引发高并发数据库雪崩。"
status: "Published"
page_id: "3dd16576-aec8-81e4-88e7-ca14f98da023"
last_edited_time: "2026-09-16T17:51:00.000Z"
---


## 适用环境

- MySQL InnoDB存储引擎
- UPDATE / DELETE 的 WHERE 查询条件字段没有建立索引

## 问题现象


后台管理系统执行批量状态更新：


```sql
UPDATE orders SET status = 1 WHERE status = 0;
```


`orders` 表共2000万行，`status` 字段无索引。高并发执行时数据库连接快速打满，大量SQL报 `Lock wait timeout` 超时。


## 排查过程

1. `EXPLAIN` 查看执行计划，type为 `ALL`，触发全表扫描。
2. `show engine innodb status` TRANSACTIONS片段，`lock struct(s)` 数量和表行数接近。
3. 确认：本应是行锁，实际变成近似整张表被锁住。

## 根本原因


InnoDB行锁依靠索引实现。
如果WHERE条件无法命中索引，数据库只能扫描全表；扫描过程中会对每一行记录加行锁。虽然逻辑是行锁，但扫描全部数据，效果等价于**表锁**。


## 解决方案


### 立即止损


业务低峰期给条件字段创建索引：


```sql
ALTER TABLE orders ADD INDEX idx_status (status);
```


### 分批更新，避免长事务


就算有索引，一次性更新千万级数据依然会产生长事务。使用分页循环分批处理，缩小锁持有时间。


## 生产检查规则

1. 所有生产环境UPDATE/DELETE，上线前必须执行EXPLAIN校验，确保`key`不为NULL。
2. 监控 `information_schema.innodb_trx` 的 `trx_rows_locked`，数值异常飙升立刻终止事务。
