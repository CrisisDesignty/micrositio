/*  Calendario de eventos  */
document.addEventListener('DOMContentLoaded', () => {
  /* ─── Constantes ───────────────────────────────────────────────────────── */
  const ADMIN_PASSWORD = 'koli';
  const EVENT_IMG     = 'https://media.istockphoto.com/id/501387734/es/foto/amigos-bailando.jpg?fit=crop&crop=faces&w=600&h=400';
  const monthNames    = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  /* ─── Estado ───────────────────────────────────────────────────────────── */
  let events       = loadEvents();         // array de {id,name,date,time}
  let isAdmin      = false;
  let today        = new Date();
  let currentMonth = today.getMonth();
  let currentYear  = today.getFullYear();

  /* ─── Selectores rápidos ──────────────────────────────────────────────── */
  const $ = s => document.querySelector(s);
  const $$= s => document.querySelectorAll(s);

  /* ─── Elementos ───────────────────────────────────────────────────────── */
  const elMonthYear  = $('#month-year');
  const elDays       = $('#calendar-days');
  const elEvents     = $('#events-list');
  const elAdminInd   = $('#admin-indicator');
  const elAdminCtrls = $('#admin-controls');

  /* ─── Utilidades ──────────────────────────────────────────────────────── */
  const uuid  = () => crypto.randomUUID();
  const fmt   = n => n.toString().padStart(2,'0');
  const str   = (y,m,d) => `${y}-${fmt(m+1)}-${fmt(d)}`;
  const disp  = s => {const d=new Date(s); return `${d.getDate()} de ${monthNames[d.getMonth()]}, ${d.getFullYear()}`};
  const h12   = t => {const [h,m]=t.split(':');return `${h}:${m}`};

  /* ─── Renderizador de calendario ─────────────────────────────────────── */
  function renderCalendar(){
    elDays.innerHTML='';
    elMonthYear.textContent=`${monthNames[currentMonth]} ${currentYear}`;

    const first   = new Date(currentYear,currentMonth,1).getDay();
    const daysInM = new Date(currentYear,currentMonth+1,0).getDate();
    const daysInP = new Date(currentYear,currentMonth,0).getDate();

    let day=1, next=1;
    for(let i=0;i<42;i++){
      const cell=document.createElement('div');
      cell.className='calendar-day flex items-center justify-center rounded-lg text-lg';
      let dateStr;

      if(i<first){                     // mes anterior
        const d=daysInP-first+i+1;
        dateStr=str(currentMonth?currentYear:currentYear-1,currentMonth?currentMonth-1:11,d);
        cell.textContent=d;
        cell.classList.add('other-month');
      }else if(day<=daysInM){          // mes actual
        dateStr=str(currentYear,currentMonth,day);
        cell.textContent=day;
        if(day===today.getDate()&&currentMonth===today.getMonth()&&currentYear===today.getFullYear())
          cell.classList.add('today');
        day++;
      }else{                           // mes siguiente
        dateStr=str(currentMonth===11?currentYear+1:currentYear,currentMonth===11?0:currentMonth+1,next);
        cell.textContent=next++;
        cell.classList.add('other-month');
      }

      // puntos si hay eventos
      if(events.some(e=>e.date===dateStr)){
        cell.classList.add('has-events');
        cell.insertAdjacentHTML('beforeend','<div class="event-indicator"></div>');
      }

      // click
      cell.onclick=()=>showDay(dateStr);

      elDays.appendChild(cell);
    }
  }

  /* ─── Render lista de eventos ────────────────────────────────────────── */
  function renderEvents(){
    elEvents.innerHTML='';
    const upcoming=[...events].filter(e=>new Date(e.date)>=new Date().setHours(0,0,0,0))
                               .sort((a,b)=>a.date===b.date?a.time.localeCompare(b.time):a.date.localeCompare(b.date));

    if(!upcoming.length){
      elEvents.innerHTML='<div class="text-gray-500 col-span-full text-center italic">No hay eventos programados</div>';
      return;
    }

    for(const ev of upcoming){
      const card=document.createElement('div');
      card.className='event-card cursor-pointer';
      card.innerHTML=`
        <img src="${EVENT_IMG}" alt="imagen evento" loading="lazy">
        <div class="p-3">
          <h3 class="text-gray-800">${ev.name}</h3>
          <div class="text-sm text-gray-600">${disp(ev.date)} · ${h12(ev.time)}</div>
        </div>`;
      card.onclick=()=>isAdmin?editEvent(ev.id):viewEvent(ev);
      elEvents.appendChild(card);
    }
  }

  /* ─── Eventos de día ─────────────────────────────────────────────────── */
  function showDay(dateStr){
    const list=events.filter(e=>e.date===dateStr).sort((a,b)=>a.time.localeCompare(b.time));
    if(isAdmin && !list.length) return addEvent(dateStr);
    if(!isAdmin && !list.length) return;
    alert(list.map(e=>`${e.name} – ${h12(e.time)}`).join('\n')); // versión rápida
  }

  /* ─── CRUD básico ───────────────────────────────────────────────────── */
  function addEvent(datePreset){
    const name=prompt('Nombre del evento:');
    if(!name) return;
    const date=datePreset||prompt('Fecha (YYYY-MM-DD):',str(currentYear,currentMonth,today.getDate()));
    const time=prompt('Hora (HH:MM):','19:00');
    events.push({id:uuid(),name,date,time});
    saveEvents();
    renderCalendar();renderEvents();
  }
  function editEvent(id){
    const ev=events.find(e=>e.id===id);
    if(!ev) return;
    const name=prompt('Editar nombre:',ev.name)??ev.name;
    const date=prompt('Editar fecha:',ev.date)??ev.date;
    const time=prompt('Editar hora:',ev.time)??ev.time;
    Object.assign(ev,{name,date,time});
    saveEvents();
    renderCalendar();renderEvents();
  }
  function viewEvent(ev){
    $('#event-details-title').textContent=ev.name;
    $('#event-details-date').textContent=disp(ev.date);
    $('#event-details-time').textContent=h12(ev.time);
    toggleModal('#event-details-modal',true);
  }

  /* ─── Admin y modales ───────────────────────────────────────────────── */
  $('#admin-trigger').onclick=askPass;
  document.addEventListener('keydown',e=>{
    if((e.metaKey||e.ctrlKey)&&e.shiftKey&&e.key==='A') askPass();
  });
  function askPass(){ $('#admin-password').value=''; toggleModal('#password-modal',true); }
  $('#submit-password-btn').onclick=()=>$('#admin-password').value===ADMIN_PASSWORD?toggleAdmin(true):errorPass();
  $('#cancel-password-btn').onclick=()=>toggleModal('#password-modal',false);
  function errorPass(){ $('#password-error').classList.add('visible'); }
  function toggleAdmin(state){
    isAdmin=state;
    toggleModal('#password-modal',false);
    elAdminCtrls.classList.toggle('hidden',!isAdmin);
    elAdminInd.classList.toggle('admin-mode-active',isAdmin);
    $('#events-panel-title').textContent=isAdmin?'Gestor de eventos':'Próximos eventos';
    renderEvents();
  }
  function toggleModal(sel,state){
    const m=$(sel); m.classList.toggle('active',state);
  }
  $('#close-event-details-btn').onclick=()=>toggleModal('#event-details-modal',false);

  /* ─── Persistencia ──────────────────────────────────────────────────── */
  function loadEvents(){
    try{return JSON.parse(localStorage.getItem('calendarEvents')||'[]');}
    catch{localStorage.removeItem('calendarEvents');return [];}
  }
  function saveEvents(){
    localStorage.setItem('calendarEvents',JSON.stringify(events));
  }

  /* ─── Navegación de meses ───────────────────────────────────────────── */
  $('#prev-month').onclick=()=>{currentMonth--;if(currentMonth<0){currentMonth=11;currentYear--}renderCalendar();}
  $('#next-month').onclick=()=>{currentMonth++;if(currentMonth>11){currentMonth=0;currentYear++}renderCalendar();}

  /* ─── Inicializar ───────────────────────────────────────────────────── */
  renderCalendar();
  renderEvents();
});
