import { useEffect, useMemo, useState } from 'react';
import { Layers3, LocateFixed, Minus, Plus } from 'lucide-react';
import { MapContainer, Polygon, TileLayer, Tooltip, useMap, WMSTileLayer } from 'react-leaflet';
import { latLngBounds, type LatLngExpression, type PathOptions } from 'leaflet';
import type { Parcel } from '../types';
import { getFarmMapWmsUrl, loadFarmMapConfig, type FarmMapConfig } from '../lib/farmMap';

interface FarmMapViewProps {
  parcels: Parcel[];
  selectedId?: string | null;
  onSelect: (parcel: Parcel) => void;
  className?: string;
}

const statusStyles: Record<string, PathOptions> = {
  pending: { color: '#7f8c85', fillColor: '#94a39b', fillOpacity: 0.38, weight: 1.5 },
  assigned: { color: '#5d7f9f', fillColor: '#78a3c5', fillOpacity: 0.48, weight: 1.5 },
  in_progress: { color: '#ba761c', fillColor: '#e3a240', fillOpacity: 0.52, weight: 1.7 },
  needs_review: { color: '#72569d', fillColor: '#9d83c4', fillOpacity: 0.52, weight: 1.7 },
  completed: { color: '#286c4a', fillColor: '#4c9b6e', fillOpacity: 0.54, weight: 1.7 },
};

function MapActions() {
  const map = useMap();

  return (
    <div className="map-actions leaflet-top leaflet-right">
      <div className="leaflet-control map-action-stack">
        <button title="내 위치" onClick={() => map.locate({ setView: true, maxZoom: 17 })}><LocateFixed size={17} /></button>
        <button title="확대" onClick={() => map.zoomIn()}><Plus size={17} /></button>
        <button title="축소" onClick={() => map.zoomOut()}><Minus size={17} /></button>
      </div>
    </div>
  );
}

function FitBounds({ parcels, selectedId }: { parcels: Parcel[]; selectedId?: string | null }) {
  const map = useMap();

  useEffect(() => {
    const selected = selectedId ? parcels.find((parcel) => parcel.id === selectedId) : undefined;
    const targetParcels = selected ? [selected] : parcels;
    const points = targetParcels.flatMap((parcel) => parcel.coordinates.map((point) => [point.lat, point.lng] as [number, number]));
    if (points.length) map.fitBounds(latLngBounds(points), { padding: [44, 44], maxZoom: 16 });
  }, [map, parcels, selectedId]);

  return null;
}

export function FarmMapView({ parcels, selectedId, onSelect, className = '' }: FarmMapViewProps) {
  const [config, setConfig] = useState<FarmMapConfig>(() => loadFarmMapConfig());
  const [baseLayer, setBaseLayer] = useState<'map' | 'imagery'>('map');
  const [layerMenu, setLayerMenu] = useState(false);
  const center = useMemo<LatLngExpression>(() => {
    const first = parcels[0]?.coordinates?.[0];
    return first ? [first.lat, first.lng] : [36.4968, 127.2626];
  }, [parcels]);

  useEffect(() => {
    const onChange = (event: Event) => setConfig((event as CustomEvent<FarmMapConfig>).detail);
    window.addEventListener('farmmap-config-changed', onChange);
    return () => window.removeEventListener('farmmap-config-changed', onChange);
  }, []);

  return (
    <div className={`farm-map ${className}`}>
      <MapContainer center={center} zoom={14} zoomControl={false} attributionControl={false}>
        {baseLayer === 'map' ? (
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="© OpenStreetMap contributors"
          />
        ) : (
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution="Tiles © Esri"
          />
        )}
        {config.enabled && config.apiKey && (
          <WMSTileLayer
            url={getFarmMapWmsUrl(config)}
            layers="farm_map_api"
            format="image/png"
            transparent
          />
        )}
        {parcels.map((parcel) => {
          const selected = parcel.id === selectedId;
          const style = statusStyles[parcel.status] ?? statusStyles.pending;
          return (
            <Polygon
              key={parcel.id}
              positions={parcel.coordinates.map((point) => [point.lat, point.lng] as LatLngExpression)}
              pathOptions={selected ? { ...style, color: '#10291f', weight: 3.5, fillOpacity: 0.7 } : style}
              eventHandlers={{ click: () => onSelect(parcel) }}
            >
              <Tooltip sticky direction="top" opacity={0.96} className="parcel-tooltip">
                <strong>{parcel.address.split(' ').slice(-2).join(' ')}</strong>
                <span>{parcel.category} · {parcel.areaM2.toLocaleString()}㎡</span>
              </Tooltip>
            </Polygon>
          );
        })}
        <FitBounds parcels={parcels} selectedId={selectedId} />
        <MapActions />
      </MapContainer>

      <div className="map-layer-control">
        <button className={layerMenu ? 'active' : ''} onClick={() => setLayerMenu(!layerMenu)}>
          <Layers3 size={17} /> 레이어
        </button>
        {layerMenu && (
          <div className="layer-popover">
            <strong>배경 지도</strong>
            <div className="segmented compact">
              <button className={baseLayer === 'map' ? 'active' : ''} onClick={() => setBaseLayer('map')}>일반</button>
              <button className={baseLayer === 'imagery' ? 'active' : ''} onClick={() => setBaseLayer('imagery')}>항공</button>
            </div>
            <div className="layer-row">
              <span><i className="legend-swatch farmmap" />팜맵 {config.sourceYear}</span>
              <b className={config.enabled && config.apiKey ? 'connected' : 'demo'}>{config.enabled && config.apiKey ? '연결됨' : '데모'}</b>
            </div>
            <div className="layer-row"><span><i className="legend-line cadastral" />지적 경계</span><b className="demo">예시</b></div>
            <div className="layer-row"><span><i className="legend-swatch survey" />조사 상태</span><b className="connected">표시</b></div>
          </div>
        )}
      </div>

      <div className="map-attribution">지도 © OpenStreetMap · 조사 경계는 데모 자료</div>
    </div>
  );
}
