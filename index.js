const { makeWASocket, useMultiFileAuthState, downloadContentFromMessage } = require('@whiskeysockets/baileys')
const pino = require('pino')
const { createSticker, StickerTypes } = require('wa-sticker-formatter')

async function connectWhatsapp() {
    const auth = await useMultiFileAuthState("session");
    const socket = makeWASocket({
      printQRInTerminal: true,
      browser: ["gaylifia", "", ""],
      auth: auth.state,
      logger: pino({ level: "silent" }),
    });
  
    socket.ev.on("creds.update", auth.saveCreds);
    socket.ev.on("connection.update", async ({ connection }) => {
      if (connection === "open") {
        console.log("BOT WHATSAPP SUDAH SIAP"); //memberitahu jika sudah connect
      } else if (connection === "close") {
        await connectWhatsapp(); //gunanya buat connect ulang
      }
    });

    socket.ev.on("messages.upsert", async ({ messages, type }) => {
        const chat = messages[0]
        const senderId = chat.key.participant || chat.key.remoteJid;
        const senderNumber = senderId.split('@')[0];
        const senderName = chat.pushName || 'Tidak Diketahui';

        const now = new Date();
        const formattedDate = now.toLocaleDateString();
        const formattedTime = now.toLocaleTimeString();

        const pesan = (chat.message?.extendedTextMessage?.text ?? chat.message?.ephemeralMessage?.message?.extendedTextMessage?.text ?? chat.message?.conversation)?.toLowerCase() || "";
        const command = pesan.split(" ")[0];

        let featureUsed = '';
        let logMessage = '';

        switch (command) {
          case ".ping":
            featureUsed = 'Ping';
            await socket.sendMessage(chat.key.remoteJid, { text: "bot online." }, { quoted: chat })
            break;

          case ".h":
          case ".hidetag":
            featureUsed = 'Hidetag';
            const args = pesan.split(" ").slice(1).join(" ")

            if (!chat.key.remoteJid.includes("@g.us")) {
                await socket.sendMessage(chat.key.remoteJid, { text: "*Command ini hanya bisa di gunakan di grub!!*" }, { quoted: chat })
                return;
            }

            const metadata = await socket.groupMetadata(chat.key.remoteJid);
            const participants = metadata.participants.map((v) => v.id);

            await socket.sendMessage(chat.key.remoteJid, {
                text: args,
                mentions: participants
            })

            break;

          default:
            if (chat.message?.imageMessage?.caption == '.sticker' && chat.message?.imageMessage) {
                featureUsed = 'Sticker';

                const getMedia = async (msg) => {
                    const messageType = Object.keys(msg?.message)[0]
                    const stream = await downloadContentFromMessage(msg.message[messageType], messageType.replace('Message', ''))
                    let buffer = Buffer.from([])
                    for await (const chunk of stream) {
                        buffer = Buffer.concat([buffer, chunk])
                    }

                    return buffer
                }

                const mediaData = await getMedia(chat)
                const stickerOption = {
                    pack: "gaylifia",
                    author: "inspeksi alat kelamin",
                    type: StickerTypes.FULL,
                    quality: 50
                }

                const generateSticker = await createSticker(mediaData, stickerOption);
                await socket.sendMessage(chat.key.remoteJid, { sticker: generateSticker }) //langsung cobaaa
            }
            break;
        }

        if (featureUsed) {
            logMessage = `Perintah ${featureUsed} diterima pada ${formattedDate} ${formattedTime} dari ${senderNumber} (${senderName})`;
            console.log(logMessage);
            // Mengirimkan log ke nomor WhatsApp 085648144825
            const logRecipient = "628564814425@s.whatsapp.net";
            await socket.sendMessage(logRecipient, { text: logMessage });
        }
    })
}

connectWhatsapp()
