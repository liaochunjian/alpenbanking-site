#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Aplen Baruch 官网 —— 内容数据构建脚本

品牌名口径：界面展示文本统一为 "Aplen Baruch"；
代码标识符（如 SGB_ARTICLES / SGB_FAQ）与原始链接保持不变。

输入：爬虫产物目录 sgb_website_md/（01-main、02-insights、03-news、04-blog）
输出：assets/js/data-articles.js   文章元数据（标题/日期/分类/摘要/封面）
      assets/js/data-articles-body.js  文章正文（按需加载）
      assets/js/data-faq.js        常见问题 63 条

用法：python3 tools/build_site_data.py
"""
import os
import re
import json
import html
import datetime

SRC = "/Users/liaochunjian/Desktop/工作2/alpenbanking/sgb_website_md"
OUT = "/Users/liaochunjian/Desktop/工作2/alpenbanking/sgb-website/assets/js"

# ---------------------------------------------------------------- 工具函数
MONTHS = {m: i for i, m in enumerate(
    ["January", "February", "March", "April", "May", "June", "July",
     "August", "September", "October", "November", "December"], start=1)}


def read(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


def strip_meta(text):
    """去掉 md 头部的抓取信息块、尾部图片/内链清单"""
    text = text.split("\n---\n", 1)[-1]
    for tail in ["## 页面图片资源", "## 页面内链"]:
        if tail in text:
            text = text.split(tail, 1)[0]
    return text.strip()


ZERO_WIDTH = re.compile(r"[\u200b\u200c\u200d\ufeff]")

NOISE_LINES = [
    "This is some text inside of a div block.",
    "code for form validation and submission",
    "code for insertion of countries",
    "Share this article",
    "Written by",
    "SGB INSIGHTS",
    "LATEST NEWS",
]


def parse_date(line):
    """把 '12 October 2026' / '09.09.2025' / '12.08.25' 转成 ISO 日期"""
    line = line.strip()
    m = re.search(r"(\d{1,2})\s+([A-Z][a-z]+)\s+(\d{4})", line)
    if m and m.group(2) in MONTHS:
        return f"{int(m.group(3)):04d}-{MONTHS[m.group(2)]:02d}-{int(m.group(1)):02d}"
    m = re.fullmatch(r"(\d{2})\.(\d{2})\.(\d{2,4})", line)
    if m:
        y = int(m.group(3))
        y = y + 2000 if y < 100 else y
        return f"{y:04d}-{int(m.group(2)):02d}-{int(m.group(1)):02d}"
    return ""


def fmt_date(iso):
    if not iso:
        return ""
    y, m, d = iso.split("-")
    return f"{int(d)} {datetime.date(int(y), int(m), int(d)).strftime('%B')} {y}"


def clean_body(text, title):
    """正文清洗：去噪声行、去重复段落，返回段落列表"""
    text = ZERO_WIDTH.sub("", text)
    lines = []
    for raw in text.split("\n"):
        line = raw.strip()
        if not line:
            continue
        if line in NOISE_LINES or line.startswith("| By") or line.startswith("|"):
            continue
        if line == title:
            continue
        if line.startswith("#") and line.lstrip("# ").strip() == title:
            continue
        if line.startswith("!["):
            continue
        if line.startswith("[按钮]"):
            continue
        if re.fullmatch(r"\d+\s*/\s*\d+", line):        # 分页 "1 / 5"
            continue
        if len(line) <= 32 and parse_date(line):        # 独立的日期行
            continue
        lines.append(line)
    return lines


def dedupe(seq):
    seen, out = set(), []
    for x in seq:
        k = re.sub(r"\s+", " ", x).strip().lower()
        if k in seen:
            continue
        seen.add(k)
        out.append(x)
    return out


def md_inline(s):
    """行内 markdown：链接、加粗 -> HTML"""
    s = html.escape(s)
    s = re.sub(r"\[([^\]]+)\]\((https?://[^)\s]+)\)",
               r'<a href="\2" target="_blank" rel="noopener">\1</a>', s)
    s = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", s)
    return s


def lines_to_html(lines):
    """段落/标题/列表 -> HTML"""
    out, buf = [], []
    for line in lines:
        if line.startswith("#"):
            if buf:
                out.append(f"<p>{md_inline(' '.join(buf))}</p>")
                buf = []
            hashes = len(line) - len(line.lstrip("#"))
            lvl = 3 if hashes <= 4 else 4          # 正文内标题统一收敛到 h3/h4
            out.append(f"<h{lvl}>{md_inline(line.lstrip('# '))}</h{lvl}>")
        elif line.startswith(("- ", "• ")):
            if buf:
                out.append(f"<p>{md_inline(' '.join(buf))}</p>")
                buf = []
            out.append(f"<li>{md_inline(line[2:].strip())}</li>")
        else:
            buf.append(line)
    if buf:
        out.append(f"<p>{md_inline(' '.join(buf))}</p>")
    # 合并相邻 li
    merged, in_ul = [], False
    for tag in out:
        if tag.startswith("<li>"):
            if not in_ul:
                merged.append("<ul>")
                in_ul = True
            merged.append(tag)
        else:
            if in_ul:
                merged.append("</ul>")
                in_ul = False
            merged.append(tag)
    if in_ul:
        merged.append("</ul>")
    return "\n".join(merged)


# ------------------------------------------------- 1) 解析 insights.md 索引
CATEGORY_SET = {
    "press", "customer stories", "editorial", "featured",
    "events & partnerships", "financial inclusion & community",
    "leadership perspective", "markets", "products & how-tos",
    "technology & innovation", "trust, security & compliance",
}


def parse_index(md_path):
    """从列表页提取 slug -> {category, date, image, excerpt}"""
    text = read(md_path)
    info, last_cat, last_img, pending = {}, "", None, None
    for line in text.split("\n"):
        s = line.strip()
        if not s:
            continue
        if s.lower() in CATEGORY_SET:
            last_cat = s
            continue
        m = re.match(r"!\[[^\]]*\]\((https?://[^)\s]+)\)", s)
        if m and "placeholder" not in m.group(1).lower():
            last_img = m.group(1)
            continue
        if s.startswith("#### ") and not s.startswith("#####"):
            pending = s[5:].strip()
            info.setdefault(pending, {"category": last_cat or "", "date": "",
                                      "image": last_img or "", "excerpt": ""})
            last_img = None
            continue
        if pending:
            d = parse_date(s)
            if d and not info[pending]["date"]:
                info[pending]["date"] = d
                continue
            if len(s) > 60 and not s.startswith(("#", "[", "!", "|")):
                if not info[pending]["excerpt"]:
                    info[pending]["excerpt"] = s
    return info


def slug_of(url):
    return (urlparse(url).path.strip("/").split("/")[-1] or "home")


from urllib.parse import urlparse  # noqa: E402


def build_articles():
    idx_insights = parse_index(os.path.join(SRC, "02-insights", "insights.md"))
    idx_news = parse_index(os.path.join(SRC, "03-news", "news.md"))

    groups = [
        ("02-insights", "insights", "Insights", idx_insights),
        ("03-news", "news", "News", idx_news),
        ("04-blog", "blog", "Blog", {}),
    ]
    articles = []
    for folder, kind, label, idx in groups:
        d = os.path.join(SRC, folder)
        if not os.path.isdir(d):
            continue
        for fn in sorted(os.listdir(d)):
            if not fn.endswith(".md"):
                continue
            base = fn[:-3]
            if base in (folder, "insights", "news", "blog", "authors"):
                continue
            if base.startswith("blog-categories__") or base.startswith("author__"):
                continue
            text = read(os.path.join(d, fn))
            title_m = re.match(r"# (.+)", text)
            url_m = re.search(r"\*\*URL\*\*：(https?://\S+)", text)
            desc_m = re.search(r"\*\*Meta Description\*\*：(.*)", text)
            if not title_m:
                continue
            title = title_m.group(1).strip()
            url = url_m.group(1) if url_m else ""
            slug = slug_of(url) or base
            meta = idx.get(title, {})
            body_lines = dedupe(clean_body(strip_meta(text), title))
            body_html = lines_to_html(body_lines)
            # 摘要：优先列表页摘要，其次 meta，其次正文首段
            excerpt = meta.get("excerpt") or (desc_m.group(1).strip() if desc_m else "")
            if not excerpt and body_lines:
                excerpt = body_lines[0]
            date_iso = meta.get("date", "")
            if not date_iso:
                for ln in body_lines[:6]:
                    date_iso = parse_date(ln)
                    if date_iso:
                        break
            img = meta.get("image", "")
            if not img:
                m = re.search(r"!\[[^\]]*\]\((https?://[^)\s]+)\)", strip_meta(text))
                if m and "placeholder" not in m.group(1).lower():
                    img = m.group(1)
            aid = f"{kind}--{slug}"
            bodies[aid] = body_html
            articles.append({
                "id": aid,
                "kind": kind,
                "kindLabel": label,
                "title": title,
                "slug": slug,
                "date": date_iso,
                "dateLabel": fmt_date(date_iso),
                "category": meta.get("category", "") or label,
                "image": img,
                "excerpt": excerpt[:400],
                "source": url,
            })

    articles.sort(key=lambda a: (a["date"] or "0000-00-00"), reverse=True)
    return articles


bodies = {}


BRAND_NEW = "Aplen Baruch"
SGB_TEXT_RE = re.compile(r"\bSGB\b")
# 这些字段存放原始链接 / 资源地址，不做品牌名替换
URL_FIELDS = {"source", "url", "href", "image", "cover", "slug"}


def rebrand_text(value):
    """仅替换独立成词的展示文本 SGB；URL 字段、代码标识符保持原样。"""
    return SGB_TEXT_RE.sub(BRAND_NEW, value)


def rebrand_data(obj):
    """递归处理数据结构：dict/list 中的字符串值做替换，URL 类字段跳过。"""
    if isinstance(obj, str):
        return rebrand_text(obj)
    if isinstance(obj, list):
        return [rebrand_data(x) for x in obj]
    if isinstance(obj, dict):
        return {k: v if k in URL_FIELDS else rebrand_data(v) for k, v in obj.items()}
    return obj


def write_js(var_name, data, filename):
    data = rebrand_data(data)          # 输出前统一做品牌名替换
    path = os.path.join(OUT, filename)
    payload = json.dumps(data, ensure_ascii=False, indent=None, separators=(",", ":"))
    with open(path, "w", encoding="utf-8") as f:
        f.write(f"/* This file is auto-generated by tools/build_site_data.py - do not edit manually */\n"
                f"window.{var_name} = {payload};\n")
    print(f"[OK] {filename}  {len(payload) / 1024:.1f} KB")


# ------------------------------------------------------------ 2) FAQ
def build_faq():
    text = strip_meta(read(os.path.join(SRC, "01-main", "faq.md")))
    items, cur_q, cur_a = [], None, []
    for line in text.split("\n"):
        s = line.strip()
        if not s:
            continue
        m = re.fullmatch(r"\*\*(.+)\*\*", s)
        if m:
            if cur_q:
                items.append({"q": cur_q, "a": " ".join(cur_a).strip()})
            cur_q, cur_a = m.group(1).strip(), []
        elif cur_q is not None:
            if s in ("Filter by category:", "Dropdown") or s.startswith("HOME"):
                continue
            cur_a.append(s)
    if cur_q:
        items.append({"q": cur_q, "a": " ".join(cur_a).strip()})

    # 下线「下载 App」相关问答：安装/商店/二维码/设备系统支持类问题整条移除
    DROP_RE = re.compile(
        r"download|install|app store|google play|appgallery|apk|qr code|scan\b"
        r"|devices and operating systems|which devices",
        re.I)
    before = len(items)
    items = [it for it in items if not DROP_RE.search(it["q"] + " " + it["a"])]

    # 其余文案中的 App 表述改写为中性说法（避免残留 App 引导）
    APP_RE = re.compile(r"\b(?:the )?SGB app\b", re.I)
    def neutralize(txt: str) -> str:
        txt = APP_RE.sub("your Aplen Baruch account", txt)
        txt = re.sub(r"\bapp\b", "service", txt, flags=re.I)
        return txt
    for it in items:
        it["q"] = neutralize(it["q"])
        it["a"] = neutralize(it["a"])

    # 关键词自动归类（原站分类标签未抓取到，按语义分组便于浏览）
    RULES = [
        ("Accounts & Onboarding", ["open an account", "account", "onboarding", "eligib", "resident", "kyc",
                       "identity", "document", "verify", "verification", "apply"]),
        ("Payments & Transfers", ["transfer", "payment", "send", "withdraw", "deposit", "swift", "iban",
                       "wire", "fund", "top up", "top-up", "currency", "fx", "exchange rate"]),
        ("Digital Assets", ["crypto", "stablecoin", "bitcoin", "usdc", "usdt", "token", "blockchain",
                     "exchange", "digital asset", "wallet", "on-ramp", "off-ramp"]),
        ("Fees & Rates", ["fee", "charge", "cost", "rate", "interest", "yield", "minimum", "balance"]),
        ("Security & Compliance", ["secure", "security", "regulat", "licen", "compliance", "protect",
                       "fraud", "scam", "password", "authentication", "data", "privacy"]),
        ("Service & Support", ["service", "support", "contact", "help", "login", "device", "notification",
                        "statement", "card", "close my account", "complaint"]),
    ]
    for it in items:
        low = it["q"].lower()
        cat = "Other"
        for name, kws in RULES:
            if any(k in low for k in kws):
                cat = name
                break
        it["category"] = cat
    return items


def main():
    os.makedirs(OUT, exist_ok=True)
    articles = build_articles()
    write_js("SGB_ARTICLES", articles, "data-articles.js")
    write_js("SGB_ARTICLE_BODIES", bodies, "data-articles-body.js")
    faq = build_faq()
    write_js("SGB_FAQ", faq, "data-faq.js")
    print(f"\n文章 {len(articles)} 篇 | 正文 {len(bodies)} 篇 | FAQ {len(faq)} 条")
    print("分类：", sorted({a["category"] for a in articles}))


if __name__ == "__main__":
    main()
