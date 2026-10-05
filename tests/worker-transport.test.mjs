import test from 'node:test';
import assert from 'node:assert/strict';
import {PayPalSandbox} from '../lib/procurement/paypal.ts';
test('default provider transport preserves the global receiver required by Workers',async()=>{
 const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async function(url){assert.equal(this,globalThis);calls++;return String(url).includes('oauth2/token')?Response.json({access_token:'fixture'}):Response.json({id:'fixture',status:'APPROVED'});};
 try{const provider=new PayPalSandbox({PAYPAL_MODE:'sandbox',PAYPAL_CLIENT_ID:'fixture',PAYPAL_CLIENT_SECRET:'fixture'});const order=await provider.status('fixture');assert.equal(order.status,'APPROVED');assert.equal(calls,2);}finally{globalThis.fetch=original;}
});
