---
title: "PHP SPL数据结构SplFixedArray与Array对比"
slug: "php-spl数据结构splfixedarray与array对比"
date: "2021-06-25"
category: "开发"
status: "Published"
tags: ["技术"]
summary: ""
---

> SplFixedArray 

官方介绍 https://www.php.net/manual/zh/class.splfixedarray.php

`SplFixedArray`提供索引数组的功能，它与普通数组的区别就是具有固定长度，且只能存放索引数组， 使用前必须先定义长度
好处就是在处理大数据的数组量， 速度更快， 占用内存更小，更接近c数组，但是因为还要存储php中的一些结构及gc回收等，内存利用远远不如c语言




> ##### 使用示例：

```PHP
// 普通数组
$s = memory_get_usage(); $st = microtime(true);
$array = [];
for ($i = 0; $i < 2000000; $i++) {
	$array[] = $i;
}
$e = memory_get_usage(); $et = microtime(true);
echo sprintf('普通数组， 存储200万条数据占用%fMB内存, 耗时%f<br/>', ($e-$s) / 1024 / 1024, $et - $st);

// SplFixedArray
$s = memory_get_usage(); $st = microtime(true);

$fixedArray = new \SplFixedArray(2000000);
for ($i = 0; $i < 2000000; $i++) {
	$fixedArray[$i] = $i;
}

$e = memory_get_usage(); $et = microtime(true);
echo sprintf('SplFixedArray， 存储200万条数据占用%fMB内存, 耗时%f<br/>', ($e-$s) / 1024 / 1024, $et - $st);
echo "<hr/>";

// 读取
$st = microtime(true);
foreach ($array as $v) {

}
$et = microtime(true);
echo sprintf('普通数组， 遍历200万条数据耗时%f<br/>', ($et-$st));

$st = microtime(true);
foreach ($fixedArray as $v) {

}

$et = microtime(true);
echo sprintf('SplFixedArray， 遍历200万条数据耗时%f<br/>',($et-$st));

```

> ##### 输出结果

```text
普通数组， 存储200万条数据占用66.000076MB内存, 耗时0.054365
SplFixedArray， 存储200万条数据占用32.000130MB内存, 耗时0.039488

普通数组， 遍历200万条数据耗时0.020308
SplFixedArray， 遍历200万条数据耗时0.031104

```

FixedArray写入时内存占用比普通数据小了一大半，数据越大越明显。
FixedArray写入速度相对于普通数组也快一些，但读取略比普通数组慢些


