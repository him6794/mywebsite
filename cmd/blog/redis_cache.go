package main

import (
	"bytes"
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

const defaultPublicCacheTTL = time.Minute
const redisOperationTimeout = 300 * time.Millisecond

type publicResponseCache interface {
	Generation(context.Context) (string, error)
	Key(string, string) string
	Get(context.Context, string) ([]byte, bool, error)
	Set(context.Context, string, []byte, time.Duration) error
	Invalidate(context.Context) error
}

type redisPublicCache struct {
	client *redis.Client
	prefix string
}

func newRedisPublicCache(rawURL, prefix string) (*redisPublicCache, error) {
	options, err := redis.ParseURL(rawURL)
	if err != nil {
		return nil, err
	}
	options.DialTimeout = redisOperationTimeout
	options.ReadTimeout = redisOperationTimeout
	options.WriteTimeout = redisOperationTimeout
	options.PoolTimeout = redisOperationTimeout
	options.MaxRetries = -1
	if prefix = strings.TrimSpace(prefix); prefix == "" {
		prefix = "justin"
	}
	return &redisPublicCache{client: redis.NewClient(options), prefix: prefix}, nil
}

func (cache *redisPublicCache) generationKey() string {
	return cache.prefix + ":public:generation"
}

func (cache *redisPublicCache) Key(generation, requestPath string) string {
	return fmt.Sprintf("%s:public:g%s:GET:%s", cache.prefix, generation, requestPath)
}

func redisContext(ctx context.Context) (context.Context, context.CancelFunc) {
	return context.WithTimeout(ctx, redisOperationTimeout)
}

func (cache *redisPublicCache) Generation(ctx context.Context) (string, error) {
	ctx, cancel := redisContext(ctx)
	defer cancel()
	generation, err := cache.client.Get(ctx, cache.generationKey()).Result()
	if err == redis.Nil {
		return "0", nil
	}
	return generation, err
}

func (cache *redisPublicCache) Get(ctx context.Context, key string) ([]byte, bool, error) {
	ctx, cancel := redisContext(ctx)
	defer cancel()
	value, err := cache.client.Get(ctx, key).Bytes()
	if err == redis.Nil {
		return nil, false, nil
	}
	if err != nil {
		return nil, false, err
	}
	return value, true, nil
}

func (cache *redisPublicCache) Set(ctx context.Context, key string, value []byte, ttl time.Duration) error {
	ctx, cancel := redisContext(ctx)
	defer cancel()
	return cache.client.Set(ctx, key, value, ttl).Err()
}

func (cache *redisPublicCache) Invalidate(ctx context.Context) error {
	ctx, cancel := redisContext(ctx)
	defer cancel()
	return cache.client.Incr(ctx, cache.generationKey()).Err()
}

func (cache *redisPublicCache) Close() error {
	return cache.client.Close()
}

func publicCacheTTLFromEnv() time.Duration {
	value := strings.TrimSpace(os.Getenv("PUBLIC_CACHE_TTL"))
	if value == "" {
		return defaultPublicCacheTTL
	}
	ttl, err := time.ParseDuration(value)
	if err != nil || ttl < 0 {
		log.Printf("invalid PUBLIC_CACHE_TTL %q; using %s", value, defaultPublicCacheTTL)
		return defaultPublicCacheTTL
	}
	return ttl
}

func publicCacheFromEnv() (publicResponseCache, time.Duration, func()) {
	ttl := publicCacheTTLFromEnv()
	rawURL := strings.TrimSpace(os.Getenv("REDIS_URL"))
	if rawURL == "" {
		return nil, ttl, func() {}
	}
	cache, err := newRedisPublicCache(rawURL, os.Getenv("REDIS_PREFIX"))
	if err != nil {
		log.Print("public API caching disabled: invalid REDIS_URL")
		return nil, ttl, func() {}
	}
	return cache, ttl, func() {
		if err := cache.Close(); err != nil {
			log.Printf("close Redis client: %v", err)
		}
	}
}

func cacheRequestPath(c *gin.Context) string {
	requestPath := c.Request.URL.Path
	if query := c.Request.URL.Query().Encode(); query != "" {
		requestPath += "?" + query
	}
	return requestPath
}

func cachePublicJSON(cache publicResponseCache, ttl time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		if cache == nil || ttl <= 0 || c.Request.Method != http.MethodGet {
			c.Next()
			return
		}
		ctx := c.Request.Context()
		generation, err := cache.Generation(ctx)
		if err != nil {
			c.Next()
			return
		}
		key := cache.Key(generation, cacheRequestPath(c))
		if body, ok, err := cache.Get(ctx, key); err == nil && ok {
			c.Data(http.StatusOK, "application/json; charset=utf-8", body)
			c.Abort()
			return
		}

		original := c.Writer
		recorder := &cacheResponseRecorder{ResponseWriter: original}
		c.Writer = recorder
		defer func() { c.Writer = original }()
		c.Next()
		c.Writer = original

		status := recorder.Status()
		contentType := strings.ToLower(original.Header().Get("Content-Type"))
		if status >= http.StatusOK && status < http.StatusMultipleChoices && strings.HasPrefix(contentType, "application/json") && recorder.body.Len() > 0 {
			_ = cache.Set(ctx, key, recorder.body.Bytes(), ttl)
		}
		original.WriteHeader(status)
		if recorder.body.Len() > 0 {
			_, _ = original.Write(recorder.body.Bytes())
		}
	}
}

