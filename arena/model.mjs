const fields=['day','model','mode','calls','traceTokenCalls','traceCostCalls','traceTokens','traceCost','approximateCalls'];
const int=n=>Number.isSafeInteger(n)&&n>=0;
export function validateSnapshot(data){
 if(!data||data.schemaVersion!==1||!Array.isArray(data.rows)||data.rows.length>100000)throw Error('快照格式不正确');
 if(Object.keys(data).some(k=>!['schemaVersion','generatedAt','capturedDay','timeZone','rows'].includes(k)))throw Error('快照含非公开字段');
 if(!Number.isFinite(Date.parse(data.generatedAt))||typeof data.timeZone!=='string'||(data.capturedDay!==null&&!/^\d{4}-\d{2}-\d{2}$/.test(data.capturedDay)))throw Error('时间格式错误');
 for(const r of data.rows){
  if(Object.keys(r).length!==fields.length||Object.keys(r).some(k=>!fields.includes(k)))throw Error('快照含非公开字段');
  if(!(r.day===null||/^\d{4}-\d{2}-\d{2}$/.test(r.day))||typeof r.model!=='string'||r.model.length>160||!['agent','battle'].includes(r.mode))throw Error('模型统计格式错误');
  for(const k of ['calls','traceTokenCalls','traceCostCalls','approximateCalls'])if(!int(r[k]))throw Error('调用计数错误');
  if(r.traceTokenCalls>r.calls||r.traceCostCalls>r.calls||r.approximateCalls>r.traceTokenCalls)throw Error('覆盖率错误');
  if(!(r.traceTokens===null||int(r.traceTokens))||!(r.traceCost===null||(typeof r.traceCost==='number'&&Number.isFinite(r.traceCost)&&r.traceCost>=0)))throw Error('用量格式错误');
  if((r.traceTokenCalls===0)!==(r.traceTokens===null)||(r.traceCostCalls===0)!==(r.traceCost===null))throw Error('标签覆盖率不一致');
 }
 return data;
}
export function summarize(rows){
 const result={calls:0,agentCalls:0,traceTokenCalls:0,traceCostCalls:0,traceTokens:null,traceCost:null,approximateCalls:0};
 for(const r of rows){result.calls+=r.calls;if(r.mode==='agent')result.agentCalls+=r.calls;for(const k of ['traceTokenCalls','traceCostCalls','approximateCalls'])result[k]+=r[k];if(r.traceTokens!==null)result.traceTokens=(result.traceTokens??0)+r.traceTokens;if(r.traceCost!==null)result.traceCost=(result.traceCost??0)+r.traceCost;}
 if(result.traceCost!==null)result.traceCost=Math.round(result.traceCost*1e9)/1e9;return result;
}
export function filterRows(data,{model='',range='all',mode='all'}={}){
 const days=data.rows.map(r=>r.day).filter(Boolean).sort(),end=days.at(-1);
 let start=null;if(end&&range!=='all'){const d=new Date(end+'T00:00:00Z');d.setUTCDate(d.getUTCDate()-Number(range)+1);start=d.toISOString().slice(0,10);}
 return data.rows.filter(r=>(!model||r.model===model)&&(mode==='all'||r.mode===mode)&&(!start||(r.day&&r.day>=start)));
}
export function byModel(rows){const groups=new Map();for(const row of rows){if(!groups.has(row.model))groups.set(row.model,[]);groups.get(row.model).push(row);}return [...groups].map(([model,rs])=>({model,...summarize(rs)})).sort((a,b)=>(b.traceTokens??-1)-(a.traceTokens??-1)||a.model.localeCompare(b.model));}
