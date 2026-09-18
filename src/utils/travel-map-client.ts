/**
 * TravelMap 的实际 MapLibre 渲染逻辑，供 TravelMap.astro 的 <script> 调用。
 *
 * 只依赖 DOM 节点 + 校验过的数据，不关心数据从 directive/JSON 还是别处来，
 * 方便以后如果真的需要一个 props 驱动的入口，也只是薄薄一层包装。
 */
import maplibregl from 'maplibre-gl';
import type { Day, Stop, TravelMapData } from './travel-map-schema';

const DEFAULT_BASEMAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';
const ALL_DAYS = 'all';

function buildLineCoords(day: Day): [number, number][] {
  if (day.route && day.route.length > 0) return day.route;
  return day.stops.map((stop) => stop.coords);
}

function createMarkerElement(day: Day, stop: Stop, indexInDay: number): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'tm-marker';
  el.style.setProperty('--marker-color', day.color);
  el.setAttribute('role', 'button');
  el.setAttribute('tabindex', '0');
  el.setAttribute('aria-label', `Day ${day.day},第 ${indexInDay + 1} 站:${stop.name}`);

  const badge = document.createElement('span');
  badge.className = 'tm-marker__badge';
  badge.textContent = String(indexInDay + 1);

  const label = document.createElement('span');
  label.className = 'tm-marker__label';
  label.textContent = stop.name;

  el.appendChild(badge);
  el.appendChild(label);
  return el;
}

function createPopupContent(stop: Stop): HTMLDivElement {
  const wrap = document.createElement('div');
  wrap.className = 'tm-popup';

  const title = document.createElement('div');
  title.className = 'tm-popup__title';
  title.textContent = stop.name;
  wrap.appendChild(title);

  if (stop.note) {
    const note = document.createElement('div');
    note.className = 'tm-popup__note';
    note.textContent = stop.note;
    wrap.appendChild(note);
  }

  return wrap;
}

function collectAllCoords(data: TravelMapData): [number, number][] {
  const coords: [number, number][] = [];
  for (const day of data.days) {
    for (const stop of day.stops) coords.push(stop.coords);
    if (day.route) coords.push(...day.route);
  }
  return coords;
}

export function renderTravelMap(container: HTMLElement, data: TravelMapData): void {
  const mapEl = document.createElement('div');
  mapEl.className = 'tm-map';
  container.appendChild(mapEl);

  const map = new maplibregl.Map({
    container: mapEl,
    style: data.basemap || DEFAULT_BASEMAP_STYLE,
    center: data.center,
    zoom: data.zoom,
    cooperativeGestures: true,
  });

  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

  const markersByDay = new Map<number, maplibregl.Marker[]>();

  map.on('load', () => {
    if (!data.center || data.zoom === undefined) {
      const coords = collectAllCoords(data);
      if (coords.length > 0) {
        const bounds = coords.reduce(
          (b, c) => b.extend(c),
          new maplibregl.LngLatBounds(coords[0], coords[0]),
        );
        map.fitBounds(bounds, { padding: 48, duration: 0 });
      }
    }

    for (const day of data.days) {
      const sourceId = `tm-route-${day.day}`;
      const layerId = `tm-route-layer-${day.day}`;
      map.addSource(sourceId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: buildLineCoords(day) },
        },
      });
      map.addLayer({
        id: layerId,
        type: 'line',
        source: sourceId,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': day.color, 'line-width': 3 },
      });

      const dayMarkers: maplibregl.Marker[] = [];
      day.stops.forEach((stop, i) => {
        const el = createMarkerElement(day, stop, i);
        const marker = new maplibregl.Marker({ element: el, anchor: 'left' }).setLngLat(
          stop.coords,
        );
        if (stop.note) {
          const popup = new maplibregl.Popup({ offset: 12 }).setDOMContent(
            createPopupContent(stop),
          );
          marker.setPopup(popup);
        }
        marker.addTo(map);
        dayMarkers.push(marker);
      });
      markersByDay.set(day.day, dayMarkers);
    }

    setupLegend(container, map, data, markersByDay);
  });
}

function setupLegend(
  container: HTMLElement,
  map: maplibregl.Map,
  data: TravelMapData,
  markersByDay: Map<number, maplibregl.Marker[]>,
): void {
  const legend = document.createElement('div');
  legend.className = 'tm-legend';

  function selectDay(selected: string) {
    for (const day of data.days) {
      const visible = selected === ALL_DAYS || String(day.day) === selected;
      map.setLayoutProperty(`tm-route-layer-${day.day}`, 'visibility', visible ? 'visible' : 'none');
      for (const marker of markersByDay.get(day.day) ?? []) {
        const el = marker.getElement();
        el.style.opacity = visible ? '1' : '0.25';
        el.style.pointerEvents = visible ? 'auto' : 'none';
      }
    }
    legend.querySelectorAll<HTMLButtonElement>('.tm-legend__pill').forEach((pill) => {
      pill.setAttribute('aria-pressed', String(pill.dataset.day === selected));
    });
  }

  const allPill = document.createElement('button');
  allPill.type = 'button';
  allPill.className = 'tm-legend__pill';
  allPill.dataset.day = ALL_DAYS;
  allPill.textContent = 'All';
  allPill.setAttribute('aria-pressed', 'true');
  allPill.addEventListener('click', () => selectDay(ALL_DAYS));
  legend.appendChild(allPill);

  for (const day of data.days) {
    const pill = document.createElement('button');
    pill.type = 'button';
    pill.className = 'tm-legend__pill';
    pill.dataset.day = String(day.day);
    pill.textContent = `Day ${day.day}`;
    pill.style.setProperty('--marker-color', day.color);
    pill.setAttribute('aria-pressed', 'false');
    pill.addEventListener('click', () => selectDay(String(day.day)));
    legend.appendChild(pill);
  }

  container.appendChild(legend);
}
