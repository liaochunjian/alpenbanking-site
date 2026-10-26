# Aplen Baruch 官网（静态站点）

基于 Aplen Baruch 官网抓取产物构建的响应式官网，红色主色调，纯静态 HTML + CSS + JS，**无需构建工具**，双击 `index.html` 即可浏览（文章正文按需加载需通过 HTTP 访问，见下方运行说明）。

## 〇、内容宽度与对齐约定

| 变量 | 值 | 作用范围 |
|---|---|---|
| `--container` | 1344px | **全站统一容器**：页头导航 = 主体内容 = 页脚，左右边缘严格对齐 |
| `--container-narrow` | 960px | 主体窄栏（阅读型版块，原 860px） |

- 页头/主体/页脚共用 `.container`（`width:100% + max-width + margin-inline:auto + padding-inline:24px`），任意视口下左右边缘自动对齐，不受滚动条宽度影响（未使用 100vw）。
- `html, body { overflow-x: clip }` 裁掉移动端收起状态抽屉菜单的屏外溢出，避免横向滚动条（clip 不产生滚动容器，不影响 sticky 页头）。

## 一、如何运行

```bash
# 方式一：直接双击打开（推荐快速预览）
open index.html

# 方式二：本地 HTTP 服务（推荐，功能完整）
cd sgb-website
python3 -m http.server 8123
# 浏览器访问 http://127.0.0.1:8123/index.html
```

> 文章正文文件 `assets/js/data-articles-body.js` 采用「首次点击文章时动态注入」的方式加载。
> 在 `file://` 协议下部分浏览器会拦截动态脚本，请用 HTTP 方式访问以获得完整体验。

## 二、目录结构

仓库根目录 = nginx 站点根目录（无需构建，直接 `root` 指向即可）：

```
sgb-website/                     ← nginx root 指向这一层
├── index.html                   首页
├── personal.html                个人银行
├── business.html                企业银行
├── faq.html                     常见问题（57 条 → 7 分类）
├── contact.html                 Get Access / 联系我们
├── legal.html                   合规中心（条款 / 隐私 / 投诉 / 表单文档）
├── 404.html                     nginx error_page 用的自定义错误页
├── robots.txt
├── assets/
│   ├── css/main.css             全站样式（设计变量、组件、响应式、RTL、无障碍）
│   ├── img/logo.svg             品牌标识
│   └── js/
│       ├── main.js              全站交互（导航 / 手风琴 / 标签页 / 文章 / FAQ / 表单）
│       ├── i18n.js              语言切换引擎（EN / AR + RTL）
│       ├── i18n-ar.js           阿拉伯语语言包（约 356 条）
│       ├── data-articles.js     文章元数据（自动生成）
│       ├── data-articles-body.js 文章正文（自动生成，首次点击时注入）
│       └── data-faq.js          常见问题数据（自动生成）
├── deploy/
│   └── nginx.conf               nginx server 配置（压缩、缓存、美化 URL、安全规则）
└── tools/
    ├── build_site_data.py       从抓取产物生成文章与 FAQ 数据
    ├── build_legal.py           从抓取产物生成 legal.html
    ├── smoke_test.js            jsdom 冒烟测试（33 项断言）
    ├── check_align.js           6 页 × 8 断点的对齐/横向滚动校验
    └── check_overflow.js        溢出检测
```

> `tools/`、`deploy/` 与点文件已在 nginx 配置中拒绝外网访问；若需更严格，可把站点文件单独拷到 `/var/www`。

重新生成内容数据（抓取产物更新后执行）：

```bash
python3 tools/build_site_data.py   # 生成 data-articles*.js / data-faq.js
python3 tools/build_legal.py       # 生成 legal.html
```

## 三、抓取产物 → 网站板块映射

