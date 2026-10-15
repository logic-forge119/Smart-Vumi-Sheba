# CSP & Inline Handlers Dependency Audit

## ১. সারসংক্ষেপ (Executive Summary)
বর্তমান প্রোজেক্টে `_headers` ফাইলে নিচের CSP নীতি রয়েছে:
```http
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://*.supabase.co; frame-ancestors 'none';
```
**গুরুত্বপূর্ণ সতর্কতা:** `script-src` এবং `style-src`-এ `'unsafe-inline'` থাকার কারণে এই অবস্থাকে **"Strict Security Complete" দাবি করা যাবে না**। কারণ `'unsafe-inline'` ব্রাউজারকে যেকোনো ইনলাইন স্ক্রিপ্ট বা ডম-ইঞ্জেক্ট করা ইভেন্ট হ্যান্ডলার এক্সিকিউট করতে অনুমতি দেয়, যা ক্লাসিক্যাল XSS আক্রমণের সম্পূর্ণ প্রতিরোধ নিশ্চিত করতে পারে না।

---

## ২. বর্তমান ইনলাইন হ্যান্ডলার অডিট (Dependency Inventory)

### ক. `index.html`-এ সরাসরি থাকা ইনলাইন হ্যান্ডলারসমূহ:
1. `line 6`: `<button onclick="toggleContrast()">`
2. `line 7`: `<a href="#verify" onclick="openModule('health');return false">`
3. `line 7`: `<button onclick="toggleLang()" id="langButton">`
4. `line 7`: `<button onclick="openModule('drafts')">`
5. `line 8`: `<form onsubmit="event.preventDefault();globalSearch()">`
6. `line 8`: `<button class="voice" onclick="openModule('voice')">`
7. `line 8`: `<button onclick="sampleSearch('1234')">`
8. `line 8`: `<button onclick="sampleSearch('MUT-2026-8849')">`
9. `line 8`: `<button onclick="openModule('health','1234')">`
10. `line 11`: `<button onclick="openModule('wizard')">`
11. `line 11`: `<button onclick="openModule('fees')">`
12. `line 12`: `<button id="installBtn" onclick="installApp()">`
13. `line 13`: `<button onclick="openModule('bot')">`
14. `line 14`: `<a onclick="openModule('records');return false">`
15. `line 14`: `<a onclick="openModule('tracker');return false">`
16. `line 14`: `<a onclick="openModule('drafts');return false">`
17. `line 14`: `<a onclick="openModule('udc');return false">`
18. `line 14`: `<button class="float-voice" onclick="openModule('voice')">`
19. `line 14`: `<button class="close" onclick="closeModal()">`

### খ. `app.js` ও `verification-ui.js`-এ ডাইনামিক `innerHTML`-এ ইনজেক্ট করা হ্যান্ডলারসমূহ:
1. মডালের ভেতরে ফরম ও বাটন: `onclick="submitRecordsForm()"`, `onclick="copyReportAnchor()"` ইত্যাদি।
2. ভেরিফিকেশন আউটকাম স্ক্রিনে রি-রান বাটন।
3. মানচিত্রের দাগ ক্লিক ইভেন্ট।

---

## ৩. স্ট্রিক্ট CSP ট্রানজিশন রোডম্যাপ (Migration Path to Strict CSP)
ভবিষ্যতে `'unsafe-inline'` সম্পূর্ণ বাদ দিয়ে `script-src 'self'` বা Nonce-based CSP প্রয়োগ করতে নিচের ৩টি ধাপ সম্পন্ন করতে হবে:

1. **ইভেন্ট ডেলিগেশন (Event Delegation):**
   ইনলাইন `onclick="openModule('health')"`-এর বদলে ডিক্লারেটিভ অ্যাট্রিবিউট ব্যবহার:
   ```html
   <button data-action="open-module" data-module="health">
   ```
   এবং সেন্ট্রাল লিসেনার:
   ```javascript
   document.addEventListener('click', (e) => {
     const target = e.target.closest('[data-action]');
     if (!target) return;
     const action = target.getAttribute('data-action');
     if (action === 'open-module') {
       openModule(target.getAttribute('data-module'));
     }
   });
   ```

2. **ইনলাইন স্টাইল বাদ দেওয়া বা হ্যাশ যুক্ত করা:**
   `style="display:none"` ইত্যাদির জায়গায় ডেডিকেটেড CSS ক্লাস (যেমন `.hidden`) ব্যবহার করা।

3. **Strict CSP কনফিগারেশন:**
   ```http
   Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self' https://*.supabase.co; frame-ancestors 'none';
   ```

---

## ৪. সিদ্ধান্ত ও বর্তমান স্ট্যাটাস
- বর্তমান স্ট্যাটাস: **Functional Prototype with Scoped CSP (Not Strict Complete)**
- বর্তমান CSP `connect-src` রেস্ট্রিক্ট করেছে (শুধু 'self' এবং Supabase domain অনুমোদিত), `frame-ancestors 'none'` দিয়ে ক্লিকজ্যাকিং ঠেকিয়েছে এবং `nosniff` সক্রিয় রেখেছে।
- কিন্তু যতক্ষণ পর্যন্ত ইনলাইন হ্যান্ডলারগুলো সম্পূর্ণ ইভেন্ট ডেলিগেশনে রূপান্তর না হচ্ছে, ততক্ষণ ব্রাউজারকে ফাংশনাল রাখার জন্য `'unsafe-inline'` বজায় রাখা অপরিহার্য। এটি সিস্টেমের সততাপূর্ণ সিকিউরিটি মূল্যায়ন।
