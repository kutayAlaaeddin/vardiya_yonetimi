import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const base=path.join(path.dirname(fileURLToPath(import.meta.url)), 'Vardiya.Report');
const read=file=>JSON.parse(fs.readFileSync(path.join(base,file),'utf8').replace(/^\uFEFF/,''));
function save(file,value){const dest=path.join(base,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,JSON.stringify(value,null,2));}
const literal=Value=>({expr:{Literal:{Value}}});
function set(objects,name,key,value){
 const entries=objects[name]??=[];
 let entry=entries.find(e=>!e.selector);
 if(!entry){entry={properties:{}};entries.push(entry);}
 entry.properties[key]=literal(value);
}
const report=read('definition/report.json');
const resources=report.resourcePackages.find(p=>p.name==='RegisteredResources').items;
const {pageOrder}=read('definition/pages/pages.json');
for(const [index,page] of pageOrder.entries()){
 const folder='definition/pages/'+page;
 const meta=read(folder+'/page.json');
 const rail='SolPanel'+index+'.svg';
 const panelId='aa00000000000000000'+index;
 const surface='#F0F4F6', ink='#233F50', railColor='#CCD9E0';
 meta.objects.background[0].properties.color={solid:{color:literal("'"+surface+"'")}};
 save(folder+'/page.json',meta);
 const top=62+index*45;
 const svg='<svg xmlns="http://www.w3.org/2000/svg" width="226" height="760" viewBox="0 0 226 760"><rect width="226" height="760" fill="'+surface+'"/><path fill="'+railColor+'" d="M0 0H226Q216 0 216 12V'+(top-12)+'q0 12 -12 12H31q-15 0 -15 15v8q0 15 15 15h173q12 0 12 12V748q0 12 10 12H0Z"/><g fill="none" stroke="'+ink+'" stroke-width="2.5" stroke-linejoin="round"><path d="M24 44V29l10 5v-8l10 6v-13h6l2 25z"/><path d="M30 39h4m5 0h4"/></g><text x="64" y="38" font-family="Segoe UI,sans-serif" font-size="16" font-weight="600" fill="'+ink+'">Vardiya analizi</text></svg>';
 fs.writeFileSync(path.join(base,'StaticResources/RegisteredResources',rail),svg);
 if(!resources.some(r=>r.name===rail))resources.push({name:rail,path:rail,type:'Image'});
 for(const visualId of fs.readdirSync(path.join(base,folder,'visuals'))){
  if(visualId===panelId || visualId.startsWith('ab0000000000000000'))continue;
  const file=folder+'/visuals/'+visualId+'/visual.json',item=read(file),v=item.visual;if(!v)continue;
  const container=v.visualContainerObjects??={};set(container,'title','alignment',"'center'");set(container,'subTitle','show','false');
  if(/Chart$/i.test(v.visualType))set(v.objects??={},'legend','position',"'TopCenter'");
  if(v.visualType==='slicer' && item.position.x<220){
   if(item.position.y%94===16)item.position.y+=156;
   else if(item.position.y%94===34)item.position.y+=44;
   set(container,'background','show','false');
   container.background[0].properties.color={solid:{color:literal("'#CCD9E0'")}};
   const slicerObjects=v.objects??={};
   set(slicerObjects,'items','fontSize','11D');
   set(slicerObjects,'items','fontFamily',"'Segoe UI'");
   const itemStyle=slicerObjects.items.find(entry=>!entry.selector).properties;
   itemStyle.fontColor={solid:{color:literal("'#233F50'")}};
   itemStyle.background={solid:{color:literal("'#F8FAFB'")}};
   set(slicerObjects,'items','outline',"'None'");
   set(container,'border','show','false');
   set(container,'dropShadow','show','false');
  }
    const title=container.title?.[0]?.properties;
  if(title?.fontColor)title.fontColor={solid:{color:literal("'#233F50'")}};
  for(const entry of v.objects?.labels??[])if(entry.properties.color)entry.properties.color={solid:{color:literal("'#285E74'")}};
  save(file,item);
 }
 const style={};for(const obj of ['title','subTitle','background','border','dropShadow'])set(style,obj,'show','false');
 for(const [offset,target] of pageOrder.entries()){
  const buttonId='ab0000000000000000'+index+offset;
  const label=read('definition/pages/'+target+'/page.json').displayName;
  const value=s=>literal("'"+s+"'");
  const fill=s=>({solid:{color:value(s)}});
  const state=(id,properties)=>({selector:{id},properties});
  const objects={
   text:[{properties:{show:literal('true')}},state('default',{text:value(label),fontColor:fill(ink),fontSize:literal('12D'),fontFamily:value(index===offset?'Segoe UI Semibold':'Segoe UI'),horizontalAlignment:value('center'),verticalAlignment:value('middle')})],
   fill:[state('default',{show:literal('false')}),state('hover',{show:literal('true'),fillColor:fill('#DEE8ED'),transparency:literal('10D')})],
   outline:[state('default',{show:literal('false')})],shape:[state('default',{roundEdge:literal('12L')})]
  };
  const link={show:literal('true'),type:value('PageNavigation'),navigationSection:value(target),tooltip:value(label+' sayfasına git')};
  save(folder+'/visuals/'+buttonId+'/visual.json',{$schema:'https://developer.microsoft.com/json-schemas/fabric/item/report/definition/visualContainer/2.14.0/schema.json',name:buttonId,position:{x:16,y:62+offset*45,width:199,height:38,z:8000+offset,tabOrder:8000+offset},visual:{visualType:'actionButton',objects,visualContainerObjects:{...style,visualLink:[{properties:link}]}}});
 }
 save(folder+'/visuals/'+panelId+'/visual.json',{$schema:'https://developer.microsoft.com/json-schemas/fabric/item/report/definition/visualContainer/2.14.0/schema.json',name:panelId,position:{x:0,y:0,z:0,width:226,height:760,tabOrder:9000},visual:{visualType:'image',objects:{image:[{properties:{sourceType:literal("'image'"),backgroundEnabled:literal('false'),sourceFile:{image:{name:literal("'Sol panel'"),url:{expr:{ResourcePackageItem:{PackageName:'RegisteredResources',PackageType:1,ItemName:rail}}},scaling:literal("'Normal'")}}}}]},visualContainerObjects:style}});
}
save('definition/report.json',report);

const themeFile='StaticResources/RegisteredResources/Vardiya.json';
const theme=read(themeFile);
Object.assign(theme,{dataColors:['#356C83','#92AAB8','#557F91','#B9CBD4'],foreground:'#233F50',tableAccent:'#356C83'});
save(themeFile,theme);


await import('./profil.mjs');
