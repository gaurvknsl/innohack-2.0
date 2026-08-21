import json
import os
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from collections import Counter

ROOT = Path(__file__).resolve().parent.parent
MODEL_PATH = ROOT / "best.pt"

PORT = int(os.getenv("SMARTSORT_API_PORT", "8000"))
CAMERA_INDEX = int(os.getenv("SMARTSORT_CAMERA_INDEX", "0"))

CONFIDENCE_THRESHOLD = 0.80
STABLE_FRAMES = 8
COOLDOWN_SECONDS = 2.0

CLASS_MAP = {
    "plastico": "PLASTIC",
    "metal": "METAL",
    "organico": "ORGANIC",
    "papel_y_carton": "ORGANIC",
    "vidrio": "REJECT",
}


# ============================================================
# SHARED STATE
# ============================================================

state = {
    "camera": False,
    "opencv": False,
    "classifier": False,

    "conveyor": os.getenv("SMARTSORT_CONVEYOR_CONNECTED") == "1",
    "arduino": os.getenv("SMARTSORT_ARDUINO_CONNECTED") == "1",

    "classification": "NONE",
    "confidence": 0.0,

    "decision": "NONE",
    "decisionConfidence": 0.0,

    "stability": 0,
    "stableFrames": STABLE_FRAMES,

    "updatedAt": None,
}

latest_frame = b""
frame_lock = threading.Lock()


# ============================================================
# COMPUTER VISION
# ============================================================

def run_vision():
    global latest_frame

    try:
        import cv2
        from ultralytics import YOLO

        state["opencv"] = True

        print("Loading SmartSort model...")

        if not MODEL_PATH.exists():
            print(f"ERROR: Model not found: {MODEL_PATH}")
            state["classifier"] = False
            return

        model = YOLO(str(MODEL_PATH))

        state["classifier"] = True

        print("Model loaded.")
        print("Classes:", model.names)

        camera = cv2.VideoCapture(CAMERA_INDEX)

        camera.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
        camera.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

        state["camera"] = camera.isOpened()

        if not state["camera"]:
            print("ERROR: Could not open camera.")
            return

        print("Camera started.")

        prediction_history = []

        last_decision = "NONE"
        last_decision_confidence = 0.0
        last_decision_time = 0

        while True:

            ok, frame = camera.read()

            if not ok:
                print("ERROR: Could not read camera frame.")
                state["camera"] = False
                break

            # ------------------------------------------------
            # YOLO INFERENCE
            # ------------------------------------------------

            results = model(frame, verbose=False)
            result = results[0]

            if result.probs is None:

                display_frame = frame

                cv2.putText(
                    display_frame,
                    "MODEL ERROR",
                    (30, 50),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    1,
                    (0, 0, 255),
                    2
                )

            else:

                # ------------------------------------------------
                # GET MODEL PREDICTION
                # ------------------------------------------------

                class_index = int(result.probs.top1)

                confidence = float(result.probs.top1conf)

                model_class = model.names[class_index]

                model_class = (
                    model_class
                    .lower()
                    .replace(" ", "_")
                )

                # ------------------------------------------------
                # MAP MODEL CLASS TO SMARTSORT CLASS
                # ------------------------------------------------

                smart_class = CLASS_MAP.get(
                    model_class,
                    "REJECT"
                )

                # ------------------------------------------------
                # CONFIDENCE CHECK
                # ------------------------------------------------

                if confidence >= CONFIDENCE_THRESHOLD:
                    current_prediction = smart_class
                else:
                    current_prediction = "REJECT"

                # ------------------------------------------------
                # HISTORY
                # ------------------------------------------------

                prediction_history.append(current_prediction)

                if len(prediction_history) > STABLE_FRAMES:
                    prediction_history.pop(0)

                # ------------------------------------------------
                # STABILITY CHECK
                # ------------------------------------------------

                stable_prediction = None

                if len(prediction_history) == STABLE_FRAMES:

                    counts = Counter(prediction_history)

                    prediction, count = counts.most_common(1)[0]

                    if count == STABLE_FRAMES:
                        stable_prediction = prediction

                # ------------------------------------------------
                # FINAL DECISION
                # ------------------------------------------------

                now = time.time()

                if (
                    stable_prediction is not None
                    and stable_prediction != last_decision
                    and now - last_decision_time >= COOLDOWN_SECONDS
                ):

                    last_decision = stable_prediction
                    last_decision_confidence = confidence
                    last_decision_time = now

                    print()
                    print("========================================")
                    print("SMARTSORT DECISION")
                    print("========================================")
                    print(f"Model class : {model_class}")
                    print(f"Confidence  : {confidence:.2%}")
                    print(f"Decision    : {last_decision}")
                    print("========================================")

                # ------------------------------------------------
                # UPDATE SERVER STATE
                # ------------------------------------------------

                state["classification"] = smart_class
                state["confidence"] = round(confidence, 4)

                state["decision"] = last_decision
                state["decisionConfidence"] = round(
                    last_decision_confidence,
                    4
                )

                state["stability"] = len(prediction_history)

                state["updatedAt"] = time.time()

                # ------------------------------------------------
                # DRAW INFORMATION ON FRAME
                # ------------------------------------------------

                display_frame = frame.copy()

                cv2.putText(
                    display_frame,
                    f"CURRENT: {smart_class} {confidence:.1%}",
                    (30, 45),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.9,
                    (255, 255, 255),
                    2
                )

                cv2.putText(
                    display_frame,
                    f"DECISION: {last_decision}",
                    (30, 85),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.9,
                    (255, 255, 255),
                    2
                )

                cv2.putText(
                    display_frame,
                    f"DECISION CONFIDENCE: {last_decision_confidence:.1%}",
                    (30, 120),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.65,
                    (220, 220, 220),
                    2
                )

                cv2.putText(
                    display_frame,
                    f"STABILITY: {len(prediction_history)}/{STABLE_FRAMES}",
                    (30, 155),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.65,
                    (220, 220, 220),
                    2
                )

                cv2.putText(
                    display_frame,
                    f"THRESHOLD: {CONFIDENCE_THRESHOLD:.0%}",
                    (30, 190),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.65,
                    (220, 220, 220),
                    2
                )

            # ------------------------------------------------
            # ENCODE FRAME FOR BROWSER
            # ------------------------------------------------

            encoded, buffer = cv2.imencode(
                ".jpg",
                display_frame
            )

            if encoded:

                with frame_lock:
                    latest_frame = buffer.tobytes()

    except Exception as e:

        print("VISION ERROR:")
        print(e)

        state["camera"] = False
        state["opencv"] = False
        state["classifier"] = False


