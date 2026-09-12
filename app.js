const $ = (id) => document.getElementById(id);
const num = (id) => Number($(id).value || 0);
const money = (v) => Number.isFinite(v) ? `${v < 0 ? '-' : ''}$${Math.abs(v).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}` : '-';
const px = (v,d=2) => Number.isFinite(v) ? Number(v).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d}) : '-';
const pct = (v) => Number.isFinite(v) ? `${v.toFixed(2)}%` : '-';

function switchTab(id){
  document.querySelectorAll('.tab,.tabpage').forEach(el=>el.classList.remove('active'));
  document.querySelector(`.tab[data-tab="${id}"]`).classList.add('active');
  $(id).classList.add('active');
}
document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>switchTab(b.dataset.tab)));

function targetUSD(mode,value,cycleStart){if(mode==='be') return 0;if(mode==='pct') return cycleStart*value/100;return value;}
function calcClosePrice(avg,totalLots,contract,target,realized,costs){const denom=contract*totalLots;if(denom<=0) return NaN;return avg+(target-realized-costs)/denom;}
function openPnL(price,avg,totalLots,contract){return (price-avg)*contract*totalLots;}

function calcBasket(){
  const cycleStart=num('cycleStart'), current=num('currentPrice'), avg=num('avgEntry');
  const count=num('positionCount'), lotEach=num('lotEach'), contract=num('contractValue'), realized=num('realized'), costs=num('costs');
  const mode=$('targetMode').value, tval=num('targetValue'), target=targetUSD(mode,tval,cycleStart), totalLots=count*lotEach;
  const floating=openPnL(current,avg,totalLots,contract), net=realized+costs+floating, close=calcClosePrice(avg,totalLots,contract,target,realized,costs);
  const move=close-current, movePct=current ? move/current*100 : NaN;
  $('rTotalLots').textContent=px(totalLots,2); $('rFloating').textContent=money(floating); $('rCycleNet').textContent=money(net); $('rTarget').textContent=money(target); $('rClosePrice').textContent=px(close,2); $('rMove').textContent=`${move>=0?'+':''}${px(move,2)} (${move>=0?'+':''}${pct(movePct)})`;
  const state=$('basketState'); state.className='signal '+(net>=target?'good':move>=0?'warn':'good');
  state.textContent=net>=target?'ถึงเป้าแล้ว — ตามตัวเลขที่กรอก พอร์ตอยู่เหนือเป้าล้าง':'ยังไม่ถึงเป้า — ดูราคาประมาณที่ต้องการด้านล่าง';
  $('basketExplain').innerHTML= totalLots>0 ? `ที่ราคา <b>${px(close,2)}</b> แบบจำลองคาดว่า Cycle Net จะอยู่ใกล้ <b>${money(target)}</b> โดยสมมติว่า Swap/Fee ไม่เพิ่มจากค่าที่กรอก และไม่มี Slippage เพิ่มเติม` : 'กรุณาใส่จำนวนไม้และ Lot ให้มากกว่า 0';
  buildScenarios(close,avg,totalLots,contract,realized,costs,target);
  saveState();
}
function buildScenarios(close,avg,lots,contract,realized,costs,target){
  const body=$('scenarioRows');body.innerHTML='';if(!Number.isFinite(close))return;
  [-1,-.5,0,.5,1].forEach(d=>{const p=close+d;const op=openPnL(p,avg,lots,contract);const net=realized+costs+op;const tr=document.createElement('tr');tr.innerHTML=`<td>${px(p,2)}</td><td>${money(op)}</td><td>${money(net)}</td><td class="${net>=target?'status-ok':'status-no'}">${net>=target?'ถึงเป้า':'ยังไม่ถึง'}</td>`;body.appendChild(tr);});
}

function parsePositions(){
  const lines=$('positionsText').value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);const rows=[];
  for(const line of lines){const parts=line.split(/[;,\t ]+/).filter(Boolean).map(Number);if(parts.length<2||!Number.isFinite(parts[0])||!Number.isFinite(parts[1])||parts[1]<=0)continue;rows.push({entry:parts[0],lot:parts[1],cost:Number.isFinite(parts[2])?parts[2]:0});}
  return rows;
}
function calcPositions(){
  const rows=parsePositions(), current=num('pCurrent'), contract=num('pContract'), realized=num('pRealized'), target=num('pTarget');
  const lots=rows.reduce((s,r)=>s+r.lot,0), weighted=rows.reduce((s,r)=>s+r.entry*r.lot,0), avg=lots?weighted/lots:NaN, costs=rows.reduce((s,r)=>s+r.cost,0), floating=rows.reduce((s,r)=>s+(current-r.entry)*contract*r.lot,0), net=realized+costs+floating, close=calcClosePrice(avg,lots,contract,target,realized,costs);
  $('pCount').textContent=rows.length; $('pLots').textContent=px(lots,2); $('pAvg').textContent=px(avg,3); $('pCosts').textContent=money(costs); $('pNet').textContent=money(net); $('pClose').textContent=px(close,2);
  $('pExplain').innerHTML=rows.length?`ใช้ข้อมูล <b>${rows.length}</b> ไม้จริง ราคาเฉลี่ยถ่วง Lot <b>${px(avg,3)}</b> หากต้นทุน/Swap คงเดิม ราคาใกล้ <b>${px(close,2)}</b> จะทำให้ Cycle Net แตะเป้า <b>${money(target)}</b> โดยประมาณ`:'ยังอ่านข้อมูล Position ไม่ได้ ตรวจรูปแบบแต่ละบรรทัดอีกครั้ง';
  saveState();
}

