import {useEffect,useMemo,useRef,useState} from 'react';
import {Check,Copy,Search,RotateCcw} from 'lucide-react';
import {amsterdamDay,buildPuzzle,DATA_VERSION,dateSeed,eligible,isCorrect,normalize,pointsFromShare,popularityShare,rarityFromShare,type Player,type Slot} from './engine';
import {players} from './players';
import metadata from './data/metadata.json';
import {recordCorrectPick} from './api';

type Reward={points:number;share:number};
type Progress={filled:Record<string,string>;wrong:number;score:number;rewards:Record<string,Reward>};
const empty=():Progress=>({filled:{},wrong:0,score:1100,rewards:{}});
const dailyKey=(day:string)=>`eleven-${DATA_VERSION}-${day}`;
const testKey=`eleven-test-${DATA_VERSION}`;
function readProgress(key:string):Progress{
  try{
    const value=JSON.parse(localStorage.getItem(key)||'null');
    if(!value||typeof value!=='object'||!value.filled||typeof value.filled!=='object'||!Number.isInteger(value.wrong)||value.wrong<0||value.wrong>12||!Number.isFinite(value.score)||value.score<0||value.score>1100)return empty();
    if(Object.values(value.filled).some(id=>typeof id!=='string'))return empty();
    return {filled:value.filled,wrong:value.wrong,score:value.score,rewards:value.rewards&&typeof value.rewards==='object'?value.rewards:{}};
  }catch{return empty()}
}
function savedTest(){try{const v=JSON.parse(localStorage.getItem(testKey)||'null');return Number.isInteger(v?.seed)?v.seed as number:null}catch{return null}}

