import type {Player,Slot} from "./engine";

export const slotsBase=[
  ['lw','Linksbuiten','LW'],['st','Spits','ST'],['rw','Rechtsbuiten','RW'],
  ['cm1','Middenvelder','CM'],['cm2','Middenvelder','CM'],['cm3','Middenvelder','CM'],
  ['lb','Linksback','LB'],['cb1','Centrale verdediger','CB'],['cb2','Centrale verdediger','CB'],['rb','Rechtsback','RB'],['gk','Doelman','GK']
] as const;

export type HintFamily='club'|'land'|'carrière'|'prijs'|'statistiek'|'geboortejaar'|'seizoen';
export type Candidate={key:string;clue:string;answers:string[];family:HintFamily;kind:string;weight:number};

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

const compare=(a:string,b:string)=>a<b?-1:a>b?1:0;
const unique=(ids:string[])=>[...new Set(ids)].sort((a,b)=>Number(a)-Number(b));

function goalThreshold(role:string){
  if(role==='ST')return 15;
  if(role==='LW'||role==='RW'||role==='CM')return 10;
  if(role==='LB'||role==='RB'||role==='CB')return 5;
  return null;
}

/** Candidate generation is fact-based and modular; new hint types can be added here. */
export function candidatesFor(role:string,pool:Player[]):Candidate[]{
  const eligiblePlayers=pool.filter(p=>eligible(p,role));
  const byClub=new Map<string,{name:string;ids:string[]}>();
  const byNation=new Map<string,string[]>();
  const bySeason=new Map<string,string[]>();
  for(const p of eligiblePlayers){
    for(let i=0;i<p.clubIds.length;i++){
      const id=p.clubIds[i];
      const entry=byClub.get(id)||{name:p.clubs[i],ids:[]};
      entry.ids.push(p.id);byClub.set(id,entry);
    }
    if(p.nation){const ids=byNation.get(p.nation)||[];ids.push(p.id);byNation.set(p.nation,ids)}
    for(const season of p.seasons){const ids=bySeason.get(season)||[];ids.push(p.id);bySeason.set(season,ids)}
  }
  const candidates:Candidate[]=[];
  const add=(candidate:Candidate)=>{
    const answers=unique(candidate.answers);
    // Broad facts such as nationality can legitimately have more than 25
    // answers. The UI never reveals this count, and keeping them available
    // prevents the generator from falling back to club combinations only.
    if(answers.length>=2&&answers.length<=60)candidates.push({...candidate,answers});
  };
  const addFilter=(key:string,clue:string,family:HintFamily,kind:string,ids:string[],weight=1)=>add({key,clue,family,kind,weight,answers:ids});

  // Boost the middle of each position's club distribution so clues do not
  // collapse into only Ajax, PSV and Feyenoord.
  const clubRanks=[...byClub.entries()].sort((a,b)=>b[1].ids.length-a[1].ids.length);
  const clubWeight=(id:string)=>{
    const index=clubRanks.findIndex(([clubId])=>clubId===id);
    if(index<0||clubRanks.length<3)return 1;
    const percentile=index/(clubRanks.length-1);
    if(percentile<=.2)return .35;
    if(percentile<=.78)return 3.2;
    return 1.15;
  };

  for(const [id,{name,ids}] of [...byClub].sort(([a],[b])=>compare(a,b))){
    addFilter(`club:${id}`,`Speelde voor ${name}`,'club','club',ids,clubWeight(id));
    for(const [nation,nationIds] of byNation){
      const nationSet=new Set(nationIds);
      addFilter(`club:${id}:nation:${nation}`,`Club: ${name} · Nationaliteit: ${nation}`,'club','club-land',ids.filter(x=>nationSet.has(x)),clubWeight(id));
    }
  }
  // Two-club combinations make a useful medium/hard clue and include less
  // obvious clubs without inventing any player history.
  for(let i=0;i<clubRanks.length;i++)for(let j=i+1;j<clubRanks.length;j++){
    const [left,leftValue]=clubRanks[i];const [right,rightValue]=clubRanks[j];
    const rightSet=new Set(rightValue.ids);
    const intersection=leftValue.ids.filter(id=>rightSet.has(id));
    addFilter(`clubs:${left}+${right}`,`Speelde voor ${leftValue.name} én ${rightValue.name}`,'club','two-clubs',intersection,(clubWeight(left)+clubWeight(right))/2);
  }
  for(const [nation,ids] of [...byNation].sort(([a],[b])=>compare(a,b)))addFilter(`nation:${nation}`,`Nationaliteit: ${nation}`,'land','nation',ids,1.15);
  for(const [season,ids] of [...bySeason].sort(([a],[b])=>compare(a,b)))addFilter(`season:${season}`,`Speelde in seizoen ${season}/${Number(season)+1}`,'seizoen','season',ids,1);

  for(const [threshold,label] of [[50,'50'],[100,'100']] as const){
    addFilter(`career:appearances:${threshold}`,`Minstens ${label} Eredivisiewedstrijden`,'carrière','appearances',eligiblePlayers.filter(p=>p.appearances>=threshold).map(p=>p.id));
  }
  for(const [threshold,label] of [[3,'3'],[5,'5']] as const){
    addFilter(`career:seasons:${threshold}`,`Speelde in minstens ${label} Eredivisieseizoenen`,'carrière','seasons',eligiblePlayers.filter(p=>p.seasons.length>=threshold).map(p=>p.id));
    addFilter(`career:clubs:${threshold}`,`Speelde voor minstens ${label} Eredivisieclubs`,'carrière','clubs',eligiblePlayers.filter(p=>p.clubIds.length>=threshold).map(p=>p.id));
  }
  addFilter('birth:before-1990','Geboren vóór 1990','geboortejaar','birth-before-1990',eligiblePlayers.filter(p=>p.birthYear!==null&&p.birthYear<1990).map(p=>p.id));
  addFilter('birth:after-1995','Geboren in 1995 of later','geboortejaar','birth-after-1995',eligiblePlayers.filter(p=>p.birthYear!==null&&p.birthYear>=1995).map(p=>p.id));
  addFilter('birth:after-2000','Geboren in 2000 of later','geboortejaar','birth-after-2000',eligiblePlayers.filter(p=>p.birthYear!==null&&p.birthYear>=2000).map(p=>p.id));

  addFilter('honour:champion','Werd landskampioen','prijs','champion',eligiblePlayers.filter(p=>Boolean(p.championSeasons?.length)).map(p=>p.id),1.25);
  addFilter('honour:knvb-winner','Won de KNVB Beker','prijs','knvb-winner',eligiblePlayers.filter(p=>Boolean(p.knvbBekerWinnerSeasons?.length)).map(p=>p.id),1.2);
  addFilter('honour:knvb-final','Stond in de finale van de KNVB Beker','prijs','knvb-final',eligiblePlayers.filter(p=>Boolean(p.knvbBekerFinalSeasons?.length)).map(p=>p.id),1.1);
  addFilter('honour:jcs-winner','Won de Johan Cruijff Schaal','prijs','jcs-winner',eligiblePlayers.filter(p=>Boolean(p.johanCruijffSchaalWinnerSeasons?.length)).map(p=>p.id),1.1);
  addFilter('honour:top-scorer','Was topscorer van de Eredivisie','prijs','top-scorer',eligiblePlayers.filter(p=>Boolean(p.eredivisieTopScorerSeasons?.length)).map(p=>p.id));

  if(role!=='GK'){
    addFilter('stats:career-goals:25','Scoorde minstens 25 Eredivisiegoals','statistiek','career-goals-25',eligiblePlayers.filter(p=>p.careerGoals>=25).map(p=>p.id));
    addFilter('stats:career-goals:50','Scoorde minstens 50 Eredivisiegoals','statistiek','career-goals-50',eligiblePlayers.filter(p=>p.careerGoals>=50).map(p=>p.id));
    const threshold=goalThreshold(role);
    if(threshold!==null)addFilter(`stats:season-goals:${threshold}`,`Scoorde minstens ${threshold} goals in één Eredivisieseizoen`,'statistiek','season-goals',eligiblePlayers.filter(p=>p.goalsPerSeason.some(value=>value.goals>=threshold)).map(p=>p.id),1.15);
  }
  return candidates;
}

