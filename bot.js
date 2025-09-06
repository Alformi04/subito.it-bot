const TelegramBot = require('node-telegram-bot-api');
const rp = require('request-promise');
const cheerio = require('cheerio');

const token = process.env.TOKEN;
const bot = new TelegramBot(token, { polling: true });

let subscribers = {}; // Salva chatId -> URL

bot.onText(/\/start (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const url = match[1];
    if (!url.includes('subito.it')) {
        bot.sendMessage(chatId, 'URL non valido!');
        return;
    }
    subscribers[chatId] = url;
    bot.sendMessage(chatId, 'Sottoscritto alla ricerca!');
});

bot.onText(/\/list/, (msg) => {
    const chatId = msg.chat.id;
    if (subscribers[chatId]) {
        bot.sendMessage(chatId, `Il tuo URL: ${subscribers[chatId]}`);
    } else {
        bot.sendMessage(chatId, 'Nessuna ricerca attiva.');
    }
});

const checkUpdates = async () => {
    for (const chatId in subscribers) {
        const url = subscribers[chatId];
        try {
            const html = await rp(url);
            const $ = cheerio.load(html);
            const items = [];
            $('.items__item.item-card').each((i, elem) => {
                const title = $(elem).find('h2').text();
                const link = $(elem).find('a').attr('href');
                if (title && link) items.push({ title, link });
            });
            if (items.length) {
                const message = items.map(i => `${i.title}\n${i.link}`).join('\n\n');
                bot.sendMessage(chatId, message);
            }
        } catch (e) {
            console.error('Errore scraping:', e);
        }
    }
};

setInterval(checkUpdates, 5 * 60 * 1000); // ogni 5 minuti
