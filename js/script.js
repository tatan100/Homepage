const SEARCH_URL = "https://search.brave.com/search?q=";
const API_WEATHER = CONFIG.WEATHER_API;

const searchInput = document.getElementById('searchInput');
const weatherText = document.getElementById('weatherText');
const weatherDot = document.getElementById('weatherDot');
const bgIcons = document.querySelectorAll('.weather-display');
const rainOverlay = document.getElementById('rainOverlay');

// Search
function handleSearch(e) {
    if (e.key === 'Enter') {
        const query = searchInput.value.trim();
        if (query) {
            window.location.href = SEARCH_URL + encodeURIComponent(query);
            searchInput.value = '';
        }
    }
}

// Weather
async function fetchWeather() {
    try {
        const res = await fetch(API_WEATHER);
        const data = await res.json();
        const { weathercode, temperature, is_day } = data.current_weather;
        updateWeatherUI(weathercode, Math.round(temperature), is_day);
    } catch (e) {
        console.error(e);
        weatherText.innerText = 'Offline';
    }
}

function updateWeatherUI(code, temp, isDay) {
    document.body.classList.remove('raining');
    rainOverlay.innerHTML = '';

    const setIcon = (symbol, cls) => {
        bgIcons.forEach(icon => {
            icon.innerText = symbol;
            icon.className = `bg-icon weather-display ${icon.classList[1]} ${cls}`;
        });
    };

    if (code === 0) { // Clear
        setIcon(isDay ? '☀️' : '🌙', 'weather-sun');
        weatherText.innerText = `Clear • ${temp}°C`;
        weatherDot.style.background = '#fbbf24';
        weatherDot.style.boxShadow = '0 0 12px #fbbf24';
    } else if (code >= 1 && code <= 3) { // Cloudy
        setIcon('☁️', 'weather-cloud');
        weatherText.innerText = `Cloudy • ${temp}°C`;
        weatherDot.style.background = '#cbd5e1';
        weatherDot.style.boxShadow = '0 0 12px #cbd5e1';
    } else if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) { // Rain
        setIcon('🌧️', 'weather-rain');
        weatherText.innerText = `Rain • ${temp}°C`;
        weatherDot.style.background = '#38bdf8';
        weatherDot.style.boxShadow = '0 0 12px #38bdf8';
        document.body.classList.add('raining');
        makeRain(30);
    } else if (code >= 95) { // Storm
        setIcon('⛈️', 'weather-storm');
        weatherText.innerText = `Storm • ${temp}°C`;
        weatherDot.style.background = '#a855f7';
        weatherDot.style.boxShadow = '0 0 12px #a855f7';
        document.body.classList.add('raining');
        makeRain(50);
    } else { // Default
        setIcon('🌫️', 'weather-cloud');
        weatherText.innerText = `${temp}°C`;
        weatherDot.style.background = '#6366f1';
    }
}

function makeRain(drops) {
    for (let i = 0; i < drops; i++) {
        const d = document.createElement('div');
        d.className = 'raindrop';
        d.style.left = Math.random() * 100 + '%';
        d.style.animationDuration = (Math.random() * 0.5 + 0.7) + 's';
        d.style.animationDelay = Math.random() * 2 + 's';
        rainOverlay.appendChild(d);
    }
}

// Clock & date
function updateClock() {
    const now = new Date();
    let h = now.getHours();
    const m = now.getMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12;

    document.getElementById('clock').innerText = `${h}:${m < 10 ? '0' + m : m}`;
    document.getElementById('ampm').innerText = ampm;

    const h24 = now.getHours();
    let greet = "Good evening!";
    if (h24 >= 5 && h24 < 12) greet = "Good morning!";
    else if (h24 >= 12 && h24 < 18) greet = "Good afternoon!";
    document.getElementById('greeting').innerText = greet;

    document.getElementById('dateDisplay').innerText = now.toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
    });
}

// Task logic
const checks = document.querySelectorAll('input[type="checkbox"]');
const bar = document.getElementById('progressBar');

function updateBar() {
    const total = checks.length;
    const done = Array.from(checks).filter(c => c.checked).length;
    bar.style.width = (done / total * 100) + '%';
}

// Restore State
checks.forEach(box => {
    if (localStorage.getItem(box.id) === 'true') {
        box.checked = true;
        const item = box.closest('.task-item');
        if (item) item.classList.add('done');
    }
    box.addEventListener('change', () => save(box));
});

document.querySelectorAll('.task-item').forEach(item => {
    item.addEventListener('click', function (e) {
        if (e.target.tagName === 'INPUT') {
            e.stopPropagation();
            return;
        }
        if (e.target.tagName === 'A') return;
        const link = this.querySelector('.task-link');
        if (link && link.href) {
            link.click();
        }
    });
});

function save(box) {
    localStorage.setItem(box.id, box.checked);
    const item = box.closest('.task-item');
    if (item) item.classList.toggle('done', box.checked);
    updateBar();
}

window.manualReset = function (conf = true) {
    if (!conf || confirm('Reset all tasks?')) {
        checks.forEach(box => {
            box.checked = false;
            const item = box.closest('.task-item');
            if (item) item.classList.remove('done');
            localStorage.removeItem(box.id);
        });
        updateBar();
        localStorage.setItem('lastResetDate', new Date().toISOString());
    }
};

function checkReset() {
    const last = localStorage.getItem('lastResetDate');
    const now = new Date();
    const target = new Date(now);
    target.setHours(7, 0, 0, 0);

    if (now < target) target.setDate(target.getDate() - 1);

    const lastTime = last ? new Date(last) : new Date(0);
    if (lastTime < target) {
        window.manualReset(false);
        localStorage.setItem('lastResetDate', now.toISOString());
    }
}

// Init
fetchWeather(); setInterval(fetchWeather, 600000);
updateClock(); setInterval(updateClock, 1000);
updateBar();
checkReset();
