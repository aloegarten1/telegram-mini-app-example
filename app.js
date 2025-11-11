class AudioCutter {
    constructor() {
        this.audioContext = null;
        this.audioBuffer = null;
        this.source = null;
        this.analyser = null;
        this.isPlaying = false;
        this.startTime = 0;
        this.duration = 0;
        this.playbackStart = 0;
        this.canvas = document.getElementById('waveform');
        this.ctx = this.canvas.getContext('2d');
        
        this.initTelegramWebApp();
        this.initEventListeners();
        this.setupTrimControls();
    }

    initTelegramWebApp() {
        this.tg = window.Telegram.WebApp;
        this.tg.expand();
        this.tg.enableClosingConfirmation();
        
        // Получаем user_id из параметров URL
        this.userId = new URLSearchParams(window.location.search).get('user_id');
        
        // Проверяем, есть ли файл от бота
        this.checkForBotFile();
    }

    initEventListeners() {
        const fileInput = document.getElementById('fileInput');
        fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        
        window.addEventListener('resize', () => this.drawWaveform());
    }

    setupTrimControls() {
        this.leftHandle = document.getElementById('leftHandle');
        this.rightHandle = document.getElementById('rightHandle');
        this.trimSelection = document.getElementById('trimSelection');
        this.startTimeDisplay = document.getElementById('startTime');
        this.endTimeDisplay = document.getElementById('endTime');
        
        this.setupDrag(this.leftHandle, 'left');
        this.setupDrag(this.rightHandle, 'right');
        
        this.updateTrimSelection();
    }

    setupDrag(element, type) {
        let isDragging = false;
        
        element.addEventListener('mousedown', (e) => {
            isDragging = true;
            e.preventDefault();
        });
        
        element.addEventListener('touchstart', (e) => {
            isDragging = true;
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            this.handleDrag(e.clientX, type);
        });
        
        document.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            this.handleDrag(e.touches[0].clientX, type);
        });
        
        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
        
        document.addEventListener('touchend', () => {
            isDragging = false;
        });
    }

    handleDrag(clientX, type) {
        const rect = this.canvas.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        
        if (type === 'left') {
            this.startTime = x * this.duration;
        } else {
            this.duration = Math.max(this.startTime + 0.1, x * this.duration);
        }
        
        this.updateTrimSelection();
        this.updateTimeDisplays();
    }

    updateTrimSelection() {
        const containerWidth = this.canvas.offsetWidth;
        const startPercent = (this.startTime / this.duration) * 100;
        const endPercent = 100 - startPercent;
        
        this.trimSelection.style.left = startPercent + '%';
        this.trimSelection.style.right = endPercent + '%';
        
        this.leftHandle.style.left = startPercent + '%';
        this.rightHandle.style.right = endPercent + '%';
    }

    updateTimeDisplays() {
        this.startTimeDisplay.textContent = this.formatTime(this.startTime);
        this.endTimeDisplay.textContent = this.formatTime(this.duration);
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    async checkForBotFile() {
        if (!this.userId) return;
        
        try {
            const response = await fetch(`/api/get-file?user_id=${this.userId}`);
            if (response.ok) {
                const fileData = await response.json();
                await this.loadAudioFromUrl(fileData.url);
                this.showEditScreen();
            }
        } catch (error) {
            console.error('Error loading bot file:', error);
        }
    }

    showFileInput() {
        document.getElementById('fileInput').click();
    }

    showUrlInput() {
        document.getElementById('urlInputContainer').style.display = 'block';
    }

    async handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        if (!this.isValidAudioFile(file)) {
            this.showStatus('❌ Неподдерживаемый формат файла', 'error');
            return;
        }
        
        await this.loadAudioFile(file);
        this.showEditScreen();
    }

    async handleUrlSubmit() {
        const urlInput = document.getElementById('urlInput');
        const url = urlInput.value.trim();
        
        if (!this.isValidUrl(url)) {
            this.showStatus('❌ Неверная ссылка', 'error');
            return;
        }
        
        this.showStatus('⏬ Загрузка аудио...', 'info');
        
        try {
            const response = await fetch('/api/download-from-url', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: url, user_id: this.userId })
            });
            
            if (response.ok) {
                const result = await response.json();
                await this.loadAudioFromUrl(result.audioUrl);
                this.showEditScreen();
                this.showStatus('✅ Аудио успешно загружено', 'success');
            } else {
                throw new Error('Download failed');
            }
        } catch (error) {
            this.showStatus('❌ Ошибка при загрузке аудио', 'error');
        }
    }

    isValidAudioFile(file) {
        const allowedTypes = ['audio/mp3', 'audio/wav', 'audio/ogg', 'audio/flac'];
        const allowedExtensions = ['.mp3', '.wav', '.ogg', '.flac'];
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
        
        return allowedTypes.includes(file.type) || allowedExtensions.includes(fileExtension);
    }

    isValidUrl(url) {
        const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
        const soundcloudRegex = /^(https?:\/\/)?(www\.)?soundcloud\.com\/.+$/;
        return youtubeRegex.test(url) || soundcloudRegex.test(url);
    }

    async loadAudioFile(file) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            await this.decodeAudioData(arrayBuffer);
            document.getElementById('fileName').textContent = `Файл: ${file.name}`;
        } catch (error) {
            this.showStatus('❌ Ошибка при загрузке файла', 'error');
            throw error;
        }
    }

    async loadAudioFromUrl(url) {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            await this.decodeAudioData(arrayBuffer);
            document.getElementById('fileName').textContent = `Файл: ${url.split('/').pop()}`;
        } catch (error) {
            this.showStatus('❌ Ошибка при загрузке аудио', 'error');
            throw error;
        }
    }

    async decodeAudioData(arrayBuffer) {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
        this.duration = this.audioBuffer.duration;
        this.startTime = 0;
        
        document.getElementById('fileDuration').textContent = 
            `Длительность: ${this.formatTime(this.duration)}`;
        
        this.drawWaveform();
        this.updateTimeDisplays();
    }

    drawWaveform() {
        if (!this.audioBuffer) return;
        
        const width = this.canvas.width = this.canvas.offsetWidth;
        const height = this.canvas.height;
        
        this.ctx.clearRect(0, 0, width, height);
        this.ctx.fillStyle = '#4CAF50';
        
        const data = this.audioBuffer.getChannelData(0);
        const step = Math.ceil(data.length / width);
        const amp = height / 2;
        
        for (let i = 0; i < width; i++) {
            let min = 1.0;
            let max = -1.0;
            
            for (let j = 0; j < step; j++) {
                const datum = data[(i * step) + j];
                if (datum < min) min = datum;
                if (datum > max) max = datum;
            }
            
            this.ctx.fillRect(i, (1 + min) * amp, 1, Math.max(1, (max - min) * amp));
        }
    }

    togglePlay() {
        if (!this.audioBuffer) return;
        
        if (this.isPlaying) {
            this.stopPlayback();
        } else {
            this.startPlayback();
        }
    }

    startPlayback() {
        if (!this.audioContext) return;
        
        this.source = this.audioContext.createBufferSource();
        this.source.buffer = this.audioBuffer;
        this.source.connect(this.audioContext.destination);
        
        // Обрезаем воспроизведение по выбранному диапазону
        const startOffset = this.startTime;
        const duration = this.duration - this.startTime;
        
        this.source.start(0, startOffset, duration);
        this.isPlaying = true;
        
        document.getElementById('playButton').textContent = '⏹️ Стоп';
        
        this.source.onended = () => {
            this.isPlaying = false;
            document.getElementById('playButton').textContent = '▶️ Воспроизвести';
        };
    }

    stopPlayback() {
        if (this.source) {
            this.source.stop();
            this.source = null;
        }
        this.isPlaying = false;
        document.getElementById('playButton').textContent = '▶️ Воспроизвести';
    }

    async trimAudio() {
        if (!this.audioBuffer) return;
        
        this.showStatus('✂️ Обрезка аудио...', 'info');
        
        try {
            // Создаем новый AudioBuffer с обрезанными данными
            const sampleRate = this.audioBuffer.sampleRate;
            const startSample = Math.floor(this.startTime * sampleRate);
            const endSample = Math.floor(this.duration * sampleRate);
            const length = endSample - startSample;
            
            const newBuffer = this.audioContext.createBuffer(
                this.audioBuffer.numberOfChannels,
                length,
                sampleRate
            );
            
            for (let channel = 0; channel < this.audioBuffer.numberOfChannels; channel++) {
                const channelData = this.audioBuffer.getChannelData(channel);
                const newChannelData = newBuffer.getChannelData(channel);
                
                for (let i = 0; i < length; i++) {
                    newChannelData[i] = channelData[startSample + i];
                }
            }
            
            // Конвертируем в MP3 и отправляем на сервер
            const mp3Blob = await this.bufferToMp3(newBuffer);
            await this.sendTrimmedAudio(mp3Blob);
            
        } catch (error) {
            console.error('Trim error:', error);
            this.showStatus('❌ Ошибка при обрезке аудио', 'error');
        }
    }

    async bufferToMp3(audioBuffer) {
        // Здесь должна быть реализация конвертации в MP3
        // Для демонстрации используем WAV
        return this.bufferToWav(audioBuffer);
    }

    bufferToWav(audioBuffer) {
        const numChannels = audioBuffer.numberOfChannels;
        const sampleRate = audioBuffer.sampleRate;
        const length = audioBuffer.length * numChannels * 2;
        const buffer = new ArrayBuffer(44 + length);
        const view = new DataView(buffer);
        
        // WAV header
        this.writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + length, true);
        this.writeString(view, 8, 'WAVE');
        this.writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * numChannels * 2, true);
        view.setUint16(32, numChannels * 2, true);
        view.setUint16(34, 16, true);
        this.writeString(view, 36, 'data');
        view.setUint32(40, length, true);
        
        // Audio data
        const offset = 44;
        let pos = offset;
        const channelData = [];
        
        for (let channel = 0; channel < numChannels; channel++) {
            channelData.push(audioBuffer.getChannelData(channel));
        }
        
        for (let i = 0; i < audioBuffer.length; i++) {
            for (let channel = 0; channel < numChannels; channel++) {
                const sample = Math.max(-1, Math.min(1, channelData[channel][i]));
                view.setInt16(pos, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
                pos += 2;
            }
        }
        
        return new Blob([buffer], { type: 'audio/wav' });
    }

    writeString(view, offset, string) {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    }

    async sendTrimmedAudio(blob) {
        try {
            const formData = new FormData();
            formData.append('audio', blob, 'trimmed_audio.wav');
            formData.append('user_id', this.userId);
            
            const response = await fetch('/api/send-trimmed-audio', {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                this.showStatus('✅ Аудио успешно отправлено в Telegram!', 'success');
                // Закрываем Mini App через несколько секунд
                setTimeout(() => {
                    this.tg.close();
                }, 3000);
            } else {
                throw new Error('Upload failed');
            }
        } catch (error) {
            console.error('Upload error:', error);
            this.showStatus('❌ Ошибка при отправке аудио', 'error');
        }
    }

    showEditScreen() {
        document.getElementById('uploadScreen').classList.remove('active');
        document.getElementById('editScreen').classList.add('active');
    }

    showStatus(message, type) {
        const statusElement = document.getElementById('statusMessage') || 
                             document.getElementById('trimStatus');
        statusElement.textContent = message;
        statusElement.className = `status-message ${type}`;
        
        if (type !== 'info') {
            setTimeout(() => {
                statusElement.textContent = '';
                statusElement.className = 'status-message';
            }, 5000);
        }
    }
}

// Инициализация приложения
let audioCutter;

document.addEventListener('DOMContentLoaded', () => {
    audioCutter = new AudioCutter();
});

// Глобальные функции для HTML onclick
function showFileInput() {
    audioCutter.showFileInput();
}

function showUrlInput() {
    audioCutter.showUrlInput();
}

function handleUrlSubmit() {
    audioCutter.handleUrlSubmit();
}

function togglePlay() {
    audioCutter.togglePlay();
}

function trimAudio() {
    audioCutter.trimAudio();
}