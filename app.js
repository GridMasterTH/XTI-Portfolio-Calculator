const $ = (id) => document.getElementById(id);
const num = (id) => Number($(id).value || 0);
const money = (v) => Number.isFinite(v) ? `${v < 0 ? '-' : ''}$${Math.abs(v).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}` : '-';
const px = (v,d=2) => Number.isFinite(v) ? Number(v).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d}) : '-';
const pct = (v) => Number.isFinite(v) ? `${v.toFixed(2)}%` : '-';

function switchTab(id){document.querySelectorAll('.tab,.tabpage').forEach(el=>el.classList.remove('active'));document.querySelector(`.tab[data-tab="${id}"]`).classList.add('active');$(id).classList.add('active');}
document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>switchTab(b.dataset.tab)));

function targetUSD(mode,value,cycleStart){if(mode==='be') return 0;if(mode==='pct') return cycleStart*value/100;return value;}
function calcClosePrice(avg,totalLots,contract,target,realized,costs){const denom=contract*totalLots;if(denom<=0) return NaN;return avg+(target-realized-costs)/denom;}
function openPnL(price,avg,totalLots,contract){return (price-avg)*contract*totalLots;}

function calcBasket(){
  const balance=num('balance'), cycleStart=num('cycleStart'), current=num('currentPrice'), avg=num('avgEntry');
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
function buildScenarios(close,avg,lots,contract,realized,costs,target){const body=$('scenarioRows');body.innerHTML='';if(!Number.isFinite(close))return;[-1,-.5,0,.5,1].forEach(d=>{const p=close+d;const op=openPnL(p,avg,lots,contract);const net=realized+costs+op;const tr=document.createElement('tr');tr.innerHTML=`<td>${px(p,2)}</td><td>${money(op)}</td><td>${money(net)}</td><td class="${net>=target?'status-ok':'status-no'}">${net>=target?'ถึงเป้า':'ยังไม่ถึง'}</td>`;body.appendChild(tr);});}

function parsePositions(){const lines=$('positionsText').value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);const rows=[];for(const line of lines){const parts=line.split(/[;,\t ]+/).filter(Boolean).map(Number);if(parts.length<2||!Number.isFinite(parts[0])||!Number.isFinite(parts[1])||parts[1]<=0)continue;rows.push({entry:parts[0],lot:parts[1],cost:Number.isFinite(parts[2])?parts[2]:0});}return rows;}
function calcPositions(){const rows=parsePositions(), current=num('pCurrent'), contract=num('pContract'), realized=num('pRealized'), target=num('pTarget');const lots=rows.reduce((s,r)=>s+r.lot,0), weighted=rows.reduce((s,r)=>s+r.entry*r.lot,0), avg=lots?weighted/lots:NaN, costs=rows.reduce((s,r)=>s+r.cost,0), floating=rows.reduce((s,r)=>s+(current-r.entry)*contract*r.lot,0), net=realized+costs+floating, close=calcClosePrice(avg,lots,contract,target,realized,costs);
  $('pCount').textContent=rows.length; $('pLots').textContent=px(lots,2); $('pAvg').textContent=px(avg,3); $('pCosts').textContent=money(costs); $('pNet').textContent=money(net); $('pClose').textContent=px(close,2); $('pExplain').innerHTML=rows.length?`ใช้ข้อมูล <b>${rows.length}</b> ไม้จริง ราคาเฉลี่ยถ่วง Lot <b>${px(avg,3)}</b> หากต้นทุน/Swap คงเดิม ราคาใกล้ <b>${px(close,2)}</b> จะทำให้ Cycle Net แตะเป้า <b>${money(target)}</b> โดยประมาณ`:'ยังอ่านข้อมูล Position ไม่ได้ ตรวจรูปแบบแต่ละบรรทัดอีกครั้ง';saveState();}

function calcGrid(){const origin=num('gOrigin'), step=num('gStep'), lot=num('gLot'), floor=num('gFloor'), balance=num('gBalance'), leverage=num('gLeverage'), contract=num('gContract'), minMargin=num('gMinMargin'), buffer=num('gBuffer');const body=$('gridRows');body.innerHTML='';if(step<=0||lot<=0||contract<=0||origin<floor){$('gridSignal').className='signal bad';$('gridSignal').textContent='ค่า Grid ไม่ถูกต้อง: Origin ต้องสูงกว่าหรือเท่ากับ Floor และ Step/Lot ต้องมากกว่า 0';return;}
  const levels=Math.floor((origin-floor)/step+1e-9)+1;let cumLots=0,cumFloat=0;for(let i=0;i<levels;i++){const entry=origin-i*step;cumLots+=lot;const pl=(floor-entry)*contract*lot;cumFloat+=pl;const tr=document.createElement('tr');tr.innerHTML=`<td>G${i+1}</td><td>${px(entry,2)}</td><td>${px(cumLots,2)}</td><td>${money(pl)}</td><td>${money(cumFloat)}</td>`;body.appendChild(tr);}
  const equity=balance+cumFloat;const margin=leverage>0?floor*contract*cumLots/leverage:NaN;const marginLevel=margin>0?equity/margin*100:Infinity;const suggested=Math.abs(cumFloat)*(1+buffer/100);$('gLevels').textContent=levels; $('gLots').textContent=px(cumLots,2); $('gFloating').textContent=money(cumFloat); $('gEquity').textContent=money(equity); $('gMargin').textContent=money(margin); $('gMarginLevel').textContent=Number.isFinite(marginLevel)?pct(marginLevel):'∞'; $('gSuggested').textContent=money(suggested);
  const s=$('gridSignal');const ok=equity>0 && (!Number.isFinite(marginLevel)||marginLevel>=minMargin);s.className='signal '+(ok?'good':'bad');s.textContent=ok?'แบบจำลองยังเหนือเกณฑ์ที่ตั้งไว้':'คำเตือน: Equity/Margin Level ต่ำกว่าเกณฑ์ที่ตั้งไว้ในแบบจำลอง';saveState();}

function updateTargetLabel(){const m=$('targetMode').value;const wrap=$('targetValueWrap');wrap.firstChild.textContent=m==='pct'?'เป้ากำไร (%)':m==='usd'?'เป้ากำไร (USD)':'ค่าเป้า (ไม่ใช้ในโหมดเสมอตัว)';$('targetValue').disabled=m==='be';calcBasket();}
$('targetMode').addEventListener('change',updateTargetLabel);$('calcBasket').addEventListener('click',calcBasket);$('calcPositions').addEventListener('click',calcPositions);$('calcGrid').addEventListener('click',calcGrid);
$('resetBasket').addEventListener('click',()=>{localStorage.removeItem('xtiCalcState');location.reload();});

const persistIds=['balance','cycleStart','currentPrice','avgEntry','positionCount','lotEach','contractValue','realized','costs','targetMode','targetValue','positionsText','pCurrent','pContract','pRealized','pTarget','gOrigin','gStep','gLot','gFloor','gBalance','gLeverage','gContract','gMinMargin','gBuffer'];
function saveState(){const o={};persistIds.forEach(id=>o[id]=$(id)?.value);localStorage.setItem('xtiCalcState',JSON.stringify(o));}
function loadState(){try{const o=JSON.parse(localStorage.getItem('xtiCalcState')||'{}');persistIds.forEach(id=>{if(o[id]!==undefined&&$(id))$(id).value=o[id];});}catch(e){}}
loadState(); updateTargetLabel(); calcPositions(); calcGrid();
