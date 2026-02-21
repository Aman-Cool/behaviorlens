package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"behaviorlens/handlers"
	"behaviorlens/models"
	"behaviorlens/pipeline"
	"behaviorlens/simulator"
)

func main() {
	// ------------------------------------------------------------------
	// Healthcheck mode: run as "server healthcheck" inside the container.
	// ------------------------------------------------------------------
	if len(os.Args) > 1 && os.Args[1] == "healthcheck" {
		runHealthcheck()
		return
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// ------------------------------------------------------------------
	// Root context with clean shutdown on SIGINT / SIGTERM.
	// ------------------------------------------------------------------
	ctx, cancel := context.WithCancel(context.Background())

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		<-sigCh
		log.Println("shutdown signal received")
		cancel()
	}()

	// ------------------------------------------------------------------
	// Pipeline setup.
	// ------------------------------------------------------------------
	eventCh := make(chan models.Event, 1000)
	eventStore := handlers.NewEventStore(500)
	ruleEng := pipeline.NewRuleEngine(ctx)
	stateMgr := pipeline.NewStateManager(ctx, eventCh, ruleEng)
	stateMgr.Start()

	h := handlers.NewHandlers(eventCh, stateMgr, ruleEng, eventStore)

	// ------------------------------------------------------------------
	// HTTP routing.
	// ------------------------------------------------------------------
	mux := http.NewServeMux()
	mux.HandleFunc("/events", handlers.WithCORS(h.IngestEvent))
	mux.HandleFunc("/api/patterns", handlers.WithCORS(h.GetPatterns))
	mux.HandleFunc("/api/metrics", handlers.WithCORS(h.GetMetrics))
	mux.HandleFunc("/api/users", handlers.WithCORS(h.GetUsers))
	mux.HandleFunc("/api/events", handlers.WithCORS(h.GetEvents))
	mux.HandleFunc("/health", handlers.WithCORS(handlers.HealthHandler))

	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      mux,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// ------------------------------------------------------------------
	// Start simulator (auto-fires on startup, no manual trigger).
	// ------------------------------------------------------------------
	go simulator.Run(ctx, fmt.Sprintf("http://localhost:%s", port))

	// ------------------------------------------------------------------
	// Start server in a goroutine so we can wait for the shutdown signal.
	// ------------------------------------------------------------------
	serverErr := make(chan error, 1)
	go func() {
		log.Printf("BehaviorLens backend listening on :%s", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			serverErr <- err
		}
	}()

	select {
	case err := <-serverErr:
		log.Fatalf("server error: %v", err)
	case <-ctx.Done():
	}

	// ------------------------------------------------------------------
	// Graceful shutdown: give in-flight requests up to 10 seconds.
	// ------------------------------------------------------------------
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Printf("graceful shutdown error: %v", err)
	}
	log.Println("server stopped cleanly")
}

// runHealthcheck pings the local /health endpoint and exits 0 on success.
func runHealthcheck() {
	resp, err := http.Get("http://localhost:8080/health")
	if err != nil {
		os.Exit(1)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		os.Exit(1)
	}
	os.Exit(0)
}