| # | 抓取产物 | 内容规模 | 对应网站板块 |
|---|---|---|---|
| 1 | `sgb_website_md/00-INDEX.md` | 94 个页面的站点地图 | 全站信息架构与导航设计（7 个一级栏目 + 合规中心） |
| 2 | `sgb_website_md/01-main/`（22 个主导航页） | home / about-us / personal / business / faq / contact-us / terms / privacy / complaints / forms 等 | **首页**（home.md）、**关于我们**（about-us.md）、**个人银行**（personal.md + open-account.md）、**企业银行**（business.md + business-interest.md）、**常见问题**（faq.md，63 条折叠问答全部展开）、**联系我们**（contact-us.md）、**合规中心**（terms/privacy/complaints/forms 四个标签页） |
| 3 | `sgb_website_md/02-insights/`（43 个文件 = 42 篇文章 + 1 个索引页） | 新闻稿、客户案例、行业观点 | **洞察与新闻**主列表（含分类标签 Press / Customer stories / Editorial，支持搜索、筛选、分页加载、点击展开全文） |
| 4 | `sgb_website_md/03-news/`（17 个文件 = 16 篇新闻 + 1 个索引页） | Latest News 媒体报导 | **洞察与新闻**列表中的 News 分组；首页「最新动态」4 条来自 home.md 头条 |
| 5 | `sgb_website_md/04-blog/`（12 页）+ `_shared/全站公共导航与页脚.md` | 博客文章、作者、分类页；全站导航与页脚文案 | 博客文章并入**洞察与新闻**（Blog 分组）；`_shared` 提供全站 **页头导航**（Personal / Business / Company / About / Insights / GET ACCESS）与**页脚**（地址、支持、法律链接、社交账号、监管声明） |

合计收录 **59 篇文章**（42 洞察 + 16 新闻 + 1 博客）与 **63 条 FAQ**。

内容一致性说明：

- 全站文字均取自上述产物，未做虚构或改写；关键事实（4.00% p.a. 定存利率、24/7 免费互转、CBB 监管、办公地址、董事会与顾问名单）均逐条对应原文。
- `-copy` 后缀页（privacy-notice-copy、business-interest-copy）为原站 Webflow 备份页，内容重复，已去重不纳入。
- 图片沿用原站 CDN 地址；离线或 CDN 不可达时由 `data-fallback` 降级为渐变占位块，不会破坏布局。

## 四、设计系统

| 类别 | 取值 | 用途 |
|---|---|---|
| 主色 | `#C8102E` | 页头品牌块、主按钮、标题强调线、图标底、当前导航指示 |
| 主色深 | `#A50C24` / `#7E0919` | 按钮 hover、渐变深色端 |
| 主色浅 | `#FBE0E3` / `#FDF2F3` | 卡片图标底、提示条背景、标签底 |
| 辅助色 | `#C8A24A`（金） | 品牌点缀（预留） |
| 深色 | `#101218` / `#191B23` | 页脚、Hero、深色区块 |
| 中性 | `#14151A` / `#3D4048` / `#6B6F7A` / `#E7E8EC` | 正文、次级文字、边框 |
| 背景 | `#FFFFFF` / `#F7F8FA` | 页面底色与浅灰交替区块 |

- 字体：系统字体栈（`-apple-system / PingFang SC / Microsoft YaHei`），无外部字体请求。
- 圆角 8 / 14 / 22px 三级；阴影三级；间距 8px 基数栅格。
- 对比度：正文 `#14151A` on `#FFFFFF` ≈ 16:1，红色按钮白字 `#C8102E` ≈ 5.9:1，均满足 WCAG AA。

## 五、响应式与交互

- 断点：`1080px`（四列转两列）、`900px`（导航转抽屉、双列转单列）、`680px`（全面单列、字号与间距收敛）。
- 移动端：汉堡菜单 → 右侧抽屉 + 半透明遮罩，支持 Esc 关闭、点击链接自动收起、焦点管理。
- 组件：手风琴（ARIA `aria-expanded` / `aria-controls`）、标签页（`role=tablist`，方向键切换，支持 `#hash` 直达）、文章弹层（`role=dialog`，Esc 关闭，焦点归还）。
- 无障碍：跳转链接、`aria-current`、语义化标签、`focus-visible` 焦点环、`prefers-reduced-motion` 降级动画。

## 六、性能

- 无第三方库与框架，单 CSS + 单 JS（首屏 JS ≈ 12KB）。
- 图片 `loading="lazy" decoding="async"`，CDN 直连。
- 文章正文 197KB 独立文件，首次点击文章时才注入，列表页首屏仅加载 47KB 元数据。
- 滚动显现使用 `IntersectionObserver`，元素进入视口后即 `unobserve`。

## 七、已完成的冒烟测试

