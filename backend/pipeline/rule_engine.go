package pipeline

import (
	"context"
	"fmt"
	"math/rand"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"behaviorlens/explanation"
	"behaviorlens/models"
)

const (
	hesitationMinMs    = 10_000  // 10 seconds
	hesitationLowMaxMs = 15_000  // 15 seconds
	hesitationMedMaxMs = 30_000  // 30 seconds
	hesitationCoolMs   = 60_000  // 60-second re-fire cooldown
	navLoopWindowMs    = 120_000 // 2-minute window
	navLoopThreshold   = 3
	abandonTimeoutSec  = 60
)

// RuleEngine evaluates user state snapshots against friction detection rules
// and maintains the canonical list of detected patterns.
type RuleEngine struct {
	mu             sync.RWMutex
	patterns       []models.Pattern
	recentFires    map[string]int64             // "userID:type:page" → last fire timestamp ms
	abandonCancels map[string]context.CancelFunc // userID → cancel func for abandon timer
	ctx            context.Context

	totalEvents   atomic.Int64
	totalPatterns atomic.Int64
	totalAbandons atomic.Int64
}

// NewRuleEngine constructs a RuleEngine bound to the given context.
func NewRuleEngine(ctx context.Context) *RuleEngine {
	return &RuleEngine{
		patterns:       make([]models.Pattern, 0, 64),
		recentFires:    make(map[string]int64),
		abandonCancels: make(map[string]context.CancelFunc),
		ctx:            ctx,
	}
}

// IncrementEvents records that one more raw event has been ingested.
func (re *RuleEngine) IncrementEvents() {
	re.totalEvents.Add(1)
}

// Evaluate runs all detection rules against the provided user state snapshot.
func (re *RuleEngine) Evaluate(state *models.UserState) {
	re.checkHesitation(state)
	re.checkNavigationLoop(state)
	re.checkAbandonmentTrigger(state)
	re.checkAbandonmentCompletion(state)
}

// --------------------------------------------------------------------------
// Hesitation
// --------------------------------------------------------------------------

func (re *RuleEngine) checkHesitation(state *models.UserState) {
	// Find the most recent non-idle event on the current page.
	var lastNonIdleMs int64
	for _, e := range state.Events {
		if e.Page == state.CurrentPage && e.Action != "idle" {
			if e.Timestamp > lastNonIdleMs {
				lastNonIdleMs = e.Timestamp
			}
		}
	}
	if lastNonIdleMs == 0 {
		return
	}

	// Require at least one idle event newer than the last non-idle event.
	var hasIdleAfter bool
	for _, e := range state.Events {
		if e.Page == state.CurrentPage && e.Action == "idle" && e.Timestamp > lastNonIdleMs {
			hasIdleAfter = true
			break
		}
	}
	if !hasIdleAfter {
		return
	}

	now := time.Now().UnixMilli()
	idleDurationMs := now - lastNonIdleMs
	if idleDurationMs < hesitationMinMs {
		return
	}

	fireKey := fmt.Sprintf("%s:hesitation:%s", state.UserID, state.CurrentPage)

	re.mu.Lock()
	defer re.mu.Unlock()

	// Cooldown check: don't re-fire within 60 seconds.
	if lastFire, ok := re.recentFires[fireKey]; ok {
		if now-lastFire < hesitationCoolMs {
			return
		}
	}

	// Dedup: don't fire if an identical unresolved pattern exists.
	for _, p := range re.patterns {
		if p.UserID == state.UserID && p.Type == "hesitation" &&
			p.Page == state.CurrentPage && !p.Resolved {
			return
		}
	}

	severity := hesitationSeverity(idleDurationMs)
	idleSecs := int(idleDurationMs / 1000)

	p := models.Pattern{
		PatternID:   generateID(),
		UserID:      state.UserID,
		Type:        "hesitation",
		Page:        state.CurrentPage,
		DetectedAt:  now,
		Explanation: explanation.Generate("hesitation", state.CurrentPage, idleSecs, severity),
		Severity:    severity,
		Resolved:    false,
	}
	re.patterns = append(re.patterns, p)
	re.recentFires[fireKey] = now
	re.totalPatterns.Add(1)
}

func hesitationSeverity(ms int64) string {
	switch {
	case ms < hesitationLowMaxMs:
		return "low"
	case ms < hesitationMedMaxMs:
		return "medium"
	default:
		return "high"
	}
}

// --------------------------------------------------------------------------
// Navigation Loop
// --------------------------------------------------------------------------

func (re *RuleEngine) checkNavigationLoop(state *models.UserState) {
	now := time.Now().UnixMilli()
	windowStart := now - navLoopWindowMs

	count := 0
	for _, e := range state.Events {
		if e.Action == "navigate" && e.Page == state.CurrentPage && e.Timestamp >= windowStart {
			count++
		}
	}
	if count < navLoopThreshold {
		return
	}

	re.mu.Lock()
	defer re.mu.Unlock()

	// Dedup: don't fire if unresolved pattern exists for same user+page.
	for _, p := range re.patterns {
		if p.UserID == state.UserID && p.Type == "navigation-loop" &&
			p.Page == state.CurrentPage && !p.Resolved {
			return
		}
	}

	severity := "medium"
	if count >= 4 {
		severity = "high"
	}

	p := models.Pattern{
		PatternID:   generateID(),
		UserID:      state.UserID,
		Type:        "navigation-loop",
		Page:        state.CurrentPage,
		DetectedAt:  now,
		Explanation: explanation.Generate("navigation-loop", state.CurrentPage, count, severity),
		Severity:    severity,
		Resolved:    false,
	}
	re.patterns = append(re.patterns, p)
	re.totalPatterns.Add(1)
}

