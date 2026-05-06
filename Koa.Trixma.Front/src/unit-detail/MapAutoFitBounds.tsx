import React, {useEffect} from "react";
import {useMap} from "react-leaflet";

interface MapAutoFitBoundsProps {
  positions: [number, number][];
}

const MapAutoFitBounds: React.FC<MapAutoFitBoundsProps> = ({positions}) => {
  const map = useMap();

  useEffect(() => {
    if (positions.length === 0) return;
    if (positions.length === 1) {
      map.setView(positions[0], 16);
      return;
    }
    map.fitBounds(positions, {padding: [24, 24]});
  }, [map, positions]);

  return null;
};

export default MapAutoFitBounds;
