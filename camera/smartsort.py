import cv2
from ultralytics import YOLO
from pathlib import Path
from collections import Counter
import time

PROJECT_ROOT = Path(__file__).resolve().parent.parent
MODEL_PATH = PROJECT_ROOT / "best.pt"

CAMERA_INDEX = 0

CONFIDENCE_THRESHOLD = 0.80

STABLE_FRAMES = 8

COOLDOWN_SECONDS = 2.0

CLASS_MAP = {
    "plastico": "PLASTIC",
    "metal": "METAL",
    "organico": "ORGANIC",

    "vidrio": "REJECT",
    "papel_y_carton": "ORGANIC",
}

print("========================================")
print("        SMARTSORT VISION SYSTEM")
print("========================================")

if not MODEL_PATH.exists():
    print(f"ERROR: Model not found:")
    print(MODEL_PATH)
    exit()

print(f"\nLoading model: {MODEL_PATH}")

model = YOLO(str(MODEL_PATH))

print("Model loaded.")
print("Classes:", model.names)

cap = cv2.VideoCapture(CAMERA_INDEX)

if not cap.isOpened():
    print("ERROR: Could not open camera.")
    exit()

cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

print("\nCamera started.")
print("Press Q to quit.")

prediction_history = []

last_decision = "NONE"
last_decision_confidence = 0.0
last_decision_time = 0

try:

    while True:

        ret, frame = cap.read()

        if not ret:
            print("ERROR: Could not read frame.")
            break

        results = model(frame, verbose=False)

        result = results[0]

        if result.probs is None:

            cv2.putText(
                frame,
                "MODEL ERROR",
                (30, 50),
                cv2.FONT_HERSHEY_SIMPLEX,
                1,
                (0, 0, 255),
                2
            )

            cv2.imshow("SmartSort Vision", frame)

            if cv2.waitKey(1) & 0xFF == ord("q"):
                break

            continue

        class_index = int(result.probs.top1)

        confidence = float(result.probs.top1conf)

        model_class = model.names[class_index]

        model_class = model_class.lower().replace(" ", "_")

        smart_class = CLASS_MAP.get(
            model_class,
            "REJECT"
        )

        if confidence >= CONFIDENCE_THRESHOLD:
            current_prediction = smart_class
        else:
            current_prediction = "REJECT"

        prediction_history.append(current_prediction)

        if len(prediction_history) > STABLE_FRAMES:
            prediction_history.pop(0)


        stable_prediction = None

        if len(prediction_history) == STABLE_FRAMES:

            counts = Counter(prediction_history)

            prediction, count = counts.most_common(1)[0]

            if count == STABLE_FRAMES:
                stable_prediction = prediction

        now = time.time()

        if (
            stable_prediction is not None
            and
            stable_prediction != last_decision
            and
            now - last_decision_time >= COOLDOWN_SECONDS
        ):

            last_decision = stable_prediction
            last_decision_confidence = confidence
            last_decision_time = now

            print("\n========================================")
            print("SMARTSORT DECISION")
            print("========================================")
            print(f"Model class : {model_class}")
            print(f"Confidence  : {confidence:.2%}")
            print(f"Decision    : {last_decision}")
            print("========================================")

        cv2.putText(
            frame,
            f"CURRENT: {smart_class} {confidence:.1%}",
            (30, 45),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.9,
            (255, 255, 255),
            2
        )

        cv2.putText(
            frame,
            f"DECISION: {last_decision}",
            (30, 85),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.9,
            (255, 255, 255),
            2
        )


        cv2.putText(
            frame,
            f"DECISION CONFIDENCE: {last_decision_confidence:.1%}",
            (30, 120),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.65,
            (220, 220, 220),
            2
        )

        cv2.putText(
            frame,
            f"STABILITY: {len(prediction_history)}/{STABLE_FRAMES}",
            (30, 155),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.65,
            (220, 220, 220),
            2
        )

        cv2.putText(
            frame,
            f"THRESHOLD: {CONFIDENCE_THRESHOLD:.0%}",
            (30, 190),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.65,
            (220, 220, 220),
            2
        )

        cv2.imshow(
            "SmartSort Vision",
            frame
        )

        if cv2.waitKey(1) & 0xFF == ord("q"):
            break


finally:

    cap.release()
    cv2.destroyAllWindows()

    print("\nCamera released.")
    print("SmartSort stopped.")