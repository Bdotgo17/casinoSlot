const http = require('http');
const fs = require('fs');
const path = require('path');

const port = process.env.PORT || 3131;
const root = path.resolve(__dirname);

const mime = {
  '.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.json':'application/json'
}

const server = http.createServer((req,res)=>{
  let file = req.url.split('?')[0];
  if(file === '/' ) file = '/index.html';
  const full = path.join(root, file);

  fs.readFile(full, (err,data)=>{
    if(err){ res.statusCode=404; res.end('Not found'); return; }
    const ext = path.extname(full);
    res.setHeader('Content-Type', mime[ext]||'application/octet-stream');
    res.end(data);
  });
});

server.listen(port, ()=>console.log(`Server running at http://localhost:${port}/`));
