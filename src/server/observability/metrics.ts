const counters=new Map<string,number>();
export function incrementMetric(name:string,value=1){counters.set(name,(counters.get(name)||0)+value);}
export function snapshotMetrics(){return Object.fromEntries(counters);}
export async function timed<T>(name:string,fn:()=>Promise<T>):Promise<T>{const started=Date.now();try{return await fn();}finally{incrementMetric(`${name}.count`);incrementMetric(`${name}.latency_ms`,Date.now()-started);}}
