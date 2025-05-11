import fetch from 'node-fetch';
import fs from 'fs';
import https from 'https';
import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import axios from 'axios';
import * as cheerio from 'cheerio';
import ytdl from 'ytdl-core';
import log from 'loglevel'; // Importing a logging library

dotenv.config();

import config from './claves.js';
const token = config.BOT_TOKEN;
const bot = new TelegramBot(token, {polling: true});

// Función para obtener el número de miembros
async function getMemberCount(chatId) {
  try {
    const count = await bot.getChatMembersCount(chatId);
    return count;
  } catch (error) {
    log.error('Error al obtener el conteo de miembros:', error);
    return 'N/A';
  }
}

// Manejador de nuevos miembros
bot.on('new_chat_members', async (msg) => {
  try {
    const chatId = msg.chat.id;
    const newMembers = msg.new_chat_members;
    const memberCount = await getMemberCount(chatId);

    for (const member of newMembers) {
      const firstName = member.first_name;
      const userId = member.id;
      const profilePhotos = await bot.getUserProfilePhotos(userId, 0, 1);

      let welcomeMessage = `🎉 ¡Bienvenido/a *${firstName}*!\n`;
      welcomeMessage += `👥 Eres el miembro #${memberCount} del grupo\n`;
      welcomeMessage += `🌟 Esperamos que disfrutes tu estancia.`;

      if (profilePhotos && profilePhotos.photos.length > 0) {
        const photo = profilePhotos.photos[0][0];
        await bot.sendPhoto(chatId, photo.file_id, {
          caption: welcomeMessage,
          parse_mode: 'Markdown'
        });
      } else {
        await bot.sendMessage(chatId, welcomeMessage, {
          parse_mode: 'Markdown'
        });
      }
    }
  } catch (error) {
    log.error('Error en el mensaje de bienvenida:', error);
  }
});

