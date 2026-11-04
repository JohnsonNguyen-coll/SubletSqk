import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';

const root=new URL('../',import.meta.url);
const mark=await readFile(new URL('public/brand/veilhub-mark.svg',root),'utf8');
const body=mark.replace(/<svg[^>]*>/,'').replace('</svg>','').replace(/<title>.*?<\/title>/,'').replace(/\n[ \t]*\n/g,'\n');
const icon=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 112 112" fill="none"><g transform="translate(8 8)">${body}</g></svg>`;
await writeFile(new URL('app/icon.svg',root),icon+'\n');
await sharp(Buffer.from(mark)).resize(512,512).png().toFile(fileURLToPath(new URL('public/brand/veilhub-mark.png',root)));
await sharp(Buffer.from(icon)).resize(180,180).png().toFile(fileURLToPath(new URL('app/apple-icon.png',root)));

// ICO container with PNG-encoded images at common browser/Windows sizes.
const sizes=[16,32,48];
const images=await Promise.all(sizes.map(size=>sharp(Buffer.from(icon)).resize(size,size).png().toBuffer()));
const header=Buffer.alloc(6+16*sizes.length);
header.writeUInt16LE(1,2);header.writeUInt16LE(sizes.length,4);
let offset=header.length;
images.forEach((png,i)=>{const at=6+16*i;header[at]=sizes[i];header[at+1]=sizes[i];header.writeUInt16LE(1,at+4);header.writeUInt16LE(32,at+6);header.writeUInt32LE(png.length,at+8);header.writeUInt32LE(offset,at+12);offset+=png.length;});
await writeFile(new URL('app/favicon.ico',root),Buffer.concat([header,...images]));
console.log('Generated SVG favicon, 16/32/48px ICO, 180px Apple icon and 512px logo PNG.');