// -----------------------------------------------------------------------------
// Target Inventory Survival model
// G1 = Origin, G2 = Origin-Step, ... Target inventory at G = G positions.
// If a new cycle starts at G40 with 0 positions, the initial batch is 40 positions
// around G40 price. Deeper grids add only the missing inventory (normally +1/grid).
// -----------------------------------------------------------------------------
function gridPrice(origin,step,g){ return origin-(g-1)*step; }
function lowerGridIndex(origin,step,lower){ return Math.floor((origin-lower)/step+1e-9)+1; }

function normalizeGridInputs(startGridOverride=null){
  const origin=num('gOrigin'), step=num('gStep'), lot=num('gLot'), lower=num('gBuyLowerLimit');
  const balance=num('gBalance'), leverage=num('gLeverage'), contract=num('gContract'), stopOut=num('gStopOut');
  const survival=num('gSurvivalPrice'), minMargin=num('gMinMargin'), futureCosts=num('gFutureCosts'), buffer=num('gBuffer');
  const maxGrid = step>0 ? lowerGridIndex(origin,step,lower) : 0;
  let startGrid = startGridOverride ?? Math.round(num('gStartGrid'));
  startGrid = Math.max(1,Math.min(maxGrid||1,startGrid));
  return {origin,step,lot,lower,balance,leverage,contract,stopOut,survival,minMargin,futureCosts,buffer,maxGrid,startGrid};
}

function validateGridCfg(c){
  if(!(c.step>0&&c.lot>0&&c.contract>0&&c.leverage>0&&c.balance>=0)) return 'Step, Lot, Contract, Leverage ต้องมากกว่า 0 และ Balance ห้ามติดลบ';
  if(c.origin<c.lower) return 'Origin ต้องสูงกว่าหรือเท่ากับขอบ BUY';
  if(c.maxGrid<1) return 'คำนวณจำนวน Grid ไม่ได้';
  if(c.startGrid<1||c.startGrid>c.maxGrid) return `Grid เริ่ม Cycle ต้องอยู่ระหว่าง G1 ถึง G${c.maxGrid}`;
  if(c.stopOut<0||c.minMargin<0) return 'Stop Out และ Margin Level ห้ามติดลบ';
  return '';
}

function portfolioAtPrice(c, price){
  const startPrice=gridPrice(c.origin,c.step,c.startGrid);
  let deepest=c.startGrid;
  if(price<=startPrice){
    const byPrice=Math.floor((c.origin-price)/c.step+1e-9)+1;
    deepest=Math.max(c.startGrid,Math.min(c.maxGrid,byPrice));
  }
  const count=deepest;
  const totalLots=count*c.lot;
  let entryValue=c.startGrid*startPrice*c.lot;
  for(let g=c.startGrid+1;g<=deepest;g++) entryValue+=gridPrice(c.origin,c.step,g)*c.lot;
  const avg=totalLots>0?entryValue/totalLots:NaN;
  const floating=(price*totalLots-entryValue)*c.contract;
  const equity=c.balance+floating+c.futureCosts;
  const margin=(price>0&&c.leverage>0)?price*c.contract*totalLots/c.leverage:0;
  const marginLevel=margin>0?equity/margin*100:Infinity;
  return {price,deepest,count,totalLots,avg,floating,equity,margin,marginLevel,startPrice};
}

function stopOutCondition(c,p){
  const s=portfolioAtPrice(c,p);
  return s.equity<=0 || (s.margin>0 && s.marginLevel<=c.stopOut);
}

function findStopOutPrice(c){
  const start=gridPrice(c.origin,c.step,c.startGrid);
  if(stopOutCondition(c,start)) return start;
  const coarse=0.05;
  let prev=start;
  for(let p=start-coarse;p>=0;p-=coarse){
    if(stopOutCondition(c,p)){
      let lo=Math.max(0,p), hi=prev;
      for(let i=0;i<40;i++){
        const mid=(lo+hi)/2;
        if(stopOutCondition(c,mid)) lo=mid; else hi=mid;
      }
      return hi;
    }
    prev=p;
  }
  if(stopOutCondition(c,0)) return 0;
  return NaN;
}

