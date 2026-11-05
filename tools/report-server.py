# 개발용 저장 서버: 브라우저 점검 화면(?villageaudit=1)이 만든 스크린샷·표를 reports/ 아래에 파일로 저장한다.
#   실행: python tools/report-server.py   (기본 http://127.0.0.1:8124)
#   받는 것: POST /save/<reports 안 경로>  — 확장자 .png .json .md 만, 크기 제한, reports/ 밖으로는 못 씀
#   배포 빌드(tools/build-dist.ps1)에는 들어가지 않는다. 게임 서버(8123)와 따로 돈다.
import http.server
import json
import os
import re

CONFIG = {
    'HOST': '127.0.0.1',
    'PORT': 8124,
    'MAX_BYTES': 8 * 1024 * 1024,   # 바이트, 파일 하나 최대
    'ORIGINS': ('http://localhost:8123', 'http://127.0.0.1:8123'),   # 이 주소의 게임 화면만 저장 요청 가능
    'EXT': ('.png', '.json', '.md'),
}
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'reports'))
PATH_RE = re.compile(r'^/save/([a-z0-9_\-]+(?:/[a-z0-9_\-]+)*\.[a-z]+)$')


class Handler(http.server.BaseHTTPRequestHandler):
    def _cors(self):
        origin = self.headers.get('Origin', '')
        if origin in CONFIG['ORIGINS']:
            self.send_header('Access-Control-Allow-Origin', origin)
            self.send_header('Vary', 'Origin')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def _reply(self, code, body):
        data = json.dumps(body, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self._cors()
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_POST(self):
        if self.headers.get('Origin', '') not in CONFIG['ORIGINS']:
            return self._reply(403, {'ok': False, 'reason': 'origin'})
        m = PATH_RE.match(self.path)
        if not m or not m.group(1).endswith(CONFIG['EXT']):
            return self._reply(400, {'ok': False, 'reason': 'path'})
        size = int(self.headers.get('Content-Length', '0'))
        if size <= 0 or size > CONFIG['MAX_BYTES']:
            return self._reply(413, {'ok': False, 'reason': 'size'})
        target = os.path.abspath(os.path.join(ROOT, m.group(1)))
        if not target.startswith(ROOT + os.sep):
            return self._reply(400, {'ok': False, 'reason': 'path'})
        os.makedirs(os.path.dirname(target), exist_ok=True)
        body = self.rfile.read(size)
        with open(target, 'wb') as f:
            f.write(body)
        rel = os.path.relpath(target, os.path.dirname(ROOT)).replace(os.sep, '/')
        print(f'[report-server] 저장: {rel} ({len(body)} B)')
        return self._reply(200, {'ok': True, 'path': rel, 'bytes': len(body)})

    def log_message(self, fmt, *args):   # 요청 로그는 생략 (저장만 출력)
        pass


if __name__ == '__main__':
    print(f"[report-server] http://{CONFIG['HOST']}:{CONFIG['PORT']} → {ROOT}")
    http.server.ThreadingHTTPServer((CONFIG['HOST'], CONFIG['PORT']), Handler).serve_forever()
