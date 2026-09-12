export interface Friend {
  name: string;
  url: string;
  description?: string;
  avatar?: string;
}

export const FRIENDS: Friend[] = [
  {
    name: "封尘",
    url: "https://lovefc.cn/",
    description: "封尘，lovefc，fc，个人主页",
    avatar: "https://lovefc.cn/favicon.ico"
  },
  {
    name: "熊孝兵",
    url: "https://xxb.im/",
    description: "不妄自菲薄，不矫枉过正，不随波逐流，不固步自封。",
    avatar: "https://gravatar.loli.net/avatar/7a585313ed855e8d652cbb3154a6056e?s=300&d=mm&r=g"
  },
  {
    name: "贼歪",
    url: "https://varzy.me",
    description: "Developer. Blogger. INFJ.",
    avatar: "https://cdn.varzy.me/static/zyavatar.png"
  },
];