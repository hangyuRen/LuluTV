<div align="center">
  <img src="public/lulu-logo.png" width="88" height="88" alt="水豚噜噜">
  <h1>LuluTV</h1>
  <p><strong>山水之间，自有好戏。</strong></p>
  <p>可自托管的影视发现与多源播放器</p>
  <p><a href="#快速开始">快速开始</a> · <a href="#docker-部署">Docker 部署</a> · <a href="#使用与配置">使用与配置</a> · <a href="#开发">开发</a></p>
</div>

![LuluTV 山水主题](public/lulu-landscape.webp)

LuluTV 把影视榜单、视频源搜索和播放放在同一个界面里。可浏览豆瓣、TMDB 和红果短剧榜单，添加 MacCMS JSON 视频源，或直接打开视频链接。

## 功能

- **影视发现** · 按分类浏览榜单，查看影片简介、海报和演职员。
- **多源搜索与浏览** · 并发搜索已启用的视频源，按分类浏览片库。添加新源时会检测接口和播放地址格式。
- **播放与续播** · 支持 HLS/M3U8、直链播放、选集、播放线路切换、片头片尾跳过、收藏和观看进度。
- **弹弹play 弹幕** · 在播放器控制栏开启，按片名和集数自动匹配，通过 ArtPlayer 渲染。

## 快速开始

需要 Node.js 20.9 或更高版本，以及 npm。

```bash
git clone https://github.com/hangyuRen/LuluTV.git
cd LuluTV
npm ci
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。基本功能可直接使用。TMDB 榜单和弹幕可按需在设置页配置。

## 桌面客户端

支持 Apple 芯片 Mac、Intel 芯片 Mac 和 64 位 Windows。安装后在独立窗口运行，无需部署网站。收藏、进度和设置保存在本机。

[下载桌面客户端](https://github.com/hangyuRen/LuluTV/releases)

## Docker 部署

在项目根目录构建并启动：

```bash
docker build -t lulutv .
docker run -d --name lulutv --restart unless-stopped -p 3000:3000 lulutv
```

浏览器访问 `http://服务器地址:3000`。也可以在 GitHub Actions 中手动运行 **Build & Push Docker image**，将镜像发布到当前仓库对应的 GitHub Container Registry。

## 使用与配置

| 功能 | 操作 |
| --- | --- |
| 视频源 | 在「设置 → 视频源管理」添加公网可访问的 MacCMS JSON 接口。可以管理启停和优先级，也可以导入或导出 JSON 配置。「恢复默认」会用内置源替换当前列表。 |
| 直链播放 | 在「直链播放」输入 M3U8、MP4 等浏览器支持的视频链接。填写片名可以用于自动匹配弹幕。 |
| TMDB 榜单 | 申请 [TMDB API Key](https://www.themoviedb.org/settings/api)，在「设置 → TMDB 设置」填写。部署者可用 `TMDB_API_KEY` 或 `TMDB_READ_ACCESS_TOKEN` 提供默认凭据，浏览器配置优先。 |
| 弹弹play 弹幕 | 在 [弹弹play开发者中心](https://dev.dandanplay.com/) 申请 App ID 和 App Secret，在「设置 → 弹弹play 设置」保存，再通过播放器控制栏开启。默认关闭。 |

视频源设置、凭据、收藏和观看记录保存在当前浏览器。视频源的 JSON 导出只包含视频源配置。

LuluTV 服务端负责查询榜单、搜索和详情，并转发豆瓣图片。浏览器使用片源提供的地址直接请求视频流。片源的可用性取决于上游服务。请使用有权访问和分发的内容。

## 开发

技术栈为 Next.js App Router、React、Tailwind CSS、Zustand、ArtPlayer 和 HLS.js。

```text
src/
├── app/          页面、布局和 API 路由
├── components/   界面组件
├── hooks/        播放、搜索和浏览逻辑
├── lib/          接口、媒体匹配和播放器工具
├── stores/       Zustand 状态与浏览器持久化
└── styles/       全局样式和字体声明
public/           品牌素材和本地字体
tests/            Node.js 测试
```

```bash
npm run lint
node --test tests/*.test.mjs
npm run build
```

## 致谢与许可证

LuluTV 基于 [NextTV](https://github.com/SeqCrafter/NextTV) 演进。感谢 [ArtPlayer](https://artplayer.org/)、[HLS.js](https://github.com/video-dev/hls.js) 和 [弹弹play开放弹幕网络](https://www.dandanplay.com/)。

项目使用 [MIT 许可证](LICENSE)。本地字体的来源与许可证见 [字体说明](public/fonts/README.md)。

This product uses the TMDB API but is not endorsed or certified by TMDB.
