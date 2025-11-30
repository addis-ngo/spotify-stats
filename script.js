
const clientId = "9ddddb165ec746db9b3a95dcc4a4dd95";
const redirectUri = window.location.origin + window.location.pathname;

async function generateCodeVerifier() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=/g,"");
}
async function sha256(plain) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return crypto.subtle.digest("SHA-256", data);
}
function base64urlencode(buffer) {
  const bytes = new Uint8Array(buffer);
  let str = "";
  for (let b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g,"-").replace(/\//g,"_").replace(/=/g,"");
}

async function redirectToSpotify() {
  const verifier = await generateCodeVerifier();
  localStorage.setItem("pkce_verifier", verifier);

  const challenge = base64urlencode(await sha256(verifier));

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    code_challenge_method: "S256",
    code_challenge: challenge,
    scope: "user-top-read"
  });

  window.location.href = "https://accounts.spotify.com/authorize?" + params;
}

async function handleSpotifyCallback() {
  const code = new URLSearchParams(window.location.search).get("code");
  if (!code) return;

  const verifier = localStorage.getItem("pkce_verifier");

  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: "authorization_code",
    code: code,
    redirect_uri: redirectUri,
    code_verifier: verifier
  });

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method:"POST",
    headers:{ "Content-Type":"application/x-www-form-urlencoded" },
    body:body
  });

  const data = await response.json();
  localStorage.setItem("spotify_access_token", data.access_token);
  window.history.replaceState({}, document.title, redirectUri);
}

handleSpotifyCallback();

document.getElementById("spotifyLogin").onclick = redirectToSpotify;

document.getElementById("generateBtn").onclick = async () => {
  const token = localStorage.getItem("spotify_access_token");
  const range = document.getElementById("timeRange").value;
  const limit = document.getElementById("limit").value;

  const res = await fetch(`https://api.spotify.com/v1/me/top/tracks?time_range=${range}&limit=${limit}`, {
    headers:{ Authorization:`Bearer ${token}` }
  });

  const data = await res.json();
  const stats = document.getElementById("stats");
  stats.innerHTML = "";

  data.items.forEach((track, i) => {
    stats.innerHTML += `
      <div class="songBox">
        <div>${i+1}. ${track.name}</div>
        <img src="${track.album.images[0].url}">
      </div>`;
  });
};

document.getElementById("downloadBtn").onclick = () => {
  html2canvas(document.getElementById("statsContainer")).then(canvas => {
    const link = document.createElement("a");
    link.download = "spotify-stats.png";
    link.href = canvas.toDataURL();
    link.click();
  });
};
