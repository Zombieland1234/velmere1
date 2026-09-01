import { runPass35A14PublicSecuritiesCatalog } from '../../lib/market-integrity/pass35-public-securities-catalog-runtime.mjs';
import { buildPass35A15SnapshotEvidenceBundle } from '../../lib/market-integrity/pass35-snapshot-evidence-bundle.mjs';

export async function buildA15Catalog120(){
  const listed=['Symbol|Security Name|Market Category|Test Issue|Financial Status|Round Lot Size|ETF|NextShares'];
  for(let i=1;i<=100;i+=1)listed.push(`S${String(i).padStart(3,'0')}|Nasdaq Security ${i}|Q|N|N|100|${i%6===0?'Y':'N'}|N`);listed.push('File Creation Time: 0723202601');
  const other=['ACT Symbol|Security Name|Exchange|CQS Symbol|ETF|Round Lot Size|Test Issue|NASDAQ Symbol'];
  for(let i=101;i<=120;i+=1)other.push(`S${String(i).padStart(3,'0')}|Other Security ${i}|N|S${String(i).padStart(3,'0')}|${i%6===0?'Y':'N'}|100|N|S${String(i).padStart(3,'0')}`);other.push('File Creation Time: 0723202601');
  const fields=['cik','name','ticker','exchange'];const data=[];for(let i=1;i<=120;i+=1)data.push([900000+i,`SEC Security ${i}`,`S${String(i).padStart(3,'0')}`,i<=100?'Nasdaq':'NYSE']);
  const payloads={listed:listed.join('\n'),other:other.join('\n'),sec:JSON.stringify({fields,data})};
  const fetchImpl=async(url)=>{const text=String(url).includes('listed-a')?payloads.listed:String(url).includes('listed-b')?payloads.other:payloads.sec;return new Response(text,{status:200,headers:{'content-type':String(url).includes('sec')?'application/json':'text/plain'}});};
  return runPass35A14PublicSecuritiesCatalog({now:new Date('2026-07-23T00:00:00Z'),executionMode:'INJECTED_FIXTURE',fetchImpl,bypassCache:true,endpointOverrides:{nasdaq_listed:{providerFamily:'nasdaq_trader',endpointId:'listed_a',url:'https://fixture.invalid/listed-a'},other_listed:{providerFamily:'nasdaq_trader',endpointId:'listed_b',url:'https://fixture.invalid/listed-b'},sec_tickers:{providerFamily:'sec_edgar',endpointId:'sec',url:'https://fixture.invalid/sec'}}});
}

function bundle({providerId,providerFamily,datasetType,payload,recordCount,observedAt='2026-07-23T00:00:00Z'}){const built=buildPass35A15SnapshotEvidenceBundle({providerId,providerFamily,datasetType,sourceMode:'INJECTED_FIXTURE',observedAt,payload,recordCount});return {bundle:built.bundle,payload};}

export function buildA15SecuritiesSnapshots(){
  const snapshots=[];
  const quotesA=[];for(let i=1;i<=100;i+=1)quotesA.push({symbol:`S${String(i).padStart(3,'0')}`,observedAt:'2026-07-23T00:00:00Z',price:50+i,open:49+i,high:51+i,low:48+i,previousClose:49.5+i,volume:100000+i,currency:'USD',exchange:i<=100?'NASDAQ':'NYSE'});
  snapshots.push({...bundle({providerId:'stooq-quotes',providerFamily:'stooq_public',datasetType:'SECURITIES_QUOTES',payload:JSON.stringify(quotesA),recordCount:quotesA.length}),format:'PUBLIC_QUOTE_JSON'});
  const quotesB=[];for(let i=1;i<=80;i+=1)quotesB.push({symbol:`S${String(i).padStart(3,'0')}`,observedAt:'2026-07-23T00:00:00Z',price:50+i+0.02,open:49+i,high:51+i,low:48+i,previousClose:49.5+i,volume:90000+i,currency:'USD',exchange:'NASDAQ'});
  snapshots.push({...bundle({providerId:'iex-quotes',providerFamily:'iex_public',datasetType:'SECURITIES_QUOTES',payload:JSON.stringify(quotesB),recordCount:quotesB.length}),format:'PUBLIC_QUOTE_JSON'});
  for(let i=1;i<=100;i+=1){const rows=['symbol,date,open,high,low,close,volume'];for(let d=0;d<40;d+=1){const date=new Date(Date.parse('2026-07-22T00:00:00Z')-(39-d)*86400000).toISOString().slice(0,10);const close=50+i+d*0.1;rows.push(`S${String(i).padStart(3,'0')},${date},${close-0.2},${close+0.5},${close-0.5},${close},${100000+i+d}`);}const payload=rows.join('\n');snapshots.push({...bundle({providerId:`stooq-history-${i}`,providerFamily:'stooq_public',datasetType:'SECURITIES_DAILY_HISTORY',payload,recordCount:40}),format:'STOOQ_DAILY_CSV',symbol:`S${String(i).padStart(3,'0')}`,currency:'USD',exchange:i<=100?'NASDAQ':'NYSE'});}
  for(let i=1;i<=60;i+=1){const rows=['symbol,date,open,high,low,close,volume'];for(let d=0;d<20;d+=1){const date=new Date(Date.parse('2026-07-22T00:00:00Z')-(19-d)*86400000).toISOString().slice(0,10);const close=50+i+d*0.1;rows.push(`S${String(i).padStart(3,'0')},${date},${close-0.2},${close+0.5},${close-0.5},${close},${80000+i+d}`);}const payload=rows.join('\n');snapshots.push({...bundle({providerId:`alpha-history-${i}`,providerFamily:'alpha_vantage_free',datasetType:'SECURITIES_DAILY_HISTORY',payload,recordCount:20}),format:'STOOQ_DAILY_CSV',symbol:`S${String(i).padStart(3,'0')}`,currency:'USD',exchange:'NASDAQ'});}
  return snapshots;
}

export function normalizedCatalogFromA14(catalog){return catalog.instruments.map((row)=>({...row,exchange:row.exchanges?.[0]??'NASDAQ',currency:'USD'}));}

export function buildA15ActionsAndCalendars(){const providerAActions=[];const providerBActions=[];for(let i=1;i<=100;i+=1)providerAActions.push({symbol:`S${String(i).padStart(3,'0')}`,type:i<=80?'SPLIT':'DIVIDEND',exDate:i<=80?'2026-06-15':'2026-07-01',ratio:i<=80?2:undefined,amount:i>80?0.25:undefined,currency:'USD'});for(let i=1;i<=60;i+=1)providerBActions.push({symbol:`S${String(i).padStart(3,'0')}`,type:'SPLIT',exDate:'2026-06-15',ratio:2});for(let i=91;i<=100;i+=1)providerBActions.push({symbol:`S${String(i).padStart(3,'0')}`,type:'DIVIDEND',exDate:'2026-07-01',amount:0.5,currency:'USD'});for(let i=111;i<=120;i+=1)providerBActions.push({symbol:`S${String(i).padStart(3,'0')}`,type:'DIVIDEND',exDate:'2026-07-01',amount:0.1,currency:'USD'});return {providerAActions,providerBActions,calendars:[{exchange:'NASDAQ',date:'2026-07-22',state:'OPEN',openUtc:'13:30',closeUtc:'20:00',timezone:'America/New_York'},{exchange:'NYSE',date:'2026-07-22',state:'OPEN',openUtc:'13:30',closeUtc:'20:00',timezone:'America/New_York'}]};}
