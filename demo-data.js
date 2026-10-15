'use strict';
// Entirely synthetic fixtures authored for this prototype. These are not land records.
const LandDemo = (() => {
  const base={division:'ঢাকা',district:'ঢাকা',upazila:'সাভার',mouza:'আশুলিয়া'};
  const identity=(id)=>({id,label:'ডেমো নাগরিক '+id});
  const citizens=['C01','C02','C03','C04','C05','C06'].map(identity);
  const make=(r)=>({...base,...r,owner:citizens.find(c=>c.id===r.ownerId).label});
  const records=[
    make({id:'1234',plot:'1204',survey:'BS',ownerId:'C02',area:8.75,land:'আবাসিক',tax:'হালনাগাদ',mutation:'সম্পন্ন'}),
    make({id:'5678',plot:'1205',survey:'RS',ownerId:'C03',area:10.2,land:'কৃষি',tax:'বকেয়া',mutation:'চলমান'}),
    make({id:'9012',plot:'1206',survey:'BS',ownerId:'C05',area:6.5,land:'কৃষি',tax:'হালনাগাদ',mutation:'সম্পন্ন'}),
    make({id:'3456',plot:'1207',survey:'BS',ownerId:'C06',area:12,land:'আবাসিক',tax:'অজানা',mutation:'অজানা'})
  ];
  const common={mouza:'আশুলিয়া',survey:'BS',areaScope:'full',status:'registered',source:'কৃত্রিম দলিল রেজিস্ট্রি'};
  const transfers=[
    {...common,id:'DEMO-D001',plot:'1204',sellerId:'C01',buyerId:'C02',date:'2025-04-10',area:8.75},
    {...common,id:'DEMO-D002',plot:'1205',survey:'RS',sellerId:'C01',buyerId:'C03',date:'2025-06-01',area:10.2},
    {...common,id:'DEMO-D003',plot:'1205',survey:'RS',sellerId:'C01',buyerId:'C04',date:'2025-06-05',area:10.2},
    {...common,id:'DEMO-D004',plot:'1206',sellerId:'C01',buyerId:'C05',date:'2025-02-15',area:6.5}
  ];
  const mutations=[
    {id:'MUT-2026-1021',plot:'1204',survey:'BS',ownerId:'C02',status:'completed',deedId:'DEMO-D001',date:'2026-10-12',source:'কৃত্রিম নামজারি রেজিস্ট্রি'},
    {id:'MUT-2026-8849',plot:'1205',survey:'RS',ownerId:'C03',status:'pending',deedId:'DEMO-D002',date:'2026-10-06',source:'কৃত্রিম নামজারি রেজিস্ট্রি'},
    {id:'MUT-DEMO-1206',plot:'1206',survey:'BS',ownerId:'C05',status:'completed',deedId:'DEMO-D004',date:'2025-03-01',source:'কৃত্রিম নামজারি রেজিস্ট্রি'}
  ];
  const status=[
    {id:'DEMO-S1204',plot:'1204',survey:'BS',pendingCases:[],mortgage:false,khas:false,vested:false,acquisition:false,taxPaid:true,source:'কৃত্রিম মামলা/দায়/সরকারি-জমি রেজিস্ট্রি'},
    {id:'DEMO-S1205',plot:'1205',survey:'RS',pendingCases:[{id:'DEMO-CASE-07',state:'pending',label:'মালিকানা বিরোধ · কৃত্রিম'}],mortgage:true,khas:false,vested:false,acquisition:false,taxPaid:false,source:'কৃত্রিম মামলা/দায়/সরকারি-জমি রেজিস্ট্রি'},
    {id:'DEMO-S1206',plot:'1206',survey:'BS',pendingCases:[],mortgage:false,khas:true,vested:false,acquisition:true,taxPaid:true,source:'কৃত্রিম মামলা/দায়/সরকারি-জমি রেজিস্ট্রি'},
    {id:'DEMO-S1207',plot:'1207',survey:'BS',pendingCases:null,mortgage:null,khas:null,vested:null,acquisition:null,taxPaid:null,source:'কৃত্রিম অসম্পূর্ণ রেজিস্ট্রি'}
  ];
  const scenarios=[
    {record:'1234',sellerId:'C02',label:'রেকর্ডে মিল',summary:'দলিল ও নামজারি মিলে; পরিচিত সূচকে সতর্কতা নেই।'},
    {record:'5678',sellerId:'C03',label:'দ্বৈত বিক্রির সংকেত',summary:'একই পূর্ণ প্লট একই বিক্রেতার কাছ থেকে দুই ক্রেতার নামে।'},
    {record:'9012',sellerId:'C05',label:'খাস / অধিগ্রহণ',summary:'নমুনা রেজিস্ট্রিতে সরকারি জমি ও অধিগ্রহণের চিহ্ন।'},
    {record:'3456',sellerId:'C06',label:'তথ্য অসম্পূর্ণ',summary:'মামলা, দায়, নামজারি ও দলিলের তথ্য অনুপস্থিত।'}
  ];
  return {version:'synthetic-v2',asOf:'2026-10-13',citizens,records,transfers:transfers.map(r=>({...base,...r})),mutations:mutations.map(r=>({...base,...r})),status:status.map(r=>({...base,...r})),scenarios};
})();
