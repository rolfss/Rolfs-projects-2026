import {test} from 'node:test';
import assert from 'node:assert/strict';
import {passiveFrameInterval as interval} from '../src/render-budget.ts';
test('Passive reading is bounded; movement and camera flights keep the normal animation cadence',()=>{
 assert.equal(interval(true,false,true,false,true),250);
 assert.equal(interval(true,false,true,false,false),1000/15);
 assert.equal(interval(false,true,true,false,true),250);
 assert.equal(interval(false,false,false,false,true),250);
 assert.equal(interval(false,false,true,false,true),0);
 assert.equal(interval(false,true,true,true,false),0);
});
