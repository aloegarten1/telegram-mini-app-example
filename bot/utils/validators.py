import os
import re
from pydub import AudioSegment
import requests

async def validate_audio_file(file_path: str) -> tuple[bool, str]:
    """Валидация аудио файла"""
    try:
        # Проверка размера файла (max 50MB)
        file_size = os.path.getsize(file_path) / (1024 * 1024)
        if file_size > 50:
            return False, "Файл слишком большой (максимум 50MB)"
        
        # Проверка формата
        allowed_extensions = ['.mp3', '.wav', '.ogg', '.flac']
        file_ext = os.path.splitext(file_path)[1].lower()
        
        if file_ext not in allowed_extensions:
            return False, f"Неподдерживаемый формат. Разрешенные форматы: {', '.join(allowed_extensions)}"
        
        # Попытка загрузить аудио файл
        audio = AudioSegment.from_file(file_path)
        if len(audio) < 100:  # Минимальная длина 100ms
            return False, "Аудио файл слишком короткий"
        
        return True, "Файл валиден"
        
    except Exception as e:
        return False, f"Ошибка при чтении файла: {str(e)}"

async def validate_url(url: str) -> tuple[bool, str]:
    """Валидация URL YouTube/SoundCloud"""
    try:
        # YouTube паттерны
        youtube_patterns = [
            r'^(https?://)?(www\.)?(youtube\.com|youtu\.?be)/.+$',
        ]
        
        # SoundCloud паттерны
        soundcloud_patterns = [
            r'^(https?://)?(www\.)?soundcloud\.com/.+$',
        ]
        
        for pattern in youtube_patterns + soundcloud_patterns:
            if re.match(pattern, url):
                return True, "URL валиден"
        
        return False, "Неподдерживаемая ссылка. Поддерживаются только YouTube и SoundCloud"
        
    except Exception as e:
        return False, f"Ошибка при проверке ссылки: {str(e)}"
