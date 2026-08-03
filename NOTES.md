# Nodeck · 克隆笔记

## 源信息
- 原站 URL: https://www.nodeck.online/
- 源码仓库: 未找到公开仓库；本项目使用公开部署产物镜像
- 原作者: Bogdan Kolomiyets
- 许可证: 原创视觉、文案、动画与源码均为作者所有；未发现允许再发布/商业使用的开源许可证
- 用途边界: 仅作为受控的技术研究与视觉基线。公开上线、商业使用、替换成自身品牌前必须得到权利人授权并处理第三方素材许可。

## 技术栈
- Vite 静态部署
- GSAP、Swiper、Howler、Three.js 动态 chunk
- `/404` 使用 Phaser WebGL 游戏运行时
- 本地字体、WebP/AVIF/PNG/SVG、OGG/MP3 资产

## 复刻前预判
- 复杂度等级: L4（首页）+ L5（404 Phaser 游戏）
- 推荐模式: 忠实复刻
- 可高保真部分: 10 个导航缩略图对应的完整交互旅程、字体、素材、音频、菜单、演讲者备注、项目弹层、404 游戏
- 需要近似或替代的部分: 无；当前保留原部署运行时
- 不克隆的部分: 没有后台、交易、账户、表单或生产 API
- 主要风险: 原创内容无再发布许可；自动化无法代替真实 iPhone Safari 的声音与触控审批

## 跑起来
```bash
cd /root/.hermes/profiles/frontend/workspace/nodeck-clone/site
python3 -m http.server 44118 --bind 0.0.0.0
```
当前预览: http://45.8.22.65:44118/
404 游戏: http://45.8.22.65:44118/404/

## 改了什么
- 仅镜像公开部署字节，并补齐惰性加载/交互触发资源。
- 没有重写原页面、动效、交互或文案。
- 没有新增任何生产写操作。
- Vercel Insights 脚本是镜像字节的一部分；它会在 webdriver/headless 环境自停。若用于独立生产部署，应移除或替换为自有统计。

## 原站 vs 克隆站
| 模块 | 原站表现 | 克隆实现 | 差异 / 取舍 | 证据 |
|---|---|---|---|---|
| 首屏 | 粉色封面、文具素材、NODECK 3D 字标 | 原部署 HTML/CSS/JS/资产 | 0 像素差（确定性基线） | `RECON/deterministic/home-0.json` |
| 导航 | Prev / 菜单 / Next / Notes / Sound | 原运行时 | 状态与截图哈希一致 | `RECON/thumb-journey/summary.json` |
| 10 个入口 | 目录有 10 个缩略图 | 全部可达 | 全部状态与截图哈希一致 | `RECON/thumb-journey/summary.json` |
| 移动端 | 390×844 专用响应式布局 | 原 CSS/JS | 初始态 52 像素变化，评分 5/5；相邻态 0 差异 | `RECON/mobile/diff/` |
| 404 | 404 标题页 + Phaser 游戏 | 原 Phaser 运行时和素材 | 标题 0 差异；游戏状态一致，像素阈值差异 0 | `RECON/deterministic/404-title.json`, `RECON/404-game-deterministic/diff.json` |

## 复刻评分
- 源证据: 5/5（完整公开部署产物；非未压缩作者工程源码）
- 结构保真: 5/5
- 视觉保真: 5/5
- 动效/交互: 5/5（自动化范围）
- 响应式: 5/5（1440×900、390×844）
- 功能完整: 5/5（首页 10 个入口、菜单、备注、声音切换、404 游戏）
- 内容替换: 0/5（未要求换品牌/文案）
- 法务/部署风险: 1/5（没有再发布授权）
- 总评: 技术上是部署运行时级忠实镜像；公开或商业使用前必须授权。

## 替换地图
- 页面文案/结构: `site/index.html`
- 主样式: `site/assets/main-CGAIvE7P.css`
- 首页主运行时: `site/assets/main-9-MUO4ea.js`
- 音频系统: `site/assets/sound-Cx2MfzRS.js`
- 404: `site/404/index.html`, `site/assets/404-C0-ewVAb.css`, `site/assets/404-DcGRFIg2.js`
- 图片/字体/声音: `site/assets/`

## 验证
- [x] 本地与公网 URL 跑通
- [x] 首页与 404 路由地图一致
- [x] 桌面 1440×900 初始态与相邻态像素对比
- [x] 手机 390×844 初始态与相邻态像素对比
- [x] 10 个目录入口逐个原站/克隆站截图哈希一致
- [x] 404 标题页 0 像素差
- [x] 404 Phaser 进入游戏，Canvas 1280×720、状态一致、无网络/console 错误
- [ ] 真实 iPhone Safari 的触控手感、用户激活与声音需人工审批

## Mobile swipe-progress enhancement
- Branch: `feat/mobile-swipe-progress`
- Mobile vertical swipe now reuses the desktop scroll-progress presentation: live ring progress → `LET'S GO!` success → existing slider navigation.
- Ownership: the adapter does not mutate slide state directly; it invokes the source-owned Prev/Next buttons only after completion.
- Gesture arbitration: vertical intent is axis-locked; horizontal gestures, modal/nav-overlay touches, buttons/links/inputs and known nested swipers are excluded.
- Recovery: partial swipe rolls back without navigation; reverse swipe maps to the previous slide; visibility/app interruption resets the adapter.
- Automated evidence: `RECON/mobile-swipe-progress/report.json`; desktop/source regressions remain 0-pixel in deterministic captures.
- Follow-up calibration: commit distance is two times the original target, capped at `264px` and derived down to `32%` of the current visible viewport height for short browser chrome; `LET'S GO!` hold `420ms ...[truncated]
- Physical iPhone Safari/WKWebView touch feel, audible output and haptic outcome still require human approval; automation does not approve trusted-device interaction.
- Safari audio recovery: the touch adapter now synchronously asks the source-owned sound manager to unlock on the first trusted completed touch; the owner explicitly resumes Howler's context, unmutes, starts background, refreshes UI state, and publishes running/failed diagnostics instead of relying on a synthetic `.click()`.
- iOS 16.3 codec recovery: all 22 external one-shot `.ogg` tracks (mostly Vorbis, four Opus) are transcoded to AAC-in-M4A under `assets/safari-audio/`, and the source sound bundle now references those files; this addresses the confirmed codec gap in Safari 16.3 while preserving the original MP3 background tracks.
