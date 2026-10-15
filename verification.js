'use strict';
// Deterministic checks over supplied datasets; no hard-coded per-scenario outcome.
const LandVerification = (() => {
  const key=r=>[r.district||'',r.upazila||'',r.mouza||'',r.survey||'',String(r.plot)].join('|');
  const plotMatch=(a,b)=>key(a)===key(b);
  function evaluate(record,sellerId,data){
    const deeds=data.transfers.filter(t=>plotMatch(t,record)&&t.status==='registered').slice().sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
    const muts=data.mutations.filter(m=>plotMatch(m,record)).slice().sort((a,b)=>a.date.localeCompare(b.date));
    const status=data.status.find(s=>plotMatch(s,record));
    const latestDeed=deeds.at(-1),latestMut=muts.at(-1),checks=[];
    const add=(id,label,state,detail,evidence=[])=>checks.push({id,label,state,detail,evidence});
    add('seller','প্রস্তাবিত বিক্রেতা ↔ খতিয়ান',sellerId?record.ownerId===sellerId?'pass':'fail':'unknown',sellerId?(record.ownerId===sellerId?'ডেমো বিক্রেতার পরিচয় খতিয়ানের রেকর্ডীয় পরিচয়ের সঙ্গে মিলে।':'ডেমো বিক্রেতার পরিচয় রেকর্ডীয় পরিচয়ের সঙ্গে মেলে না।'):'প্রস্তাবিত বিক্রেতা নির্বাচন করা হয়নি।',[`খতিয়ান ${record.id} (${record.survey})`,...(sellerId?[`ডেমো পরিচয় ${sellerId}`]:[])]);
    add('deed-owner','দলিলের ক্রেতা ↔ খতিয়ান',latestDeed?latestDeed.buyerId===record.ownerId?'pass':'fail':'unknown',latestDeed?(latestDeed.buyerId===record.ownerId?'সর্বশেষ কৃত্রিম দলিলের ক্রেতা ও খতিয়ানের পরিচয় একই।':'সর্বশেষ কৃত্রিম দলিলের ক্রেতা খতিয়ানের পরিচয় থেকে আলাদা।'):'এই প্লটের দলিলের তথ্য নেই।',latestDeed?[latestDeed.id,`খতিয়ান ${record.id}`]:[]);
    const mutState=!latestMut||!latestDeed?'unknown':latestMut.status!=='completed'?'fail':latestMut.ownerId!==latestDeed.buyerId||latestMut.deedId!==latestDeed.id?'fail':'pass';
    add('mutation','দলিল ↔ নামজারি',mutState,!latestMut?'নামজারি রেকর্ড নেই।':!latestDeed?'দলিল নেই; নামজারি মিল যাচাই করা যায়নি।':latestMut.status!=='completed'?'নামজারি এখনো চলমান; রেজিস্ট্রেশনের সঙ্গে সম্পূর্ণ মিল নিশ্চিত হয়নি।':mutState==='pass'?'সম্পন্ন নামজারি একই দলিল ও ক্রেতার সঙ্গে যুক্ত।':'সম্পন্ন নামজারির দলিল বা পরিচয়ে অমিল।',[...(latestDeed?[latestDeed.id]:[]),...(latestMut?[latestMut.id]:[])]);
    const conflicts=[];
    for(let i=0;i<deeds.length;i++)for(let j=i+1;j<deeds.length;j++){const a=deeds[i],b=deeds[j];if(a.areaScope==='full'&&b.areaScope==='full'&&a.sellerId===b.sellerId&&a.buyerId!==b.buyerId){const reacquired=deeds.slice(i+1,j).some(t=>t.buyerId===a.sellerId);if(!reacquired)conflicts.push([a.id,b.id]);}}
    const chainBreaks=deeds.slice(1).filter((t,i)=>t.sellerId!==deeds[i].buyerId);
    add('double-sale','একই প্লটের হস্তান্তর ধারাবাহিকতা',!deeds.length?'unknown':conflicts.length||chainBreaks.length?'fail':'pass',!deeds.length?'হস্তান্তরের ইতিহাস নেই।':conflicts.length?'একই বিক্রেতা পুনরায় মালিকানা পাওয়ার রেকর্ড ছাড়া একই পূর্ণ প্লট পৃথক ক্রেতাকে হস্তান্তর করেছেন—সম্ভাব্য দ্বৈত বিক্রির সংকেত।':chainBreaks.length?'পরের দলিলের বিক্রেতা আগের দলিলের ক্রেতার সঙ্গে মেলে না।':'উপলব্ধ নমুনা হস্তান্তরে ধারাবাহিকতার অমিল পাওয়া যায়নি।',[...new Set([...conflicts.flat(),...chainBreaks.map(t=>t.id),...(conflicts.length||chainBreaks.length?[]:deeds.map(t=>t.id))])]);
    for(const [field,id,label,reason] of [['mortgage','mortgage','বন্ধক / দায়','নমুনা রেজিস্ট্রিতে সক্রিয় বন্ধক আছে।'],['khas','khas','খাস জমি','নমুনা রেজিস্ট্রিতে খাস হিসেবে চিহ্নিত।'],['vested','vested','অর্পিত সম্পত্তি','নমুনা রেজিস্ট্রিতে অর্পিত হিসেবে চিহ্নিত।'],['acquisition','acquisition','অধিগ্রহণ','নমুনা রেজিস্ট্রিতে অধিগ্রহণের চিহ্ন আছে।']]){const val=status?.[field];add(id,label,val===true?'fail':val===false?'pass':'unknown',val===true?reason:val===false?'নমুনা রেজিস্ট্রিতে এই চিহ্ন নেই।':'এই বিষয়ে তথ্য নেই; ঝুঁকিমুক্ত বলা যায় না।',status?[status.id]:[])}
    const litigation=status?.pendingCases;
    add('cases','চলমান মামলা',Array.isArray(litigation)?litigation.some(c=>c.state==='pending')?'fail':'pass':'unknown',Array.isArray(litigation)?litigation.some(c=>c.state==='pending')?'নমুনায় চলমান মামলা পাওয়া গেছে।':'উপলব্ধ নমুনায় চলমান মামলা নেই।':'মামলার তথ্য নেই।',Array.isArray(litigation)?[status.id,...litigation.map(c=>c.id)]:[]);
    add('tax','কর / দাখিলা',status?.taxPaid===true?'pass':status?.taxPaid===false?'fail':'unknown',status?.taxPaid===true?'নমুনায় কর হালনাগাদ।':status?.taxPaid===false?'নমুনায় কর বকেয়া।':'করের তথ্য নেই।',status?[status.id]:[]);
    const counts={pass:checks.filter(c=>c.state==='pass').length,fail:checks.filter(c=>c.state==='fail').length,unknown:checks.filter(c=>c.state==='unknown').length};
    const outcome=counts.fail?'attention':counts.unknown?'incomplete':'consistent';
    return {record,sellerId,checks,counts,outcome,deeds,mutations:muts,status:status||null,conflicts,scopeKey:key(record),datasetVersion:data.version,asOf:data.asOf};
  }
  return {evaluate};
})();
