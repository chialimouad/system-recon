// Initialize Spotify API parameters
const CLIENT_ID = '78846e40c3ef488e915ecd85ab77d3ef';
const REDIRECT_URI = 'http://localhost:8000/callback';  // Replace with your domain or localhost
let accessToken = null;

// Function to authorize user with Spotify
function authorizeSpotify() {
    const scope = 'user-read-private user-read-email user-library-read';
    const authorizeUrl = `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${scope}&response_type=token&show_dialog=true`;
    window.location.href = authorizeUrl;
}

// Get access token from URL
function getAccessTokenFromUrl() {
    const params = new URLSearchParams(window.location.hash.substring(1));
    return params.get('access_token');
}

// Capture access token
accessToken = getAccessTokenFromUrl();

if (!accessToken) {
    // If no access token, redirect to Spotify auth
    authorizeSpotify();
}

// Initialize webcam
const video = document.getElementById('webcam');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const musicList = document.getElementById('musicList');
const recommendationSection = document.getElementById('recommendationSection');

// Access webcam stream
navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
    video.srcObject = stream;
});

// Load Face-api.js models
Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
    faceapi.nets.faceExpressionNet.loadFromUri('/models')
]).then(startDetection);

// Function to start emotion detection
function startDetection() {
    document.getElementById('startButton').addEventListener('click', async () => {
        setInterval(async () => {
            const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceExpressions();
            if (detections.length > 0) {
                const expressions = detections[0].expressions;
                const detectedEmotion = getDominantEmotion(expressions);

                // Call Spotify API to recommend music based on emotion
                recommendMusic(detectedEmotion);
            }
        }, 2000);
    });
}

// Get dominant emotion
function getDominantEmotion(expressions) {
    const sortedEmotions = Object.entries(expressions).sort((a, b) => b[1] - a[1]);
    return sortedEmotions[0][0];  // Get emotion with highest probability
}

// Recommend music based on emotion using Spotify API
async function recommendMusic(emotion) {
    const genres = {
        happy: 'pop',
        sad: 'acoustic',
        angry: 'metal',
        neutral: 'classical'
    };

    const genre = genres[emotion] || 'pop';
    const url = `https://api.spotify.com/v1/recommendations?seed_genres=${genre}&limit=5`;

    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    });

    const data = await response.json();
    displayRecommendations(data.tracks);
}

// Display music recommendations
function displayRecommendations(tracks) {
    musicList.innerHTML = '';  // Clear previous recommendations

    tracks.forEach(track => {
        const li = document.createElement('li');
        li.innerHTML = `<a href="${track.external_urls.spotify}" target="_blank">${track.name} by ${track.artists.map(artist => artist.name).join(', ')}</a>`;
        musicList.appendChild(li);
    });

    recommendationSection.hidden = false;
}