// --------------------------------------------------------------------------
// Abandonment
// --------------------------------------------------------------------------

func (re *RuleEngine) checkAbandonmentTrigger(state *models.UserState) {
	if len(state.Events) == 0 {
		return
	}
	last := state.Events[len(state.Events)-1]
	if last.Action != "navigate" {
		return
	}

	pageLower := strings.ToLower(last.Page)
	if !strings.Contains(pageLower, "checkout") && !strings.Contains(pageLower, "cart") {
		return
	}

	re.mu.Lock()
	defer re.mu.Unlock()

	// Dedup: skip if an unresolved abandonment already exists for this user.
	for _, p := range re.patterns {
		if p.UserID == state.UserID && p.Type == "abandonment" && !p.Resolved {
			return
		}
	}

	// Cancel any previous abandon timer for this user before starting a new one.
	if cancel, ok := re.abandonCancels[state.UserID]; ok {
		cancel()
	}

	abandonCtx, cancel := context.WithCancel(re.ctx)
	re.abandonCancels[state.UserID] = cancel

	userID := state.UserID
	page := last.Page

	go func() {
		select {
		case <-time.After(abandonTimeoutSec * time.Second):
			re.fireAbandonment(userID, page)
		case <-abandonCtx.Done():
			// User completed or a new timer replaced this one.
		}
	}()
}

func (re *RuleEngine) checkAbandonmentCompletion(state *models.UserState) {
	if len(state.Events) == 0 {
		return
	}
	last := state.Events[len(state.Events)-1]
	if last.Action != "complete" && last.Action != "confirm" {
		return
	}

	re.mu.Lock()
	defer re.mu.Unlock()

	if cancel, ok := re.abandonCancels[state.UserID]; ok {
		cancel()
		delete(re.abandonCancels, state.UserID)
	}

	// Resolve any active abandonment patterns for this user.
	for i := range re.patterns {
		if re.patterns[i].UserID == state.UserID && re.patterns[i].Type == "abandonment" {
			re.patterns[i].Resolved = true
		}
	}
}

func (re *RuleEngine) fireAbandonment(userID, page string) {
	re.mu.Lock()
	defer re.mu.Unlock()

	// Dedup guard inside the lock.
	for _, p := range re.patterns {
		if p.UserID == userID && p.Type == "abandonment" && !p.Resolved {
			return
		}
	}

	now := time.Now().UnixMilli()
	p := models.Pattern{
		PatternID:   generateID(),
		UserID:      userID,
		Type:        "abandonment",
		Page:        page,
		DetectedAt:  now,
		Explanation: explanation.Generate("abandonment", page, abandonTimeoutSec, "high"),
		Severity:    "high",
		Resolved:    false,
	}
	re.patterns = append(re.patterns, p)
	re.totalPatterns.Add(1)
	re.totalAbandons.Add(1)

	delete(re.abandonCancels, userID)
}

// --------------------------------------------------------------------------
// Queries
// --------------------------------------------------------------------------

// GetPatterns returns detected patterns newest-first, capped at 500.
// If limit > 0, it further caps the result.
func (re *RuleEngine) GetPatterns(limit int) []models.Pattern {
	re.mu.RLock()
	defer re.mu.RUnlock()

	n := len(re.patterns)
	if n > 500 {
		n = 500
	}

	result := make([]models.Pattern, n)
	src := re.patterns[len(re.patterns)-n:]
	for i, p := range src {
		result[n-1-i] = p
	}

	if limit > 0 && limit < len(result) {
		result = result[:limit]
	}
	return result
}

// HasActivePattern reports whether the user has any unresolved pattern.
func (re *RuleEngine) HasActivePattern(userID string) bool {
	re.mu.RLock()
	defer re.mu.RUnlock()
	for _, p := range re.patterns {
		if p.UserID == userID && !p.Resolved {
			return true
		}
	}
	return false
}

// Metrics returns a current SystemMetrics snapshot.
func (re *RuleEngine) Metrics(activeUserCount int) models.SystemMetrics {
	totalP := re.totalPatterns.Load()
	totalA := re.totalAbandons.Load()

	var rate float64
	if totalP > 0 {
		rate = float64(totalA) / float64(totalP) * 100
	}

	return models.SystemMetrics{
		TotalEvents:      re.totalEvents.Load(),
		ActiveUsers:      activeUserCount,
		PatternsDetected: totalP,
		AbandonmentRate:  rate,
		AsOf:             time.Now().UnixMilli(),
	}
}

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

func generateID() string {
	return fmt.Sprintf("%016x%08x", rand.Int63(), rand.Int31())
}