function requiredFunding(c,price){
  const s=portfolioAtPrice(c,price);
  const requiredEquity=s.margin*(c.minMargin/100);
  const requiredBalance=requiredEquity-s.floating-c.futureCosts;
  const add=Math.max(0,requiredBalance-c.balance);
  const buffered=add*(1+Math.max(0,c.buffer)/100);
  return {...s,requiredEquity,requiredBalance,add,buffered};
}

function renderPathTable(c){
  const body=$('gridRows'); body.innerHTML='';
  for(let g=c.startGrid;g<=c.maxGrid;g++){
    const p=gridPrice(c.origin,c.step,g);
    const s=portfolioAtPrice(c,p);
    const added=g===c.startGrid?c.startGrid:1;
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>G${g}</td><td>${px(p,2)}</td><td>${added}</td><td>${s.count}</td><td>${px(s.totalLots,2)}</td><td>${px(s.avg,3)}</td><td>${money(s.floating)}</td><td>${money(s.equity)}</td><td>${Number.isFinite(s.marginLevel)?pct(s.marginLevel):'∞'}</td>`;
    body.appendChild(tr);
  }
  if(c.survival<gridPrice(c.origin,c.step,c.maxGrid)-1e-9){
    const s=portfolioAtPrice(c,c.survival); const tr=document.createElement('tr'); tr.className='special-row';
    tr.innerHTML=`<td>SURVIVAL</td><td>${px(c.survival,2)}</td><td>0</td><td>${s.count}</td><td>${px(s.totalLots,2)}</td><td>${px(s.avg,3)}</td><td>${money(s.floating)}</td><td>${money(s.equity)}</td><td>${Number.isFinite(s.marginLevel)?pct(s.marginLevel):'∞'}</td>`;
    body.appendChild(tr);
  }
}

function stopOutText(v){return Number.isFinite(v)?px(v,2):'ไม่พบเหนือ 0';}

function renderAllStarts(c){
  const body=$('allStartRows');body.innerHTML='';
  for(let g=1;g<=c.maxGrid;g++){
    const cc={...c,startGrid:g};
    const atLower=portfolioAtPrice(cc,cc.lower);
    const surv=requiredFunding(cc,cc.survival);
    const so=findStopOutPrice(cc);
    const tr=document.createElement('tr');
    if(g===c.startGrid) tr.className='selected-row';
    const ml=Number.isFinite(surv.marginLevel)?pct(surv.marginLevel):'∞';
    tr.innerHTML=`<td>G${g}</td><td>${px(gridPrice(cc.origin,cc.step,g),2)}</td><td>${g}</td><td>${px(atLower.avg,3)}</td><td>${money(surv.floating)}</td><td>${ml}</td><td>${stopOutText(so)}</td><td>${money(surv.add)}</td>`;
    body.appendChild(tr);
  }
}

function calcGrid(){
  const c=normalizeGridInputs();
  const err=validateGridCfg(c);
  if(err){$('gridSignal').className='signal bad';$('gridSignal').textContent=err;return;}
  $('gStartGrid').value=c.startGrid;
  const startPrice=gridPrice(c.origin,c.step,c.startGrid);
  $('gStartPriceView').value=px(startPrice,2);

  const atLower=portfolioAtPrice(c,c.lower);
  const surv=requiredFunding(c,c.survival);
  const stopPrice=findStopOutPrice(c);

  $('gStartPrice').textContent=px(startPrice,2);
  $('gInitialCount').textContent=`${c.startGrid} ไม้`;
  $('gMaxCount').textContent=`${c.maxGrid} ไม้`;
  $('gLots').textContent=px(atLower.totalLots,2);
  $('gAvgAtLimit').textContent=px(atLower.avg,3);
  $('gFloatingAtLimit').textContent=money(atLower.floating);
  $('gEquityAtLimit').textContent=money(atLower.equity);
  $('gMarginAtLimit').textContent=Number.isFinite(atLower.marginLevel)?pct(atLower.marginLevel):'∞';
  $('gStopOutPrice').textContent=stopOutText(stopPrice);
  $('gTopUp').textContent=money(surv.add);
  $('gRequiredBalance').textContent=money(Math.max(c.balance,surv.requiredBalance));
  $('gTopUpBuffered').textContent=money(surv.buffered);

  const s=$('gridSignal');
  const survives=surv.equity>0 && (!Number.isFinite(surv.marginLevel)||surv.marginLevel>=c.minMargin);
  s.className='signal '+(survives?'good':surv.add>0?'warn':'bad');
  if(survives) s.textContent=`ทุนปัจจุบันผ่านเป้า Survival ${px(c.survival,2)} ตาม Margin Level ที่ตั้งไว้`;
  else s.textContent=`ทุนปัจจุบันยังไม่ถึงเป้า Survival ${px(c.survival,2)} — ดูยอดเติมขั้นต่ำด้านล่าง`;

  const stopSentence=Number.isFinite(stopPrice)?`Stop Out โดยประมาณอยู่แถว <b>${px(stopPrice,2)}</b> ภายใต้สูตร Margin มาตรฐานและ Stop Out ${pct(c.stopOut)}.`:`แบบจำลองไม่พบ Stop Out ก่อนราคา 0 ภายใต้ค่าที่กรอก; ต่ำกว่า 0 สูตร Margin มาตรฐานไม่ควรใช้ตัดสินใจ.`;
  $('gridExplain').innerHTML=`เริ่ม Cycle ที่ <b>G${c.startGrid}</b> ราคา <b>${px(startPrice,2)}</b> → Initial Batch <b>${c.startGrid} ไม้</b>. ถ้าราคาลงจนถึงขอบ BUY <b>${px(c.lower,2)}</b> จะมีสูงสุด <b>${c.maxGrid} ไม้ (${px(atLower.totalLots,2)} lot)</b> ราคาเฉลี่ยประมาณ <b>${px(atLower.avg,3)}</b>. ที่ราคา Survival <b>${px(c.survival,2)}</b> Equity แบบจำลอง = <b>${money(surv.equity)}</b>, Margin Level = <b>${Number.isFinite(surv.marginLevel)?pct(surv.marginLevel):'∞'}</b>. ${surv.add>0?`เพื่อรักษา Margin Level ${pct(c.minMargin)} ควรเติมขั้นต่ำ <b>${money(surv.add)}</b> (แนะนำพร้อม Buffer ${pct(c.buffer)} = <b>${money(surv.buffered)}</b>).`:`ยังไม่ต้องเติมเงินเพิ่มเพื่อผ่านเกณฑ์ ${pct(c.minMargin)} ที่ราคาเป้าหมายนี้.`} ${stopSentence}`;

  renderPathTable(c);
  renderAllStarts(c);
  saveState();
}

function updateTargetLabel(){
  const m=$('targetMode').value;const wrap=$('targetValueWrap');
  wrap.firstChild.textContent=m==='pct'?'เป้ากำไร (%)':m==='usd'?'เป้ากำไร (USD)':'ค่าเป้า (ไม่ใช้ในโหมดเสมอตัว)';
  $('targetValue').disabled=m==='be';calcBasket();
}

$('targetMode').addEventListener('change',updateTargetLabel);
$('calcBasket').addEventListener('click',calcBasket);
$('calcPositions').addEventListener('click',calcPositions);
$('calcGrid').addEventListener('click',calcGrid);
$('gStartGrid').addEventListener('input',()=>{const c=normalizeGridInputs();if(c.step>0&&c.maxGrid>0){$('gStartGrid').value=Math.max(1,Math.min(c.maxGrid,Math.round(num('gStartGrid'))||1));$('gStartPriceView').value=px(gridPrice(c.origin,c.step,Number($('gStartGrid').value)),2);}});
['gOrigin','gStep','gBuyLowerLimit'].forEach(id=>$(id).addEventListener('input',()=>{const c=normalizeGridInputs();if(c.step>0&&c.maxGrid>0){$('gStartGrid').max=c.maxGrid;$('gStartPriceView').value=px(gridPrice(c.origin,c.step,c.startGrid),2);}}));
$('resetBasket').addEventListener('click',()=>{localStorage.removeItem('xtiCalcStateV2');localStorage.removeItem('xtiCalcState');location.reload();});

const persistIds=['balance','cycleStart','currentPrice','avgEntry','positionCount','lotEach','contractValue','realized','costs','targetMode','targetValue','positionsText','pCurrent','pContract','pRealized','pTarget','gOrigin','gStep','gStartGrid','gLot','gBuyLowerLimit','gBalance','gLeverage','gContract','gStopOut','gSurvivalPrice','gMinMargin','gFutureCosts','gBuffer'];
function saveState(){const o={};persistIds.forEach(id=>o[id]=$(id)?.value);localStorage.setItem('xtiCalcStateV2',JSON.stringify(o));}
function loadState(){
  try{
    const old=JSON.parse(localStorage.getItem('xtiCalcState')||'{}');
    const o=JSON.parse(localStorage.getItem('xtiCalcStateV2')||'{}');
    const merged={...old,...o};
    persistIds.forEach(id=>{if(merged[id]!==undefined&&$(id))$(id).value=merged[id];});
    if(merged.gFloor!==undefined && !o.gBuyLowerLimit) $('gBuyLowerLimit').value=merged.gFloor;
  }catch(e){}
}
loadState(); updateTargetLabel(); calcPositions(); calcGrid();
