import { useState, useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import "./App.css";
import "leaflet/dist/leaflet.css";
import { Icon, divIcon, point } from "leaflet";
import placeholderImg from "../public/img/placeholder.png";
import MarkerClusterGroup from "react-leaflet-cluster";
import "leaflet.locatecontrol";
import "leaflet.locatecontrol/dist/L.Control.Locate.css";

// create custom icon
const customIcon = new Icon({
  iconUrl: placeholderImg,
  iconSize: [38, 38], // size of the icon
});

// custom cluster icon
const createClusterCustomIcon = function (cluster) {
  return new divIcon({
    html: `<span class="cluster-icon">${cluster.getChildCount()}</span>`,
    className: "custom-marker-cluster",
    iconSize: point(33, 33, true),
  });
};

function LocateControl({ setPosition, setLocationEnabled }) {
  const map = useMap();

  useEffect(() => {
    const locateControl = L.control.locate({
      position: 'topright',
      strings: {
        title: "Show me where I am",
      },
      flyTo: true,
      setView: "once",
      locateOptions: {
        maxZoom: 16,
      },
    });

    locateControl.addTo(map);

    map.on("locationfound", (e) => {
      setPosition([e.latitude, e.longitude]);
      setLocationEnabled(true); // Set locationEnabled to true when location is found
    });

    return () => {
      map.removeControl(locateControl);
    };
  }, [map, setPosition, setLocationEnabled]);

  return null;
}

// Function to calculate distance using Haversine formula
function haversineDistance(coords1, coords2) {
  const toRad = (x) => (x * Math.PI) / 180;

  const lat1 = coords1[0];
  const lon1 = coords1[1];
  const lat2 = coords2[0];
  const lon2 = coords2[1];

  const R = 6371; // Radius of the Earth in km

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const d = R * c; // Distance in km

  return d;
}

function ZoomToMarker({ geocode }) {
  const map = useMap();

  useEffect(() => {
    if (geocode) {
      map.setView(geocode, 16); // Zoom to the marker position with zoom level 16
    }
  }, [geocode, map]);

  return null;
}

function App() {
  const [position, setPosition] = useState([0, 0]); // Default position
  const [distances, setDistances] = useState([]);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [zoomTarget, setZoomTarget] = useState(null);
  const [nearestMarker, setNearestMarker] = useState(null);
  const [markers, setMarkers] = useState([]);

  const BASE_URL = `${import.meta.env.VITE_CYBER_API_BASE_URL}/api`;

  useEffect(() => {
    fetch(`${BASE_URL}/cybers`, {
      method: 'GET',
    })
      .then(response => response.json())
      .then(data => {
        setMarkers(data);
      })
      .catch(error => {
        console.error("Error fetching the markers:", error);
      });
  }, [BASE_URL]);

  
  useEffect(() => {
    const newDistances = markers.map((marker) => ({
      ...marker,
      geocode: [marker.latitude, marker.longitude], // Assuming latitude and longitude fields in the API response
      distance: locationEnabled ? haversineDistance(position, [marker.latitude, marker.longitude]) : 0,
    }));

    setDistances(newDistances);

    if (locationEnabled) {
      const nearest = newDistances.reduce((prev, curr) => (prev.distance < curr.distance ? prev : curr));
      setNearestMarker(nearest);
    } else {
      setNearestMarker(null);
    }
  }, [position, locationEnabled, markers]);

  return (
    <div className="container-final">
      <MapContainer center={position} zoom={2} scrollWheelZoom={false} style={{ height: '500px', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocateControl setPosition={setPosition} setLocationEnabled={setLocationEnabled} />
        <ZoomToMarker geocode={zoomTarget} />
        <MarkerClusterGroup chunkedLoading iconCreateFunction={createClusterCustomIcon}>
          {markers.map((marker) => (
            <Marker key={marker.id} position={[marker.latitude, marker.longitude]} icon={customIcon}>
              <Popup>
                <div>
                  <strong>{marker.name}</strong>
                  <br />
                  Address: {marker.address}
                  <br />
                  Printers: {marker.printers}
                </div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>

      <div className="recap">
        <h2 className="titre">Distances par rapport à votre position</h2>
        {nearestMarker && (
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            Le lieu le plus proche est : {nearestMarker.name}, à {nearestMarker.distance.toFixed(2)} km
          </div>
        )}
        <table className="table" style={{ margin: '0 auto', textAlign: 'center' }}>
          <thead>
            <tr>
              <th>Marker ID</th>
              <th>Name</th>
              <th>Distance (km)</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {distances.map((marker) => (
              <tr key={marker.id}>
                <td>{marker.id}</td>
                <td>{marker.name}</td>
                <td>{marker.distance.toFixed(2)}</td>
                <td>
                  <button onClick={() => setZoomTarget([marker.latitude, marker.longitude])} style={{ cursor: "pointer" }}>
                    Zoom
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;
