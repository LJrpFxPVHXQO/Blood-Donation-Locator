import { useState } from 'react';
import './locator.css';

const cities = [
  { name: 'Quezon City', detail: 'East Avenue Medical Center, National Kidney and Transplant Institute' },
  { name: 'Manila', detail: 'Philippine General Hospital, Manila Doctors Hospital' },
  { name: 'Caloocan City', detail: 'Caloocan City Medical Center' },
  { name: 'Makati', detail: 'Makati Medical Center' },
  { name: 'Pasay City', detail: 'San Juan De Dios Hospital' },
  { name: 'Rizal Main', detail: 'Rizal Medical Center, Pasig' },
  { name: 'Muntinlupa', detail: 'Ospital ng Muntinlupa' },
];

const regions = ['National Capital Region'];

export default function Locator() {
  const [region, setRegion] = useState(regions[0]);
  const [selectedCity, setSelectedCity] = useState('');
  const [expandedCity, setExpandedCity] = useState('');

  return (
    <main className="locator-page">
      <button className="locator-search-button" type="button" onClick={() => setExpandedCity('')}>
        Find Available Location
      </button>
      <section className="locator-panel" aria-labelledby="locator-heading">
        <h1 id="locator-heading">{region}</h1>
        <div className="locator-city-list">
          {cities.map((city) => (
            <div className="locator-city" key={city.name}>
              <button
                type="button"
                className={`locator-city-select${selectedCity === city.name ? ' is-selected' : ''}`}
                aria-expanded={expandedCity === city.name}
                onClick={() => {
                  setSelectedCity(city.name);
                  setExpandedCity(expandedCity === city.name ? '' : city.name);
                }}
              >
                <span>{city.name}</span>
                <span className="locator-chevron" aria-hidden="true">⌄</span>
              </button>
              {expandedCity === city.name && (
                <div className="locator-city-details">
                  <strong>{city.name}</strong>
                  <span>{city.detail}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