type cacheResponseRecorder struct {
	gin.ResponseWriter
	body    bytes.Buffer
	status  int
	written bool
}

func (writer *cacheResponseRecorder) WriteHeader(status int) {
	if writer.written {
		return
	}
	writer.status = status
}

func (writer *cacheResponseRecorder) WriteHeaderNow() {
	if !writer.written {
		if writer.status == 0 {
			writer.status = http.StatusOK
		}
		writer.written = true
	}
}

func (writer *cacheResponseRecorder) Write(body []byte) (int, error) {
	writer.WriteHeaderNow()
	return writer.body.Write(body)
}

func (writer *cacheResponseRecorder) WriteString(value string) (int, error) {
	writer.WriteHeaderNow()
	return writer.body.WriteString(value)
}

func (writer *cacheResponseRecorder) Status() int {
	if writer.status == 0 {
		return http.StatusOK
	}
	return writer.status
}

func (writer *cacheResponseRecorder) Size() int {
	return writer.body.Len()
}

func (writer *cacheResponseRecorder) Written() bool {
	return writer.written
}

func (writer *cacheResponseRecorder) Flush() {
	writer.WriteHeaderNow()
}

func invalidatePublicDataAfterWrite(cache publicResponseCache) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()
		if cache == nil || c.Writer.Status() < http.StatusOK || c.Writer.Status() >= http.StatusMultipleChoices || !isPublicDataMutation(c.Request.Method, c.Request.URL.Path) {
			return
		}
		if err := cache.Invalidate(c.Request.Context()); err != nil {
			log.Printf("public cache generation invalidation failed: %v", err)
		}
	}
}

func isPublicDataMutation(method, route string) bool {
	if method != http.MethodPost && method != http.MethodPut && method != http.MethodPatch && method != http.MethodDelete {
		return false
	}
	if strings.HasPrefix(route, "/api/admin/") {
		resource := strings.Split(strings.TrimPrefix(route, "/api/admin/"), "/")[0]
		switch resource {
		case "posts", "projects", "experience", "skills", "friends", "comments":
			return true
		default:
			return false
		}
	}
	return method == http.MethodPost && (route == "/api/friends" || (strings.HasPrefix(route, "/api/posts/") && strings.HasSuffix(route, "/comments")))
}
