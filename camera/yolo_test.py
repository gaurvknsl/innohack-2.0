import cv2
from ultralytics import YOLO

MODEL_PATH = "best.pt"

print("Loading YOLO model...")

model = YOLO(MODEL_PATH)

print("Model loaded.")
print("Classes:", model.names)

cap = cv2.VideoCapture(0)

if not cap.isOpened():
    print("ERROR: Could not open camera.")
    exit()

print("Camera started.")
print("Press Q to quit.")

try:
    while True:

        ret, frame = cap.read()

        if not ret:
            print("ERROR: Could not read camera frame.")
            break

        results = model(frame, verbose=False)

        annotated_frame = results[0].plot()

        cv2.imshow("SmartSort YOLO Test", annotated_frame)

        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

finally:
    cap.release()
    cv2.destroyAllWindows()
    print("Camera released.")