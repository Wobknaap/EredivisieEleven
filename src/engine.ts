export type Player={id:string;name:string;club:string;nation:string;position:string;subPosition:string;clubs:string[];clubIds:string[];goals:number;appearances:number;seasons:string[];birthYear:number|null};
export type Slot={id:string;label:string;role:string;clue:string;answers:string[];key:string};
export const DATA_VERSION='nl1-2026-07-06-v1';
export function dateSeed(day:string){return [...`${DATA_VERSION}:${day}`].reduce((n,c)=>(Math.imul(n,31)+c.charCodeAt(0))|0,7)}
export function amsterdamDay(now=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Amsterdam',year:'numeric',month:'2-digit',day:'2-digit'}).format(now)}
export function normalize(s:string){return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()}
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

export {slotsBase,eligible,hasUniqueEleven,buildPuzzle} from "./puzzle";
