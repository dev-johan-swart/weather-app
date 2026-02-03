require("dotenv").config();
const express = require("express");
const fetch = require("node-fetch");
const path = require("path");

const app = express();

// Vercel-safe port
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.OPENWEATHER_API_KEY;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ======================
// Current Weather Route
// ======================
app.get("/api/weather", async (req, res) => {
  const { lat, lon, q } = req.query;

  try {
    if (!API_KEY) {
      return res.status(500).json({ error: "API key not configured" });
    }

    let url;

    if (q) {
      url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
        q
      )}&appid=${API_KEY}&units=metric`;
    } else if (lat && lon) {
      url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
    } else {
      return res.status(400).json({ error: "Missing parameters" });
    }

    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Weather fetch failed" });
  }
});

// ======================
// Forecast Route (3-Day)
// ======================
app.get("/api/forecast", async (req, res) => {
  const { lat, lon, q } = req.query;

  try {
    if (!API_KEY) {
      return res.status(500).json({ error: "API key not configured" });
    }

    let url;

    if (q) {
      url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(
        q
      )}&appid=${API_KEY}&units=metric`;
    } else if (lat && lon) {
      url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
    } else {
      return res.status(400).json({ error: "Missing parameters" });
    }

    const response = await fetch(url);
    const data = await response.json();

    // Group by date
    const daily = {};
    data.list.forEach((item) => {
      const date = item.dt_txt.split(" ")[0];
      if (!daily[date]) daily[date] = [];
      daily[date].push(item);
    });

    const dates = Object.keys(daily).slice(0, 3);

    const forecastArr = dates.map((date) => {
      const items = daily[date];
      const temps = items.map((i) => i.main.temp);

      const midDay = items.reduce((prev, curr) => {
        const prevDiff = Math.abs(
          new Date(prev.dt_txt).getHours() - 12
        );
        const currDiff = Math.abs(
          new Date(curr.dt_txt).getHours() - 12
        );
        return currDiff < prevDiff ? curr : prev;
      });

      return {
        date,
        temp: {
          min: Math.min(...temps),
          max: Math.max(...temps),
        },
        icon: midDay.weather[0].icon,
        description: midDay.weather[0].description,
      };
    });

    res.json({ daily: forecastArr });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Forecast fetch failed" });
  }
});

// ======================
// Frontend Fallback
// ======================
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ======================
// Start Server
// ======================
app.listen(PORT, () => {
  if (!API_KEY) {
    console.warn("⚠️ OPENWEATHER_API_KEY is not set");
  }
  console.log(`✅ Server running on port ${PORT}`);
});
