#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Aplen Baruch site - compliance centre page (legal.html) generator

Input: 01-main/terms-and-conditions.md, privacy-notice.md, complaints.md,
      forms-and-documents.md and three forms-documents-*.md sub-pages
Output: legal.html (tab structure, four legal texts reproduced in full)

Usage: python3 tools/build_legal.py
"""
import os
import sys
import html
import re

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_site_data import read, strip_meta, clean_body, dedupe, md_inline  # noqa: E402

SRC = "/Users/liaochunjian/Desktop/工作2/alpenbanking/sgb_website_md/01-main"
OUT = "/Users/liaochunjian/Desktop/工作2/alpenbanking/sgb-website/legal.html"


NOISE_PREFIX = ("HOME —", "HOME ━", "BUSINESS BANKING ━", "Filter by category")
# Webflow form placeholder text from the original site, not client-facing legal text
NOISE_CONTAINS = (
    "code for form validation and submission",
    "code for insertion of countries",
    "Thank you.",
    "Your message has been received.",
    "We have received your application",
)


def doc_html(path, extra_drop=()):
    """Convert terms-type markdown into well-structured HTML.

    Key processing:
    1. Numbered / lettered / heading lines start a new block; following unnumbered lines join that block,
       so source line breaks do not split one clause into several <p>;
    2. Filter out noise lines such as breadcrumbs;
    3. Deduplicate repeated consecutive headings (the original site rendered the same heading twice as h2/h3).
    """
    text = strip_meta(read(path))
    text = re.sub(r"[\u200b\u200c\u200d\ufeff]", "", text)
    para_re = re.compile(r"^\d+(\.\d+)*\.?\s")          # 1. / 1.1 / 1.2.3
    alpha_re = re.compile(r"^[a-z]\.\s")                 # a. b. c.
    bullet_re = re.compile(r"^[·•\-]\s")

    out, block, in_ul, last_head = [], [], False, None
    pending_li = False

    def flush_block():
        nonlocal block
        if block:
            out.append("<p>" + md_inline(" ".join(block)) + "</p>")
            block = []

    for raw in text.split("\n"):
        line = raw.strip()
        if not line:
            continue
        if set(line) <= set("-—_ "):          # separator line
            continue
        if any(line.startswith(p) for p in NOISE_PREFIX):
            continue
        if any(d in line for d in extra_drop) or line.startswith("!["):
            continue
        if any(d in line for d in NOISE_CONTAINS):
            continue

        # bullets on their own line (in the original md the bullet and content sit on separate lines)
        if line in ("·", "•", "-", "*"):
            flush_block()
            if not in_ul:
                out.append("<ul>")
                in_ul = True
            pending_li = True
            continue
        if pending_li:
            out.append("<li>" + md_inline(line) + "</li>")
            pending_li = False
            continue

        if line.startswith("#"):
            flush_block()
            if in_ul:
                out.append("</ul>")
                in_ul = False
            txt = line.lstrip("# ").strip()
            if not txt or txt == "‍" or txt == last_head:
                continue
            last_head = txt
            lvl = 3 if line.count("#") <= 3 else 4
            out.append(f"<h{lvl}>{md_inline(txt)}</h{lvl}>")
            continue

        if bullet_re.match(line):
            flush_block()
            if not in_ul:
                out.append("<ul>")
                in_ul = True
            out.append("<li>" + md_inline(bullet_re.sub("", line).strip()) + "</li>")
            continue

        if in_ul:
            out.append("</ul>")
            in_ul = False

        if para_re.match(line) or alpha_re.match(line):
            flush_block()          # new numbered item -> start a new paragraph
            block.append(line)
        else:
            block.append(line)     # continuation line joins the current item

    flush_block()
    if in_ul:
        out.append("</ul>")
    return "\n".join(out)


HEADER = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Compliance Centre | Terms, Privacy, Complaints and Documents | SGB</title>
<meta name="description" content="SGB terms and conditions, privacy notice, complaints and feedback process, plus forms and documents such as financial reports and corporate governance.">
<meta name="theme-color" content="#c8102e">
  <link rel="icon" type="image/svg+xml" href="assets/img/logo.svg">
<link rel="stylesheet" href="assets/css/main.css">
</head>
<body>
<a class="skip-link" href="#main">Skip to main content</a>

<header class="site-header">
  <div class="container site-header__inner">
    <a class="brand" href="index.html">
      <span class="brand__logo" aria-hidden="true"><img src="assets/img/logo.svg" alt="" width="40" height="40" decoding="async"></span>
      <span>Aplen Baruch bank
        <span class="brand__sub">Digital &amp; Traditional Finance</span>
      </span>
    </a>

    <nav class="nav" id="site-nav" aria-label="Main navigation">
      <a class="nav__link" href="index.html">Home</a>
      <a class="nav__link" href="personal.html">Personal Banking</a>
      <a class="nav__link" href="business.html">Business Banking</a>
      <a class="nav__link" href="faq.html">FAQ</a>
    </nav>

    <div class="header__cta">
      <a class="btn btn--primary btn--sm" href="contact.html">GET ACCESS</a>
    </div>

    <button class="nav-toggle" type="button" data-nav-toggle aria-expanded="false" aria-controls="site-nav" aria-label="Open navigation menu">
      <span class="nav-toggle__bar"></span>
      <span class="nav-toggle__bar"></span>
      <span class="nav-toggle__bar"></span>
    </button>
  </div>
</header>
<div class="nav-overlay" data-nav-overlay hidden></div>

<main id="main">

  <section class="page-banner">
    <div class="container">
      <span class="eyebrow eyebrow--light">LEGAL &amp; COMPLIANCE</span>
      <h1>Terms, Privacy, Complaints and Documents</h1>
      <p class="lead">This page reproduces in full the SGB website terms and conditions, privacy notice, complaints and feedback guidance, and the related forms and disclosure documents.</p>
    </div>
  </section>

  <section class="section">
    <div class="container">
      <div data-tabs>
        <div class="tabs__list" role="tablist" aria-label="Compliance document categories">
          <button class="tabs__btn" role="tab" id="tab-terms" aria-controls="terms" aria-selected="true" tabindex="0">Terms &amp; Conditions</button>
          <button class="tabs__btn" role="tab" id="tab-privacy" aria-controls="privacy" aria-selected="false" tabindex="-1">Privacy Notice</button>
          <button class="tabs__btn" role="tab" id="tab-complaints" aria-controls="complaints" aria-selected="false" tabindex="-1">Complaints &amp; feedback</button>
          <button class="tabs__btn" role="tab" id="tab-documents" aria-controls="documents" aria-selected="false" tabindex="-1">Forms &amp; Documents</button>
        </div>
"""

