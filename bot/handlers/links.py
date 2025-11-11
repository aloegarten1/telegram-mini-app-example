import os
import tempfile
from aiogram import Bot, types
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup
from utils.validators import validate_url
from services.downloader import download_from_url
from services.audio_processor import convert_to_mp3

async def handle_url(message: types.Message, bot: Bot, user_files: dict):
    user_id = message.from_user.id
    url = message.text
    
    try:
        # Валидация URL
        is_valid, error_message = await validate_url(url)
        
        if not is_valid:
            await message.answer(f"❌ {error_message}")
            return
        
        await message.answer("⏬ Начинаю загрузку аудио...")
        
        # Загрузка аудио
        downloaded_file = await download_from_url(url, user_id)
        
        if downloaded_file:
            # Конвертация в MP3
            mp3_path = await convert_to_mp3(downloaded_file, user_id)
            
            # Сохранение информации о файле
            user_files[user_id] = {
                'file_path': mp3_path,
                'file_name': 'downloaded_audio.mp3'
            }
            
            # Отправка ссылки на Mini App
            keyboard = InlineKeyboardMarkup(
                inline_keyboard=[[
                    InlineKeyboardButton(
                        text="Обрезать аудио",
                        web_app=types.WebAppInfo(url=f"https://aloegarten1.github.io/telegram-mini-app-example/?user_id={user_id}")
                    )
                ]]
            )
            
            await message.answer(
                "✅ Аудио успешно загружено! Теперь вы можете обрезать его:",
                reply_markup=keyboard
            )
            
        else:
            await message.answer("❌ Не удалось загрузить аудио по указанной ссылке")
            
    except Exception as e:
        await message.answer("❌ Произошла ошибка при обработке ссылки")
        print(f"Error: {e}")
