import json,re,hmac,pathlib,subprocess
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
PRIVATE=pathlib.Path('/opt/new-api/ans-service-private.json')
class Handler(BaseHTTPRequestHandler):
 def log_message(self,*args):pass
 def do_GET(self):
  cfg=json.loads(PRIVATE.read_text())
  if not hmac.compare_digest(self.headers.get('Authorization',''),'Bearer '+cfg['costBridgeSecret']):return self.reply(401,{'error':'unauthorized'})
  match=re.fullmatch(r'/cost/([A-Za-z0-9_-]{8,128})',self.path)
  if not match:return self.reply(404,{'error':'not_found'})
  request_id=match[1]
  q="select coalesce(json_agg(json_build_object('requestId',request_id,'quota',quota)),'[]') from logs where type=2 and token_id="+str(int(cfg['tokenId']))+" and request_id='"+request_id+"';"
  result=subprocess.run(['docker','exec','new-api-postgres','psql','-X','-q','-U','newapi','-d','new-api','-Atc',q],capture_output=True,text=True,timeout=4)
  if result.returncode:return self.reply(503,{'error':'unavailable'})
  rows=json.loads(result.stdout)
  if not rows:return self.reply(404,{'error':'pending'})
  if len(rows)!=1:return self.reply(409,{'error':'ambiguous'})
  return self.reply(200,rows[0])
 def reply(self,status,payload):
  data=json.dumps(payload).encode();self.send_response(status);self.send_header('Content-Type','application/json');self.send_header('Cache-Control','no-store');self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data)
ThreadingHTTPServer(('172.17.0.1',13021),Handler).serve_forever()
