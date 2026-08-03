# Nodeck · 技术拆解

## 0. 一句话本质
一个全屏的“反 PowerPoint”交互演示：真实部署运行时用 GSAP/Swiper/Howler 驱动 10 个目录入口与多个叙事阶段，`/404` 另含 Phaser WebGL 小游戏。

## A. 真实技术拆解
- `SOURCE` Vite 打包与动态 chunk：`site/assets/main-9-MUO4ea.js`。
- `SOURCE` 页面包含 10 个目录缩略图和多个内部活动阶段：`site/index.html` 与运行时 journey 证据。
- `SOURCE` 动画：`site/assets/gsap-DUAj52go.js`。
- `SOURCE` 幻灯片目录：`site/assets/swiper-hP8iLu9g.js`。
- `SOURCE` 音频：`site/assets/howler-EcGChfno.js`, `site/assets/sound-Cx2MfzRS.js`。
- `SOURCE` 3D/截图惰性模块：`site/assets/three-PDSP0dbZ.js`, `site/assets/html2canvas-DXEQVQnt.js`。
- `SOURCE` 404 游戏：`site/assets/phaser-D3izK-R_.js`, `site/assets/404-DcGRFIg2.js`。
- `SOURCE` 无业务 API、支付、账户或提交表单；它是虚构、非商业作品：`site/index.html:545-555`。

## B. 迁移结论
- 完整静态镜像可保留运行时所有权，无需重写状态机。
- 首屏抓取不足以覆盖运行时依赖；必须逐个目录入口与 404 游戏交互，才能发现 Three.js、html2canvas、Phaser 场景图与长音频资源。
- 确定性 screenshot hash 对 DOM/CSS 幻灯片非常有效；游戏动态帧需结合 Canvas 状态、网络零错误和低阈值像素 diff。

## C. 已知边界
- 未获取 sourcemap；作者工程目录、源模块命名与未压缩源码不可得。
- 自动化输入不是 iPhone Safari 的可信用户手势；真机声音、触感、惯性不在自动化批准范围内。
- 原创源代码与视觉内容没有公开再发布许可证。
