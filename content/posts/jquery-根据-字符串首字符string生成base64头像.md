---
title: "Jquery 根据 字符串首字符（string）生成Base64头像"
slug: "jquery-根据-字符串首字符string生成base64头像"
date: "2021-04-03"
category: "开发"
status: "Published"
tags: ["Jquery","Js","canvas","string"]
summary: ""
---


> #### 项目引用记录
```javascript
function getImage(name){
	
    if($.trim(name) == ''){
      name = '默认'
    }
    name = name.toUpperCase();
  //设置初始值,防止name为空时程序无法执行
  var nick = "未知";
  //判断name是否为空
    if(name){
      nick = name.charAt(0);
    }else{
      name = '默认';
    }
    var fontSize = 14;
    var fontWeight = 'normal';
    var canvas = document.getElementById('canvas');
    if(canvas){
      canvas.remove();
    }else{
      var html = "<canvas id='canvas' style='display:none'></canvas>";
      $("body").append(html);
      canvas = document.getElementById('canvas');
    }
     var context = canvas.getContext('2d');
      //头像背景颜色设置
      context.fillStyle = '#2D89EF';
      context.fillRect(0, 0, canvas.width, canvas.height);
   	  canvas.width = 28;
      canvas.height = 28;
  //头像字体颜色设置
  	  context.textAlign = 'center';
      context.fillStyle = '#FFFFFF';
      context.textBaseline="middle";
      context.font = fontWeight + ' ' + fontSize + 'px sans-serif';
      context.fillText(nick, fontSize, fontSize);
      return canvas.toDataURL("image/png");
}

```

需要引用头像的地方直接引用

```javascript
getImage("小石头")
```
