package main

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"io"
	"log/slog"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"os/signal"
	"strings"
	"sync"
	"syscall"
	"time"
)

type bucket struct {
	start time.Time
	count int
}

// Bounded, per-instance protection. Distributed rate limits belong at ingress.
type limiter struct {
	mu      sync.Mutex
	entries map[string]bucket
}

func (l *limiter) allow(key string, now time.Time, max int) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	b := l.entries[key]
	if now.Sub(b.start) >= time.Minute {
		b = bucket{start: now}
	}
	if b.count >= max {
		return false
	}
	if len(l.entries) >= 10000 {
		for k, v := range l.entries {
			if now.Sub(v.start) >= time.Minute {
				delete(l.entries, k)
			}
		}
		if _, exists := l.entries[key]; !exists && len(l.entries) >= 10000 {
			return false
		}
	}
	b.count++
	l.entries[key] = b
	return true
}

func clientIP(r *http.Request, trusted []*net.IPNet) string {
	ip, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		ip = r.RemoteAddr
	}
	isTrusted := func(value string) bool {
		parsed := net.ParseIP(value)
		for _, network := range trusted {
			if network.Contains(parsed) {
				return true
			}
		}
		return false
	}
	chain := strings.Split(r.Header.Get("X-Forwarded-For"), ",")
	for i := len(chain) - 1; i >= 0 && isTrusted(ip); i-- {
		next := strings.TrimSpace(chain[i])
		if net.ParseIP(next) == nil {
			break
		}
		ip = next
	}
	return ip
}

func gateway(target *url.URL, origin string, trusted ...*net.IPNet) http.Handler {
	proxy := &httputil.ReverseProxy{
		Rewrite: func(r *httputil.ProxyRequest) {
			r.SetURL(target)
			// Never trust client-supplied forwarding headers.
			r.Out.Header.Del("Forwarded")
			r.Out.Header.Del("X-Real-IP")
			r.SetXForwarded()
		},
		Transport: &http.Transport{
			Proxy:        http.ProxyFromEnvironment,
			DialContext:  (&net.Dialer{Timeout: 5 * time.Second, KeepAlive: 30 * time.Second}).DialContext,
			MaxIdleConns: 100, MaxIdleConnsPerHost: 50, IdleConnTimeout: 90 * time.Second,
			ResponseHeaderTimeout: 25 * time.Second, TLSHandshakeTimeout: 5 * time.Second,
		},
		ErrorHandler: func(w http.ResponseWriter, r *http.Request, err error) {
			slog.Error("upstream failure", "requestId", r.Header.Get("X-Request-ID"), "error", err)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadGateway)
			_, _ = w.Write([]byte(`{"error":"Backend unavailable"}`))
		},
	}
	limits := &limiter{entries: make(map[string]bucket)}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := make([]byte, 16)
		if _, err := rand.Read(id); err != nil {
			http.Error(w, "Unavailable", 503)
			return
		}
		requestID := hex.EncodeToString(id)
		r.Header.Set("X-Request-ID", requestID)
		w.Header().Set("X-Request-ID", requestID)
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Cache-Control", "no-store")
		if r.URL.Path == "/health/live" && r.Method == http.MethodGet {
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"status":"UP"}`))
			return
		}
		if o := r.Header.Get("Origin"); o != "" {
			allowed := o == origin || (origin == "http://localhost:3000" && (o == "http://localhost:3001" || o == "http://127.0.0.1:3000" || o == "http://127.0.0.1:3001"))
			if !allowed {
				http.Error(w, "Origin not allowed", 403)
				return
			}
			w.Header().Set("Access-Control-Allow-Origin", o)
			w.Header().Set("Vary", "Origin")
			w.Header().Set("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Authorization,Content-Type,If-Match,Idempotency-Key")
			w.Header().Set("Access-Control-Expose-Headers", "ETag,X-Request-ID")
		}
		if r.Method == http.MethodOptions {
			w.WriteHeader(204)
			return
		}
		if !strings.HasPrefix(r.URL.Path, "/api/v1/") && r.URL.Path != "/health/ready" && r.URL.Path != "/ws" {
			http.NotFound(w, r)
			return
		}
		ip := clientIP(r, trusted)
		max := 240
		key := ip
		if strings.HasPrefix(r.URL.Path, "/api/v1/auth/") {
			max = 20
			key += ":auth"
		}
		if !limits.allow(key, time.Now(), max) {
			w.Header().Set("Retry-After", "60")
			http.Error(w, "Too many requests", 429)
			return
		}
		if r.ContentLength > 1024*1024 {
			http.Error(w, "Request too large", 413)
			return
		}
		// Reject oversized chunked bodies before forwarding any mutation upstream.
		body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 1024*1024))
		if err != nil {
			if _, tooLarge := err.(*http.MaxBytesError); tooLarge {
				http.Error(w, "Request too large", 413)
			} else {
				http.Error(w, "Invalid request body", 400)
			}
			return
		}
		_ = r.Body.Close()
		r.Body = io.NopCloser(bytes.NewReader(body))
		r.ContentLength = int64(len(body))
		r.RemoteAddr = net.JoinHostPort(ip, "0")
		if r.URL.Path == "/health/ready" {
			r.URL.Path = "/actuator/health/readiness"
		}
		proxy.ServeHTTP(w, r)
	})
}

func main() {
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, nil)))
	if len(os.Args) == 2 && os.Args[1] == "--healthcheck" {
		client := &http.Client{Timeout: 3 * time.Second}
		res, err := client.Get("http://127.0.0.1:8080/health/ready")
		if err != nil {
			os.Exit(1)
		}
		defer res.Body.Close()
		if res.StatusCode != http.StatusOK {
			os.Exit(1)
		}
		return
	}
	target, err := url.Parse(os.Getenv("BUSINESS_URL"))
	if err != nil || target.Host == "" || (target.Scheme != "http" && target.Scheme != "https") || target.User != nil || target.RawQuery != "" || (target.Path != "" && target.Path != "/") {
		slog.Error("BUSINESS_URL must be an HTTP(S) origin")
		os.Exit(1)
	}
	origin := os.Getenv("WEB_ORIGIN")
	if origin == "" || origin == "*" {
		slog.Error("WEB_ORIGIN must be an explicit origin")
		os.Exit(1)
	}
	var trusted []*net.IPNet
	if configured := os.Getenv("TRUSTED_PROXY_CIDRS"); configured != "" {
		for _, cidr := range strings.Split(configured, ",") {
			_, network, err := net.ParseCIDR(strings.TrimSpace(cidr))
			if err != nil {
				slog.Error("Invalid TRUSTED_PROXY_CIDRS")
				os.Exit(1)
			}
			prefix, _ := network.Mask.Size()
			if prefix == 0 {
				slog.Error("Refusing to trust all proxy addresses")
				os.Exit(1)
			}
			trusted = append(trusted, network)
		}
	}
	addr := os.Getenv("LISTEN_ADDR")
	if addr == "" {
		addr = ":8080"
	}
	server := &http.Server{Addr: addr, Handler: gateway(target, origin, trusted...), ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout: 15 * time.Second, WriteTimeout: 30 * time.Second, IdleTimeout: 60 * time.Second, MaxHeaderBytes: 32 * 1024}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	go func() {
		slog.Info("gateway started", "address", addr)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("listen failed", "error", err)
			os.Exit(1)
		}
	}()
	<-ctx.Done()
	shutdown, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	if err := server.Shutdown(shutdown); err != nil {
		slog.Error("shutdown failed", "error", err)
	}
}
