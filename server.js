import express from 'express';
import multer from 'multer';
import mammoth from 'mammoth';
import WordExtractor from 'word-extractor';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {createWorker} from 'tesseract.js';
import {createRequire} from 'node:module';
import sharp from 'sharp';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {analyze,profiles} from './analysis.js';
const root=path.dirname(fileURLToPath(import.meta.url));
const require=createRequire(import.meta.url);
const app=express(), upload=multer({storage:multer.memoryStorage(),limits:{fileSize:15*1024*1024,files:1,fields:5}});
let busy=false;
app.disable('x-powered-by');
app.use((req,res,next)=>{res.set('X-Content-Type-Options','nosniff');res.set('Referrer-Policy','no-referrer');next();});
app.get('/engine.js',(req,res)=>res.sendFile(path.join(root,'analysis.js')));
app.use(express.static(path.join(root,'public')));
app.get('/api/health',(req,res)=>res.json({status:'ok'}));
app.post('/api/analyze',upload.single('file'),async(req,res,next)=>{
 let acquired=false;
 try {
 const file=req.file;if(!file) return res.status(400).json({error:'Choisissez un fichier.'});
 const target=JSON.parse(req.body.target||'{}');
 if(!profiles[target.profile]||!Number.isInteger(target.age)||target.age<3||target.age>25||typeof target.level!=='string'||target.level.length>100||!Array.isArray(target.needs)||target.needs.some(n=>!['attention','langage','lecture','sensoriel'].includes(n))) return res.status(400).json({error:'Le profil, l’âge (3 à 25 ans) et le niveau scolaire sont requis.'});
 if(busy)return res.status(429).json({error:'Une analyse est en cours. Réessayez dans quelques instants.'});busy=true;acquired=true;
 const ext=path.extname(file.originalname).toLowerCase();let document={text:'',warnings:[]};
 if(ext==='.pdf'){
 if(!file.buffer.subarray(0,5).equals(Buffer.from('%PDF-')))throw new Error('Le fichier ne semble pas être un PDF valide.');
 const loadingTask=getDocument({data:new Uint8Array(file.buffer),isEvalSupported:false,useSystemFonts:true});
 const pdf=await loadingTask.promise;
 try {if(pdf.numPages>40)throw new Error('Maximum 40 pages par document.');let sizes=[];
 for(let i=1;i<=pdf.numPages;i++){const page=await pdf.getPage(i);const content=await page.getTextContent();document.text+=content.items.map(x=>{if(x.str?.trim()&&x.height>0)sizes.push(x.height);return (x.str||'')+(x.hasEOL?'\n':' ')}).join('')+'\n\n';}if(sizes.length)document.minFont=Math.min(...sizes);
 document.warnings.push('PDF : extraction du texte uniquement. Les images, tableaux, titres et l’ordre de lecture doivent être vérifiés ; les PDF scannés sans texte ne sont pas pris en charge.');
 } finally {await loadingTask.destroy();}
 }else if(ext==='.docx'){
 const result=await mammoth.extractRawText({buffer:file.buffer});document.text=result.value;
 const html=await mammoth.convertToHtml({buffer:file.buffer});document.headings=(html.value.match(/<h[1-6](?:\s|>)/g)||[]).length;
 document.warnings.push('DOCX : les images, tableaux complexes et styles visuels ne sont pas évalués.');
 }else if(ext==='.doc'){
 const result=await new WordExtractor().extract(file.buffer);document.text=result.getBody();document.warnings.push('DOC : texte extrait ; la structure et les styles ne sont pas évalués.');
 }else if(['.jpg','.jpeg','.png'].includes(ext)){
 const normalized=await sharp(file.buffer,{limitInputPixels:25000000}).rotate().resize({width:2200,height:2200,fit:'inside',withoutEnlargement:true}).png().toBuffer();
 const lang=path.dirname(require.resolve('@tesseract.js-data/fra/package.json'))+'/4.0.0';
 const worker=await createWorker('fra',1,{langPath:lang,cacheMethod:'none'});
 try{const result=await worker.recognize(normalized);document.text=result.data.text;document.warnings.push(`Reconnaissance optique : confiance moyenne ${Math.round(result.data.confidence)} %. Corrigez les erreurs ; cette confiance n’est pas le score d’accessibilité.`);}finally{await worker.terminate();}
 }else return res.status(415).json({error:'Formats acceptés : JPG, PNG, PDF, DOC et DOCX.'});
 if(document.text.trim().length<20)return res.status(422).json({error:'Texte insuffisant ou non extractible. Pour un PDF scanné, importez les pages en JPG. Vérifiez aussi la lisibilité de l’image.'});
 res.set('Cache-Control','no-store').json({name:file.originalname,result:analyze(document,target)});
 }catch(error){next(error);}finally{if(acquired)busy=false;}
});
app.use((error,req,res,next)=>{const large=error.code==='LIMIT_FILE_SIZE';res.status(large?413:400).json({error:large?'Le fichier dépasse 15 Mo.':error instanceof SyntaxError?'Paramètres invalides.':error.message||'Impossible de lire ce document.'});});
const port=Number(process.env.PORT||3000);app.listen(port,process.env.HOST||'0.0.0.0',()=>console.log(`Accessibility Analyzer démarré sur le port ${port}`));