```bash
NODE_PATH=/Users/liaochunjian/.workbuddy/binaries/node/workspace/node_modules \
  node tools/smoke_test.js
```

`tools/smoke_test.js` 使用 jsdom 真实执行页面脚本，覆盖 **33 项断言，当前 33/33 通过**：

- 7 个 HTML 页无脚本错误；全站站内链接零死链（含 404 页）
- 首页：4 项导航、主标题、卡片渲染、唯一 GET ACCESS、「我们凭什么不同」模块
- FAQ：57 条渲染、7 个分类芯片、手风琴展开、关键词搜索过滤
- 合规中心：4 个标签页切换
- 联系我们：表单提交成功态
- 部署：nginx 所需文件齐备、全站无中文残留、每页语言切换挂载点完整

## 八、部署到 Nginx

站点为纯静态文件，**没有构建步骤**，nginx 直接 `root` 指向仓库根目录即可运行。

```bash
# 1. 放置文件（生产环境推荐 clone 到固定路径，用 tag/SHA 追踪版本）
sudo git clone <repo-url> /var/www/alpen-bank
cd /var/www/alpen-bank && sudo git checkout <tag-or-sha>

# 2. 配置 nginx（至少改两处：server_name → 域名，root → 实际 clone 路径）
sudo cp deploy/nginx.conf /etc/nginx/conf.d/alpen-bank.conf
sudo vim /etc/nginx/conf.d/alpen-bank.conf

# 3. 语法校验 + 生效
sudo nginx -t && sudo systemctl reload nginx

# 4. 冒烟验证
curl -I http://127.0.0.1/            # 200
curl -I http://127.0.0.1/personal    # 200（美化 URL → personal.html）
curl -I http://127.0.0.1/not-exist   # 404，且返回自定义错误页
curl -I http://127.0.0.1/.git/config # 403
curl -I http://127.0.0.1/tools/      # 403
```

 nginx 配置要点：

| 能力 | 配置 |
|---|---|
| 美化 URL | `try_files $uri $uri.html $uri/ =404` → `/personal` 可直接访问 |
| 自定义错误页 | `error_page 404 /404.html` + `location = /404.html { internal; }`（仍返回 HTTP 404） |
| 缓存 | `/assets/` 7 天强缓存；`.html` `no-cache` 保证语言切换取最新 |
| 压缩 | gzip level 6，覆盖 html/css/js/svg/json |
| 加固 | 拒绝点文件（`.git` 等）与 `/tools/`；`nosniff`、Referrer-Policy、`X-Frame-Options` |
| HTTPS | 见 `deploy/nginx.conf` 末尾注释，`certbot --nginx -d <domain>` 一键签发 |

回滚：`nginx -t` 前置校验 + `git checkout <上一个 tag>` 即版本回退，静态文件无迁移、无状态。

## 九、部署到 GitHub Pages

站点为零构建纯静态文件，GitHub Pages 直接发布仓库即可，**无需任何构建命令**。

**一次性的两步手动操作**（其余全自动）：

1. 仓库必须**公开**：`Settings → General → Danger Zone → Change visibility → Make public`
   （GitHub Free 账户的 Pages 只对公开仓库生效；私有仓库需 Pro / Team / Enterprise 套餐）
2. 开启 Pages：`Settings → Pages → Build and deployment → Source` 选 **Deploy from a branch**，
   分支选 `main`，目录选 **`/ (root)`**，点 Save

之后每次改代码只需：

```bash
git add -A && git commit -m "..." && git push
```

推送后 Actions 中的 `pages build and deployment` 工作流会自动拉取、打包并发布。

**默认访问地址**

```
https://liaochunjian.github.io/alpenbanking-site/
https://liaochunjian.github.io/alpenbanking-site/personal.html
```

✅ 全站 href/src 均为相对路径（`personal.html`、`assets/css/main.css`），因此在 `/<仓库名>/` 二级目录下无需任何改写即可正常访问 —— 这也是这套代码能在 nginx 根目录和 GitHub Pages 子目录两种环境下通用的原因。
❌ 注意：GitHub Pages 没有 nginx 的 `try_files`，美化 URL（`/personal`）不被支持，必须带 `.html` 后缀；`404.html` 也会在文件不存在时自动返回。

**自定义域名**：`Settings → Pages → Custom domain` 填入域名后 Save，再到 DNS 服务商处添加记录：

