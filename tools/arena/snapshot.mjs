// Explicit public whitelist. Never copy a fact, record, metadata object or private identifier.
const number=v=>typeof v==='number' && Number.isFinite(v) && v>=0;
export function buildSnapshot(facts,{now=new Date().toISOString(),timeZone='Asia/Shanghai'}={}){
 const dateFormat=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'});
 const dayOf=v=>{const date=new Date(v);if(!v||!Number.isFinite(date.getTime()))return null;const p=Object.fromEntries(dateFormat.formatToParts(date).map(p=>[p.type,p.value]));return `${p.year}-${p.month}-${p.day}`;};
 const groups=new Map();let capturedDay=null;
 for(const f of facts){
  if(f.kind!=='call' || !['agent','battle'].includes(f.mode))continue;
  const day=dayOf(f.t),captured=dayOf(f.capturedAt);if(captured && (!capturedDay||captured>capturedDay))capturedDay=captured;
  const model=typeof f.model==='string'?f.model.slice(0,160):'未提供模型';
  const key=JSON.stringify([day,model,f.mode]);
  if(!groups.has(key))groups.set(key,{day,model,mode:f.mode,calls:0,traceTokenCalls:0,traceCostCalls:0,traceTokens:null,traceCost:null,approximateCalls:0});
  const row=groups.get(key);row.calls++;
  if(f.mode==='agent' && !f.traceConflict){
   if(number(f.traceTokens)){if(!Number.isSafeInteger(f.traceTokens))throw Error('Invalid token count');row.traceTokens=(row.traceTokens??0)+f.traceTokens;row.traceTokenCalls++;if(f.traceApprox)row.approximateCalls++;}
   if(number(f.traceCost)){row.traceCost=(row.traceCost??0)+f.traceCost;row.traceCostCalls++;}
  }
 }
 const rows=[...groups.values()].sort((a,b)=>(a.day||'').localeCompare(b.day||'')||a.model.localeCompare(b.model)||a.mode.localeCompare(b.mode));
 for(const r of rows){if(r.traceCost!==null)r.traceCost=Math.round(r.traceCost*1e9)/1e9;if(r.traceTokens!==null&&!Number.isSafeInteger(r.traceTokens))throw Error('Token overflow');}
 return {schemaVersion:1,generatedAt:now,capturedDay,timeZone,rows};
}
