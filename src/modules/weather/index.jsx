import { useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { speak } from "../../hooks/useTTS";

const WeatherModule = forwardRef((props, ref) => {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [location, setLocation] = useState("");

  useEffect(() => {
    loadWeatherData();
  }, []);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    handleVoiceCommand: async (command) => {
      const text = command.toLowerCase().trim();
      
      if (text.includes('refresh') || text.includes('update')) {
        loadWeatherData();
        return true;
      }
      
      if (text.includes('forecast') || text.includes('tomorrow')) {
        speak("I'm showing current weather only. For detailed forecasts, try a weather app.");
        return true;
      }

      return false; // Command not handled
    }
  }));

  const loadWeatherData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get user's location preference
      const prefs = JSON.parse(localStorage.getItem("phantomui_preferences") || "{}");
      const homeLocation = prefs.homeLocation || "New York";
      setLocation(homeLocation);

      // Get coordinates for the city (using a simple geocoding service)
      const geoResponse = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(homeLocation)}&count=1&language=en&format=json`
      );
      
      if (!geoResponse.ok) {
        throw new Error('Failed to find location');
      }

      const geoData = await geoResponse.json();
      
      if (!geoData.results || geoData.results.length === 0) {
        throw new Error('Location not found');
      }

      const { latitude, longitude, name, country } = geoData.results[0];

      // Get weather data
      const weatherResponse = await fetch(
        `https://api.open-meteo.com/v1/current?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=auto`
      );

      if (!weatherResponse.ok) {
        throw new Error('Failed to fetch weather data');
      }

      const weatherData = await weatherResponse.json();
      const current = weatherData.current;

      const weatherInfo = {
        location: `${name}, ${country}`,
        temperature: Math.round(current.temperature_2m),
        feelsLike: Math.round(current.apparent_temperature),
        humidity: current.relative_humidity_2m,
        windSpeed: Math.round(current.wind_speed_10m),
        weatherCode: current.weather_code,
        unit: weatherData.current_units.temperature_2m
      };

      setWeather(weatherInfo);
      
      // Speak the weather info
      const tempText = `It's ${weatherInfo.temperature} degrees ${weatherInfo.unit === '°C' ? 'Celsius' : 'Fahrenheit'} in ${weatherInfo.location}.`;
      const feelsLikeText = weatherInfo.feelsLike !== weatherInfo.temperature 
        ? ` Feels like ${weatherInfo.feelsLike} degrees.` 
        : '';
      const conditionText = getWeatherDescription(weatherInfo.weatherCode);
      
      speak(tempText + feelsLikeText + conditionText);

    } catch (err) {
      console.error('Weather error:', err);
      setError(err.message);
      speak(`Sorry, I couldn't get weather information. ${err.message}`);
    } finally {
      setLoading(false);
    }
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

  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={loadingStyle}>
          <div style={spinnerStyle}>🌍</div>
          <div>Getting weather data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={containerStyle}>
        <div style={errorStyle}>
          <div style={iconStyle}>❌</div>
          <div>Weather Unavailable</div>
          <div style={errorMessageStyle}>{error}</div>
          <button style={retryButtonStyle} onClick={loadWeatherData}>
            Try Again
          </button>
        </div>
        <button style={closeButtonStyle} onClick={props.onClose}>
          ✕ Close
        </button>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h2 style={titleStyle}>🌤️ Weather</h2>
        <div style={locationStyle}>{weather.location}</div>
      </div>

      <div style={mainWeatherStyle}>
        <div style={iconStyle}>
          {getWeatherIcon(weather.weatherCode)}
        </div>
        <div style={temperatureStyle}>
          {weather.temperature}°{weather.unit === '°C' ? 'C' : 'F'}
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
        <div style={commandsStyle}>• "Refresh" to update weather</div>
        <div style={commandsStyle}>• "Close" to return to main screen</div>
      </div>

      <button style={closeButtonStyle} onClick={props.onClose}>
        ✕ Close
      </button>
    </div>
  );
});

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

const mainWeatherStyle = {
  marginBottom: 30,
};

const iconStyle = {
  fontSize: 80,
  marginBottom: 20,
};

const temperatureStyle = {
  fontSize: 48,
  fontWeight: 200,
  marginBottom: 10,
};

const feelsLikeStyle = {
  fontSize: 16,
  opacity: 0.7,
};

const detailsStyle = {
  display: 'flex',
  justifyContent: 'space-around',
  marginBottom: 30,
  padding: '20px 0',
  borderTop: '1px solid rgba(255, 255, 255, 0.2)',
  borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
};

const detailItemStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 5,
};

const detailLabelStyle = {
  fontSize: 14,
  opacity: 0.7,
};

const detailValueStyle = {
  fontSize: 18,
  fontWeight: 500,
};

const loadingStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 20,
  padding: 40,
};

const spinnerStyle = {
  fontSize: 40,
  animation: 'spin 2s linear infinite',
};

const errorStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 15,
  padding: 40,
};

const errorMessageStyle = {
  fontSize: 14,
  opacity: 0.7,
  marginBottom: 10,
};

const retryButtonStyle = {
  background: 'rgba(255, 255, 255, 0.2)',
  border: 'none',
  color: '#fff',
  padding: '10px 20px',
  borderRadius: 10,
  cursor: 'pointer',
  fontSize: 14,
};

const instructionsStyle = {
  textAlign: 'left',
  fontSize: 14,
  opacity: 0.8,
  marginBottom: 20,
};

const commandsStyle = {
  marginLeft: 10,
  marginTop: 5,
};

const closeButtonStyle = {
  position: 'absolute',
  top: 15,
  right: 15,
  background: 'rgba(255, 255, 255, 0.1)',
  border: 'none',
  color: '#fff',
  padding: '8px 12px',
  borderRadius: 20,
  cursor: 'pointer',
  fontSize: 14,
};

export default WeatherModule;
