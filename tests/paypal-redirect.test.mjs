import test from 'node:test';
import assert from 'node:assert/strict';
import {PayPalSandbox} from '../lib/procurement/paypal.ts';
const config={PAYPAL_MODE:'sandbox',PAYPAL_CLIENT_ID:'fixture',PAYPAL_CLIENT_SECRET:'fixture'};
for(const stage of ['oauth','api'])test('PayPal '+stage+' redirects never forward credentials or parse hostile bodies',async()=>{
 for(const status of [301,302,307,308]){let calls=0;const transport=async(url,init)=>{calls++;assert.equal(init.redirect,'manual');if(stage==='api'&&calls===1)return Response.json({access_token:'fixture'});return new Response('<hostile-html>',{status,headers:{Location:'https://untrusted.example/steal'}});};
 const provider=new PayPalSandbox(config,transport);await assert.rejects(provider.capture('ORDER123','stable-fixture'),/PayPal sandbox/);
 assert.equal(calls,stage==='oauth'?1:2);}
});

test('minimal successful capture is reconciled with GET without capturing twice',async()=>{
let captures=0,gets=0;const transport=async(url,init)=>{assert.equal(init.redirect,'manual');if(url.includes('oauth2/token'))return Response.json({access_token:'fixture'});if(init.method==='POST'){captures++;assert.equal(init.headers.Prefer,'return=representation');return Response.json({id:'ORDER123',status:'COMPLETED'});}gets++;return Response.json({id:'ORDER123',status:'COMPLETED',purchase_units:[{payments:{captures:[{id:'CAPTURE',status:'COMPLETED',amount:{currency_code:'USD',value:'201.66'}}]}}]});};const provider=new PayPalSandbox(config,transport);const remote=await provider.capture('ORDER123','stable-fixture');assert.equal(remote.purchase_units[0].payments.captures[0].amount.value,'201.66');assert.equal(captures,1);assert.equal(gets,1);});