export function buildPuzzle(pool:Player[],seed:number):Slot[]{
  let state=seed>>>0;
  const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296};
  const cache=new Map<string,Candidate[]>();
  const result:Slot[]=[];
  const targets=['easy','medium','hard','medium','easy','hard','medium','easy','hard','medium','hard'];
  const band=(count:number)=>count>=8?'easy':count>=4?'medium':'hard';
  const familyCaps:Record<HintFamily,number>={club:4,land:2,'carrière':2,prijs:2,statistiek:2,'geboortejaar':2,seizoen:2};
  const roles=[...new Set(slotsBase.map(([, ,role])=>role))];
  for(const role of roles){
    if(pool.filter(p=>eligible(p,role)).length<10)throw new Error(`Not enough players for ${role}; need at least 10`);
    cache.set(role,candidatesFor(role,pool));
  }
  for(const [index,[id,label,role]] of slotsBase.entries()){
    const familyUse=new Map<HintFamily,number>();
    for(const slot of result){const family=slot.family as HintFamily|undefined;if(family)familyUse.set(family,(familyUse.get(family)||0)+1)}
    const familyScore=(candidate:Candidate)=>{
      const used=familyUse.get(candidate.family)||0;
      if(used>=familyCaps[candidate.family])return -1000;
      // Prefer a family that has not appeared yet, while still allowing a
      // category to return once or twice when the position needs it.
      const fresh=candidate.family==='club'?0:used===0?18:used===1?5:0;
      return fresh-used*2+random()*candidate.weight;
    };
    const candidates=cache.get(role)!.map(c=>({c,order:familyScore(c)})).sort((a,b)=>
      Number(band(a.c.answers.length)!==targets[index])-Number(band(b.c.answers.length)!==targets[index])||b.order-a.order);
    const choice=candidates.find(({c})=>!result.some(s=>s.key===c.key||s.clue===c.clue)&&hasUniqueEleven([...result,c]));
    if(!choice)throw new Error(`No solvable clue for ${role}; inspect player coverage`);
    result.push({id,label,role,...choice.c});
  }
  if(result.length!==11||!hasUniqueEleven(result))throw new Error('Invalid puzzle');
  return result;
}
