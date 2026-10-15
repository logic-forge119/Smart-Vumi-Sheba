'use strict';
let currentReport=null;
function identityLabel(id){return LandDemo.citizens.find(c=>c.id===id)?.label||'পরিচয় অজানা'}
function showVerification(value=''){
 currentReport=null;
 $('modalBody').innerHTML=`${demoNote()}<div class="verify-intro"><div><span class="overline">P5 · CITIZEN PRE-PURCHASE VERIFICATION</span><h3 style="margin:7px 0">কেনার আগে তথ্যের মিল দেখুন</h3><p class="sub">এই নমুনা পরীক্ষা মালিকানা অনুমোদন নয়। প্রতিটি সংকেতের নথি ও কারণ দেখুন।</p></div></div><div class="scenario-grid">${LandDemo.scenarios.map((s,i)=>`<button class="scenario" onclick="loadScenario(${i})"><strong>${s.label} · খতিয়ান ${bn(s.record)}</strong><small>${s.summary}</small></button>`).join('')}</div><form class="verify-form" onsubmit="event.preventDefault();healthCheck()"><div class="form-grid"><div><label for="healthNo">খতিয়ান অথবা দাগ নম্বর</label><input id="healthNo" required placeholder="১২৩৪ বা দাগ ১২০৪" value="${esc(value)}"></div><div><label for="sellerIdentity">প্রস্তাবিত বিক্রেতা · কৃত্রিম পরিচয়</label><select id="sellerIdentity"><option value="">পরিচয় দেওয়া হয়নি</option>${LandDemo.citizens.map(c=>`<option value="${c.id}">${c.label}</option>`).join('')}</select></div></div><p class="sub" style="margin-top:8px">ডেমোর নির্দিষ্ট এলাকা: ঢাকা → সাভার → আশুলিয়া। বাস্তব নাম, পরিচয়পত্র বা নথি দেওয়া যায় না।</p><div class="form-actions"><button class="btn">${icon('shield')} নমুনা যাচাই করুন</button><button type="button" class="btn light" onclick="showSavedReports()">সংরক্ষিত রিপোর্ট</button></div></form><div id="healthResult" aria-live="polite"></div><details class="faq verification-explainer"><summary>এই যাচাই কীভাবে কাজ করে?</summary><p>কৃত্রিম পরিচয় দিয়ে খতিয়ান, সর্বশেষ দলিল ও নামজারি মিলিয়ে দেখা হয়। একই মৌজা, জরিপ ও দাগের পূর্ণ প্লটের হস্তান্তর ধারাবাহিকতা পরীক্ষা করা হয়। মামলা, বন্ধক, খাস, অর্পিত ও অধিগ্রহণের চিহ্ন আলাদাভাবে দেখা হয়। তথ্য না থাকলে “অজানা” দেখানো হয়। আংশিক জমি বিক্রি বা সব আইনি পরিস্থিতির সিদ্ধান্ত এই ডেমো দেয় না।</p></details>`;
 if(value)healthCheck();
}
function loadScenario(i){const s=LandDemo.scenarios[i];if(!s)return;$('healthNo').value=s.record;$('sellerIdentity').value=s.sellerId;healthCheck()}
async function healthCheck(){
  const q=norm($('healthNo').value.trim());
  if(!q){currentReport=null;$('healthResult').innerHTML='';return}
  const seller=$('sellerIdentity').value;
  $('healthResult').innerHTML='<div class="empty">সার্ভারে যাচাইয়ের অনুরোধ পাঠানো হচ্ছে…</div>';
  try {
    const res=await BhumiApi.verify({record_id:q,seller_id:seller||undefined});
    currentReport=res.report;
    currentReport.id=res.id;
    $('healthResult').innerHTML=renderVerificationReport(currentReport);
  } catch(err){
    if(window.LandDemo&&window.LandVerification){
      const r=records.find(x=>x.id===q||x.plot===q);
      if(r){
        currentReport={...LandVerification.evaluate(r,seller,LandDemo),generatedAt:new Date().toISOString(),id:'OFFLINE-'+Date.now(),disclaimer:'সার্ভার সংযোগ অনুপস্থিত — এটি ব্রাউজারের অফলাইন নমুনা; সার্ভার রিপোর্ট নয়।'};
        $('healthResult').innerHTML='<p class="note">⚠️ সার্ভার অফলাইন: ব্রাউজারের স্থানীয় ডেমো দেখানো হচ্ছে (সার্ভার যাচাই নয়)।</p>'+renderVerificationReport(currentReport);
        return;
      }
    }
    currentReport=null;
    $('healthResult').innerHTML=`<div class="empty">যাচাই ব্যর্থ হয়েছে: ${esc(err.message||'সার্ভার সংযোগ পাওয়া যায়নি।')}</div>`;
  }
}
function renderVerificationReport(report,saved=false){
 const state={pass:'মিল / চিহ্ন নেই',fail:'সতর্কতা',unknown:'তথ্য নেই'};
 const title={attention:'সতর্কতার সংকেত পাওয়া গেছে',incomplete:'সম্পূর্ণ যাচাইয়ের তথ্য নেই',consistent:'পরিচিত নমুনা তথ্যের মধ্যে অমিল পাওয়া যায়নি'};
 const explanation={attention:'নিচের অমিল ও সীমাবদ্ধতা পর্যালোচনা করুন। এটি প্রতারণার চূড়ান্ত সিদ্ধান্ত নয়।',incomplete:'অজানা বিষয়কে ঝুঁকিমুক্ত বলা যায় না। প্রয়োজনীয় নথি সংগ্রহ না করে সিদ্ধান্ত নেবেন না।',consistent:'শুধু উপলব্ধ কৃত্রিম ডেটার ফলাফল। বাস্তব জমি নিরাপদ বা কেনার উপযোগী ঘোষণা করা হয়নি।'};
 const r=report.record;
 return `<div class="result" id="verificationReport"><span class="badge">কৃত্রিম ডেটার রিপোর্ট · ${esc(report.datasetVersion)}</span><h3 style="margin-top:12px">খতিয়ান ${bn(r.id)} · দাগ ${bn(r.plot)} · ${esc(r.survey)}</h3><p class="sub">${esc(r.mouza)}, ${esc(r.upazila)}, ${esc(r.district)} · ${bn(r.area)} শতক</p><div class="outcome ${esc(report.outcome)}" style="margin-top:17px"><h3>${title[report.outcome]}</h3><p style="margin:0;font-size:13px">${explanation[report.outcome]}</p></div><div class="report-stats"><span>মিল / চিহ্ন নেই: ${bn(report.counts.pass)}</span><span>সতর্কতা: ${bn(report.counts.fail)}</span><span>অজানা: ${bn(report.counts.unknown)}</span></div><p class="sub">রেকর্ডীয় পরিচয়: ${esc(identityLabel(r.ownerId))}<br>প্রস্তাবিত বিক্রেতা: ${report.sellerId?esc(identityLabel(report.sellerId)):'নির্বাচন করা হয়নি'}</p><div class="report-anchor"><button class="btn light small" onclick="$('reportChecks').scrollIntoView({block:'start'})">পরীক্ষার কারণ ↓</button><button class="btn light small" onclick="$('reportHistory').scrollIntoView({block:'start'})">মালিকানার ইতিহাস ↓</button></div><h3 style="margin-top:22px" id="reportChecks">যাচাইয়ের ফলাফল ও প্রমাণ</h3><div class="checks">${report.checks.map(c=>`<div class="check-row ${esc(c.state)}"><div><strong>${esc(c.label)}</strong><span class="check-detail">${esc(c.detail)}</span><span class="report-source">নমুনা উৎস: ${esc(c.evidence.length?c.evidence.join(' · '):'উপলব্ধ নয়')}</span></div><span class="state-pill">${state[c.state]}</span></div>`).join('')}</div><h3 style="margin-top:25px" id="reportHistory">নমুনা দলিল ও নামজারির ইতিহাস</h3><div class="history-grid"><div class="panel"><strong>দলিল রেজিস্ট্রি</strong>${report.deeds.length?report.deeds.map(d=>`<div class="history-entry"><strong>${esc(d.id)}</strong>${esc(d.date)} · পূর্ণ প্লট ${bn(d.area)} শতক<br>${esc(identityLabel(d.sellerId))} → ${esc(identityLabel(d.buyerId))}<br><span class="report-source">${esc(d.source)}</span></div>`).join(''):'<p class="sub">দলিলের তথ্য নেই।</p>'}</div><div class="panel"><strong>নামজারি রেজিস্ট্রি</strong>${report.mutations.length?report.mutations.map(m=>`<div class="history-entry"><strong>${esc(m.id)}</strong>${esc(m.date)} · ${m.status==='completed'?'সম্পন্ন':'চলমান'}<br>${esc(identityLabel(m.ownerId))}<br>সংযুক্ত দলিল: ${esc(m.deedId)}<br><span class="report-source">${esc(m.source)}</span></div>`).join(''):'<p class="sub">নামজারির তথ্য নেই।</p>'}</div></div>${report.status?.pendingCases?.length?`<h3 style="margin-top:20px">নমুনা মামলার তথ্য</h3>${report.status.pendingCases.map(c=>`<p class="warning">${esc(c.id)} · ${esc(c.label)} · ${c.state==='pending'?'চলমান':'নিষ্পন্ন'}</p>`).join('')}`:''}<div class="note"><strong>পরবর্তী করণীয়</strong><br>${report.counts.fail?'যে বিষয়ে সতর্কতা আছে, তার দলিল ও রেকর্ডের অমিল ব্যাখ্যা এবং কর্তৃপক্ষের যাচাই সংগ্রহ করুন। ':''}${report.counts.unknown?'অজানা তথ্যের জন্য প্রয়োজনীয় রেকর্ড সংগ্রহ করুন। ':''}বাস্তব লেনদেনের আগে প্রাসঙ্গিক নথি ও কর্তৃপক্ষের সহায়তায় সম্পূর্ণ যাচাই প্রয়োজন।</div><p class="report-source">ডেটা উৎস: দল-প্রস্তুত কৃত্রিম dataset · নমুনার snapshot ${esc(report.asOf)}<br>রিপোর্ট তৈরি: ${new Date(report.generatedAt).toLocaleString('bn-BD')}<br>রেফারেন্স: ${esc(report.id)}</p><p class="warning">${esc(report.disclaimer)}</p><div class="form-actions"><button class="btn" onclick="window.print()">প্রিন্ট / PDF হিসেবে সংরক্ষণ</button><button class="btn light" onclick="downloadVerification()">JSON রিপোর্ট</button>${!saved?'<button class="btn light" onclick="saveVerification()">অফলাইনে সংরক্ষণ</button>':''}</div></div>`;
}
async function saveVerification(){if(!currentReport)return toast('আগে নমুনা যাচাই করুন।');try{await storeRow('reports',structuredClone(currentReport));toast('রিপোর্ট এই ডিভাইসে সংরক্ষিত।')}catch{toast('রিপোর্ট সংরক্ষণ করা যায়নি। JSON ব্যাকআপ ব্যবহার করুন।')}}
function downloadVerification(){if(!currentReport)return;const url=URL.createObjectURL(new Blob([JSON.stringify(currentReport,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`bhumi-demo-report-${currentReport.record.id}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
async function showSavedReports(){
  activeModule='reports';
  $('modalTitle').textContent='সংরক্ষিত নমুনা রিপোর্ট';
  $('modalBody').innerHTML='<p>রিপোর্ট লোড হচ্ছে…</p>';
  try {
    let list=[];
    try {
      const serverRes=await BhumiApi.getReports();
      if(serverRes?.items?.length){
        list=serverRes.items;
      }
    } catch(e){}
    if(!list.length){
      list=await rows('reports');
    }
    if(activeModule!=='reports')return;
    $('modalBody').innerHTML=demoNote()+`${list.length?list.sort((a,b)=>b.generatedAt.localeCompare(a.generatedAt)).map(r=>`<div class="saved-row"><span><strong>খতিয়ান ${bn(r.record.id)} · দাগ ${bn(r.record.plot)}</strong><small>${new Date(r.generatedAt).toLocaleString('bn-BD')} · সতর্কতা ${bn(r.counts.fail)} / অজানা ${bn(r.counts.unknown)}</small></span><span><button class="btn light small" onclick="readSavedReport('${esc(r.id)}')">দেখুন</button> <button class="close" onclick="deleteSavedReport('${esc(r.id)}')" aria-label="রিপোর্ট মুছুন">×</button></span></div>`).join(''):'<div class="empty">সংরক্ষিত রিপোর্ট নেই। যাচাই করে “অফলাইনে সংরক্ষণ” চাপুন।</div>'}<div class="form-actions"><button class="btn" onclick="openModule('health')">নতুন যাচাই</button><button class="btn light" onclick="openModule('drafts')">আমার খসড়া</button></div>`;
  } catch(err){
    $('modalBody').innerHTML='<div class="empty">রিপোর্ট পড়া সম্ভব হয়নি।</div>';
  }
}
async function readSavedReport(id){try{const r=(await rows('reports')).find(r=>r.id===id);if(!r)return toast('রিপোর্ট পাওয়া যায়নি।');currentReport=r;activeModule='reports';$('modalTitle').textContent='সংরক্ষিত নমুনা যাচাই রিপোর্ট';$('modalBody').innerHTML=renderVerificationReport(r,true)+'<div class="form-actions"><button class="btn light" onclick="showSavedReports()">← সংরক্ষিত রিপোর্ট</button></div>'}catch{toast('রিপোর্ট খোলা যায়নি।')}}
async function deleteSavedReport(id){if(!confirm('এই ডিভাইস থেকে রিপোর্টটি মুছবেন?'))return;try{await deleteRow('reports',id);showSavedReports()}catch{toast('রিপোর্ট মুছতে ব্যর্থ।')}}
// Existing services stay intact; put the primary P5 tool first in the same card grid.
const verifyIndex=services.findIndex(s=>s[0]==='health');services.unshift(services.splice(verifyIndex,1)[0]);renderServices();
const originalShowDrafts=showDrafts;showDrafts=async function(){await originalShowDrafts();if(activeModule==='drafts')$('modalBody').insertAdjacentHTML('beforeend','<div class="form-actions"><button class="btn light" onclick="showSavedReports()">অফলাইনে সংরক্ষিত যাচাই রিপোর্ট →</button></div>')};
if(location.hash==='#verify')openModule('health');
