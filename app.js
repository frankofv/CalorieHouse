const STORAGE_KEY = 'nutricasa-v1';
const DEFAULT_STATE = {
  profile: { name: 'Franko', calorieGoal: 2300, proteinGoal: 160, carbGoal: 250, fatGoal: 70 },
  pantry: [
    { id: crypto.randomUUID(), name: 'Avena', qty: 900, unit: 'g', low: 200, category: 'food', kcal100: 389, protein100: 16.9, carb100: 66.3, fat100: 6.9, movements: [] },
    { id: crypto.randomUUID(), name: 'Yogurt', qty: 6, unit: 'unid', low: 2, category: 'food', kcal100: 99, protein100: 5, carb100: 15, fat100: 2, movements: [] },
    { id: crypto.randomUUID(), name: 'Plátano', qty: 5, unit: 'unid', low: 2, category: 'food', kcal100: 105, protein100: 1.3, carb100: 27, fat100: .3, movements: [] },
    { id: crypto.randomUUID(), name: 'Huevos', qty: 12, unit: 'unid', low: 4, category: 'food', kcal100: 72, protein100: 6.3, carb100: .4, fat100: 4.8, movements: [] },
    { id: crypto.randomUUID(), name: 'Arroz', qty: 1000, unit: 'g', low: 250, category: 'food', kcal100: 130, protein100: 2.7, carb100: 28, fat100: .3, movements: [] },
    { id: crypto.randomUUID(), name: 'Pechuga de pollo', qty: 1200, unit: 'g', low: 300, category: 'food', kcal100: 165, protein100: 31, carb100: 0, fat100: 3.6, movements: [] }
  ],
  days: {},
  weights: [],
  receipts: []
};

let state = loadState();
let currentReceipt = null;
let pendingReceiptProducts = [];
let modalHandler = null;

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const todayKey = () => new Date().toISOString().slice(0,10);
const fmtDate = (date = new Date()) => new Intl.DateTimeFormat('es-CL',{weekday:'long',day:'numeric',month:'long'}).format(date);
const cap = s => s ? s.charAt(0).toUpperCase()+s.slice(1) : '';
const n = v => Number(v)||0;
const clamp = (v,min,max) => Math.min(max,Math.max(min,v));

