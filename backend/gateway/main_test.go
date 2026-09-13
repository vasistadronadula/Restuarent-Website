package main

import (
	"net"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"
)

func TestTrustedProxyChain(t *testing.T) {
	_, proxy, _ := net.ParseCIDR("10.0.0.0/24")
	r := httptest.NewRequest("GET", "/", nil)
	r.RemoteAddr = "10.0.0.2:1234"
	r.Header.Set("X-Forwarded-For", "1.1.1.1, 203.0.113.9")
	if got := clientIP(r, []*net.IPNet{proxy}); got != "203.0.113.9" {
		t.Fatalf("trusted attacker-supplied chain: %s", got)
	}
	if got := clientIP(r, nil); got != "10.0.0.2" {
		t.Fatalf("trusted unconfigured proxy: %s", got)
	}
}

func TestOversizedChunkedBodyNeverReachesUpstream(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { t.Error("forwarded oversized request") }))
	defer upstream.Close()
	target, _ := url.Parse(upstream.URL)
	h := gateway(target, "https://restaurant.example")
	r := httptest.NewRequest("POST", "/api/v1/orders/checkout", strings.NewReader(strings.Repeat("x", 1024*1024+1)))
	r.ContentLength = -1
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	if w.Code != 413 {
		t.Fatalf("expected 413, got %d", w.Code)
	}
}

func TestProxyBoundary(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.Contains(r.Header.Get("X-Forwarded-For"), "attacker") {
			t.Error("trusted spoofed IP")
		}
		if r.Header.Get("Forwarded") != "" || r.Header.Get("X-Real-IP") != "" {
			t.Error("forwarded untrusted identity")
		}
		if r.Header.Get("Authorization") != "Bearer test" {
			t.Error("lost authentication")
		}
		if r.Header.Get("X-Request-ID") == "attacker" {
			t.Error("trusted request ID")
		}
		w.WriteHeader(201)
	}))
	defer upstream.Close()
	target, _ := url.Parse(upstream.URL)
	h := gateway(target, "https://restaurant.example")
	r := httptest.NewRequest("GET", "/api/v1/menu_items", nil)
	r.Header.Set("X-Forwarded-For", "attacker")
	r.Header.Set("Forwarded", "for=attacker")
	r.Header.Set("X-Real-IP", "attacker")
	r.Header.Set("X-Request-ID", "attacker")
	r.Header.Set("Authorization", "Bearer test")
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	if w.Code != 201 || w.Header().Get("X-Request-ID") == "" {
		t.Fatalf("unexpected response: %d", w.Code)
	}
	for _, path := range []string{"/actuator/env", "/api/old", "/"} {
		w = httptest.NewRecorder()
		h.ServeHTTP(w, httptest.NewRequest("GET", path, nil))
		if w.Code != 404 {
			t.Fatalf("exposed path %s", path)
		}
	}
	r = httptest.NewRequest("POST", "/api/v1/auth/login", nil)
	r.Header.Set("Origin", "https://attacker.example")
	w = httptest.NewRecorder()
	h.ServeHTTP(w, r)
	if w.Code != 403 {
		t.Fatal("accepted foreign origin")
	}
}

func TestLimiterWindow(t *testing.T) {
	l := &limiter{entries: make(map[string]bucket)}
	now := time.Now()
	if !l.allow("a", now, 1) || l.allow("a", now, 1) || !l.allow("b", now, 1) || !l.allow("a", now.Add(time.Minute), 1) {
		t.Fatal("rate limiter does not isolate clients or reset windows")
	}
}
