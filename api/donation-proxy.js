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
  const CLIENT_ID = '17107';
  const CLIENT_SECRET = 'HRkb2D5baGPDfGWgFgsXwTE6XTdl2Mw0WbnsiNxe';
  const REFRESH_TOKEN = 'def50200975663d70224dc0542489f62dd8dff9b0198027b6acf1c977dd3b22e02780f21ab8465be91058fcb2baa3b253361560161b17cb95453814c7c634ddba927d626784e9a727830f8a63aac53aebbf5f186af6677833285eb7cb6cc2be62d9db044274de3f92a3fc3d74b82013acb68bf148218301a49f1341f35dd73b4336290ef4248bac1a3d88db7764010e7945aa592de8527c84e6dfdfc10c04b346bffea8c9238f37945186d051066881896d6676ade458bee336e81aab1cd7fd4b3f9b1a2a822738966de4186dcf2514b07c4d121621e0a9be870a400a8a4680518df3b6bac42d339b3fc7b51af862f9c4248768608c34c5b1333104f22051243267d7e6d53a0c32c84ed406085761cc5b85c1217a642d678c61be8c56fb0bf967648a9409ad17e95078abffc2fc9050b9abfca5e7e365fd98b1663b6c204f4733ceb51523e3eb2389755a4e3e0635d03d997c7d65959947f54e9c9e61ded962ae808a47d516f633819d64277dac86151090b0d369212927bd4e4f9d792ecb89cb7de97c0053c5cf46074e83fff5329ba960d2d716b1472c26e5f6bc9'; // из Talend API Tester
  
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
