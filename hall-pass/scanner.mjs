// Keyboard-wedge scanner burst ending in Enter/Tab. No permission logic here.
export function createScanner() {
  let buffer='',last=0,first=0,maxGap=0;
  return {
    reset(){buffer='';last=0;first=0;maxGap=0;},
    feed(key,now,manual=false){
      if(now-last>250){buffer='';first=now;maxGap=0;}
      if(key==='Enter'||key==='Tab'){
        const value=buffer.trim(),fast=value.length>=2&&maxGap<=85&&now-first<650;this.reset();
        return /^(?:CIRC-)?\d{1,3}$/i.test(value)&&(manual||fast)?value:null;
      }
      if(key.length===1){if(!buffer)first=now;else maxGap=Math.max(maxGap,now-last);buffer=(buffer+key).slice(-30);last=now;}
      else if(key!=='Shift')this.reset();
      return null;
    },
  };
}
