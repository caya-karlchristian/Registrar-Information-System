FROM node:20-alpine AS builder

WORKDIR /app

# Declare ALL VITE_ build args that docker-compose passes.
# Every ARG must have a matching ENV assignment — otherwise Vite sees
# the variable as undefined at build time and bakes in an empty string,
# which causes runtime failures (e.g. wsHost='' breaks WebSocket connections).
ARG VITE_API_URL
ARG VITE_SSO_LOGIN_URL
ARG VITE_SSO_CLIENT_ID
ARG VITE_SSO_BASE_URL
ARG VITE_REVERB_APP_KEY
ARG VITE_REVERB_HOST
ARG VITE_REVERB_PORT
ARG VITE_REVERB_SCHEME

# ENV VITE_API_URL=$VITE_API_URL
# ENV VITE_SSO_LOGIN_URL=$VITE_SSO_LOGIN_URL
# ENV VITE_SSO_CLIENT_ID=$VITE_SSO_CLIENT_ID
# ENV VITE_SSO_BASE_URL=$VITE_SSO_BASE_URL
# ENV VITE_REVERB_APP_KEY=$VITE_REVERB_APP_KEY
# ENV VITE_REVERB_HOST=$VITE_REVERB_HOST
# ENV VITE_REVERB_PORT=$VITE_REVERB_PORT
# ENV VITE_REVERB_SCHEME=$VITE_REVERB_SCHEME

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source and build
COPY . .
# Write a .env.local from build args — Vite loads this last, overriding .env.production
# In registrar-frontend/Dockerfile, replace the RUN echo block with:
RUN rm -f .env.production .env.production.local && \
    printf 'VITE_REVERB_HOST=%s\nVITE_REVERB_PORT=%s\nVITE_REVERB_SCHEME=%s\nVITE_REVERB_APP_KEY=%s\nVITE_API_URL=%s\nVITE_SSO_LOGIN_URL=%s\nVITE_SSO_CLIENT_ID=%s\n' \
    "${VITE_REVERB_HOST}" \
    "${VITE_REVERB_PORT}" \
    "${VITE_REVERB_SCHEME}" \
    "${VITE_REVERB_APP_KEY}" \
    "${VITE_API_URL}" \
    "${VITE_SSO_LOGIN_URL}" \
    "${VITE_SSO_CLIENT_ID}" \
    > .env.production && \
    cat .env.production
RUN npm run build

# # -------------------------------------------------------
# # Production stage — serve with nginx
# # -------------------------------------------------------
# FROM nginx:alpine

# COPY --from=builder /app/dist /usr/share/nginx/html

# # React Router fix — all routes go to index.html
# COPY nginx.conf /etc/nginx/conf.d/default.conf
# COPY certs /etc/nginx/certs

# EXPOSE 80
# EXPOSE 443

# CMD ["nginx", "-g", "daemon off;"]

# FROM node:20-alpine AS builder

# WORKDIR /app

# # Install dependencies
# COPY package*.json ./
# RUN npm install

# # Copy source (includes .env.production with baked-in VITE_ values)
# # and build. Vite automatically reads .env.production during
# # `npm run build` — no build args or ENV promotion needed.
# COPY . .
# RUN npm run build

# -------------------------------------------------------
# Production stage — serve with nginx
# -------------------------------------------------------
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

# React Router fix — all routes go to index.html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY certs /etc/nginx/certs

EXPOSE 80
EXPOSE 443

CMD ["nginx", "-g", "daemon off;"]