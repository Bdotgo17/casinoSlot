const http = require('http');
const child = require('child_process');
const path = require('path');

const server = child.spawn(process.execPath, [path.join(__dirname,'server.js')], {stdio:['ignore','pipe','pipe']});

server.stdout.on('data', d=>process.stdout.write(d.toString()));

setTimeout(()=>{
  http.get('http://localhost:3131/', res=>{
    let body='';
    res.on('data', c=>body+=c);
    res.on('end', ()=>{
      if(body.includes('<title>Casino Slot')){
        console.log('SMOKE TEST PASS');
        process.exit(0);
      } else { console.error('SMOKE TEST FAIL'); process.exit(2); }
    });
  }).on('error', e=>{ console.error('ERROR',e); process.exit(3); });
}, 400);
