import os
import tempfile
from aiogram import Bot, types
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup
from utils.validators import validate_audio_file
from services.audio_processor import convert_to_mp3

async def handle_audio_file(message: types.Message, bot: Bot, user_files: dict):
    user_id = message.from_user.id
    
    try:
        # Получение файла
        if message.audio:
            file_id = message.audio.file_id
            file_name = message.audio.file_name or "audio_file"
        elif message.document:
            file_id = message.document.file_id
            file_name = message.document.file_name
        
        # Скачивание файла
        file = await bot.get_file(file_id)
        file_path = file.file_path
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file_name)[1]) as temp_file:
            await bot.download_file(file_path, temp_file.name)
            
            # Валидация файла
            is_valid, error_message = await validate_audio_file(temp_file.name)
            
            if not is_valid:
                await message.answer(f"❌ {error_message}")
                os.unlink(temp_file.name)
                return
            
            # Конвертация в MP3 если нужно
            mp3_path = await convert_to_mp3(temp_file.name, user_id)
            
            # Сохранение информации о файле
            user_files[user_id] = {
                'file_path': mp3_path,
                'file_name': file_name
            }
            
            # Отправка ссылки на Mini App
            keyboard = InlineKeyboardMarkup(
                inline_keyboard=[[
                    InlineKeyboardButton(
                        text="Обрезать аудио",
                        web_app=types.WebAppInfo(url=f"https://your-domain.com/mini-app?user_id={user_id}")
                    )
                ]]
            )
            
            await message.answer(
                "✅ Файл успешно загружен! Теперь вы можете обрезать его:",
                reply_markup=keyboard
            )
            
            # Удаление временных файлов
            os.unlink(temp_file.name)
            
    except Exception as e:
        await message.answer("❌ Произошла ошибка при обработке файла")
        print(f"Error: {e}")
        