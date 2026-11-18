import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const base=path.join(root,'Vardiya.Report');
const resource='StaticResources/RegisteredResources';
const read=p=>JSON.parse(fs.readFileSync(path.join(base,p),'utf8').replace(/^\uFEFF/,''));
const save=(p,j)=>{fs.mkdirSync(path.dirname(path.join(base,p)),{recursive:true});fs.writeFileSync(path.join(base,p),JSON.stringify(j,null,2));};
const lit=Value=>({expr:{Literal:{Value}}});
const photo=fs.readFileSync(path.join(base,resource,'ProfilFoto.png')).toString('base64');
const svg='<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="200" height="160" viewBox="0 0 200 160"><defs><clipPath id="avatar"><circle cx="100" cy="47" r="36"/></clipPath></defs><path d="M20 1H180" stroke="#A9BDC8" stroke-width="1"/><circle cx="100" cy="47" r="39" fill="#F8FAFB"/><image x="50" y="5" width="100" height="100" clip-path="url(#avatar)" xlink:href="data:image/png;base64,'+photo+'"/><text x="100" y="108" text-anchor="middle" font-family="Segoe UI,sans-serif" font-size="14" font-weight="600" fill="#233F50">Kutay Alaaddin</text><text x="100" y="128" text-anchor="middle" font-family="Segoe UI,sans-serif" font-size="11" fill="#356C83">Data &amp; BI Analyst</text><text x="100" y="148" text-anchor="middle" font-family="Segoe UI,sans-serif" font-size="10.5" fill="#356C83">k.alaaeddin@outlook.com</text></svg>';
fs.writeFileSync(path.join(base,resource,'Profil.svg'),svg);
const report=read('definition/report.json'),items=report.resourcePackages.find(p=>p.name==='RegisteredResources').items;
if(!items.some(x=>x.name==='Profil.svg'))items.push({name:'Profil.svg',path:'Profil.svg',type:'Image'});
save('definition/report.json',report);
for(const [i,page] of read('definition/pages/pages.json').pageOrder.entries()){
 const dir='definition/pages/'+page+'/visuals';
 const slicers=fs.readdirSync(path.join(base,dir)).map(id=>({id,j:read(dir+'/'+id+'/visual.json')})).filter(x=>x.j.visual?.visualType==='slicer'&&x.j.position.x<220).sort((a,b)=>a.j.position.y-b.j.position.y);
 slicers.forEach(({id,j},n)=>{j.position.y=166+n*68;j.position.height=62;save(dir+'/'+id+'/visual.json',j);});
 const id='ac00000000000000000'+i;
 const properties={};
 for(const name of ['title','subTitle','background','border','dropShadow','visualHeader'])properties[name]=[{properties:{show:lit('false')}}];
 properties.visualLink=[{properties:{show:lit('true'),type:lit("'WebUrl'"),webUrl:lit("'mailto:k.alaaeddin@outlook.com'"),tooltip:lit("'Kutay Alaaddin ile iletişime geç'")}}];
 save(dir+'/'+id+'/visual.json',{$schema:'https://developer.microsoft.com/json-schemas/fabric/item/report/definition/visualContainer/2.14.0/schema.json',name:id,position:{x:8,y:592,z:7000,width:200,height:160,tabOrder:7000},visual:{visualType:'image',objects:{image:[{properties:{sourceType:lit("'image'"),backgroundEnabled:lit('false'),sourceFile:{image:{name:lit("'Kutay Alaaddin'"),url:{expr:{ResourcePackageItem:{PackageName:'RegisteredResources',PackageType:1,ItemName:'Profil.svg'}}},scaling:lit("'Normal'")}}}}]},visualContainerObjects:properties}});
}
console.log('İki sayfaya profil alanı eklendi.');

