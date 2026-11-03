export type Player={id:string;name:string;club:string;nation:string;position:string;subPosition:string;clubs:string[];clubIds:string[];goals:number;appearances:number;seasons:string[];birthYear:number|null};
export type Slot={id:string;label:string;role:string;clue:string;answers:string[];key:string};
export const slotsBase=[
  ['lw','Linksbuiten','LW'],['st','Spits','ST'],['rw','Rechtsbuiten','RW'],
  ['cm1','Middenvelder','CM'],['cm2','Middenvelder','CM'],['cm3','Middenvelder','CM'],
  ['lb','Linksback','LB'],['cb1','Centrale verdediger','CB'],['cb2','Centrale verdediger','CB'],['rb','Rechtsback','RB'],
  ['gk','Doelman','GK']
] as const;
export const DATA_VERSION='nl1-2026-07-06-v1';
export function dateSeed(day:string){return [...`${DATA_VERSION}:${day}`].reduce((n,c)=>(Math.imul(n,31)+c.charCodeAt(0))|0,7)}
export function amsterdamDay(now=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Amsterdam',year:'numeric',month:'2-digit',day:'2-digit'}).format(now)}
export function normalize(s:string){return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()}
export function eligible(p:Player,role:string){
  const detail=p.subPosition;
  switch(role){
    case 'GK':return p.position==='Goalkeeper';
    case 'LB':return p.position==='Defender'&&detail==='Left-Back';
    case 'RB':return p.position==='Defender'&&detail==='Right-Back';
    case 'CB':return p.position==='Defender'&&detail==='Centre-Back';
    case 'CM':return p.position==='Midfield';
    case 'LW':return p.position==='Attack'&&detail==='Left Winger';
    case 'RW':return p.position==='Attack'&&detail==='Right Winger';
    case 'ST':return p.position==='Attack'&&(detail==='Centre-Forward'||detail==='Second Striker');
    default:return false;
  }
}
export function popularityShare(player:Player,slot:Slot,pool:Player[]){
  const byId=new Map(pool.map(p=>[p.id,p]));
  const choices=slot.answers.map(id=>byId.get(id)).filter((p):p is Player=>Boolean(p));
  const weight=(p:Player)=>Math.pow(Math.max(1,p.appearances+2*p.goals+10),0.75);
  const total=choices.reduce((sum,p)=>sum+weight(p),0);
  return total?weight(player)/total*100:0;
}
export function pointsFromShare(percent:number){const share=Math.max(0,Math.min(100,percent))/100;return Math.max(10,Math.min(100,Math.round(10+90*Math.pow(1-share,1.5))))}
export function points(player:Player,slot?:Slot,pool:Player[]=[]){return slot?pointsFromShare(popularityShare(player,slot,pool)):Math.max(10,Math.min(100,Math.round(1000/(player.appearances+player.goals*2+10))))}
export function rarityFromShare(share:number){return share<5?'Diamond':share<12?'Legendary':share<25?'Epic':share<40?'Rare':'Common'}
export function rarity(player:Player,slot?:Slot,pool:Player[]=[]){return slot?rarityFromShare(popularityShare(player,slot,pool)):'Common'}
export function isCorrect(slot:Slot,p:Player,used:string[]){return slot.answers.includes(p.id)&&!used.includes(p.id)}

export function hasUniqueEleven(slots:Pick<Slot,'answers'>[]){
  const assigned=new Map<string,number>();
  function find(index:number,seen:Set<string>):boolean{
    for(const id of slots[index].answers){
      if(seen.has(id))continue;
      seen.add(id);
      const prior=assigned.get(id);
      if(prior===undefined||find(prior,seen)){assigned.set(id,index);return true}
    }
    return false;
  }
  return slots.every((_,index)=>find(index,new Set()));
}

type Candidate={key:string;clue:string;answers:string[]};
const compare=(a:string,b:string)=>a<b?-1:a>b?1:0;
function candidatesFor(role:string,pool:Player[]):Candidate[]{
  const eligiblePlayers=pool.filter(p=>eligible(p,role));
  const byClub=new Map<string,{name:string;ids:string[]}>();
  const byNation=new Map<string,string[]>();
  const bySeason=new Map<string,string[]>();
  for(const p of eligiblePlayers){
    for(let i=0;i<p.clubIds.length;i++){
      const id=p.clubIds[i];const entry=byClub.get(id)||{name:p.clubs[i],ids:[]};entry.ids.push(p.id);byClub.set(id,entry);
    }
    if(p.nation){const ids=byNation.get(p.nation)||[];ids.push(p.id);byNation.set(p.nation,ids)}
    for(const season of p.seasons){const ids=bySeason.get(season)||[];ids.push(p.id);bySeason.set(season,ids)}
  }
  const candidates:Candidate[]=[];
  const add=(key:string,clue:string,ids:string[])=>{if(ids.length>=2&&ids.length<=16)candidates.push({key,clue,answers:[...new Set(ids)].sort((a,b)=>Number(a)-Number(b))})};
  for(const [id,{name,ids}] of [...byClub].sort(([a],[b])=>compare(a,b))){
    add(`club:${id}`,`Speelde voor ${name}`,ids);
    for(const [nation,nationIds] of byNation){
      const nationSet=new Set(nationIds);
      add(`club:${id}:nation:${nation}`,`Club: ${name} · Nationaliteit: ${nation}`,ids.filter(x=>nationSet.has(x)));
    }
  }
  for(const [nation,ids] of [...byNation].sort(([a],[b])=>compare(a,b)))add(`nation:${nation}`,`Nationaliteit: ${nation}`,ids);
  for(const [season,ids] of [...bySeason].sort(([a],[b])=>compare(a,b)))add(`season:${season}`,`Speelde in seizoen ${season}/${Number(season)+1}`,ids);
  return candidates;
}
export function buildPuzzle(pool:Player[],seed:number):Slot[]{
  let state=seed>>>0;
  const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296};
  const cache=new Map<string,Candidate[]>();
  const result:Slot[]=[];
  const targets=['easy','medium','hard','medium','easy','hard','medium','easy','hard','medium','hard'];
  const band=(count:number)=>count>=8?'easy':count>=4?'medium':'hard';
  for(const [index,[id,label,role]] of slotsBase.entries()){
    if(!cache.has(role))cache.set(role,candidatesFor(role,pool));
    const candidates=cache.get(role)!.map(c=>({c,order:random()})).sort((a,b)=>
      Number(band(a.c.answers.length)!==targets[index])-Number(band(b.c.answers.length)!==targets[index])||a.order-b.order);
    const choice=candidates.find(({c})=>!result.some(s=>s.key===c.key||s.clue===c.clue)&&hasUniqueEleven([...result,c]));
    if(!choice)throw new Error(`No solvable clue for ${role}; inspect player coverage`);
    result.push({id,label,role,...choice.c});
  }
  if(result.length!==11||!hasUniqueEleven(result))throw new Error('Invalid puzzle');
  return result;
}
