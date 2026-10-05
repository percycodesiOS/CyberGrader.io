import {STORAGE_KEY,parseState,validateState} from './model.mjs?v=2';
// Publish new UI state only after a successful storage write inside a browser lock.
export function createStore(storage,locks) {
  const lock=operation=>{if(!locks?.request)throw Error('This browser needs Web Locks to save safely. Use an updated Safari, Chrome or Edge.');return locks.request(STORAGE_KEY+':transaction',operation);};
  return {
    load:()=>lock(()=>parseState(storage.getItem(STORAGE_KEY))),
    change:mutator=>lock(()=>{
      const before=parseState(storage.getItem(STORAGE_KEY)),result=mutator(before),next=validateState(result.state??result);
      if(next.revision!==before.revision)storage.setItem(STORAGE_KEY,JSON.stringify(next));
      return {state:next,message:result.message??''};
    }),
  };
}
