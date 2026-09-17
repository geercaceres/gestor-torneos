import test from 'node:test';
import assert from 'node:assert/strict';
import {matchSearch,searchText} from '../lib/search.mjs';
import {parseCartDraft} from '../lib/cart-draft.mjs';

test('Búsqueda reconoce P01, P1, 1 y Partido 01 sin incluir P10',()=>{
 for(const query of ['P01','P1','1','partido 01',' p 001 ']){assert.equal(matchSearch(1,['Ana · Juan'],query),true);assert.equal(matchSearch(10,['Ana · Juan'],query),false)}
 assert.equal(matchSearch(10,['Ana · Juan'],'P10'),true);
});
test('Búsqueda por nombre ignora tildes y mayúsculas sin perder coincidencias parciales',()=>{
 assert.equal(matchSearch(3,['Sebastián Álvarez','Clara Garcete'],'SEBASTIAN'),true);
 assert.equal(matchSearch(3,['Sebastián Álvarez','Clara Garcete'],'alva'),true);
 assert.equal(searchText('  EMPANÁDA  '),'empanada');
 assert.equal(matchSearch(3,['Clara'],'Juan'),false);
});
const draft={payment:'transfer',items:[{productId:2,quantity:3,expectedPrice:10000}]};
test('Borrador conserva cantidades, precios y medio de pago sin ser una venta enviada',()=>{
 assert.deepEqual(parseCartDraft(JSON.stringify(draft)),draft);
 assert.throws(()=>parseCartDraft(JSON.stringify(draft),true));
 const pending={...draft,requestKey:'pending-sale-test-0001'};
 assert.deepEqual(parseCartDraft(JSON.stringify(pending),true),pending);
});
test('Borrador corrupto, duplicado o fuera de rango se rechaza antes de cobrar',()=>{
 for(const value of [null,{...draft,payment:'bitcoin'},{...draft,items:[...draft.items,...draft.items]},{...draft,items:[{productId:2,quantity:-1,expectedPrice:10000}]},{...draft,items:[{productId:2,quantity:1,expectedPrice:NaN}]}])assert.throws(()=>parseCartDraft(JSON.stringify(value)));
 assert.throws(()=>parseCartDraft('invalid-json'));
 assert.deepEqual(parseCartDraft(JSON.stringify({payment:'cash',items:[]})).items,[]);
});
