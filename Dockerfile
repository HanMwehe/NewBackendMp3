FROM node:20

# Set working directory inside the container
WORKDIR /app

# Install pnpm globally

RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod +x /usr/local/bin/yt-dlp

RUN apt-get update && apt-get install -y yt-dlp ffmpeg
RUN npm install -g pnpm

# Copy package.json and pnpm-lock.yaml
COPY package*.json . 
COPY pnpm-lock.yaml . 

# Install dependencies using pnpm
RUN pnpm install

# Copy the rest of your application code
COPY . .

# Set the default command to run the app
CMD [ "node", "index.js" ]
