/* 备考题本 · 本地小服务器（零依赖，只用 Node 自带模块）
   作用：让手机在同一 WiFi 下打开这个题本，并支持「添加到主屏幕」。
   运行：node server.js  （或双击 启动-手机访问.bat）           */
var http = require('http');
var fs = require('fs');
var path = require('path');
var os = require('os');

var ROOT = path.resolve(__dirname);
var PORT = 8765;

var MIME = {
  '.html':'text/html; charset=utf-8',
  '.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8',
  '.json':'application/json; charset=utf-8',
  '.png':'image/png',
  '.svg':'image/svg+xml',
  '.webmanifest':'application/manifest+json; charset=utf-8',
  '.ico':'image/x-icon',
  '.txt':'text/plain; charset=utf-8'
};

function lanAddresses(){
  var out = [];
  var ifs = os.networkInterfaces();
  Object.keys(ifs).forEach(function(name){
    (ifs[name] || []).forEach(function(a){
      if (a.family === 'IPv4' && !a.internal) out.push(a.address);
    });
  });
  return out;
}

var server = http.createServer(function(req, res){
  var urlPath;
  try { urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname); }
  catch(e){ urlPath = '/'; }
  if (urlPath === '/' || urlPath === '') urlPath = '/index.html';

  // 把请求路径规范化后拼到根目录，并确认结果仍在根目录之内
  var rel = urlPath.replace(/^[/\\]+/, '');
  var filePath = path.resolve(ROOT, rel);
  if (filePath !== ROOT && filePath.indexOf(ROOT + path.sep) !== 0){
    res.writeHead(403, {'Content-Type':'text/plain; charset=utf-8'});
    res.end('403 拒绝访问');
    return;
  }

  fs.stat(filePath, function(err, st){
    if (err || !st.isFile()){
      res.writeHead(404, {'Content-Type':'text/plain; charset=utf-8'});
      res.end('找不到文件：' + urlPath);
      return;
    }
    var ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
      'Service-Worker-Allowed': '/'
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, '0.0.0.0', function(){
  var ips = lanAddresses();
  var line = '============================================';
  console.log('');
  console.log(line);
  console.log('  备考题本 已启动，请不要关闭这个窗口');
  console.log(line);
  console.log('');
  console.log('  本机打开：  http://localhost:' + PORT + '/');
  if (ips.length){
    console.log('');
    console.log('  手机打开（手机需连接同一个 WiFi）：');
    ips.forEach(function(ip){ console.log('      http://' + ip + ':' + PORT + '/'); });
  } else {
    console.log('  （没有检测到局域网地址，请检查网络连接）');
  }
  console.log('');
  console.log('  手机打开后：浏览器菜单 →「添加到主屏幕」/「安装应用」');
  console.log('');
  console.log('  关闭题本：直接关掉这个黑窗口，或按 Ctrl + C');
  console.log(line);
  console.log('');
});
