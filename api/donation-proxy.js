export default async function handler(req, res) {
  // Безопасность: разрешаем запросы только с вашего домена
  const allowedOrigins = [
    'https://inkorius.github.io',
    'https://inkorius.github.io/music-queue-app'
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Client-Token');
  
  // Handle preflight
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  // Ваши секретные данные (замените на свои!)
  const CLIENT_ID = 'ВАШ_CLIENT_ID';
  const CLIENT_SECRET = 'ВАШ_CLIENT_SECRET';
  const REFRESH_TOKEN = 'ВАШ_REFRESH_TOKEN'; // из Talend API Tester
  
  try {
    const action = req.query.action || 'check';
    
    switch (action) {
      case 'get-token':
        // Получаем новый access token
        const tokenResponse = await fetch('https://www.donationalerts.com/oauth/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: REFRESH_TOKEN,
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET
          })
        });
        
        const tokenData = await tokenResponse.json();
        return res.json(tokenData);
        
      case 'get-donations':
        // Получаем донаты через прокси
        const accessToken = req.headers['x-access-token'];
        if (!accessToken) {
          return res.status(401).json({ error: 'No token provided' });
        }
        
        const page = req.query.page || 1;
        const donationsResponse = await fetch(
          `https://www.donationalerts.com/api/v1/alerts/donations?page=${page}`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Accept': 'application/json'
            }
          }
        );
        
        const donationsData = await donationsResponse.json();
        return res.json(donationsData);
        
      default:
        return res.json({ status: 'ok', service: 'donationalerts-proxy' });
    }
    
  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({ error: error.message });
  }
}
