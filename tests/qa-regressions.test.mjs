import test from 'node:test';
import assert from 'node:assert/strict';
import {matchSearch,searchText} from '../lib/search.mjs';
import {parseCartDraft} from '../lib/cart-draft.mjs';

test('Search recognizes M01, M1, 1, and Match 01 without including M10',()=>{
 for(const query of ['P01','P1','1','partido 01',' p 001 ']){assert.equal(matchSearch(1,['Ana · Juan'],query),true);assert.equal(matchSearch(10,['Ana · Juan'],query),false)}
 assert.equal(matchSearch(10,['Ana · Juan'],'P10'),true);
});
test('Name search ignores accents and case while preserving partial matches',()=>{
 assert.equal(matchSearch(3,['Sebastián Álvarez','Clara Garcete'],'SEBASTIAN'),true);
 assert.equal(matchSearch(3,['Sebastián Álvarez','Clara Garcete'],'alva'),true);
 assert.equal(searchText('  EMPANÁDA  '),'empanada');
 assert.equal(matchSearch(3,['Clara'],'Juan'),false);
});
const draft={payment:'transfer',items:[{productId:2,quantity:3,expectedPrice:10000}]};
test('Cart drafts preserve quantities, prices, and payment method without sending a sale',()=>{
 assert.deepEqual(parseCartDraft(JSON.stringify(draft)),draft);
 assert.throws(()=>parseCartDraft(JSON.stringify(draft),true));
 const pending={...draft,requestKey:'pending-sale-test-0001'};
 assert.deepEqual(parseCartDraft(JSON.stringify(pending),true),pending);
});
test('Corrupt, duplicate, or out-of-range drafts are rejected before checkout',()=>{
 for(const value of [null,{...draft,payment:'bitcoin'},{...draft,items:[...draft.items,...draft.items]},{...draft,items:[{productId:2,quantity:-1,expectedPrice:10000}]},{...draft,items:[{productId:2,quantity:1,expectedPrice:NaN}]}])assert.throws(()=>parseCartDraft(JSON.stringify(value)));
 assert.throws(()=>parseCartDraft('invalid-json'));
 assert.deepEqual(parseCartDraft(JSON.stringify({payment:'cash',items:[]})).items,[]);
});
