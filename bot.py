import os
from aiogram import Bot, Dispatcher, types
from aiogram.types import WebAppInfo, InlineKeyboardButton, InlineKeyboardMarkup
from aiogram.utils import executor

BOT_TOKEN = "5993414736:AAHZjA3dN7cudt7uRQGoyNXyj0NJz1Qj6ik"
bot = Bot(token=BOT_TOKEN)
dp = Dispatcher(bot)

# Папка для хранения загруженных файлов
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# URL, по которому фронтенд сможет получить аудио
# Если хостим бота и фронтенд на одном домене: "https://yourdomain.com/uploads/"
BASE_FILE_URL = "https://yourdomain.com/uploads/"

# Стартовая команда
@dp.message_handler(commands=["start"])
async def start(message: types.Message):
    kb = InlineKeyboardMarkup()
    kb.add(
        InlineKeyboardButton(
            text="Открыть аудио Mini App 🎧",
            web_app=WebAppInfo(url="https://yourdomain.com/index.html")
        )
    )
    await message.answer("Привет! Загрузи mp3, и Mini App сможет его воспроизвести.", reply_markup=kb)

# Обработка аудиофайлов
@dp.message_handler(content_types=["audio", "document"])
async def handle_audio(message: types.Message):
    # Поддерживаем только mp3
    if message.audio:
        file = message.audio
    elif message.document and message.document.mime_type.startswith("audio"):
        file = message.document
    else:
        await message.reply("Пожалуйста, пришлите mp3 файл.")
        return

    file_name = file.file_name
    file_path = os.path.join(UPLOAD_DIR, file_name)

    # Скачиваем файл на сервер
    file_info = await bot.get_file(file.file_id)
    await bot.download_file(file_info.file_path, destination=file_path)

    # Ссылка на фронтенд
    file_url = BASE_FILE_URL + file_name

    await message.reply(f"Аудиофайл готов! Передаем ссылку в Mini App:\n{file_url}")
    # В идеале, Mini App получит эту ссылку через tg.sendData()
