import os
import tempfile
from pydub import AudioSegment

async def convert_to_mp3(input_path: str, user_id: int) -> str:
    """Конвертация аудио в MP3"""
    temp_dir = tempfile.gettempdir()
    output_path = os.path.join(temp_dir, f"converted_{user_id}.mp3")
    
    try:
        audio = AudioSegment.from_file(input_path)
        audio.export(output_path, format="mp3", bitrate="192k")
        return output_path
    except Exception as e:
        print(f"Conversion error: {e}")
        return input_path  # Возвращаем оригинальный файл если конвертация не удалась
