"use client";

import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import { useMap } from "react-leaflet";
import type { LightFeature } from "@/lib/light";

const PANE_NAME = "route-light-glow";
// tilePane(200)보다 위, overlayPane(400, 경로 폴리라인)보다 아래에 둬서 글로우가 경로 아래 깔리게 한다.
const PANE_Z_INDEX = 350;

const SVG_NS = "http://www.w3.org/2000/svg";
const STREET_GLOW_RADIUS_M = 20;
const SECURITY_GLOW_RADIUS_M = 10;
const CORE_RADIUS_PX = 2;
const CORE_COLOR = "#FFD966";
const EARTH_CIRCUMFERENCE_M = 40075016.686;

let gradientIdSeq = 0;

/** Web Mercator(Leaflet 기본 CRS) 기준 반경(m)을 현재 줌/위도에서의 화면 픽셀로 환산한다. */
function metersToPixels(zoom: number, lat: number, meters: number): number {
  const metersPerPixel = (EARTH_CIRCUMFERENCE_M * Math.cos((lat * Math.PI) / 180)) / (256 * 2 ** zoom);
  return meters / metersPerPixel;
}

interface RouteLightGlowProps {
  lights: LightFeature[];
}

/**
 * 경로 인근 조명을 은은한 노란 radial-gradient 글로우로 그린다.
 * L.Circle의 단색 채우기로는 빛 번짐 표현이 불가능해 커스텀 pane + 수동 SVG로 구현한다.
 */
export default function RouteLightGlow({ lights }: RouteLightGlowProps) {
  const map = useMap();
  const gradientId = useMemo(() => `route-light-glow-gradient-${++gradientIdSeq}`, []);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const glowLayerRef = useRef<SVGGElement | null>(null);
  const coreLayerRef = useRef<SVGGElement | null>(null);
  const glowElsRef = useRef<Map<string, SVGCircleElement>>(new Map());
  const coreElsRef = useRef<Map<string, SVGCircleElement>>(new Map());

  // pane + svg 루트 + gradient <defs>는 마운트 시 1회만 생성한다.
  useEffect(() => {
    if (!map.getPane(PANE_NAME)) {
      const pane = map.createPane(PANE_NAME);
      pane.style.zIndex = String(PANE_Z_INDEX);
      pane.style.pointerEvents = "none";
    }
    const pane = map.getPane(PANE_NAME)!;

    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("class", "route-light-glow-svg");
    svg.style.position = "absolute";
    svg.style.left = "0";
    svg.style.top = "0";
    svg.style.overflow = "visible";
    svg.style.pointerEvents = "none";

    const defs = document.createElementNS(SVG_NS, "defs");
    const gradient = document.createElementNS(SVG_NS, "radialGradient");
    gradient.setAttribute("id", gradientId);

    const stops: [string, string][] = [
      ["0%", "rgba(255, 220, 120, 0.55)"],
      ["60%", "rgba(255, 200, 80, 0.25)"],
      ["100%", "rgba(255, 190, 60, 0)"],
    ];
    for (const [offset, color] of stops) {
      const stop = document.createElementNS(SVG_NS, "stop");
      stop.setAttribute("offset", offset);
      stop.setAttribute("stop-color", color);
      gradient.appendChild(stop);
    }
    defs.appendChild(gradient);
    svg.appendChild(defs);

    const glowLayer = document.createElementNS(SVG_NS, "g");
    const coreLayer = document.createElementNS(SVG_NS, "g");
    svg.appendChild(glowLayer);
    svg.appendChild(coreLayer);

    pane.appendChild(svg);

    svgRef.current = svg;
    glowLayerRef.current = glowLayer;
    coreLayerRef.current = coreLayer;

    const glowEls = glowElsRef.current;
    const coreEls = coreElsRef.current;

    return () => {
      pane.removeChild(svg);
      svgRef.current = null;
      glowLayerRef.current = null;
      coreLayerRef.current = null;
      glowEls.clear();
      coreEls.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  // 위치/반경 갱신: pan/zoom 시 재투영. 기존 <circle> 엘리먼트의 속성만 갱신해 재생성 비용을 피한다.
  useEffect(() => {
    const svg = svgRef.current;
    const glowLayer = glowLayerRef.current;
    const coreLayer = coreLayerRef.current;
    if (!svg || !glowLayer || !coreLayer) return;

    function render() {
      if (!svg || !glowLayer || !coreLayer) return;

      const topLeft = map.containerPointToLayerPoint([0, 0]);
      L.DomUtil.setPosition(svg as unknown as HTMLElement, topLeft);

      const zoom = map.getZoom();
      const seenIds = new Set<string>();

      for (const light of lights) {
        const id = `${light.properties.type}-${light.properties.id}`;
        seenIds.add(id);

        const [lng, lat] = light.geometry.coordinates;
        const layerPoint = map.latLngToLayerPoint([lat, lng]);
        const x = layerPoint.x - topLeft.x;
        const y = layerPoint.y - topLeft.y;
        const radiusM = light.properties.type === "street" ? STREET_GLOW_RADIUS_M : SECURITY_GLOW_RADIUS_M;
        const radiusPx = metersToPixels(zoom, lat, radiusM);

        let glowEl = glowElsRef.current.get(id);
        if (!glowEl) {
          glowEl = document.createElementNS(SVG_NS, "circle");
          glowEl.setAttribute("fill", `url(#${gradientId})`);
          glowEl.style.mixBlendMode = "screen";
          glowLayer.appendChild(glowEl);
          glowElsRef.current.set(id, glowEl);
        }
        glowEl.setAttribute("cx", String(x));
        glowEl.setAttribute("cy", String(y));
        glowEl.setAttribute("r", String(radiusPx));

        let coreEl = coreElsRef.current.get(id);
        if (!coreEl) {
          coreEl = document.createElementNS(SVG_NS, "circle");
          coreEl.setAttribute("fill", CORE_COLOR);
          coreEl.setAttribute("opacity", "0.9");
          coreEl.setAttribute("r", String(CORE_RADIUS_PX));
          coreLayer.appendChild(coreEl);
          coreElsRef.current.set(id, coreEl);
        }
        coreEl.setAttribute("cx", String(x));
        coreEl.setAttribute("cy", String(y));
      }

      // 더 이상 목록에 없는 조명의 엘리먼트는 제거한다.
      glowElsRef.current.forEach((el, id) => {
        if (!seenIds.has(id)) {
          glowLayer.removeChild(el);
          glowElsRef.current.delete(id);
        }
      });
      coreElsRef.current.forEach((el, id) => {
        if (!seenIds.has(id)) {
          coreLayer.removeChild(el);
          coreElsRef.current.delete(id);
        }
      });
    }

    render();
    map.on("move zoom viewreset", render);
    return () => {
      map.off("move zoom viewreset", render);
    };
  }, [map, lights, gradientId]);

  return null;
}
