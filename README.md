# ♻️ SmartSort

<p align="center">
  <img src="https://img.shields.io/badge/STATUS-HACKATHON%20PROTOTYPE-7C5CFC?style=for-the-badge" />
  <img src="https://img.shields.io/badge/PYTHON-3.x-3776AB?style=for-the-badge&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/OPENCV-COMPUTER%20VISION-5C3EE8?style=for-the-badge&logo=opencv&logoColor=white" />
  <img src="https://img.shields.io/badge/YOLO-ULTRALYTICS-111111?style=for-the-badge" />
</p>

<p align="center">
  <strong>An intelligent conveyor-based waste classification and sorting system.</strong>
</p>

<p align="center">
  SmartSort combines computer vision, machine learning, embedded control, and mechanical automation
  to identify waste and route it toward the appropriate category.
</p>

---

## 📖 Table of Contents

- [Overview](#-overview)
- [The Problem](#-the-problem)
- [Our Approach](#-our-approach)
- [How SmartSort Works](#-how-smartsort-works)
- [System Architecture](#-system-architecture)
- [Computer Vision Pipeline](#-computer-vision-pipeline)
- [AI Classification](#-ai-classification)
- [Confidence-Aware Detection](#-confidence-aware-detection)
- [Temporal Stability](#-temporal-stability)
- [Waste Categories](#-waste-categories)
- [Hardware Architecture](#-hardware-architecture)
- [Software Architecture](#-software-architecture)
- [Dashboard](#-dashboard)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Running the Vision System](#-running-the-vision-system)
- [Configuration](#-configuration)
- [Testing](#-testing)
- [Current Status](#-current-status)
- [Known Limitations](#-known-limitations)
- [Future Improvements](#-future-improvements)
- [Roadmap](#-roadmap)
- [Design Philosophy](#-design-philosophy)
- [Team](#-team)
- [Acknowledgements](#-acknowledgements)

---

# 🌱 Overview

Waste separation is one of those problems that appears simple until it has to be done repeatedly, accurately, and at scale.

A person can look at an object and decide whether it belongs in a plastic, metal, or organic waste stream almost instantly. Translating that ability into an automated system, however, requires several different technologies to work together:

- a camera needs to capture the object,
- computer vision needs to process the image,
- an AI model needs to interpret what it sees,
- software needs to determine whether the prediction is reliable,
- and a physical system needs to act on that decision.

**SmartSort** is our attempt to bring these pieces together into one integrated waste-sorting system.

The system uses a camera positioned above a conveyor to observe incoming waste. A Python-based computer vision pipeline captures the camera feed and passes the visual information through a trained classification model. The resulting prediction is evaluated using its confidence score and temporal consistency before being converted into a SmartSort sorting decision.

The final decision can then be passed to the hardware controller responsible for physically diverting the object toward the appropriate collection bin.

At a high level:

```text
                    WASTE OBJECT
                         │
                         ▼
                    ┌─────────┐
                    │ CAMERA  │
                    └────┬────┘
                         │
                         ▼
                 ┌───────────────┐
                 │    OpenCV     │
                 │ Vision Layer  │
                 └───────┬───────┘
                         │
                         ▼
                 ┌───────────────┐
                 │ AI CLASSIFIER │
                 │     YOLO      │
                 └───────┬───────┘
                         │
                         ▼
                ┌─────────────────┐
                │ CONFIDENCE +    │
                │ STABILITY CHECK │
                └────────┬────────┘
                         │
             ┌───────────┼───────────┐
             │           │           │
             ▼           ▼           ▼
          PLASTIC      METAL       ORGANIC
             │           │           │
             └───────────┼───────────┘
                         │
                         ▼
                  HARDWARE CONTROL
                         │
                         ▼
                    SERVO / ARM
                         │
                         ▼
                    SORTED BIN