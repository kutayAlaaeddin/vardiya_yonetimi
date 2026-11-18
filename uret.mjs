import fs from 'node:fs';
import path from 'node:path';
import {gzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=path.dirname(fileURLToPath(import.meta.url));
const dir='Vardiya.SemanticModel/definition', report='Vardiya.Report/definition';
const dataOnly = process.argv.includes('--data-only');
function write(file,value){const dest=path.join(root,file);
 if(dataOnly && !file.startsWith('veri/')){
   if(!file.includes('/tables/') || !file.endsWith('.tmdl')) return;
   const embedded = /Text\.Combine\(\{[^}]+\}\)/;
   const existing = fs.readFileSync(dest,'utf8');
   if(!embedded.test(existing)) throw Error('Gömülü veri bulunamadı: '+file);
   value = existing.replace(embedded, value.match(embedded)[0]);
 }fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,value);}
function json(file,obj){write(file,JSON.stringify(obj,null,2));}
const schema=(part,v)=>'https://developer.microsoft.com/json-schemas/fabric/item/report/definition/'+part+'/'+v+'/schema.json';
const tables={},rows={};
function table(name,cols){tables[name]=cols.split('|');rows[name]=[];}
table('Takvim','GunID|Tarih|Hafta');
table('Hat','HatID|Tesis|Alan|Hat');
table('Vardiya','VardiyaID|Dilim');
table('Yetkinlik','YetkiID|Yetkinlik');
table('Calisan','KisiID|Çalışan');
table('IzinSecimi','KisiID|Çalışan');
table('Plan','GunID|HatID|VardiyaID|KisiID');
table('Belge','KisiID|YetkiID|Başlangıç|Bitiş');
table('Kapsama','GunID|HatID|VardiyaID|YetkiID|Gerekli|Mevcut|Destek adayı');
table('Katki','GunID|HatID|VardiyaID|YetkiID|KisiID|Kritik|Yedek');
let seed=1942;function random(){seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;}
const sites=['Bursa','Kocaeli','Sakarya','Eskişehir'],areas=['Pres','Kaynak','İşleme','Montaj'];
const skills=['Kalıp değiştirme','Pres ayarı','Robot devreye alma','Kaynak parametre onayı','CNC takım ayarı','İlk parça onayı','Tork doğrulama','Montaj fikstür ayarı','Ölçüm onayı','Hat serbest bırakma'];
const date=d=>new Date(Date.UTC(2026,10,1+d)).toISOString().slice(0,10);
for(let d=1;d<=28;d++)rows.Takvim.push([d,date(d),'Hafta '+Math.ceil(d/7)]);
rows.Vardiya=[[1,'06–14 Sabah'],[2,'14–22 Akşam'],[3,'22–06 Gece']];
skills.forEach((s,i)=>rows.Yetkinlik.push([i+1,s]));
const lineSkills=[];
for(let l=0;l<48;l++){const site=Math.floor(l/12),area=Math.floor(l%12/3);rows.Hat.push([l+1,sites[site],areas[area],sites[site]+' · '+areas[area]+' 0'+(1+l%3)]);lineSkills[l]=[area*2+1,area*2+2,9,10];}
const workers=[];
for(let i=0;i<5000;i++){
 const line=i%48,crew=Math.floor(i/48)%4,id=i+1,name='Çalışan '+String(id).padStart(4,'0');
 rows.Calisan.push([id,name]);rows.IzinSecimi.push([id,name]);
 const certs=new Map();for(const [j,s] of lineSkills[line].entries()){
 if(random()<[.19,.12,.16,.075][j]){const end=random()<.15?1+Math.floor(random()*28):180;certs.set(s,end);rows.Belge.push([id,s,date(-120),date(end)]);}}
 workers.push({id,line,crew,certs,name});
}
function requiredPeople(line, shift, skill, day) {
 const area = Math.floor((line % 12) / 3);
 const weekday = (day - 1) % 7 < 5;
 // Weekday die changes and afternoon machining setups need two qualified people.
 if (weekday && area === 0 && shift === 0 && skill === 1) return 2;
 if (weekday && area === 2 && shift === 1 && skill === 5) return 2;
 // The lower-volume night programme uses one measurement approver.
 return skill === 9 && shift !== 2 ? 2 : 1;
}
let demo=null;
for(let d=1;d<=28;d++){
 const groups=Array.from({length:144},()=>[]), counts=groups.map(()=>new Map());
 for(const w of workers){const v=(w.crew+Math.floor((d-1)/2))%4;if(v===3)continue;
 const key=w.line*3+v;groups[key].push(w);rows.Plan.push([d,w.line+1,v+1,w.id]);
 for(const [s,end] of w.certs)if(end>=d+(v===2?1:0))counts[key].set(s,(counts[key].get(s)||0)+1);}
 for(let k=0;k<144;k++){const l=Math.floor(k/3),v=k%3;
 for(const s of lineSkills[l]){const req=requiredPeople(l,v,s,d),n=counts[k].get(s)||0;let support='';
 if(n<=req){for(let other=Math.floor(l/12)*36+v;other<(Math.floor(l/12)+1)*36;other+=3){if(other===k)continue;
 const w=groups[other].find(w=>(w.certs.get(s)||0)>=d+(v===2?1:0)&&[...w.certs].every(([a,end])=>end<d+(v===2?1:0)||(counts[other].get(a)||0)>requiredPeople(Math.floor(other/3),v,a,d)));if(w){support=w.name;break;}}}
 rows.Kapsama.push([d,l+1,v+1,s,req,n,support]);
 for(const w of groups[k])if((w.certs.get(s)||0)>=d+(v===2?1:0)){
 rows.Katki.push([d,l+1,v+1,s,w.id,+(n===req),+(n===req+1)]);
 if(!demo&&n===req&&support)demo={date:date(d),hat:rows.Hat[l][3],v:rows.Vardiya[v][1],skill:skills[s-1],employee:w.name,support};}
 }}
}
const measures={
'İhtiyaç satırı':'COUNTROWS(Kapsama)',
'Mevcut açık':'COALESCE(COUNTROWS(FILTER(Kapsama, Kapsama[Mevcut] < Kapsama[Gerekli])), 0)',
'Tam sınırda':'COALESCE(COUNTROWS(FILTER(Kapsama, Kapsama[Mevcut] = Kapsama[Gerekli])), 0)',
'Yedekli':'[İhtiyaç satırı] - [Mevcut açık] - [Tam sınırda]',
'Karşılama oranı':'DIVIDE([İhtiyaç satırı] - [Mevcut açık], [İhtiyaç satırı])',
'Yeni açık':scenario('SUM(Katki[Kritik])'),
'Yedeğini kaybeden':scenario('SUM(Katki[Yedek])'),
'İzin sonrası açık':'IF(HASONEVALUE(IzinSecimi[KisiID]), [Mevcut açık] + [Yeni açık])',
'Senaryo başlığı':'IF(HASONEVALUE(IzinSecimi[KisiID]), SELECTEDVALUE(IzinSecimi[Çalışan]) & " izne çıkarsa ne değişir?", "İzin etkisini görmek için bir çalışan seçin")',
'Plan başlığı':'SELECTEDVALUE(Hat[Tesis], "Tüm tesisler") & " | Vardiya planı talebi karşılıyor mu?"',
'Destek önerisi':'IF([Yeni açık] = 1 && [İhtiyaç satırı] = 1, COALESCE(SELECTEDVALUE(Kapsama[Destek adayı]), "Uygun aday yok"))'
};
function scenario(expr){return 'VAR Kisi = SELECTEDVALUE(IzinSecimi[KisiID])\nRETURN\n    IF(NOT ISBLANK(Kisi), COALESCE(CALCULATE('+expr+', TREATAS({Kisi}, Katki[KisiID])), 0))';}
const numeric=c=>c.endsWith('ID')||['Gerekli','Mevcut','Kritik','Yedek'].includes(c);
const isDate=c=>['Tarih','Başlangıç','Bitiş'].includes(c);
write(dir+'/database.tmdl','database\n\tcompatibilityLevel: 1606\n');
write(dir+'/model.tmdl','model Model\n\tculture: tr-TR\n\tdefaultPowerBIDataSourceVersion: powerBI_V3\n\tdiscourageImplicitMeasures\n\tsourceQueryCulture: tr-TR\n\nannotation __PBI_TimeIntelligenceEnabled = 0\n\n'+Object.keys(tables).map(t=>'ref table '+t).join('\n'));
const rel=[];const dim={GunID:'Takvim',HatID:'Hat',VardiyaID:'Vardiya',YetkiID:'Yetkinlik',KisiID:'Calisan'};
for(const [t,cols] of Object.entries(tables)){
 write('veri/'+t+'.csv','\uFEFF'+[cols,...rows[t]].map(r=>r.join(';')).join('\r\n'));
 let out='table '+t+'\n';
 if(t==='Kapsama')for(const [m,expr] of Object.entries(measures)){out+="\n\tmeasure '"+m+"' =\n\t\t\t"+expr.replaceAll('\n','\n\t\t\t')+'\n';if(!['Plan başlığı','Senaryo başlığı','Destek önerisi'].includes(m))out+='\t\tformatString: '+(m==='Karşılama oranı'?'0.0%':'#,0')+'\n';}
 for(const c of cols){out+="\n\tcolumn '"+c+"'\n\t\tdataType: "+(numeric(c)?'int64':isDate(c)?'dateTime':'string')+'\n\t\tsummarizeBy: none\n\t\tsourceColumn: '+c+'\n';if(c.endsWith('ID'))out+='\t\tisHidden\n';if(isDate(c))out+='\t\tformatString: dd.MM.yyyy\n';if(dim[c]&&['Kapsama','Plan','Belge','Katki'].includes(t))rel.push('relationship '+t+'_'+c+'\n\tfromColumn: '+t+'.'+c+'\n\ttoColumn: '+dim[c]+'.'+c);}
 const chunks=gzipSync(fs.readFileSync(path.join(root,'veri',t+'.csv'))).toString('base64').match(/.{1,16000}/g).map(x=>'"'+x+'"').join(', ');
 out+='\n\tpartition '+t+' = m\n\t\tmode: import\n\t\tsource =\n\t\t\tlet\n\t\t\t    Csv = Csv.Document(Binary.Decompress(Binary.FromText(Text.Combine({'+chunks+'}), BinaryEncoding.Base64), Compression.GZip), [Delimiter=";", Encoding=65001]),\n\t\t\t    Headers = Table.PromoteHeaders(Csv),\n\t\t\t    Typed = Table.TransformColumnTypes(Headers, {'+cols.map(c=>'{"'+c+'", '+(numeric(c)?'Int64.Type':isDate(c)?'type date':'type text')+'}').join(', ')+'}, "en-US")\n\t\t\tin Typed\n';write(dir+'/tables/'+t+'.tmdl',out);}
