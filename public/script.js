(() => {
  "use strict";

  // Elements
  const statusEl = document.getElementById("status");
  const locBtn = document.getElementById("loc-btn");
  const sourceLink = document.getElementById("source-link");
  const locationEl = document.getElementById("location");
  const timeEl = document.getElementById("time");
  const tempEl = document.getElementById("temperature");
  const condEl = document.getElementById("conditions");
  const iconEl = document.getElementById("icon");
  const feelsEl = document.getElementById("feels");
  const humidityEl = document.getElementById("humidity");
  const windEl = document.getElementById("wind");

  const form = document.getElementById("search-form");
  const input = document.getElementById("city-input");
  const forecastEl = document.getElementById("forecast");

  // Helpers
  const setStatus = (msg) => {
    if (statusEl) statusEl.textContent = msg;
  };

  const formatTime = (unix) =>
    new Date(unix * 1000).toLocaleString(undefined, {
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  // UI Update
  const updateUI = (data) => {
    if (!data || !data.main || !data.weather) return;

    locationEl.textContent = `${data.name}, ${data.sys?.country || ""}`;
    timeEl.textContent = formatTime(data.dt);
    tempEl.textContent = `${Math.round(data.main.temp)}°C`;
    condEl.textContent = data.weather[0]?.description ?? "--";
    feelsEl.textContent = `${Math.round(data.main.feels_like)}°C`;
    humidityEl.textContent = `${data.main.humidity}%`;
    windEl.textContent = `${Math.round(data.wind.speed)} m/s`;

    const iconCode = data.weather[0]?.icon;
    iconEl.src = iconCode
      ? `https://openweathermap.org/img/wn/${iconCode}@2x.png`
      : "";

    sourceLink.href = data.id
      ? `https://openweathermap.org/city/${data.id}`
      : "#";
  };

  // Forecast Render
  const renderForecast = (days = []) => {
    if (!forecastEl) return;
    forecastEl.innerHTML = "";

    days.forEach((day) => {
      const el = document.createElement("div");
      el.className = "forecast-day";

      const date = new Date(day.date).toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      });

      el.innerHTML = `
        <p class="f-date">${date}</p>
        <img class="f-icon" src="https://openweathermap.org/img/wn/${day.icon}.png" alt="">
        <p class="f-temp">${Math.round(day.temp.min)}°C – ${Math.round(
        day.temp.max
      )}°C</p>
        <p class="f-desc">${day.description}</p>
      `;

      forecastEl.appendChild(el);
    });
  };

  // Fetch helpers
  const fetchJSON = async (url) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Network error");
    return res.json();
  };

  // Weather by coordinates
  const fetchWeatherByCoords = async (lat, lon) => {
    setStatus("Fetching weather…");

    try {
      const data = await fetchJSON(`/api/weather?lat=${lat}&lon=${lon}`);
      updateUI(data);

      const forecast = await fetchJSON(
        `/api/forecast?lat=${lat}&lon=${lon}`
      );
      if (forecast.daily) renderForecast(forecast.daily);

      setStatus("Live data loaded.");
    } catch (err) {
      console.error(err);
      setStatus("Could not load weather data.");
    }
  };

  // Weather by city
  const fetchWeatherByCity = async (city) => {
    if (!city) return;

    setStatus(`Searching weather for "${city}"…`);

    try {
      const data = await fetchJSON(
        `/api/weather?q=${encodeURIComponent(city)}`
      );

      if (data.cod === "404") {
        setStatus("City not found.");
        return;
      }

      updateUI(data);

      const forecast = await fetchJSON(
        `/api/forecast?q=${encodeURIComponent(city)}`
      );
      if (forecast.daily) renderForecast(forecast.daily);

      setStatus("Live data loaded.");
    } catch (err) {
      console.error(err);
      setStatus("Failed to fetch city weather.");
    }
  };

  // Geolocation
  const useBrowserLocation = (fallbackCity = "Johannesburg") => {
    if (!navigator.geolocation) {
      setStatus("Geolocation not supported. Showing Johannesburg.");
      fetchWeatherByCity(fallbackCity);
      return;
    }

    setStatus("Requesting your location…");

    navigator.geolocation.getCurrentPosition(
      (pos) =>
        fetchWeatherByCoords(
          pos.coords.latitude,
          pos.coords.longitude
        ),
      () => {
        setStatus("Location blocked. Showing Johannesburg.");
        fetchWeatherByCity(fallbackCity);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  // Events
  locBtn?.addEventListener("click", () => useBrowserLocation());

  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const city = input.value.trim();
    if (city) fetchWeatherByCity(city);
    input.value = "";
  });

  window.addEventListener("load", () => {
    setStatus("Ready. Detecting location…");
    useBrowserLocation();
  });
})();
