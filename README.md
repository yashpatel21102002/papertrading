# NexTrade - Nifty 50 Paper Trading Platform

NexTrade is a high-performance, real-time paper trading application that simulates the Indian stock market (Nifty 50). Built with a microservices architecture, it features a custom in-memory order matching engine, live price streaming via WebSockets, and comprehensive portfolio analytics.

## 🚀 Features

* **Real-Time Market Data:** Live price updates for Nifty 50 stocks using WebSocket streaming.
* **Order Matching Engine:** Custom-built, low-latency engine handling market and limit orders in-memory.
* **Interactive Trading View:** Professional charting interface with technical indicators.
* **Portfolio Management:** Track total equity, unrealized PnL, buying power, and asset allocation with interactive charts.
* **Order History & Positions:** Detailed tracking of filled/open orders and current holdings.
* **Scalable Architecture:** Fully decoupled services communicating via REST and Redis Pub/Sub.

## 🛠️ Tech Stack

* **Frontend:** Next.js, React, Tailwind CSS, TradingView Lightweight Charts
* **Backend Services:** Node.js, Express.js, TypeScript
* **Database & ORM:** PostgreSQL, Prisma
* **Message Broker & Cache:** Redis (Pub/Sub)
* **Infrastructure:** Docker, Docker Compose

## 🏗️ System Architecture

The application is split into highly cohesive, loosely coupled microservices to ensure high availability and consistent data flow:

1.  **Main API Server:** Acts as the primary gateway for clients. Handles user authentication (`/register`, `/login`), balance queries, and historical order fetching from the PostgreSQL database. It forwards new trade requests to the Engine.
2.  **Engine (Market Data & Order Matching):** The core of the platform. It holds order books in-memory for fast execution, processes incoming `/api/order` requests, and calculates price volatility. It publishes matched trades and live price ticks to Redis.
3.  **Redis Pub/Sub:** Acts as the central nervous system, distributing events (e.g., `stock:RELIANCE.NS`) from the Engine to the WebSocket server.
4.  **WebSocket Server:** Subscribes to Redis channels and pushes real-time price updates and order execution notifications directly to the connected clients.

<img width="955" height="715" alt="image" src="https://github.com/user-attachments/assets/8ba931b4-a733-40f3-9794-6c28173aac82" />


## 🐳 Getting Started (Local Development)

The entire infrastructure is containerized. You can spin up the frontend, backend microservices, database, and cache using a single command.

### Prerequisites
* [Docker](https://docs.docker.com/get-docker/)
* [Docker Compose](https://docs.docker.com/compose/install/)

### Installation & Execution

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/yourusername/nextrade.git](https://github.com/yourusername/nextrade.git)
    cd nextrade
    ```

2.  **Environment Variables:** (Only for manual setup)
    Create a `.env` file in the root directory (or use the provided `.env.example`) and configure your database and port settings.

3.  **Start the cluster:**
    Use Docker Compose to build the images and start all containers in detached mode:
    ```bash
    docker-compose up --build -d
    ```

4.  **Database Migration (Only for manual setup):**
    Ensure your Prisma schema is synced with the Postgres container:
    ```bash
    docker-compose exec api npx prisma migrate deploy
    ```

5.  **Access the Application:**
    * Frontend: `http://localhost:3000`
    * API Server: `http://localhost:8001`
    * Engine Server: `http://localhost:8002`
    * WebSocket Server: `ws://localhost:8003`

## 🛑 Stopping the Services

To stop the containers without deleting your database volumes:
```bash
docker-compose stop
