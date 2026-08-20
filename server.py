# server.py — Moodboard Studio: servidor estático + endpoint de export de backup
# Por que: o navegador (Firefox inclusive) não pode escrever em C:\... sem gesto
# do usuário; o servidor local recebe o backup e grava na pasta de arte.
import os
import glob
import time
import http.server

PORT = 8080
ROOT = os.path.dirname(os.path.abspath(__file__))
EXPORT_DIR = r"C:\Users\User\Arte\_Design"   # edite aqui se a pasta mudar
BACKUP_NAME = "moodboard-backup.json"
KEEP = 10  # cópias com timestamp mantidas


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_POST(self):
        if self.path != "/export-backup":
            self.send_response(404)
            self._cors()
            self.end_headers()
            return
        length = int(self.headers.get("Content-Length", 0))
        data = self.rfile.read(length)
        os.makedirs(EXPORT_DIR, exist_ok=True)
        with open(os.path.join(EXPORT_DIR, BACKUP_NAME), "wb") as f:
            f.write(data)
        stamp = time.strftime("%Y%m%d-%H%M%S")
        with open(os.path.join(EXPORT_DIR, "moodboard-backup-%s.json" % stamp), "wb") as f:
            f.write(data)
        old = sorted(glob.glob(os.path.join(EXPORT_DIR, "moodboard-backup-*.json")))
        for old_path in old[:-KEEP]:
            try:
                os.remove(old_path)
            except OSError:
                pass
        self.send_response(200)
        self._cors()
        self.end_headers()
        self.wfile.write(b"ok")

    def log_message(self, fmt, *args):
        pass  # janela limpa


if __name__ == "__main__":
    server = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print("Moodboard em http://localhost:%d | export -> %s" % (PORT, EXPORT_DIR))
    server.serve_forever()