import { useState, useEffect, useRef } from 'react';

const FlightTracker = ({ onClose }) => {
  const [flightInfo, setFlightInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [flightNumber, setFlightNumber] = useState('');
  const mapRef = useRef(null);
  
  // Simulate fetching flight info
  useEffect(() => {
    const fetchFlightInfo = async (flightNum) => {
      setLoading(true);
      setError(null);
      
      try {
        // In real implementation, this would call a flight tracking API
        // Here we'll simulate a response with mock data
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Parse airline code and flight number
        const airlineCode = flightNum.slice(0, 2).toUpperCase();
        const number = flightNum.slice(2);
        
        // Generate mock flight data
        const mockFlight = {
          flightNumber: `${airlineCode}${number}`,
          airline: getAirlineName(airlineCode),
          status: getRandomStatus(),
          departure: {
            airport: getRandomAirport('departure'),
            terminal: `T${Math.floor(Math.random() * 5) + 1}`,
            gate: `${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${Math.floor(Math.random() * 20) + 1}`,
            scheduledTime: getRandomTime(),
            actualTime: getRandomTime(),
            coordinates: getRandomCoordinates('departure')
          },
          arrival: {
            airport: getRandomAirport('arrival'),
            terminal: `T${Math.floor(Math.random() * 5) + 1}`,
            gate: `${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${Math.floor(Math.random() * 20) + 1}`,
            scheduledTime: getRandomTime(),
            estimatedTime: getRandomTime(),
            coordinates: getRandomCoordinates('arrival')
          },
          aircraft: {
            type: getRandomAircraft(),
            registration: `${airlineCode}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${Math.floor(Math.random() * 900) + 100}`
          },
          currentPosition: {
            coordinates: getRandomCoordinatesBetween(
              getRandomCoordinates('departure'),
              getRandomCoordinates('arrival')
            ),
            altitude: `${Math.floor(Math.random() * 380) + 300}00 ft`,
            speed: `${Math.floor(Math.random() * 400) + 400} kts`,
            heading: `${Math.floor(Math.random() * 360)}°`
          },
          flightTime: `${Math.floor(Math.random() * 10) + 1}h ${Math.floor(Math.random() * 60)}m`,
          distance: `${Math.floor(Math.random() * 5000) + 500} km`,
          completion: Math.floor(Math.random() * 100)
        };
        
        setFlightInfo(mockFlight);
        setLoading(false);
        
        // Simulate flight movement for visualization
        simulateFlightMovement(mockFlight);
        
      } catch (err) {
        console.error('Error fetching flight:', err);
        setError('Could not retrieve flight information. Please try again.');
        setLoading(false);
      }
    };
    
    if (flightNumber) {
      fetchFlightInfo(flightNumber);
    }
  }, [flightNumber]);
  
  // Handle voice commands
  useEffect(() => {
    const handleVoiceCommand = (event) => {
      if (!event.detail || !event.detail.transcript) return;
      
      const command = event.detail.transcript.toLowerCase();
      
      if (command.includes('close') || command.includes('exit')) {
        onClose();
        return;
      }
      
      // Check for flight tracking requests
      const flightMatch = command.match(/track\s+(?:flight\s+)?(([a-z]{2})\s*(\d{1,4}))/i) ||
                        command.match(/where\s+is\s+(?:flight\s+)?(([a-z]{2})\s*(\d{1,4}))/i) ||
                        command.match(/status\s+(?:of\s+)?(?:flight\s+)?(([a-z]{2})\s*(\d{1,4}))/i);
      
      if (flightMatch) {
        const airline = flightMatch[2];
        const number = flightMatch[3];
        const formatted = `${airline}${number}`.toUpperCase();
        setFlightNumber(formatted);
      }
    };

    window.addEventListener('voice-command', handleVoiceCommand);
    return () => window.removeEventListener('voice-command', handleVoiceCommand);
  }, [onClose]);
  
  // Initialize with a default flight if none is provided
  useEffect(() => {
    if (!flightNumber) {
      // Generate a random flight number
      const airlines = ['AA', 'DL', 'UA', 'BA', 'LH', 'AF', 'EK'];
      const randomAirline = airlines[Math.floor(Math.random() * airlines.length)];
      const randomNumber = Math.floor(Math.random() * 1000) + 1;
      setFlightNumber(`${randomAirline}${randomNumber}`);
    }
  }, []);
  
  // Helper function to get random airline name
  const getAirlineName = (code) => {
    const airlines = {
      'AA': 'American Airlines',
      'DL': 'Delta Air Lines',
      'UA': 'United Airlines',
      'BA': 'British Airways',
      'LH': 'Lufthansa',
      'AF': 'Air France',
      'EK': 'Emirates',
      'SQ': 'Singapore Airlines',
      'QF': 'Qantas',
      'CX': 'Cathay Pacific'
    };
    
    return airlines[code] || `${code} Airways`;
  };
  
  // Helper function to get random flight status
  const getRandomStatus = () => {
    const statuses = ['On Time', 'Delayed', 'Boarding', 'In Air', 'Landed', 'Diverted'];
    const weights = [0.4, 0.2, 0.1, 0.2, 0.05, 0.05];
    
    // Weighted random selection
    const random = Math.random();
    let sum = 0;
    for (let i = 0; i < statuses.length; i++) {
      sum += weights[i];
      if (random <= sum) return statuses[i];
    }
    
    return statuses[0];
  };
  
  // Helper function to get random airport
  const getRandomAirport = (type) => {
    const majorAirports = [
      { code: 'JFK', name: 'John F. Kennedy International Airport', city: 'New York' },
      { code: 'LAX', name: 'Los Angeles International Airport', city: 'Los Angeles' },
      { code: 'LHR', name: 'London Heathrow Airport', city: 'London' },
      { code: 'CDG', name: 'Charles de Gaulle Airport', city: 'Paris' },
      { code: 'FRA', name: 'Frankfurt Airport', city: 'Frankfurt' },
      { code: 'DXB', name: 'Dubai International Airport', city: 'Dubai' },
      { code: 'SIN', name: 'Singapore Changi Airport', city: 'Singapore' },
      { code: 'HND', name: 'Tokyo Haneda Airport', city: 'Tokyo' },
      { code: 'SYD', name: 'Sydney Airport', city: 'Sydney' },
      { code: 'AMS', name: 'Amsterdam Airport Schiphol', city: 'Amsterdam' }
    ];
    
    const randomIndex = Math.floor(Math.random() * majorAirports.length);
    const airport = majorAirports[randomIndex];
    
    return {
      code: airport.code,
      name: airport.name,
      city: airport.city
    };
  };
  
  // Helper function to get random time
  const getRandomTime = () => {
    const hours = String(Math.floor(Math.random() * 24)).padStart(2, '0');
    const minutes = String(Math.floor(Math.random() * 60)).padStart(2, '0');
    return `${hours}:${minutes}`;
  };
  
  // Helper function to get random coordinates for airports
  const getRandomCoordinates = (type) => {
    // Major airport coordinates (approximate)
    const airportCoords = {
      'departure': [
        { lat: 40.6413, lng: -73.7781 },  // JFK
        { lat: 33.9416, lng: -118.4085 }, // LAX
        { lat: 51.4700, lng: -0.4543 },   // LHR
        { lat: 49.0097, lng: 2.5479 },    // CDG
        { lat: 50.0379, lng: 8.5622 }     // FRA
      ],
      'arrival': [
        { lat: 25.2528, lng: 55.3644 },   // DXB
        { lat: 1.3644, lng: 103.9915 },   // SIN
        { lat: 35.5494, lng: 139.7798 },  // HND
        { lat: -33.9399, lng: 151.1753 }, // SYD
        { lat: 52.3105, lng: 4.7683 }     // AMS
      ]
    };
    
    const randomIndex = Math.floor(Math.random() * airportCoords[type].length);
    return airportCoords[type][randomIndex];
  };
  
  // Helper function to get random aircraft type
  const getRandomAircraft = () => {
    const aircraft = ['Boeing 737-800', 'Boeing 787-9', 'Airbus A320', 'Airbus A350-900', 'Boeing 777-300ER'];
    return aircraft[Math.floor(Math.random() * aircraft.length)];
  };
  
  // Helper function to get random coordinates between departure and arrival
  const getRandomCoordinatesBetween = (dep, arr) => {
    // Simple linear interpolation with some randomness
    const progress = Math.random();
    const lat = dep.lat + (arr.lat - dep.lat) * progress;
    const lng = dep.lng + (arr.lng - dep.lng) * progress;
    
    // Add some randomness to the flight path
    const randomFactor = 0.05;
    return {
      lat: lat + (Math.random() * randomFactor * 2 - randomFactor),
      lng: lng + (Math.random() * randomFactor * 2 - randomFactor)
    };
  };
  
  // Simulate flight movement - in a real app this would use actual flight path data
  const simulateFlightMovement = (flight) => {
    // This would be replaced by real API data in a production app
    console.log('Flight simulation started for', flight.flightNumber);
  };

  if (loading) {
    return (
      <div className="module-overlay">
        <div className="flight-container loading">
          <button className="close-button" onClick={onClose}>✕</button>
          <div className="loading-indicator">
            <div className="loading-spinner"></div>
            <p>Tracking flight {flightNumber}...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="module-overlay">
        <div className="flight-container error">
          <button className="close-button" onClick={onClose}>✕</button>
          <div className="error-message">
            <p>{error}</p>
            <p>Try asking for another flight.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="module-overlay">
      <div className="flight-container">
        <button className="close-button" onClick={onClose}>✕</button>
        
        <div className="flight-header">
          <div className="flight-number-info">
            <h2>{flightInfo?.flightNumber}</h2>
            <p className="airline-name">{flightInfo?.airline}</p>
          </div>
          <div className={`flight-status ${flightInfo?.status.toLowerCase().replace(' ', '-')}`}>
            {flightInfo?.status}
          </div>
        </div>
        
        <div className="flight-map-container">
          <div className="flight-map" ref={mapRef}>
            {/* In a real implementation, this would be a map component */}
            <div className="map-placeholder">
              <div className="map-overlay">
                <div className="flight-path">
                  <div className="departure-point" 
                    style={{ 
                      left: '20%', 
                      top: '40%' 
                    }}
                  ></div>
                  <div className="arrival-point" 
                    style={{ 
                      left: '70%', 
                      top: '45%' 
                    }}
                  ></div>
                  <div className="flight-position" 
                    style={{ 
                      left: `${20 + (70-20) * flightInfo.completion/100}%`, 
                      top: `${40 + (45-40) * flightInfo.completion/100}%` 
                    }}
                  >✈️</div>
                </div>
                <div className="departure-label" style={{ left: '20%', top: '45%' }}>
                  {flightInfo?.departure.airport.code}
                </div>
                <div className="arrival-label" style={{ left: '70%', top: '50%' }}>
                  {flightInfo?.arrival.airport.code}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flight-details">
          <div className="flight-route">
            <div className="departure-details">
              <h3>Departure</h3>
              <div className="airport-code">{flightInfo?.departure.airport.code}</div>
              <div className="airport-name">{flightInfo?.departure.airport.name}</div>
              <div className="airport-city">{flightInfo?.departure.airport.city}</div>
              <div className="time-info">
                <span className="time">{flightInfo?.departure.actualTime}</span>
                <span className="terminal-gate">T{flightInfo?.departure.terminal} • Gate {flightInfo?.departure.gate}</span>
              </div>
            </div>
            
            <div className="flight-info-center">
              <div className="flight-time">{flightInfo?.flightTime}</div>
              <div className="flight-distance">{flightInfo?.distance}</div>
              <div className="progress-bar-container">
                <div 
                  className="progress-bar" 
                  style={{ width: `${flightInfo?.completion || 0}%` }}
                ></div>
              </div>
            </div>
            
            <div className="arrival-details">
              <h3>Arrival</h3>
              <div className="airport-code">{flightInfo?.arrival.airport.code}</div>
              <div className="airport-name">{flightInfo?.arrival.airport.name}</div>
              <div className="airport-city">{flightInfo?.arrival.airport.city}</div>
              <div className="time-info">
                <span className="time">{flightInfo?.arrival.estimatedTime}</span>
                <span className="terminal-gate">T{flightInfo?.arrival.terminal} • Gate {flightInfo?.arrival.gate}</span>
              </div>
            </div>
          </div>
          
          <div className="flight-position-info">
            <h3>Current Position</h3>
            <div className="position-grid">
              <div className="position-item">
                <span className="label">Altitude</span>
                <span className="value">{flightInfo?.currentPosition.altitude}</span>
              </div>
              <div className="position-item">
                <span className="label">Speed</span>
                <span className="value">{flightInfo?.currentPosition.speed}</span>
              </div>
              <div className="position-item">
                <span className="label">Heading</span>
                <span className="value">{flightInfo?.currentPosition.heading}</span>
              </div>
              <div className="position-item">
                <span className="label">Aircraft</span>
                <span className="value">{flightInfo?.aircraft.type}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="voice-commands">
          <p>Voice commands:</p>
          <ul>
            <li>"Track flight [airline code][number]"</li>
            <li>"Where is flight [airline code][number]"</li>
            <li>"Close tracker"</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default FlightTracker; 