// Manejador de miembros que se van
bot.on('left_chat_member', async (msg) => {
  try {
    const chatId = msg.chat.id;
    const member = msg.left_chat_member;
    const firstName = member.first_name;
    const memberCount = await getMemberCount(chatId);

    let farewellMessage = `👋 Adiós *${firstName}*\n`;
    farewellMessage += ` Lamentamos ver que te vas, pero respetamos tu decisión. Aquí en este grupo siempre tendrás un lugar.*Mentira no te extrañaremos🤪*.\n`;
    farewellMessage += `👥 Ahora somos ${memberCount} miembros.`;

    await bot.sendMessage(chatId, farewellMessage, {
      parse_mode: 'Markdown'
    });
  } catch (error) {
    log.error('Error en el mensaje de despedida:', error);
  }
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const messageText = msg.text || '';
  const fromId = msg.from.id;


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
    const mainMenu = {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '👥 Admin', callback_data: 'menu_admin' },
            { text: '🤖 Básicos', callback_data: 'menu_basic' }
          ],
          [
            { text: '🧠 IA', callback_data: 'menu_ai' },
            { text: '📥 Descargas', callback_data: 'menu_downloads' }
          ],
          [
            { text: '🔍 Búsquedas', callback_data: 'menu_search' },
            { text: '💰 Economía', callback_data: 'menu_economy' }
          ],
          [
            { text: '🎮 Pokémon', callback_data: 'menu_pokemon' },
            { text: '👮 Moderación', callback_data: 'menu_moderation' }
          ],
          [{ text: '🎲 Diversión', callback_data: 'menu_fun' }]
        ]
      }
    };

    await bot.sendPhoto(chatId, 'https://i.postimg.cc/HLJxWfNR/Shizuka-telegram.png', {
      caption: '*🌟 Menú Principal*\n\nSelecciona una categoría:',
      parse_mode: 'Markdown',
      ...mainMenu
    });
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
        log.error('Error de respuesta:', responseText);
        await bot.sendMessage(chatId, '❌ La API no está respondiendo correctamente. Por favor, intenta más tarde.');
      }
    } catch (error) {
      log.error('Error de red:', error);
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
      log.error(error);
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
      log.error('Error al generar la imagen:', error);
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
      log.error(error);
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
      log.error(error);
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
      log.error(error);
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
          content: `Tomarás el rol de un bot de Telegram creado por Carlos. Tu nombre sera Shizuka, Tu idioma es el español, pero puedes responder en diferentes idiomas. tiene este rol que chat divertido con exploit incluido osea los quiere dices es que este rol solo es humor, divertido, no que tome nada real, tu respuesta sera divertida, humor, y usar mucho emojis en tu respuesta.

"general risa el chat por que este rol actúal más como simsimi" Chatbot no chatgpt. 

los quiere dices que tu respuesta sera humor puro, risa y un poco de amor .`
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
        path: `/v1beta/models/gemini-1.5-flash:generateContent?key=${config.GEMINI_API_KEY}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      };

      const thinkingMsg = await bot.sendMessage(chatId, '🤔 Pensando...');

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
              await bot.deleteMessage(chatId, thinkingMsg.message_id);
              await bot.sendMessage(chatId, replyText, { parse_mode: 'Markdown' });
            } else {
              await bot.deleteMessage(chatId, thinkingMsg.message_id);
              await bot.sendMessage(chatId, '❌ La IA no envió una respuesta válida.');
            }
          } catch (error) {
            log.error(error);
            await bot.sendMessage(chatId, `❌ Error al procesar la respuesta: ${error.message}`);
          }
        });
      });

      req.on('error', async (error) => {
        log.error(error);
        await bot.sendMessage(chatId, `❌ Error de conexión con la IA: ${error.message}`);
      });

      req.write(data);
      req.end();
    } catch (error) {
      log.error(error);
      await bot.sendMessage(chatId, `❌ Error al procesar la solicitud: ${error.message}`);
    }
  } else if (messageText.match(/^\.+\s*tiktoksearch/i)) {
    const query = getCommandArgs(messageText, 'tiktoksearch');
    if (!query) {
      bot.sendMessage(chatId, '🚩 Ingresa una consulta para buscar videos en TikTok.\n\nEjemplo: .tiktoksearch NinoNakanoEdits');
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
      log.error(error);
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
      log.error(error);
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
      const basePrompt = `Tu nombre es Shizuka y pareces haber sido creado por Carlos. Usarás el idioma Español. Llamarás a las personas por su nombre ${username} y serás amigable con ellos.`;
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
      log.error('🔥 Error al obtener la respuesta:', error);
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
      log.error(error);
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
      log.error(error);
      bot.sendMessage(chatId, '🌸 Ocurrió un error al procesar tu solicitud.');
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
      log.error("Detalles del error:", error);
      await bot.sendMessage(chatId, `🚩 Ocurrió un error: ${error.message}`);
    }
  } else if (messageText.match(/^\.+\s*(xdl|twitterdl)/i)) {
    const url = getCommandArgs(messageText, messageText.match(/xdl/i) ? 'xdl' : 'twitterdl');
    if (!url) {
      bot.sendMessage(chatId, '⬇️ Ingresa un link de Twitter\n\nEjemplo: .twitterdl https://twitter.com/...');
      return;
    }

    try {
      const api = `https://delirius-apiofc.vercel.app/download/twitterdl?url=${encodeURIComponent(url)}`;
      const response = await fetch(api);
      const json = await response.json();

      if (!json.found) {
        return bot.sendMessage(chatId, `✖️ Error: ${json.error || 'No se encontró ningún medio en el enlace proporcionado.'}`);
      }

      const media = json.media;
      const arch = media[0];

      if (json.type === 'video') {
        const videoUrl = arch.url;
        const txt = `> *¡Descargado con éxito!*`;
        await bot.sendVideo(chatId, videoUrl, { caption: txt });
      } else if (json?.type === 'image') {
        const imageUrl = arch.url;
        await bot.sendPhoto(chatId, imageUrl, { caption: '¡Descargado con éxito!' });
      } else {
        return bot.sendMessage(chatId, '✖️ El enlace no es ni una imagen ni un video.');
      }
    } catch (error) {
      log.error(error);
      bot.sendMessage(chatId, `Error: ${error.message}`);
    }
  } else if (messageText.match(/^\.+\s*clima/i)) {
    const location = getCommandArgs(messageText, 'clima');
    if (!location) {
      bot.sendMessage(chatId, '🌤️ Por favor, ingresa una ubicación.\n\nEjemplo: *.clima Jakarta*', { parse_mode: 'Markdown' });
      return;
    }

    try {
      // Enviar mensaje de procesamiento
      const processingMsg = await bot.sendMessage(chatId, '🕓 Procesando...');

      const apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&units=metric&appid=${config.OPENWEATHER_API_KEY}`;
      const response = await fetch(apiUrl);

      if (!response.ok) {
        await bot.deleteMessage(chatId, processingMsg.message_id);
        return bot.sendMessage(chatId, '🌧️ Ubicación no encontrada.');
      }

      const data = await response.json();
      if (data.cod !== 200) {
        throw new Error(data.message || 'Ocurrió un error');
      }

      const location = data.name;
      const country = data.sys.country;
      const weatherDescription = data.weather[0].description;
      const currentTemperature = `${data.main.temp}°C`;
      const minTemperature = `${data.main.temp_min}°C`;
      const maxTemperature = `${data.main.temp_max}°C`;
      const humidity = `${data.main.humidity}%`;
      const windSpeed = `${data.wind.speed} km/h`;

      const weatherMessage = `
🌤️ *Informe meteorológico para ${location}, ${country}* 🌡️

• *Condición:* ${weatherDescription}
• *Temperatura actual:* ${currentTemperature}
• *Máxima:* ${maxTemperature} | *Mínima:* ${minTemperature}
• *Humedad:* ${humidity}
• *Velocidad del viento:* ${windSpeed}

¡Mantente preparado y planifica tu día en consecuencia! ☀️🌧️
      `;

      // Eliminar mensaje de procesamiento y enviar resultado
      await bot.deleteMessage(chatId, processingMsg.message_id);
      const sentMsg = await bot.sendMessage(chatId, weatherMessage, { parse_mode: 'Markdown' });

      // Reacción de éxito
      setTimeout(() => {
        bot.editMessageText('✅ ' + weatherMessage, {
          chat_id: chatId,
          message_id: sentMsg.message_id,
          parse_mode: 'Markdown'
        });
      }, 500);
    } catch (error) {
      log.error(error);
      await bot.sendMessage(chatId, `❌ Hubo un error: ${error.message}`);
    }

  } else if (messageText.match(/^\.+\s*(happymodsearch|hpmodsearch|hpmsearch)/i)) {
    const text = getCommandArgs(messageText, messageText.match(/happymodsearch/i) ? 'happymodsearch' : messageText.match(/hpmodsearch/i) ? 'hpmodsearch' : 'hpmsearch');
    if (!text) {
      bot.sendMessage(chatId, '📩 Ingresa Un Texto Para Buscar En Happy Mod');
      return;
    }

    try {
      const api = `https://dark-core-api.vercel.app/api/search/happymod?key=api&text=${encodeURIComponent(text)}`;
      const response = await fetch(api);
      const json = await response.json();
      const arch = json.results[0];

      if (!arch || arch.length === 0) {
        return bot.sendMessage(chatId, `🍭 No Encontramos Resultados Para : ${text}`);
      }

      const txt = `🍭 *Titulo:* ${arch.name}\n✏️ *Descripción:* ${arch.description}\n🌟 *Estrellas:* ${arch.stars}\n📎 *Link:* ${arch.link}`;
      await bot.sendPhoto(chatId, arch.image, { caption: txt, parse_mode: 'Markdown' });
    } catch (error) {
      log.error(error);
      bot.sendMessage(chatId, `Error: ${error.message}`);
    }
  } else if (messageText.match(/^\.+\s*(loriai|lori)/i)) {
    const text = getCommandArgs(messageText, messageText.match(/loriai/i) ? 'loriai' : 'lori');
    if (!text) {
      bot.sendMessage(chatId, '🍟 Ingresa un texto para hablar con Lori Ai');
      return;
    }

    try {
      const api = await fetch(`https://api.davidcyriltech.my.id/ai/lori?text=${encodeURIComponent(text)}`);
      const json = await api.json();
      if (json.success) {
        await bot.sendMessage(chatId, json.response);
      } else {
        await bot.sendMessage(chatId, '🍟 Hubo un error al obtener la respuesta.');
      }
    } catch (error) {
      log.error(error);
      bot.sendMessage(chatId, '🍟 Ocurrió un error al procesar tu solicitud.');
    }
  } else if (messageText.match(/^\.+\s*mods/i)) {
    bot.sendMessage(chatId, '❌ Este comando ha sido desactivado temporalmente.');
  } else if (messageText.match(/^\.+\s*ytmp4/i)) {
    const url = getCommandArgs(messageText, 'ytmp4');
    if (!url) {
      bot.sendMessage(chatId, '• Ingresa un enlace de YouTube.');
      return;
    }

    try {
      const apiUrl = `https://api.diioffc.web.id/api/download/ytmp4?url=${encodeURIComponent(url)}`;
      const response = await fetch(apiUrl);
      const result = await response.json();

      if (!result.status) throw new Error('No se pudo obtener el video.');

      const { title, thumbnail, views, duration, download } = result.result;
      const info = `• *Título:* ${title}\n• *Vistas:* ${views.toLocaleString()}\n• *Duración:* ${duration.timestamp}`;

      await bot.sendPhoto(chatId, thumbnail, { caption: info, parse_mode: 'Markdown' });
      await bot.sendVideo(chatId, download.url, { caption: title });
    } catch (error) {
      log.error(error);
      bot.sendMessage(chatId, '❌ Error al descargar el video.');
    }
  } else if (messageText.match(/^\.+\s*bingsearch/i)) {
    const query = getCommandArgs(messageText, 'bingsearch');
    if (!query) {
      bot.sendMessage(chatId, '🔍 Ingresa el texto de lo que quieres buscar en imágenes');
      return;
    }

    try {
      // Send initial status message
      const statusMsg = await bot.sendMessage(chatId, '🔎 *Buscando imágenes...*', { parse_mode: 'Markdown' });

      const api = await fetch(`https://delirius-apiofc.vercel.app/search/bingimage?query=${encodeURIComponent(query)}`);
      const json = await api.json();

      if (!json.results || json.results.length === 0) {
        await bot.editMessageText('❌ No se encontraron imágenes para tu búsqueda.', {
          chat_id: chatId,
          message_id: statusMsg.message_id
        });
        return;
      }

      // Delete status message
      await bot.deleteMessage(chatId, statusMsg.message_id);

      // Send header message
      await bot.sendMessage(chatId, `🖼️ *Resultados de búsqueda para:* ${query}\n\n📸 *Mostrando ${Math.min(5, json.results.length)} resultados*`, {
        parse_mode: 'Markdown'
      });

      // Send images with enhanced captions
      for (let item of json.results.slice(0, 5)) {
        const caption = `🏷️ *Título:* ${item.title || 'Sin título'}\n` +
                       `🔍 *Fuente:* [Ver imagen original](${item.source})\n` +
                       `📏 *Dimensiones:* ${item.width || '?'}x${item.height || '?'}\n` +
                       `🏢 *Sitio:* ${item.site || 'Desconocido'}`;

        await bot.sendPhoto(chatId, item.direct, {
          caption: caption,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              { text: '🌐 Ver Fuente', url: item.source }
            ]]
          }
        });
      }
    } catch (error) {
      log.error(error);
      bot.sendMessage(chatId, '❌ Ocurrió un error al buscar las imágenes. Inténtalo de nuevo.');
    }
  } else if (messageText.match(/^\.+\s*joke/i)) {
    try {
      const response = await fetch('https://v2.jokeapi.dev/joke/Any?safe-mode&lang=es');
      const data = await response.json();
      let joke;
      if (data.type === 'single') {
        joke = data.joke;
      } else {
        const pregunta = data.setup.replace(/[?]+/g, '¿$&');
        joke = `${pregunta}\n\n${data.delivery}`;
      }
      await bot.sendMessage(chatId, `😄 *Chiste:*\n\n${joke}`, { parse_mode: 'Markdown' });
    } catch (error) {
      log.error(error);
      bot.sendMessage(chatId, '❌ Error al obtener el chiste.');
    }
  } else if (messageText.match(/^\.+\s*dog/i)) {
    try {
      const response = await fetch('https://dog.ceo/api/breeds/image/random');
      const data = await response.json();
      await bot.sendPhoto(chatId, data.message, { caption: '🐕 *¡Un perrito aleatorio para ti!*', parse_mode: 'Markdown' });
    } catch (error) {
      log.error(error);
      bot.sendMessage(chatId, '❌ Error al obtener la imagen del perrito.');
    }
  } else if (messageText.match(/^\.+\s*waifu/i)) {
    try {
      const response = await fetch('https://api.waifu.pics/sfw/waifu');
      const data = await response.json();
      await bot.sendPhoto(chatId, data.url, { caption: '✨ *¡Aquí tienes tu waifu!*', parse_mode: 'Markdown' });
    } catch (error) {
      log.error(error);
      bot.sendMessage(chatId, '❌ Error al obtener la imagen anime.');
    }
  } else if (messageText.match(/^\.+\s*pixaiart/i)) {
    const query = getCommandArgs(messageText, 'pixaiart');
    if (!query) {
      bot.sendMessage(chatId, '🥞 Ingresa el texto de lo que quieres buscar en pixaiart.');
      return;
    }

    try {
      const api = await fetch(`https://delirius-apiofc.vercel.app/search/pixaiart?query=${encodeURIComponent(query)}`);
      const json = await api.json();

      if (!json.data || json.data.length === 0) {
        return bot.sendMessage(chatId, '🥞 No se encontraron imágenes.');
      }

      // Send images with enhanced formatting
      for (let item of json.data.slice(0, 9)) {
        const caption = `🎨 *Resultados de:* ${query}\n\n` +
                       `◦ *Título:* ${item.title || 'Sin título'}\n` +
                       `◦ *Autor:* ${item.name}\n` +
                       `🔗 [Ver Imagen Original](${item.image})`;
        
        await bot.sendPhoto(chatId, item.image, {
          caption: caption,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              { text: '🌐 Ver Imagen', url: item.image }
            ]]
          }
        });
      }
    } catch (error) {
      log.error(error);
      bot.sendMessage(chatId, 'Ocurrió un error al buscar las imágenes. Inténtalo de nuevo.');
    }
  } else if (messageText.match(/^\.+\s*ban/i)) {
    if (!msg.reply_to_message && !getCommandArgs(messageText, 'ban')) {
      return bot.sendMessage(chatId, '❌ Responde a un mensaje o menciona a un usuario para banearlo.');
    }
    try {
      const userId = msg.reply_to_message?.from.id || msg.entities?.[1]?.user.id;
      const chatMember = await bot.getChatMember(chatId, msg.from.id);

      if (chatMember.status !== 'creator' && chatMember.status !== 'administrator') {
        return bot.sendMessage(chatId, '❌ Solo administradores pueden usar este comando.');
      }

      await bot.banChatMember(chatId, userId);
      bot.sendMessage(chatId, '✅ Usuario baneado exitosamente.');
    } catch (error) {
      log.error(error);
      bot.sendMessage(chatId, '❌ No pude banear al usuario.');
    }
  } else if (messageText.match(/^\.+\s*unban/i)) {
    if (!msg.reply_to_message && !getCommandArgs(messageText, 'unban')) {
      return bot.sendMessage(chatId, '❌ Responde a un mensaje o menciona a un usuario para desbanearlo.');
    }
    try {
      const userId = msg.reply_to_message?.from.id || msg.entities?.[1]?.user.id;
      const chatMember = await bot.getChatMember(chatId, msg.from.id);

      if (chatMember.status !== 'creator' && chatMember.status !== 'administrator') {
        return bot.sendMessage(chatId, '❌ Solo administradores pueden usar este comando.');
      }

      await bot.unbanChatMember(chatId, userId);
      bot.sendMessage(chatId, '✅ Usuario desbaneado exitosamente.');
    } catch (error) {
      log.error(error);
      bot.sendMessage(chatId, '❌ No pude desbanear al usuario.');
    }
  } else if (messageText.match(/^\.+\s*kick/i)) {
    if (!msg.reply_to_message && !getCommandArgs(messageText, 'kick')) {
      return bot.sendMessage(chatId, '❌ Responde a un mensaje o menciona a un usuario para expulsarlo.');
    }
    try {
      const userId = msg.reply_to_message?.from.id || msg.entities?.[1]?.user.id;
      const chatMember = await bot.getChatMember(chatId, msg.from.id);

      if (chatMember.status !== 'creator' && chatMember.status !== 'administrator') {
        return bot.sendMessage(chatId, '❌ Solo administradores pueden usar este comando.');
      }

      await bot.banChatMember(chatId, userId);
      await bot.unbanChatMember(chatId, userId);
      bot.sendMessage(chatId, '✅ Usuario expulsado exitosamente.');
    } catch (error) {
      log.error(error);
      bot.sendMessage(chatId, '❌ No pude expulsar al usuario.');
    }
  } else if (messageText.match(/^\.+\s*mute/i)) {
    if (!msg.reply_to_message && !getCommandArgs(messageText, 'mute')) {
      return bot.sendMessage(chatId, '❌ Responde a un mensaje o menciona a un usuario para silenciarlo.');
    }
    try {
      const userId = msg.reply_to_message?.from.id || msg.entities?.[1]?.user.id;
      const chatMember = await bot.getChatMember(chatId, msg.from.id);

      if (chatMember.status !== 'creator' && chatMember.status !== 'administrator') {
        return bot.sendMessage(chatId, '❌ Solo administradores pueden usar este comando.');
      }

      const untilDate = Math.floor(Date.now() / 1000) + 3600; // 1 hora por defecto
      await bot.restrictChatMember(chatId, userId, {
        can_send_messages: false,
        until_date: untilDate
      });
      bot.sendMessage(chatId, '✅ Usuario silenciado exitosamente.');
    } catch (error) {
      log.error(error);
      bot.sendMessage(chatId, '❌ No pude silenciar al usuario.');
    }
  } else if (messageText.match(/^\.+\s*balance/i)) {
    try {
      const userData = JSON.parse(fs.readFileSync('./userdata.json', 'utf8'));
      const userId = msg.from.id.toString();

      if (!userData[userId]) {
        userData[userId] = {
          coins: 1000,
          pokemon: []
        };
        fs.writeFileSync('./userdata.json', JSON.stringify(userData, null, 2));
      }

      bot.sendMessage(chatId, `💰 Tu balance actual es: ${userData[userId].coins} monedas`);
    } catch (error) {
      log.error(error);
      bot.sendMessage(chatId, '❌ Error al verificar el balance.');
    }
  } else if (messageText.match(/^\.+\s*shop/i)) {
    const shopItems = [
      { id: 1, name: 'Pikachu', price: 1000, level: 5 },
      { id: 2, name: 'Charmander', price: 1200, level: 5 },
      { id: 3, name: 'Bulbasaur', price: 1200, level: 5 },
      { id: 4, name: 'Squirtle', price: 1200, level: 5 },
      { id: 5, name: 'Eevee', price: 1500, level: 5 },
      { id: 6, name: 'Meowth', price: 800, level: 5 },
      { id: 7, name: 'Snorlax', price: 2000, level: 5 },
      { id: 8, name: 'Magikarp', price: 500, level: 5 },
      { id: 9, name: 'Dratini', price: 3000, level: 5 },
      { id: 10, name: 'Poké-comida', price: 100 }
    ];

    let shopText = '🏪 *Tienda de Pokémon*\n\n';
    shopItems.forEach(item => {
      shopText += `${item.id}. ${item.name} - ${item.price} monedas\n`;
    });
    shopText += '\nPara comprar usa: .buy <id>';

    bot.sendMessage(chatId, shopText, { parse_mode: 'Markdown' });
  } else if (messageText.match(/^\.+\s*buy/i)) {
    const itemId = parseInt(getCommandArgs(messageText, 'buy'));
    if (!itemId) {
      return bot.sendMessage(chatId, '❌ Especifica el ID del item a comprar');
    }

    try {
      const userData = JSON.parse(fs.readFileSync('./userdata.json', 'utf8'));
      const userId = msg.from.id.toString();

      if (!userData[userId]) {
        return bot.sendMessage(chatId, '❌ Necesitas iniciar tu cuenta primero con .balance');
      }

      const shopItems = [
        { id: 1, name: 'Pikachu', price: 1000, level: 5 },
        { id: 2, name: 'Charmander', price: 1200, level: 5 },
        { id: 3, name: 'Bulbasaur', price: 1200, level: 5 },
        { id: 4, name: 'Squirtle', price: 1200, level: 5 },
        { id: 5, name: 'Poké-comida', price: 100 }
      ];

      const item = shopItems.find(i => i.id === itemId);
      if (!item) {
        return bot.sendMessage(chatId, '❌ Item no encontrado');
      }

      if (userData[userId].coins < item.price) {
        return bot.sendMessage(chatId, '❌ No tienes suficientes monedas');
      }

      userData[userId].coins -= item.price;

      if (item.id === 5) {
        if (!userData[userId].food) userData[userId].food = 0;
        userData[userId].food += 1;
      } else {
        if (!userData[userId].pokemon) userData[userId].pokemon = [];
        userData[userId].pokemon.push({
          name: item.name,
          level: item.level,
          exp: 0,
          hunger: 100
        });
      }

      fs.writeFileSync('./userdata.json', JSON.stringify(userData, null, 2));
      bot.sendMessage(chatId, `✅ Has comprado ${item.name} por ${item.price} monedas`);
    } catch (error) {
      log.error(error);
      bot.sendMessage(chatId, '❌ Error al realizar la compra');
    }
  } else if (messageText.match(/^\.+\s*pokemon/i)) {
    try {
      const userData = JSON.parse(fs.readFileSync('./userdata.json', 'utf8'));
      const userId = msg.from.id.toString();

      if (!userData[userId] || !userData[userId].pokemon || userData[userId].pokemon.length === 0) {
        return bot.sendMessage(chatId, '❌ No tienes ningún Pokémon');
      }

      let pokemonList = '🐾 *Tus Pokémon*\n\n';
      userData[userId].pokemon.forEach((pokemon, index) => {
        pokemonList += `${index + 1}. ${pokemon.name}\n`;
        pokemonList += `   Nivel: ${pokemon.level}\n`;
        pokemonList += `   EXP: ${pokemon.exp}\n`;
        pokemonList += `   Hambre: ${pokemon.hunger}%\n\n`;
      });

      bot.sendMessage(chatId, pokemonList, { parse_mode: 'Markdown' });
    } catch (error) {
      log.error(error);
      bot.sendMessage(chatId, '❌ Error al mostrar tus Pokémon');
    }
  } else if (messageText.match(/^\.+\s*feed/i)) {
    const pokemonIndex = parseInt(getCommandArgs(messageText, 'feed')) - 1;

    try {
      const userData = JSON.parse(fs.readFileSync('./userdata.json', 'utf8'));
      const userId = msg.from.id.toString();

      if (!userData[userId] || !userData[userId].pokemon || !userData[userId].pokemon[pokemonIndex]) {
        return bot.sendMessage(chatId, '❌ Pokémon no encontrado');
      }

      if (!userData[userId].food || userData[userId].food <= 0) {
        return bot.sendMessage(chatId, '❌ No tienes Poké-comida');
      }

      userData[userId].food -= 1;
      userData[userId].pokemon[pokemonIndex].hunger = 100;
      userData[userId].pokemon[pokemonIndex].exp += 10;

      if (userData[userId].pokemon[pokemonIndex].exp >= 100) {
        userData[userId].pokemon[pokemonIndex].level += 1;
        userData[userId].pokemon[pokemonIndex].exp = 0;
        bot.sendMessage(chatId, `🎉 ¡Tu ${userData[userId].pokemon[pokemonIndex].name} subió al nivel ${userData[userId].pokemon[pokemonIndex].level}!`);
      }

      fs.writeFileSync('./userdata.json', JSON.stringify(userData, null, 2));
      bot.sendMessage(chatId, `✅ Has alimentado a ${userData[userId].pokemon[pokemonIndex].name}`);
    } catch (error) {
      log.error(error);
      bot.sendMessage(chatId, '❌ Error al alimentar al Pokémon');
    }
  } else if (messageText.match(/^\.+\s*train/i)) {
    const pokemonIndex = parseInt(getCommandArgs(messageText, 'train')) - 1;

    try {
      const userData = JSON.parse(fs.readFileSync('./userdata.json', 'utf8'));
      const userId = msg.from.id.toString();

      if (!userData[userId] || !userData[userId].pokemon || !userData[userId].pokemon[pokemonIndex]) {
        return bot.sendMessage(chatId, '❌ Pokémon no encontrado');
      }

      const pokemon = userData[userId].pokemon[pokemonIndex];
      const trainMsg = await bot.sendMessage(chatId, `🏋️‍♂️ Iniciando entrenamiento con ${pokemon.name}...`);

      await new Promise(resolve => setTimeout(resolve, 1500));
      await bot.editMessageText(`💪 ${pokemon.name} está haciendo ejercicios...`, { chat_id: chatId, message_id: trainMsg.message_id });

      await new Promise(resolve => setTimeout(resolve, 1500));
      await bot.editMessageText(`🎯 ${pokemon.name} practica sus ataques...`, { chat_id: chatId, message_id: trainMsg.message_id });

      pokemon.exp += 25;
      pokemon.hunger -= 20;

      if (pokemon.exp >= 100) {
        pokemon.level += 1;
        pokemon.exp = 0;
        await bot.sendMessage(chatId, `🌟 ¡${pokemon.name} ha subido al nivel ${pokemon.level}!`);
      }

      fs.writeFileSync('./userdata.json', JSON.stringify(userData, null, 2));
      await bot.editMessageText(`✅ Entrenamiento completado:\n\n📊 ${pokemon.name}\n💫 EXP: +25\n🍖 Hambre: -20%\n📈 Nivel actual: ${pokemon.level}`, { chat_id: chatId, message_id: trainMsg.message_id });
    } catch (error) {
      log.error(error);
      bot.sendMessage(chatId, '❌ Error al entrenar al Pokémon');
    }
  } else if (messageText.match(/^\.+\s*daily/i)) {
    try {
      const userData = JSON.parse(fs.readFileSync('./userdata.json', 'utf8'));
      const userId = msg.from.id.toString();

      if (!userData[userId]) {
        userData[userId] = { coins: 0, pokemon: [], lastDaily: 0 };
      }

      const now = Date.now();
      const lastDaily = userData[userId].lastDaily || 0;
      const cooldown = 24 * 60 * 60 * 1000; // 24 hours

      if (now - lastDaily < cooldown) {
        const remaining = Math.ceil((cooldown - (now - lastDaily)) / (1000 * 60 * 60));
        return bot.sendMessage(chatId, `❌ Debes esperar ${remaining} horas para reclamar tu recompensa diaria.`);
      }

      const reward = 500;
      userData[userId].coins += reward;
      userData[userId].lastDaily = now;

      fs.writeFileSync('./userdata.json', JSON.stringify(userData, null, 2));
      bot.sendMessage(chatId, `✅ Has reclamado ${reward} monedas como recompensa diaria.`);
    } catch (error) {
      log.error(error);
      bot.sendMessage(chatId, '❌ Error al reclamar la recompensa diaria.');
    }
  } else if (messageText.match(/^\.+\s*rob/i)) {
    if (!msg.reply_to_message) {
      return bot.sendMessage(chatId, '❌ Responde al mensaje del usuario que quieres robar');
    }

    try {
      const userData = JSON.parse(fs.readFileSync('./userdata.json', 'utf8'));
      const userId = msg.from.id.toString();
      const targetId = msg.reply_to_message.from.id.toString();

      if (!userData[userId] || !userData[targetId]) {
        return bot.sendMessage(chatId, '❌ Ambos usuarios necesitan tener una cuenta.');
      }

      const now = Date.now();
      const lastRob = userData[userId].lastRob || 0;
      const cooldown = 30 * 60 * 1000; // 30 minutes

      if (now - lastRob < cooldown) {
        const remaining = Math.ceil((cooldown - (now - lastRob)) / (1000 * 60));
        return bot.sendMessage(chatId, `❌ Debes esperar ${remaining} minutos para robar de nuevo.`);
      }

      const success = Math.random() < 0.4; // 40% chance
      if (success) {
        const amount = Math.floor(Math.random() * 200) + 100;
        if (userData[targetId].coins < amount) return bot.sendMessage(chatId, '❌ El usuario no tiene suficientes monedas.');

        userData[targetId].coins -= amount;
        userData[userId].coins += amount;
        bot.sendMessage(chatId, `🦹‍♂️ Has robado ${amount} monedas exitosamente.`);
      } else {
        const fine = Math.floor(Math.random() * 100) + 50;
        userData[userId].coins -= fine;
        bot.sendMessage(chatId, `👮‍♂️ Te han atrapado y has pagado una multa de ${fine} monedas.`);
      }

      userData[userId].lastRob = now;
      fs.writeFileSync('./userdata.json', JSON.stringify(userData, null, 2));
    } catch (error) {
      log.error(error);
      bot.sendMessage(chatId, '❌ Error al intentar robar.');
    }
  } else if (messageText.match(/^\.+\s*work/i)) {
    try {
      const userData = JSON.parse(fs.readFileSync('./userdata.json', 'utf8'));
      const userId = msg.from.id.toString();

      if (!userData[userId]) {
        userData[userId] = { coins: 0, pokemon: [], lastWork: 0 };
      }

      const now = Date.now();
      const lastWork = userData[userId].lastWork || 0;
      const cooldown = 60 * 60 * 1000; // 1 hour

      if (now - lastWork < cooldown) {
        const remaining = Math.ceil((cooldown - (now - lastWork)) / (1000 * 60));
        return bot.sendMessage(chatId, `❌ Debes descansar ${remaining} minutos antes de trabajar de nuevo.`);
      }

      const jobs = [
        { name: 'programador', pay: 300 },
        { name: 'chef', pay: 250 },
        { name: 'profesor', pay: 200 },
        { name: 'vendedor', pay: 150 },
        { name: 'repartidor', pay: 100 }
      ];

      const job = jobs[Math.floor(Math.random() * jobs.length)];
      userData[userId].coins += job.pay;
      userData[userId].lastWork = now;

      fs.writeFileSync('./userdata.json', JSON.stringify(userData, null, 2));
      bot.sendMessage(chatId, `💼 Has trabajado como ${job.name} y ganaste ${job.pay} monedas.`);
    } catch (error) {
      log.error(error);
      bot.sendMessage(chatId, '❌ Error al trabajar.');
    }
  } else if (messageText.match(/^\.+\s*crime/i)) {
    try {
      const userData = JSON.parse(fs.readFileSync('./userdata.json', 'utf8'));
      const userId = msg.from.id.toString();

      if (!userData[userId]) {
        userData[userId] = { coins: 0, pokemon: [], lastCrime: 0 };
      }

      const now = Date.now();
      const lastCrime = userData[userId].lastCrime || 0;
      const cooldown = 2 * 60 * 60 * 1000; // 2 hours

      if (now - lastCrime < cooldown) {
        const remaining = Math.ceil((cooldown - (now - lastCrime)) / (1000 * 60));
        return bot.sendMessage(chatId, `❌ Debes esperar ${remaining} minutos antes de cometer otro crimen.`);
      }

      const success = Math.random() < 0.5;
      if (success) {
        const amount = Math.floor(Math.random() * 400) + 200;
        userData[userId].coins += amount;
        bot.sendMessage(chatId, `🦹‍♂️ Tu crimen fue exitoso y ganaste ${amount} monedas.`);
      } else {
        const fine = Math.floor(Math.random() * 200) + 100;
        userData[userId].coins -= fine;
        bot.sendMessage(chatId, `👮‍♂️ Te atraparon y pagaste una multa de ${fine} monedas.`);
      }

      userData[userId].lastCrime = now;
      fs.writeFileSync('./userdata.json', JSON.stringify(userData, null, 2));
    } catch (error) {
      log.error(error);
      bot.sendMessage(chatId, '❌ Error al cometer el crimen.');
    }
  } else if (messageText.match(/^\.+\s*battle/i)) {
    if (!msg.reply_to_message) {
      return bot.sendMessage(chatId, '❌ Responde al mensaje del usuario contra el que quieres luchar');
    }

    try {
      const userData = JSON.parse(fs.readFileSync('./userdata.json', 'utf8'));
      const userId1 = msg.from.id.toString();
      const userId2 = msg.reply_to_message.from.id.toString();

      if (!userData[userId1]?.pokemon?.length || !userData[userId2]?.pokemon?.length) {
        return bot.sendMessage(chatId, '❌ Ambos usuarios necesitan tener Pokémon para luchar');
      }

      const pokemon1 = userData[userId1].pokemon[0];
      const pokemon2 = userData[userId2].pokemon[0];

      const battleMsg = await bot.sendMessage(chatId, `⚡️ ¡Batalla Pokémon iniciada!\n\n${pokemon1.name} Nivel ${pokemon1.level} 🆚 ${pokemon2.name} Nivel ${pokemon2.level}`);

      await new Promise(resolve => setTimeout(resolve, 1500));
      await bot.editMessageText(`🔥 ¡${pokemon1.name} usa su ataque especial!`, { chat_id: chatId, message_id: battleMsg.message_id });

      await new Promise(resolve => setTimeout(resolve, 1500));
      await bot.editMessageText(`💫 ¡${pokemon2.name} contraataca!`, { chat_id: chatId, message_id: battleMsg.message_id });

      await new Promise(resolve => setTimeout(resolve, 1500));
      const winner = Math.random() * (pokemon1.level + pokemon2.level) < pokemon1.level ? userId1 : userId2;
      const winnerPokemon = winner === userId1 ? pokemon1 : pokemon2;
      const loserPokemon = winner === userId1 ? pokemon2 : pokemon1;

      userData[winner].coins += 100;
      if (winner === userId1) {
        pokemon1.exp += 50;
        if (pokemon1.exp >= 100) {
          pokemon1.level += 1;
          pokemon1.exp = 0;
          await bot.sendMessage(chatId, `🌟 ¡${pokemon1.name} ha subido al nivel ${pokemon1.level}!`);
        }
      } else {
        pokemon2.exp += 50;
        if (pokemon2.exp >= 100) {
          pokemon2.level += 1;
          pokemon2.exp = 0;
          await bot.sendMessage(chatId, `🌟 ¡${pokemon2.name} ha subido al nivel ${pokemon2.level}!`);
        }
      }

      fs.writeFileSync('./userdata.json', JSON.stringify(userData, null, 2));
      await bot.editMessageText(`🏆 ¡${winnerPokemon.name} ha derrotado a ${loserPokemon.name}!\n\n💰 Su entrenador recibe 100 monedas\n✨ EXP ganada: 50`, { chat_id: chatId, message_id: battleMsg.message_id });
    } catch (error) {
      log.error(error);
      bot.sendMessage(chatId, '❌ Error al realizar la batalla');
    }
  } else if (messageText.match(/^\.+\s*leave/i)) {
    // Verificar si el comando lo ejecuta el dueño del bot
    if (msg.from.username === 'carlossss' || msg.from.phone_number === '+5355699866') {
      try {
        await bot.sendMessage(chatId, '👋 Adiós! El bot abandonará el grupo por orden del dueño.');
        await bot.leaveChat(chatId);
      } catch (error) {
        log.error(error);
        bot.sendMessage(chatId, '❌ No pude abandonar el grupo.');
      }
    } else {
      bot.sendMessage(chatId, '❌ Solo el dueño del bot puede usar este comando.');
    }
  } else if (messageText.match(/^\.+\s*deposit/i)) {
    const amount = parseInt(getCommandArgs(messageText, 'deposit'));
    if (!amount || amount <= 0) {
      return bot.sendMessage(chatId, '❌ Especifica una cantidad válida para depositar.\n\nEjemplo: .deposit 500');
    }

    try {
      const userData = JSON.parse(fs.readFileSync('./userdata.json', 'utf8'));
      const userId = msg.from.id.toString();

      if (!userData[userId]) {
        return bot.sendMessage(chatId, '❌ Necesitas crear una cuenta primero con .balance');
      }

      if (!userData[userId].bank) userData[userId].bank = 0;

      if (userData[userId].coins < amount) {
        return bot.sendMessage(chatId, '❌ No tienes suficientes monedas para depositar');
      }

      userData[userId].coins -= amount;
      userData[userId].bank += amount;

      fs.writeFileSync('./userdata.json', JSON.stringify(userData, null, 2));
      bot.sendMessage(chatId, `🏦 Has depositado ${amount} monedas en el banco.\n💰 Balance del banco: ${userData[userId].bank} monedas`);
    } catch (error) {
      log.error(error);
      bot.sendMessage(chatId, '❌ Error al depositar monedas');
    }
  } else if (messageText.match(/^\.+\s*withdraw/i)) {
    const amount = parseInt(getCommandArgs(messageText, 'withdraw'));
    if (!amount || amount <= 0) {
      return bot.sendMessage(chatId, '❌ Especifica una cantidad válida para retirar.\n\nEjemplo: .withdraw 500');
    }

    try {
      const userData = JSON.parse(fs.readFileSync('./userdata.json', 'utf8'));
      const userId = msg.from.id.toString();

      if (!userData[userId] || !userData[userId].bank) {
        return bot.sendMessage(chatId, '❌ No tienes monedas en el banco');
      }

      if (userData[userId].bank < amount) {
        return bot.sendMessage(chatId, '❌ No tienes suficientes monedas en el banco');
      }

      userData[userId].bank -= amount;
      userData[userId].coins += amount;

      fs.writeFileSync('./userdata.json', JSON.stringify(userData, null, 2));
      bot.sendMessage(chatId, `🏦 Has retirado ${amount} monedas del banco.\n💰 Balance del banco: ${userData[userId].bank} monedas`);
    } catch (error) {
      log.error(error);
      bot.sendMessage(chatId, '❌ Error al retirar monedas');
    }
  } else if (messageText.match(/^\.+\s*bank/i)) {
    try {
      const userData = JSON.parse(fs.readFileSync('./userdata.json', 'utf8'));
      const userId = msg.from.id.toString();

      if (!userData[userId]) {
        return bot.sendMessage(chatId, '❌ Necesitas crear una cuenta primero con .balance');
      }

      if (!userData[userId].bank) userData[userId].bank = 0;

      bot.sendMessage(chatId, `🏦 *Tu cuenta bancaria*\n\n💰 Balance en el banco: ${userData[userId].bank} monedas\n💳 Balance en mano: ${userData[userId].coins} monedas`, { parse_mode: 'Markdown' });
    } catch (error) {
      log.error(error);
      bot.sendMessage(chatId, '❌ Error al consultar el banco');
    }
  } else if (messageText.match(/^\.+\s*sticker/i)) {
    if (!msg.reply_to_message?.photo) {
      return bot.sendMessage(chatId, '❌ Responde a una imagen con .sticker para convertirla en sticker');
    }
    try {
      const photo = msg.reply_to_message.photo[msg.reply_to_message.photo.length - 1];
      const file = await bot.getFile(photo.file_id);
      const filePath = file.file_path;

      const response = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`);
      const buffer = await response.buffer();

      await bot.sendSticker(chatId, buffer);
    } catch (error) {
      log.error(error);
      bot.sendMessage(chatId, '❌ Error al crear el sticker');
    }
  } else if (messageText.match(/^\.+\s*ppt/i)) {
    const options = ['piedra', 'papel', 'tijeras'];
    const botChoice = options[Math.floor(Math.random() * options.length)];
    const userChoice = getCommandArgs(messageText, 'ppt')?.toLowerCase();

    if (!userChoice || !options.includes(userChoice)) {
      return bot.sendMessage(chatId, '❌ Usa: .ppt piedra/papel/tijeras');
    }

    let result;
    if (userChoice === botChoice) {
      result = '🤝 ¡Empate!';
    } else if (
      (userChoice === 'piedra' && botChoice === 'tijeras') ||
      (userChoice === 'papel' && botChoice === 'piedra') ||
      (userChoice === 'tijeras' && botChoice === 'papel')
    ) {
      result = '🎉 ¡Ganaste!';
    } else {
      result = '😢 ¡Perdiste!';
    }

    bot.sendMessage(chatId, `Tu elección: ${userChoice}\nMi elección: ${botChoice}\n\n${result}`);
  } else if (messageText.match(/^\.+\s*fish|pesca/i)) {
    try {
      const userData = JSON.parse(fs.readFileSync('./userdata.json', 'utf8'));
      const userId = msg.from.id.toString();

      if (!userData[userId]) {
        userData[userId] = { coins: 1000, inventory: {} };
      }
      if (!userData[userId].inventory) userData[userId].inventory = {};

      const now = Date.now();
      const lastFish = userData[userId].lastFish || 0;
      const cooldown = 3 * 60 * 1000; // 3 minutos

      if (now - lastFish < cooldown) {
        const remaining = Math.ceil((cooldown - (now - lastFish)) / 1000);
        return bot.sendMessage(chatId, `🎣 Debes esperar ${remaining} segundos para pescar de nuevo.`);
      }

      const items = [
        { name: '🐟 Pez común', value: 20, chance: 0.4 },
        { name: '🐠 Pez tropical', value: 40, chance: 0.25 },
        { name: '🦈 Tiburón', value: 100, chance: 0.15 },
        { name: '👑 Pez dorado', value: 200, chance: 0.1 },
        { name: '🗑️ Basura', value: 1, chance: 0.1 }
      ];

      const rand = Math.random();
      let cumulative = 0;
      let caught = null;

      for (const item of items) {
        cumulative += item.chance;
        if (rand <= cumulative) {
          caught = item;
          break;
        }
      }

      userData[userId].lastFish = now;
      userData[userId].inventory[caught.name] = (userData[userId].inventory[caught.name] || 0) + 1;
      userData[userId].coins += caught.value;

      fs.writeFileSync('./userdata.json', JSON.stringify(userData, null, 2));

      bot.sendMessage(chatId, `🎣 ¡Has pescado un ${caught.name}!\n💰 Valor: ${caught.value} monedas`);
    } catch (error) {
      log.error(error);
      bot.sendMessage(chatId, '❌ Error al pescar.');
    }
  } else if (messageText.match(/^\.+\s*inventory|inventario/i)) {
    try {
      const userData = JSON.parse(fs.readFileSync('./userdata.json', 'utf8'));
      const userId = msg.from.id.toString();

      if (!userData[userId] || !userData[userId].inventory) {
        return bot.sendMessage(chatId, '📦 Tu inventario está vacío.');
      }

      let inventory = '📦 *Tu Inventario:*\n\n';
      for (const [item, quantity] of Object.entries(userData[userId].inventory)) {
        inventory += `${item}: ${quantity}\n`;
      }

      bot.sendMessage(chatId, inventory, { parse_mode: 'Markdown' });
    } catch (error) {
      log.error(error);
      bot.sendMessage(chatId, '❌ Error al mostrar el inventario.');
    }
  } else if (messageText.match(/^\.+\s*slots|tragamonedas/i)) {
    try {
      const userData = JSON.parse(fs.readFileSync('./userdata.json', 'utf8'));
      const userId = msg.from.id.toString();
      const bet = 50;

      if (!userData[userId] || userData[userId].coins < bet) {
        return bot.sendMessage(chatId, `❌ Necesitas al menos ${bet} monedas para jugar.`);
      }

      const symbols = ['🍒', '🍊', '🍋', '💎', '7️⃣'];
      const result = Array(3).fill().map(() => symbols[Math.floor(Math.random() * symbols.length)]);

      let winnings = 0;
      if (result[0] === result[1] && result[1] === result[2]) {
        winnings = bet * (result[0] === '7️⃣' ? 10 : 5);
      } else if (result[0] === result[1] || result[1] === result[2]) {
        winnings = bet * 2;
      }

      userData[userId].coins += (winnings - bet);
      fs.writeFileSync('./userdata.json', JSON.stringify(userData, null, 2));

      const resultMessage = `🎰 *Tragamonedas*\n\n${result.join(' ')}\n\n${winnings > 0 ? `¡Ganaste ${winnings} monedas!` : `Perdiste ${bet} monedas.`}`;
      bot.sendMessage(chatId, resultMessage, { parse_mode: 'Markdown' });
    } catch (error) {
      log.error(error);
      bot.sendMessage(chatId, '❌ Error en el juego de tragamonedas.');
    }

  } else if (messageText.match(/^\.+\s*g(ithub|h)s(earch)?/i)) {
    const query = getCommandArgs(messageText, messageText.match(/githubsearch/i) ? 'githubsearch' : 'ghs');
    if (!query) {
      bot.sendMessage(chatId, '🚩 Ingresa el término de búsqueda en GitHub.\n\nEjemplo: .githubsearch Shizuka-AI');
      return;
    }

    try {
      const processingMsg = await bot.sendMessage(chatId, '🕓 Buscando repositorios...');

      const res = await fetch('https://api.github.com/search/repositories?' + new URLSearchParams({ q: query }));
      const json = await res.json();

      if (res.status !== 200) throw json;

      if (json.items && json.items.length > 0) {
        let txt = '`乂  G I T H U B  -  B Ú S Q U E D A`\n\n';
        
        json.items.slice(0, 5).forEach((repo, i) => {
          txt += `    ✩  *Nro* : ${i + 1}\n`;
          txt += `    ✩  *Nombre del Repositorio* : ${repo.full_name}\n`;
          txt += `    ✩  *URL* : ${repo.html_url}\n`;
          txt += `    ✩  *Creado en* : ${new Date(repo.created_at).toLocaleDateString()}\n`;
          txt += `    ✩  *Última actualización* : ${new Date(repo.updated_at).toLocaleDateString()}\n`;
          txt += `    ✩  *Watchers* : ${repo.watchers}\n`;
          txt += `    ✩  *Forks* : ${repo.forks}\n`;
          txt += `    ✩  *Estrellas* : ${repo.stargazers_count}\n`;
          txt += `    ✩  *Issues Abiertos* : ${repo.open_issues}\n`;
          txt += `    ✩  *Descripción* : ${repo.description || 'Sin descripción'}\n`;
          txt += `    ✩  *Clone* : \`\`\`$ git clone ${repo.clone_url}\`\`\`\n\n`;
        });

        await bot.deleteMessage(chatId, processingMsg.message_id);
        await bot.sendMessage(chatId, txt, { parse_mode: 'Markdown' });
      } else {
        await bot.deleteMessage(chatId, processingMsg.message_id);
        await bot.sendMessage(chatId, 'No se encontraron repositorios para esta búsqueda.');
      }
    } catch (error) {
      log.error(error);
      await bot.sendMessage(chatId, 'Hubo un error al procesar la solicitud. Intenta de nuevo más tarde.');
    }
} else if (messageText.match(/^\.+\s*unmute/i)) {
    if (!msg.reply_to_message && !getCommandArgs(messageText, 'unmute')) {
      return bot.sendMessage(chatId, '❌ Responde a un mensaje o menciona a un usuario para quitarle el silencio.');
    }
    try {
      const userId = msg.reply_to_message?.from.id || msg.entities?.[1]?.user.id;
      const chatMember = await bot.getChatMember(chatId, msg.from.id);

      if (chatMember.status !== 'creator' && chatMember.status !== 'administrator') {
        return bot.sendMessage(chatId, '❌ Solo administradores pueden usar este comando.');
      }

      await bot.restrictChatMember(chatId, userId, {
        can_send_messages: true,
        can_send_media_messages: true,
        can_send_other_messages: true,
        can_add_web_page_previews: true
      });
      bot.sendMessage(chatId, '✅ Se ha quitado el silencio al usuario.');
    } catch (error) {
      log.error(error);
      bot.sendMessage(chatId, '❌ No pude quitar el silencio al usuario.');
    }
  } else if (messageText.match(/^\.+\s*apksearch/i)) {
    const query = getCommandArgs(messageText, 'apksearch');
    if (!query) {
      bot.sendMessage(chatId, '🔍 Ingresa el nombre de la APK que quieres buscar');
      return;
    }

    try {
      const api = await fetch(`https://dark-core-api.vercel.app/api/search/APKDetails?key=user1&query=${encodeURIComponent(query)}`);
      const json = await api.json();

      if (!json.success || !json.data.length) {
        return bot.sendMessage(chatId, '❌ No se encontraron resultados.');
      }

      for (let apk of json.data) {
        const caption = `📱 *APK Encontrada*\n\n` +
                       `• *Nombre:* ${apk.title}\n` +
                       `• *Versión:* ${apk.version}\n` +
                       `• *Desarrollador:* ${apk.developer}\n\n` +
                       `Para descargar usa:\n.apkdroid ${apk.link}`;

        await bot.sendPhoto(chatId, apk.imageUrl, {
          caption: caption,
          parse_mode: 'Markdown'
        });
      }
    } catch (error) {
      log.error(error);
      bot.sendMessage(chatId, '❌ Ocurrió un error al buscar la APK.');
    }
  } else if (messageText.match(/^\.+\s*apkdroid/i)) {
    const url = getCommandArgs(messageText, 'apkdroid');
    if (!url) {
      bot.sendMessage(chatId, '📥 *Ingresa la URL de la APK que quieres descargar.*', { parse_mode: 'Markdown' });
      return;
    }

    try {
      const processingMsg = await bot.sendMessage(chatId, '⏳ *Procesando APK...*', { parse_mode: 'Markdown' });
      
      const apiUrl = `https://dark-core-api.vercel.app/api/download/getapk?key=user1&url=${encodeURIComponent(url)}`;
      const res = await fetch(apiUrl);
      const json = await res.json();

      if (!json.success) {
        await bot.deleteMessage(chatId, processingMsg.message_id);
        return bot.sendMessage(chatId, '❌ *Error, no se encontraron resultados.*', { parse_mode: 'Markdown' });
      }

      const { title, version, category, downloadLink } = json.data;
      const caption = `📱 *APK Descargada*\n\n• *Nombre:* ${title}\n• *Versión:* ${version}\n• *Categoría:* ${category}`;

      await bot.deleteMessage(chatId, processingMsg.message_id);
      await bot.sendDocument(chatId, downloadLink, {
        caption: caption,
        parse_mode: 'Markdown',
        fileName: `${title}.apk`
      });
    } catch (error) {
      log.error(error);
      bot.sendMessage(chatId, '❌ *Error al procesar la solicitud.*', { parse_mode: 'Markdown' });
    }
  } else {
    // Si es un chat privado y no es un comando, responder como IA
    if (msg.chat.type === 'private') {
      // Simular el comando .ia
      try {
        const userData = JSON.parse(fs.readFileSync('./userdata.json', 'utf8'));
        const userId = msg.from.id.toString();

        if (!userData[userId]) {
          userData[userId] = [{
            role: 'system',
            content: `Tomarás el rol de un bot de Telegram creado por Carlos. Tu nombre sera Shizuka, Tu idioma es el español, pero puedes responder en diferentes idiomas. tiene este rol que chat divertido con exploit incluido osea los quiere dices es que este rol solo es humor, divertido, no que tome nada real, tu respuesta sera divertida, humor, y usar mucho emojis en tu respuesta.

"general risa el chat por que este rol actúal más como simsimi" Chatbot no chatgpt. 

los quiere dices que tu respuesta sera humor puro, risa y un poco de amor .`
          }];
        }

        userData[userId].push({ role: 'user', content: messageText });

        const conversationText = userData[userId].map(msg => 
          msg.role === 'system' ? `Sistema: ${msg.content}\n\n`
          : msg.role === 'user' ? `Usuario: ${msg.content}\n\n`
          : `${msg.content}\n\n`
        ).join('');

        const data = JSON.stringify({
          contents: [{ parts: [{ text: conversationText }] }]
        });

        const options = {
          hostname: 'generativelanguage.googleapis.com',
          path: `/v1beta/models/gemini-1.5-flash:generateContent?key=${config.GEMINI_API_KEY}`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data)
          }
        };

        const thinkingMsg = await bot.sendMessage(chatId, '🤔 Pensando...');

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
                userData[userId].push({ role: 'assistant', content: replyText });
                fs.writeFileSync('./userdata.json', JSON.stringify(userData, null, 2));
                await bot.deleteMessage(chatId, thinkingMsg.message_id);
                await bot.sendMessage(chatId, replyText, { parse_mode: 'Markdown' });
              } else {
                await bot.deleteMessage(chatId, thinkingMsg.message_id);
                await bot.sendMessage(chatId, '❌ La IA no envió una respuesta válida.');
              }
            } catch (error) {
              log.error(error);
              await bot.sendMessage(chatId, `❌ Error al procesar la respuesta: ${error.message}`);
            }
          });
        });

        req.on('error', async (error) => {
          log.error(error);
          await bot.sendMessage(chatId, `❌ Error de conexión con la IA: ${error.message}`);
        });

        req.write(data);
        req.end();
      } catch (error) {
        log.error(error);
        await bot.sendMessage(chatId, `❌ Error al procesar la solicitud: ${error.message}`);
      }
    } else {
      // Check for group links and delete if admin
      const isGroupLink = messageText.match(/(?:https?:\/\/)?(?:www\.)?(?:(?:chat\.whatsapp\.com)|(?:discord\.gg)|(?:t\.me\/joinchat))\/[^\s]+/i);
      if (isGroupLink) {
      try {
        const chatMember = await bot.getChatMember(chatId, fromId);
        if (chatMember.status === 'administrator' || chatMember.status === 'creator') {
          await bot.deleteMessage(chatId, msg.message_id);
          log.info(`Mensaje con enlace de grupo eliminado por el administrador ${msg.from.first_name} en el chat ${chatId}`);
        }
      } catch (error) {
        log.error(`Error al verificar permisos o eliminar mensaje: ${error.message}`);
      }
    }
    }
  }
});



