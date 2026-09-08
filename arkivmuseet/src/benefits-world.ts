import * as T from 'three';
import {benefitCanvas,benefitFor,leaderBenefits} from './benefits';
import type {GalleryItem} from './gallery';
import type {GalleryWorld} from './gallery-world';
import type {MuseumCase} from './types';
import {benefitPlacement} from './gallery-layout';
export function buildBenefit(parent:T.Object3D,gallery:GalleryWorld,c?:MuseumCase,accent='#f3cf86'){
 const hall=!c,p=benefitPlacement,width=hall?5.8:p.width,height=hall?3.62:p.height,y=hall?3.1:p.y,z=hall?0:p.z;
 const group=new T.Group();group.name='leader-benefit-'+(c?.id??'hall');parent.add(group);
 const brass=new T.MeshStandardMaterial({color:'#c8a667',metalness:.7,roughness:.3}),ink=new T.MeshStandardMaterial({color:'#0c2132',metalness:.2,roughness:.45});
 const box=(w:number,h:number,d:number,x:number,py:number,pz:number,mat:T.Material)=>{const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),mat);mesh.position.set(x,py,pz);group.add(mesh);return mesh;};
 box(width+.18,height+.18,p.depth,0,y,z,brass);box(width+.04,height+.04,.055,0,y,z+.135,ink);
 const texture=new T.CanvasTexture(benefitCanvas(c?.id,accent));texture.colorSpace=T.SRGBColorSpace;
 const face=new T.Mesh(new T.PlaneGeometry(width,height),new T.MeshBasicMaterial({map:texture,toneMapped:false}));face.position.set(0,y,z+.17);group.add(face);
 const footHeight=y-height/2;for(const x of [-width*.39,width*.39]){box(.065,footHeight,.08,x,footHeight/2,z,brass);box(.48,.045,.42,x,.04,z,ink);}
 const line=new T.MeshBasicMaterial({color:accent,toneMapped:false});box(width*.82,.025,.025,0,y+height/2+.15,z+.09,line);
 if(hall){for(const radius of [3.05,3.15]){const halo=new T.Mesh(new T.TorusGeometry(radius,.024,6,96),radius===3.05?line:brass);halo.position.set(0,3.2,-.22);group.add(halo);}}
 const b=c?benefitFor(c.id):null,id='benefit-'+(c?.id??'hall');face.userData.galleryId=id;gallery.targets.push(face);
 const item:GalleryItem={id,caseId:c?.id??'leader',kind:'benefit',title:b?.title??leaderBenefits.title,kicker:'DETTE KAN DU VINNE SOM LEDER',text:b?.text??leaderBenefits.intro,caption:leaderBenefits.basis,credit:'Museets faglige tolkning',url:leaderBenefits.sources[0].url,slot:'back-left'};gallery.items.set(id,item);
 return group;
}
