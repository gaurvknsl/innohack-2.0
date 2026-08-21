"""Small HTTP bridge exposing the existing OpenCV/YOLO pipeline to the dashboard.

Run with: python camera/server.py
The endpoint intentionally reports hardware as disconnected until a real conveyor
and Arduino bridge are available; set SMARTSORT_CONVEYOR_CONNECTED=1 and
SMARTSORT_ARDUINO_CONNECTED=1 only when those devices are actually connected.
"""
import json
import os
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MODEL_PATH = ROOT / "best.pt"
PORT = int(os.getenv("SMARTSORT_API_PORT", "8000"))

state = {
    "camera": False, "opencv": False, "classifier": False,
    "conveyor": os.getenv("SMARTSORT_CONVEYOR_CONNECTED") == "1",
    "arduino": os.getenv("SMARTSORT_ARDUINO_CONNECTED") == "1",
    "classification": "NONE", "confidence": 0.0, "updatedAt": None,
}
latest_frame = b""
frame_lock = threading.Lock()


def run_vision():
    global latest_frame
    try:
        import cv2
        state["opencv"] = True
        model = None
        if MODEL_PATH.exists():
            try:
                from ultralytics import YOLO
                model = YOLO(str(MODEL_PATH))
                state["classifier"] = True
            except Exception:
                # Keep the camera/OpenCV stream available while the optional
                # model runtime is being installed or repaired.
                state["classifier"] = False
        camera = cv2.VideoCapture(int(os.getenv("SMARTSORT_CAMERA_INDEX", "0")))
        state["camera"] = camera.isOpened()
        if not state["camera"]:
            return
        while True:
            ok, frame = camera.read()
            if not ok:
                state["camera"] = False
                break
            display_frame = frame
            if model is not None:
                result = model(frame, verbose=False)[0]
                display_frame = result.plot()
                if result.probs is not None:
                    state["classification"] = str(model.names[int(result.probs.top1)]).upper()
                    state["confidence"] = round(float(result.probs.top1conf), 4)
                    state["updatedAt"] = time.time()
                elif result.boxes is not None and len(result.boxes):
                    best = int(result.boxes.conf.argmax().item())
                    class_id = int(result.boxes.cls[best].item())
                    state["classification"] = str(model.names[class_id]).upper()
                    state["confidence"] = round(float(result.boxes.conf[best].item()), 4)
                    state["updatedAt"] = time.time()
            encoded, buffer = cv2.imencode('.jpg', display_frame)
            if encoded:
                with frame_lock:
                    latest_frame = buffer.tobytes()
    except Exception:
        state["camera"] = False
        state["opencv"] = False
        state["classifier"] = False


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/api/stream":
            self.send_response(200)
            self.send_header("Content-Type", "multipart/x-mixed-replace; boundary=frame")
            self.send_header("Cache-Control", "no-cache")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            while True:
                with frame_lock:
                    frame = latest_frame
                if frame:
                    try:
                        self.wfile.write(b"--frame\r\nContent-Type: image/jpeg\r\nContent-Length: " + str(len(frame)).encode() + b"\r\n\r\n" + frame + b"\r\n")
                        self.wfile.flush()
                    except (BrokenPipeError, ConnectionResetError):
                        break
                time.sleep(0.08)
            return
        if self.path not in ("/api/status", "/api/health"):
            self.send_error(404)
            return
        components = {key: state[key] for key in ("camera", "opencv", "classifier", "conveyor", "arduino")}
        vision_ready = all(components[key] for key in ("camera", "opencv", "classifier"))
        payload = {"components": components, "ready": vision_ready, "data": {
            "classification": state["classification"], "confidence": state["confidence"], "updatedAt": state["updatedAt"]
        }}
        body = json.dumps(payload).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *_):
        return


if __name__ == "__main__":
    threading.Thread(target=run_vision, daemon=True).start()
    print(f"SmartSort API listening on http://localhost:{PORT}")
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
