# Smart Bhumi Seba — Backend implementation resources
প্রস্তুত: ১৫ অক্টোবর ২০২৬। এই ZIP একটি implementation specification ও reference package; তৈরি backend নয়।

## কীভাবে ব্যবহার করবে
১. ZIP extract করে তোমার বর্তমান website repository-এর `resources/backend/` ফোল্ডারে রাখো। ZIP-এর ভিতরের পুরোনো website দিয়ে বর্তমান project overwrite করবে না।
২. Antigravity-তে পুরো repository open করো। `ANTIGRAVITY_MASTER_PROMPT.md`-এর পুরো লেখা agent-কে দাও।
৩. Agent প্রথমে project audit করবে, তারপর পর্যায়ক্রমে backend implement ও test করবে। বর্তমান সবুজ-সাদা UI, navigation ও service cards বজায় থাকবে।
৪. Supabase project ও Netlify account-এর setup যেগুলো তোমাকেই করতে হবে, `docs/09_SETUP_DEPLOYMENT.md`-এ দেওয়া আছে। Secret শুধু provider dashboard/local ignored env-তে দেবে, chat বা source code-এ নয়।
৫. Agent-এর phase completion evidence ও actual tests দেখবে। শুধু “done” লেখা গ্রহণ করবে না।

## প্যাকেজে কী আছে
- Audit: বর্তমান ZIP-এ কী আছে, backend কেন নেই।
- PRD, TRD, architecture, user/data flows এবং P1–P6 scope।
- Relational database reference SQL, RLS/access design, migration instructions ও fixture mapping।
- OpenAPI 3.0 JSON contract: endpoints, inputs, outputs, auth, errors।
- Verification rules, privacy/security requirements, offline sync design।
- Phase-by-phase tasks, acceptance tests, deployment/rollback, team handover।
- আগের deploy ZIP-এর static source snapshot, audit context হিসেবে।

## বাস্তব সীমাবদ্ধতা
Supabase/Netlify project, credentials, database migration এবং hosting setup এখনো করা হয়নি। Account/project access ছাড়া Antigravity এগুলো নিজে তৈরি বা configure করতে নাও পারবে। Free tier/quotas বদলাতে পারে; pricing guarantee নেই। Backend থাকার অর্থ সরকারি রেকর্ড সংযুক্ত বা সরকারি মালিকানা যাচাই হওয়া নয়।

এই package-এর SQL একটি starting design: local disposable Supabase-এ validate করে migration-এ রূপান্তর করবে। RPC/transaction handlers, seed importer ও tests agent-কে implement করতে হবে; এখানে সেগুলো implemented বলে দাবি করা হয়নি।