export default function App(){
  const [day,setDay]=useState(amsterdamDay);
  const [testSeed,setTestSeed]=useState<number|null>(savedTest);
  const [progress,setProgress]=useState<Progress>(()=>readProgress(savedTest()===null?dailyKey(amsterdamDay()):testKey+'-progress'));
  const [active,setActive]=useState('st');
  const [query,setQuery]=useState('');
  const [cursor,setCursor]=useState(0);
  const [message,setMessage]=useState('');
  const submitting=useRef(false);
  const test=testSeed!==null;
  const seed=testSeed??dateSeed(day);
  const challenge=Math.max(1,Math.floor((Date.parse(day)-Date.parse('2026-11-03'))/86400000)+1);
  const puzzle=useMemo(()=>buildPuzzle(players,seed),[seed]);
  const slot=puzzle.find(s=>s.id===active)||puzzle[0];
  const selected=Object.values(progress.filled);
  const completed=selected.length;
  const finished=completed===11||progress.wrong>=12;
  const lookup=useMemo(()=>new Map(players.map(p=>[p.id,p])),[]);
  const matches=useMemo(()=>{
    const q=normalize(query);if(!q)return [];
    return players.filter(p=>normalize(p.name).includes(q)||p.clubs.some(c=>normalize(c).includes(q)))
      .sort((a,b)=>Number(normalize(b.name).startsWith(q))-Number(normalize(a.name).startsWith(q))||a.name.localeCompare(b.name)||Number(a.id)-Number(b.id)).slice(0,8);
  },[query]);

  useEffect(()=>{
    const timer=window.setInterval(()=>{const next=amsterdamDay();if(next!==day){setDay(next);if(!test){setProgress(readProgress(dailyKey(next)));setActive('st');setMessage('Nieuwe dagpuzzel.')}}},30000);
    return()=>clearInterval(timer);
  },[day,test]);
  const save=(next:Progress)=>{setProgress(next);localStorage.setItem(test?testKey+'-progress':dailyKey(day),JSON.stringify(next))};
  function guess(player:Player){
    if(submitting.current||finished||progress.filled[slot.id])return;
    submitting.current=true;
    try{
      if(selected.includes(player.id)){setMessage('Deze speler staat al in je elftal.');return}
      if(!eligible(player,slot.role)||!isCorrect(slot,player,selected)){
        const next={...progress,wrong:progress.wrong+1};save(next);setMessage('Niet goed. Je verliest één poging.');setQuery('');return;
      }
      const share=popularityShare(player,slot,players);
      const reward=pointsFromShare(share);
      const next={...progress,filled:{...progress.filled,[slot.id]:player.id},score:Math.max(0,progress.score-reward),rewards:{...progress.rewards,[slot.id]:{points:reward,share}}};
      save(next);setMessage(`${player.name} goed · ${rarityFromShare(share)} ${share.toFixed(1)}% · −${reward} punten`);
      if(!test)void recordCorrectPick(day,slot.id,player.id);
      const nextSlot=puzzle.find(s=>!next.filled[s.id]);if(nextSlot)setActive(nextSlot.id);
      setQuery('');setCursor(0);
    }finally{submitting.current=false}
  }
  function startTest(){
    const bytes=new Uint32Array(1);crypto.getRandomValues(bytes);
    const nextSeed=bytes[0]===seed?bytes[0]+1:bytes[0];
    setTestSeed(nextSeed);localStorage.setItem(testKey,JSON.stringify({seed:nextSeed}));
    const next=empty();setProgress(next);localStorage.setItem(testKey+'-progress',JSON.stringify(next));
    setActive('st');setQuery('');setCursor(0);setMessage('Nieuwe testpuzzel gestart.');
  }
  function backToday(){setTestSeed(null);localStorage.removeItem(testKey);setProgress(readProgress(dailyKey(day)));setActive('st');setQuery('');setMessage('Dagpuzzel hersteld.')}
  async function copy(){await navigator.clipboard.writeText(`Eredivisie Eleven ${test?'test':day} · ${completed}/11 · ${progress.wrong} fout · score ${progress.score}`);setMessage('Resultaat gekopieerd.')}
  return <main className="app">
    <header className="topbar"><div className="identity"><span className="identity-mark">11</span><div><strong>Eredivisie Eleven</strong><span>De dagelijkse voetbalpuzzel</span></div></div><div className="date">{test?'Testpuzzel':`Puzzel #${challenge} · ${day}`}</div></header>
    <div className="game-heading"><div><h1>Stel je elftal samen</h1><p>Vind voor elke positie een speler die bij de aanwijzing past.</p></div><div className="heading-actions"><button onClick={startTest}><RotateCcw size={16}/> Nieuwe testpuzzel</button>{test&&<button className="text-button" onClick={backToday}>Terug naar vandaag</button>}</div></div>
    <section className="scoreline" aria-label="Spelstatus"><div><span>Score</span><strong>{progress.score.toLocaleString('nl-NL')}</strong></div><div><span>Foute pogingen over</span><strong>{12-progress.wrong}<small> / 12</small></strong></div><div><span>Ingevuld</span><strong>{completed}<small> / 11</small></strong></div></section>
    <div className="game-grid"><section className="pitch-section" aria-label="4-3-3 opstelling"><div className="section-heading"><h2>4-3-3</h2><span>{completed} van 11 spelers</span></div><div className="pitch"><div className="pitch-outline"/><div className="center-line"/><div className="center-circle"/><div className="penalty-area"/><div className="formation">
      {[['lw','st','rw'],['cm1','cm2','cm3'],['lb','cb1','cb2','rb'],['gk']].map((row,i)=><div className={`pitch-row row-${i}`} key={i}>{row.map(id=><Position key={id} slot={puzzle.find(s=>s.id===id)!} player={lookup.get(progress.filled[id])} reward={progress.rewards[id]} active={slot.id===id} onClick={()=>{setActive(id);setQuery('');setMessage('')}}/>)}</div>)}
    </div></div></section>
    <section className="play-panel"><div className="section-heading"><h2>{slot.label}</h2><span>{slot.role}</span></div><p className="clue">{slot.clue}</p><p className="hint">Kies één speler die hieraan voldoet.</p>
      {progress.filled[slot.id]?<div className="filled-note"><Check size={17}/> {lookup.get(progress.filled[slot.id])?.name} staat op deze positie.</div>:<>
      <label htmlFor="player-search">Zoek een speler</label><div className="searchbox"><Search size={18}/><input id="player-search" autoComplete="off" value={query} disabled={finished} placeholder="Naam of club" onChange={e=>{setQuery(e.target.value);setCursor(0)}} onKeyDown={e=>{if(e.key==='ArrowDown'){e.preventDefault();setCursor(Math.min(cursor+1,matches.length-1))}if(e.key==='ArrowUp'){e.preventDefault();setCursor(Math.max(0,cursor-1))}if(e.key==='Enter'&&matches[cursor]){e.preventDefault();guess(matches[cursor])}}}/></div>
      {query.trim()&&<div className="suggestions" role="listbox" aria-label="Spelers">{matches.length?matches.map((p,i)=><button key={p.id} data-player-id={p.id} role="option" aria-selected={i===cursor} className={i===cursor?'highlighted':''} disabled={selected.includes(p.id)} onClick={()=>guess(p)}><span><b>{p.name}</b><small>{p.club} · {p.nation||'Nationaliteit onbekend'}{p.birthYear?` · ${p.birthYear}`:''}</small></span></button>):<p>Geen speler gevonden.</p>}</div>}</>}
      <p className="feedback" aria-live="polite">{message}</p><p className="rarity-note">Zeldzaamheid is een modelschatting op basis van Eredivisie-optredens en doelpunten.</p>
    </section></div>
    {finished&&<section className="result"><div><h2>{completed===11?'Elftal compleet':'Pogingen op'}</h2><p>Score {progress.score} · {completed} goed · {progress.wrong} fout</p></div><button onClick={copy}><Copy size={16}/> Kopieer resultaat</button><div className="result-list">{puzzle.filter(s=>progress.filled[s.id]).map(s=><div key={s.id}><span>{s.role} · {lookup.get(progress.filled[s.id])?.name}</span><b>{rarityFromShare(progress.rewards[s.id]?.share??100)} · −{progress.rewards[s.id]?.points??0}</b></div>)}</div></section>}
    <footer><span>Gebaseerd op {metadata.eligiblePlayers.toLocaleString('nl-NL')} gedocumenteerde Eredivisiespelers · seizoenen {metadata.firstSeason}–{metadata.lastSeason}</span><span>Elke dag een nieuwe puzzel om 00.00 uur (Amsterdam)</span></footer>
  </main>
}

function Position({slot,player,reward,active,onClick}:{slot:Slot;player?:Player;reward?:Reward;active:boolean;onClick:()=>void}){
  const tier=reward?rarityFromShare(reward.share):'';
  return <button className={`position ${active?'active':''} ${player?'complete':''}`} onClick={onClick} aria-label={`${slot.label}${player?`: ${player.name}, ${tier}, ${reward?.share.toFixed(1)} procent`:''}`}><span className="position-role">{slot.role}</span><strong>{player?player.name:slot.label}</strong>{reward&&<small className={`rank rank-${tier.toLowerCase()}`}>{tier} · {reward.share.toFixed(1)}%</small>}</button>
}
