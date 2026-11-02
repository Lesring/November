# November · 十一月

面向中国手作创作者的甄选市集演示原型。用来给手作商家和合作方看界面，不是正式上线的产品。

主流平台上，仿货和铺货会把真手作的价格打下去。这个原型把四件事放在能点开的界面里：材料认证、手作认证、原创登记，以及创作者故事和会员意向。没有后端、没有支付、没有登录。购物袋和收藏只存在本机。

界面按 [Airbnb 设计分析](docs/DESIGN.md) 来做：白底、照片优先、大圆角、少量暖色（`#ff385c`）、轻阴影、留白。文案是简体中文。品类以陶瓷为主，同时有木作、编织和银饰，保持少而精，而不是货架式铺货。

## 目录

```
shared/catalog.json     唯一的商品、创作者、会员数据
shared/images/          图片原件
docs/DESIGN.md          Airbnb 设计代币（已收录进仓库）
web/                    手机优先的网页（Vite + React）
miniprogram/            微信小程序原生工程
scripts/sync-catalog.js 把数据和图片同步到两端
```

改文案或商品时，只改 `shared/catalog.json`，然后运行：

```bash
node scripts/sync-catalog.js
```

网页直接读取 `shared/catalog.json`。小程序读的是同步出来的 `miniprogram/data/catalog.js`（小程序不能引用工程外面的文件）。两端的数据结构相同。

## 运行网页

需要 Node.js 18 或更新版本。

```bash
cd web
npm install
npm run dev
```

浏览器打开终端里打印的本地地址（默认 `http://localhost:5173`）。手机宽度下有底部导航：首页、发现、会员、我的。宽屏会变成顶部导航，内容居中。

生产构建：

```bash
cd web
npm run build
```

构建结果在 `web/dist`。可以用 `npm run preview` 本地预览。

在仓库根目录也可以：

```bash
npm run dev
npm run build
```

## 用微信开发者工具打开小程序

1. 安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)。
2. 选择「导入项目」，目录选本仓库的 `miniprogram`（里面有 `project.config.json`）。
3. AppID 使用测试号 `touristappid`（配置里已经写好）。没有正式小程序账号也能预览。
4. 基础库建议 3.5 或更高。`project.config.json` 里 `urlCheck` 已关闭。若图片仍空白，在「详情 → 本地设置」勾选「不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书」。
5. 图片已经放在小程序包内的 `images/`，不依赖外网。

导入后应能直接编译。底部是自定义 tab：首页、发现、会员、我的。

不安装开发者工具时，可以先做静态检查：

```bash
node scripts/check-miniprogram.js
```

它会检查页面是否齐全、JSON 是否能解析、JS 语法，以及图片路径是否存在。它不能代替开发者工具里的真机预览。

## 页面

| 页面 | 网页路径 | 小程序 |
| --- | --- | --- |
| 首页 | `/` | `pages/home` |
| 发现（搜索、品类、认证、排序） | `/explore` | `pages/explore` |
| 商品详情 | `/product/:id` | `pages/product` |
| 创作者 | `/creator/:id` | `pages/creator` |
| 会员 | `/membership` | `pages/membership` |
| 我的 | `/me` | `pages/me` |

商品卡片和详情页有「材料认证」「手作认证」「原创登记」。详情里写了各自核对的是什么。手作商品标注「不支持无理由退货」，并有一行「原创作品受保护」。没有防截屏、防复制的功能入口。

「加入购物袋」「咨询创作者」「了解会员」会给出演示反馈，不会下单、不会发消息、不会扣款。

## 图片

器物照片是本地占位图，方便离线演示，不代表真实在售作品，也不要当成创作者本人的肖像。来源包括 Unsplash、Pexels，以及 Wikimedia Commons 上的苗族银饰公共领域照片（如 `Bijou Miao`、`Collier Miao 01`）。换图时替换 `shared/images/` 里的同名文件，再运行同步脚本。

## 接下来可以接什么

数据形状集中在 `shared/catalog.json`：`products`、`creators`、`certifications`、`collections`、`membership`。下一步如果要接真实后端，让两端改成请求同一份接口即可，页面不用重写。
