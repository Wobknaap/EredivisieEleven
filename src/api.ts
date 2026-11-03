export type CommunityStats={role:string;total:number;minimumSample:number;source:string;players:Array<{playerId:string;picks:number;share:number}>};
const apiRoot=import.meta.env.VITE_API_BASE||'/api';
function sessionId(){const key='eleven-session-v1';let id=localStorage.getItem(key);if(!id){id=crypto.randomUUID();localStorage.setItem(key,id)}return id}
export async function fetchPopularity(role:string):Promise<CommunityStats|null>{try{const response=await fetch(`${apiRoot}/popularity?role=${encodeURIComponent(role)}`);if(!response.ok)return null;return await response.json()}catch{return null}}
export async function recordCorrectPick(date:string,slotId:string,playerId:string){try{await fetch(`${apiRoot}/picks`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({date,slotId,playerId,sessionId:sessionId()})})}catch{/* Local play remains available when the API is offline. */}}