function loadState(){
  try { const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)); return saved ? { ...structuredClone(DEFAULT_STATE), ...saved } : structuredClone(DEFAULT_STATE); }
  catch { return structuredClone(DEFAULT_STATE); }
}
function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function ensureDay(key=todayKey()){
  if(!state.days[key]) state.days[key] = { meals: [] };
  return state.days[key];
}
function toast(message){ const el=$('#toast'); el.textContent=message; el.classList.add('show'); clearTimeout(toast.t); toast.t=setTimeout(()=>el.classList.remove('show'),2200); }
function formatQty(q){ return Number(q).toLocaleString('es-CL',{maximumFractionDigits:1}); }
function escapeHtml(str=''){ return String(str).replace(/[&<>'"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c])); }

function getTodayTotals(){
  const meals=ensureDay().meals;
  return meals.reduce((a,m)=>({kcal:a.kcal+n(m.kcal),protein:a.protein+n(m.protein),carbs:a.carbs+n(m.carbs),fat:a.fat+n(m.fat)}),{kcal:0,protein:0,carbs:0,fat:0});
}
function pct(v,g){ return g ? clamp(v/g*100,0,100) : 0; }
function renderDashboard(){
  const t=getTodayTotals(), p=state.profile;
  $('#caloriesConsumed').textContent=Math.round(t.kcal); $('#caloriesGoal').textContent=p.calorieGoal;
  $('#caloriesRemaining').textContent=Math.max(0,Math.round(p.calorieGoal-t.kcal));
  $('#caloriesPercent').textContent=`${Math.round(pct(t.kcal,p.calorieGoal))}%`;
  const circumference=2*Math.PI*54; $('#calorieRing').style.strokeDashoffset=circumference*(1-pct(t.kcal,p.calorieGoal)/100);
  $('#proteinText').textContent=`${Math.round(t.protein)} / ${p.proteinGoal} g`; $('#proteinBar').style.width=`${pct(t.protein,p.proteinGoal)}%`;
  $('#carbText').textContent=`${Math.round(t.carbs)} / ${p.carbGoal} g`; $('#carbBar').style.width=`${pct(t.carbs,p.carbGoal)}%`;
  $('#fatText').textContent=`${Math.round(t.fat)} / ${p.fatGoal} g`; $('#fatBar').style.width=`${pct(t.fat,p.fatGoal)}%`;
  renderMeals(); renderLowStock();
}
function renderMeals(){
  const list=$('#mealList'), meals=ensureDay().meals;
  if(!meals.length){ list.innerHTML='<div class="empty">Aún no registras comidas hoy. 🍽️</div>'; return; }
  list.innerHTML=meals.map(m=>`<div class="meal-row"><div class="meal-icon">${m.icon||'🍽️'}</div><div><strong>${escapeHtml(m.name)}</strong><small>${escapeHtml(m.detail||'Registro manual')}</small></div><div><div class="kcal">${Math.round(m.kcal)} kcal</div><button class="text-btn" data-delete-meal="${m.id}">Eliminar</button></div></div>`).join('');
  $$('[data-delete-meal]').forEach(b=>b.onclick=()=>{ ensureDay().meals=ensureDay().meals.filter(m=>m.id!==b.dataset.deleteMeal); saveState(); renderAll(); toast('Comida eliminada'); });
}
function renderLowStock(){
  const low=state.pantry.filter(x=>n(x.qty)<=n(x.low)).slice(0,3), el=$('#lowStockList');
  el.innerHTML=low.length?low.map(x=>`<div class="mini-stock"><strong>${escapeHtml(x.name)}</strong><small>${formatQty(x.qty)} ${escapeHtml(x.unit)} restantes</small></div>`).join(''):'<div class="empty" style="grid-column:1/-1">Todo bien abastecido ✨</div>';
}
function renderPantry(){
  const q=$('#pantrySearch').value.toLowerCase().trim(), f=$('#pantryFilter').value;
  let items=state.pantry.filter(x=>x.name.toLowerCase().includes(q));
  if(f==='low') items=items.filter(x=>n(x.qty)<=n(x.low)); else if(f!=='all') items=items.filter(x=>x.category===f);
  const grid=$('#pantryGrid');
  if(!items.length){ grid.innerHTML='<div class="empty" style="grid-column:1/-1">No encontré productos con ese filtro.</div>'; return; }
  grid.innerHTML=items.map(x=>`<article class="card pantry-card"><div class="category">${x.category==='drink'?'Bebida':x.category==='other'?'Otro':'Alimento'}</div><h3>${escapeHtml(x.name)}</h3><div class="stock-number">${formatQty(x.qty)}</div><div class="stock-unit">${escapeHtml(x.unit)} disponibles</div>${n(x.qty)<=n(x.low)?'<span class="low-chip">Stock bajo</span>':''}<div class="stock-controls"><button class="pressable" data-stock-minus="${x.id}">−</button><button class="history-btn" data-history="${x.id}">Historial</button><button class="pressable" data-stock-plus="${x.id}">+</button></div></article>`).join('');
  $$('[data-stock-minus]').forEach(b=>b.onclick=()=>openStockAdjust(b.dataset.stockMinus,-1));
  $$('[data-stock-plus]').forEach(b=>b.onclick=()=>openStockAdjust(b.dataset.stockPlus,1));
  $$('[data-history]').forEach(b=>b.onclick=()=>openHistory(b.dataset.history));
}
function renderReceipts(){
  const el=$('#receiptHistory');
  el.innerHTML=state.receipts.length?state.receipts.slice().reverse().map(r=>`<div class="timeline-row"><div class="meal-icon">🧾</div><div><strong>${escapeHtml(r.name)}</strong><small>${new Date(r.date).toLocaleString('es-CL')} · ${r.items} productos</small></div><b>${r.totalQty||r.items}</b></div>`).join(''):'<div class="empty">Todavía no guardas boletas.</div>';
}
function renderProgress(){
  const weights=state.weights.slice().sort((a,b)=>a.date.localeCompare(b.date));
  $('#lastWeight').textContent=weights.length?`${weights.at(-1).kg.toFixed(1)} kg`:'—';
  const keys=Object.keys(state.days).sort().slice(-7), daily=keys.map(k=>state.days[k].meals.reduce((s,m)=>s+n(m.kcal),0));
  $('#avgCalories').textContent=daily.length?`${Math.round(daily.reduce((a,b)=>a+b,0)/daily.length)} kcal`:'—';
  const good=daily.filter(v=>v>0 && Math.abs(v-state.profile.calorieGoal)<=state.profile.calorieGoal*.1).length;
  $('#goalDays').textContent=daily.length?`${good}/${daily.length}`:'—';
  const hist=$('#weightHistory'); hist.innerHTML=weights.length?weights.slice().reverse().map(w=>`<div class="timeline-row"><div class="meal-icon">⚖️</div><div><strong>${w.kg.toFixed(1)} kg</strong><small>${new Date(w.date+'T12:00:00').toLocaleDateString('es-CL',{day:'numeric',month:'long',year:'numeric'})}</small></div><button class="text-btn" data-delete-weight="${w.id}">Eliminar</button></div>`).join(''):'<div class="empty">Agrega tu primer peso para comenzar.</div>';
  $$('[data-delete-weight]').forEach(b=>b.onclick=()=>{ state.weights=state.weights.filter(w=>w.id!==b.dataset.deleteWeight); saveState(); renderProgress(); });
  renderWeightChart(weights.slice(-10));
}
function renderWeightChart(weights){
  const el=$('#weightChart'); if(!weights.length){ el.innerHTML='<div class="empty" style="width:100%">Sin datos suficientes para el gráfico.</div>'; return; }
  const vals=weights.map(w=>w.kg), min=Math.min(...vals)-1, max=Math.max(...vals)+1, range=max-min||1;
  el.innerHTML=weights.map(w=>{ const h=35+((w.kg-min)/range)*145; return `<div class="chart-col"><div class="chart-track"><div class="chart-bar" title="${w.kg} kg" style="height:${h}px"></div></div><small>${new Date(w.date+'T12:00:00').toLocaleDateString('es-CL',{day:'2-digit',month:'2-digit'})}</small></div>`; }).join('');
}
function renderAll(){ renderDashboard(); renderPantry(); renderReceipts(); renderProgress(); }

function navigate(view){
  $$('.view').forEach(v=>v.classList.toggle('active',v.dataset.view===view));
  $$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.nav===view));
  window.scrollTo({top:0,behavior:'smooth'});
}

function field(label,name,type='text',value='',extra=''){
  return `<label class="field"><span>${label}</span><input name="${name}" type="${type}" value="${escapeHtml(value)}" ${extra}></label>`;
}
function selectField(label,name,options,value){ return `<label class="field"><span>${label}</span><select name="${name}">${options.map(([v,l])=>`<option value="${v}" ${v===value?'selected':''}>${l}</option>`).join('')}</select></label>`; }
function openModal({title,eyebrow='NUEVO',body,submit='Guardar',onSubmit}){
  $('#modalTitle').textContent=title; $('#modalEyebrow').textContent=eyebrow; $('#modalBody').innerHTML=body; $('#modalSubmit').textContent=submit; modalHandler=onSubmit; $('#appModal').showModal();
}
$('#modalCloseBtn').onclick=()=>$('#appModal').close();
$('#modalCancelBtn').onclick=()=>$('#appModal').close();
$('#modalForm').addEventListener('submit',e=>{
  e.preventDefault();
  if(!modalHandler) return $('#appModal').close();
  const data=Object.fromEntries(new FormData(e.currentTarget));
  const ok=modalHandler(data);
  if(ok!==false) $('#appModal').close();
});

function openAddMeal(){
  const opts=state.pantry.map(x=>`<option value="${x.id}">${escapeHtml(x.name)} · ${formatQty(x.qty)} ${escapeHtml(x.unit)}</option>`).join('');
  openModal({title:'Registrar comida',eyebrow:'CALORÍAS',body:`${field('Nombre de la comida','name','text','','required placeholder="Ej. Desayuno"')}<div class="field-grid">${field('Calorías','kcal','number','','required min="0" step="1"')}${field('Proteínas (g)','protein','number','0','min="0" step="0.1"')}${field('Carbohidratos (g)','carbs','number','0','min="0" step="0.1"')}${field('Grasas (g)','fat','number','0','min="0" step="0.1"')}</div><label class="field"><span>Descontar de despensa (opcional)</span><select name="pantryId"><option value="">No descontar</option>${opts}</select></label>${field('Cantidad a descontar','pantryQty','number','0','min="0" step="0.1"')}<p class="muted small">Para una comida compuesta puedes registrarla como total. En futuras versiones se pueden guardar recetas con varios ingredientes.</p>`,submit:'Registrar',onSubmit:d=>{
    ensureDay().meals.push({id:crypto.randomUUID(),name:d.name,kcal:n(d.kcal),protein:n(d.protein),carbs:n(d.carbs),fat:n(d.fat),detail:d.pantryId&&n(d.pantryQty)>0?'Descontado de despensa':'Registro manual',icon:'🍽️'});
    if(d.pantryId&&n(d.pantryQty)>0) adjustStock(d.pantryId,-n(d.pantryQty),'Consumo personal'); saveState(); renderAll(); toast('Comida registrada');
  }});
}
function openAddProduct(prefill={}){
  openModal({title:'Agregar producto',eyebrow:'DESPENSA',body:`${field('Producto','name','text',prefill.name||'','required')}${selectField('Categoría','category',[['food','Alimento'],['drink','Bebida'],['other','Otro']],prefill.category||'food')}<div class="field-grid">${field('Cantidad','qty','number',prefill.qty??1,'required min="0" step="0.1"')}${field('Unidad','unit','text',prefill.unit||'unid','required')}</div>${field('Avisar cuando queden','low','number',prefill.low??1,'min="0" step="0.1"')}<p class="eyebrow" style="margin-top:5px">NUTRICIÓN OPCIONAL</p><div class="field-grid">${field('kcal por porción','kcal100','number',prefill.kcal100??0,'min="0" step="0.1"')}${field('Proteínas','protein100','number',prefill.protein100??0,'min="0" step="0.1"')}${field('Carbohidratos','carb100','number',prefill.carb100??0,'min="0" step="0.1"')}${field('Grasas','fat100','number',prefill.fat100??0,'min="0" step="0.1"')}</div>`,onSubmit:d=>{
    state.pantry.push({id:crypto.randomUUID(),name:d.name.trim(),qty:n(d.qty),unit:d.unit.trim(),low:n(d.low),category:d.category,kcal100:n(d.kcal100),protein100:n(d.protein100),carb100:n(d.carb100),fat100:n(d.fat100),movements:[{id:crypto.randomUUID(),date:new Date().toISOString(),delta:n(d.qty),reason:'Stock inicial'}]}); saveState(); renderAll(); toast('Producto agregado');
  }});
}
function openStockAdjust(id,sign){
  const item=state.pantry.find(x=>x.id===id); if(!item) return;
  openModal({title:sign>0?`Agregar ${item.name}`:`Descontar ${item.name}`,eyebrow:'MOVIMIENTO',body:`<p class="muted">Stock actual: <b>${formatQty(item.qty)} ${escapeHtml(item.unit)}</b></p>${field(`Cantidad (${item.unit})`,'qty','number','1','required min="0.1" step="0.1"')}${field('Motivo','reason','text',sign>0?'Compra manual':'Consumo familiar','required')}`,submit:sign>0?'Agregar':'Descontar',onSubmit:d=>{ adjustStock(id,sign*n(d.qty),d.reason); saveState(); renderAll(); toast(sign>0?'Stock agregado':'Stock descontado'); }});
}
function adjustStock(id,delta,reason){
  const item=state.pantry.find(x=>x.id===id); if(!item) return;
  item.qty=Math.max(0,n(item.qty)+delta); item.movements=item.movements||[]; item.movements.push({id:crypto.randomUUID(),date:new Date().toISOString(),delta,reason});
}
function openHistory(id){
  const item=state.pantry.find(x=>x.id===id); const rows=(item.movements||[]).slice().reverse().map(m=>`<div class="timeline-row"><div class="meal-icon">${m.delta>=0?'＋':'−'}</div><div><strong>${escapeHtml(m.reason)}</strong><small>${new Date(m.date).toLocaleString('es-CL')}</small></div><b>${m.delta>=0?'+':''}${formatQty(m.delta)} ${escapeHtml(item.unit)}</b></div>`).join('')||'<div class="empty">Sin movimientos registrados.</div>';
  openModal({title:item.name,eyebrow:'HISTORIAL',body:`<div class="timeline">${rows}</div>`,submit:'Cerrar',onSubmit:()=>true});
}
function openWeight(){ openModal({title:'Registrar peso',eyebrow:'PROGRESO',body:`${field('Peso (kg)','kg','number','','required min="20" max="400" step="0.1"')}${field('Fecha','date','date',todayKey(),'required')}`,submit:'Guardar peso',onSubmit:d=>{ state.weights.push({id:crypto.randomUUID(),kg:n(d.kg),date:d.date}); saveState(); renderProgress(); toast('Peso guardado'); }}); }
function openSettings(){ const p=state.profile; openModal({title:'Mis metas',eyebrow:'CONFIGURACIÓN',body:`${field('Nombre','name','text',p.name||'')}${field('Meta de calorías','calorieGoal','number',p.calorieGoal,'required min="500"') }<div class="field-grid">${field('Proteínas (g)','proteinGoal','number',p.proteinGoal,'required min="1"')}${field('Carbohidratos (g)','carbGoal','number',p.carbGoal,'required min="1"')}${field('Grasas (g)','fatGoal','number',p.fatGoal,'required min="1"')}</div><p class="muted small">Todo queda guardado localmente en este navegador.</p>`,onSubmit:d=>{ state.profile={...p,name:d.name,calorieGoal:n(d.calorieGoal),proteinGoal:n(d.proteinGoal),carbGoal:n(d.carbGoal),fatGoal:n(d.fatGoal)}; saveState(); renderAll(); toast('Metas actualizadas'); }}); }

function handleReceipt(file){
  if(!file) return; currentReceipt=file; pendingReceiptProducts=[];
  $('#receiptWorkspace').classList.remove('hidden'); $('#receiptFileName').textContent=file.name; $('#ocrText').value=''; $('#receiptProducts').innerHTML='';
  const preview=$('#receiptPreview');
  if(file.type.startsWith('image/')){ const url=URL.createObjectURL(file); preview.innerHTML=`<img src="${url}" alt="Vista previa de la boleta" />`; $('#runOcrBtn').disabled=false; }
  else { preview.innerHTML='<div class="pdf-placeholder"><div style="font-size:2rem">📄</div><strong>PDF cargado</strong><p>La lectura OCR automática está disponible para imágenes.</p></div>'; $('#runOcrBtn').disabled=true; }
  $('#ocrStatus').textContent='Archivo listo. Puedes leer texto o agregar productos manualmente.';
  navigate('boletas');
}
async function runOcr(){
  if(!currentReceipt?.type.startsWith('image/')) return toast('El OCR automático requiere una imagen');
  if(!window.Tesseract) return toast('No se pudo cargar el OCR');
  $('#runOcrBtn').disabled=true; $('#ocrStatus').textContent='Leyendo boleta… la primera vez puede demorar más.';
  try {
    const result=await Tesseract.recognize(currentReceipt,'spa',{logger:m=>{ if(m.status==='recognizing text') $('#ocrStatus').textContent=`Leyendo… ${Math.round((m.progress||0)*100)}%`; }});
    $('#ocrText').value=result.data.text.trim(); $('#ocrStatus').textContent='Texto leído. Revisa y corrige antes de convertirlo en productos.'; toast('Lectura terminada');
  } catch(err){ console.error(err); $('#ocrStatus').textContent='No pude leer esta imagen. Puedes ingresar los productos manualmente.'; toast('OCR no disponible para esta boleta'); }
  finally { $('#runOcrBtn').disabled=false; }
}
function parseOcr(){
  const raw=$('#ocrText').value.trim(); if(!raw) return toast('No hay texto para convertir');
  const ignored=/total|subtotal|iva|rut|boleta|fecha|hora|vuelto|efectivo|tarjeta|documento|cajero|descuento/i;
  const lines=raw.split(/\n+/).map(x=>x.replace(/\s+/g,' ').trim()).filter(x=>x.length>2 && !ignored.test(x));
  const products=[];
  for(const line of lines){
    if(products.length>=20) break;
    const cleaned=line.replace(/\$?\s*[\d\.]{3,}(?:,\d+)?\s*$/,'').replace(/^\d+\s*[xX]\s*/,'').trim();
    if(cleaned.length>=3 && /[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(cleaned)) products.push({id:crypto.randomUUID(),name:cleaned.slice(0,60),qty:1,unit:'unid'});
  }
  pendingReceiptProducts=products; renderReceiptProducts(); toast(`${products.length} líneas para revisar`);
}
function renderReceiptProducts(){
  const el=$('#receiptProducts');
  el.innerHTML=pendingReceiptProducts.length?pendingReceiptProducts.map((p,i)=>`<div class="receipt-product"><input data-r-name="${i}" value="${escapeHtml(p.name)}" aria-label="Producto"><input data-r-qty="${i}" type="number" min="0.1" step="0.1" value="${p.qty}" aria-label="Cantidad"><input data-r-unit="${i}" value="${escapeHtml(p.unit)}" aria-label="Unidad"><button data-r-remove="${i}" aria-label="Eliminar">×</button></div>`).join(''):'<div class="empty">Aún no hay productos confirmados.</div>';
  $$('[data-r-remove]').forEach(b=>b.onclick=()=>{ pendingReceiptProducts.splice(Number(b.dataset.rRemove),1); renderReceiptProducts(); });
}
function syncReceiptInputs(){
  $$('[data-r-name]').forEach(i=>pendingReceiptProducts[Number(i.dataset.rName)].name=i.value.trim());
  $$('[data-r-qty]').forEach(i=>pendingReceiptProducts[Number(i.dataset.rQty)].qty=n(i.value));
  $$('[data-r-unit]').forEach(i=>pendingReceiptProducts[Number(i.dataset.rUnit)].unit=i.value.trim()||'unid');
}
function addManualReceiptProduct(){ syncReceiptInputs(); pendingReceiptProducts.push({id:crypto.randomUUID(),name:'Producto',qty:1,unit:'unid'}); renderReceiptProducts(); }
function saveReceipt(){
  syncReceiptInputs(); const valid=pendingReceiptProducts.filter(p=>p.name&&p.qty>0); if(!valid.length) return toast('Agrega al menos un producto');
  for(const p of valid){
    const existing=state.pantry.find(x=>x.name.toLowerCase()===p.name.toLowerCase() && x.unit.toLowerCase()===p.unit.toLowerCase());
    if(existing) adjustStock(existing.id,p.qty,'Boleta supermercado');
    else state.pantry.push({id:crypto.randomUUID(),name:p.name,qty:p.qty,unit:p.unit,low:1,category:'food',kcal100:0,protein100:0,carb100:0,fat100:0,movements:[{id:crypto.randomUUID(),date:new Date().toISOString(),delta:p.qty,reason:'Boleta supermercado'}]});
  }
  state.receipts.push({id:crypto.randomUUID(),name:currentReceipt?.name||'Boleta',date:new Date().toISOString(),items:valid.length,totalQty:valid.reduce((s,p)=>s+n(p.qty),0)}); saveState(); renderAll(); $('#receiptWorkspace').classList.add('hidden'); pendingReceiptProducts=[]; currentReceipt=null; toast('Boleta agregada a la despensa');
}

function initEvents(){
  $('#todayLabel').textContent=cap(fmtDate());
  $$('.nav-item,[data-nav]').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.nav)));
  $('#addMealBtn').onclick=openAddMeal; $('#addPantryBtn').onclick=()=>openAddProduct(); $('#addWeightBtn').onclick=openWeight; $('#settingsBtn').onclick=openSettings;
  $$('[data-action]').forEach(b=>b.onclick=()=>({meal:openAddMeal,'pantry-add':()=>openAddProduct(),'pantry-remove':()=>{
    if(!state.pantry.length) return toast('Primero agrega productos');
    openModal({title:'Consumo familiar',eyebrow:'DESPENSA',body:`<label class="field"><span>Producto</span><select name="id">${state.pantry.map(x=>`<option value="${x.id}">${escapeHtml(x.name)} · ${formatQty(x.qty)} ${escapeHtml(x.unit)}</option>`).join('')}</select></label>${field('Cantidad','qty','number','1','required min="0.1" step="0.1"')}`,submit:'Descontar',onSubmit:d=>{ adjustStock(d.id,-n(d.qty),'Consumo familiar'); saveState(); renderAll(); toast('Stock actualizado'); }});
  },receipt:()=>{navigate('boletas');$('#chooseReceiptBtn').click();}}[b.dataset.action]?.()));
  $('#pantrySearch').oninput=renderPantry; $('#pantryFilter').onchange=renderPantry;
  const input=$('#receiptInput'), dz=$('#receiptDropzone'); $('#chooseReceiptBtn').onclick=e=>{e.stopPropagation();input.click();}; dz.onclick=e=>{ if(e.target.id!=='chooseReceiptBtn') input.click(); }; input.onchange=()=>handleReceipt(input.files[0]);
  ['dragenter','dragover'].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.add('dragover');})); ['dragleave','drop'].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.remove('dragover');})); dz.addEventListener('drop',e=>handleReceipt(e.dataTransfer.files[0]));
  $('#runOcrBtn').onclick=runOcr; $('#parseOcrBtn').onclick=parseOcr; $('#receiptManualProductBtn').onclick=addManualReceiptProduct; $('#saveReceiptBtn').onclick=saveReceipt;
}

initEvents(); renderAll();
if('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));
