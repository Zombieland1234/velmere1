import { createHash } from 'node:crypto';
import { gzip } from 'node:zlib';
import { promisify } from 'node:util';
import { mkdir, writeFile } from 'node:fs/promises';
const gzipAsync=promisify(gzip);
export const depths=['basic','pro','advanced'] as const;
export function hash(v:unknown){return createHash('sha256').update(typeof v==='string'?v:JSON.stringify(v)).digest('hex');}
export function arr(v:unknown){return Array.isArray(v)?v:[];}
export function obj(v:unknown):Record<string,unknown>{return v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};}
export function text(v:unknown){return typeof v==='string'?v:'';}
export function num(v:unknown){return typeof v==='number'&&Number.isFinite(v)?v:null;}
export async function saveGz(path:string,data:unknown){await mkdir(path.slice(0,path.lastIndexOf('/')),{recursive:true});await writeFile(path,await gzipAsync(Buffer.from(JSON.stringify(data,null,2))));}
export async function saveJson(path:string,data:unknown){await mkdir(path.slice(0,path.lastIndexOf('/')),{recursive:true});await writeFile(path,JSON.stringify(data,null,2));}
export async function mapLimit<T,R>(items:T[],limit:number,fn:(item:T,index:number)=>Promise<R>):Promise<R[]>{const out=new Array<R>(items.length);let next=0;async function worker(){while(true){const i=next++;if(i>=items.length)return;out[i]=await fn(items[i],i);}}await Promise.all(Array.from({length:Math.min(limit,items.length)},worker));return out;}
export function safeName(v:string){return v.toLowerCase().replace(/[^a-z0-9._-]+/g,'-');}
