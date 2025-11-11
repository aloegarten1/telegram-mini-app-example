import os
import logging
from aiogram import Bot, Dispatcher, types
from aiogram.types import WebAppInfo
from aiogram.filters import Command
import aiohttp

from handlers import files, links
from utils.validators import validate_audio_file, validate_url

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Конфигурация
BOT_TOKEN = os.getenv('ELEVAGA_AUDIO_TOKEN')
WEB_APP_URL = "https://aloegarten1.github.io/telegram-mini-app-example/"  # URL вашего Mini App

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

# Глобальное хранилище для файлов (в продакшене используйте БД)
user_files = {}

@dp.message(Command("start"))
async def start_command(message: types.Message):
    welcome_text = """
🎵 Добро пожаловать в Audio Cutter Bot!

Я могу:
• Обрезать аудио файлы (MP3, WAV, OGG, FLAC)
• Скачать и обрезать аудио с YouTube/SoundCloud

Просто отправьте мне аудио файл или ссылку!
    """
    await message.answer(welcome_text)

@dp.message(Command("app"))
async def send_mini_app(message: types.Message):
    keyboard = types.InlineKeyboardMarkup(
        inline_keyboard=[[
            types.InlineKeyboardButton(
                text="Открыть Audio Cutter",
                web_app=WebAppInfo(url=WEB_APP_URL)
            )
        ]]
    )
    await message.answer("🎵 Откройте Mini App для работы с аудио:", reply_markup=keyboard)

@dp.message()
async def handle_message(message: types.Message):
    # Обработка файлов
    if message.document or message.audio:
        await files.handle_audio_file(message, bot, user_files)
    
    # Обработка текста (ссылок)
    elif message.text:
        if message.text.startswith(('http://', 'https://')):
            await links.handle_url(message, bot, user_files)
        else:
            await message.answer("Пожалуйста, отправьте аудио файл или ссылку на YouTube/SoundCloud")

async def receive_trimmed_audio(file_data: dict, user_id: int):
    """Получение обрезанного аудио от фронтенда"""
    try:
        # Здесь можно сохранить файл или отправить пользователю
        async with aiohttp.ClientSession() as session:
            async with session.get(file_data['url']) as response:
                if response.status == 200:
                    audio_data = await response.read()
                    audio = types.BufferedInputFile(audio_data, filename="trimmed_audio.mp3")
                    await bot.send_audio(user_id, audio, caption="✅ Ваше обрезанное аудио!")
    except Exception as e:
        logger.error(f"Error receiving trimmed audio: {e}")
        await bot.send_message(user_id, "❌ Произошла ошибка при обработке аудио")

if __name__ == "__main__":
    import asyncio
    asyncio.run(dp.start_polling(bot))
    