import {buildPuzzle,dateSeed,eligible,isCorrect,slotsBase,type Player} from '../src/engine';
import {players} from '../src/players';

interface D1Result { success:boolean; meta?:{changes?:number} }
interface D1Statement { bind(...values:unknown[]):D1Statement; run():Promise<D1Result>; all<T=Record<string,unknown>>():Promise<{results:T[]}> }
interface D1Database { prepare(sql:string):D1Statement }
interface Env { DB:D1Database; ALLOWED_ORIGINS?:string }
const allowedRoles=new Set(slotsBase.map(([, ,role])=>role));
const corsHeaders=(origin:string,env:Env)=>({
  'Access-Control-Allow-Origin':(env.ALLOWED_ORIGINS||'http://localhost:5173,http://127.0.0.1:5173').split(',').map(x=>x.trim()).includes(origin)?origin:'null',
  'Access-Control-Allow-Methods':'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers':'Content-Type',
  'Vary':'Origin'
});
const json=(body:unknown,status=200,headers:Record<string,string>={})=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8',...headers}});
const validDay=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(`${s}T00:00:00Z`));
function isPlayer(value:unknown):value is Player{return typeof value==='string'&&players.some(p=>p.id===value)}

export default {async fetch(request:Request,env:Env):Promise<Response>{
  const origin=request.headers.get('Origin')||'';const cors=corsHeaders(origin,env);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  const url=new URL(request.url);
  if(url.pathname==='/api/health'&&request.method==='GET')return json({ok:true,store:'D1'},200,cors);
  if(url.pathname==='/api/popularity'&&request.method==='GET'){
    const role=url.searchParams.get('role')||'';if(!allowedRoles.has(role))return json({error:'Unknown role'},400,cors);
    const rows=await env.DB.prepare('SELECT player_id AS playerId, COUNT(*) AS picks FROM player_picks WHERE role = ? GROUP BY player_id').bind(role).all<{playerId:string;picks:number}>();
    const total=rows.results.reduce((sum,row)=>sum+Number(row.picks),0);
    return json({role,total,minimumSample:30,source:'community-correct-picks',players:rows.results.map(row=>({playerId:row.playerId,picks:Number(row.picks),share:total?Number(row.picks)/total*100:0}))},200,{...cors,'Cache-Control':'no-store'});
  }
  if(url.pathname==='/api/picks'&&request.method==='POST'){
    let body:{date?:string;slotId?:string;playerId?:string;sessionId?:string};try{body=await request.json()}catch{return json({error:'Invalid JSON'},400,cors)}
    const {date,slotId,playerId,sessionId}=body;
    if(!date||!validDay(date)||!slotId||!isPlayer(playerId)||!sessionId||!/^[0-9a-f-]{36}$/i.test(sessionId))return json({error:'Invalid pick'},400,cors);
    const slot=buildPuzzle(players,dateSeed(date)).find(s=>s.id===slotId);const player=players.find(p=>p.id===playerId)!;
    if(!slot||!eligible(player,slot.role)||!isCorrect(slot,player,[]))return json({error:'Pick does not match today’s clues'},422,cors);
    const prior=await env.DB.prepare('SELECT player_id FROM player_picks WHERE challenge_date = ? AND session_id = ? LIMIT 1').bind(date,sessionId).all<{player_id:string}>();
    if(prior.results.some(row=>row.player_id===playerId))return json({ok:true,duplicate:true},200,cors);
    const result=await env.DB.prepare('INSERT OR IGNORE INTO player_picks (challenge_date,slot_id,role,player_id,session_id) VALUES (?,?,?,?,?)').bind(date,slotId,slot.role,playerId,sessionId).run();
    return json({ok:true,recorded:Number(result.meta?.changes||0)>0},200,cors);
  }
  return json({error:'Not found'},404,cors);
}};