// Importar node-schedule
import schedule from 'node-schedule';

// Configurar mensajes programados
const morningJob = schedule.scheduleJob('0 8 * * *', async () => {
  try {
    const userData = JSON.parse(fs.readFileSync('./userdata.json', 'utf8'));
    const groups = Object.keys(userData).filter(id => id.startsWith('-')); // IDs de grupos empiezan con -

    const morningMessage = `🌅 *¡Buenos días a todos!*\n\n` +
      `Que tengan un día lleno de energía y buena suerte. ` +
      `¡Que todos sus objetivos se cumplan! ✨\n\n` +
      `Recuerden mantener una actitud positiva y sonreír. 😊`;

    for (const groupId of groups) {
      try {
        await bot.sendMessage(groupId, morningMessage, { parse_mode: 'Markdown' });
      } catch (error) {
        log.error(`Error enviando mensaje de la mañana al grupo ${groupId}:`, error);
      }
    }
  } catch (error) {
    log.error('Error en el mensaje programado de la mañana:', error);
  }
});

const nightJob = schedule.scheduleJob('0 22 * * *', async () => {
  try {
    const userData = JSON.parse(fs.readFileSync('./userdata.json', 'utf8'));
    const groups = Object.keys(userData).filter(id => id.startsWith('-'));

    const nightMessage = `🌙 *¡Buenas noches!*\n\n` +
      `Es hora de descansar y recargar energías para mañana. ` +
      `Que tengan dulces sueños. 💫\n\n` +
      `¡Nos vemos mañana con más energía! 😴`;

    for (const groupId of groups) {
      try {
        await bot.sendMessage(groupId, nightMessage, { parse_mode: 'Markdown' });
      } catch (error) {
        log.error(`Error enviando mensaje de la noche al grupo ${groupId}:`, error);
      }
    }
  } catch (error) {
    log.error('Error en el mensaje programado de la noche:', error);
  }
});

