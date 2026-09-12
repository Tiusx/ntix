---
title: "Thinkphp5.1 复用Db类，导致sql where条件及Value值混淆的解决办法"
slug: "thinkphp51-复用db类导致sql-where条件及value值混淆的解决办法"
date: "2021-06-01"
category: "开发"
status: "Published"
tags: ["技术","ThinkPHP"]
summary: ""
---

### 概述
文章出处：[文章源地址](http://blog.tius.cn/archives/213)
用`Thinkphp5.1`开发项目时，`Model`层用了`tp`封装的`Db`类，因为不想每个方法都写`db::name("manage_tag");`,于是我在构造` __construct` 内赋值给了变量db；
在我执行更新时，我会先去调用`isRepeat()`判断内容是否重复，于是就出现了下面的问题，
### 问题
更新时，`where`条件多出`name="xxxx"`;

```php

    public $db;
    public function __construct()
    {
        $this->db = Db::name('manage_tag');
    }
    public function editTag(int $id,String $name)
	{
		$result =  $this->db->where('id', $id)->fetChSql()->update(['name' => $name]);
		
		var_dump($result);
		 return $result ? true : false;
	}
	
	public function isRepeat(String $name)
	{
		$result = $this->db->where('name',$name)->find();
        
        return $result ? true : false;
	}

```
使用`fetChSql()`方法查看打印`sql`
```php
UPDATE `yh_manage_tag`  `name` = '标签11321' , `update_time` = 1621046891  WHERE  `name` = '标签11321'  AND `id` = 1
```
### 解决
查阅`Thinkphp5.1`的文档，
**查询对象在查询之后仍然会保留链式操作的值，除非你调用`removeOption`方法清空链式操作的值。**
在调用单独的查询方法时，使用`removeOption()`;清除之前操作保留的值
```php
    public function isRepeat(String $name)
    {
        $result = $this->db->where('name',$name)->find();
        $this->db->removeOption(true);
		
        return $result ? true : false;
    }
```
再次打印更新`sql`出来
```php
UPDATE `yh_manage_tag`  SET `name` = '标签11321' , `update_time` = 1621047382  WHERE  `id` = 1
```