# ============================================================
# HTTP SERVER
# ============================================================

class Handler(BaseHTTPRequestHandler):

    def do_GET(self):

        # ----------------------------------------------------
        # LIVE CAMERA STREAM
        # ----------------------------------------------------

        if self.path == "/api/stream":

            self.send_response(200)

            self.send_header(
                "Content-Type",
                "multipart/x-mixed-replace; boundary=frame"
            )

            self.send_header(
                "Cache-Control",
                "no-cache"
            )

            self.send_header(
                "Access-Control-Allow-Origin",
                "*"
            )

            self.end_headers()

            while True:

                with frame_lock:
                    frame = latest_frame

                if frame:

                    try:

                        self.wfile.write(
                            b"--frame\r\n"
                            b"Content-Type: image/jpeg\r\n"
                            b"Content-Length: "
                            + str(len(frame)).encode()
                            + b"\r\n\r\n"
                            + frame
                            + b"\r\n"
                        )

                        self.wfile.flush()

                    except (
                        BrokenPipeError,
                        ConnectionResetError
                    ):
                        break

                time.sleep(0.08)

            return

        # ----------------------------------------------------
        # STATUS API
        # ----------------------------------------------------

        if self.path in (
            "/api/status",
            "/api/health"
        ):

            components = {
                key: state[key]
                for key in (
                    "camera",
                    "opencv",
                    "classifier",
                    "conveyor",
                    "arduino"
                )
            }

            vision_ready = all(
                components[key]
                for key in (
                    "camera",
                    "opencv",
                    "classifier"
                )
            )

            payload = {
                "components": components,

                "ready": vision_ready,

                "data": {
                    "classification":
                        state["classification"],

                    "confidence":
                        state["confidence"],

                    "decision":
                        state["decision"],

                    "decisionConfidence":
                        state["decisionConfidence"],

                    "stability":
                        state["stability"],

                    "stableFrames":
                        state["stableFrames"],

                    "updatedAt":
                        state["updatedAt"]
                }
            }

            body = json.dumps(payload).encode("utf-8")

            self.send_response(200)

            self.send_header(
                "Content-Type",
                "application/json"
            )

            self.send_header(
                "Access-Control-Allow-Origin",
                "*"
            )

            self.send_header(
                "Content-Length",
                str(len(body))
            )

            self.end_headers()

            self.wfile.write(body)

            return

        # ----------------------------------------------------
        # UNKNOWN ROUTE
        # ----------------------------------------------------

        self.send_error(404)

    def log_message(self, *_):
        return


# ============================================================
# START SERVER
# ============================================================

if __name__ == "__main__":

    print()
    print("========================================")
    print("          SMARTSORT SERVER")
    print("========================================")
    print()

    threading.Thread(
        target=run_vision,
        daemon=True
    ).start()

    print(
        f"SmartSort API listening on "
        f"http://localhost:{PORT}"
    )

    server = ThreadingHTTPServer(
        ("0.0.0.0", PORT),
        Handler
    )

    try:
        server.serve_forever()

    except KeyboardInterrupt:

        print("\nSmartSort server stopped.")

        server.shutdown()