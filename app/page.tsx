"use client";

import React, { useMemo, useRef, useState } from "react";

function supportsType(mime: string) {
  if (typeof window === "undefined") return false;
  const types = [mime, "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"]; 
  for (const t of types) {
    if (MediaRecorder.isTypeSupported?.(t)) return t;
  }
  return "";
}

export default function HomePage() {
  const [generating, setGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState<number>(8);
  const [fps, setFps] = useState<number>(60);
  const [theme, setTheme] = useState<string>("Colorido");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const mimeType = useMemo(() => supportsType("video/webm;codecs=vp9,opus"), []);

  async function generate() {
    setError(null);
    setVideoUrl(null);
    if (!mimeType) {
      setError("Seu navegador n?o suporta grava??o de v?deo WebM.");
      return;
    }

    const width = 960;
    const height = 540;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvasRef.current = canvas;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setError("Canvas n?o dispon?vel.");
      return;
    }

    const stream = canvas.captureStream(fps);

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const destination = audioContext.createMediaStreamDestination();

    const masterGain = audioContext.createGain();
    masterGain.gain.value = 0.7;
    masterGain.connect(destination);

    // Simple drum kit using noise + envelopes
    function playSnare(at: number) {
      const bufferSize = audioContext.sampleRate * 0.2;
      const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = audioContext.createBufferSource();
      noise.buffer = noiseBuffer;
      const filter = audioContext.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.value = 800;
      const gain = audioContext.createGain();
      gain.gain.setValueAtTime(1.0, at);
      gain.gain.exponentialRampToValueAtTime(0.01, at + 0.18);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);
      noise.start(at);
    }

    function playKick(at: number) {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(140, at);
      osc.frequency.exponentialRampToValueAtTime(40, at + 0.2);
      gain.gain.setValueAtTime(1.0, at);
      gain.gain.exponentialRampToValueAtTime(0.001, at + 0.25);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(at);
      osc.stop(at + 0.26);
    }

    function playBoing(at: number) {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(220, at);
      osc.frequency.exponentialRampToValueAtTime(660, at + 0.15);
      gain.gain.setValueAtTime(0.6, at);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.4);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(at);
      osc.stop(at + 0.42);
    }

    // Silly jingle chords
    function playChord(at: number, baseHz: number) {
      const freqs = [1, 5/4, 3/2].map(m => baseHz * m);
      for (const f of freqs) {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(f, at);
        gain.gain.setValueAtTime(0.12, at);
        gain.gain.linearRampToValueAtTime(0.0, at + 0.8);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(at);
        osc.stop(at + 0.82);
      }
    }

    const composed = new MediaStream();
    stream.getVideoTracks().forEach(t => composed.addTrack(t));
    destination.stream.getAudioTracks().forEach(t => composed.addTrack(t));

    const recorder = new MediaRecorder(composed, { mimeType });
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

    const startedAt = audioContext.currentTime + 0.2;

    // Schedule a simple backbeat and jokes
    for (let bar = 0; bar < Math.ceil(duration); bar++) {
      const t = startedAt + bar * 0.5;
      playKick(t);
      playSnare(t + 0.25);
      if (bar % 2 === 0) playBoing(t + 0.12);
      if (bar % 2 === 0) playChord(t, 330);
    }

    recorder.start();

    // Animation
    let rafId = 0;
    let startMs = performance.now();

    const faces = ["??", "??", "??", "??", "??", "??", "??"];
    const captions = [
      "Quando o caf? bate...",
      "Modo dev: on",
      "Deploy na sexta ??",
      "S? mais um console.log",
      "Bug? Feature surpresa!",
    ];

    function drawBackground(t: number) {
      const grad = ctx.createLinearGradient(0, 0, width, height);
      if (theme === "Colorido") {
        grad.addColorStop(0, `hsl(${(t*40)%360} 100% 95%)`);
        grad.addColorStop(1, `hsl(${(t*40+120)%360} 100% 88%)`);
      } else if (theme === "Pastel") {
        grad.addColorStop(0, `hsl(${(t*20)%360} 70% 96%)`);
        grad.addColorStop(1, `hsl(${(t*20+60)%360} 70% 90%)`);
      } else {
        grad.addColorStop(0, `#111827`);
        grad.addColorStop(1, `#1f2937`);
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Confetti sprinkles
      for (let i = 0; i < 70; i++) {
        const x = (i * 97 + t * 120) % (width + 60) - 30;
        const y = (i * 53 + t * 80) % (height + 60) - 30;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(((i * 17) % 360) * Math.PI / 180);
        ctx.fillStyle = `hsl(${(i * 22) % 360} 90% 60%)`;
        ctx.fillRect(-3, -8, 6, 16);
        ctx.restore();
      }
    }

    function drawFace(t: number) {
      const r = 80 + Math.sin(t*2) * 6;
      const x = width/2 + Math.sin(t*3) * 220;
      const y = height/2 + Math.cos(t*2.2) * 120;

      // Shadow
      ctx.fillStyle = "rgba(0,0,0,0.15)";
      ctx.beginPath();
      ctx.ellipse(x+10, y+10, r*1.02, r*1.02, 0, 0, Math.PI*2);
      ctx.fill();

      // Face circle
      ctx.fillStyle = theme === "Escuro" ? "#ffd166" : "#fde68a";
      ctx.beginPath();
      ctx.ellipse(x, y, r, r, 0, 0, Math.PI * 2);
      ctx.fill();

      // Emoji
      ctx.font = `${Math.floor(r*1.2)}px system-ui, apple color emoji`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(faces[Math.floor(t*2)%faces.length], x, y);

      // Wiggle outline
      ctx.lineWidth = 6;
      ctx.strokeStyle = `hsl(${(t*100)%360} 100% 50%)`;
      ctx.beginPath();
      for (let a = 0; a <= Math.PI*2; a += Math.PI/36) {
        const rr = r + Math.sin(a*8 + t*8) * 6;
        const px = x + Math.cos(a) * rr;
        const py = y + Math.sin(a) * rr;
        if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }

    function drawCaption(t: number) {
      const text = captions[Math.floor(t/1.6) % captions.length];
      const wobble = Math.sin(t*6) * 6;
      ctx.font = `bold 40px ui-sans-serif, system-ui`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const pad = 16;
      const metrics = ctx.measureText(text);
      const tw = metrics.width + pad*2;
      const th = 56;
      const tx = width/2;
      const ty = height - 80 + wobble;

      ctx.fillStyle = "rgba(0,0,0,0.15)";
      ctx.fillRect(tx - tw/2 + 3, ty - th/2 + 3, tw, th);

      ctx.fillStyle = theme === "Escuro" ? "#111827" : "#ffffff";
      ctx.strokeStyle = theme === "Escuro" ? "#f59e0b" : "#fbbf24";
      ctx.lineWidth = 2;
      ctx.fillRect(tx - tw/2, ty - th/2, tw, th);
      ctx.strokeRect(tx - tw/2, ty - th/2, tw, th);

      const grad = ctx.createLinearGradient(tx - tw/2, ty, tx + tw/2, ty);
      grad.addColorStop(0, theme === "Escuro" ? "#f59e0b" : "#ef4444");
      grad.addColorStop(1, theme === "Escuro" ? "#fde68a" : "#f59e0b");

      ctx.fillStyle = grad;
      ctx.fillText(text, tx, ty + 2);
    }

    const totalMs = duration * 1000;

    function tick(now: number) {
      const t = (now - startMs) / 1000;
      drawBackground(t);
      drawFace(t);
      drawCaption(t);
      if (now - startMs < totalMs) {
        rafId = requestAnimationFrame(tick);
      } else {
        recorder.stop();
      }
    }

    recorder.onstop = async () => {
      cancelAnimationFrame(rafId);
      try { await audioContext.suspend(); } catch {}
      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      setGenerating(false);
    };

    setGenerating(true);
    startMs = performance.now();
    requestAnimationFrame(tick);
  }

  return (
    <div className="container">
      <div className="header">
        <div>
          <div className="badge">? Gerador de V?deo Engra?ado</div>
          <h1 className="title">Crie um v?deo engra?ado</h1>
          <p className="subtitle">Gera uma anima??o com trilha sonora direto no seu navegador.</p>
        </div>
        <button className="btn" onClick={generate} disabled={generating}>
          {generating ? "Gerando..." : "Gerar V?deo"}
        </button>
      </div>

      <div className="card">
        <div className="row" style={{marginBottom: 12}}>
          <label>Dura??o (s)</label>
          <input type="number" min={3} max={20} value={duration} onChange={e=>setDuration(parseFloat(e.target.value)||8)} />
          <label>FPS</label>
          <input type="number" min={24} max={60} value={fps} onChange={e=>setFps(parseFloat(e.target.value)||60)} />
          <label>Tema</label>
          <select value={theme} onChange={e=>setTheme(e.target.value)}>
            <option>Colorido</option>
            <option>Pastel</option>
            <option>Escuro</option>
          </select>
        </div>
        {error && <p style={{color:'#b91c1c', fontWeight:700}}>{error}</p>}
        {videoUrl ? (
          <>
            <video className="preview" controls src={videoUrl} />
            <div style={{marginTop:12}}>
              <a className="btn" href={videoUrl} download={`video-engracado.webm`}>Baixar V?deo</a>
            </div>
          </>
        ) : (
          <div style={{border:'2px dashed #e5e7eb', borderRadius:12, padding:24, color:'#6b7280'}}>
            Clique em "Gerar V?deo" para criar algo hil?rio ??
          </div>
        )}
      </div>
    </div>
  );
}