write(dir+'/relationships.tmdl',rel.join('\n\n'));
if(dataOnly) process.exit(0);
const prev=path.join(root,'../01 Kurum-Analitigi-Portfoy');
function existing(f){return JSON.parse(fs.readFileSync(path.join(prev,f),'utf8').replace(/^\uFEFF/,''));}
const project=existing('Portfoy.pbip');project.artifacts[0].report.path='Vardiya.Report';json('Vardiya.pbip',project);
const binding=existing('Portfoy.Report/definition.pbir');binding.datasetReference.byPath.path='../Vardiya.SemanticModel';json('Vardiya.Report/definition.pbir',binding);
json('Vardiya.SemanticModel/definition.pbism',existing('Portfoy.SemanticModel/definition.pbism'));json(report+'/version.json',existing('Portfoy.Report/definition/version.json'));
const old=existing('Portfoy.Report/definition/report.json'),base=old.resourcePackages.find(p=>p.name==='SharedResources'),baseFile='StaticResources/SharedResources/'+base.items[0].path;
write('Vardiya.Report/'+baseFile,fs.readFileSync(path.join(prev,'Portfoy.Report',baseFile)));
const theme='Vardiya.json';json('Vardiya.Report/StaticResources/RegisteredResources/'+theme,{name:'Vardiya',dataColors:['#956D80','#6D8C80','#D69475','#B5A9BF'],background:'#FFFFFF',foreground:'#302935',tableAccent:'#956D80'});
json(report+'/report.json',{$schema:old.$schema,themeCollection:{...old.themeCollection,customTheme:{...old.themeCollection.customTheme,name:theme}},resourcePackages:[base,{name:'RegisteredResources',type:'RegisteredResources',items:[{name:theme,path:theme,type:'CustomTheme'}]}]});
const id=s=>createHash('sha1').update(s).digest('hex').slice(0,20),pages=['Vardiya dengesi','İzin simülasyonu'].map(id);
json(report+'/pages/pages.json',{$schema:schema('pagesMetadata','1.1.0'),pageOrder:pages,activePageName:pages[0]});
const lit=v=>({expr:{Literal:{Value:v}}}),str=s=>lit("'"+s+"'"),color=s=>({solid:{color:str(s)}});
function field(t,c){return {[Object.hasOwn(measures,c)?'Measure':'Column']:{Expression:{SourceRef:{Entity:t}},Property:c}};}
for(let p=0;p<2;p++){const folder=report+'/pages/'+pages[p];let seq=0;
json(folder+'/page.json',{$schema:schema('page','2.1.0'),name:pages[p],displayName:['Vardiya dengesi','İzin simülasyonu'][p],displayOption:'FitToPage',width:1280,height:760,objects:{background:[{properties:{color:color('#E9ECE3'),transparency:lit('0D')}}]}});
function vis(type,title,x,y,width,height,roles,opts={}){const name=id(p+'-'+(++seq)),queryState={};
 for(const [role,fields] of Object.entries(roles)){queryState[role]={projections:fields.map(([t,c])=>({field:field(t,c),queryRef:t+'.'+c,nativeQueryRef:c,...(role==='Category'?{active:true}:{})}))};}
 const objects={title:[{properties:{show:lit('true'),text:opts.dynamic?{expr:field('Kapsama',opts.dynamic)}:str(title),fontSize:lit('12D'),fontColor:color('#40323B')}}],background:[{properties:{show:lit('true'),color:color(opts.side?'#D9C9CC':'#FFFFFF'),transparency:lit('0D')}}]};
 const visual={visualType:type,query:{queryState},visualContainerObjects:objects};
 if(type==='card'){const heading=height<60;visual.objects={labels:[{properties:{fontSize:lit(heading?'19D':'29D'),fontFamily:str('Segoe UI Semibold'),color:color('#553F4C'),labelDisplayUnits:lit('1D')}}],categoryLabels:[{properties:{show:lit('false')}}]};if(heading)objects.title[0].properties.show=lit('false');}
 if(type==='slicer')visual.objects={data:[{properties:{mode:str('Dropdown')}}],header:[{properties:{show:lit('false')}}],...(opts.single?{selection:[{properties:{singleSelect:lit('true')}}]}:{})};
 json(folder+'/visuals/'+name+'/visual.json',{$schema:schema('visualContainer','2.14.0'),name,position:{x,y,width,height,z:seq,tabOrder:seq},visual});}
 const m=c=>['Kapsama',c];
 const left=[['Hat','Tesis'],['Takvim','Hafta'],['Vardiya','Dilim'],['Hat','Alan'],['Yetkinlik','Yetkinlik']];
 if(p)left.unshift(['IzinSecimi','Çalışan']);
 left.forEach(([t,c],i)=>vis('slicer',c==='Çalışan'?'Kim izne çıkıyor?':c,12,16+i*94,200,84,{Values:[[t,c]]},{side:true,single:c==='Çalışan'}));
 const cards=p?['Mevcut açık','Yeni açık','Yedeğini kaybeden','İzin sonrası açık']:['İhtiyaç satırı','Mevcut açık','Tam sınırda','Karşılama oranı'];
 cards.forEach((c,i)=>vis('card',c,226+i*261,70,251,98,{Values:[m(c)]}));
 vis('card',p?'İzin simülasyonu':'Vardiya dengesi',226,12,1034,52,{Values:[m(p?'Senaryo başlığı':'Plan başlığı')]});
 const by=(type,title,x,y,w,h,axis,metrics)=>vis(type,title,x,y,w,h,{Category:[axis],Y:metrics.map(m)});
 by('clusteredBarChart',p?'Hangi yetkinlikler etkileniyor?':'Hangi yetkinliklerde açık var?',226,180,507,260,['Yetkinlik','Yetkinlik'],p?['Yeni açık','Yedeğini kaybeden']:['Mevcut açık','Tam sınırda']);
 by('clusteredColumnChart',p?'Risk hangi vardiyaya taşınıyor?':'Hangi vardiyada yedek azalıyor?',745,180,515,260,['Vardiya','Dilim'],p?['Mevcut açık','İzin sonrası açık']:['Mevcut açık','Tam sınırda']);
 if(!p)by('lineChart','Günlere göre açık sayısı nasıl değişiyor?',226,452,1034,292,['Takvim','Tarih'],['Mevcut açık','Tam sınırda']);
 else vis('tableEx','Hangi göreve destek gerekiyor?',226,452,1034,292,{Values:[['Takvim','Tarih'],['Hat','Hat'],['Vardiya','Dilim'],['Yetkinlik','Yetkinlik'],m('Destek önerisi')]});
}
console.log(JSON.stringify({counts:Object.fromEntries(Object.entries(rows).map(([k,v])=>[k,v.length])),demo,open:rows.Kapsama.filter(r=>r[5]<r[4]).length,atLimit:rows.Kapsama.filter(r=>r[5]===r[4]).length}));


await import('./bicim.mjs');
