# --------------------------------------------------------------------------
# Stage 1: Build
# --------------------------------------------------------------------------
FROM golang:1.21-alpine AS builder

WORKDIR /app

COPY go.mod ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -a -trimpath -ldflags="-s -w" -o server .

# --------------------------------------------------------------------------
# Stage 2: Runtime (distroless — no shell, no package manager)
# --------------------------------------------------------------------------
FROM gcr.io/distroless/base

WORKDIR /app

COPY --from=builder /app/server .

EXPOSE 8080

ENV PORT=8080

HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
    CMD ["/app/server", "healthcheck"]

CMD ["/app/server"]
