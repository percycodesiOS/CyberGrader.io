/* Deterministic resource world. Campus builds remain in their own save slot. */
globalThis.MYNE_HARDCORE_WORLD = Object.freeze({
  build(setBlock, limits) {
    const height=(x,z)=>Math.abs(x)<45&&Math.abs(z)<45?3:Math.round(3+Math.sin(x*.11)*2+Math.cos(z*.13)*2);
    for(let x=limits.minX;x<=limits.maxX;x++)for(let z=limits.minZ;z<=limits.maxZ;z++){
      const h=height(x,z),pond=(x+16)**2+(z-8)**2<30;
      for(let y=-8;y<=h;y++)setBlock(x,y,z,y===h?'grass':y>h-3?'dirt':'stone');
      if(pond){setBlock(x,h,z,'water');setBlock(x,h-1,z,'water');setBlock(x,h-2,z,'sand');}
    }
    const tree=(x,z,type)=>{
      const h=height(x,z),tall=type==='pinewood'?7:type==='sprucewood'?6:4;
      for(let y=1;y<=tall;y++)setBlock(x,h+y,z,type);
      const leaf=type==='cherrywood'?'cherryleaves':'leaves';
      for(let dy=-2;dy<=1;dy++)for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++){
        const radius=type==='wood'||type==='cherrywood'?3:Math.max(1,2-dy);
        if(Math.abs(dx)+Math.abs(dz)<=radius&&(dx||dz||dy>0))setBlock(x+dx,h+tall+dy,z+dz,leaf);
      }
    };
    for(const [x,z,t] of [[-7,15,'wood'],[-10,22,'wood'],[8,9,'wood'],[12,5,'wood'],[8,-6,'cherrywood'],[-14,-10,'sprucewood'],[24,-12,'pinewood']])tree(x,z,t);
    for(let i=0;i<100;i++){
      const x=((i*37+19)%170)-85,z=((i*53+7)%170)-85;
      if(Math.abs(x)<45&&Math.abs(z)<45)continue;
      tree(x,z,['wood','cherrywood','sprucewood','pinewood'][i%4]);
    }
    // Two small village shelters, not a finished player house. Only the student's
    // own placed structure can complete the house objective.
    for(const [ox,oz] of [[18,18],[30,18]]){
      for(let x=ox;x<ox+7;x++)for(let z=oz;z<oz+7;z++){
        setBlock(x,4,z,'planks');setBlock(x,8,z,'sprucewood');
        if(x===ox||x===ox+6||z===oz||z===oz+6)for(let y=5;y<8;y++)
          if(!(x===ox+3&&z===oz+6&&y<7))setBlock(x,y,z,y===6&&(x===ox||x===ox+6)?'glass':'planks');
      }
    }
    // Mine entrance: gentle staircase with exposed copper and iron at the bottom.
    for(let step=0;step<24;step++)for(let x=42;x<=44;x++)for(let y=4-step;y<=7;y++)setBlock(x,y,-8-step,null);
    for(let z=-35;z<=-31;z++)for(let x=40;x<=46;x++)for(let y=-20;y<=-17;y++)setBlock(x,y,z,null);
    for(let i=0;i<8;i++){setBlock(40+i%7,-19,-36,'copperore');setBlock(40+i%7,-20,-36,'ironore');}
  }
});
