export function parseCartDraft(raw,pending=false){
 const value=JSON.parse(raw);
 if(!value||!['cash','transfer'].includes(value.payment)||!Array.isArray(value.items)||value.items.length>50||pending&&!/^[a-zA-Z0-9-]{16,80}$/.test(value.requestKey||''))throw Error('Borrador inválido');
 if(pending&&!value.items.length)throw Error('Venta pendiente vacía');
 const ids=new Set();
 for(const i of value.items){if(!i||!Number.isSafeInteger(i.productId)||i.productId<1||ids.has(i.productId)||!Number.isInteger(i.quantity)||i.quantity<1||i.quantity>1000||!Number.isSafeInteger(i.expectedPrice)||i.expectedPrice<0||i.expectedPrice>10000000)throw Error('Producto inválido en borrador');ids.add(i.productId)}
 return value;
}
