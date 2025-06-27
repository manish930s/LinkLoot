FROM node:18

# Install Python, ffmpeg, and yt-dlp
RUN apt-get update && \
    apt-get install -y python3 python3-pip ffmpeg && \
    pip3 install yt-dlp

WORKDIR /app
COPY . .

RUN npm install

EXPOSE 8080

CMD ["node", "index.js"] 