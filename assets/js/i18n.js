/*!
 * Aplen Baruch site - language switcher & i18n engine
 * ---------------------------------------------------
 * - Injects a language dropdown into every [data-lang-slot] placeholder.
 * - Switches page copy instantly via a string dictionary (no reload),
 *   persists the choice (localStorage + cookie) and restores it pre-paint
 *   through the inline snippet in each page <head>.
 * - RTL support: sets <html dir="rtl" lang="ar">, CSS mirrors arrows and
 *   menu alignment (see main.css "RTL / Arabic" section).
 *
 * How to maintain languages:
 *   1. Add an entry to LANGS  (code, native label, short badge, direction).
 *   2. Add translations to a dictionary (dicts.ar below).
 *   3. Add more dictionaries (dicts.fr = {...}) - the engine picks the
 *      right one per language. Untranslated strings fall back to English.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'ab_lang';

  /* ---------------------------------------------------------------
   * 1. Language configuration (display order = menu order)
   * --------------------------------------------------------------- */
  var LANGS = [
    { code: 'en', label: 'English',  short: 'EN', dir: 'ltr' },
    { code: 'ar', label: 'العربية',  short: 'AR', dir: 'rtl' }
  ];

  /* Dictionaries per language root. Missing keys fall back to English. */
  var dicts = { ar: {} };
  var PATTERNS = []; /* dynamic strings, filled after the dictionary */

  /* ---------------------------------------------------------------
   * 2. Arabic dictionary (exact-match on trimmed text node content)
   * --------------------------------------------------------------- */
  var AR = {
    /* Chrome: navigation & header */
    'Home': 'الرئيسية',
    'Personal Banking': 'الخدمات المصرفية للأفراد',
    'Business Banking': 'الخدمات المصرفية للأعمال',
    'FAQ': 'الأسئلة الشائعة',
    'FAQs': 'الأسئلة الشائعة',
    'GET ACCESS': 'افتح حسابك',
    'SIGN UP': 'سجّل الآن',
    'Skip to main content': 'تخطَّ إلى المحتوى الرئيسي',
    'Main navigation': 'التنقل الرئيسي',
    'Open navigation menu': 'فتح قائمة التنقل',
    'Close navigation menu': 'إغلاق قائمة التنقل',
    'Back to top': 'العودة إلى الأعلى',
    'Legal links': 'روابط قانونية',
    'Aplen Baruch · Digital Bank': 'Aplen Baruch · بنك رقمي',
    'Digital & Traditional Finance': 'التمويل الرقمي والتقليدي',

    /* Footer */
    'Products & Services': 'المنتجات والخدمات',
    'Support': 'الدعم',
    'Products': 'المنتجات',
    'Terms & Conditions': 'الشروط والأحكام',
    'Terms and conditions': 'الشروط والأحكام',
    'Privacy Notice': 'إشعار الخصوصية',
    'Privacy notice': 'إشعار الخصوصية',
    'Forms & Documents': 'النماذج والمستندات',
    'Forms and documents': 'النماذج والمستندات',
    'Complaints & feedback': 'الشكاوى والملاحظات',
    'Complaints and feedback': 'الشكاوى والملاحظات',
    'LEGAL & COMPLIANCE': 'الشؤون القانونية والامتثال',
    'Compliance Centre | Terms, Privacy, Complaints and Documents': 'مركز الامتثال | الشروط والخصوصية والشكاوى والمستندات',
    'Terms, Privacy, Complaints and Documents': 'الشروط والخصوصية والشكاوى والمستندات',
    'Financial reports': 'التقارير المالية',
    'Corporate governance': 'حوكمة الشركات',
    'Additional instructions': 'تعليمات إضافية',

    /* Home: hero & stats */
    'Your wealth crosses borders.': 'ثروتك تعبر الحدود.',
    'Your bank should too.': 'ومصرفك أيضاً.',
    'Bridging digital and traditional finance to make global banking truly accessible.': 'نربط التمويل الرقمي بالتقليدي لجعل الخدمات المصرفية العالمية في متناول الجميع.',
    'Free transfers between Aplen Baruch accounts': 'تحويلات مجانية بين حسابات Aplen Baruch',
    'Settlement network that never closes': 'شبكة تسوية لا تتوقف أبداً',
    'Highest fixed deposit rate': 'أعلى معدل للودائع الثابتة',
    'Regulated by the Central Bank of Bahrain': 'خاضع لرقابة مصرف البحرين المركزي',

    /* Home: mission */
    'Our mission': 'رسالتنا',
    'Money moves freely, investing stays unbound, growth gains momentum': 'تتحرك الأموال بحرية، والاستثمار بلا قيود، والنمو يكتسب زخماً',
    'All of it happens in a system designed for convenience, security and transparency.': 'وكل ذلك يحدث ضمن نظام صُمم للراحة والأمان والشفافية.',
    'Whether you manage personal wealth, scale a business or explore crypto assets, Aplen Baruch makes global banking effortless.': 'سواء كنت تدير ثروة شخصية أو توسّع أعمالك أو تستكشف الأصول الرقمية، يجعل Aplen Baruch الخدمات المصرفية العالمية أمراً سهلاً.',
    'Welcome to the future of finance.': 'مرحباً بك في مستقبل التمويل.',

    /* Home: what sets us apart */
    'What Sets Us Apart': 'ما الذي يميزنا',
    'What sets us apart': 'ما الذي يميزنا',
    'Partnering with leading banks and exchanges': 'شراكات مع أبرز المصارف ومنصات التداول',
    'Innovation at the core of everything we do': 'الابتكار في صميم كل ما نقوم به',
    'Trust and security in a volatile market': 'الثقة والأمان في سوق متقلب',

    /* Home: why Aplen Baruch (capability cards) */
    'Why Aplen Baruch': 'لماذا Aplen Baruch',
    'A bank account built for a borderless life': 'حساب مصرفي صُمم لحياة بلا حدود',
    'Global banking for everyone': 'مصرفية عالمية للجميع',
    'Trading around the clock': 'تداول على مدار الساعة',
    'Interconnected currencies': 'عملات مترابطة',
    'Assets kept protected': 'أصول محمية دائماً',
    'Open an account from anywhere': 'افتح حسابك من أي مكان',
    'One account, complete control': 'حساب واحد وتحكم كامل',
    'Put your money to work with competitive fixed deposit rates.': 'اجعل أموالك تنمو بمعدلات ودائع ثابتة تنافسية.',
    'Deposit, access and use your money across borders and currencies.': 'أودع واستخدم أموالك عبر الحدود وبعملات متعددة.',

    /* Home: product panels & CTA */
    'PERSONAL': 'للأفراد',
    'BUSINESS': 'للأعمال',
    'PERSONAL BANKING': 'الخدمات المصرفية للأفراد',
    'BUSINESS BANKING': 'الخدمات المصرفية للأعمال',
    'Discover banking built for you': 'اكتشف خدمات مصرفية مصممة لك',
    'Solutions tailored for individuals and businesses alike': 'حلول مصممة للأفراد والشركات على حد سواء',
    'Accessible, deeply integrated financial services': 'خدمات مالية في متناول الجميع ومتكاملة بعمق',
    'From everyday flexibility to long-term wealth growth, one account covers it all.': 'من المرونة اليومية إلى نمو الثروة طويل الأجل، حساب واحد يغطي كل شيء.',
    'Hold multiple currencies with automatic conversion': 'احتفظ بعملات متعددة مع تحويل تلقائي',
    'Fixed deposits that lock in steady returns': 'ودائع ثابتة تضمن عوائد مستقرة',
    'Aplen Baruch Link: direct access to crypto exchanges': 'Aplen Baruch Link: وصول مباشر إلى منصات العملات الرقمية',
    'Explore Personal Banking': 'استكشف الخدمات المصرفية للأفراد',
    'Growth powered by liquidity and scale': 'نمو مدعوم بالسيولة والحجم',
    'Cloud APIs and integrated solutions built for the digital economy, keeping your business running with speed and reliability.': 'واجهات برمجة سحابية وحلول متكاملة صُممت للاقتصاد الرقمي، تحافظ على عمل أعمالك بسرعة وموثوقية.',
    'Aplen Baruch Net: real-time multi-currency settlement': 'Aplen Baruch Net: تسوية فورية متعددة العملات',
    'Virtual accounts with automatic reconciliation': 'حسابات افتراضية مع مطابقة تلقائية',
    'Direct stablecoin and fiat conversion within your account': 'تحويل مباشر بين العملات المستقرة والعملات الورقية داخل حسابك',
    'Explore Business Banking': 'استكشف الخدمات المصرفية للأعمال',
    'Ecosystem': 'الشركاء',
    'Built with leading banks, exchanges and infrastructure providers': 'بُني بالشراكة مع أبرز المصارف ومنصات التداول ومزودي البنية التحتية',
    'Strategic channel partnerships are central to our vision, enabling deep product integration between fiat and digital currencies.': 'الشراكات القنوية الاستراتيجية في صميم رؤيتنا، إذ تتيح تكاملاً عميقاً بين العملات الورقية والرقمية.',
    'Stay in touch and learn more': 'ابقَ على تواصل لمعرفة المزيد',
    'Register your interest to receive full details of our personal and business banking features and services.': 'سجّل اهتمامك للحصول على تفاصيل كاملة عن ميزات وخدماتنا المصرفية للأفراد والأعمال.',
    'Get in touch': 'تواصل معنا',
    'CONTACT US': 'اتصل بنا',
    'Contact us': 'اتصل بنا',

    /* Security */
    'Security': 'الأمان',
    'Your money, in the right place': 'أموالك في المكان الصحيح',
    'Built to protect your money': 'مصمم لحماية أموالك',
    'Regulated by the Central Bank of Bahrain, with institutional-grade protection across every account, transaction and transfer.': 'خاضع لرقابة مصرف البحرين المركزي، مع حماية بمستوى مؤسسي لكل حساب ومعاملة وتحويل.',
    'Deposits are never lent out': 'الودائع لا تُقرض أبداً',
    'Client deposits are held in high-quality liquid assets (HQLA) that can be converted quickly when needed.': 'تُحفظ ودائع العملاء في أصول عالية السيولة والجودة (HQLA) يمكن تسييلها بسرعة عند الحاجة.',
    'Client deposits are held in high-quality liquid assets (HQLA) that can be converted quickly, so your money is always available.': 'تُحفظ ودائع العملاء في أصول عالية السيولة والجودة (HQLA) يمكن تسييلها بسرعة، فتبقى أموالك متاحة دائماً.',
    'Multiple layers of protection': 'طبقات متعددة من الحماية',
    'Multiple layers of security': 'طبقات متعددة من الأمان',
    'A regulated, compliant environment': 'بيئة منظمة ومتوافقة مع الأنظمة',

    /* Personal banking page */
    'Banking that is simple, secure and built around you': 'خدمات مصرفية بسيطة وآمنة ومصممة من أجلك',
    'From everyday flexibility to long-term wealth growth. One account covers everything you need.': 'من المرونة اليومية إلى نمو الثروة طويل الأجل. حساب واحد يغطي كل ما تحتاجه.',
    'View FAQs': 'اطلع على الأسئلة الشائعة',
    'One account for your entire financial life': 'حساب واحد لكامل حياتك المالية',
    'Put your cash to work': 'اجعل أموالك تعمل',
    'Fixed Deposit': 'وديعة ثابتة',
    'A fixed rate locked in from day one, up to 4.00% p.a.': 'معدل ثابت من اليوم الأول يصل إلى 4.00% سنوياً',
    'Choose a term that fits your timeline': 'اختر مدة تناسب خطتك الزمنية',
    'Auto-renew or withdraw at maturity — your choice': 'تجديد تلقائي أو سحب عند الاستحقاق — القرار لك',
    'Apply online in minutes': 'قدّم طلبك عبر الإنترنت خلال دقائق',
    'Aplen Baruch Link': 'Aplen Baruch Link',
    'Link your bank to crypto exchanges': 'اربط مصرفك بمنصات العملات الرقمية',
    'Fund exchanges from Aplen Baruch and withdraw back just as quickly': 'مول منصات التداول من Aplen Baruch واسحب بأسرع ما يكون',
    'Instant cross-border payments': 'مدفوعات فورية عبر الحدود',
    'Full KYC and AML monitoring with bank-grade transaction traceability': 'مراقبة كاملة لاعرف عميلك ومكافحة غسيل الأموال مع تتبع مصرفي للمعاملات',
    'Multicurrency and FX': 'متعدد العملات والصرف',
    'Manage the currencies that matter to you': 'أدر العملات التي تهمك',
    'Hold multiple currencies in a single account': 'احتفظ بعملات متعددة في حساب واحد',
    'Transparent rates with no hidden markup': 'أسعار شفافة دون هوامش خفية',
    'Open your account today': 'افتح حسابك اليوم',
    'What you need to open an account': 'ما تحتاجه لفتح حساب',
    '1 · Identification': '1 · إثبات الهوية',
    'Passport and national ID': 'جواز السفر وبطاقة الهوية الوطنية',
    '2 · Proof of address': '2 · إثبات العنوان',
    'Proof of residence': 'إثبات مكان الإقامة',
    '3 · Source of funds': '3 · مصدر الأموال',
    'Bank statements for the last three months': 'كشوف حساب مصرفي لآخر ثلاثة أشهر',
    'How your money is protected': 'كيف تُحمى أموالك',
    'Account availability and access to certain products may vary depending on your country of residence, nationality and applicable regulatory requirements.': 'قد يختلف توفر الحساب والوصول إلى بعض المنتجات حسب بلد إقامتك وجنسيتك والمتطلبات التنظيمية المعمول بها.',

    /* Business banking page */
    'Bank your business with Aplen Baruch': 'أدر أعمالك المصرفية مع Aplen Baruch',
    'Unlock liquidity and move money across borders without friction.': 'أطلق السيولة وحرّك أموالك عبر الحدود دون عوائق.',
    'Banking designed for the digital economy': 'خدمات مصرفية مصممة للاقتصاد الرقمي',
    'Borderless banking, instant settlement': 'مصرفية بلا حدود، تسوية فورية',
    'Multi-currency accounts': 'حسابات متعددة العملات',
    'Hold and manage balances in multiple currencies': 'احتفظ بأرصدة بعملات متعددة وأدرها',
    'See the spread clearly when you convert': 'اطلع على الفارق السعري بوضوح عند التحويل',
    'Built for corporate treasury and cross-border operations': 'مصمم للخزينة المؤسسية والعمليات عبر الحدود',
    'Virtual Accounts': 'حسابات افتراضية',
    'Virtual accounts for structured collections': 'حسابات افتراضية للتحصيل المنظم',
    'Unique virtual accounts for receivables and payment identification': 'حسابات افتراضية فريدة لتحديد المقبوضات والمدفوعات',
    'Faster reconciliation for finance and operations teams': 'مطابقة أسرع لفرق المالية والعمليات',
    'Greater visibility across entities, products and markets': 'رؤية أوسع عبر الكيانات والمنتجات والأسواق',
    'Stablecoin ↔ Fiat': 'عملات مستقرة ↔ عملات ورقية',
    'Convert stablecoins to fiat directly in your account': 'حوّل العملات المستقرة إلى عملات ورقية مباشرة داخل حسابك',
    'Integrated fiat and stablecoin flows, deeply connected within a single account.': 'تدفقات ورقية ومستقرة متكاملة داخل حساب واحد.',
    'Straight into your fiat balance': 'مباشرة إلى رصيدك الورقي',
    'A single KYC framework': 'إطار موحد لاعرف عميلك',
    'Native multi-chain settlement': 'تسوية أصلية متعددة السلاسل',
    'A network that never stops': 'شبكة لا تتوقف',
    'Instant reconciliation': 'مطابقة فورية',
    'Settle up to two days earlier': 'سوِّ مبكراً حتى يومين',
    'Liquidity': 'السيولة',
    'Unlock liquidity while keeping your position': 'أطلق السيولة مع الحفاظ على مركزك',

    /* FAQ page */
    'Frequently asked questions': 'الأسئلة الشائعة',
    'Banking built for the digital economy: save, earn and invest any time — 24/7, 365 days a year.': 'مصرفية للاقتصاد الرقمي: ادّخر واكسب واستثمر في أي وقت — على مدار الساعة، 365 يوماً في السنة.',
    'All (': 'الكل (',

    /* Get Access (contact) page */
    'Our team is ready to help.': 'فريقنا جاهز لمساعدتك.',
    'Send us a message': 'أرسل لنا رسالة',
    'Fill in the details below and we will get back to you shortly on personal or business banking.': 'املأ البيانات أدناه وسنعاود التواصل معك قريباً بخصوص الخدمات المصرفية للأفراد أو الأعمال.',
    'Full name *': 'الاسم الكامل *',
    'Email *': 'البريد الإلكتروني *',
    'Enquiry type': 'نوع الاستفسار',
    'Personal Banking': 'الخدمات المصرفية للأفراد',
    'Account opening': 'فتح حساب',
    'Open account': 'فتح حساب',
    'Country/Region': 'البلد/المنطقة',
    'Your question *': 'سؤالك *',
    'Submit': 'إرسال',
    'Thank you. We have received your message.': 'شكراً لك. لقد استلمنا رسالتك.',
    'This form is a static demo and sends no data to a server; replace it with a real endpoint when integrating a backend.': 'هذا النموذج عرض توضيحي ثابت ولا يرسل بيانات إلى أي خادم؛ استبدله بنقطة نهاية حقيقية عند الربط.',
    'Office address': 'عنوان المكتب',
    'Bahrain World Trade Center, West Tower, Isa Al-Kabeer Avenue, Manama, Bahrain': 'مركز البحرين العالمي للتجارة، البرج الغربي، شارع عيسى الكبير، المنامة، البحرين',
    'Apply and verify your identity online, with no branch visit. See the personal banking page for the onboarding steps and documents required.': 'قدّم الطلب وتحقق من هويتك عبر الإنترنت دون زيارة فرع. راجع صفحة الأفراد لخطوات فتح الحساب والمستندات المطلوبة.',
    'See what you need to open an account': 'اطلع على متطلبات فتح الحساب',

    /* FAQ categories (from data-faq.js) & dynamic UI strings */
    'Other': 'أخرى',
    'Security & Compliance': 'الأمان والامتثال',
    'Accounts & Onboarding': 'الحسابات وفتح الحساب',
    'Digital Assets': 'الأصول الرقمية',
    'Fees & Rates': 'الرسوم والمعدلات',
    'Payments & Transfers': 'المدفوعات والتحويلات',
    'Service & Support': 'الخدمة والدعم',
    'No matching questions. Try different keywords.': 'لا توجد أسئلة مطابقة. جرّب كلمات مفتاحية أخرى.',
    'Loading article…': 'جارٍ تحميل المقال…',
    'Read more →': 'اقرأ المزيد ←',

    /* aria-label / placeholder / title values */
    'Search FAQs': 'البحث في الأسئلة الشائعة',
    'Close article': 'إغلاق المقال',
    'Compliance document categories': 'تصنيفات مستندات الامتثال',
    'Search your question, e.g. licence, transfer, crypto…': 'ابحث عن سؤالك، مثال: ترخيص، تحويل، عملات رقمية…',
    'Briefly describe what you need…': 'صف احتياجك باختصار…',
    'Source: ': 'المصدر: '
  };
  dicts.ar = AR;
  /* Merge the external Arabic language pack (assets/js/i18n-ar.js), pack wins */
  if (window.AB_I18N_AR) {
    for (var k in window.AB_I18N_AR) AR[k] = window.AB_I18N_AR[k];
  }

  /* Dynamic strings with embedded numbers, e.g. "57 articles in total, showing 12" */
  PATTERNS = [
    [/^(\d+)\s+articles in total, showing\s+(\d+)$/, function (m) { return m[1] + ' مقالاً في المجموع، يُعرض ' + m[2]; }],
    [/^All \((\d+)\)$/, function (m) { return 'الكل (' + m[1] + ')'; }],
    [/^([\s\S]+) \((\d+)\)$/, function (m) { return translate(m[1]) + ' (' + m[2] + ')'; }]
  ];

  /* ---------------------------------------------------------------
   * 3. Engine
   * --------------------------------------------------------------- */
  var current = 'en';
  var applying = false;
  var SKIP_TAGS = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, CODE: 1, PRE: 1 };
  var ATTRS = ['aria-label', 'placeholder', 'title'];

  /* Original (English) content, kept so switching back to EN restores it */
  var textOrig = new Map();   /* text node -> original string   */
  var attrOrig = new Map();   /* element  -> { attr: original } */

  function langByCode(code) {
    for (var i = 0; i < LANGS.length; i++) if (LANGS[i].code === code) return LANGS[i];
    return null;
  }

  /* Resolve the dictionary for a language (untranslated strings fall back to English) */
  function dictFor(code) {
    return dicts[langByCode(code) ? code : 'en'] || {};
  }

  function translate(text) {
    if (current === 'en' || !text) return null;
    var t = text.trim();
    if (!t) return null;
    var hit = dictFor(current)[t];
    if (hit) return hit;
    for (var i = 0; i < PATTERNS.length; i++) {
      var m = t.match(PATTERNS[i][0]);
      if (m) return PATTERNS[i][1](m);
    }
    return null;
  }

  function replaceTextNode(node) {
    var raw = node.nodeValue;
    var hit = translate(raw);
    if (hit == null) return;
    if (!textOrig.has(node)) textOrig.set(node, raw);
    var lead = raw.match(/^\s*/)[0], trail = raw.match(/\s*$/)[0];
    var next = lead + hit + trail;
    if (next !== raw) node.nodeValue = next;
  }

  /* Restore the original English text (used when switching back to EN) */
  function restoreOriginals() {
    textOrig.forEach(function (orig, node) { if (node.nodeValue !== orig) node.nodeValue = orig; });
    textOrig.clear();
    attrOrig.forEach(function (attrs, el) {
      for (var a in attrs) el.setAttribute(a, attrs[a]);
    });
    attrOrig.clear();
  }

  function walkText(root) {
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        var p = n.parentNode;
        if (!p || SKIP_TAGS[p.nodeName]) return NodeFilter.FILTER_REJECT;
        if (p.closest && p.closest('[data-lang], [data-no-i18n]')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var nodes = [], n;
    while ((n = w.nextNode())) nodes.push(n);
    nodes.forEach(replaceTextNode);
  }

  function applyAttributes(root) {
    var sel = ATTRS.map(function (a) { return '[' + a + ']'; }).join(',');
    var els = root.querySelectorAll(sel);
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      for (var j = 0; j < ATTRS.length; j++) {
        var a = ATTRS[j], v = el.getAttribute(a);
        if (!v) continue;
        var hit = translate(v);
        if (hit != null && hit !== v) {
          if (!attrOrig.has(el)) attrOrig.set(el, {});
          var rec = attrOrig.get(el);
          if (!(a in rec)) rec[a] = v;
          el.setAttribute(a, hit);
        }
      }
    }
  }

  function apply() {
    if (applying) return;
    applying = true;
    try {
      var l = langByCode(current) || LANGS[0];
      var html = document.documentElement;
      html.setAttribute('lang', l.code.indexOf('-') > 0 ? l.code.split('-')[0] : l.code);
      html.setAttribute('dir', l.dir);
      /* Page <title> lives in <head>, outside the body walk */
      var tHit = translate(document.title);
      if (tHit != null) document.title = tHit;
      if (current === 'en') {
        restoreOriginals();
      } else {
        walkText(document.body);
        applyAttributes(document.body);
      }
      syncComponents();
    } finally {
      applying = false;
    }
  }

  /* Re-apply after dynamic rendering (FAQ list, article modal, forms…) */
  var pending = null;
  function scheduleApply() {
    if (applying) return;
    clearTimeout(pending);
    pending = setTimeout(apply, 80);
  }
  function observe() {
    if (!('MutationObserver' in window) || current === 'en') return;
    var mo = new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var t = muts[i].target;
        if (t && t.closest && t.closest('[data-lang]')) continue; /* ignore our own UI */
        scheduleApply();
        return;
      }
    });
    mo.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  /* ---------------------------------------------------------------
   * 4. Persistence
   * --------------------------------------------------------------- */
  function saveLang(code) {
    try { localStorage.setItem(STORAGE_KEY, code); } catch (e) {}
    document.cookie = STORAGE_KEY + '=' + encodeURIComponent(code) +
      ';path=/;max-age=31536000;samesite=lax';
  }
  function loadLang() {
    /* legacy values such as 'ar-BH' from earlier versions normalise to 'ar' */
    function norm(v) {
      if (!v) return null;
      v = decodeURIComponent(v);
      if (langByCode(v)) return v;
      if (v.indexOf('ar') === 0) return 'ar';
      return null;
    }
    try {
      var ls = norm(localStorage.getItem(STORAGE_KEY));
      if (ls) return ls;
    } catch (e) {}
    var m = document.cookie.match(/(?:^|; )ab_lang=([^;]*)/);
    if (m) { var c = norm(m[1]); if (c) return c; }
    return 'en';
  }

  /* ---------------------------------------------------------------
   * 5. Dropdown component (injected into [data-lang-slot])
   *    Keyboard: Enter/Space open, ArrowUp/Down move, Home/End jump,
   *    Enter/Space select, Esc close, click outside closes.
   * --------------------------------------------------------------- */
  var GLOBE = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.5 2.6 3.8 5.7 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.7-3.8-9S9.5 5.6 12 3z"/></svg>';
  var CHEVRON = '<svg class="lang__chev" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
  var CHECK = '<svg class="lang__check" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10"/></svg>';

  var components = [];

  function buildComponent(slot) {
    var root = document.createElement('div');
    root.className = 'lang' + (slot.className.indexOf('lang--drawer') > -1 ? ' lang--drawer' : '');
    root.setAttribute('data-lang', '');

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'lang__btn';
    btn.setAttribute('aria-haspopup', 'listbox');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', 'Language');
    btn.innerHTML = GLOBE + '<span class="lang__code">EN</span>' + CHEVRON;

    var menu = document.createElement('ul');
    menu.className = 'lang__menu';
    menu.setAttribute('role', 'listbox');
    menu.setAttribute('aria-label', 'Language');
    menu.hidden = true;

    LANGS.forEach(function (l) {
      var li = document.createElement('li');
      li.setAttribute('role', 'option');
      li.className = 'lang__option';
      li.setAttribute('data-lang-option', l.code);
      li.tabIndex = -1;
      li.innerHTML = '<span class="lang__native">' + l.label + '</span>' +
        '<span class="lang__badge">' + l.short + '</span>' + CHECK;
      menu.appendChild(li);
    });

    root.appendChild(btn);
    root.appendChild(menu);
    slot.replaceWith(root);

    var comp = { root: root, btn: btn, menu: menu };
    bind(comp);
    components.push(comp);
    return comp;
  }

  function open(comp) {
    comp.menu.hidden = false;
    comp.btn.setAttribute('aria-expanded', 'true');
    comp.root.classList.add('is-open');
    var sel = comp.menu.querySelector('[aria-selected="true"]') || comp.menu.firstChild;
    focusOption(comp, sel);
  }
  function close(comp, refocus) {
    comp.menu.hidden = true;
    comp.btn.setAttribute('aria-expanded', 'false');
    comp.root.classList.remove('is-open');
    if (refocus) comp.btn.focus();
  }
  function focusOption(comp, li) {
    var items = Array.prototype.slice.call(comp.menu.children);
    items.forEach(function (o) { o.classList.remove('is-active'); });
    li.classList.add('is-active');
    li.focus();
  }
  function moveFocus(comp, dir) {
    var items = Array.prototype.slice.call(comp.menu.children);
    var idx = items.indexOf(document.activeElement);
    var next = items[Math.min(items.length - 1, Math.max(0, idx + dir))] || items[0];
    focusOption(comp, next);
  }

  function bind(comp) {
    comp.btn.addEventListener('click', function () {
      comp.menu.hidden ? open(comp) : close(comp, false);
    });
    comp.btn.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (comp.menu.hidden) open(comp);
        else moveFocus(comp, e.key === 'ArrowDown' ? 1 : -1);
      }
    });
    comp.menu.addEventListener('keydown', function (e) {
      var items = Array.prototype.slice.call(comp.menu.children);
      var idx = items.indexOf(document.activeElement);
      switch (e.key) {
        case 'ArrowDown': e.preventDefault(); moveFocus(comp, 1); break;
        case 'ArrowUp': e.preventDefault(); moveFocus(comp, -1); break;
        case 'Home': e.preventDefault(); focusOption(comp, items[0]); break;
        case 'End': e.preventDefault(); focusOption(comp, items[items.length - 1]); break;
        case 'Enter': case ' ':
          e.preventDefault();
          if (document.activeElement && document.activeElement.getAttribute('data-lang-option')) {
            setLang(document.activeElement.getAttribute('data-lang-option'));
          }
          close(comp, true);
          break;
        case 'Escape': case 'Tab':
          close(comp, e.key === 'Escape');
          break;
      }
    });
    comp.menu.addEventListener('click', function (e) {
      var li = e.target.closest('[data-lang-option]');
      if (!li) return;
      setLang(li.getAttribute('data-lang-option'));
      close(comp, true);
    });
  }

  document.addEventListener('click', function (e) {
    components.forEach(function (c) {
      if (!c.menu.hidden && !c.root.contains(e.target)) close(c, false);
    });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    components.forEach(function (c) { if (!c.menu.hidden) close(c, true); });
  });

  function syncComponents() {
    components.forEach(function (c) {
      var l = langByCode(current) || LANGS[0];
      c.btn.querySelector('.lang__code').textContent = l.short;
      Array.prototype.forEach.call(c.menu.children, function (li) {
        li.setAttribute('aria-selected', li.getAttribute('data-lang-option') === current ? 'true' : 'false');
      });
    });
  }

  /* ---------------------------------------------------------------
   * 6. Public switch + bootstrap
   * --------------------------------------------------------------- */
  function setLang(code) {
    if (!langByCode(code) || code === current) return;
    current = code;
    saveLang(code);
    apply();
    observe(); /* start watching the DOM once a non-English language is active */
  }
  window.AplenBaruchI18N = { setLang: setLang, apply: apply, langs: LANGS };

  function init() {
    current = loadLang();
    document.querySelectorAll('[data-lang-slot]').forEach(buildComponent);
    apply();
    observe();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
