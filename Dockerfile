# Dockerfile
FROM node:18-bullseye

ENV DEBIAN_FRONTEND=noninteractive

# Install compilers and tools required by helper.js (g++, python, java)
RUN apt-get update && apt-get install -y \
    g++ \
    python3 \
    openjdk-17-jdk \
    bash \
    coreutils \
    cgroup-tools \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# copy package files and install
COPY package*.json ./
RUN npm ci --only=production

# copy app source
COPY . .

EXPOSE 9000

# use non-root user at runtime for safety
RUN useradd --create-home appuser && chown -R appuser /usr/src/app
USER appuser

CMD ["node", "index.js"]