| 域名类型 | DNS 记录 |
|---|---|
| 子域（`www.`、`site.` 等） | `CNAME` → `liaochunjian.github.io` |
| 根域（`example.com`） | `A` → `185.199.108.153 / 185.199.109.153 / 185.199.110.153 / 185.199.111.153`（可再加 AAAA） |

GitHub 会自动签发并续期 Let's Encrypt 证书（首次可能需 10~30 分钟），届时可在 Pages 设置里勾选 **Enforce HTTPS**。绑定自定义域名后路径前缀消失（`https://example.com/personal.html`），相对引用依然有效，无需改动代码。仓库根部的 `CNAME` 文件会在你填域名后由 GitHub 自动生成。

**生效时间**：首次启用约 1~3 分钟即可访问，最长不超过 10 分钟；后续每次 push 约 30 秒 ~ 2 分钟。

**出现 404 的排查顺序**

1. 看 `Actions` 标签页：`pages build and deployment` 是否绿色成功（失败多半是 Jekyll 处理报错或文件超限）
2. `Settings → Pages` 页面顶部是否已显示 "Your site is live at https://..."
3. 确认分支/目录确实是 `main` + `/ (root)`，而不是 `__gh-pages` 或 `/docs`
4. 仓库是否为 **Public**（私有仓库且非付费套餐时，Pages 会一直不可用）
5. 自定义域名场景：检查 DNS 是否已生效（`dig +short www.example.com`）以及 CNAME 文件是否存在
6. 仍是 404 时，用带后缀的完整路径试：`https://liaochunjian.github.io/alpenbanking-site/index.html`

## 十、二次开发提示

- 改内容：更新 `sgb_website_md/` 后重跑 `tools/` 下两个脚本即可。
- 换主色：只改 `assets/css/main.css` 顶部 `:root` 中的 `--c-red*` 变量。
- 接后端：`contact.html`、`business.html` 的表单为静态演示，提交成功后展示提示态；将 `main.js` 中 `initForms()` 的提交处理替换为 `fetch` 请求即可。
- 加页面：复制任一页面的页头/页脚结构，并更新各页 `nav` 中的 `aria-current`。

## 多语言与 RTL（Language Switcher）

- 组件逻辑集中在 `assets/js/i18n.js`：语言配置（`LANGS`）、翻译字典（`dicts`）、切换引擎与下拉 UI 全部在这一个文件里维护。
- 每个页面有两个挂载点：桌面端在页头 `GET ACCESS` 左侧（`.header__cta` 内），移动端在折叠菜单（`#site-nav` 末尾），均以 `<div data-lang-slot>` 占位、由 JS 注入。
- 新增语言：在 `LANGS` 加一项（code / 原生名称 label / 徽标 short / 方向 dir），再为对应语系补字典；当前仅 EN 与 AR 两项。
- 新增翻译：向 `dicts.ar` 追加 `"English source": "الترجمة"` 键值对；未命中的文本自动回退英文。含数字的动态文案（如 "57 articles in total, showing 12"）加到 `PATTERNS` 正则表。
- 持久化：localStorage `ab_lang` + 同名 cookie（双写），页面 `<head>` 内联脚本在首帧前设置 `dir/lang`，避免 RTL 闪烁。
- RTL：切换后 `<html dir="rtl" lang="ar">`；阿语字体栈、箭头镜像、菜单对齐（`inset-inline-end`）等见 `main.css` 第 13 节。

### 阿拉伯语语言包（2026-10 补全）
- 全量翻译集中在 `assets/js/i18n-ar.js`（约 350 条）：六个页面的标题/正文/卡片/表单、FAQ 全部 57 组问答、合规页 chrome 与文档标题。`i18n.js` 启动时将其合并覆盖内置字典。
- 新增翻译一律追加到 `i18n-ar.js` 的键值对（键 = 英文原文），不要把译文散落进 HTML —— 这就是"翻译键渲染"的唯一维护入口。
- 合规页四份法律文本正文（条款/隐私/投诉/表单文档）保留英文原文（法律文件以原文为准），在 RTL 页面内自动以 LTR 排版展示（`main.css` 的 `.legal-doc > p:not(.lead)` 规则）。
- 不参与翻译的节点加 `data-no-i18n`（如页脚 LinkedIn 图标 "in"）。
