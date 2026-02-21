package simulator

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"time"

	"behaviorlens/models"
)

var pages = []string{
	"/home", "/products", "/search", "/product/1", "/product/2",
	"/product/3", "/cart", "/checkout", "/account", "/about",
}

// journeyType describes the pattern a virtual user will follow.
type journeyType int

const (
	journeyNormal     journeyType = iota // browse → purchase
	journeyAbandoner                     // browse → cart → abandon
	journeyHesitator                     // browse → idle for a long time
	journeyLooper                        // search loop (same page 3+ times)
)

// Run launches one goroutine per virtual user. All goroutines exit when ctx is cancelled.
func Run(ctx context.Context, serverURL string) {
	// Brief startup delay so the HTTP server is ready.
	select {
	case <-time.After(600 * time.Millisecond):
	case <-ctx.Done():
		return
	}

	numUsers := 5 + rand.Intn(11) // 5–15 inclusive

	for i := 0; i < numUsers; i++ {
		userID := fmt.Sprintf("user-%04d", rand.Intn(10000))
		journey := pickJourney()
		go runUser(ctx, serverURL, userID, journey)
	}
}

func pickJourney() journeyType {
	// Realistic distribution: most users are normal, some trigger patterns.
	switch {
	case rand.Intn(10) < 4:
		return journeyNormal // 40 %
	case rand.Intn(10) < 6:
		return journeyAbandoner // ~24 % (6/10 of remaining 60 %)
	case rand.Intn(10) < 5:
		return journeyHesitator // ~18 %
	default:
		return journeyLooper // ~18 %
	}
}

// --------------------------------------------------------------------------
// Per-user journey goroutines
// --------------------------------------------------------------------------

func runUser(ctx context.Context, serverURL, userID string, journey journeyType) {
	post := func(e models.Event) {
		postEvent(ctx, serverURL, e)
	}
	randDelay := func(minSec, maxSec int) bool {
		d := time.Duration(minSec+rand.Intn(maxSec-minSec+1)) * time.Second
		select {
		case <-time.After(d):
			return true
		case <-ctx.Done():
			return false
		}
	}

	switch journey {
	case journeyNormal:
		runNormalJourney(ctx, userID, post, randDelay)
	case journeyAbandoner:
		runAbandonJourney(ctx, userID, post, randDelay)
	case journeyHesitator:
		runHesitationJourney(ctx, userID, post, randDelay)
	case journeyLooper:
		runLoopJourney(ctx, userID, post, randDelay)
	}
}

type postFn func(e models.Event)
type delayFn func(minSec, maxSec int) bool

func runNormalJourney(ctx context.Context, userID string, post postFn, delay delayFn) {
	for {
		// Browse a few pages
		for i := 0; i < 2+rand.Intn(3); i++ {
			page := pages[rand.Intn(len(pages)-3)] // avoid cart/checkout
			post(makeEvent(userID, "navigate", page))
			if !delay(2, 6) {
				return
			}
			post(makeEvent(userID, "click", page))
			if !delay(1, 4) {
				return
			}
			post(makeEvent(userID, "scroll", page))
			if !delay(1, 3) {
				return
			}
		}

		// Add to cart, then complete
		post(makeEvent(userID, "navigate", "/cart"))
		if !delay(2, 5) {
			return
		}
		post(makeEvent(userID, "click", "/cart"))
		if !delay(1, 3) {
			return
		}
		post(makeEvent(userID, "navigate", "/checkout"))
		if !delay(3, 8) {
			return
		}
		post(makeEvent(userID, "complete", "/checkout"))

		// Rest before next cycle
		if !delay(10, 20) {
			return
		}
	}
}

func runAbandonJourney(ctx context.Context, userID string, post postFn, delay delayFn) {
	for {
		// Browse products
		for i := 0; i < 1+rand.Intn(3); i++ {
			page := pages[rand.Intn(5)] // just product pages
			post(makeEvent(userID, "navigate", page))
			if !delay(2, 5) {
				return
			}
			post(makeEvent(userID, "scroll", page))
			if !delay(1, 3) {
				return
			}
		}

		// Enter cart/checkout then vanish
		target := "/cart"
		if rand.Intn(2) == 0 {
			target = "/checkout"
		}
		post(makeEvent(userID, "navigate", target))
		if !delay(2, 4) {
			return
		}
		post(makeEvent(userID, "scroll", target))

		// Simulate abandonment: idle > 60 seconds before any action
		if !delay(65, 90) {
			return
		}

		// Long rest before next cycle
		if !delay(15, 30) {
			return
		}
	}
}

func runHesitationJourney(ctx context.Context, userID string, post postFn, delay delayFn) {
	for {
		// Navigate to a page
		page := pages[rand.Intn(len(pages))]
		post(makeEvent(userID, "navigate", page))
		if !delay(2, 5) {
			return
		}
		post(makeEvent(userID, "click", page))

		// Pause (idle) for >10 seconds — triggers hesitation
		idleSecs := 12 + rand.Intn(30)
		select {
		case <-time.After(time.Duration(idleSecs) * time.Second):
		case <-ctx.Done():
			return
		}
		post(makeEvent(userID, "idle", page))

		// Eventually take action and move on
		if !delay(2, 5) {
			return
		}
		post(makeEvent(userID, "navigate", pages[rand.Intn(len(pages))]))

		if !delay(8, 15) {
			return
		}
	}
}

func runLoopJourney(ctx context.Context, userID string, post postFn, delay delayFn) {
	for {
		// Pick a page to loop through
		loopPage := "/search"
		if rand.Intn(3) == 0 {
			loopPage = pages[rand.Intn(len(pages))]
		}

		// Visit the same page 3–5 times within 2 minutes
		visits := 3 + rand.Intn(3)
		for i := 0; i < visits; i++ {
			post(makeEvent(userID, "navigate", loopPage))
			if !delay(2, 20) {
				return
			}
			post(makeEvent(userID, "scroll", loopPage))
			if !delay(1, 5) {
				return
			}
		}

		// Browse away normally
		post(makeEvent(userID, "navigate", pages[rand.Intn(len(pages))]))

		if !delay(10, 20) {
			return
		}
	}
}

// --------------------------------------------------------------------------
// HTTP helper
// --------------------------------------------------------------------------

func makeEvent(userID, action, page string) models.Event {
	return models.Event{
		UserID:    userID,
		Action:    action,
		Page:      page,
		Timestamp: time.Now().UnixMilli(),
	}
}

func postEvent(ctx context.Context, serverURL string, event models.Event) {
	body, err := json.Marshal(event)
	if err != nil {
		return
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, serverURL+"/events", bytes.NewReader(body))
	if err != nil {
		return
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusAccepted {
		log.Printf("simulator: unexpected status %d for user %s", resp.StatusCode, event.UserID)
	}
}
