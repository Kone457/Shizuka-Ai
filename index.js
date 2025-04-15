import fetch from 'node-fetch';
import fs from 'fs';
import https from 'https';



import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import axios from 'axios';
import * as cheerio from 'cheerio';
import ytdl from 'ytdl-core';

dotenv.config();

const token = process.env.TOKEN;
const bot = new TelegramBot(token, {polling: true});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const messageText = msg.text || '';
 
 
  // Función para verificar comandos con cualquier número de puntos, espacios y mayúsculas/minúsculas
  const matchCommand = (text, command) => {
    const regex = new RegExp(`^\.+\\s*${command}\\s*$`, 'i');
    return regex.test(text);
  };

  // Función para extraer argumentos de comandos
  const getCommandArgs = (text, command) => {
    const regex = new RegExp(`^\.+\\s*${command}\\s+(.+)$`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : '';
  };

  if (matchCommand(messageText, 'menu') || matchCommand(messageText, 'help')) {
    const menuText = `
🌟 *COMANDOS DISPONIBLES* 🌟

*.start* - Iniciar el bot
*.menu* - Mostrar este menú
*.llama* _pregunta_ - Consultar a Llama AI
*.playstore* _app_ - Buscar aplicaciones en Play Store
*.ytmp3* _url_ - Descargar audio de YouTube
*.dalle* _prompt_ - Generar imagen con IA
*.tiktok* _url_ - Descargar videos/imágenes de TikTok
*.tenor* _búsqueda_ - Buscar GIFs en Tenor
*.ia* _pregunta_ - Chatear con IA Gemini
*.tiktoksearch* _consulta_ - Buscar videos en TikTok
*.wallpaper* _búsqueda_ - Buscar fondos de pantalla
*.mistral* _pregunta_ - Chatear con MistralNemo AI
*.lyrics* _canción_ - Buscar letra de canciones
*.lilychan* _texto_ - Chatear con LilyChan AI
*.spotify* _canción_ - Descargar música de Spotify
*.cpf* _número_ - Consultar datos de CPF
*.contractgpt* _texto_ - Consultar Contract GPT Assistant
*.clima* _ubicación_ - Consultar el clima de una ubicación

   ✨ *Bot desarrollado por Carlos* ✨
    `;
    bot.sendMessage(chatId, menuText, { parse_mode: 'Markdown' });
  } else if (matchCommand(messageText, 'start')) {
    bot.sendMessage(chatId, '¡Hola! Soy tu bot de Telegram 🤖\nUsa .llama seguido de tu pregunta para hablar con Llama AI');
  } else if (messageText.match(/^\.+\s*llama/i)) {
    const query = getCommandArgs(messageText, 'llama');
    if (!query) {
      bot.sendMessage(chatId, '🍭 Ingresa un texto después de /llama para hablar con Llama AI');
      return;
    }

    try {
      const api = await fetch(`https://delirius-apiofc.vercel.app/ia/llamaia?query=${encodeURIComponent(query)}`);
      const responseText = await api.text();

      try {
        const json = JSON.parse(responseText);
        if (json.data) {
          await bot.sendMessage(chatId, json.data, {
            parse_mode: 'Markdown'
          });
        } else {
          throw new Error('Respuesta sin datos');
        }
      } catch (parseError) {
        console.error('Error de respuesta:', responseText);
        await bot.sendMessage(chatId, '❌ La API no está respondiendo correctamente. Por favor, intenta más tarde.');
      }
    } catch (error) {
      console.error('Error de red:', error);
      await bot.sendMessage(chatId, '❌ No se pudo conectar con el servicio de Llama AI. Por favor, intenta más tarde.');
    }
  } else if (messageText.match(/^\.+\s*playstore/i)) {
    const query = getCommandArgs(messageText, 'playstore');
    if (!query) {
      bot.sendMessage(chatId, '🚩 Ingresa el nombre de la aplicación que deseas buscar.\n\nEjemplo:\n/playstore whatsapp');
      return;
    }

    try {
      const { data } = await axios.get(`https://play.google.com/store/search?q=${encodeURIComponent(query)}&c=apps`);
      const resultados = [];
      const $ = cheerio.load(data);

      $('.ULeU3b > .VfPpkd-WsjYwc.VfPpkd-WsjYwc-OWXEXe-INsAgc.KC1dQ.Usd1Ac.AaN0Dd.Y8RQXd > .VfPpkd-aGsRMb > .VfPpkd-EScbFb-JIbuQc.TAQqTe > a').each((i, u) => {
        const linkk = $(u).attr('href');
        const nombre = $(u).find('.j2FCNc > .cXFu1 > .ubGTjb > .DdYX5').text();
        const desarrollador = $(u).find('.j2FCNc > .cXFu1 > .ubGTjb > .wMUdtb').text();
        const calificacion = $(u).find('.j2FCNc > .cXFu1 > .ubGTjb > div').attr('aria-label');
        const calificacionTexto = $(u).find('.j2FCNc > .cXFu1 > .ubGTjb > div > span.w2kbF').text();
        const link = `https://play.google.com${linkk}`;

        resultados.push({
          link,
          nombre: nombre || 'Sin nombre',
          desarrollador: desarrollador || 'Sin desarrollador',
          calificacion: calificacion || 'Sin calificación',
          calificacionTexto: calificacionTexto || 'Sin calificación',
          link_desarrollador: `https://play.google.com/store/apps/developer?id=${desarrollador.split(" ").join('+')}`
        });
      });

      if (!resultados.length) {
        bot.sendMessage(chatId, 'No se encontraron resultados');
        return;
      }

      let txt = `*🔎 Resultados de la búsqueda en Play Store para "${query}"*\n\n`;
      for (let app of resultados.slice(0, 5)) {
        txt += `▢ *Nombre:* ${app.nombre}\n`;
        txt += `▢ *Desarrollador:* ${app.desarrollador}\n`;
        txt += `▢ *Calificación:* ${app.calificacionTexto} (${app.calificacion})\n`;
        txt += `▢ *Link:* ${app.link}\n`;
        txt += `▢ *Link del Desarrollador:* ${app.link_desarrollador}\n\n`;
      }

      await bot.sendMessage(chatId, txt, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error(error);
      bot.sendMessage(chatId, 'Ocurrió un error durante la búsqueda.');
    }
  } else if (messageText.match(/^\.+\s*dalle/i)) {
    const prompt = getCommandArgs(messageText, 'dalle');
    if (!prompt) {
      bot.sendMessage(chatId, '✨ Por favor proporciona una descripción para generar la imagen.\n\nEjemplo: .dalle gato astronauta');
      return;
    }

    try {
      const statusMessage = await bot.sendMessage(chatId, '*🧧 Espere un momento...*', { parse_mode: 'Markdown' });

      const apiUrl = `https://api.dorratz.com/v3/ai-image?prompt=${encodeURIComponent(prompt)}`;
      const response = await axios.get(apiUrl);

      if (response.data && response.data.data && response.data.data.image_link) {
        const imageUrl = response.data.data.image_link;
        await bot.sendPhoto(chatId, imageUrl, { caption: `🎨 Imagen generada con DALLE\n📝 Prompt: ${prompt}` });
        await bot.deleteMessage(chatId, statusMessage.message_id);
      } else {
        throw new Error('No se encontró la imagen en la respuesta.');
      }
    } catch (error) {
      console.error('Error al generar la imagen:', error);
      bot.sendMessage(chatId, '❌ Error al generar la imagen. Por favor, intenta de nuevo más tarde.');
    }
  } else if (messageText.match(/^\.+\s*ytmp3/i)) {
    const url = getCommandArgs(messageText, 'ytmp3');
    if (!url) {
      bot.sendMessage(chatId, '🚩 Ingresa la *URL* de *YouTube*\n\nEjemplo: .ytmp3 https://youtube.com/...');
      return;
    }

    try {
      await bot.sendMessage(chatId, '🕒 Procesando video...');

      if (!ytdl.validateURL(url)) {
        bot.sendMessage(chatId, '❌ URL de YouTube inválida');
        return;
      }

      const info = await ytdl.getInfo(url);
      const audioFormat = ytdl.chooseFormat(info.formats, { quality: 'highestaudio' });

      const audioStream = ytdl(url, { format: audioFormat });
      await bot.sendAudio(chatId, audioStream, { 
        title: info.videoDetails.title,
        performer: info.videoDetails.author.name
      });

      await bot.sendMessage(chatId, '✅ Audio descargado exitosamente');
    } catch (error) {
      console.error(error);
      bot.sendMessage(chatId, '❌ Error al descargar el audio');
    }
  } else if (messageText.match(/^\.+\s*tiktok/i)) {
    const url = getCommandArgs(messageText, 'tiktok');
    if (!url) {
      bot.sendMessage(chatId, '🎵 Ingresa un link de TikTok.\n\nEjemplo: .tiktok https://vm.tiktok.com/...');
      return;
    }

    try {
      const api = await fetch(`https://only-awan.biz.id/api/fullApi/d/tiktok?url=${encodeURIComponent(url)}`);
      const json = await api.json();

      if (!json.status || !json.data?.status || !json.data?.data?.urls?.length) {
        return bot.sendMessage(chatId, '❌ Error al obtener los detalles del video. Asegúrate de que el enlace es válido.');
      }

      const downloadLink = json.data.data.urls[0];
      if (downloadLink.match(/\.(jpg|png|jpeg|webp|heic|tiff|bmp)$/i)) {
        await bot.sendPhoto(chatId, downloadLink, { caption: '*✔️ Downloader TikTok.*' });
      } else {
        await bot.sendVideo(chatId, downloadLink, { caption: '*✔️ Downloader TikTok.*' });
      }
    } catch (error) {
      console.error(error);
      bot.sendMessage(chatId, '❌ Ocurrió un error al procesar la solicitud.');
    }
  } else if (messageText.match(/^\.+\s*tenor/i)) {
    const query = getCommandArgs(messageText, 'tenor');
    if (!query) {
      bot.sendMessage(chatId, '🚩 Ingresa el nombre que deseas buscar en Tenor.\n\nEjemplo: .tenor Nayeon');
      return;
    }

    try {
      const res = await fetch(`https://delirius-apiofc.vercel.app/search/tenor?q=${encodeURIComponent(query)}`);
      const json = await res.json();

      if (!json.data || json.data.length === 0) {
        return bot.sendMessage(chatId, 'No se encontraron resultados para tu búsqueda.');
      }

      let txt = '`乂  T E N O R  -  B Ú S Q U E`\n\n';
      for (let i = 0; i < json.data.length; i++) {
        const gif = json.data[i];
        txt += `*» Nro* : ${i + 1}\n`;
        txt += `*» Título* : ${gif.title}\n`;
        txt += `*» Fecha de creación* : ${gif.created}\n`;
        txt += `*» GIF* : ${gif.gif}\n`;
        txt += `*» Video MP4* : ${gif.mp4}\n\n`;
      }

      await bot.sendMessage(chatId, txt, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error(error);
      bot.sendMessage(chatId, '❌ Error al buscar en Tenor.');
    }
  } else if (messageText.match(/^\.+\s*ia/i)) {
    const query = getCommandArgs(messageText, 'ia');
    if (!query) {
      bot.sendMessage(chatId, '🤖 Por favor, proporciona un texto para enviar a la IA.\n\nEjemplo: .ia ¿qué es la inteligencia artificial?');
      return;
    }

    const path = './conversationHistory.json';
    if (!fs.existsSync(path)) {
      fs.writeFileSync(path, JSON.stringify({}));
    }

    try {
      let conversationHistory = JSON.parse(fs.readFileSync(path, 'utf8'));

      if (!conversationHistory[chatId]) {
        conversationHistory[chatId] = [{
          role: 'system',
          content: `Actúa como un bot de Telegram. Te llamas TeleBot, un modelo de lenguaje natural avanzado. Responderás de manera amigable a los usuarios.`
        }];
      }

      conversationHistory[chatId].push({ role: 'user', content: query });

      const conversationText = conversationHistory[chatId].map(msg => 
        msg.role === 'system' ? `Sistema: ${msg.content}\n\n`
        : msg.role === 'user' ? `Usuario: ${msg.content}\n\n`
        : `${msg.content}\n\n`
      ).join('');

      const data = JSON.stringify({
        contents: [{ parts: [{ text: conversationText }] }]
      });

      const options = {
        hostname: 'generativelanguage.googleapis.com',
        path: '/v1beta/models/gemini-1.5-flash:generateContent?key=TU_KEY_PAPI',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      };

      await bot.sendMessage(chatId, '🤔 Pensando...');

      const req = https.request(options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', async () => {
          try {
            const responseJson = JSON.parse(responseData);
            const replyText = responseJson?.candidates?.[0]?.content?.parts?.[0]?.text;

            if (replyText) {
              conversationHistory[chatId].push({ role: 'assistant', content: replyText });
              fs.writeFileSync(path, JSON.stringify(conversationHistory, null, 2));
              await bot.sendMessage(chatId, replyText, { parse_mode: 'Markdown' });
            } else {
              await bot.sendMessage(chatId, '❌ La IA no envió una respuesta válida.');
            }
          } catch (error) {
            console.error(error);
            await bot.sendMessage(chatId, `❌ Error al procesar la respuesta: ${error.message}`);
          }
        });
      });

      req.on('error', async (error) => {
        console.error(error);
        await bot.sendMessage(chatId, `❌ Error de conexión con la IA: ${error.message}`);
      });

      req.write(data);
      req.end();
    } catch (error) {
      console.error(error);
      await bot.sendMessage(chatId, `❌ Error al procesar la solicitud: ${error.message}`);
    }
  } else if (messageText.match(/^\.+\s*tiktoksearch/i)) {
    const query = getCommandArgs(messageText, 'tiktoksearch');
    if (!query) {
      bot.sendMessage(chatId, '🚩 Ingrese una consulta para buscar videos en TikTok.\n\nEjemplo: .tiktoksearch NinoNakanoEdits');
      return;
    }

    try {
      const res = await fetch(`https://api.agungny.my.id/api/tiktok-search?q=${encodeURIComponent(query)}`);
      const json = await res.json();

      if (!json.status || !json.result || !json.result.videos.length) {
        return await bot.sendMessage(chatId, 'No se encontraron resultados para esta búsqueda.');
      }

      let txt = '*乂 T I K T O K - B U S C A R*\n\n';

      json.result.videos.forEach(video => {
        txt += `✩ *Título* : ${video.title || 'Sin título'}\n`;
        txt += `✩ *ID del Video* : ${video.video_id}\n`;
        txt += `✩ *Región* : ${video.region}\n`;
        txt += `✩ *Duración* : ${video.duration} segundos\n`;
        txt += `✩ *Reproducciones* : ${video.play_count}\n`;
        txt += `✩ *Likes* : ${video.digg_count}\n`;
        txt += `✩ *Comentarios* : ${video.comment_count}\n`;
        txt += `✩ *Compartidos* : ${video.share_count}\n`;
        txt += `✩ *Descargas* : ${video.download_count}\n`;
        txt += `✩ *Tamaño* : ${video.size} bytes\n`;
        txt += `✩ *Música* : ${video.music_info?.title || 'Sin música'}\n`;
        txt += `✩ *Autor de Música* : ${video.music_info?.author || 'Desconocido'}\n`;
        txt += `✩ *URL del Video* : https://www.tiktok.com/@${video.author.unique_id}/video/${video.video_id}\n\n`;
      });

      await bot.sendMessage(chatId, txt, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error(error);
      await bot.sendMessage(chatId, 'Hubo un error al procesar la solicitud. Intenta de nuevo más tarde.');
    }
  } else if (messageText.match(/^\.+\s*wallpaper/i)) {
    const query = getCommandArgs(messageText, 'wallpaper');
    if (!query) {
      bot.sendMessage(chatId, '🚩 Ingresa la palabra clave que deseas buscar.\n\nEjemplo: .wallpaper naruto');
      return;
    }

    try {
      const response = await axios.get(`https://api.davidcyriltech.my.id/search/wallpaper?text=${query}`);

      if (response.data.success) {
        const wallpapers = response.data.result;
        if (wallpapers.length > 0) {
          for (let i = 0; i < wallpapers.length; i++) {
            let wallpaper = wallpapers[i];
            let txt = '`乂  W A L L P A P E R S  -  S E A R C H`\n\n';
            txt += `    ✩  *Nro* : ${i + 1}\n`;
            txt += `    ✩  *Título* : ${wallpaper.title || 'Sin título'}\n`;
            txt += `    ✩  *Tipo* : ${wallpaper.type}\n`;
            txt += `    ✩  *Fuente* : ${wallpaper.source}\n`;
            txt += `    ✩  *Imagen* : ${wallpaper.image}\n\n`;

            await bot.sendPhoto(chatId, wallpaper.image, { caption: txt, parse_mode: 'Markdown' });
          }
        } else {
          await bot.sendMessage(chatId, 'No se encontraron resultados para esta búsqueda.');
        }
      } else {
        await bot.sendMessage(chatId, 'Error al obtener resultados.');
      }
    } catch (error) {
      console.error(error);
      await bot.sendMessage(chatId, 'Hubo un error al procesar la solicitud. Intenta de nuevo más tarde.');
    }
  } else if (messageText.match(/^\.+\s*mistral/i)) {
    const query = getCommandArgs(messageText, 'mistral');
    if (!query) {
      bot.sendMessage(chatId, '🔥 *Ingrese su petición*\n🚩 *Ejemplo de uso:* .mistral ¿Cómo hacer un avión de papel?', { parse_mode: 'Markdown' });
      return;
    }

    try {
      const username = msg.from.first_name;
      const basePrompt = `Tu nombre es MistralNemo y pareces haber sido creado por Jose XrL. Usarás el idioma Español. Llamarás a las personas por su nombre ${username} y serás amigable con ellos.`;
      const prompt = `${basePrompt}. Responde lo siguiente: ${query}`;

      await bot.sendMessage(chatId, '💬 Procesando...');

      const response = await axios.get(`https://api.rynn-archive.biz.id/ai/mistral-nemo?text=${encodeURIComponent(prompt)}`);

      if (response.data.status) {
        const responseMessage = response.data.result;
        await bot.sendMessage(chatId, responseMessage, { parse_mode: 'Markdown' });
      } else {
        await bot.sendMessage(chatId, '🌹 No se pudo obtener una respuesta de la API.');
      }
    } catch (error) {
      console.error('🔥 Error al obtener la respuesta:', error);
      await bot.sendMessage(chatId, 'Error: intenta más tarde.');
    }
  } else if (messageText.match(/^\.+\s*lyrics/i)) {
    const query = getCommandArgs(messageText, 'lyrics');
    if (!query) {
      bot.sendMessage(chatId, '🍭 Ingrese un nombre de alguna canción');
      return;
    }

    try {
      const api = `https://archive-ui.tanakadomp.biz.id/search/lirik?q=${encodeURIComponent(query)}`;
      const response = await fetch(api);
      const json = await response.json();
      const crow = json.result;

      const txt = `*Nombre:* ${crow.title}\n*Letra:* ${crow.lyrics}`;
      await bot.sendPhoto(chatId, crow.thumb, { caption: txt, parse_mode: 'Markdown' });
    } catch (error) {
      console.error(error);
      await bot.sendMessage(chatId, '*No se pudo obtener la letra de su canción*');
    }
  } else if (messageText.match(/^\.+\s*lilychan/i)) {
    const text = getCommandArgs(messageText, 'lilychan');
    if (!text) {
      bot.sendMessage(chatId, '🌸 Ingresa un texto para hablar con LilyChan');
      return;
    }

    try {
      const api = await fetch(`https://archive-ui.tanakadomp.biz.id/ai/lilychan?text=${encodeURIComponent(text)}`);
      const json = await api.json();
      if (json.status && json.result) {
        await bot.sendMessage(chatId, json.result.message);
      } else {
        await bot.sendMessage(chatId, '🌸 Hubo un error al obtener la respuesta.');
      }
    } catch (error) {
      console.error(error);
      await bot.sendMessage(chatId, '🌸 Ocurrió un error al procesar tu solicitud.');
    }
  } else if (messageText.match(/^\.+\s*contractgpt/i)) {
    const text = getCommandArgs(messageText, 'contractgpt');
    if (!text) {
      bot.sendMessage(chatId, '🚩 Ejemplo de uso: *.contractgpt bmw*', { parse_mode: 'Markdown' });
      return;
    }

    await bot.sendMessage(chatId, "🍇 Procesando tu solicitud...");

    try {
      const response = await fetch("https://smart-contract-gpt.vercel.app/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: text }],
        }),
      });

      if (!response.ok) {
        throw new Error(`Error en la API: ${response.status} ${response.statusText}`);
      }

      const rawResponse = await response.text();
      let [mainContent, ...additionalData] = rawResponse.split("\ne:");
      mainContent = mainContent.trim();
      let cleanedContent = mainContent
        .split(/\d+:"/g)
        .map(part => part.replace(/"/g, "").trim())
        .filter(part => part.length > 0)
        .join(" ")
        .replace(/\s{2,}/g, " ")
        .replace(/[^\w\s.,!?()\-]/g, "")
        .trim();

      await bot.sendMessage(chatId, cleanedContent);
    } catch (error) {
      console.error("Detalles del error:", error);
      await bot.sendMessage(chatId, `🚩 Ocurrió un error: ${error.message}`);
    }
  } else if (messageText.match(/^\.+\s*clima/i)) {
    const location = getCommandArgs(messageText, 'clima');
    if (!location) {
      bot.sendMessage(chatId, '🚩 Por favor, ingresa una ubicación.\n\nEjemplo: *.clima Jakarta*', { parse_mode: 'Markdown' });
      return;
    }

    try {
      const apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&units=metric&appid=060a6bcfa19809c2cd4d97a212b19273`;
      const response = await fetch(apiUrl);

      if (!response.ok) {
        return bot.sendMessage(chatId, '🚩 Ubicación no encontrada.');
      }

      const data = await response.json();
      if (data.cod !== 200) {
        throw new Error(data.message || 'Ocurrió un error');
      }

      const weatherMessage = `
🍇 *Informe meteorológico para ${data.name}, ${data.sys.country}* 🍁

• *Condición:* ${data.weather[0].description}
• *Temperatura actual:* ${data.main.temp}°C
• *Máxima:* ${data.main.temp_max}°C | *Mínima:* ${data.main.temp_min}°C
• *Humedad:* ${data.main.humidity}%
• *Velocidad del viento:* ${data.wind.speed} km/h

¡Mantente preparado y planifica tu día en consecuencia! ☀️🌧️
      `;

      await bot.sendMessage(chatId, weatherMessage, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error(error);
      await bot.sendMessage(chatId, `Hubo un error: ${error.message || error}`);
    }
  }
});



console.log('Bot iniciado...');
