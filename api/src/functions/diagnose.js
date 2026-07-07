const { app } = require('@azure/functions');
const axios = require('axios');

app.http('diagnose', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    context.log(`Http function processed request for url "${request.url}"`);

    const year = request.query.get('year');
    const month = request.query.get('month');
    const day = request.query.get('day');
    const gender = request.query.get('gender') || 'F';

    if (!year || !month || !day) {
      return {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing parameters: year, month, day are required.' })
      };
    }

    // Pad month and day to 2 digits
    const formattedMonth = month.padStart(2, '0');
    const formattedDay = day.padStart(2, '0');

    try {
      const url = 'https://www.doubutsu-uranai.com/uranai_chara_5animals.php';
      const params = new URLSearchParams();
      params.append('nickname', 'ゲスト');
      params.append('gender', gender);
      params.append('birth_array[]', year);
      params.append('birth_array[]', formattedMonth);
      params.append('birth_array[]', formattedDay);
      params.append('method', 'input');
      params.append('submit', '占う');

      const response = await axios.post(url, params.toString(), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const html = response.data;
      const regex = /alt="([^"]+キャラ：[^"]+)"/g;
      let match;
      const results = {};

      const animalToCode = {
        '狼': '001', 'オオカミ': '001',
        '猿': '919', 'サル': '919',
        '虎': '555', 'トラ': '555',
        'コアラ': '125', '子守熊': '125',
        'チーター': '888', 'チータ': '888',
        'ライオン': '100',
        'ゾウ': '024', '象': '024',
        'ペガサス': '000',
        'こじか': '108', '小鹿': '108',
        '黒ひょう': '012', '黒ヒョウ': '012',
        'たぬき': '789', 'タヌキ': '789',
        'ひつじ': '025', '羊': '025'
      };

      while ((match = regex.exec(html)) !== null) {
        const parts = match[1].split('：');
        const role = parts[0];
        const animal = parts[1];
        const code = animalToCode[animal] || '000';

        if (role.includes('本質')) results.essential = code;
        if (role.includes('表面')) results.surface = code;
        if (role.includes('意思決定')) results.decision = code;
        if (role.includes('希望')) results.hope = code;
        if (role.includes('隠れ')) results.hidden = code;
      }

      return {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          // SWA provides local proxy, but CORS headers are useful for standalone function local debugging
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(results)
      };

    } catch (error) {
      context.error('Scraping failed:', error);
      return {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Diagnosis failed to retrieve data from source.' })
      };
    }
  }
});
