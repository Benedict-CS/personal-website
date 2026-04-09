"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Grid, OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ShowroomModel = {
  id: string;
  url: string;
  x: number;
  y: number;
  z: number;
  rotationY?: number;
  scale?: number;
};

type ShowroomConfig = {
  models: ShowroomModel[];
  camera: { x: number; y: number; z: number };
};

function modelBounds(position: THREE.Vector3, radius = 0.75) {
  return new THREE.Box3(
    new THREE.Vector3(position.x - radius, position.y - radius, position.z - radius),
    new THREE.Vector3(position.x + radius, position.y + radius, position.z + radius)
  );
}

function collidesWithAny(target: THREE.Vector3, others: Array<{ id: string; position: THREE.Vector3 }>, selfId: string) {
  const targetBox = modelBounds(target);
  return others.some((o) => o.id !== selfId && targetBox.intersectsBox(modelBounds(o.position)));
}

function CameraWalker({
  blockers,
}: {
  blockers: Array<{ id: string; position: THREE.Vector3 }>;
}) {
  const { camera } = useThree();
  const keys = useRef<Record<string, boolean>>({});

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = true;
    };
    const up = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useFrame((_, delta) => {
    const speed = 3.2 * delta;
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).setY(0).normalize();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion).setY(0).normalize();
    const next = camera.position.clone();
    if (keys.current.w) next.addScaledVector(forward, speed);
    if (keys.current.s) next.addScaledVector(forward, -speed);
    if (keys.current.a) next.addScaledVector(right, -speed);
    if (keys.current.d) next.addScaledVector(right, speed);

    // Keep visitor above floor and block camera from entering model bounds.
    next.y = Math.max(1.4, next.y);
    if (!collidesWithAny(next, blockers, "__camera__")) {
      camera.position.copy(next);
    }
  });
  return null;
}

function GltfNode({
  model,
  selected,
  onSelect,
}: {
  model: ShowroomModel;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const gltf = useGLTF(model.url);
  return (
    <group
      position={[model.x, model.y, model.z]}
      rotation={[0, model.rotationY ?? 0, 0]}
      scale={[model.scale ?? 1, model.scale ?? 1, model.scale ?? 1]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(model.id);
      }}
    >
      <primitive object={gltf.scene.clone()} />
      {selected ? (
        <mesh position={[0, 1.2, 0]}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshStandardMaterial color="#2563eb" />
        </mesh>
      ) : null}
    </group>
  );
}

export function ThreeShowroomBuilder({ siteId }: { siteId: string }) {
  const [config, setConfig] = useState<ShowroomConfig>({
    models: [],
    camera: { x: 0, y: 2.5, z: 7 },
  });
  const [urlInput, setUrlInput] = useState("");
  const [selectedId, setSelectedId] = useState<string>("");
  const [status, setStatus] = useState("");

  const selected = useMemo(
    () => config.models.find((m) => m.id === selectedId) || null,
    [config.models, selectedId]
  );

  const blockers = useMemo(
    () =>
      config.models.map((m) => ({
        id: m.id,
        position: new THREE.Vector3(m.x, m.y, m.z),
      })),
    [config.models]
  );

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/saas/sites/${siteId}/showroom`);
      if (!res.ok) return;
      const data = await res.json();
      const showroom = (data.showroom ?? {}) as ShowroomConfig;
      setConfig({
        models: Array.isArray(showroom.models) ? showroom.models : [],
        camera: showroom.camera ?? { x: 0, y: 2.5, z: 7 },
      });
      setSelectedId(showroom.models?.[0]?.id || "");
    };
    load();
  }, [siteId]);

  const addModel = () => {
    if (!urlInput.trim()) return;
    const id = `mdl_${Math.random().toString(36).slice(2, 9)}`;
    const model: ShowroomModel = {
      id,
      url: urlInput.trim(),
      x: 0,
      y: 0,
      z: 0,
      rotationY: 0,
      scale: 1,
    };
    setConfig((prev) => ({ ...prev, models: [...prev.models, model] }));
    setSelectedId(id);
    setUrlInput("");
  };

  const updateSelected = (patch: Partial<ShowroomModel>) => {
    if (!selectedId) return;
    setConfig((prev) => ({
      ...prev,
      models: prev.models.map((m) => (m.id === selectedId ? { ...m, ...patch } : m)),
    }));
  };

  const save = async () => {
    const res = await fetch(`/api/saas/sites/${siteId}/showroom`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ showroom: config }),
    });
    setStatus(res.ok ? "3D showroom saved." : "Failed to save showroom.");
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <aside className="rounded border border-border bg-card p-3 space-y-3">
        <h2 className="text-sm font-semibold">3D Showroom Controls</h2>
        <Input value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="https://...model.glb" />
        <Button variant="outline" onClick={addModel}>Add GLB/GLTF Model</Button>
        {selected ? (
          <div className="space-y-2 rounded border border-border p-2">
            <p className="text-xs font-semibold">Selected Model</p>
            <Input type="number" value={selected.x} onChange={(e) => updateSelected({ x: Number(e.target.value) })} placeholder="x" />
            <Input type="number" value={selected.y} onChange={(e) => updateSelected({ y: Number(e.target.value) })} placeholder="y" />
            <Input type="number" value={selected.z} onChange={(e) => updateSelected({ z: Number(e.target.value) })} placeholder="z" />
            <Input type="number" value={selected.rotationY ?? 0} onChange={(e) => updateSelected({ rotationY: Number(e.target.value) })} placeholder="rotationY" />
            <Input type="number" value={selected.scale ?? 1} onChange={(e) => updateSelected({ scale: Number(e.target.value) })} placeholder="scale" />
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Select a model in canvas by clicking it.</p>
        )}
        <Button onClick={save}>Save Showroom</Button>
        {status ? <p className="text-xs text-muted-foreground">{status}</p> : null}
      </aside>

      <section className="h-[70vh] overflow-hidden rounded border border-border bg-card">
        <Canvas camera={{ position: [config.camera.x, config.camera.y, config.camera.z], fov: 55 }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[8, 14, 6]} intensity={1.2} castShadow />
          <Grid infiniteGrid cellSize={0.8} cellThickness={0.5} sectionSize={4} sectionThickness={1} fadeDistance={40} />
          <Suspense fallback={null}>
            {config.models.map((model) => (
              <GltfNode
                key={model.id}
                model={model}
                selected={selectedId === model.id}
                onSelect={setSelectedId}
              />
            ))}
            <Environment preset="city" />
          </Suspense>
          <OrbitControls enablePan enableRotate enableZoom />
          <CameraWalker blockers={blockers} />
        </Canvas>
      </section>
    </div>
  );
}

