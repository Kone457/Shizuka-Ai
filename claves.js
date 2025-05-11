
import dotenv from 'dotenv';
dotenv.config();

export default {
  // Token del bot de Telegram
  BOT_TOKEN: process.env.BOT_TOKEN || 'Tu_Token',
  
  // Claves de APIs
  OPENWEATHER_API_KEY: process.env.OPENWEATHER_API_KEY || '060a6bcfa19809c2cd4d97a212b19273',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || 'Clave_de_Gemini',
};