FOOTER = """
      </div>
    </div>
  </section>

</main>

<footer class="site-footer">
  <div class="container">
    <div class="site-footer__top">
      <div>
        <div class="brand" style="color:#fff;margin-bottom:1rem">
          <span class="footer-brand__logo" aria-hidden="true"><img src="assets/img/logo.svg" alt="" width="46" height="46" loading="lazy" decoding="async"></span>
          <span>Aplen Baruch bank<span class="brand__sub" style="color:#8d93a1">Digital &amp; Traditional Finance</span></span>
        </div>
        <p class="footer-address">Bahrain World Trade Center, West Tower,<br>Isa Al-Kabeer Avenue, Manama, Bahrain</p>
        <div class="footer-social">
          <a href="https://www.linkedin.com/company/sgb-official/" target="_blank" rel="noopener" aria-label="LinkedIn">in</a>
          <a href="https://x.com/SGB_app" target="_blank" rel="noopener" aria-label="X">X</a>
          <a href="https://www.instagram.com/sgb_app" target="_blank" rel="noopener" aria-label="Instagram">IG</a>
        </div>
      </div>
      <div>
        <h4>Products &amp; Services</h4>
        <ul class="footer-list">
          <li><a href="personal.html">Personal Banking</a></li>
          <li><a href="business.html">Business Banking</a></li>
        </ul>
      </div>
      <div>
        <h4>Support</h4>
        <ul class="footer-list">
          <li><a href="faq.html">FAQ</a></li>
          <li><a href="contact.html">Contact us</a></li>
          <li><a href="legal.html#complaints">Complaints &amp; feedback</a></li>
        </ul>
      </div>
    </div>
    <div class="site-footer__bottom">
      <div class="container site-footer__bottom-inner" style="padding-inline:0">
        <span>© <span data-year>2026</span> Aplen Baruch bank. Licensed and regulated as a conventional wholesale bank by the Central Bank of Bahrain.</span>
        <nav class="footer-legal" aria-label="Legal links">
          <a href="legal.html#terms">Terms &amp; Conditions</a>
          <a href="legal.html#privacy">Privacy Notice</a>
          <a href="legal.html#documents">Forms &amp; Documents</a>
        </nav>
      </div>
    </div>
  </div>
</footer>

<button class="to-top" type="button" data-to-top aria-label="Back to top">↑</button>

<script src="assets/js/main.js" defer></script>
</body>
</html>
"""


