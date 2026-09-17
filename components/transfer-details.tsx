'use client';
import {useState} from 'react';
import {Copy,Landmark,Smartphone} from 'lucide-react';
import {Button} from '@/components/ui/button';
import type {Config} from '@/lib/types';

export function hasTransferDetails(c:Config){return Boolean(c.transferAlias||c.transferPhone||c.transferBank||c.transferAccount||c.transferBeneficiary||c.transferDocument);}

export function TransferDetails({config:c}:{config:Config}){
 const [notice,setNotice]=useState('');
 async function copy(value:string,label:string){
  try{await navigator.clipboard.writeText(value);setNotice('Copiado: '+label+'.');}
  catch{setNotice('No se pudo copiar automáticamente. Mantené presionado el dato para seleccionarlo y copiarlo.');}
 }
 function detail(label:string,value:string|undefined){return value?<div className="transfer-detail" key={label}><div><dt>{label}</dt><dd>{value}</dd></div><Button type="button" variant="outline" aria-label={'Copiar '+label} onClick={()=>void copy(value,label)}><Copy size={16}/><span>Copiar</span></Button></div>:null;}
 return <section aria-labelledby="transfer-title"><div className="section-heading"><div><p className="eyebrow">PAGOS E INSCRIPCIONES</p><h2 id="transfer-title">Datos para transferencias</h2></div><Landmark size={25}/></div>
 <p className="section-copy">Podés copiar cada dato para usarlo en tu aplicación de pagos. Verificá la información con la organización.</p>
 {hasTransferDetails(c)?<div className="transfer-grid">
 {(c.transferAlias||c.transferPhone)&&<article className="white-panel transfer-card"><div className="transfer-card-title"><Smartphone size={24}/><div><span className="eyebrow">BILLETERA DIGITAL</span><h3>Alias o teléfono</h3></div></div><dl>{detail('Alias',c.transferAlias)}{detail('Número de teléfono',c.transferPhone)}</dl></article>}
 {(c.transferBank||c.transferAccount||c.transferBeneficiary||c.transferDocument)&&<article className="white-panel transfer-card"><div className="transfer-card-title"><Landmark size={24}/><div><span className="eyebrow">CUENTA BANCARIA</span><h3>Transferencia bancaria</h3></div></div><dl>{detail('Entidad',c.transferBank)}{detail('Número de cuenta',c.transferAccount)}{detail('Beneficiario',c.transferBeneficiary)}{detail('Documento',c.transferDocument)}</dl></article>}
 </div>:<div className="empty-state">La organización todavía no publicó los datos para transferencias.</div>}
 <p className="transfer-feedback" role="status" aria-live="polite">{notice}</p>
 <p className="transfer-note">Verificá el beneficiario y el número de cuenta antes de confirmar. Esta web no procesa pagos ni confirma transferencias automáticamente.</p>
 </section>;
}
