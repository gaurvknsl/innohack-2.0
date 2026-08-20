# ♻️ SmartSort

### Intelligent Conveyor-Based Waste Classification & Sorting System

> **SmartSort** is an AI-powered waste-sorting system that combines computer vision, machine learning, and automated hardware to identify waste materials and route them toward the appropriate collection category.

---

<p align="center">

![Status](https://img.shields.io/badge/status-hackathon%20prototype-7C5CFC?style=for-the-badge)
![Python](https://img.shields.io/badge/Python-3.x-3776AB?style=for-the-badge&logo=python&logoColor=white)
![OpenCV](https://img.shields.io/badge/OpenCV-Computer%20Vision-5C3EE8?style=for-the-badge&logo=opencv&logoColor=white)
![YOLO](https://img.shields.io/badge/YOLO-Ultralytics-111111?style=for-the-badge)
![Platform](https://img.shields.io/badge/Platform-macOS-000000?style=for-the-badge&logo=apple&logoColor=white)

</p>

---

## ✦ Overview

Waste sorting is often dependent on manual separation, which can be slow, inconsistent, and difficult to scale.

**SmartSort** approaches the problem as an automated material-classification pipeline:

```text
                 ┌──────────────────┐
                 │   Waste Object   │
                 └────────┬─────────┘
                          │
                          ▼
                 ┌──────────────────┐
                 │      Camera      │
                 └────────┬─────────┘
                          │
                          ▼
                 ┌──────────────────┐
                 │ OpenCV Processing│
                 └────────┬─────────┘
                          │
                          ▼
                 ┌──────────────────┐
                 │  AI Classifier   │
                 │      (YOLO)      │
                 └────────┬─────────┘
                          │
                          ▼
               ┌──────────────────────┐
               │ Confidence Filtering │
               └──────────┬───────────┘
                          │
             ┌────────────┼────────────┐
             ▼            ▼            ▼
         PLASTIC        METAL       ORGANIC
             │            │            │
             └────────────┼────────────┘
                          ▼
                 ┌──────────────────┐
                 │   Microcontroller│
                 └────────┬─────────┘
                          │
                          ▼
                 ┌──────────────────┐
                 │ Servo / Diverter │
                 └────────┬─────────┘
                          │
                          ▼
                  Automated Sorting