package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"sync"
	"time"

	"behaviorlens/models"
	"behaviorlens/pipeline"
)

// EventStore is a fixed-size circular buffer of recent ingested events.
type EventStore struct {
	mu      sync.RWMutex
	events  []models.EventWithID
	maxSize int
}

// NewEventStore creates an EventStore with the given capacity.
func NewEventStore(maxSize int) *EventStore {
	return &EventStore{
		events:  make([]models.EventWithID, 0, maxSize),
		maxSize: maxSize,
	}
}

// Add appends an event, trimming the oldest when over capacity.
func (es *EventStore) Add(e models.EventWithID) {
	es.mu.Lock()
	defer es.mu.Unlock()
	es.events = append(es.events, e)
	if len(es.events) > es.maxSize {
		es.events = es.events[len(es.events)-es.maxSize:]
	}
}

// GetRecent returns up to limit events, newest first.
func (es *EventStore) GetRecent(limit int) []models.EventWithID {
	es.mu.RLock()
	defer es.mu.RUnlock()

	n := len(es.events)
	if limit > 0 && limit < n {
		n = limit
	}

	src := es.events[len(es.events)-n:]
	result := make([]models.EventWithID, n)
	for i, e := range src {
		result[n-1-i] = e
	}
	return result
}

// --------------------------------------------------------------------------

// Handlers bundles all HTTP handler dependencies.
type Handlers struct {
	eventCh    chan<- models.Event
	stateMgr   *pipeline.StateManager
	ruleEng    *pipeline.RuleEngine
	eventStore *EventStore
}

// NewHandlers constructs the handler bundle.
func NewHandlers(
	eventCh chan<- models.Event,
	stateMgr *pipeline.StateManager,
	ruleEng *pipeline.RuleEngine,
	eventStore *EventStore,
) *Handlers {
	return &Handlers{
		eventCh:    eventCh,
		stateMgr:   stateMgr,
		ruleEng:    ruleEng,
		eventStore: eventStore,
	}
}

// --------------------------------------------------------------------------
// Middleware
// --------------------------------------------------------------------------

// WithCORS wraps a handler to add permissive CORS headers on every response.
func WithCORS(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next(w, r)
	}
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Printf("writeJSON encode error: %v", err)
	}
}

// --------------------------------------------------------------------------
// POST /events
// --------------------------------------------------------------------------

func (h *Handlers) IngestEvent(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}

	var event models.Event
	if err := json.NewDecoder(r.Body).Decode(&event); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid JSON: " + err.Error()})
		return
	}

	if event.UserID == "" || event.Action == "" || event.Page == "" || event.Timestamp == 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error": "user_id, action, page, and timestamp are required",
		})
		return
	}

	h.ruleEng.IncrementEvents()

	// Store in event feed (non-blocking, we have our own counter).
	h.eventStore.Add(models.EventWithID{
		ID:        generateEventID(event),
		UserID:    event.UserID,
		Action:    event.Action,
		Page:      event.Page,
		Timestamp: event.Timestamp,
		Metadata:  event.Metadata,
	})

	// Push to pipeline; drop if channel is full (non-blocking).
	select {
	case h.eventCh <- event:
	default:
		log.Printf("event channel full, dropping event for user %s", event.UserID)
	}

	writeJSON(w, http.StatusAccepted, map[string]string{"status": "accepted"})
}

// --------------------------------------------------------------------------
// GET /api/patterns
// --------------------------------------------------------------------------

func (h *Handlers) GetPatterns(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}

	limit := 50
	if raw := r.URL.Query().Get("limit"); raw != "" {
		if n, err := strconv.Atoi(raw); err == nil && n > 0 {
			limit = n
		}
	}

	patterns := h.ruleEng.GetPatterns(limit)
	if patterns == nil {
		patterns = []models.Pattern{}
	}
	writeJSON(w, http.StatusOK, patterns)
}

// --------------------------------------------------------------------------
// GET /api/metrics
// --------------------------------------------------------------------------

func (h *Handlers) GetMetrics(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}

	since := time.Now().Add(-30 * time.Second).UnixMilli()
	active := h.stateMgr.GetActiveUsers(since)
	metrics := h.ruleEng.Metrics(len(active))
	writeJSON(w, http.StatusOK, metrics)
}

// --------------------------------------------------------------------------
// GET /api/users
// --------------------------------------------------------------------------

func (h *Handlers) GetUsers(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}

	since := time.Now().Add(-30 * time.Second).UnixMilli()
	states := h.stateMgr.GetActiveUsers(since)

	resp := make([]models.ActiveUserResponse, 0, len(states))
	for _, s := range states {
		resp = append(resp, models.ActiveUserResponse{
			UserID:          s.UserID,
			CurrentPage:     s.CurrentPage,
			LastSeen:        s.LastSeen,
			HasActivePattern: h.ruleEng.HasActivePattern(s.UserID),
		})
	}
	writeJSON(w, http.StatusOK, resp)
}

// --------------------------------------------------------------------------
// GET /api/events
// --------------------------------------------------------------------------

func (h *Handlers) GetEvents(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}

	limit := 50
	if raw := r.URL.Query().Get("limit"); raw != "" {
		if n, err := strconv.Atoi(raw); err == nil && n > 0 {
			limit = n
		}
	}

	events := h.eventStore.GetRecent(limit)
	if events == nil {
		events = []models.EventWithID{}
	}
	writeJSON(w, http.StatusOK, events)
}

// --------------------------------------------------------------------------
// GET /health
// --------------------------------------------------------------------------

func HealthHandler(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

func generateEventID(e models.Event) string {
	return strconv.FormatInt(e.Timestamp, 36) + "-" +
		strconv.FormatInt(time.Now().UnixNano()&0xFFFFFF, 36)
}
