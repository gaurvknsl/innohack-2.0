import React, { useLayoutEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import gsap from 'gsap';
import './styles.css';

const assets = {
  corners: '/svg/corners.svg', oakLeaves: '/svg/oakleaf.svg', machine: '/svg/machine.svg',
  belt: '/svg/belt.svg', bins: '/svg/dustbins.svg', bottle: '/svg/bottle.svg',
  can: '/svg/can.svg', leaves: '/svg/leaves.svg', trash: '/svg/pinhead_bag-of-trash.svg',
  foodCan: '/svg/game-icons_opened-food-can.svg', leafIcon: '/svg/mdi_leaf.svg'
};

function App() {
  const [route, setRoute] = useState(() => window.location.pathname === '/live-sorting' ? 'live-sorting' : window.location.pathname === '/dashboard' ? 'dashboard' : 'landing');
  const [transitioning, setTransitioning] = useState(false);
  const [systemStatus, setSystemStatus] = useState({ camera: false, opencv: false, classifier: false, conveyor: false, arduino: false });
  const transitionRef = useRef(null);
  const landingFaceRef = useRef(null);
  const dashboardFaceRef = useRef(null);
  const navigateToDashboard = () => {
    if (transitioning || route === 'dashboard') return;
    setTransitioning(true);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      window.history.pushState({}, '', '/dashboard');
      setRoute('dashboard');
      setTransitioning(false);
      return;
    }
    const timeline = gsap.timeline({ onComplete: () => {
      window.history.pushState({}, '', '/dashboard');
      setRoute('dashboard');
      setTransitioning(false);
    } });
    timeline.to(transitionRef.current, { scale: 1.06, duration: 0.3, ease: 'power2.in' })
      .to(transitionRef.current, { rotationY: 180, duration: 0.85, ease: 'power3.inOut' });
  };
  const navigateToLiveSorting = () => {
    window.history.pushState({}, '', '/live-sorting');
    setRoute('live-sorting');
  };
  useLayoutEffect(() => {
    const onPopState = () => setRoute(window.location.pathname === '/live-sorting' ? 'live-sorting' : window.location.pathname === '/dashboard' ? 'dashboard' : 'landing');
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);
  useLayoutEffect(() => {
    if (route === 'dashboard') return undefined;
    let cancelled = false;
    let timer;
    const poll = async () => {
      try {
        const response = await fetch('/api/status', { cache: 'no-store' });
        if (!response.ok) throw new Error('status unavailable');
        const next = await response.json();
        if (!cancelled) {
          setSystemStatus(next.components || next);
        }
      } catch {
        if (!cancelled) setSystemStatus({ camera: false, opencv: false, classifier: false, conveyor: false, arduino: false });
      } finally {
        if (!cancelled) timer = window.setTimeout(poll, 1500);
      }
    };
    poll();
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [route, transitioning]);
  useLayoutEffect(() => {
    let touchStartY = 0;
    const onWheel = (event) => {
      const scrollingForward = event.deltaY > 0 && route === 'landing';
      const scrollingBack = event.deltaY < 0 && route === 'dashboard';
      if (scrollingForward || scrollingBack) {
        event.preventDefault();
        if (scrollingForward) {
          navigateToDashboard();
        } else if (!transitioning) {
          setTransitioning(true);
          const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          const finish = () => {
            window.history.pushState({}, '', '/');
            setRoute('landing');
            setTransitioning(false);
          };
          if (reduced) finish();
          else gsap.timeline({ onComplete: finish })
            .to(transitionRef.current, { scale: 1.06, duration: 0.3, ease: 'power2.in' })
            .to(transitionRef.current, { rotationY: 0, duration: 0.85, ease: 'power3.inOut' });
        }
      }
    };
    const onTouchStart = (event) => { touchStartY = event.touches[0].clientY; };
    const onTouchEnd = (event) => {
      const delta = touchStartY - event.changedTouches[0].clientY;
      if (delta > 35 && route === 'landing') navigateToDashboard();
      if (delta < -35 && route === 'dashboard' && !transitioning) {
        window.dispatchEvent(new WheelEvent('wheel', { deltaY: -1, cancelable: true }));
      }
    };
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [route, transitioning]);

  const [scale, setScale] = useState(() => Math.max(window.innerWidth / 1280, window.innerHeight / 800));
  const machineRef = useRef(null);
  const binsRef = useRef(null);
  const itemRefs = useRef([]);
  const statusRef = useRef(null);
  useLayoutEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const context = gsap.context(() => {
      const machine = machineRef.current;
      const bins = binsRef.current;
      const items = itemRefs.current;
      if (!machine || !bins || items.length !== 3) return;
      gsap.set([machine, ...items], { clearProps: 'transform' });
      gsap.set(items, { autoAlpha: 1, x: 0, y: 0, scale: 1 });
      statusRef.current.textContent = 'ready to sort..';
      if (reduceMotion) return;

      const machineBox = machine.getBoundingClientRect();
      const binBox = bins.getBoundingClientRect();
      const itemBoxes = items.map((item) => item.getBoundingClientRect());
      const gripperX = machineBox.left + machineBox.width * 0.78;
      const binCenters = [0.22, 0.55, 0.88].map((ratio) => binBox.left + binBox.width * ratio);
      const machineScale = scale || 1;
      let machineX = 0;
      const itemX = [0, 0, 0];
      const itemY = [0, 0, 0];
      const timeline = gsap.timeline({ repeat: -1, repeatDelay: 1.1 });
      const phases = [
        { name: 'metal', item: 0 },
        { name: 'plastic', item: 1 },
        { name: 'organic', item: 2 }
      ];

      phases.forEach(({ name, item: index }) => {
        const itemBox = itemBoxes[index];
        const itemCenter = itemBox.left + itemBox.width / 2;
        const reachX = (itemCenter - gripperX) / machineScale - machineX;
        const carryX = (binCenters[index] - itemCenter) / machineScale;
        const carryY = (binBox.top + binBox.height * 0.3 - itemBox.top) / machineScale;
        timeline.call(() => { statusRef.current.textContent = `sorting ${name}..`; })
          .to(machine, { x: `+=${reachX}`, duration: 1.15, ease: 'power2.inOut' })
          .to(machine, { y: '-=10', duration: 0.3, ease: 'power2.out' })
          .to(items[index], { y: '-=28', scale: 0.9, duration: 0.35, ease: 'back.out(1.4)' }, '<')
          .to(machine, { x: `+=${carryX}`, duration: 1.35, ease: 'power2.inOut' })
          .to(items[index], { x: `+=${carryX}`, y: `+=${carryY}`, duration: 1.35, ease: 'power2.inOut' }, '<')
          .to(machine, { y: '+=10', duration: 0.3, ease: 'power2.in' })
          .to(items[index], { y: '+=18', scale: 0.78, duration: 0.45, ease: 'bounce.out' })
          .to(items[index], { autoAlpha: 0, scale: 0.68, duration: 0.22, ease: 'power1.in' })
          .call(() => { statusRef.current.textContent = `${name} sorted..`; });
        machineX += reachX + carryX;
        itemX[index] += carryX;
        itemY[index] += carryY - 10;
      });

      timeline.call(() => { statusRef.current.textContent = 'sorting complete..'; })
        .to(machine, { x: `-=${machineX}`, duration: 1.4, ease: 'power3.inOut' })
        .set(items, { autoAlpha: 1, x: 0, y: 0, scale: 1 })
        .call(() => { statusRef.current.textContent = 'ready to sort..'; });
    });
    return () => context.revert();
  }, [scale]);
  useLayoutEffect(() => {
    const resize = () => setScale(Math.max(window.innerWidth / 1280, window.innerHeight / 800));
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  if (route === 'live-sorting') return <LiveSorting onBack={() => { window.history.pushState({}, '', '/dashboard'); setRoute('dashboard'); }} />;

  return <main className="page transition-viewport"><div ref={transitionRef} className={`transition-card ${route === 'dashboard' ? 'dashboard-initial' : ''}`}>
    <div ref={landingFaceRef} className="transition-face landing-face"><div className="scene" style={{ '--scene-scale': scale }}>
    <header className="topbar"><img src={assets.corners} alt="" aria-hidden="true" /></header>

    <img className="leaf" src={assets.oakLeaves} alt="" aria-hidden="true" />

    <section className="hero" aria-labelledby="hero-title">
      <img ref={machineRef} className="machine" src={assets.machine} alt="Smart waste sorting machine" />
      <img className="belt" src={assets.belt} alt="" aria-hidden="true" />
      <div className="items" aria-hidden="true">
        <img ref={(node) => { itemRefs.current[0] = node; }} className="item can" src={assets.can} alt="Metal waste" />
        <img ref={(node) => { itemRefs.current[1] = node; }} className="item bottle" src={assets.bottle} alt="Plastic bottle" />
        <img ref={(node) => { itemRefs.current[2] = node; }} className="item leaf-item" src={assets.leaves} alt="Organic waste" />
      </div>
      <img ref={binsRef} className="bins" src={assets.bins} alt="Metal, plastic and organic recycling bins" />
      <div className="copy">
        <h1 id="hero-title">Smart Waste Sorting System</h1>
        <p ref={statusRef} className="status-copy">{Object.values(systemStatus).every(Boolean) ? 'system connected..' : 'waiting for system..'}</p>
      </div>
    </section>
    </div><div className="scroll-hint" aria-hidden="true"><span>Scroll down to open dashboard</span><i>↓</i></div></div>
    <div ref={dashboardFaceRef} className="transition-face dashboard-face"><Dashboard onLiveSorting={navigateToLiveSorting} /></div>
  </div></main>;
}

function MetricCard({ tone, icon, label, value, today }) {
  return <article className="metric-card">
    <div className={`metric-icon ${tone}`}>{icon}</div>
    <div><p className={`metric-label ${tone}`}>{label}</p><strong className={tone}>{value}</strong><small>{today}</small></div>
  </article>;
}

function Dashboard({ onLiveSorting }) {
  const [liveStatus, setLiveStatus] = useState({ camera: false, opencv: false, classifier: false, data: { sortedCounts: { PLASTIC: 124, METAL: 86, ORGANIC: 93 } } });
  const scanLabelRef = useRef(null);
  const scannerRef = useRef(null);
  const scanIconRefs = useRef([]);
  const scanCategories = [
    { name: 'PLASTIC', icon: assets.trash },
    { name: 'METAL', icon: assets.foodCan },
    { name: 'ORGANIC', icon: assets.leafIcon },
  ];
  useLayoutEffect(() => {
    let cancelled = false;
    let timer;
    const poll = async () => {
      try {
        const response = await fetch('/api/status', { cache: 'no-store' });
        const payload = await response.json();
        if (!cancelled) setLiveStatus(payload);
      } catch { /* The status panel remains safely disconnected while the API is offline. */ }
      if (!cancelled) timer = window.setTimeout(poll, 1500);
    };
    poll();
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, []);
  const sortedCounts = liveStatus.data?.sortedCounts || { PLASTIC: 124, METAL: 86, ORGANIC: 93 };
  const maxSorted = Math.max(sortedCounts.PLASTIC, sortedCounts.METAL, sortedCounts.ORGANIC, 1);
  useLayoutEffect(() => {
    const context = gsap.context(() => {
      const icons = scanIconRefs.current.filter(Boolean);
      const label = scanLabelRef.current;
      const scanner = scannerRef.current;
      if (!label || !scanner || icons.length !== scanCategories.length) return;
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      gsap.set(icons, { opacity: 0.28, scale: 1, filter: 'saturate(0.45)' });
      const track = scanner.parentElement;
      const trackBox = track.getBoundingClientRect();
      const positions = icons.map((icon) => {
        const box = icon.getBoundingClientRect();
        return { x: box.left - trackBox.left + (box.width - scanner.offsetWidth) / 2, y: box.top - trackBox.top + (box.height - scanner.offsetHeight) / 2 };
      });
      gsap.set(scanner, { x: positions[0].x, y: positions[0].y, xPercent: 0, yPercent: 0 });
      if (reducedMotion) {
        gsap.set(icons[0], { opacity: 1, scale: 1.05, filter: 'none' });
        gsap.set(scanner, { opacity: 0 });
        label.textContent = 'PLASTIC · 100%';
        return;
      }
      const progress = { value: 0 };
      const timeline = gsap.timeline({ repeat: -1, repeatDelay: 0.25 });
      scanCategories.forEach((category, index) => {
        const icon = icons[index];
        timeline.call(() => {
          progress.value = 0;
          gsap.set(icons, { opacity: 0.28, scale: 1, filter: 'saturate(0.45)' });
          gsap.set(icon, { opacity: 1, filter: 'none' });
          label.textContent = `${category.name} · 0%`;
        })
          .to(scanner, { x: positions[index].x, y: positions[index].y, opacity: 1, duration: index === 0 ? 0 : 0.45, ease: 'power2.inOut' })
          .to(progress, { value: 100, duration: 2.2, ease: 'power1.inOut', onUpdate: () => { label.textContent = `${category.name} · ${Math.round(progress.value)}%`; } })
          .to({}, { duration: 2.2, ease: 'none' }, '<')
          .to(icon, { scale: 1.1, duration: 0.42, ease: 'sine.inOut', repeat: 2, yoyo: true }, '<0.15')
          .to({}, { duration: 0.3 });
      });
    });
    return () => context.revert();
  }, []);
  const systemRows = [['CAMERA', 'camera'], ['OPENCV ENGINE', 'opencv'], ['AI CLASSIFIER', 'classifier']];
  return <main className="dashboard-page">
    <section className="dashboard-main">
      <header className="dashboard-header"><div><h2>Good morning, User!</h2><p>Here's what's happening with your system today.</p></div></header>
      <div className="metrics"><MetricCard tone="plastic" icon={<img src={assets.trash} alt="" />} label="PLASTIC" value={sortedCounts.PLASTIC} today="live count" /><MetricCard tone="metal" icon={<img src={assets.foodCan} alt="" />} label="METAL" value={sortedCounts.METAL} today="live count" /><MetricCard tone="organic" icon={<img src={assets.leafIcon} alt="" />} label="ORGANIC" value={sortedCounts.ORGANIC} today="live count" /></div>
      <div className="dashboard-grid">
        <section className="panel live-panel live-panel-clickable" onClick={onLiveSorting} role="link" tabIndex="0" onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onLiveSorting(); }}><h3>LIVE SORTING</h3><p className="panel-subtitle">Real-time waste detection</p><div className="flow-track"><span ref={scanLabelRef} className="flow-label">PLASTIC · 0%</span><div className="flow-icons"><div className="flow-icon-slot"><img ref={(node) => { scanIconRefs.current[0] = node; }} src={assets.trash} alt="Plastic waste" /></div><div className="flow-icon-slot"><img ref={(node) => { scanIconRefs.current[1] = node; }} src={assets.foodCan} alt="Metal waste" /></div><div className="flow-icon-slot"><img ref={(node) => { scanIconRefs.current[2] = node; }} src={assets.leafIcon} alt="Organic waste" /></div><div ref={scannerRef} className="detection-box"><span /></div></div><div className="flow-line"><span className="flow-scanner" /></div><span className="flow-caption">SORTING FLOW</span></div><div className="live-details"><div><small>CURRENT DETECTION</small><b>PLASTIC BOTTLE</b></div><div><small>CONFIDENCE</small><b className="purple">94.2%</b></div><div><small>DESTINATION</small><b className="blue">PLASTIC BIN</b></div></div></section>
        <section className="panel system-panel"><h3>SYSTEM STATUS</h3><p className="panel-subtitle">Hardware &amp; Software</p>{systemRows.map(([name, key]) => <div className="system-row" key={name}><span>{name}</span><b className={liveStatus[key] ? 'online' : 'offline'}>{liveStatus[key] ? 'Connected' : 'Disconnected'}</b></div>)}<div className="last-sorted"><small>LAST SORTED</small><strong>Plastic</strong><span>94.2% · Plastic Bin</span></div></section>
      </div>
      <section className="activity"><h3>TODAY’S SORTING ACTIVITY</h3><div className="activity-card"><ActivityRow label="PLASTIC" value={sortedCounts.PLASTIC} width={`${sortedCounts.PLASTIC / maxSorted * 100}%`} tone="plastic" /><ActivityRow label="ORGANIC" value={sortedCounts.ORGANIC} width={`${sortedCounts.ORGANIC / maxSorted * 100}%`} tone="organic" /><ActivityRow label="METAL" value={sortedCounts.METAL} width={`${sortedCounts.METAL / maxSorted * 100}%`} tone="metal" /></div></section>
    </section>
  </main>;
}

function LiveSorting({ onBack }) {
  const [status, setStatus] = useState({ components: {}, data: { classification: 'NONE', confidence: 0 } });
  useLayoutEffect(() => {
    let cancelled = false;
    let timer;
    const poll = async () => {
      try {
        const response = await fetch('/api/status', { cache: 'no-store' });
        const next = await response.json();
        if (!cancelled) setStatus(next);
      } catch { /* The disconnected state remains visible while the API is offline. */ }
      if (!cancelled) timer = window.setTimeout(poll, 1000);
    };
    poll();
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, []);
  const components = status.components || {};
  const cameraReady = components.camera && components.opencv && components.classifier;
  return <main className="live-page">
    <header className="live-header"><button className="back-button" onClick={onBack}>← Dashboard</button><div><h1>Live Sorting</h1><p>Real-time waste detection from the OpenCV camera pipeline</p></div></header>
    <section className="live-layout">
      <div className="camera-card"><div className="camera-frame">{cameraReady ? <img src="/api/stream" alt="Live OpenCV camera feed" /> : <div className="camera-offline"><span>◎</span><strong>Camera disconnected</strong><small>Start the SmartSort backend to view detection.</small></div>}</div><div className="camera-footer"><span className={cameraReady ? 'online-dot' : 'offline-dot'} />{cameraReady ? 'Camera connected' : 'Waiting for camera connection'}</div></div>
      <aside className="detection-card"><p className="eyebrow">CURRENT DETECTION</p><h2>{status.data?.classification || 'NONE'}</h2><div className="confidence"><span>CONFIDENCE</span><strong>{((status.data?.confidence || 0) * 100).toFixed(1)}%</strong></div><div className="live-component-list">{[['CAMERA', 'camera'], ['OPENCV ENGINE', 'opencv'], ['AI CLASSIFIER', 'classifier']].map(([label, key]) => <div key={key}><span>{label}</span><b className={components[key] ? 'online' : 'offline'}>{components[key] ? 'Connected' : 'Disconnected'}</b></div>)}</div></aside>
    </section>
  </main>;
}

function ActivityRow({ label, value, width, tone }) { return <div className="activity-row"><span className={tone}>{label}</span><div className={`activity-bar ${tone}`}><i style={{ width }} /></div><b>{value}</b></div>; }

createRoot(document.getElementById('root')).render(<App />);
