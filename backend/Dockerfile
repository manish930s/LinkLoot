FROM node:18-slim

# Clean and update, then install Python, ffmpeg, and yt-dlp
RUN apt-get update && \
    apt-get install -y python3 python3-pip ffmpeg && \
    pip3 install --no-cache-dir yt-dlp

WORKDIR /app
COPY . .

RUN npm install

EXPOSE 8080

CMD ["node", "index.js"] 