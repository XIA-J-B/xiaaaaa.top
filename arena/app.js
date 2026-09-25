import {validateSnapshot,summarize,filterRows,byModel} from './model.mjs';
const $=id=>document.getElementById(id),NS='http://www.w3.org/2000/svg';
const colors=['#719fd0','#66aaa5','#a0ad78','#c5a16b','#998db5','#778a99'];
let data=null,loading=false;
const int=n=>n===null?'—':new Intl.NumberFormat('en-US').format(n);
const usd=n=>n===null?'—':'$'+new Intl.NumberFormat('en-US',{maximumFractionDigits:6}).format(n);
const percentage=n=>n>0&&n<0.0001?'<0.01%':(n*100).toFixed(2)+'%';
function el(tag,props={},...children){const node=document.createElement(tag);for(const [k,v]of Object.entries(props)){if(k==='text')node.textContent=v;else if(k==='class')node.className=v;else if(k.startsWith('on'))node.addEventListener(k.slice(2),v);else node.setAttribute(k,v);}for(const c of children.flat())if(c!==null)node.append(c);return node;}
function svg(tag,props={},...children){const n=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(props))n.setAttribute(k,v);for(const c of children)n.append(c);return n;}
function selectModel(model){$('model').value=model;render();}
function render(){
 if(!data)return;
 const rows=filterRows(data,{range:$('range').value,model:$('model').value,mode:$('mode').value});
 const total=summarize(rows),models=byModel(rows);
 const kpi=(label,value,note)=>el('article',{class:'kpi'},el('div',{class:'label',text:label}),el('div',{class:'value',text:value}),el('small',{text:note}));
 $('kpis').replaceChildren(kpi('trace 费用',usd(total.traceCost),`${int(total.traceCostCalls)} / ${int(total.agentCalls)} 次 Agent 调用有费用标签`),kpi('trace Token',(total.approximateCalls?'≈':'')+int(total.traceTokens),`${int(total.traceTokenCalls)} / ${int(total.agentCalls)} 次 Agent 调用有 Token 标签`),kpi('调用次数',int(total.calls),`${models.length} 个模型 · 当前筛选范围`));
 renderDonut(models,total);renderTrend(rows);
 $('models').replaceChildren(...models.map(m=>el('tr',{},el('td',{},el('button',{type:'button',text:m.model,onclick:()=>selectModel(m.model)})),el('td',{text:int(m.calls)}),el('td',{text:(m.approximateCalls?'≈':'')+int(m.traceTokens)}),el('td',{text:total.traceTokens>0&&m.traceTokens!==null?percentage(m.traceTokens/total.traceTokens):'—'}),el('td',{text:usd(m.traceCost)}))));
 if(!models.length)$('models').append(el('tr',{},el('td',{colspan:'5',class:'empty',text:'当前筛选暂无记录'})));
}
function renderDonut(models,total){
 const positive=models.filter(m=>m.traceTokens>0),rows=positive.length>6?[...positive.slice(0,5),{model:'其他 '+(positive.length-5)+' 个模型',...summarize(positive.slice(5)),other:true}]:positive;
 const chart=svg('svg',{viewBox:'0 0 300 300',class:'donut',role:'img','aria-label':'模型 Token 占比'});
 chart.append(svg('circle',{cx:150,cy:150,r:105,fill:'none',stroke:'var(--line)','stroke-width':27}));
 const C=2*Math.PI*105;let offset=0;
 rows.forEach((r,i)=>{const share=r.traceTokens/total.traceTokens,gap=share===1?0:Math.min(3,share*C*.08),length=share*C-gap;
 chart.append(svg('circle',{cx:150,cy:150,r:105,fill:'none',stroke:colors[i], 'stroke-width':27,'stroke-dasharray':`${length} ${C-length}`,'stroke-dashoffset':-offset*C-gap/2,transform:'rotate(-90 150 150)'},svg('title',{},`${r.model}：${int(r.traceTokens)} Token · ${percentage(share)}`)));offset+=share;});
 chart.append(svg('text',{x:150,y:127,'text-anchor':'middle',class:'ring-title'},'已采集 Token'),svg('text',{x:150,y:161,'text-anchor':'middle',class:'ring-value'},total.traceTokens>0?(total.approximateCalls?'≈':'')+int(total.traceTokens):'暂无占比'),svg('text',{x:150,y:186,'text-anchor':'middle',class:'ring-title'},positive.length+' 个模型'));
 const legend=el('div');rows.forEach((r,i)=>{const dot=el('i',{class:'swatch','aria-hidden':'true'});dot.style.backgroundColor=colors[i];legend.append(el('div',{class:'legend-row'},dot,el('span',{class:'legend-name',title:r.model},r.other?el('span',{text:r.model}):el('button',{type:'button',text:r.model,onclick:()=>selectModel(r.model)})),el('small',{text:int(r.traceTokens)}),el('strong',{text:percentage(r.traceTokens/total.traceTokens)})));});
 if(!rows.length)legend.append(el('p',{class:'empty',text:'当前筛选没有可展示的 Token 占比'}));
 $('distribution').replaceChildren(chart,legend);
}
function renderTrend(rows){
 const groups=new Map();for(const r of rows){if(!r.day)continue;if(!groups.has(r.day))groups.set(r.day,[]);groups.get(r.day).push(r);}
 const days=[...groups].sort((a,b)=>a[0].localeCompare(b[0])).slice(-90).map(([day,rs])=>({day,...summarize(rs)}));
 if(!days.length){$('trend').replaceChildren(el('p',{class:'empty',text:'当前筛选暂无趋势记录'}));return;}
 const W=960,H=210,L=70,R=20,T=20,B=34,plotW=W-L-R,plotH=H-T-B,max=Math.max(1,...days.map(d=>d.traceTokens??0));
 const chart=svg('svg',{viewBox:`0 0 ${W} ${H}`,class:'trend-svg',role:'img','aria-label':'每日 trace Token 用量'});
 for(let i=0;i<=3;i++){const y=T+plotH*i/3;chart.append(svg('line',{x1:L,x2:W-R,y1:y,y2:y,stroke:'var(--line)'}),svg('text',{x:L-9,y:y+4,'text-anchor':'end'},new Intl.NumberFormat('zh-CN',{notation:'compact',maximumFractionDigits:1}).format(max*(1-i/3))));}
 const step=plotW/days.length;
 days.forEach((d,i)=>{const height=(d.traceTokens??0)/max*plotH,width=Math.max(1,Math.min(48,step*.65));chart.append(svg('rect',{x:L+i*step+(step-width)/2,y:T+plotH-height,width,height,rx:2,fill:colors[0]},svg('title',{},`${d.day} · ${d.traceTokens===null?'无 Token 标签':int(d.traceTokens)+' Token'} · ${int(d.calls)} 次调用`)));if(i===0||i===days.length-1||i%Math.max(1,Math.ceil(days.length/7))===0)chart.append(svg('text',{x:L+(i+.5)*step,y:H-9,'text-anchor':'middle'},d.day.slice(5)));});
 $('trend').replaceChildren(chart);
}
async function load(){
 if(loading)return;loading=true;$('refresh').disabled=true;
 try{const r=await fetch('./snapshot.json?t='+Math.floor(Date.now()/60000),{cache:'no-store',signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('HTTP '+r.status);data=validateSnapshot(await r.json());
 const selected=$('model').value;$('model').replaceChildren(el('option',{value:'',text:'全部模型'}),...byModel(data.rows).map(m=>el('option',{value:m.model,text:m.model})));$('model').value=[...$('model').options].some(o=>o.value===selected)?selected:'';
 const time=new Date(data.generatedAt).toLocaleString('zh-CN',{timeZone:data.timeZone,hour12:false});const old=Date.now()-Date.parse(data.generatedAt)>86400000;
 $('status').className='status';$('status').textContent=`快照生成：${time}（${data.timeZone}） · 最近采集日期：${data.capturedDay||'—'} · 非实时更新`+(old?' · 已超过 24 小时，等待发布新快照':'');render();
 }catch(e){$('status').className='status error';$('status').textContent=data?'更新失败，保留上次读取的快照。':'暂时无法读取公开快照，请稍后重试。';}finally{loading=false;$('refresh').disabled=false;}}
for(const id of ['range','model','mode'])$(id).addEventListener('change',render);$('refresh').addEventListener('click',load);load();
