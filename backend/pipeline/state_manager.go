package pipeline

import (
	"context"
	"sync"

	"behaviorlens/models"
)

// StateManager maintains a mutex-protected map of UserState, consuming events
// from the event channel and triggering the RuleEngine after each update.
type StateManager struct {
	mu      sync.RWMutex
	users   map[string]*models.UserState
	eventCh <-chan models.Event
	engine  *RuleEngine
	ctx     context.Context
}

// NewStateManager constructs a StateManager. Call Start() to begin consuming events.
func NewStateManager(ctx context.Context, eventCh <-chan models.Event, engine *RuleEngine) *StateManager {
	return &StateManager{
		users:   make(map[string]*models.UserState),
		eventCh: eventCh,
		engine:  engine,
		ctx:     ctx,
	}
}

// Start launches the goroutine that reads events from the channel.
// It exits cleanly when ctx is cancelled or the channel is closed.
func (sm *StateManager) Start() {
	go func() {
		for {
			select {
			case <-sm.ctx.Done():
				return
			case event, ok := <-sm.eventCh:
				if !ok {
					return
				}
				sm.processEvent(event)
			}
		}
	}()
}

// processEvent updates the user state and triggers rule evaluation.
// The write lock is released before calling the rule engine to avoid contention.
func (sm *StateManager) processEvent(event models.Event) {
	sm.mu.Lock()

	state, exists := sm.users[event.UserID]
	if !exists {
		state = &models.UserState{
			UserID:          event.UserID,
			Events:          make([]models.Event, 0, 32),
			PageVisitCounts: make(map[string]int),
			SessionStart:    event.Timestamp,
		}
		sm.users[event.UserID] = state
	}

	state.Events = append(state.Events, event)
	state.CurrentPage = event.Page
	state.LastSeen = event.Timestamp

	if event.Action == "navigate" {
		state.PageVisitCounts[event.Page]++
	}

	state.Events = TrimWindow(state.Events)

	// Deep-copy state so we can evaluate rules without holding the lock.
	stateCopy := copyUserState(state)
	sm.mu.Unlock()

	sm.engine.Evaluate(stateCopy)
}

// GetActiveUsers returns a copy of all user states whose LastSeen is >= sinceMs.
func (sm *StateManager) GetActiveUsers(sinceMs int64) []*models.UserState {
	sm.mu.RLock()
	defer sm.mu.RUnlock()

	result := make([]*models.UserState, 0)
	for _, state := range sm.users {
		if state.LastSeen >= sinceMs {
			c := copyUserState(state)
			result = append(result, c)
		}
	}
	return result
}

// copyUserState performs a full deep copy of a UserState.
func copyUserState(s *models.UserState) *models.UserState {
	events := make([]models.Event, len(s.Events))
	copy(events, s.Events)

	pageCounts := make(map[string]int, len(s.PageVisitCounts))
	for k, v := range s.PageVisitCounts {
		pageCounts[k] = v
	}

	return &models.UserState{
		UserID:          s.UserID,
		Events:          events,
		CurrentPage:     s.CurrentPage,
		LastSeen:        s.LastSeen,
		SessionStart:    s.SessionStart,
		PageVisitCounts: pageCounts,
	}
}
