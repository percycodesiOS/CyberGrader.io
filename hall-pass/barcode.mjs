// Code 39 narrow/wide encodings, cross-checked against ZXing's Code39Reader.
// Only the alphabet needed by numbered CIRC cards is accepted.
const patterns={'0':0x034,'1':0x121,'2':0x061,'3':0x160,'4':0x031,'5':0x130,'6':0x070,'7':0x025,'8':0x124,'9':0x064,'C':0x148,'I':0x04c,'R':0x106,'-':0x085,'*':0x094};
export function code39(text){
  if(!/^CIRC-(?:0(?:0[1-9]|[1-9][0-9])|100)$/.test(text))throw Error('A printed card must be CIRC-001 through CIRC-100.');
  const bars=[];let x=12;
  for(const char of '*'+text+'*'){
    const pattern=patterns[char];
    for(let i=0;i<9;i++){const width=pattern&(1<<(8-i))?3:1;if(i%2===0)bars.push({x,width});x+=width;}x++;
  }
  return {bars,width:x+12};
}
