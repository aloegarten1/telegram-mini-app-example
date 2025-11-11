import os
import tempfile
import yt_dlp

async def download_from_url(url: str, user_id: int) -> str:
    """Загрузка аудио с YouTube/SoundCloud"""
    temp_dir = tempfile.gettempdir()
    output_template = os.path.join(temp_dir, f"download_{user_id}", "%(title)s.%(ext)s")
    
    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': output_template,
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }],
        'quiet': True,
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            downloaded_file = ydl.prepare_filename(info)
            downloaded_file = downloaded_file.rsplit('.', 1)[0] + '.mp3'
            
            return downloaded_file
            
    except Exception as e:
        print(f"Download error: {e}")
        return None
