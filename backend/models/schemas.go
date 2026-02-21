package models

// Event represents a single behavioral event from a user session.
type Event struct {
	UserID    string            `json:"user_id"`
	Action    string            `json:"action"` // click | scroll | idle | navigate | abandon
	Page      string            `json:"page"`
	Timestamp int64             `json:"timestamp"` // unix epoch milliseconds
	Metadata  map[string]string `json:"metadata,omitempty"`
}

// EventWithID is an event enriched with a generated unique ID for the event feed.
type EventWithID struct {
	ID        string            `json:"id"`
	UserID    string            `json:"user_id"`
	Action    string            `json:"action"`
	Page      string            `json:"page"`
	Timestamp int64             `json:"timestamp"`
	Metadata  map[string]string `json:"metadata,omitempty"`
}

// UserState holds the rolling behavioral state of a single user.
type UserState struct {
	UserID          string
	Events          []Event
	CurrentPage     string
	LastSeen        int64
	SessionStart    int64
	PageVisitCounts map[string]int
}

// Pattern is a detected behavioral friction signal.
type Pattern struct {
	PatternID   string `json:"pattern_id"`
	UserID      string `json:"user_id"`
	Type        string `json:"type"` // hesitation | navigation-loop | abandonment
	Page        string `json:"page"`
	DetectedAt  int64  `json:"detected_at"`
	Explanation string `json:"explanation"`
	Severity    string `json:"severity"` // low | medium | high
	Resolved    bool   `json:"resolved"`
}

// SystemMetrics is the current aggregate health snapshot of the system.
type SystemMetrics struct {
	TotalEvents      int64   `json:"total_events"`
	ActiveUsers      int     `json:"active_users"`
	PatternsDetected int64   `json:"patterns_detected"`
	AbandonmentRate  float64 `json:"abandonment_rate"`
	AsOf             int64   `json:"as_of"`
}

// ActiveUserResponse is the per-user entry returned by GET /api/users.
type ActiveUserResponse struct {
	UserID          string `json:"user_id"`
	CurrentPage     string `json:"current_page"`
	LastSeen        int64  `json:"last_seen"`
	HasActivePattern bool  `json:"has_active_pattern"`
}
