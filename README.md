
# SmartSort

<p align="center">
  <strong>AI-powered waste classification and automated sorting.</strong>
</p>

<p align="center">
  A computer-vision system designed to identify waste on a conveyor and route it to the appropriate category.
</p>

---

## Overview

SmartSort is a conveyor-based waste sorting system that combines computer vision, machine learning, and hardware automation.

A camera observes waste moving along the conveyor. The vision system processes the camera feed using OpenCV and a trained YOLO model, producing a predicted class and confidence score. SmartSort then applies its own decision logic to determine whether the prediction is reliable enough to use.

The final decision is intended to control a physical sorting mechanism and direct the object into the appropriate bin.

```text
Waste
  |
  v
Camera
  |
  v
OpenCV
  |
  v
YOLO Model
  |
  v
Classification + Confidence
  |
  v
Decision Logic
  |
  +----> Plastic
  +----> Metal
  +----> Organic
  +----> Reject
```

The project is being developed as a hackathon prototype, with the computer-vision pipeline currently functioning and hardware integration being developed alongside it.

---

## The Problem

Waste sorting is often repetitive and difficult to perform consistently at scale.

Objects can vary considerably in their:

* shape
* size
* orientation
* appearance
* lighting
* material

A reliable automated system therefore needs more than a simple classifier. It needs to account for uncertainty and connect the resulting decision to a physical mechanism.

SmartSort approaches this by separating the system into three main stages:

**Perception** — identify what the camera sees.

**Decision** — determine whether the prediction is reliable.

**Action** — physically sort the object.

---

## How It Works

### 1. Detection

The camera continuously captures the conveyor area.

OpenCV provides the camera interface and real-time frame processing.

### 2. Classification

The current frame is passed to the trained YOLO model.

The model produces a class and confidence score, for example:

```text
Model class : plastico
Confidence  : 95.72%
```

### 3. Mapping

The model's class is converted into a SmartSort category.

```text
plastico       -> PLASTIC
metal          -> METAL
organico       -> ORGANIC
papel_y_carton -> ORGANIC
vidrio         -> REJECT
```

### 4. Validation

SmartSort uses a confidence threshold to prevent uncertain predictions from immediately becoming physical actions.

The current prototype uses an 80% threshold.

Predictions are also checked across consecutive frames to reduce fluctuations in real-time inference.

### 5. Sorting

Once a prediction has been accepted, the resulting category can be passed to the hardware controller.

```text
PLASTIC
METAL
ORGANIC
REJECT
```

The controller can then operate the corresponding sorting mechanism.

---

## Computer Vision Pipeline

The current computer-vision system is written in Python using OpenCV and Ultralytics YOLO.

```text
              Camera
                 |
                 v
             OpenCV
                 |
                 v
          YOLO Inference
                 |
          +------+------+
          |             |
        Class       Confidence
          |             |
          +------+------+
                 |
                 v
          Class Mapping
                 |
                 v
       Confidence Validation
                 |
                 v
        Stable Prediction
                 |
                 v
        SmartSort Decision
```

The live vision interface provides information such as the current class, confidence, decision, and stability state.

---

## Confidence and Stability

A model prediction is not automatically treated as a correct decision.

For example:

```text
PLASTIC — 98%
```

is considerably more reliable than:

```text
PLASTIC — 41%
```

SmartSort therefore uses a configurable confidence threshold.

```python
CONFIDENCE_THRESHOLD = 0.80
```

The system also uses multiple consecutive frames to reduce momentary prediction changes.

```python
STABLE_FRAMES = 8
```

The intended behavior is:

```text
PLASTIC
PLASTIC
PLASTIC
PLASTIC
PLASTIC
PLASTIC
PLASTIC
PLASTIC
   |
   v
Confirmed: PLASTIC
```

This is particularly important because the final classification is intended to control physical hardware.

---

## Hardware Integration

The physical system consists of a conveyor, camera, microcontroller, and sorting mechanism.

The intended architecture is:

```text
                 Camera
                   |
                   v
            Detection Zone
                   |
                   v
================================
          Conveyor Belt
================================
                   |
                   v
             Sorting Point
              /     |     \
             /      |      \
            v       v       v
         Plastic   Metal   Organic
           Bin      Bin      Bin
```

The computer-vision system is responsible for determining the material category.

The microcontroller is responsible for receiving that decision and controlling the physical mechanism.

This keeps the AI and hardware layers independent.

---

## Dashboard

SmartSort also includes a web-based dashboard for presenting the state of the system.

The dashboard is designed to provide information such as:

* current classification
* confidence
* sorting statistics
* recent activity
* system status

The long-term goal is to connect the dashboard directly to the live computer-vision and hardware pipeline.

---

## Technology Stack

