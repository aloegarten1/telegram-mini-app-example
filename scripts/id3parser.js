class ID3Parser {
    static parseID3v2(data) {
        // Проверяем сигнатуру ID3
        if (!this.isID3v2(data)) {
            return null;
        }

        const header = this.parseHeader(data);
        if (!header) return null;

        const frames = {};
        let offset = 10; // Пропускаем заголовок

        while (offset < data.length - 10) {
            const frame = this.parseFrame(data, offset);
            if (!frame) break;
            
            frames[frame.id] = frame.value;
            offset += frame.frameSize;
        }

        return {
            version: header.version,
            size: header.size,
            frames: frames
        };
    }

    static isID3v2(data) {
        return data.length >= 10 && 
               data[0] === 73 && // I
               data[1] === 68 && // D
               data[2] === 51;   // 3
    }

    static parseHeader(data) {
        return {
            version: `2.${data[3]}.${data[4]}`,
            flags: data[5],
            size: this.calculateID3Size(data, 6)
        };
    }

    static parseFrame(data, offset) {
        // ... реализация парсинга фреймов ...
    }

    static calculateID3Size(data, offset) {
        // ... расчет размера ID3 тега ...
    }
}
