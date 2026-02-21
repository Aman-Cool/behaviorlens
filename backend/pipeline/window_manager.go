package pipeline

import (
	"time"

	"behaviorlens/models"
)

const (
	maxWindowDuration = 5 * time.Minute
	maxWindowEvents   = 200
)

// TrimWindow enforces the sliding window policy on a user's event list.
// It discards events older than 5 minutes and caps the total at 200 events.
// Returns a new slice with its own backing array to prevent memory leaks.
func TrimWindow(events []models.Event) []models.Event {
	if len(events) == 0 {
		return events
	}

	cutoffMs := time.Now().UnixMilli() - maxWindowDuration.Milliseconds()

	// Find the index of the first event within the time window.
	startIdx := 0
	for startIdx < len(events) && events[startIdx].Timestamp < cutoffMs {
		startIdx++
	}

	recent := events[startIdx:]

	// Cap at maxWindowEvents, keeping the most recent.
	if len(recent) > maxWindowEvents {
		recent = recent[len(recent)-maxWindowEvents:]
	}

	// Copy to a new backing array to release the reference to the original slice.
	trimmed := make([]models.Event, len(recent))
	copy(trimmed, recent)
	return trimmed
}
