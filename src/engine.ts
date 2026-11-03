export type SeasonStat={season:string;appearances:number;goals:number};
export type ClubStat={clubId:string;club:string;appearances:number;goals:number;seasons:string[]};
export type CupSeasonStat={season:string;appearances:number;finalAppearances:number};
export type SupercupSeasonStat={season:string;appearances:number};
export type Player={id:string;name:string;club:string;nation:string;position:string;subPosition:string;clubs:string[];clubIds:string[];clubStats:ClubStat[];goals:number;careerGoals:number;appearances:number;seasons:string[];birthYear:number|null;goalsPerSeason:SeasonStat[];championSeasons:SeasonStat[]|null;knvbBekerSeasons:CupSeasonStat[]|null;knvbBekerWinnerSeasons:CupSeasonStat[]|null;knvbBekerFinalSeasons:string[]|null;johanCruijffSchaalSeasons:SupercupSeasonStat[]|null;johanCruijffSchaalWinnerSeasons:SupercupSeasonStat[]|null;eredivisieTopScorerSeasons:{season:string;goals:number}[]|null};
export type Slot={id:string;label:string;role:string;clue:string;answers:string[];key:string;family?:string;kind?:string;weight?:number};
export const DATA_VERSION='nl1-2026-11-03-v2-hints';
export function dateSeed(day:string){return [...`${DATA_VERSION}:${day}`].reduce((n,c)=>(Math.imul(n,31)+c.charCodeAt(0))|0,7)}
export function amsterdamDay(now=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Amsterdam',year:'numeric',month:'2-digit',day:'2-digit'}).format(now)}
export function normalize(s:string){return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()}
export function goalsInSeason(player:Player,season:string){return player.goalsPerSeason.find(value=>value.season===season)?.goals??0}
export function scoredAtLeast(player:Player,goals:number){return player.careerGoals>=goals}
export function scoredAtLeastInSeason(player:Player,goals:number){return player.goalsPerSeason.some(value=>value.goals>=goals)}
export function hasWonEredivisie(player:Player){return Boolean(player.championSeasons?.length)}
export function hasWonKnvbBeker(player:Player){return Boolean(player.knvbBekerWinnerSeasons?.length)}
export function hasPlayedKnvbBekerFinal(player:Player){return Boolean(player.knvbBekerFinalSeasons?.length)}
export function hasWonJohanCruijffSchaal(player:Player){return Boolean(player.johanCruijffSchaalWinnerSeasons?.length)}
export function hasPlayedJohanCruijffSchaal(player:Player){return Boolean(player.johanCruijffSchaalSeasons?.length)}
export function wasEredivisieTopScorer(player:Player){return Boolean(player.eredivisieTopScorerSeasons?.length)}

type RecognitionTier='iconic'|'known'|'familiar'|'obscure';
type AssociationTier='iconic'|'strong'|'secondary'|'cameo';
const recognitionWeights:Record<RecognitionTier,number>={iconic:8,known:4,familiar:2,obscure:1};
const associationWeights:Record<AssociationTier,number>={iconic:5,strong:2,secondary:.8,cameo:.25};

// Fixed tiers make the proxy explainable. A player reaches the highest tier
// of any single rule; career facts are not accumulated into one magic number.
export function recognitionTier(player:Player):RecognitionTier{
  if(player.appearances>=180||player.careerGoals>=100||(player.championSeasons?.length??0)>=4||(player.eredivisieTopScorerSeasons?.length??0)>=2)return 'iconic';
  if(player.appearances>=100||player.careerGoals>=50||player.seasons.length>=6||hasWonEredivisie(player)||hasWonKnvbBeker(player))return 'known';
  if(player.appearances>=50||player.careerGoals>=20||player.seasons.length>=3)return 'familiar';
  return 'obscure';
}

function hasSeason(seasons:string[]|undefined,season:string){return Boolean(seasons?.includes(season))}
function clubAssociationTier(player:Player,clubId:string):AssociationTier{
  const stat=player.clubStats.find(value=>value.clubId===clubId);
  if(!stat)return 'cameo';
  const landmark=(player.championSeasons??[]).some(value=>hasSeason(stat.seasons,value.season))||
    (player.knvbBekerWinnerSeasons??[]).some(value=>hasSeason(stat.seasons,value.season))||
    (player.johanCruijffSchaalWinnerSeasons??[]).some(value=>hasSeason(stat.seasons,value.season));
  if(landmark||stat.seasons.length>=3||stat.appearances>=40||stat.goals>=15)return 'iconic';
  if(stat.seasons.length>=2||stat.appearances>=15||stat.goals>=5)return 'strong';
  if(stat.appearances>=5||stat.goals>=1)return 'secondary';
  return 'cameo';
}
function seasonAssociationTier(player:Player,season:string):AssociationTier{
  const value=player.goalsPerSeason.find(stat=>stat.season===season);
  if(!value)return 'cameo';
  if((player.championSeasons??[]).some(stat=>stat.season===season)||(player.eredivisieTopScorerSeasons??[]).some(stat=>stat.season===season))return 'iconic';
  if(value.appearances>=20||value.goals>=10)return 'strong';
  if(value.appearances>=8||value.goals>=3)return 'secondary';
  return 'cameo';
}
function clubAssociationWeight(player:Player,clubId:string){return associationWeights[clubAssociationTier(player,clubId)]}
function categoryAssociationWeight(player:Player,slot:Slot){
  const kind=slot.kind||'';
  if(kind==='club'||kind==='club-land')return clubAssociationWeight(player,slot.key.split(':')[1]);
  if(kind==='two-clubs'){
    const ids=slot.key.slice('clubs:'.length).split('+');
    return Math.sqrt(clubAssociationWeight(player,ids[0])*clubAssociationWeight(player,ids[1]));
  }
  if(kind==='season')return associationWeights[seasonAssociationTier(player,slot.key.slice('season:'.length))];
  if(kind==='champion')return (player.championSeasons?.length??0)>=3?5:2;
  if(kind==='knvb-winner')return (player.knvbBekerWinnerSeasons?.length??0)>=2?5:2;
  if(kind==='knvb-final')return (player.knvbBekerFinalSeasons?.length??0)>=2?2:.8;
  if(kind==='jcs-winner')return (player.johanCruijffSchaalWinnerSeasons?.length??0)>=2?5:2;
  if(kind==='top-scorer')return (player.eredivisieTopScorerSeasons?.length??0)>=2?5:2;
  if(kind==='career-goals-50')return player.careerGoals>=100?5:2;
  if(kind==='career-goals-25')return player.careerGoals>=50?3:1.5;
  if(kind==='season-goals')return Math.max(...player.goalsPerSeason.map(value=>value.goals),0)>=20?3:1.5;
  return 1;
}
export function guessWeight(player:Player,slot:Slot){return recognitionWeights[recognitionTier(player)]*categoryAssociationWeight(player,slot)}
export function popularityShare(player:Player,slot:Slot,pool:Player[]){
  const byId=new Map(pool.map(p=>[p.id,p]));
  const choices=slot.answers.map(id=>byId.get(id)).filter((p):p is Player=>Boolean(p));
  const weights=choices.map(choice=>guessWeight(choice,slot));
  const total=weights.reduce((sum,value)=>sum+value,0);
  if(!total)return 0;
  // A small equal prior prevents a two-answer clue from producing brittle
  // 0/100-style percentages while preserving category-specific outliers.
  const prior=total/Math.max(1,choices.length);
  const smoothed=weights.map(value=>.92*value+.08*prior);
  const smoothedTotal=smoothed.reduce((sum,value)=>sum+value,0);
  const index=choices.findIndex(choice=>choice.id===player.id);
  return index<0?0:smoothed[index]/smoothedTotal*100;
}
export function pointsFromShare(percent:number){const share=Math.max(0,Math.min(100,percent))/100;return Math.max(10,Math.min(100,Math.round(10+90*Math.pow(1-share,1.5))))}
export function points(player:Player,slot?:Slot,pool:Player[]=[]){return slot?pointsFromShare(popularityShare(player,slot,pool)):Math.max(10,Math.min(100,Math.round(1000/(player.appearances+player.goals*2+10))))}
export function rarityFromShare(share:number){return share<5?'Diamond':share<12?'Legendary':share<25?'Epic':share<40?'Rare':'Common'}
export function rarity(player:Player,slot?:Slot,pool:Player[]=[]){return slot?rarityFromShare(popularityShare(player,slot,pool)):'Common'}
export function isCorrect(slot:Slot,p:Player,used:string[]){return slot.answers.includes(p.id)&&!used.includes(p.id)}

export {slotsBase,eligible,hasUniqueEleven,buildPuzzle} from "./puzzle";