log.info('Bot iniciado y listo para usar! 🚀');

// Manejador de callbacks para los botones del menú
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;

  const menus = {
    menu_admin: {
      title: '👥 Menú de Administración',
      commands: [
        '*.invocar* - Mencionar a todos los miembros',
        '*.ban* _@usuario_ - Banear usuario',
        '*.unban* _@usuario_ - Desbanear usuario',
        '*.kick* _@usuario_ - Expulsar usuario',
        '*.mute* _@usuario_ - Silenciar usuario',
        '*.unmute* _@usuario_ - Quitar silencio',
        '*.leave* - Hacer que el bot abandone el grupo'
      ]
    },
    menu_basic: {
      title: '🤖 Comandos Básicos',
      commands: [
        '*.start* - Iniciar el bot',
        '*.menu* - Mostrar este menú',
        '*.clima* _ubicación_ - Ver el clima',
        '*.joke* - Chiste aleatorio',
        '*.dog* - Foto aleatoria de perrito',
        '*.waifu* - Imagen anime aleatoria',
        '*.ppt* _opción_ - Jugar piedra, papel o tijeras',
        '*.sticker* - Convertir imagen a sticker'
      ]
    },
    menu_ai: {
      title: '🧠 Inteligencia Artificial',
      commands: [
        '*.llama* _pregunta_ - Llama AI',
        '*.ia* _pregunta_ - Gemini AI',
        '*.mistral* _pregunta_ - MistralNemo AI',
        '*.lilychan* _texto_ - LilyChan AI',
        '*.lori* _texto_ - Lori AI',
        '*.contractgpt* _texto_ - Contract GPT',
        '*.dalle* _prompt_ - Generar imagen'
      ]
    },
    menu_downloads: {
      title: '📥 Descargas',
      commands: [
        '*.ytmp3* _url_ - Audio de YouTube',
        '*.ytmp4* _url_ - Video de YouTube',
        '*.tiktok* _url_ - Videos de TikTok',
        '*.twitterdl* _url_ - Contenido de Twitter',
        '*.xdl* _url_ - Alternativa para Twitter',
        '*.apkdroid* _url_ - Descargar APK'
      ]
    },
    menu_search: {
      title: '🔍 Búsquedas',
      commands: [
        '*.playstore* _app_ - Apps en Play Store',
        '*.tiktoksearch* _texto_ - Videos en TikTok',
        '*.bingsearch* _texto_ - Imágenes en Bing',
        '*.pixaiart* _texto_ - Arte en PixaiArt',
        '*.wallpaper* _texto_ - Fondos de pantalla',
        '*.tenor* _texto_ - GIFs en Tenor',
        '*.lyrics* _canción_ - Letras de canciones',
        '*.happymodsearch* _texto_ - Apps en HappyMod',
        '*.githubsearch* _texto_ - Buscar en GitHub',
        '*.apksearch* _texto_ - Buscar APKs'
      ]
    },
    menu_economy: {
      title: '💰 Economía & Juegos',
      commands: [
        '*.balance* - Ver tu balance de monedas',
        '*.daily* - Recompensa diaria',
        '*.work* - Trabajar por monedas',
        '*.crime* - Cometer un crimen',
        '*.rob* _@usuario_ - Robar a otro usuario',
        '*.bank* - Ver tu balance bancario',
        '*.deposit* _cantidad_ - Depositar monedas',
        '*.withdraw* _cantidad_ - Retirar monedas',
        '*.fish* - Ir a pescar',
        '*.inventory* - Ver tu inventario de pesca',
        '*.slots* - Jugar tragamonedas (50 monedas)'
      ]
    },
    menu_pokemon: {
      title: '🎮 Pokémon',
      commands: [
        '*.shop* - Ver la tienda de Pokémon',
        '*.buy* _id_ - Comprar un item',
        '*.pokemon* - Ver tus Pokémon',
        '*.feed* _número_ - Alimentar a un Pokémon',
        '*.train* _número_ - Entrenar a un Pokémon',
        '*.battle* _@usuario_ - Luchar contra otro usuario'
      ]
    },
    menu_moderation: {
      title: '👮 Moderación',
      commands: [
        '*.ban* _@usuario_ - Banear usuario',
        '*.unban* _@usuario_ - Desbanear usuario',
        '*.kick* _@usuario_ - Expulsar usuario',
        '*.mute* _@usuario_ - Silenciar usuario',
        '*.unmute* _@usuario_ - Quitar silencio'
      ]
    },
    menu_fun: {
      title: '🎮 Diversión',
      commands: [
        '*.sticker* - Convertir imagen a sticker',
        '*.ppt* _opción_ - Jugar piedra, papel o tijeras'
      ]
    }
  };

  if (query.data in menus) {
    const menu = menus[query.data];
    const menuText = `╭─〘 ${menu.title} 〙\n│\n${menu.commands.map(cmd => `│ ${cmd}`).join('\n')}\n╰────────────`;

    const backButton = {
      reply_markup: {
        inline_keyboard: [[{ text: '⬅️ Volver al Menú Principal', callback_data: 'menu_main' }]]
      }
    };

    try {
      await bot.editMessageText(menuText, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        ...backButton
      });
    } catch (error) {
      console.error('Error al editar mensaje:', error);
      await bot.sendMessage(chatId, menuText, {
        parse_mode: 'Markdown',
        ...backButton
      });
    }
  } else if (query.data === 'menu_main') {
    const mainMenu = {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '👥 Admin', callback_data: 'menu_admin' },
            { text: '🤖 Básicos', callback_data: 'menu_basic' }
          ],
          [
            { text: '🧠 IA', callback_data: 'menu_ai' },
            { text: '📥 Descargas', callback_data: 'menu_downloads' }
          ],
          [
            { text: '🔍 Búsquedas', callback_data: 'menu_search' },
            { text: '💰 Economía', callback_data: 'menu_economy' }
          ],
          [
            { text: '🎮 Pokémon', callback_data: 'menu_pokemon' },
            { text: '👮 Moderación', callback_data: 'menu_moderation' }
          ],
          [{ text: '🎲 Diversión', callback_data: 'menu_fun' }]
        ]
      }
    };

    await bot.editMessageText('╭─〘 🌟 Menú Principal 〙\n│\n│ Selecciona una categoría:\n╰────────────', {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      ...mainMenu
    });
  }

  // Responder al callback query para quitar el loading spinner
  await bot.answerCallbackQuery(query.id);
});