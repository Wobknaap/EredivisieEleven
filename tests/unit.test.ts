import {describe,it,expect} from 'vitest';
import {amsterdamDay,buildPuzzle,dateSeed,eligible,hasUniqueEleven,isCorrect,normalize,pointsFromShare,popularityShare,slotsBase} from '../src/engine';
import {players} from '../src/players';
import metadata from '../src/data/metadata.json';
import {candidatesFor} from '../src/puzzle';

describe('verified player pool',()=>{
  it('includes only recorded Eredivisie appearances',()=>{expect(players).toHaveLength(metadata.eligiblePlayers);expect(players.every(p=>p.appearances>0&&p.clubs.length===p.clubIds.length&&p.seasons.length>0)).toBe(true)});
  it('includes season goals and evidence-backed honours',()=>{
    expect(players.every(p=>p.goals===p.careerGoals&&p.goalsPerSeason.reduce((sum,value)=>sum+value.goals,0)===p.careerGoals)).toBe(true);
    expect(players.every(p=>!p.knvbBekerWinnerSeasons||p.knvbBekerWinnerSeasons.every(value=>p.knvbBekerSeasons?.some(season=>season.season===value.season)))).toBe(true);
    expect(players.every(p=>!p.johanCruijffSchaalWinnerSeasons||p.johanCruijffSchaalWinnerSeasons.every(value=>p.johanCruijffSchaalSeasons?.some(season=>season.season===value.season)))).toBe(true);
    expect(players.some(p=>Boolean(p.championSeasons?.length))).toBe(true);
    expect(players.some(p=>Boolean(p.knvbBekerFinalSeasons?.length))).toBe(true);
    expect(players.some(p=>Boolean(p.eredivisieTopScorerSeasons?.length))).toBe(true);
  });
  it('maps detailed roles without inventing left or right positions',()=>{
    expect(players.some(p=>eligible(p,'GK'))).toBe(true);
    expect(players.filter(p=>eligible(p,'LB')).every(p=>p.subPosition==='Left-Back')).toBe(true);
    expect(players.filter(p=>eligible(p,'RW')).every(p=>p.subPosition==='Right Winger')).toBe(true);
  });
  it('search normalization ignores accents and case',()=>expect(normalize('ÁJAX')).toBe('ajax'));
});
describe('4-3-3 puzzle',()=>{
  it('uses the requested formation and produces deterministic daily seeds',()=>{
    expect(slotsBase.map(s=>s[2])).toEqual(['LW','ST','RW','CM','CM','CM','LB','CB','CB','RB','GK']);
    expect(dateSeed('2026-11-03')).toBe(dateSeed('2026-11-03'));
    expect(buildPuzzle(players,42)).toEqual(buildPuzzle(players,42));
  });
  it('generates 100 solvable puzzles from evidence-backed clues',()=>{
    for(let seed=0;seed<100;seed++){
      const slots=buildPuzzle(players,seed);
      expect(slots).toHaveLength(11);expect(hasUniqueEleven(slots)).toBe(true);
      expect(new Set(slots.map(s=>s.clue)).size).toBe(11);
      for(const slot of slots){
        expect(slot.answers.length).toBeGreaterThanOrEqual(2);
        for(const id of slot.answers){const player=players.find(p=>p.id===id)!;expect(player).toBeDefined();expect(eligible(player,slot.role)).toBe(true);
          if(slot.key.startsWith('club:'))expect(player.clubIds).toContain(slot.key.split(':')[1]);
          if(slot.key.startsWith('nation:'))expect(player.nation).toBe(slot.key.slice(7));
        }
      }
    }
  });
  it('rejects duplicates and impossible assignments',()=>{
    const slot=buildPuzzle(players,42)[0],player=players.find(p=>p.id===slot.answers[0])!;
    expect(isCorrect(slot,player,[])).toBe(true);expect(isCorrect(slot,player,[player.id])).toBe(false);
    expect(hasUniqueEleven([{answers:['a']},{answers:['a']}])).toBe(false);
  });
  it('accepts a player for every Eredivisie club they represented',()=>{
    const clues=candidatesFor('CM',players).filter(c=>c.key.startsWith('club:'));
    const clubIdsByPlayer=new Map<string,Set<string>>();
    for(const clue of clues){
      for(const id of clue.answers){
        const ids=clubIdsByPlayer.get(id)||new Set<string>();
        ids.add(clue.key.split(':')[1]);
        clubIdsByPlayer.set(id,ids);
      }
    }
    const multi=[...clubIdsByPlayer].find(([,clubs])=>clubs.size>=2);
    expect(multi).toBeDefined();
    expect([...multi![1]].every(id=>players.find(p=>p.id===multi![0])!.clubIds.includes(id))).toBe(true);
  });
  it('models shares and rewards deterministically',()=>{
    const slot=buildPuzzle(players,42)[0];
    const total=slot.answers.reduce((sum,id)=>sum+popularityShare(players.find(p=>p.id===id)!,slot,players),0);
    expect(total).toBeCloseTo(100,6);expect(pointsFromShare(2)).toBeGreaterThan(pointsFromShare(40));
  });
  it('uses Amsterdam calendar dates across DST',()=>{
    expect(amsterdamDay(new Date('2026-03-29T21:59:00Z'))).toBe('2026-03-29');
    expect(amsterdamDay(new Date('2026-03-29T22:01:00Z'))).toBe('2026-03-30');
  });
});
