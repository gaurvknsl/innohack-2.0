import React, { useLayoutEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import gsap from 'gsap';
import './styles.css';

const assets = {
  corners: '/svg/corners.svg', oakLeaves: '/svg/oakleaf.svg', machine: '/svg/machine.svg',
  belt: '/svg/belt.svg', bins: '/svg/dustbins.svg', bottle: '/svg/bottle.svg',
  can: '/svg/can.svg', leaves: '/svg/leaves.svg'
};

function App() {
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

  return <main className="page"><div className="scene" style={{ '--scene-scale': scale }}>
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
        <p ref={statusRef}>ready to sort..</p>
      </div>
    </section>
  </div></main>;
}

createRoot(document.getElementById('root')).render(<App />);
