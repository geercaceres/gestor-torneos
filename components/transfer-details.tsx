'use client';
import {useState} from 'react';
import {Copy,Landmark,Smartphone} from 'lucide-react';
import {Button} from '@/components/ui/button';
import type {Config} from '@/lib/types';
import {localeOf,text} from '@/lib/i18n';

export function hasTransferDetails(c:Config){return Boolean(c.transferAlias||c.transferPhone||c.transferBank||c.transferAccount||c.transferBeneficiary||c.transferDocument);}

export function TransferDetails({config:c}:{config:Config}){
 const [notice,setNotice]=useState('');
 const l=localeOf(c),t=(es:string,en:string)=>text(l,es,en);
 async function copy(value:string,label:string){
  try{await navigator.clipboard.writeText(value);setNotice(t('Copiado: ','Copied: ')+label+'.');}
  catch{setNotice(t('No se pudo copiar automáticamente. Mantené presionado el dato para seleccionarlo y copiarlo.','Could not copy automatically. Press and hold the value to select and copy it.'));}
 }
 function detail(label:string,value:string|undefined){return value?<div className="transfer-detail" key={label}><div><dt>{label}</dt><dd>{value}</dd></div><Button type="button" variant="outline" aria-label={t('Copiar ','Copy ')+label} onClick={()=>void copy(value,label)}><Copy size={16}/><span>{t('Copiar','Copy')}</span></Button></div>:null;}
 return <section aria-labelledby="transfer-title"><div className="section-heading"><div><p className="eyebrow">{t('PAGOS E INSCRIPCIONES','PAYMENTS & REGISTRATION')}</p><h2 id="transfer-title">{t('Datos para transferencias','Transfer details')}</h2></div><Landmark size={25}/></div>
 <p className="section-copy">{t('Podés copiar cada dato para usarlo en tu aplicación de pagos. Verificá la información con la organización.','Copy any field into your payment app. Confirm the information with the organizer.')}</p>
 {hasTransferDetails(c)?<div className="transfer-grid">
 {(c.transferAlias||c.transferPhone)&&<article className="white-panel transfer-card"><div className="transfer-card-title"><Smartphone size={24}/><div><span className="eyebrow">{t('BILLETERA DIGITAL','DIGITAL WALLET')}</span><h3>{t('Alias o teléfono','Alias or phone')}</h3></div></div><dl>{detail('Alias',c.transferAlias)}{detail(t('Número de teléfono','Phone number'),c.transferPhone)}</dl></article>}
 {(c.transferBank||c.transferAccount||c.transferBeneficiary||c.transferDocument)&&<article className="white-panel transfer-card"><div className="transfer-card-title"><Landmark size={24}/><div><span className="eyebrow">{t('CUENTA BANCARIA','BANK ACCOUNT')}</span><h3>{t('Transferencia bancaria','Bank transfer')}</h3></div></div><dl>{detail(t('Entidad','Bank'),c.transferBank)}{detail(t('Número de cuenta','Account number'),c.transferAccount)}{detail(t('Beneficiario','Beneficiary'),c.transferBeneficiary)}{detail(t('Documento','Identification'),c.transferDocument)}</dl></article>}
 </div>:<div className="empty-state">{t('La organización todavía no publicó los datos para transferencias.','The organizer has not published transfer details yet.')}</div>}
 <p className="transfer-feedback" role="status" aria-live="polite">{notice}</p>
 <p className="transfer-note">{t('Verificá el beneficiario y el número de cuenta antes de confirmar. Esta web no procesa pagos ni confirma transferencias automáticamente.','Verify the beneficiary and account number before confirming. This site does not process payments or automatically confirm transfers.')}</p>
 </section>;
}
