const buckets=new Map<string,{count:number;reset:number}>();
export function checkRateLimit(key:string,limit=30,windowMs=60_000){const now=Date.now();const b=buckets.get(key);if(!b||b.reset<=now){buckets.set(key,{count:1,reset:now+windowMs});return {ok:true,retryAfter:0};}if(b.count>=limit)return{ok:false,retryAfter:Math.ceil((b.reset-now)/1000)};b.count++;return{ok:true,retryAfter:0};}