| Technology       | Purpose                               |
| ---------------- | ------------------------------------- |
| Python           | Vision and decision logic             |
| OpenCV           | Camera capture and image processing   |
| Ultralytics YOLO | Waste classification                  |
| NumPy            | Image and numerical processing        |
| PySerial         | Planned microcontroller communication |
| Arduino / MCU    | Hardware control                      |
| Web technologies | SmartSort dashboard                   |

---

## Project Structure

```text
innohack-2.0/
|
├── camera/
│   └── smartsort.py
|
├── src/
│   └── Web application
|
├── public/
│   └── Frontend assets
|
├── best.pt
│
├── package.json
├── .gitignore
└── README.md
```

---

## Getting Started

### Requirements

* Python 3.x
* A webcam or compatible RGB camera
* SmartSort model weights
* Git

### Clone the repository

```bash
git clone <YOUR_REPOSITORY_URL>
cd innohack-2.0
```

### Create a virtual environment

macOS / Linux:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

Windows:

```bash
python -m venv .venv
.venv\Scripts\activate
```

### Install dependencies

```bash
pip install ultralytics opencv-python
```

For planned serial communication:

```bash
pip install pyserial
```

### Add the model

Place the trained model in the project root:

```text
innohack-2.0/
├── best.pt
├── camera/
├── src/
└── README.md
```

### Run the vision system

```bash
python camera/smartsort.py
```

Press `Q` to close the camera window.

---

## Configuration

The main vision parameters can be adjusted in the Python application.

```python
CAMERA_INDEX = 0
CONFIDENCE_THRESHOLD = 0.80
STABLE_FRAMES = 8
```

The confidence threshold determines how certain the model must be before a prediction is accepted.

The stable-frame setting determines how many consecutive frames must agree before the result is considered stable.

These values can be tuned further once the system is tested under the final conveyor conditions.

---

## Current Status

### Computer Vision

* [x] Camera integration
* [x] OpenCV processing
* [x] YOLO model integration
* [x] Classification mapping
* [x] Confidence filtering
* [x] Stable-frame detection
* [x] Reject pathway
* [x] Live detection interface

### Hardware

* [ ] Microcontroller communication
* [ ] Conveyor integration
* [ ] Servo control
* [ ] Sorting mechanism
* [ ] End-to-end physical testing

### Dashboard

* [x] Login interface
* [x] Dashboard design
* [ ] Live vision integration
* [ ] Real-time statistics
* [ ] Detection history

---

## Known Limitations

SmartSort is currently a hackathon prototype.

The model's performance depends on the data it was trained on, meaning objects that differ significantly from the training examples may produce weaker predictions.

Computer vision is also affected by lighting, camera position, object orientation, motion, and background.

The physical system introduces an additional challenge: the classification decision must be synchronized with the position of the object on the conveyor.

Future versions will require broader testing and a larger, more representative dataset.

---

## Future Improvements

Planned improvements include:

* expanding the training dataset
* improving performance across different lighting conditions
* adding more waste variations
* improving object-presence detection
* synchronizing classification with conveyor position
* implementing one-object-to-one-sort logic
* connecting the vision system to the microcontroller
* integrating live computer-vision results into the dashboard
* measuring accuracy, precision, recall, and inference latency

---

## Design Philosophy

SmartSort is built around a simple principle:

> A system should know when it is uncertain.

Instead of forcing every object into a category, uncertain predictions can be rejected.

The project also keeps perception and physical action separate. The AI determines what an object appears to be, while the hardware determines how that decision is physically carried out.

This modular structure allows the model, camera, dashboard, or mechanical system to be improved independently.

---

## Roadmap

```text
Computer Vision
      |
      v
Hardware Integration
      |
      v
End-to-End Sorting
      |
      v
Dashboard Integration
      |
      v
Reliability Improvements
```

The long-term goal is to move from a working computer-vision prototype to a complete automated system in which an object can be detected, classified, validated, physically sorted, and recorded by the SmartSort dashboard.

---

## Repository Hygiene

Recommended `.gitignore` entries:

```gitignore
.venv/
venv/
__pycache__/
*.py[cod]

node_modules/
dist/

*.pt
*.onnx
runs/
datasets/

.DS_Store

.env
.env.*
```

Model weights and generated files should generally remain outside the main Git history unless the repository is configured for large-file storage.

---

## Acknowledgements

SmartSort is built using open-source technologies including Python, OpenCV, Ultralytics YOLO, NumPy, and the Arduino ecosystem.

The project was developed as a hackathon prototype exploring the intersection of computer vision, artificial intelligence, embedded systems, and sustainable automation.

---

## License

SmartSort was developed as a hackathon project. A formal open-source license can be added if the project is released publicly.

---

<p align="center">
  <strong>SmartSort</strong>
  <br>
  See it. Understand it. Sort it.
</p>
