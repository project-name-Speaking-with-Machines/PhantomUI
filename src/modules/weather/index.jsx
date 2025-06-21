import { useEffect, useState } from "react";

const WeatherModule = ({ onClose }) => {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [location, setLocation] = useState("");
  const [searchLocation, setSearchLocation] = useState("");

  useEffect(() => {
    // Check URL parameters for location
    const urlParams = new URLSearchParams(window.location.search);
    const locationParam = urlParams.get('location');
    
    if (locationParam) {
      console.log(`Found location in URL: ${locationParam}`);
      setSearchLocation(locationParam);
    } else {
      // Get user's location preference or use default
      const prefs = JSON.parse(localStorage.getItem("phantomui_preferences") || "{}");
      const homeLocation = prefs.homeLocation || "New York";
      setSearchLocation(homeLocation);
    }
  }, []);

  // Watch for changes to searchLocation and load weather data
  useEffect(() => {
    if (searchLocation) {
      loadWeatherData(searchLocation);
    }
  }, [searchLocation]);

  // Listen for voice commands
  useEffect(() => {
    const handleVoiceCommand = (event) => {
      if (!event.detail || !event.detail.transcript) return;
      
      const command = event.detail.transcript.toLowerCase();
      console.log(`Weather module received voice command: ${command}`);
      
      if (command.includes('close') || command.includes('exit')) {
        onClose();
        return;
      }
      
      // Check for location requests
      const locationMatch = command.match(/weather (in|at|for) ([a-zA-Z\s]+)/i) ||
                           command.match(/what('s| is) the weather (in|at|for) ([a-zA-Z\s]+)/i) ||
                           command.match(/how('s| is) the weather (in|at|for) ([a-zA-Z\s]+)/i);
      
      if (locationMatch) {
        // Extract the location from the regex match
        const locationIndex = locationMatch.length - 1;
        const newLocation = locationMatch[locationIndex].trim();
        console.log(`Weather module extracted location: ${newLocation}`);
        
        if (newLocation && newLocation.toLowerCase() !== searchLocation.toLowerCase()) {
          setSearchLocation(newLocation);
          
          // Update URL parameter
          const url = new URL(window.location.href);
          url.searchParams.set('location', newLocation);
          window.history.replaceState({}, '', url);
        }
      } else if (command.includes('refresh') || command.includes('update')) {
        loadWeatherData(searchLocation);
      }
    };

    window.addEventListener('voice-command', handleVoiceCommand);
    return () => window.removeEventListener('voice-command', handleVoiceCommand);
  }, [onClose, searchLocation]);

  const loadWeatherData = async (query) => {
    if (!query) return;
    
    setLoading(true);
    setError(null);

    try {
      console.log(`Fetching weather for location: ${query}`);
      setLocation(query);

      // Use WeatherAPI.com API instead of Open-Meteo
      const apiKey = "9c92e2b2e9be4d7b9e3152430232506"; // Real WeatherAPI.com free API key
      const weatherResponse = await fetch(
        `https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${encodeURIComponent(query)}&aqi=no`
      );

      if (!weatherResponse.ok) {
        throw new Error('Failed to fetch weather data');
      }

      const weatherData = await weatherResponse.json();
      
      // Map WeatherAPI.com data to our weather info format
      const weatherInfo = {
        location: `${weatherData.location.name}, ${weatherData.location.country}`,
        temperature: Math.round(weatherData.current.temp_c),
        feelsLike: Math.round(weatherData.current.feelslike_c),
        humidity: weatherData.current.humidity,
        windSpeed: Math.round(weatherData.current.wind_kph),
        weatherCode: mapWeatherCode(weatherData.current.condition.code),
        weatherText: weatherData.current.condition.text,
        weatherIcon: weatherData.current.condition.icon,
        unit: "°C"
      };

      setWeather(weatherInfo);
      
      // Speak the weather info
      const tempText = `It's ${weatherInfo.temperature} degrees Celsius in ${weatherInfo.location}.`;
      const feelsLikeText = weatherInfo.feelsLike !== weatherInfo.temperature 
        ? ` Feels like ${weatherInfo.feelsLike} degrees.` 
        : '';
      const conditionText = weatherInfo.weatherText;
      
      // Removed speak function call

    } catch (err) {
      console.error('Weather error:', err);
      setError(err.message);
      // Removed speak function call
    } finally {
      setLoading(false);
    }
  };

  // Map WeatherAPI.com condition codes to our weather codes
  const mapWeatherCode = (code) => {
    // Clear/Sunny
    if ([1000].includes(code)) return 0;
    // Partly cloudy
    if ([1003].includes(code)) return 2;
    // Cloudy/Overcast
    if ([1006, 1009].includes(code)) return 3;
    // Fog/Mist
    if ([1030, 1135, 1147].includes(code)) return 45;
    // Drizzle
    if ([1150, 1153, 1168, 1171].includes(code)) return 51;
    // Rain
    if ([1180, 1183, 1186, 1189, 1192, 1195, 1240, 1243, 1246].includes(code)) return 61;
    // Snow
    if ([1066, 1114, 1117, 1210, 1213, 1216, 1219, 1222, 1225, 1255, 1258].includes(code)) return 71;
    // Thunderstorm
    if ([1087, 1273, 1276, 1279, 1282].includes(code)) return 95;
    
    return 3; // Default to overcast
  };

  const getWeatherDescription = (code) => {
    const weatherCodes = {
      0: " Clear skies.",
      1: " Mainly clear.",
      2: " Partly cloudy.",
      3: " Overcast.",
      45: " Foggy conditions.",
      48: " Depositing rime fog.",
      51: " Light drizzle.",
      53: " Moderate drizzle.",
      55: " Dense drizzle.",
      61: " Slight rain.",
      63: " Moderate rain.",
      65: " Heavy rain.",
      71: " Slight snow fall.",
      73: " Moderate snow fall.",
      75: " Heavy snow fall.",
      95: " Thunderstorm.",
      96: " Thunderstorm with slight hail.",
      99: " Thunderstorm with heavy hail."
    };
    
    return weatherCodes[code] || " Current conditions.";
  };

  const getWeatherIcon = (code) => {
    if (code === 0 || code === 1) return "☀️";
    if (code === 2 || code === 3) return "⛅";
    if (code >= 45 && code <= 48) return "🌫️";
    if (code >= 51 && code <= 55) return "🌦️";
    if (code >= 61 && code <= 65) return "🌧️";
    if (code >= 71 && code <= 75) return "❄️";
    if (code >= 95) return "⛈️";
    return "🌤️";
  };

  // Handle search form submission
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const input = e.target.elements.locationSearch.value.trim();
    if (input) {
      setSearchLocation(input);
      
      // Update URL parameter
      const url = new URL(window.location.href);
      url.searchParams.set('location', input);
      window.history.replaceState({}, '', url);
    }
  };

  if (loading) {
    return (
      <div className="module-overlay">
        <div style={containerStyle}>
          <div style={loadingStyle}>
            <div style={spinnerStyle}>🌍</div>
            <div>Getting weather data{searchLocation ? ` for ${searchLocation}` : ''}...</div>
          </div>
          <button style={closeButtonStyle} onClick={onClose}>✕</button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="module-overlay">
        <div style={containerStyle}>
          <div style={errorStyle}>
            <div style={iconStyle}>❌</div>
            <div>Weather Unavailable</div>
            <div style={errorMessageStyle}>{error}</div>
            
            <form onSubmit={handleSearchSubmit} style={searchFormStyle}>
              <input
                type="text"
                name="locationSearch"
                placeholder="Try another location..."
                style={searchInputStyle}
              />
              <button type="submit" style={searchButtonStyle}>
                Search
              </button>
            </form>
            
            <button style={retryButtonStyle} onClick={() => loadWeatherData(searchLocation)}>
              Try Again
            </button>
          </div>
          <button style={closeButtonStyle} onClick={onClose}>
            ✕ Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="module-overlay">
      <div style={containerStyle}>
        <div style={headerStyle}>
          <h2 style={titleStyle}>🌤️ Weather</h2>
          <div style={locationStyle}>{weather.location}</div>
          
          <form onSubmit={handleSearchSubmit} style={searchFormStyle}>
            <input
              type="text"
              name="locationSearch"
              placeholder="Search location..."
              style={searchInputStyle}
            />
            <button type="submit" style={searchButtonStyle}>
              Search
            </button>
          </form>
        </div>

        <div style={mainWeatherStyle}>
          <div style={iconStyle}>
            {weather.weatherIcon ? 
              <img src={`https:${weather.weatherIcon}`} alt={weather.weatherText} style={weatherIconImgStyle} /> : 
              getWeatherIcon(weather.weatherCode)
            }
          </div>
          <div style={temperatureStyle}>
            {weather.temperature}°{weather.unit === '°C' ? 'C' : 'F'}
          </div>
          <div style={weatherTextStyle}>
            {weather.weatherText}
          </div>
          {weather.feelsLike !== weather.temperature && (
            <div style={feelsLikeStyle}>
              Feels like {weather.feelsLike}°
            </div>
          )}
        </div>

        <div style={detailsStyle}>
          <div style={detailItemStyle}>
            <span style={detailLabelStyle}>Humidity</span>
            <span style={detailValueStyle}>{weather.humidity}%</span>
          </div>
          <div style={detailItemStyle}>
            <span style={detailLabelStyle}>Wind</span>
            <span style={detailValueStyle}>{weather.windSpeed} km/h</span>
          </div>
        </div>

        <div style={instructionsStyle}>
          <div>🎤 Voice Commands:</div>
          <div style={commandsStyle}>• "Weather in [location]" to check other locations</div>
          <div style={commandsStyle}>• "Refresh" to update weather</div>
          <div style={commandsStyle}>• "Close" to return to main screen</div>
        </div>

        <button style={closeButtonStyle} onClick={onClose}>
          ✕ Close
        </button>
      </div>
    </div>
  );
};

const containerStyle = {
  background: 'rgba(20, 20, 50, 0.95)',
  backdropFilter: 'blur(20px)',
  padding: 30,
  borderRadius: 20,
  color: '#fff',
  textAlign: 'center',
  maxWidth: 400,
  width: '90%',
  position: 'relative',
};

const headerStyle = {
  marginBottom: 30,
};

const titleStyle = {
  margin: 0,
  fontSize: 32,
  fontWeight: 300,
};

const locationStyle = {
  marginTop: 10,
  fontSize: 16,
  opacity: 0.8,
};

const searchFormStyle = {
  marginTop: 20,
  display: 'flex',
  justifyContent: 'center',
};

const searchInputStyle = {
  padding: '8px 12px',
  borderRadius: 20,
  border: 'none',
  backgroundColor: 'rgba(255, 255, 255, 0.2)',
  color: 'white',
  flex: 1,
  marginRight: 5,
  outline: 'none',
};

const searchButtonStyle = {
  padding: '8px 15px',
  borderRadius: 20,
  border: 'none',
  backgroundColor: 'rgba(255, 255, 255, 0.3)',
  color: 'white',
  cursor: 'pointer',
};

const mainWeatherStyle = {
  marginBottom: 30,
};

const iconStyle = {
  fontSize: 64,
  marginBottom: 10,
};

const weatherIconImgStyle = {
  width: 64,
  height: 64,
};

const weatherTextStyle = {
  fontSize: 18,
  opacity: 0.9,
  marginBottom: 5,
};

const temperatureStyle = {
  fontSize: 48,
  fontWeight: 300,
};

const feelsLikeStyle = {
  fontSize: 16,
  opacity: 0.7,
};

const detailsStyle = {
  display: 'flex',
  justifyContent: 'space-around',
  marginBottom: 30,
};

const detailItemStyle = {
  display: 'flex',
  flexDirection: 'column',
};

const detailLabelStyle = {
  fontSize: 14,
  opacity: 0.7,
  marginBottom: 5,
};

const detailValueStyle = {
  fontSize: 18,
};

const instructionsStyle = {
  marginBottom: 20,
  fontSize: 14,
  textAlign: 'left',
};

const commandsStyle = {
  marginLeft: 20,
  marginTop: 5,
  opacity: 0.8,
};

const closeButtonStyle = {
  position: 'absolute',
  top: 15,
  right: 15,
  background: 'none',
  border: 'none',
  color: 'white',
  fontSize: 18,
  cursor: 'pointer',
  opacity: 0.7,
};

const loadingStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: 200,
};

const spinnerStyle = {
  fontSize: 40,
  marginBottom: 20,
  animation: 'spin 2s linear infinite',
};

const errorStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 20,
};

const errorMessageStyle = {
  margin: '20px 0',
  opacity: 0.8,
};

const retryButtonStyle = {
  marginTop: 20,
  padding: '10px 20px',
  borderRadius: 20,
  border: 'none',
  backgroundColor: 'rgba(255, 255, 255, 0.3)',
  color: 'white',
  cursor: 'pointer',
};

export default WeatherModule;