COMPLAINT_CTA = """
          <div class="notice" style="margin-top:2rem">
            To submit a complaint or feedback, leave us a message on the <a href="contact.html">Contact us</a> page and our team will handle and respond as soon as possible.
          </div>
"""


def rebrand(doc: str) -> str:
    """Before output, replaces standalone SGB in display text with the new brand name (links and identifiers untouched)."""
    return re.sub(r"\bSGB\b", "Aplen Baruch", doc)


def panel(pid, labelledby, title, intro, body):
    hidden = "" if pid == "terms" else " hidden"
    return f"""
        <div class="tabs__panel legal-doc" id="{pid}" role="tabpanel" aria-labelledby="{labelledby}"{hidden}>
          <h2>{title}</h2>
          <p class="lead">{intro}</p>
          {body}
        </div>
"""


def main():
    terms = doc_html(os.path.join(SRC, "terms-and-conditions.md"))
    privacy = doc_html(os.path.join(SRC, "privacy-notice.md"))
    complaints = doc_html(os.path.join(SRC, "complaints.md"))

    forms_intro = """
      <p>SGB provides the following categories of forms and disclosure documents for clients and partners.</p>
    """
    doc_sections = [
        ("Financial reports",
         os.path.join(SRC, "forms-documents-financial-reports.md")),
        ("Corporate governance",
         os.path.join(SRC, "forms-documents-corporate-governance.md")),
        ("Additional instructions",
         os.path.join(SRC, "forms-documents-additional-instructions.md")),
    ]
    forms_body = forms_intro
    for title, path in doc_sections:
        # the sub-page heading "Forms and documents" duplicates the outer one, drop it
        forms_body += f"<h3>{title}</h3>\n" + doc_html(path, extra_drop=("Forms and documents",))

    with open(OUT, "w", encoding="utf-8") as f:
        f.write(rebrand(HEADER))
        f.write(rebrand(panel("terms", "tab-terms", "Terms and conditions",
                              "These terms apply to your use of the electronic services provided by SGB.", terms)))
        f.write(rebrand(panel("privacy", "tab-privacy", "Privacy notice",
                      "This notice explains how SGB collects, uses, discloses, transfers and protects the personal data in our possession or control, and how you can exercise your rights.",
                      privacy)))
        f.write(rebrand(panel("complaints", "tab-complaints", "Complaints and feedback",
                      "At SGB we continually work to improve our client experience and we want to hear from you — your complaints, expectations and feedback help us understand and serve you better.",
                      complaints + COMPLAINT_CTA)))
        f.write(rebrand(panel("documents", "tab-documents", "Forms and documents",
                              "A list of downloadable documents including financial reports, corporate governance policies and additional instructions.", forms_body)))
        f.write(rebrand(FOOTER))
    print(f"[OK] legal.html  {os.path.getsize(OUT) / 1024:.1f} KB")


if __name__ == "__main__":
    main()
